import { getProductPrice, getProductCategory, getProductUnit, lookupProduct } from "./pricingCatalog.js";

const NUMBER_WORDS = {
  // English
  "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
  "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
  "dozen": 12, "half": 1, "couple": 2, "pair": 2,
  // Hindi / Hinglish Latin
  "ek": 1, "do": 2, "teen": 3, "tin": 3, "char": 4, "chaar": 4, "paanch": 5, "panch": 5,
  "che": 6, "chhah": 6, "saat": 7, "sat": 7, "aath": 8, "ath": 8, "nau": 9, "no": 9, "das": 10,
  "gyarah": 11, "barah": 12, "adha": 1, "aadha": 1, "dedh": 2, "dhai": 2,
  // Devanagari
  "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5, "छह": 6, "सात": 7,
  "आठ": 8, "नौ": 9, "दस": 10, "ग्यारह": 11, "बारह": 12, "दर्जन": 12, "आधा": 1, "डेढ़": 2, "ढाई": 2,
  "१": 1, "२": 2, "३": 3, "४": 4, "५": 5, "६": 6, "७": 7, "८": 8, "९": 9, "१०": 10
};

const NUMBER_PATTERN_STR = "\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|half|couple|pair|ek|do|teen|tin|char|chaar|paanch|panch|che|chhah|saat|sat|aath|ath|nau|no|das|gyarah|barah|adha|aadha|dedh|dhai|एक|दो|तीन|चार|पाँच|पांच|छह|सात|आठ|नौ|दस|ग्यारह|बारह|दर्जन|आधा|डेढ़|ढाई|[१-९]|१०";

const UNIT_PATTERN_STR = "kg|kgs|kilo|kilos|kilogram|kilograms|litre|litres|liter|liters|l|ltr|gm|gms|g|gram|grams|packet|packets|pack|packs|pkt|pkts|bottle|bottles|btl|box|boxes|can|cans|dozen|dozens|piece|pieces|pc|pcs|loaf|loaves|jar|jars|लीटर|ली|किलो|किग्रा|ग्राम|पैकेट|पैक|बोतल|बोतलें|डिब्बा|डिब्बे|बॉक्स|कैन|दर्जन|पीस|लोफ";

let lastVoiceState = null;

export function cleanItemName(rawName) {
  let name = (rawName || "").trim();
  // Strip leading and trailing punctuation & whitespace
  name = name.replace(/^[.,?!;:।\s]+|[.,?!;:।\s]+$/g, "");
  name = name.replace(/\s+(?:on\s+my\s+list|in\s+my\s+list|off\s+my\s+list|add\s+karo|daalo|dal\s+do|jodo|chahiye|hatao|nikalo|delete\s+karo|done\s+karo|khareed\s+liya)$/i, "");
  name = name.replace(/^(?:bottles?|packets?|boxes?|bags?|cans?|jars?|loaves?|kg|litres?|liters?|packet|kilo)\s+of\s+/i, "");
  name = name.replace(/^[.,?!;:।\s]+|[.,?!;:।\s]+$/g, "").trim();

  if (!name || !/[a-zA-Z\u0900-\u097F]/.test(name)) {
    return "";
  }

  const match = lookupProduct(name);
  return match ? match.name : name.charAt(0).toUpperCase() + name.slice(1);
}

