"""Entity extraction: item, quantity, unit, brand, price constraints.

Deliberately *not* machine learning. For a closed, structured vocabulary this
is more accurate than a model and, more importantly, debuggable: when it gets
something wrong you can point at the rule. The ML component is confined to
intent classification, where phrasing actually varies.

Pure functions over dictionaries - no Flask import anywhere in this module,
which is what makes it directly unit-testable.
"""
import re

from datastore import ITEMS, CATEGORIES, BRANDS, SIZES, UNIT_RESTRICTIONS, load_json

CONTAINER_UNITS = load_json("container_units.json").get("units", {})

MAX_QUANTITY = 10000

INVALID_UNIT_UNKNOWN = "INVALID_UNIT_UNKNOWN"
INVALID_UNIT_RESTRICTED = "INVALID_UNIT_RESTRICTED"

NUMBER_WORDS = {
    "one": 1, "a": 1, "an": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11,
    "twelve": 12, "fifteen": 15, "twenty": 20, "fifty": 50, "hundred": 100,
    "half": 0.5, "couple": 2, "few": 3, "dozen": 12,
}

# "a"/"an" are excluded as standalone quantities: "add a milk" means one milk,
# but "a" appears in far too many sentences ("add a bit of salt") to treat as
# a reliable count on its own. It is still honoured before "dozen".
_STANDALONE_NUMBER_WORDS = {
    w: v for w, v in NUMBER_WORDS.items() if w not in ("a", "an", "dozen", "half")
}

NEGATION = r"(?:minus|negative)"

# Sentinels used to shield text from clause splitting. Control characters,
# because they cannot occur in a speech transcript.
_AND_GUARD = "\x01"


def _word_boundary(term):
    return r"(?:^|[^a-zA-Z])" + re.escape(term) + r"(?:$|[^a-zA-Z])"


def find_longest_match(text, dictionary):
    """Longest key wins, so "sweet potatoes" beats "potatoes" and
    "orange juice" beats "orange"."""
    best_key, best_val = None, None
    for key, value in dictionary.items():
        if re.search(_word_boundary(key), text):
            if best_key is None or len(key) > len(best_key):
                best_key, best_val = key, value
    return best_val


def find_array_match(text, values):
    best = None
    for value in values:
        if re.search(_word_boundary(value), text):
            if best is None or len(value) > len(best):
                best = value
    return best


def _as_number(value):
    """Keep 2 an int and 0.5 a float - quantities are displayed raw, and
    "×2.0 kg" reads like a bug."""
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def extract_quantity(text):
    """Parse a quantity, including dozens, multipliers, decimals and negatives.

    Order is load-bearing. The original implementation returned on a bare
    `\\d+` match before ever testing its negative-word branches, so
    "minus half a dozen" was unreachable dead code; and it matched only
    integers, so "0.5 kg" parsed as 0 and was then rejected as non-positive.
    """
    result = {"found": False, "value": 1, "explicit": False}

    # --- dozens, with an optional multiplier ---
    dozen = re.search(
        r"(-?\d+(?:\.\d+)?|" + NEGATION + r"\s+\w+|\w+)\s+(?:a\s+)?doz(?:en|ens)\b",
        text,
    )
    if dozen:
        token = dozen.group(1).lower()
        negative = bool(re.search(NEGATION, token))
        number = re.search(r"-?\d+(?:\.\d+)?", token)
        if number:
            multiplier = float(number.group(0))
        else:
            multiplier = 1
            for word, value in NUMBER_WORDS.items():
                if re.search(_word_boundary(word), token):
                    multiplier = value
                    break
        if negative:
            multiplier = -abs(multiplier)
        return {"found": True, "value": _as_number(multiplier * 12), "explicit": True}

    if re.search(NEGATION + r"\s+(?:a\s+)?half\s+(?:a\s+)?doz", text):
        return {"found": True, "value": -6, "explicit": True}
    if re.search(NEGATION + r"\s+(?:a\s+)?doz", text):
        return {"found": True, "value": -12, "explicit": True}
    if re.search(r"\bhalf\s+(?:a\s+)?doz", text):
        return {"found": True, "value": 6, "explicit": True}

    # --- explicit negatives, before the bare-digit branch ---
    for word, value in NUMBER_WORDS.items():
        if re.search(NEGATION + r"\s+" + re.escape(word) + r"(?:$|[^a-zA-Z])", text):
            return {"found": True, "value": _as_number(-value), "explicit": True}

    # --- digits, decimals included, ignoring anything that is a price ---
    for match in re.finditer(r"(-?\d+(?:\.\d+)?)", text):
        before = text[max(0, match.start() - 12):match.start()]
        after = text[match.end():match.end() + 12]
        is_price = (
            "$" in before[-2:]
            or re.search(r"(?:under|below|over|above|between|and|than)\s*$", before)
            or re.match(r"\s*(?:dollars?|rupees?|bucks|usd|inr|rs\.?)\b", after)
        )
        if not is_price:
            return {"found": True, "value": _as_number(float(match.group(1))), "explicit": True}

    if re.search(r"\bdoz(?:en|ens)\b", text):
        return {"found": True, "value": 12, "explicit": True}

    # "half a kilo", "half litre" - only when a unit follows, so a bare
    # "half" elsewhere in a sentence is not mistaken for a count.
    half_unit = re.search(r"\bhalf\s+(?:a\s+)?([a-zA-Z]+)", text)
    if half_unit and half_unit.group(1).lower() in SIZES:
        return {"found": True, "value": 0.5, "explicit": True}

    for word, value in _STANDALONE_NUMBER_WORDS.items():
        if re.search(_word_boundary(word), text):
            return {"found": True, "value": _as_number(value), "explicit": True}

    return result


