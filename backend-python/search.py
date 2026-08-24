"""Product search over data/catalog.json.

The catalog shipped in the repo but nothing read it: SEARCH_ITEM and
SEARCH_FILTER were classified correctly by the model and then answered with
the literal string "Searching for X (not fully implemented in backend yet)",
which reached real users. The search panel existed in index.html and was
never populated.

Scoring is a small weighted sum rather than a filter chain, so a query that
over-constrains ("organic milk under $1" - no such product) still returns the
closest matches, ranked, instead of an empty panel.
"""
from datastore import CATALOG, ITEMS, BRANDS
from nlp import find_array_match, find_longest_match

MAX_RESULTS = 8


def _matches_price(price, constraint):
    if not constraint:
        return True
    if constraint.get("min") is not None and price < constraint["min"]:
        return False
    if constraint.get("max") is not None and price > constraint["max"]:
        return False
    return True


def _size_matches(product_size, requested):
    """Compare loosely: the catalog says "1 liter" and "500g", while a spoken
    query yields the canonical unit "l" or a word like "large"."""
    if not requested:
        return False
    product_size = (product_size or "").lower().replace(" ", "")
    requested = requested.lower().replace(" ", "")
    return requested in product_size or product_size in requested


def search(entities, query_text=""):
    """Rank catalog products against extracted entities.

    The product identity is a *hard* filter; price, brand and size are soft.
    That distinction matters: with everything soft, "apples under $3" happily
    returned Tata Salt, because a price match scored higher than a wrong
    product cost. Nobody asking for cheap apples wants salt. But once we are
    inside the right product, over-constraining should degrade gracefully -
    "apples under $3" when the cheapest is $3.99 shows the $3.99 apples,
    flagged as approximate, rather than an empty panel.
    """
    item = entities.get("item")
    brand = entities.get("brand")
    size = entities.get("size")
    price = entities.get("price")

    # The brand may be the only meaningful token ("show me amul"), in which
    # case entity extraction over the raw text is the better source.
    if not brand and query_text:
        brand = find_array_match(query_text.lower(), BRANDS)
    if not item and query_text:
        item = find_longest_match(query_text.lower(), ITEMS)

    meta = {
        "item": item,
        "brand": brand,
        "size": size,
        "price": price,
        "exact": True,
        "total": 0,
    }

    if not CATALOG:
        return [], meta

    # No recognised constraint of any kind means we have nothing to search on.
    # Without this, "find caviar" - a word absent from items.json, so every
    # slot comes back empty - scored all 38 products equally and confidently
    # offered Tata Salt. A price-only or brand-only query ("show me amul",
    # "anything under $2") is still a legitimate search, so the guard requires
    # *all* the slots to be empty, not just the item.
    if not any((item, brand, size, price)):
        return [], meta

    # --- hard filter on identity ---
    candidates = CATALOG
    if item:
        candidates = [
            p for p in CATALOG
            if p.get("item") == item or item in (p.get("name", "").lower())
        ]
        if not candidates:
            # A known grocery item with no catalog entry. Report nothing rather
            # than substituting unrelated products.
            return [], meta

    # --- soft scoring on the remaining constraints ---
    scored = []
    for product in candidates:
        score = 0.0
        misses = 0
        product_price = float(product.get("price", 0))

        if brand:
            if (product.get("brand") or "").lower() == brand.lower():
                score += 5
            else:
                misses += 1

        if size:
            if _size_matches(product.get("size"), size):
                score += 3
            else:
                misses += 1

        if price:
            if _matches_price(product_price, price):
                score += 4
            else:
                misses += 1

        # Cheaper ranks marginally higher among equally good matches.
        score += max(0.0, 1.0 - product_price / 100.0)
        scored.append({"product": product, "score": score, "misses": misses})

    if not scored:
        return [], meta

    # Keep only the least-compromised tier, so exact matches are never diluted
    # by approximate ones.
    best_misses = min(entry["misses"] for entry in scored)
    best = [entry for entry in scored if entry["misses"] == best_misses]
    meta["exact"] = best_misses == 0

    best.sort(key=lambda entry: (-entry["score"], entry["product"].get("price", 0)))
    meta["total"] = len(best)
    return [entry["product"] for entry in best[:MAX_RESULTS]], meta


def describe(meta, lang="en"):
    """A short human description of what was searched for."""
    bits = []
    if meta.get("brand"):
        bits.append(meta["brand"])
    if meta.get("item"):
        bits.append(meta["item"])
    if meta.get("size"):
        bits.append(meta["size"])
    label = " ".join(bits) if bits else "products"

    price = meta.get("price")
    if price:
        if price.get("min") is not None and price.get("max") is not None:
            label += " between %g and %g" % (price["min"], price["max"])
        elif price.get("max") is not None:
            label += " under %g" % price["max"]
        elif price.get("min") is not None:
            label += " over %g" % price["min"]
    return label
