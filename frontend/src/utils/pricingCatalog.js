// Product and Pricing Catalog with standard units, categories, and bilingual aliases

export const PRODUCT_CATALOG = [
  // Dairy & Eggs
  { id: "milk", name: "Milk", aliases: ["doodh", "dudh", "दूध"], category: "Dairy & Eggs", unit: "litre", priceInr: 60, priceUsd: 2.50 },
  { id: "eggs", name: "Eggs", aliases: ["ande", "anda", "अंडे", "अंडा"], category: "Dairy & Eggs", unit: "dozen", priceInr: 80, priceUsd: 3.20 },
  { id: "butter", name: "Butter", aliases: ["makkhan", "makhan", "मक्खन"], category: "Dairy & Eggs", unit: "pack", priceInr: 55, priceUsd: 2.80 },
  { id: "cheese", name: "Cheese", aliases: ["paneer", "चीज़", "पनीर"], category: "Dairy & Eggs", unit: "pack", priceInr: 120, priceUsd: 4.50 },
  { id: "yogurt", name: "Yogurt", aliases: ["curd", "dahi", "दही"], category: "Dairy & Eggs", unit: "cup", priceInr: 35, priceUsd: 1.50 },
  { id: "cream", name: "Fresh Cream", aliases: ["malai", "मलाई"], category: "Dairy & Eggs", unit: "pack", priceInr: 70, priceUsd: 2.90 },

  // Bakery & Breakfast
  { id: "bread", name: "Bread", aliases: ["pav", "loaf", "ब्रेड"], category: "Bakery", unit: "loaf", priceInr: 40, priceUsd: 2.00 },
  { id: "croissant", name: "Croissants", aliases: ["croissants"], category: "Bakery", unit: "pack", priceInr: 90, priceUsd: 3.50 },
  { id: "cookies", name: "Cookies", aliases: ["biscuit", "biscuits", "बिस्कुट"], category: "Bakery", unit: "packet", priceInr: 30, priceUsd: 1.80 },
  { id: "cereal", name: "Corn Flakes / Cereal", aliases: ["cereal", "cornflakes", "muesli"], category: "Breakfast", unit: "box", priceInr: 180, priceUsd: 4.80 },
  { id: "oats", name: "Oats", aliases: ["oatmeal"], category: "Breakfast", unit: "pack", priceInr: 110, priceUsd: 3.40 },
  { id: "jam", name: "Fruit Jam", aliases: ["jam", "जैम"], category: "Breakfast", unit: "jar", priceInr: 85, priceUsd: 2.60 },
  { id: "peanut_butter", name: "Peanut Butter", aliases: ["peanut butter"], category: "Breakfast", unit: "jar", priceInr: 160, priceUsd: 4.20 },

  // Fresh Produce (Fruits & Vegetables)
  { id: "apples", name: "Apples", aliases: ["apple", "seb", "सेब"], category: "Produce", unit: "kg", priceInr: 120, priceUsd: 3.50 },
  { id: "bananas", name: "Bananas", aliases: ["banana", "kela", "केला", "केले"], category: "Produce", unit: "dozen", priceInr: 60, priceUsd: 1.90 },
  { id: "potatoes", name: "Potatoes", aliases: ["potato", "aaloo", "aalu", "आलू"], category: "Produce", unit: "kg", priceInr: 30, priceUsd: 1.40 },
  { id: "tomatoes", name: "Tomatoes", aliases: ["tomato", "tamatar", "टमाटर"], category: "Produce", unit: "kg", priceInr: 40, priceUsd: 1.80 },
  { id: "onions", name: "Onions", aliases: ["onion", "pyaaz", "pyaz", "कांदा", "प्याज"], category: "Produce", unit: "kg", priceInr: 35, priceUsd: 1.50 },
  { id: "carrots", name: "Carrots", aliases: ["carrot", "gajar", "गाजर"], category: "Produce", unit: "kg", priceInr: 50, priceUsd: 2.00 },
  { id: "spinach", name: "Spinach", aliases: ["palak", "पालक"], category: "Produce", unit: "bunch", priceInr: 25, priceUsd: 1.20 },
  { id: "lemons", name: "Lemons", aliases: ["lemon", "nimbu", "नींबू"], category: "Produce", unit: "pack", priceInr: 30, priceUsd: 1.00 },
  { id: "garlic", name: "Garlic", aliases: ["lahsun", "lasun", "लहसुन"], category: "Produce", unit: "pack", priceInr: 60, priceUsd: 2.20 },
  { id: "ginger", name: "Ginger", aliases: ["adrak", "अदरक"], category: "Produce", unit: "pack", priceInr: 45, priceUsd: 1.80 },
  { id: "oranges", name: "Oranges", aliases: ["orange", "santara", "संतरा"], category: "Produce", unit: "kg", priceInr: 90, priceUsd: 3.00 },

  // Pantry & Staples
  { id: "rice", name: "Basmati Rice", aliases: ["rice", "chawal", "चावल"], category: "Pantry", unit: "kg", priceInr: 95, priceUsd: 3.80 },
  { id: "flour", name: "Wheat Flour / Atta", aliases: ["atta", "aata", "flour", "आटा"], category: "Pantry", unit: "kg", priceInr: 45, priceUsd: 2.00 },
  { id: "dal", name: "Lentils / Dal", aliases: ["dal", "daal", "lentils", "दाल"], category: "Pantry", unit: "kg", priceInr: 130, priceUsd: 3.90 },
  { id: "sugar", name: "Sugar", aliases: ["cheeni", "chini", "शक्कर", "चीनी"], category: "Pantry", unit: "kg", priceInr: 48, priceUsd: 1.60 },
  { id: "salt", name: "Salt", aliases: ["namak", "नमक"], category: "Pantry", unit: "kg", priceInr: 25, priceUsd: 0.90 },
  { id: "oil", name: "Cooking Oil", aliases: ["cooking oil", "tel", "तेल"], category: "Pantry", unit: "litre", priceInr: 150, priceUsd: 4.50 },
  { id: "ghee", name: "Pure Ghee", aliases: ["desi ghee", "घी"], category: "Pantry", unit: "jar", priceInr: 320, priceUsd: 8.50 },
  { id: "pasta", name: "Pasta", aliases: ["macaroni", "पास्ता"], category: "Pantry", unit: "pack", priceInr: 75, priceUsd: 2.20 },
  { id: "spices", name: "Mixed Spices / Masala", aliases: ["masala", "haldi", "mirch", "मसाला"], category: "Pantry", unit: "pack", priceInr: 65, priceUsd: 2.40 },

  // Snacks & Instant Food
  { id: "maggi", name: "Maggi / Instant Noodles", aliases: ["maggi", "noodles", "मैगी", "नूडल्स"], category: "Snacks", unit: "packet", priceInr: 28, priceUsd: 1.20 },
  { id: "chips", name: "Potato Chips", aliases: ["chips", "wafers", "चिप्स"], category: "Snacks", unit: "packet", priceInr: 20, priceUsd: 1.00 },
  { id: "sauce", name: "Tomato Ketchup / Sauce", aliases: ["ketchup", "sauce", "टोमैटो सॉस"], category: "Pantry", unit: "bottle", priceInr: 85, priceUsd: 2.70 },
  { id: "chocolate", name: "Chocolate Bar", aliases: ["chocolate", "dairy milk", "चॉकलेट"], category: "Snacks", unit: "bar", priceInr: 50, priceUsd: 2.00 },

  // Beverages
  { id: "tea", name: "Tea / Chai Patti", aliases: ["tea", "chai", "chai patti", "चाय", "चाय पत्ती"], category: "Beverages", unit: "pack", priceInr: 140, priceUsd: 4.00 },
  { id: "coffee", name: "Instant Coffee", aliases: ["coffee", "कॉफ़ी", "कॉफी"], category: "Beverages", unit: "jar", priceInr: 190, priceUsd: 5.50 },
  { id: "water", name: "Bottled Water", aliases: ["water bottle", "paani", "पानी"], category: "Beverages", unit: "bottle", priceInr: 20, priceUsd: 1.00 },
  { id: "juice", name: "Fruit Juice", aliases: ["juice", "रस", "जूस"], category: "Beverages", unit: "litre", priceInr: 110, priceUsd: 3.20 },
  { id: "soda", name: "Cold Drink / Soda", aliases: ["cold drink", "coke", "pepsi", "soda", "कोल्ड ड्रिंक"], category: "Beverages", unit: "bottle", priceInr: 45, priceUsd: 1.80 },

  // Household & Personal Care
  { id: "soap", name: "Bath Soap", aliases: ["soap", "sabun", "साबुन"], category: "Household", unit: "pack", priceInr: 45, priceUsd: 1.60 },
  { id: "detergent", name: "Laundry Detergent", aliases: ["surf", "washing powder", "detergent"], category: "Household", unit: "pack", priceInr: 160, priceUsd: 4.80 },
  { id: "toothpaste", name: "Toothpaste", aliases: ["colgate", "toothpaste", "पेस्ट"], category: "Household", unit: "tube", priceInr: 85, priceUsd: 2.50 },
  { id: "shampoo", name: "Shampoo", aliases: ["shampoo", "शैम्पू"], category: "Household", unit: "bottle", priceInr: 180, priceUsd: 5.20 },
  { id: "tissue", name: "Tissue Paper / Paper Towels", aliases: ["tissue", "napkins", "टिशू"], category: "Household", unit: "pack", priceInr: 60, priceUsd: 2.10 },
  { id: "dishwash", name: "Dishwashing Liquid", aliases: ["vim", "prill", "dish soap"], category: "Household", unit: "bottle", priceInr: 75, priceUsd: 2.40 },
];

