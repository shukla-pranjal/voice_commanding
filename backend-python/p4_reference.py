import re
import os
from copy import deepcopy
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder="../frontend/dist", static_url_path="")
CORS(app)

shopping_list = []
next_id = 1
last_voice_state = None

NUMBER_WORDS = {
    # English
    "a": 1,
    "an": 1,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "dozen": 12,
    "half": 1,
    "couple": 2,
    "pair": 2,
    # Hindi / Hinglish Latin
    "ek": 1,
    "do": 2,
    "teen": 3,
    "tin": 3,
    "char": 4,
    "chaar": 4,
    "paanch": 5,
    "panch": 5,
    "che": 6,
    "chhah": 6,
    "saat": 7,
    "sat": 7,
    "aath": 8,
    "ath": 8,
    "nau": 9,
    "no": 9,
    "das": 10,
    "gyarah": 11,
    "barah": 12,
    "adha": 1,
    "aadha": 1,
    "dedh": 2,
    "dhai": 2,
    # Hindi Devanagari
    "एक": 1,
    "दो": 2,
    "तीन": 3,
    "चार": 4,
    "पाँच": 5,
    "पांच": 5,
    "छह": 6,
    "सात": 7,
    "आठ": 8,
    "नौ": 9,
    "दस": 10,
    "ग्यारह": 11,
    "बारह": 12,
    "दर्जन": 12,
    "आधा": 1,
    "डेढ़": 2,
    "ढाई": 2,
    "१": 1,
    "२": 2,
    "३": 3,
    "४": 4,
    "५": 5,
    "६": 6,
    "७": 7,
    "८": 8,
    "९": 9,
    "१०": 10,
}

UNITS_MAP = {
    "litre": "litre",
    "litres": "litre",
    "liter": "litre",
    "liters": "litre",
    "l": "litre",
    "ltr": "litre",
    "लीटर": "litre",
    "ली": "litre",
    "kg": "kg",
    "kgs": "kg",
    "kilo": "kg",
    "kilos": "kg",
    "kilogram": "kg",
    "kilograms": "kg",
    "किलो": "kg",
    "किग्रा": "kg",
    "gm": "g",
    "gms": "g",
    "g": "g",
    "gram": "g",
    "grams": "g",
    "ग्राम": "g",
    "packet": "packet",
    "packets": "packet",
    "pack": "packet",
    "packs": "packet",
    "pkt": "packet",
    "pkts": "packet",
    "पैकेट": "packet",
    "पैक": "packet",
    "bottle": "bottle",
    "bottles": "bottle",
    "btl": "bottle",
    "बोतल": "bottle",
    "बोतलें": "bottle",
    "box": "box",
    "boxes": "box",
    "डिब्बा": "box",
    "डिब्बे": "box",
    "बॉक्स": "box",
    "can": "can",
    "cans": "can",
    "कैन": "can",
    "dozen": "dozen",
    "dozens": "dozen",
    "दर्जन": "dozen",
    "piece": "piece",
    "pieces": "piece",
    "pc": "piece",
    "pcs": "piece",
    "पीस": "piece",
    "नग": "piece",
    "loaf": "loaf",
    "loaves": "loaf",
    "लोफ": "loaf",
    "jar": "jar",
    "jars": "jar",
    "बार": "bar",
    "bar": "bar",
    "bars": "bar",
}