export function parseQuantityAndName(rawText) {
  let text = (rawText || "").trim();
  text = text.replace(/^[.,?!;:।\s]+|[.,?!;:।\s]+$/g, "").trim();
  if (!text) return { quantity: 1, name: "" };

  // 1. Check compound number + unit + item: "2 litres of milk", "3 packets biscuits", "2 kg potatoes"
  const compoundRegex = new RegExp(`^(${NUMBER_PATTERN_STR})\\s*(${UNIT_PATTERN_STR})\\s*(?:of\\s+|mein\\s+|ka\\s+|ke\\s+)?(.+)$`, "i");
  const compoundMatch = text.match(compoundRegex);

  if (compoundMatch) {
    const qtyStr = compoundMatch[1].toLowerCase();
    const rest = compoundMatch[3].trim();
    let qty = 1;
    if (/^\d+$/.test(qtyStr)) {
      qty = parseInt(qtyStr, 10);
    } else if (NUMBER_WORDS[qtyStr]) {
      qty = NUMBER_WORDS[qtyStr];
    }
    const name = cleanItemName(rest);
    if (name) {
      return { quantity: Math.max(1, qty), name };
    }
  }

  // 2. Check simple number + item: "2 apples", "three bananas", "ek bread", "2 milk"
  const simpleRegex = new RegExp(`^(${NUMBER_PATTERN_STR})\\s+(.+)$`, "i");
  const simpleMatch = text.match(simpleRegex);

  if (simpleMatch) {
    const qtyStr = simpleMatch[1].toLowerCase();
    const rest = simpleMatch[2].trim();
    let qty = 1;
    if (/^\d+$/.test(qtyStr)) {
      qty = parseInt(qtyStr, 10);
    } else if (NUMBER_WORDS[qtyStr]) {
      qty = NUMBER_WORDS[qtyStr];
    }
    const name = cleanItemName(rest);
    if (name) {
      return { quantity: Math.max(1, qty), name };
    }
  }

  // 3. Fallback: Entire text is item name with quantity 1 (e.g. "milk", "bread", "green tea", "apple")
  return { quantity: 1, name: cleanItemName(text) };
}

export function splitCommandItems(phrase) {
  return phrase
    .split(/\s*(?:,|\band\b|\baur\b|\btatha\b|\bwa\b|\bevam\b|&|\bऔर\b|\bतथा\b)\s*/i)
    .map((p) => p.replace(/^[.,?!;:।\s]+|[.,?!;:।\s]+$/g, "").trim())
    .filter(Boolean);
}

/**
 * Client-side fallback parser for voice commands
 */
