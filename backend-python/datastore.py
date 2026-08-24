"""Dataset loading.

Every JSON file lives in server/data/. Paths are resolved relative to *this
file*, not the process working directory - the original app.py used bare
relative paths like "data/model.onnx", which meant the server only started if
you happened to `cd server` first, and made the module impossible to import
from a test runner at the repo root.
"""
import json
import os

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def load_json(filename, default=None):
    """Load data/<filename>. Returns `default` if absent rather than raising,
    so an optional dataset (e.g. a language pack) can go missing without
    taking the whole server down."""
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return {} if default is None else default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def data_path(filename):
    return os.path.join(DATA_DIR, filename)


ITEMS = load_json("items.json")
CATEGORIES = load_json("categories.json")
BRANDS = load_json("brands.json", [])
SIZES = load_json("sizes.json")
UNIT_RESTRICTIONS = load_json("unit_restrictions.json")
CATALOG = load_json("catalog.json", [])
HISTORY_SEED = load_json("history_seed.json", [])
LABELS = load_json("labels.json").get("labels", [])