PRICING_CATALOG = {
    "milk": {"price": 60, "category": "Dairy & Eggs", "unit": "litre"},
    "eggs": {"price": 80, "category": "Dairy & Eggs", "unit": "dozen"},
    "egg": {"price": 80, "category": "Dairy & Eggs", "unit": "dozen"},
    "butter": {"price": 55, "category": "Dairy & Eggs", "unit": "pack"},
    "cheese": {"price": 120, "category": "Dairy & Eggs", "unit": "pack"},
    "yogurt": {"price": 35, "category": "Dairy & Eggs", "unit": "cup"},
    "curd": {"price": 35, "category": "Dairy & Eggs", "unit": "cup"},
    "dahi": {"price": 35, "category": "Dairy & Eggs", "unit": "cup"},
    "bread": {"price": 40, "category": "Bakery", "unit": "loaf"},
    "cookies": {"price": 30, "category": "Bakery", "unit": "packet"},
    "biscuit": {"price": 30, "category": "Bakery", "unit": "packet"},
    "biscuits": {"price": 30, "category": "Bakery", "unit": "packet"},
    "cereal": {"price": 180, "category": "Breakfast", "unit": "box"},
    "oats": {"price": 110, "category": "Breakfast", "unit": "pack"},
    "jam": {"price": 85, "category": "Breakfast", "unit": "jar"},
    "peanut butter": {"price": 160, "category": "Breakfast", "unit": "jar"},
    "apples": {"price": 120, "category": "Produce", "unit": "kg"},
    "apple": {"price": 120, "category": "Produce", "unit": "kg"},
    "bananas": {"price": 60, "category": "Produce", "unit": "dozen"},
    "banana": {"price": 60, "category": "Produce", "unit": "dozen"},
    "potatoes": {"price": 30, "category": "Produce", "unit": "kg"},
    "potato": {"price": 30, "category": "Produce", "unit": "kg"},
    "tomatoes": {"price": 40, "category": "Produce", "unit": "kg"},
    "tomato": {"price": 40, "category": "Produce", "unit": "kg"},
    "onions": {"price": 35, "category": "Produce", "unit": "kg"},
    "onion": {"price": 35, "category": "Produce", "unit": "kg"},
    "carrots": {"price": 50, "category": "Produce", "unit": "kg"},
    "spinach": {"price": 25, "category": "Produce", "unit": "bunch"},
    "garlic": {"price": 60, "category": "Produce", "unit": "pack"},
    "ginger": {"price": 45, "category": "Produce", "unit": "pack"},
    "rice": {"price": 95, "category": "Pantry", "unit": "kg"},
    "chawal": {"price": 95, "category": "Pantry", "unit": "kg"},
    "flour": {"price": 45, "category": "Pantry", "unit": "kg"},
    "atta": {"price": 45, "category": "Pantry", "unit": "kg"},
    "dal": {"price": 130, "category": "Pantry", "unit": "kg"},
    "sugar": {"price": 48, "category": "Pantry", "unit": "kg"},
    "salt": {"price": 25, "category": "Pantry", "unit": "kg"},
    "oil": {"price": 150, "category": "Pantry", "unit": "litre"},
    "cooking oil": {"price": 150, "category": "Pantry", "unit": "litre"},
    "ghee": {"price": 320, "category": "Pantry", "unit": "jar"},
    "pasta": {"price": 75, "category": "Pantry", "unit": "pack"},
    "spices": {"price": 65, "category": "Pantry", "unit": "pack"},
    "masala": {"price": 65, "category": "Pantry", "unit": "pack"},
    "maggi": {"price": 28, "category": "Snacks", "unit": "packet"},
    "noodles": {"price": 28, "category": "Snacks", "unit": "packet"},
    "chips": {"price": 20, "category": "Snacks", "unit": "packet"},
    "sauce": {"price": 85, "category": "Pantry", "unit": "bottle"},
    "ketchup": {"price": 85, "category": "Pantry", "unit": "bottle"},
    "chocolate": {"price": 50, "category": "Snacks", "unit": "bar"},
    "tea": {"price": 140, "category": "Beverages", "unit": "pack"},
    "chai": {"price": 140, "category": "Beverages", "unit": "pack"},
    "chai patti": {"price": 140, "category": "Beverages", "unit": "pack"},
    "coffee": {"price": 190, "category": "Beverages", "unit": "jar"},
    "water": {"price": 20, "category": "Beverages", "unit": "bottle"},
    "juice": {"price": 110, "category": "Beverages", "unit": "litre"},
    "cold drink": {"price": 45, "category": "Beverages", "unit": "bottle"},
    "soda": {"price": 45, "category": "Beverages", "unit": "bottle"},
    "soap": {"price": 45, "category": "Household", "unit": "pack"},
    "detergent": {"price": 160, "category": "Household", "unit": "pack"},
    "toothpaste": {"price": 85, "category": "Household", "unit": "tube"},
    "shampoo": {"price": 180, "category": "Household", "unit": "bottle"},
    "tissue": {"price": 60, "category": "Household", "unit": "pack"},
}

ASSOCIATION_RULES = {
    "milk": ["Bread", "Eggs", "Butter", "Corn Flakes / Cereal", "Cookies", "Tea / Chai Patti"],
    "maggi": ["Tomato Ketchup / Sauce", "Cheese", "Cold Drink / Soda", "Potato Chips"],
    "bread": ["Butter", "Fruit Jam", "Eggs", "Peanut Butter", "Milk"],
    "tea": ["Sugar", "Milk", "Cookies", "Ginger"],
    "chai": ["Sugar", "Milk", "Cookies", "Ginger"],
    "coffee": ["Milk", "Sugar", "Cookies", "Chocolate Bar"],
    "rice": ["Lentils / Dal", "Pure Ghee", "Cooking Oil", "Mixed Spices / Masala"],
    "potato": ["Onions", "Tomatoes", "Garlic", "Ginger", "Cooking Oil"],
    "potatoes": ["Onions", "Tomatoes", "Garlic", "Ginger", "Cooking Oil"],
    "soap": ["Shampoo", "Toothpaste", "Laundry Detergent"],
}


