import { useEffect, useState } from "react";
import MicButton from "../components/MicButton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import InvoiceModal from "../components/InvoiceModal.jsx";
import { getProductPrice, getProductCategory } from "../utils/pricingCatalog.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";
const frequentItems = ["Milk", "Bread", "Eggs", "Apples"];

function getCategory(itemName) {
  const name = (itemName || "").toLowerCase();
  return getProductCategory(name);
}

function ShoppingListPage({ selectedLanguage = "en-US" }) {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [shoppingMode, setShoppingMode] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadItems = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/items`);
        if (response.ok) {
          const text = await response.text();
          if (text && isMounted) {
            const data = JSON.parse(text);
            setItems(data.items ?? []);
          }
        }
      } catch (loadError) {
        console.warn("API load not available, running with local cart:", loadError);
      }
    };

    loadItems();
    return () => {
      isMounted = false;
    };
  }, []);

  const addItem = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();

    if (!trimmed) {
      setError("Please enter an item name.");
      return;
    }

    const price = getProductPrice(trimmed);
    const cat = getCategory(trimmed);
    let addedViaApi = false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, quantity, unit_price: price, category: cat }),
      });

      if (response.ok) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          setItems(data.items ?? []);
          addedViaApi = true;
        }
      }
    } catch (err) {
      console.warn("Backend add failed, using local addition:", err);
    }

    if (!addedViaApi) {
      const existing = items.find((i) => i.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + quantity, checked: false, total: (i.unit_price || price) * (i.quantity + quantity) }
              : i
          )
        );
      } else {
        const newItem = {
          id: Date.now() + Math.floor(Math.random() * 1000),
          name: trimmed,
          quantity,
          unit_price: price,
          total: price * quantity,
          category: cat,
          checked: false,
        };
        setItems((prev) => [...prev, newItem]);
      }
    }

    setInput("");
    setQuantity(1);
    setError("");
    setStatus(`${trimmed} added to your list.`);
    setTimeout(() => setStatus(""), 3500);
  };

  const updateItem = async (itemId, nextQuantity, checked) => {
    if (nextQuantity < 1) {
      removeItem(itemId);
      return;
    }

    let updatedViaApi = false;
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: nextQuantity, checked }),
      });

      if (response.ok) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          setItems(data.items ?? []);
          updatedViaApi = true;
        }
      }
    } catch (err) {
      console.warn("Backend update failed, using local update:", err);
    }

    if (!updatedViaApi) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: nextQuantity,
                checked: checked !== undefined ? checked : item.checked,
                total: (item.unit_price || 60) * nextQuantity,
              }
            : item
        )
      );
    }
  };

  const removeItem = async (itemId) => {
    let removedViaApi = false;
    try {
      const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          setItems(data.items ?? []);
          removedViaApi = true;
        }
      }
    } catch (err) {
      console.warn("Backend remove failed, using local remove:", err);
    }

    if (!removedViaApi) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    }
    setError("");
    setStatus("Item removed.");
    setTimeout(() => setStatus(""), 3000);
  };

  const clearList = async () => {
    try {
      fetch(`${API_BASE_URL}/api/items/clear`, {
        method: "DELETE",
      }).catch(() => {});
    } catch {
      // ignore
    }

    setItems([]);
    setError("");
    setStatus("Your list is empty.");
    setTimeout(() => setStatus(""), 3000);
  };

  const addFrequentItem = async (name) => {
    const price = getProductPrice(name);
    const cat = getCategory(name);
    let addedViaApi = false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity: 1, unit_price: price, category: cat }),
      });

      if (response.ok) {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          setItems(data.items ?? []);
          addedViaApi = true;
        }
      }
    } catch (err) {
      console.warn("Backend frequent item add failed, using local fallback:", err);
    }

    if (!addedViaApi) {
      const existing = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        updateItem(existing.id, existing.quantity + 1, existing.checked);
      } else {
        setItems((prev) => [
          ...prev,
          {
            id: Date.now() + Math.floor(Math.random() * 1000),
            name,
            quantity: 1,
            unit_price: price,
            total: price,
            category: cat,
            checked: false,
          },
        ]);
      }
    }

    setError("");
    setStatus(`${name} added to your list.`);
    setTimeout(() => setStatus(""), 3500);
  };

  const visibleItems = items.filter((item) => {
    const itemName = (item.name || "").trim();
    if (!itemName || itemName === "." || itemName.length < 2) return false;
    const matchesSearch = itemName.toLowerCase().includes(search.toLowerCase().trim());
    const matchesFilter = filter === "all" || (filter === "completed" ? item.checked : !item.checked);
    const matchesCategory = category === "all" || getCategory(itemName) === category;
    return matchesSearch && matchesFilter && matchesCategory;
  });

  const groupedItems = visibleItems.reduce((groups, item) => {
    const itemCategory = getCategory(item.name);
    groups[itemCategory] = [...(groups[itemCategory] || []), item];
    return groups;
  }, {});

  const completedCount = items.filter((item) => item.checked).length;
  const categories = [...new Set(items.map((item) => getCategory(item.name)))];

  return (
    <div className="shopping-page">
      <aside className="voice-panel">
        <p className="eyebrow">Quick add</p>
        <h2>Quick add</h2>
        <p className="voice-panel__lead">Add items faster.</p>
        <p className="voice-panel__copy">Use your voice for natural commands, including quantities.</p>

        <MicButton
          selectedLanguage={selectedLanguage}
          currentItems={items}
          onTranscript={setTranscript}
          onStatus={(message, isError) => {
            setStatus(isError ? "" : message);
            setError(isError ? message : "");
            if (message) setTimeout(() => { setStatus(""); setError(""); }, 4000);
          }}
          onCommand={(nextItems, message) => {
            setItems(nextItems ?? []);
            setStatus(message || "Voice command processed.");
            setError("");
            setTimeout(() => setStatus(""), 4000);
          }}
        />

        {transcript ? (
          <p className="transcript">
            <span>I heard:</span> “{transcript}”
          </p>
        ) : null}

        <section className="voice-help">
          <h3>How to use voice commands</h3>
          <p>Tap “Add by voice”, speak naturally, and we'll add the items to your list. You can include quantities or manage items you've already added.</p>
          <div className="voice-help__table">
            <strong>You can say</strong>
            <strong>What happens</strong>
            <span>“Add milk”</span>
            <span>Adds 1 milk</span>
            <span>“Add three apples and two bottles of water”</span>
            <span>Adds both items</span>
            <span>“Add two more eggs”</span>
            <span>Increases eggs by 2</span>
            <span>“मेरी लिस्ट में 2 किलो आलू जोड़ो”</span>
            <span>Adds 2kg potatoes</span>
            <span>“2 packet Maggi add karo”</span>
            <span>Adds 2 packets Maggi</span>
            <span>“Change apples to five”</span>
            <span>Sets apples to 5</span>
            <span>“Remove milk” / “ब्रेड हटाओ”</span>
            <span>Removes item</span>
            <span>“Mark bread as done” / “दूध खरीद लिया”</span>
            <span>Completes item</span>
            <span>“Undo” / “वापस लो”</span>
            <span>Reverses the last action</span>
          </div>
          <p className="voice-help__example">
            <b>Try saying</b> “Add three apples and two bottles of water”
          </p>
        </section>
      </aside>

      <section className="list-panel">
        <div className="page-intro">
          <p className="eyebrow">{shoppingMode ? "Shopping mode" : "Today"}</p>
          <h1>{shoppingMode ? "Let's get it done." : "What are you shopping for?"}</h1>
        </div>

        <form className="add-item-form" onSubmit={addItem}>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Add an item"
            aria-label="Add item"
          />
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value) || 1)}
            aria-label="Quantity"
            className="quantity-input"
          />
          <button type="submit" className="primary-button">Add item</button>
        </form>

        {error ? <div className="message error">{error}</div> : null}
        {status ? <div className="message success">{status}</div> : null}

        <div className="summary-grid" aria-label="List summary">
          <div>
            <strong>{items.length}</strong>
            <span>Total items</span>
          </div>
          <div>
            <strong>{items.length - completedCount}</strong>
            <span>Remaining</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>Completed</span>
          </div>
        </div>

        <div className="list-tools">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your items..."
              aria-label="Search your items"
            />
          </label>
          <button
            type="button"
            className={`shopping-mode-button${shoppingMode ? " active" : ""}`}
            onClick={() => setShoppingMode((current) => !current)}
          >
            {shoppingMode ? "Exit shopping" : "Start shopping"}
          </button>
        </div>

        <div className="list-header-row">
          <div className="filter-tabs" role="tablist" aria-label="Filter list">
            {["all", "active", "completed"].map((option) => (
              <button
                key={option}
                type="button"
                className={filter === option ? "selected" : ""}
                onClick={() => setFilter(option)}
              >
                {option[0].toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
          <select
            className="category-select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>
                {itemCategory}
              </option>
            ))}
          </select>
          {items.length > 0 ? (
            <button type="button" className="link-button" onClick={clearList}>
              Clear all
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="Your list is empty"
            message="Add an item by typing or using voice input above."
          />
        ) : visibleItems.length === 0 ? (
          <EmptyState title="No matching items" message="Try another search or filter." />
        ) : (
          <div className="grouped-list">
            {Object.entries(groupedItems).map(([itemCategory, categoryItems]) => (
              <div className="category-group" key={itemCategory}>
                <h3>{itemCategory}</h3>
                <ul className="shopping-list">
                  {categoryItems.map((item) => (
                    <li
                      key={item.id}
                      className={`${item.checked ? "checked" : ""}${
                        shoppingMode ? " shopping-mode-row" : ""
                      }`}
                    >
                      <label className="item-row">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(event) =>
                            updateItem(item.id, item.quantity, event.target.checked)
                          }
                        />
                        <span className="item-text">
                          {item.quantity} x {item.name}
                        </span>
                      </label>

                      <div className="item-actions">
                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            updateItem(item.id, Math.max(1, item.quantity - 1), item.checked)
                          }
                        >
                          -
                        </button>
                        <button
                          type="button"
                          className="small-button"
                          onClick={() =>
                            updateItem(item.id, item.quantity + 1, item.checked)
                          }
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Generate Invoice Action after products are added */}
        {items.length > 0 && (
          <div className="invoice-action-container">
            <button
              type="button"
              className="primary-button invoice-action-btn"
              onClick={() => setIsInvoiceOpen(true)}
            >
              🧾 Generate & Download Invoice
            </button>
          </div>
        )}

        {!shoppingMode ? (
          <section className="frequent-section">
            <h2 className="section-title">Frequently bought</h2>
            <div className="frequent-items">
              {frequentItems.map((name) => (
                <button key={name} type="button" onClick={() => addFrequentItem(name)}>
                  <span>{name}</span>
                  <b>+</b>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="shopping-progress">
            {completedCount} of {items.length} completed
          </div>
        )}
      </section>

      {/* Invoice Modal for review and PDF download */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        items={items}
        currency="INR"
      />
    </div>
  );
}

export default ShoppingListPage;
