import { lookupProduct, getProductPrice, getProductUnit, getProductCategory } from "./pricingCatalog.js";

// Pairings & Co-occurrence Matrix
export const PRODUCT_ASSOCIATIONS = {
  milk: ["Bread", "Eggs", "Butter", "Corn Flakes / Cereal", "Cookies", "Tea / Chai Patti"],
  eggs: ["Bread", "Butter", "Milk", "Cheese", "Tomatoes", "Onions"],
  bread: ["Butter", "Fruit Jam", "Peanut Butter", "Eggs", "Milk"],
  butter: ["Bread", "Fruit Jam", "Milk", "Eggs", "Cheese"],
  cheese: ["Bread", "Maggi / Instant Noodles", "Pasta", "Tomato Ketchup / Sauce"],
  yogurt: ["Fruit Jam", "Bananas", "Apples", "Corn Flakes / Cereal"],
  cereal: ["Milk", "Bananas", "Apples", "Yogurt"],
  
  // Instant foods & Snacks
  maggi: ["Tomato Ketchup / Sauce", "Cheese", "Cold Drink / Soda", "Potato Chips"],
  noodles: ["Tomato Ketchup / Sauce", "Cheese", "Cold Drink / Soda"],
  chips: ["Cold Drink / Soda", "Tomato Ketchup / Sauce", "Chocolate Bar"],
  sauce: ["Maggi / Instant Noodles", "Pasta", "Potato Chips", "Bread"],
  chocolate: ["Cookies", "Milk", "Potato Chips", "Instant Coffee"],
  
  // Produce pairings
  potatoes: ["Onions", "Tomatoes", "Garlic", "Ginger", "Cooking Oil"],
  potato: ["Onions", "Tomatoes", "Garlic", "Ginger", "Cooking Oil"],
  tomatoes: ["Onions", "Garlic", "Ginger", "Potatoes", "Mixed Spices / Masala"],
  tomato: ["Onions", "Garlic", "Ginger", "Potatoes", "Mixed Spices / Masala"],
  onions: ["Potatoes", "Tomatoes", "Garlic", "Ginger", "Cooking Oil"],
  onion: ["Potatoes", "Tomatoes", "Garlic", "Ginger", "Cooking Oil"],
  apples: ["Bananas", "Oranges", "Fruit Juice", "Yogurt"],
  bananas: ["Apples", "Milk", "Corn Flakes / Cereal", "Peanut Butter"],
  
  // Staples
  rice: ["Lentils / Dal", "Pure Ghee", "Cooking Oil", "Mixed Spices / Masala", "Wheat Flour / Atta"],
  dal: ["Basmati Rice", "Pure Ghee", "Wheat Flour / Atta", "Mixed Spices / Masala", "Onions"],
  flour: ["Pure Ghee", "Cooking Oil", "Lentils / Dal", "Potatoes"],
  atta: ["Pure Ghee", "Cooking Oil", "Lentils / Dal", "Potatoes"],
  pasta: ["Tomato Ketchup / Sauce", "Cheese", "Garlic", "Cooking Oil"],
  tea: ["Sugar", "Milk", "Cookies", "Ginger"],
  chai: ["Sugar", "Milk", "Cookies", "Ginger"],
  coffee: ["Milk", "Sugar", "Cookies", "Chocolate Bar"],
  
  // Household
  soap: ["Shampoo", "Toothpaste", "Laundry Detergent", "Tissue Paper / Paper Towels"],
  detergent: ["Bath Soap", "Dishwashing Liquid", "Tissue Paper / Paper Towels"],
  toothpaste: ["Bath Soap", "Shampoo", "Tissue Paper / Paper Towels"],
  shampoo: ["Bath Soap", "Toothpaste", "Tissue Paper / Paper Towels"],
};

// Popular baseline essentials when cart is new or suggestions need replenishment
export const TOP_ESSENTIALS = [
  "Milk",
  "Bread",
  "Eggs",
  "Bananas",
  "Apples",
  "Potatoes",
  "Tomatoes",
  "Onions",
  "Tea / Chai Patti",
  "Maggi / Instant Noodles",
  "Bath Soap",
  "Cooking Oil"
];

/**
 * Returns intelligent product recommendations based on current shopping list items
 */
export function getSmartSuggestions(currentItems = [], limit = 5, currency = "INR") {
  const currentNames = new Set(
    currentItems.map((item) => (item.name || "").toLowerCase().trim())
  );

  const isAlreadyInList = (name) => {
    const clean = name.toLowerCase().trim();
    if (currentNames.has(clean)) return true;
    for (const item of currentItems) {
      const iName = (item.name || "").toLowerCase();
      if (iName.includes(clean) || clean.includes(iName)) return true;
    }
    return false;
  };

  const candidateScores = new Map();

  // Score candidate items based on cart association
  for (const item of currentItems) {
    const nameLower = (item.name || "").toLowerCase();
    
    // Check product associations
    for (const [key, recommendations] of Object.entries(PRODUCT_ASSOCIATIONS)) {
      if (nameLower.includes(key)) {
        for (const rec of recommendations) {
          if (!isAlreadyInList(rec)) {
            candidateScores.set(rec, (candidateScores.get(rec) || 0) + 3);
          }
        }
      }
    }
  }

  // Sort by score
  const sortedCandidates = Array.from(candidateScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);

  // If we don't have enough, backfill with TOP_ESSENTIALS
  const suggestions = [...sortedCandidates];
  for (const essential of TOP_ESSENTIALS) {
    if (suggestions.length >= limit) break;
    if (!isAlreadyInList(essential) && !suggestions.includes(essential)) {
      suggestions.push(essential);
    }
  }

  // Map to rich suggestion objects
  return suggestions.slice(0, limit).map((name) => {
    const product = lookupProduct(name);
    return {
      name: product ? product.name : name,
      category: getProductCategory(name),
      unit: getProductUnit(name),
      price: getProductPrice(name, currency),
      badge: candidateScores.has(name) ? "Pairs well" : "Popular",
    };
  });
}