def extract_price_constraint(text):
    """Parse "under $5", "below 200 rupees", "between $3 and $7", "over 10".

    Returns {"min": float|None, "max": float|None} or None. Currency symbols
    are ignored: catalog prices are plain numbers, and the UI states the unit.
    """
    number = r"\$?\s*(\d+(?:\.\d+)?)"

    between = re.search(
        r"\bbetween\s+" + number + r"\s*(?:dollars?|rupees?|rs\.?)?\s*(?:and|to|-)\s*" + number,
        text,
    )
    if between:
        low, high = float(between.group(1)), float(between.group(2))
        return {"min": min(low, high), "max": max(low, high)}

    under = re.search(
        r"\b(?:under|below|less than|cheaper than|within|upto|up to|at most|max)\s+" + number,
        text,
    )
    if under:
        return {"min": None, "max": float(under.group(1))}

    over = re.search(
        r"\b(?:over|above|more than|at least|min|minimum)\s+" + number, text
    )
    if over:
        return {"min": float(over.group(1)), "max": None}

    return None


def _extract_container_unit(text):
    """Container units only count when a number precedes them, because "can"
    is a common verb ("can you add milk")."""
    for surface, canonical in CONTAINER_UNITS.items():
        if re.search(r"\d+(?:\.\d+)?\s+" + re.escape(surface) + r"(?:$|[^a-zA-Z])", text):
            return canonical
        if re.search(
            r"\b(?:" + "|".join(map(re.escape, NUMBER_WORDS)) + r")\s+"
            + re.escape(surface) + r"(?:$|[^a-zA-Z])", text
        ):
            return canonical
    return None


def _looks_like_unknown_unit(text):
    """"add 5 blorks of rice" - a number, a word, then "of". If that word is
    not a unit we know, the user used a unit we cannot honour."""
    match = re.search(r"\b\d+(?:\.\d+)?\s+([a-zA-Z]+)\s+of\b", text)
    if not match:
        return False
    candidate = match.group(1).lower()
    if candidate in SIZES or candidate in CONTAINER_UNITS:
        return False
    # "5 bottles of water" - plural handled; "5 packs of gum" likewise.
    if candidate.rstrip("s") in SIZES or candidate.rstrip("s") in CONTAINER_UNITS:
        return False
    return True


