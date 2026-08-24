import { useMemo, useState } from "react";
import { getSmartSuggestions } from "../utils/smartRecommendations.js";

function SmartSuggestions({ items, onAddSuggestion, currency = "INR" }) {
  const [addedItemName, setAddedItemName] = useState(null);

  const suggestions = useMemo(() => {
    return getSmartSuggestions(items, 6, currency);
  }, [items, currency]);

  if (suggestions.length === 0) {
    return null;
  }

  const handleAdd = (suggestion) => {
    setAddedItemName(suggestion.name);
    onAddSuggestion({
      name: suggestion.name,
      quantity: 1,
      unit: suggestion.unit,
      unit_price: suggestion.price,
      category: suggestion.category,
    });

    setTimeout(() => {
      setAddedItemName(null);
    }, 1200);
  };

  const currSymbol = currency === "INR" ? "₹" : "$";

  return (
    <section className="smart-suggestions-section" aria-label="Smart Product Suggestions">
      <div className="smart-suggestions__header">
        <div>
          <div className="section-eyebrow">Smart Recommendations</div>
          <h2 className="section-heading">Frequently paired with your items</h2>
        </div>
        <span className="suggestions-count-badge">{suggestions.length} suggestions</span>
      </div>

      <div className="suggestions-grid">
        {suggestions.map((item) => {
          const isRecentlyAdded = addedItemName === item.name;
          return (
            <div key={item.name} className="suggestion-card">
              <div className="suggestion-card__meta">
                <span className="suggestion-badge">{item.badge}</span>
                <span className="suggestion-category">{item.category}</span>
              </div>

              <div className="suggestion-card__title" title={item.name}>
                {item.name}
              </div>

              <div className="suggestion-card__footer">
                <div className="suggestion-price">
                  <span className="price-amount">{currSymbol}{item.price}</span>
                  <span className="price-unit">/ {item.unit}</span>
                </div>

                <button
                  type="button"
                  className={`add-suggestion-btn ${isRecentlyAdded ? "added" : ""}`}
                  onClick={() => handleAdd(item)}
                  disabled={isRecentlyAdded}
                  aria-label={`Add ${item.name} to shopping list`}
                >
                  {isRecentlyAdded ? "✓ Added" : "+ Add"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SmartSuggestions;