def lookup_product_details(name):
    clean = clean_item_name(name).lower()
    for key, data in PRICING_CATALOG.items():
        if key == clean or key in clean or clean in key:
            return data["price"], data["category"], data["unit"]
    
    # Generic category fallback
    cat = "Groceries"
    if re.search(r"tomato|potato|onion|carrot|spinach|apple|banana|fruit|vegetable|aaloo|pyaaz|tamatar", clean):
        cat = "Produce"
    elif re.search(r"soap|detergent|tissue|paste|shampoo|cleaner", clean):
        cat = "Household"
    elif re.search(r"tea|coffee|water|juice|drink|soda|chai", clean):
        cat = "Beverages"
    elif re.search(r"maggi|chips|biscuit|cookie|chocolate|snack", clean):
        cat = "Snacks"
    elif re.search(r"milk|cheese|egg|butter|curd|dahi|paneer", clean):
        cat = "Dairy & Eggs"
    
    return 60, cat, "pack"


def serialize_item(item):
    price = item.get("unit_price")
    if price is None:
        price, cat, unit = lookup_product_details(item["name"])
        item["unit_price"] = price
        item["category"] = item.get("category", cat)
        item["unit"] = item.get("unit", unit)

    return {
        "id": item["id"],
        "name": item["name"],
        "quantity": item["quantity"],
        "unit": item.get("unit", "pack"),
        "unit_price": item.get("unit_price", 60),
        "total": round(item["quantity"] * item.get("unit_price", 60), 2),
        "category": item.get("category", "Groceries"),
        "checked": item.get("checked", False),
    }


