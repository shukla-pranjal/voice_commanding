"""Hindi -> English normalisation, applied *before* intent classification.

Why this exists
---------------
The intent model is trained only on English and romanized Hindi
(train/data.csv contains zero Devanagari rows, despite what
generate_data.py's docstring claims). The Web Speech API with lang=hi-IN
returns *Devanagari*. Feed it straight to the model and every unknown token
hashes to nothing: the TF-IDF vector is all zeros and the classifier returns
its prior - "ADD" at ~0.296 confidence - for literally any Hindi sentence,
including "आलू हटाओ" ("remove potatoes"). The old build hid this by sending
the transcript to Google Translate first.

So this module canonicalises Hindi input into the English the model and the
entity extractor already understand. It is a dictionary-and-regex pass, which
for this narrow, closed vocabulary is more accurate and far more debuggable
than a model would be - and it keeps the whole pipeline offline.

Hindi is verb-final ("दो किलो आलू जोड़ो" = "two kilo potatoes add"), while the
model saw English verb-initial phrasing and was trained with ngram_range=(1,2),
so bigrams carry real weight. The detected intent verb is therefore moved to
the front, producing "add 2 kg potatoes".
"""
import re

from datastore import load_json

_A = load_json("aliases_hi.json")

ITEM_ALIASES = _A.get("items", {})
UNIT_ALIASES = _A.get("units", {})
NUMBER_ALIASES = _A.get("numbers", {})
INTENT_ALIASES = _A.get("intents", {})
PRICE_ALIASES = _A.get("price_phrases", {})

# Canonical English verb to emit for each intent.
_INTENT_VERB = {
    "ADD": "add",
    "REMOVE": "remove",
    "SEARCH_ITEM": "find",
    "SEARCH_FILTER": "find",
}

# Order matters: REMOVE before ADD, because "नहीं चाहिए" ("don't want")
# contains "चाहिए" ("want"). Longest phrase first within each intent for the
# same reason - "हटा दो" must win over "हटा".
_INTENT_ORDER = ("REMOVE", "SEARCH_ITEM", "ADD")

DEVANAGARI = re.compile(r"[ऀ-ॿ]")


def has_devanagari(text):
    return bool(DEVANAGARI.search(text or ""))


def _sorted_aliases(mapping):
    """Longest-first, so multi-word aliases match before their own substrings
    ("हरी मिर्च" before "मिर्च", "patta gobhi" before "gobhi")."""
    return sorted(mapping.items(), key=lambda kv: -len(kv[0]))


_ITEMS_SORTED = _sorted_aliases(ITEM_ALIASES)
_UNITS_SORTED = _sorted_aliases(UNIT_ALIASES)
_NUMBERS_SORTED = _sorted_aliases(NUMBER_ALIASES)
_PRICE_SORTED = _sorted_aliases(PRICE_ALIASES)


def _boundary_pattern(alias):
    """Devanagari has no \\b word boundary in the ASCII sense, so guard with a
    lookaround on Devanagari/word characters instead."""
    esc = re.escape(alias)
    if has_devanagari(alias):
        return re.compile(r"(?<![ऀ-ॿ])" + esc + r"(?![ऀ-ॿ])")
    return re.compile(r"(?<![a-zA-Z])" + esc + r"(?![a-zA-Z])")


_ITEM_PATTERNS = [(_boundary_pattern(a), c) for a, c in _ITEMS_SORTED]
_UNIT_PATTERNS = [(_boundary_pattern(a), c) for a, c in _UNITS_SORTED]
_NUMBER_PATTERNS = [(_boundary_pattern(a), v) for a, v in _NUMBERS_SORTED]
_PRICE_PATTERNS = [(_boundary_pattern(a), c) for a, c in _PRICE_SORTED]
_INTENT_PATTERNS = [
    (intent, _boundary_pattern(phrase))
    for intent in _INTENT_ORDER
    for phrase in sorted(INTENT_ALIASES.get(intent, []), key=lambda p: -len(p))
]


def _fmt_number(value):
    """0.5 -> "0.5", 2.0 -> "2" (avoid emitting "2.0", which the quantity
    regex would read as the two separate integers 2 and 0)."""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def detect_intent(text):
    """Return the intent implied by a Hindi verb, or None if none is present."""
    for intent, pattern in _INTENT_PATTERNS:
        if pattern.search(text):
            return intent
    return None


def normalize(text):
    """Canonicalise Hindi/Hinglish into English-shaped text.

    Returns (normalized_text, info) where info records what fired, so the
    caller can distinguish "genuinely nothing recognised" from "translated
    cleanly" - and so the UI can show its work.
    """
    info = {"applied": False, "intent": None, "matched_items": [], "original": text}
    if not text:
        return text, info

    working = text.strip()
    lowered = working.lower()

    intent = detect_intent(lowered)
    info["intent"] = intent

    # Strip the intent phrase out of the body; it gets re-added at the front.
    if intent:
        for candidate_intent, pattern in _INTENT_PATTERNS:
            if candidate_intent == intent and pattern.search(lowered):
                lowered = pattern.sub(" ", lowered)
                break

    for pattern, canonical in _ITEM_PATTERNS:
        if pattern.search(lowered):
            info["matched_items"].append(canonical)
            lowered = pattern.sub(" " + canonical + " ", lowered)

    for pattern, canonical in _UNIT_PATTERNS:
        lowered = pattern.sub(" " + canonical + " ", lowered)

    for pattern, value in _NUMBER_PATTERNS:
        lowered = pattern.sub(" " + _fmt_number(value) + " ", lowered)

    for pattern, canonical in _PRICE_PATTERNS:
        lowered = pattern.sub(" " + canonical + " ", lowered)

    # Drop any Devanagari that survived (particles like का/के/को, unknown
    # words). Leaving it in only adds zero-weight tokens for the model.
    lowered = DEVANAGARI.sub(" ", lowered)

    verb = _INTENT_VERB.get(intent)
    body = re.sub(r"\s+", " ", lowered).strip()

    # Hindi puts the comparison after the number ("500 से कम" -> "500 under").
    # Flip it so the price parser sees ordinary English ("under 500").
    body = re.sub(r"(\d+(?:\.\d+)?)\s+(under|over)\b", r"\2 \1", body)

    result = (verb + " " + body).strip() if verb else body

    info["applied"] = bool(info["matched_items"]) or intent is not None
    info["normalized"] = result
    return result, info