def validate_unit(item, category, unit):
    """Reject only physically impossible item/unit pairings.

    This was a whitelist of permitted units per category, described in its own
    comment as "a guard against nonsense, not an exhaustive product spec" -
    but implemented as exactly the exhaustive spec it disclaimed, and an
    incomplete one, so it mostly produced false rejections. Every one of these
    was refused by the shipped app:

        add 2 bottles of milk       (Dairy had no "bottle")
        add a carton of eggs        (eggs were restricted to "dozen")
        add 1 litre of olive oil    (Pantry had no "l")
        add 5 kg flour              (Bakery had no "kg")
        add 1 bottle of detergent   (Household had no "bottle")
        add 2 packs of chicken      (Meat & Seafood had no "pack")

    Inverting it to a blacklist keeps the one case the guard was actually for
    ("2 litres of bread") and stops punishing ordinary phrasing. Mass and
    container units are allowed everywhere, because you can sell almost
    anything by weight or in a box; only volume units are category-sensitive,
    since a dry good has no meaningful volume in litres.
    """
    if not unit or not category:
        return True
    forbidden = UNIT_RESTRICTIONS.get("forbidden_category_units", {})
    return unit not in forbidden.get(category, ())


def extract_entities(text):
    """Extract every slot from one command clause."""
    text = (text or "").lower()

    entities = {
        "item": find_longest_match(text, ITEMS),
        "brand": find_array_match(text, BRANDS),
        "size": find_longest_match(text, SIZES),
        "quantity": extract_quantity(text),
        "price": extract_price_constraint(text),
        "category": None,
        "unit_error": None,
    }

    if entities["item"]:
        entities["category"] = CATEGORIES.get(entities["item"], "Other")

    if not entities["size"]:
        entities["size"] = _extract_container_unit(text)

    if _looks_like_unknown_unit(text):
        entities["unit_error"] = INVALID_UNIT_UNKNOWN
        entities["size"] = None
    elif entities["size"] and not validate_unit(
        entities["item"], entities["category"], entities["size"]
    ):
        entities["unit_error"] = INVALID_UNIT_RESTRICTED
        entities["size"] = None

    return entities


CONVERSIONS = {
    ("kg", "g"): 1000.0,
    ("g", "kg"): 0.001,
    ("l", "ml"): 1000.0,
    ("ml", "l"): 0.001,
    ("kg", "lb"): 2.20462,
    ("lb", "kg"): 0.453592,
    ("g", "oz"): 0.035274,
    ("oz", "g"): 28.3495,
    ("lb", "oz"): 16.0,
    ("oz", "lb"): 0.0625,
}


def convert_quantity(quantity, from_unit, to_unit):
    """Convert between compatible units, or return None if incompatible.
    None is meaningful: the caller reports a unit conflict rather than
    silently adding 2 litres to 500 grams."""
    if from_unit == to_unit:
        return quantity
    factor = CONVERSIONS.get((from_unit, to_unit))
    if factor is None:
        return None
    result = round(quantity * factor, 3)
    return int(result) if float(result).is_integer() else result


def split_clauses(text):
    """Split "add milk and bread, and 2 eggs" into separate commands.

    Guards against splitting inside a known multi-word item: "salt and pepper"
    and "macaroni and cheese" survive intact, and "between $3 and $7" is not
    torn in half.
    """
    if not text:
        return []

    protected = [k for k in ITEMS if " and " in k]
    placeholders = {}
    working = text
    for index, phrase in enumerate(protected):
        if phrase in working:
            token = "\x00%d\x00" % index
            placeholders[token] = phrase
            working = working.replace(phrase, token)

    working = re.sub(
        r"(between\s+\$?\s*\d+(?:\.\d+)?)\s+and\s+", "\\1" + _AND_GUARD, working
    )

    parts = re.split(r"\s+and\s+|,\s*|\s*;\s*|\s+then\s+|\s+also\s+", working)

    restored = []
    for part in parts:
        part = part.replace(_AND_GUARD, " and ")
        for token, phrase in placeholders.items():
            part = part.replace(token, phrase)
        # A comma split can leave a dangling conjunction ("..., and 2 eggs").
        part = re.sub(r"^(?:and|then|also|plus)\s+", "", part.strip())
        part = part.strip()
        if part:
            restored.append(part)
    return restored
