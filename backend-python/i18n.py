"""Localisation - English and Hindi, entirely offline.

Replaces the previous `deep_translator` / Google Translate dependency. That
approach had three problems: it made an outbound network call on every
non-English request (so the README's "no cloud" claim was false), it added
unbounded latency to the request path, and it round-tripped item names through
a translator - display them in Hindi, then translate the user's tap on
"Remove आलू" back to English and hope you land on the same dictionary key.

Here, messages are identified by *key* and formatted server-side against a
static table. Nothing is translated at request time, so output is
deterministic and the same input always renders the same text.
"""
from datastore import load_json

SUPPORTED = ("en", "hi")
DEFAULT_LANG = "en"

# English is the source of truth. Every key here must also exist in
# data/ui_hi.json, which tests/test_data_integrity.py enforces.
EN = {
    "messages": {
        "empty_list": 'Your list is empty. Try saying "add milk".',
        "no_suggestions": "No suggestions yet.",
        "not_understood": "Didn't catch that.",
        "low_confidence": "I couldn't tell what you meant - try rephrasing.",
        "unknown_unit": "Unrecognized unit used.",
        "unit_not_allowed": "Unit is not allowed for {item}.",
        "nothing_to_add": "Couldn't tell what to add.",
        "nothing_to_remove": "Couldn't tell what to remove.",
        "negative_ignored": "Negative quantities are ignored.",
        "unit_conflict": "Conflict: {item} exists with a different unit.",
        "limit_reached": "Limit reached: cannot add more {item} (max {max}).",
        "added": "Added {item}",
        "removed": "Removed {item}",
        "removed_qty": "Removed {qty} {item}",
        "not_in_list": "Couldn't find {item} in the list.",
        "list_cleared": "List cleared",
        "search_none": "No products matched {item}.",
        "search_found": "Found {count} products",
        "search_approx": "No exact match — showing the closest products.",
        "shopping_list": "Shopping List",
        "list_is_empty": "Shopping List is empty",
    },
    "reasons": {
        "frequent": "Frequently bought",
        "recent": "Bought recently",
        "regular": "A regular for you",
    },
    "categories": {},   # English category names are already the canonical keys
    "ui": {
        "orb_idle": "Tap the orb or type below",
        "orb_listening": "Listening…",
        "orb_processing": "Thinking…",
        "orb_unsupported": "Voice input not supported here — use the text field below",
        "panel_list": "Shopping list",
        "panel_suggestions": "Suggested for you",
        "panel_search": "Search results",
        "btn_clear": "Clear",
        "btn_download": "Download",
        "btn_send": "Send",
        "btn_add": "Add",
        "btn_remove": "Remove",
        "input_placeholder": "Type a command instead, e.g. add 2 bottles of water",
        "confirm_clear": "Are you sure you want to clear your entire list?",
        "already_empty": "Your list is already empty",
        "backend_unreachable": "Couldn't reach the backend server",
        "mic_error": "Mic error",
        "trace_title": "How this was understood",
    },
}

_HI = load_json("ui_hi.json")
_ALIASES_HI = load_json("aliases_hi.json")

TABLES = {"en": EN, "hi": _HI}


def normalize_lang(lang):
    """'hi-IN' -> 'hi'. Anything unsupported falls back to English rather than
    erroring, so a stale client can't 500 the server."""
    if not lang:
        return DEFAULT_LANG
    short = str(lang).split("-")[0].lower()
    return short if short in SUPPORTED else DEFAULT_LANG


def _lookup(section, key, lang):
    table = TABLES.get(lang) or {}
    value = (table.get(section) or {}).get(key)
    if value:
        return value
    return (EN.get(section) or {}).get(key)


def t(key, lang=DEFAULT_LANG, section="messages", **params):
    """Translate a message key and interpolate params.

    Falls back to English, then to the raw key, so a missing translation
    degrades to readable text instead of a KeyError in a request handler.
    """
    template = _lookup(section, key, normalize_lang(lang))
    if template is None:
        return key
    try:
        return template.format(**params)
    except (KeyError, IndexError):
        # A malformed template must not take down the request.
        return template


def ui(lang=DEFAULT_LANG):
    """The full UI string table for a language, for the client to render with."""
    lang = normalize_lang(lang)
    merged = dict(EN["ui"])
    merged.update((TABLES.get(lang) or {}).get("ui") or {})
    return merged


def category(name, lang=DEFAULT_LANG):
    """Localise a category name, falling back to the canonical English."""
    return _lookup("categories", name, normalize_lang(lang)) or name


def _build_display_names():
    """English item key -> Devanagari display name.

    Built by inverting the Devanagari half of aliases_hi.json. Items with no
    Devanagari alias keep their English name; that is a deliberate, documented
    partial-coverage fallback rather than a silent guess.
    """
    out = {}
    for alias, canonical in (_ALIASES_HI.get("items") or {}).items():
        # Only Devanagari aliases are display candidates - romanized forms
        # like "aloo" are input conveniences, not names to show back.
        if any("ऀ" <= ch <= "ॿ" for ch in alias):
            # First alias wins; the JSON lists the preferred spelling first.
            out.setdefault(canonical, alias)
    return out


DISPLAY_NAMES = {"hi": _build_display_names()}


def item_name(item, lang=DEFAULT_LANG):
    """Localise an item name for display. Never used as a lookup key - the
    canonical English key always stays on the server-side record."""
    lang = normalize_lang(lang)
    return DISPLAY_NAMES.get(lang, {}).get(item, item)
