"""Suggestions from purchase history.

Scope note: this is frequency + recency only, exactly as before. The repo also
ships seasonal.json and substitutes.json, and the old README advertised both
as part of the suggestion engine - but no code ever loaded either file. Rather
than leave that claim standing, the README now describes what this actually
does, and the two unused datasets are documented as available for future work.

The one thing that changed: the reason string was hardcoded to "Frequently
bought" for every row, including items suggested purely because they were
bought yesterday. Reasons are now derived from the same numbers that drive the
ranking, so the explanation matches the score.
"""
import time

import i18n

MAX_SUGGESTIONS = 5
RECENCY_WEIGHT = 5.0


def build(history, current_items, lang="en", now=None):
    """Rank history into suggestions, excluding what is already on the list."""
    now = now or time.time()

    frequency = {}
    last_seen = {}
    for event in history:
        item = event.get("item")
        if not item:
            continue
        frequency[item] = frequency.get(item, 0) + 1
        timestamp = event.get("timestamp", 0)
        if item not in last_seen or timestamp > last_seen[item]:
            last_seen[item] = timestamp

    on_list = {entry.get("item") for entry in current_items}

    scored = []
    for item, count in frequency.items():
        if item in on_list:
            continue
        days_since = max(1.0, (now - last_seen[item]) / 86400.0)
        recency = (1.0 / days_since) * RECENCY_WEIGHT
        score = count + recency

        # Explain the actual driver of the score instead of always claiming
        # "frequently bought".
        if count >= 3:
            reason_key = "regular"
        elif recency > count:
            reason_key = "recent"
        else:
            reason_key = "frequent"

        scored.append({
            "item": item,
            "display": i18n.item_name(item, lang),
            "score": round(score, 3),
            "count": count,
            "days_since": round(days_since, 1),
            "reason": i18n.t(reason_key, lang, section="reasons"),
        })

    scored.sort(key=lambda entry: -entry["score"])
    return scored[:MAX_SUGGESTIONS]