/**
 * Finds product catalog info by matching name or aliases
 */
export function lookupProduct(query) {
  if (!query) return null;
  let clean = query.trim().toLowerCase().replace(/^(?:bottles?|packets?|boxes?|bags?|cans?|jars?|loaves?|kg|litres?|liters?)\s+of\s+/i, "");
  clean = clean.replace(/^[.,?!;:।\s]+|[.,?!;:।\s]+$/g, "").trim();

  if (!clean || clean.length < 2) return null;
  
  // Exact name or ID match
  const exact = PRODUCT_CATALOG.find(
    (p) => p.name.toLowerCase() === clean || p.id === clean
  );
  if (exact) return exact;

  // Alias exact match
  const aliasExact = PRODUCT_CATALOG.find((p) =>
    p.aliases.some((alias) => alias.toLowerCase() === clean)
  );
  if (aliasExact) return aliasExact;

  // Alias substring match (only if alias and clean are >= 3 chars)
  const aliasMatch = PRODUCT_CATALOG.find((p) =>
    p.aliases.some((alias) => {
      const a = alias.toLowerCase();
      return (clean.length >= 3 && a.includes(clean)) || (a.length >= 3 && clean.includes(a));
    })
  );
  if (aliasMatch) return aliasMatch;

  // Substring match
  const subMatch = PRODUCT_CATALOG.find((p) => {
    const pName = p.name.toLowerCase();
    return clean.length >= 3 && (pName.includes(clean) || clean.includes(pName));
  });
  if (subMatch) return subMatch;

  return null;
}