export function parseVoiceCommandClient(transcript, currentItems = []) {
  let normalized = (transcript || "").trim().toLowerCase();
  normalized = normalized.replace(/^[.,?!;:।\s]+|[.,?!;:।\s]+$/g, "").trim();

  if (!normalized) {
    return { error: "We could not hear a clear command. Please try speaking again.", items: currentItems };
  }

  // 1. UNDO
  if (["undo", "undo that", "go back", "wapas", "wapas lo", "piche jao", "वापस लो", "अनडू"].includes(normalized)) {
    if (!lastVoiceState) {
      return { error: "There is no voice action to undo.", items: currentItems };
    }
    const restored = [...lastVoiceState];
    lastVoiceState = null;
    return { message: "Last voice action undone.", items: restored };
  }

  // 2. CLEAR LIST
  if (["clear list", "clear my list", "empty list", "clear all", "sab hatao", "list saaf karo", "सब हटाओ", "लिस्ट खाली करो"].includes(normalized)) {
    lastVoiceState = [...currentItems];
    return { message: "List cleared.", items: [] };
  }

  lastVoiceState = [...currentItems];
  let items = [...currentItems];
  const changes = [];

  // 3. MARK DONE / COMPLETE / BOUGHT
  const completeMatch = normalized.match(/^(?:mark|set)\s+(.+?)\s+(?:as\s+)?(?:done|complete|completed)$/i);
  const boughtMatch = normalized.match(/^(?:i bought|bought)\s+(.+)$/i);
  const hindiDone = normalized.match(/^(.+?)\s+(?:done\s+karo|khareed\s+liya|kharid\s+liya|टिक\s+करो|खरीद\s+लिया)$/i);

  if (completeMatch || boughtMatch || hindiDone) {
    const raw = (completeMatch || boughtMatch || hindiDone)[1];
    const name = cleanItemName(raw);
    if (name) {
      const item = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
      if (!item) {
        return { error: `${name} is not on your list.`, items };
      }
      item.checked = true;
      changes.push(`Completed ${item.quantity} ${item.name}`);
    }
  }

  // 4. REMOVE / DELETE
  else if (/^(?:remove|delete|take)\s+/i.test(normalized) || normalized.startsWith("i don't need ") || /(?:hatao|nikalo|delete\s+karo|हटाओ|निकालो)$/i.test(normalized)) {
    let phrase = normalized.replace(/^(?:remove|delete|take)\s+|^i don't need\s+/i, "").trim();
    phrase = phrase.replace(/\s+(?:off\s+my\s+list|hatao|nikalo|delete\s+karo|हटाओ|निकालो)$/i, "").trim();
    const { quantity, name } = parseQuantityAndName(phrase);
    if (name) {
      const item = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
      if (!item) {
        return { error: `${name} is not on your list.`, items };
      }
      if (quantity === 1 && name.toLowerCase() === phrase.toLowerCase()) {
        items = items.filter((i) => i.id !== item.id);
        changes.push(`Removed ${item.name}`);
      } else {
        item.quantity -= quantity;
        if (item.quantity <= 0) {
          items = items.filter((i) => i.id !== item.id);
          changes.push(`Removed ${item.name}`);
        } else {
          changes.push(`Reduced ${item.name} by ${quantity}`);
        }
      }
    }
  }

  // 5. CHANGE QUANTITY
  else if (/^(?:make|set|change)\s+/i.test(normalized) || /by\s+(\d+|[a-z]+)$/i.test(normalized)) {
    const changeMatch = normalized.match(/^(?:make|set|change)\s+(.+?)\s+(?:to\s+)?(\d+|[a-z\u0900-\u097F]+)$/i);
    if (changeMatch) {
      const name = cleanItemName(changeMatch[1]);
      const qtyStr = changeMatch[2].toLowerCase();
      const qty = /^\d+$/.test(qtyStr) ? parseInt(qtyStr, 10) : NUMBER_WORDS[qtyStr];
      if (name && qty) {
        const item = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
        if (!item) {
          return { error: `Could not find ${name} on list.`, items };
        }
        item.quantity = qty;
        changes.push(`Set ${item.name} to ${qty}`);
      }
    }
  }

  // 6. ADD NATURAL COMMANDS
  else {
    let phrase = normalized;
    phrase = phrase.replace(/^(?:please\s+|can\s+you\s+|kripya\s+)?/i, "");
    phrase = phrase.replace(/^(?:add|buy|get|bring|put|i\s+need|i\s+want\s+to\s+buy|i\s+want|meri\s+list\s+mein|list\s+mein|mujhe\s+chahiye|hamari\s+list\s+mein|मेरी\s+लिस्ट\s+में|लिस्ट\s+में|मुझे\s+चाहिए)\s+/i, "");
    phrase = phrase.replace(/\s+(?:on\s+my\s+list|in\s+my\s+list|add\s+karo|daalo|dal\s+do|jodo|le\s+aao|chahiye|खरीदना\s+है|जोड़ो|डालो|चाहिए)$/i, "");

    const parts = splitCommandItems(phrase);
    for (const part of parts) {
      if (!part) continue;
      const { quantity, name } = parseQuantityAndName(part);
      if (!name) continue;

      const existing = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        existing.quantity += quantity;
        existing.checked = false;
        changes.push(`Added ${quantity} more ${existing.name}`);
      } else {
        const price = getProductPrice(name);
        const cat = getProductCategory(name);
        const unit = getProductUnit(name);
        items.push({
          id: Date.now() + Math.floor(Math.random() * 1000),
          name,
          quantity,
          unit,
          unit_price: price,
          total: price * quantity,
          category: cat,
          checked: false,
        });
        changes.push(`Added ${quantity} ${name}`);
      }
    }
  }

  if (changes.length === 0) {
    lastVoiceState = null;
    return { error: "We could not hear a clear product name. Please try speaking again.", items };
  }

  return { message: `${changes.join(", ")}.`, items };
}
