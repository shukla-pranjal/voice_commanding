"""Command interpretation: transcript in, list mutations and messages out.

Kept separate from app.py so the whole decision path is testable without a
Flask request context. Messages are emitted as (key, params) pairs and
localised at the edge, so no English string is ever machine-translated.
"""
import hindi
import i18n
import nlp
import search as catalog_search
from nlp import INVALID_UNIT_RESTRICTED, INVALID_UNIT_UNKNOWN, MAX_QUANTITY


class Message:
    __slots__ = ("kind", "key", "params")

    def __init__(self, kind, key, **params):
        self.kind = kind          # "success" | "error" | "info"
        self.key = key
        self.params = params

    def render(self, lang):
        params = dict(self.params)
        if "item" in params:
            params["item"] = i18n.item_name(params["item"], lang)
        return {"type": self.kind, "text": i18n.t(self.key, lang, **params)}


def _find(items, name):
    for entry in items:
        if entry.get("item") == name:
            return entry
    return None


def _reconcile_units(entity, existing, messages):
    """Align an incoming quantity with the unit already on the list.

    Returns True if the two are compatible (converting the incoming amount in
    place when needed), False if they are not - in which case a conflict has
    been reported and the clause should be abandoned.
    """
    existing_unit = existing.get("size") or ""
    incoming_unit = entity.get("size") or ""

    if not incoming_unit or existing_unit == incoming_unit:
        return True

    if not existing_unit:
        # The list holds a bare count and the user has now supplied a unit;
        # adopt it rather than adding "2" to "500 g".
        messages.append(Message("error", "unit_conflict", item=entity["item"]))
        return False

    converted = nlp.convert_quantity(
        entity["quantity"]["value"], incoming_unit, existing_unit
    )
    if converted is None:
        messages.append(Message("error", "unit_conflict", item=entity["item"]))
        return False

    entity["quantity"]["value"] = converted
    entity["size"] = existing_unit
    return True


def _handle_add(entity, items, history, messages):
    if not entity.get("item"):
        messages.append(Message("error", "nothing_to_add"))
        return

    quantity = entity["quantity"]["value"]
    if quantity <= 0:
        messages.append(Message("error", "negative_ignored"))
        return

    existing = _find(items, entity["item"])
    if existing is not None:
        if not _reconcile_units(entity, existing, messages):
            return
        previous = existing.get("quantity", 1)
        total = previous + entity["quantity"]["value"]
        if total > MAX_QUANTITY:
            total = MAX_QUANTITY
            messages.append(
                Message("error", "limit_reached", item=entity["item"], max=MAX_QUANTITY)
            )
        existing["quantity"] = total
        added = total - previous
        if added <= 0:
            return
        entity["quantity"]["value"] = added
    else:
        if quantity > MAX_QUANTITY:
            quantity = MAX_QUANTITY
            messages.append(
                Message("error", "limit_reached", item=entity["item"], max=MAX_QUANTITY)
            )
        record = {
            "item": entity["item"],
            "category": entity.get("category") or "Other",
            "quantity": quantity,
        }
        if entity.get("size"):
            record["size"] = entity["size"]
        if entity.get("brand"):
            record["brand"] = entity["brand"]
        items.append(record)

    import time
    history.append({
        "item": (entity["item"] or "").lower(),
        "timestamp": time.time(),
        "seeded": False,
    })
    if len(history) > 500:
        del history[:-500]
    messages.append(Message("success", "added", item=entity["item"]))


def _handle_remove(entity, items, messages):
    if not entity.get("item"):
        messages.append(Message("error", "nothing_to_remove"))
        return

    existing = _find(items, entity["item"])
    if existing is None:
        messages.append(Message("error", "not_in_list", item=entity["item"]))
        return

    if not _reconcile_units(entity, existing, messages):
        return

    requested = entity["quantity"]["value"]
    if requested <= 0:
        messages.append(Message("error", "negative_ignored"))
        return

    # A bare "remove milk" means remove it entirely, not decrement by one.
    if not entity["quantity"]["explicit"] or existing.get("quantity", 1) <= requested:
        items.remove(existing)
        messages.append(Message("success", "removed", item=entity["item"]))
        return

    existing["quantity"] = existing.get("quantity", 1) - requested
    messages.append(
        Message("success", "removed_qty", item=entity["item"], qty=requested)
    )


def interpret(text, items, history, classifier, lang="en"):
    """Interpret one transcript and apply it.

    Returns a dict with rendered messages, any search results, and parser
    diagnostics (intent, confidence, slots) so the UI can show its reasoning
    instead of presenting the pipeline as a black box.
    """
    raw = (text or "").strip()
    result = {
        "messages": [],
        "search": None,
        "trace": [],
    }

    if not raw:
        result["messages"].append(Message("error", "not_understood").render(lang))
        return result

    # Hindi is canonicalised to English before anything else looks at it. The
    # verb hint is read from the original transcript, before normalisation
    # rewrites it.
    verb_hint = hindi.detect_intent(raw.lower())
    if hindi.has_devanagari(raw) or verb_hint:
        normalized, hindi_info = hindi.normalize(raw)
    else:
        normalized, hindi_info = raw, {"applied": False}
    working = normalized.lower()

    messages = []
    clauses = nlp.split_clauses(working)
    if not clauses:
        result["messages"].append(Message("error", "not_understood").render(lang))
        return result

    primary_intent = None

    if True:
        for index, clause in enumerate(clauses):
            entity = nlp.extract_entities(clause)

            decision = classifier.classify(
                clause, verb_hint=verb_hint, has_item=bool(entity.get("item"))
            )
            intent = decision["intent"]

            # Only the first clause establishes the verb; "add milk and bread"
            # must not re-classify "bread" on its own (a bare noun carries no
            # intent evidence, so the model would read it as a search). Later
            # clauses inherit the primary intent.
            inherited = False
            if index == 0:
                primary_intent = intent
            else:
                inherited = True
                intent = primary_intent

            result["trace"].append({
                "clause": clause,
                "intent": intent,
                "confidence": round(decision["confidence"], 3),
                "source": "inherited" if inherited else decision["source"],
                "low_confidence": decision["low_confidence"] and not inherited,
                "item": entity.get("item"),
                "quantity": entity["quantity"]["value"],
                "unit": entity.get("size"),
                "brand": entity.get("brand"),
                "price": entity.get("price"),
                "hindi": bool(hindi_info.get("applied")),
                "normalized": normalized if hindi_info.get("applied") else None,
            })

            if entity.get("unit_error") == INVALID_UNIT_UNKNOWN:
                messages.append(Message("error", "unknown_unit"))
                continue
            if entity.get("unit_error") == INVALID_UNIT_RESTRICTED:
                messages.append(Message("error", "unit_not_allowed", item=entity.get("item")))
                continue

            if index == 0 and decision["low_confidence"] and not entity.get("item"):
                messages.append(Message("error", "low_confidence"))
                continue

            if intent == "ADD":
                _handle_add(entity, items, history, messages)
            elif intent == "REMOVE":
                _handle_remove(entity, items, messages)
            elif intent in ("SEARCH_ITEM", "SEARCH_FILTER"):
                results, meta = catalog_search.search(entity, clause)
                result["search"] = {"results": results, "meta": meta}
                if results:
                    messages.append(
                        Message("success", "search_found", count=meta["total"])
                    )
                else:
                    messages.append(
                        Message("error", "search_none",
                                item=catalog_search.describe(meta))
                    )
            else:
                messages.append(Message("error", "not_understood"))

    result["messages"] = [m.render(lang) for m in messages]
    return result