/**
 * Gets realistic unit price for an item
 */
export function getProductPrice(name, currency = "INR") {
  const match = lookupProduct(name);
  if (match) {
    return currency === "USD" ? match.priceUsd : match.priceInr;
  }
  return currency === "USD" ? 2.50 : 60;
}

/**
 * Gets product category
 */
export function getProductCategory(name) {
  const match = lookupProduct(name);
  if (match) return match.category;

  const n = (name || "").toLowerCase();
  if (/milk|cheese|curd|dahi|butter|cream|egg|paneer/.test(n)) return "Dairy & Eggs";
  if (/apple|banana|potato|onion|tomato|carrot|spinach|fruit|vegetable|sabzi|aaloo|pyaaz|tamatar/.test(n)) return "Produce";
  if (/bread|toast|croissant|cookie|biscuit|oats|cereal|jam/.test(n)) return "Bakery & Breakfast";
  if (/rice|flour|atta|dal|oil|sugar|salt|pasta|spice|masala|ghee|sauce/.test(n)) return "Pantry";
  if (/maggi|noodle|chips|wafer|snack|chocolate|biscuit/.test(n)) return "Snacks";
  if (/tea|chai|coffee|water|juice|soda|drink|coke|pepsi/.test(n)) return "Beverages";
  if (/soap|detergent|surf|paste|shampoo|cleaner|tissue|paper|towel|dish/.test(n)) return "Household";
  return "General";
}

/**
 * Gets default unit for product
 */
export function getProductUnit(name) {
  const match = lookupProduct(name);
  if (match) return match.unit;

  const n = (name || "").toLowerCase();
  if (/milk|oil|juice|water|soda|drink/.test(n)) return "litre";
  if (/rice|atta|flour|dal|sugar|potato|onion|apple|tomato|salt/.test(n)) return "kg";
  if (/maggi|chips|biscuit|cookies|pasta|masala/.test(n)) return "packet";
  if (/egg|banana/.test(n)) return "dozen";
  if (/bread/.test(n)) return "loaf";
  if (/coffee|jam|ghee/.test(n)) return "jar";
  return "pack";
}