def clean_item_name(raw_name):
    name = (raw_name or "").strip()
    name = re.sub(r"^[.,?!;:।\s]+|[.,?!;:।\s]+$", "", name)
    name = re.sub(r"\s+on\s+my\s+list$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+in\s+my\s+list$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+off\s+my\s+list$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+add\s+karo$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+jodo$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+daalo$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+dal\s+do$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+chahiye$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+hatao$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+nikalo$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+delete\s+karo$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+done\s+karo$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\s+khareed\s+liya$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"^(?:bottles?|packets?|boxes?|bags?|cans?|jars?|loaves?|kg|litres?|liters?|packet|kilo)\s+of\s+", "", name, flags=re.IGNORECASE)
    name = re.sub(r"^[.,?!;:।\s]+|[.,?!;:।\s]+$", "", name).strip()
    if not name or len(name) < 2 or not re.search(r"[a-zA-Z\u0900-\u097F]", name):
        return ""
    return name.title()


NUMBER_PATTERN_STR = r"\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|half|couple|pair|ek|do|teen|tin|char|chaar|paanch|panch|che|chhah|saat|sat|aath|ath|nau|no|das|gyarah|barah|adha|aadha|dedh|dhai|एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस|ग्यारह|बारह|दर्जन|आधा|डेढ़|ढाई|[१-९]|१०"
UNIT_PATTERN_STR = r"kg|kgs|kilo|kilos|kilogram|kilograms|litre|litres|liter|liters|l|ltr|gm|gms|g|gram|grams|packet|packets|pack|packs|pkt|pkts|bottle|bottles|btl|box|boxes|can|cans|dozen|dozens|piece|pieces|pc|pcs|loaf|loaves|jar|jars|लीटर|ली|किलो|किग्रा|ग्राम|पैकेट|पैक|बोतल|बोतलें|डिब्बा|डिब्बे|बॉक्स|कैन|दर्जन|पीस|लोफ"


def parse_quantity_unit_and_name(raw_name):
    text = (raw_name or "").strip()
    text = re.sub(r"^[.,?!;:।\s]+|[.,?!;:।\s]+$", "", text).strip()
    if not text:
        return 1, "pack", ""

    # 1. Check compound regex: number + unit + item
    compound_pattern = rf"^({NUMBER_PATTERN_STR})\s*({UNIT_PATTERN_STR})\s*(?:of\s+|mein\s+|ka\s+|ke\s+)?(.+)$"
    compound_match = re.match(compound_pattern, text, re.IGNORECASE)
    if compound_match:
        qty_str = compound_match.group(1).lower()
        unit_str = compound_match.group(2).lower()
        rest = compound_match.group(3).strip()

        quantity = int(qty_str) if qty_str.isdigit() else NUMBER_WORDS.get(qty_str, 1)
        unit = UNITS_MAP.get(unit_str, "pack")
        name = clean_item_name(rest)
        if name:
            return max(1, quantity), unit, name

    # 2. Check simple number + item: "2 apples", "three bananas", "ek bread"
    simple_pattern = rf"^({NUMBER_PATTERN_STR})\s+(.+)$"
    simple_match = re.match(simple_pattern, text, re.IGNORECASE)
    if simple_match:
        qty_str = simple_match.group(1).lower()
        rest = simple_match.group(2).strip()
        quantity = int(qty_str) if qty_str.isdigit() else NUMBER_WORDS.get(qty_str, 1)
        name = clean_item_name(rest)
        if name:
            price, cat, default_unit = lookup_product_details(name)
            return max(1, quantity), default_unit, name

    # 3. Fallback: Entire text is product name
    name = clean_item_name(text)
    price, cat, default_unit = lookup_product_details(name)
    return 1, default_unit, name


def find_item(name):
    normalized = name.lower().rstrip("s").strip()
    return next(
        (item for item in shopping_list if item["name"].lower().rstrip("s").strip() == normalized),
        None,
    )


def remember_voice_state():
    global last_voice_state
    last_voice_state = (deepcopy(shopping_list), next_id)


def split_command_items(phrase):
    # Splits by "and", ",", "aur", "tatha", "wa", "और", "तथा", "&"
    parts = re.split(r"\s*(?:,|\band\b|\baur\b|\btatha\b|\bwa\b|\bevam\b|&|\bऔर\b|\bतथा\b)\s*", phrase, flags=re.IGNORECASE)
    return [part.strip() for part in parts if part.strip()]


def add_item_to_list(name, quantity=1, unit=None, unit_price=None):
    global next_id
    if not name:
        return None
    
    price, cat, default_unit = lookup_product_details(name)
    final_unit = unit or default_unit
    final_price = unit_price or price

    existing = find_item(name)
    if existing:
        existing["quantity"] += quantity
        existing["checked"] = False
        if unit:
            existing["unit"] = unit
        return existing

    item = {
        "id": next_id,
        "name": name,
        "quantity": quantity,
        "unit": final_unit,
        "unit_price": final_price,
        "category": cat,
        "checked": False,
    }
    next_id += 1
    shopping_list.append(item)
    return item


def format_changes(changes):
    return ", ".join(f"{action} {quantity} {name}" for action, name, quantity in changes)


# ================= ROUTES =================

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


@app.route("/api/items", methods=["GET"])
def get_items():
    return jsonify({"items": [serialize_item(item) for item in shopping_list]})


@app.route("/api/items", methods=["POST"])
def add_item():
    global next_id
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Item name is required"}), 400

    quantity = data.get("quantity", 1)
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return jsonify({"error": "Quantity must be a number"}), 400

    if quantity < 1:
        return jsonify({"error": "Quantity must be at least 1"}), 400

    unit = data.get("unit")
    unit_price = data.get("unit_price")
    item = add_item_to_list(name, quantity, unit, unit_price)

    return jsonify({
        "item": serialize_item(item),
        "items": [serialize_item(entry) for entry in shopping_list],
    }), 201


@app.route("/api/items/<int:item_id>", methods=["PUT"])
def update_item(item_id):
    data = request.get_json(silent=True) or {}
    for item in shopping_list:
        if item["id"] == item_id:
            if "quantity" in data:
                try:
                    new_quantity = int(data["quantity"])
                except (TypeError, ValueError):
                    return jsonify({"error": "Quantity must be a number"}), 400
                if new_quantity < 1:
                    return jsonify({"error": "Quantity must be at least 1"}), 400
                item["quantity"] = new_quantity

            if "checked" in data:
                item["checked"] = bool(data["checked"])

            if "unit" in data:
                item["unit"] = data["unit"]

            if "unit_price" in data:
                try:
                    item["unit_price"] = float(data["unit_price"])
                except (TypeError, ValueError):
                    pass

            return jsonify({
                "item": serialize_item(item),
                "items": [serialize_item(entry) for entry in shopping_list],
            })

    return jsonify({"error": "Item not found"}), 404


@app.route("/api/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    global shopping_list
    before = len(shopping_list)
    shopping_list = [item for item in shopping_list if item["id"] != item_id]

    if len(shopping_list) == before:
        return jsonify({"error": "Item not found"}), 404

    return jsonify({"items": [serialize_item(item) for item in shopping_list]})


@app.route("/api/items/clear", methods=["DELETE"])
def clear_items():
    shopping_list.clear()
    return jsonify({"items": []})


@app.route("/api/suggestions", methods=["GET"])
def get_suggestions():
    current_names = {item["name"].lower() for item in shopping_list}
    suggestions = []
    
    for item in shopping_list:
        name_lower = item["name"].lower()
        for key, recs in ASSOCIATION_RULES.items():
            if key in name_lower:
                for rec in recs:
                    if rec.lower() not in current_names and rec not in suggestions:
                        suggestions.append(rec)
    
    # Fallback popular suggestions if empty
    popular = ["Milk", "Bread", "Eggs", "Apples", "Bananas", "Maggi / Instant Noodles", "Tea / Chai Patti"]
    for pop in popular:
        if pop.lower() not in current_names and pop not in suggestions:
            suggestions.append(pop)
            
    return jsonify({"suggestions": suggestions[:6]})


@app.route("/api/invoice/preview", methods=["POST"])
def preview_invoice():
    serialized_items = [serialize_item(item) for item in shopping_list]
    subtotal = sum(item["total"] for item in serialized_items)
    tax_rate = 0.05
    tax_amount = round(subtotal * tax_rate, 2)
    grand_total = round(subtotal + tax_amount, 2)

    return jsonify({
        "invoiceNumber": f"INV-{datetime.now().strftime('%Y%m%d')}-{len(shopping_list):03d}",
        "date": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "items": serialized_items,
        "subtotal": subtotal,
        "taxRate": tax_rate,
        "taxAmount": tax_amount,
        "grandTotal": grand_total,
    })


@app.route("/api/voice-command", methods=["POST"])
def handle_voice_command():
    global last_voice_state, next_id
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Voice command text is required"}), 400

    normalized = text.lower()

    # 1. UNDO
    if normalized in {"undo", "undo that", "go back", "wapas", "wapas lo", "piche jao", "वापस लो", "अनडू"}:
        if last_voice_state is None:
            return jsonify({"error": "There is no voice action to undo."}), 400
        previous_items, previous_next_id = last_voice_state
        last_voice_state = None
        shopping_list.clear()
        shopping_list.extend(previous_items)
        next_id = previous_next_id
        return jsonify({
            "message": "Last voice action undone.",
            "items": [serialize_item(item) for item in shopping_list],
        })

    # 2. CLEAR LIST
    if normalized in {"clear list", "clear my list", "empty list", "clear all", "sab hatao", "list saaf karo", "सब हटाओ", "लिस्ट खाली करो"}:
        remember_voice_state()
        shopping_list.clear()
        return jsonify({"message": "List cleared", "items": []})

    remember_voice_state()
    changes = []

    # 3. MARK DONE / COMPLETE / BOUGHT
    complete_match = re.match(r"^(?:mark|set)\s+(.+?)\s+(?:as\s+)?(?:done|complete|completed)$", normalized)
    bought_match = re.match(r"^(?:i bought|bought)\s+(.+)$", normalized)
    hindi_done = re.match(r"^(.+?)\s+(?:done\s+karo|khareed\s+liya|kharid\s+liya|टिक\s+करो|खरीद\s+लिया)$", normalized)

    if complete_match or bought_match or hindi_done:
        matched_str = (complete_match or bought_match or hindi_done).group(1)
        name = clean_item_name(matched_str)
        item = find_item(name)
        if not item:
            last_voice_state = None
            return jsonify({"error": f"{name.title()} is not on your list."}), 404
        item["checked"] = True
        changes.append(("Completed", item["name"], item["quantity"]))

    # 4. REMOVE / DELETE
    elif re.match(r"^(?:remove|delete|take)\s+", normalized) or normalized.startswith("i don't need ") or re.search(r"(?:hatao|nikalo|delete\s+karo|हटाओ|निकालो)$", normalized):
        phrase = re.sub(r"^(?:remove|delete|take)\s+|^i don't need\s+", "", normalized).strip()
        phrase = re.sub(r"\s+(?:off\s+my\s+list|hatao|nikalo|delete\s+karo|हटाओ|निकालो)$", "", phrase).strip()
        quantity, unit, raw_name = parse_quantity_unit_and_name(phrase)
        name = clean_item_name(raw_name)
        item = find_item(name)
        if not item:
            last_voice_state = None
            return jsonify({"error": f"{name.title()} is not on your list."}), 404
        
        # If user explicitly said "remove X" without a smaller number, remove entire item
        if quantity == 1 and raw_name.lower() == phrase.lower():
            shopping_list.remove(item)
            changes.append(("Removed", item["name"], item["quantity"]))
        else:
            item["quantity"] -= quantity
            if item["quantity"] <= 0:
                shopping_list.remove(item)
                changes.append(("Removed", item["name"], quantity))
            else:
                changes.append(("Reduced", item["name"], quantity))

    # 5. CHANGE / INCREASE / DECREASE QUANTITY
    else:
        change_match = re.match(r"^(?:make|set|change)\s+(.+?)\s+(?:to\s+)?(\d+|[a-z\u0900-\u097F]+)$", normalized)
        increase_match = re.match(r"^(?:increase|add)\s+(.+?)\s+by\s+(\d+|[a-z\u0900-\u097F]+)$", normalized)
        decrease_match = re.match(r"^(?:reduce)\s+(.+?)\s+by\s+(\d+|[a-z\u0900-\u097F]+)$", normalized)
        more_match = re.match(r"^add\s+(.+?)\s+more\s+(.+)$", normalized)
        hindi_change = re.match(r"^(.+?)\s+(\d+|[a-z\u0900-\u097F]+)\s+(?:karo|kar\s+do|badhao|kam\s+karo)$", normalized)

        if change_match:
            name = clean_item_name(change_match.group(1))
            qty_text = change_match.group(2)
            quantity = int(qty_text) if qty_text.isdigit() else NUMBER_WORDS.get(qty_text)
            item = find_item(name)
            if not item or quantity is None or quantity < 1:
                return jsonify({"error": f"Could not change {name.title()}."}), 400
            item["quantity"] = quantity
            changes.append(("Set", item["name"], quantity))

        elif increase_match or decrease_match or more_match:
            match = increase_match or decrease_match
            if match:
                name = clean_item_name(match.group(1))
                qty_text = match.group(2)
                quantity = int(qty_text) if qty_text.isdigit() else NUMBER_WORDS.get(qty_text, 1)
                amount = quantity if increase_match else -quantity
            else:
                quantity, unit, raw_name = parse_quantity_unit_and_name(more_match.group(1))
                name, amount = clean_item_name(more_match.group(2)), quantity

            item = find_item(name)
            if not item:
                return jsonify({"error": f"{name.title()} is not on your list."}), 404
            item["quantity"] += amount
            if item["quantity"] <= 0:
                shopping_list.remove(item)
            changes.append(("Updated", item["name"], abs(amount)))

        # 6. ADD NATURAL VARIATIONS (English, Hindi, Hinglish)
        else:
            phrase = normalized
            # Strip prefixes
            phrase = re.sub(r"^(?:please\s+|can\s+you\s+|kripya\s+)?", "", phrase)
            phrase = re.sub(r"^(?:add|buy|get|bring|put|i\s+need|i\s+want\s+to\s+buy|i\s+want|meri\s+list\s+mein|list\s+mein|mujhe\s+chahiye|hamari\s+list\s+mein|मेरी\s+लिस्ट\s+में|लिस्ट\s+में|मुझे\s+चाहिए)\s+", "", phrase)
            phrase = re.sub(r"\s+(?:on\s+my\s+list|in\s+my\s+list|add\s+karo|daalo|dal\s+do|jodo|le\s+aao|chahiye|खरीदना\s+है|जोड़ो|डालो|चाहिए)$", "", phrase)

            for part in split_command_items(phrase):
                part = part.strip()
                if not part:
                    continue
                quantity, unit, raw_name = parse_quantity_unit_and_name(part)
                name = clean_item_name(raw_name)
                if not name:
                    continue
                add_item_to_list(name, quantity, unit)
                changes.append(("Added", name, quantity))

    if not changes:
        last_voice_state = None
        return jsonify({"error": "We could not understand that command. Please try speaking again."}), 400

    return jsonify({
        "message": format_changes(changes) + ".",
        "items": [serialize_item(item) for item in shopping_list],
    })


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    requested_file = os.path.join(app.static_folder, path) if path else None
    if requested_file and os.path.isfile(requested_file):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
