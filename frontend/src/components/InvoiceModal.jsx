import { useState, useId } from "react";
import { generateInvoicePDF } from "../services/pdfGenerator.js";

function InvoiceModal({
  isOpen,
  onClose,
  items = [],
  currency = "INR",
}) {
  const [customerName, setCustomerName] = useState("Rajesh Sharma");
  const [customerPhone, setCustomerPhone] = useState("+91 98765 43210");
  const [paymentMethod, setPaymentMethod] = useState("UPI / Online Payment");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [invoiceNumber] = useState(() => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  const nameInputId = useId();
  const phoneInputId = useId();
  const paymentSelectId = useId();

  if (!isOpen) return null;

  const currSymbol = currency === "INR" ? "₹" : "$";
  const dateStr = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Calculate order metrics
  const activeItems = items.filter((item) => !item.checked);
  const invoiceItems = activeItems.length > 0 ? activeItems : items;

  const subtotal = invoiceItems.reduce((acc, item) => {
    const price = Number(item.unit_price) || 60;
    const qty = Number(item.quantity) || 1;
    return acc + price * qty;
  }, 0);

  const taxRate = 0.05; // 5% GST
  const taxAmount = subtotal * taxRate;
  const grandTotal = subtotal + taxAmount;

  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
      generateInvoicePDF({
        invoiceNumber,
        date: dateStr,
        customerName,
        customerPhone,
        paymentMethod,
        items: invoiceItems,
        currency,
        currencySymbol: currSymbol,
        subtotal,
        taxAmount,
        taxRate,
        grandTotal,
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not generate PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card invoice-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="invoice-modal-title">
            <span className="invoice-tag">Order Summary & Invoice</span>
            <h2>Review Order</h2>
          </div>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close invoice preview"
          >
            ✕
          </button>
        </div>

        {/* Modal Body / Paper Invoice View */}
        <div className="modal-body invoice-body">
          {/* Printable Invoice Container */}
          <div className="invoice-sheet">
            {/* Invoice Top Header */}
            <div className="invoice-header-row">
              <div className="store-brand">
                <div className="store-logo">🛍️ Voice Shopping Assistant</div>
                <div className="store-sub">Instant Voice-to-Cart & Digital Billing</div>
              </div>
              <div className="invoice-meta-right">
                <div className="invoice-badge-number">Invoice #{invoiceNumber}</div>
                <div className="invoice-date-text">{dateStr}</div>
              </div>
            </div>

            {/* Customer & Billing Details */}
            <div className="invoice-details-grid">
              <div className="detail-box">
                <label htmlFor={nameInputId}>Customer Name</label>
                <input
                  id={nameInputId}
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="detail-box">
                <label htmlFor={phoneInputId}>Phone / Contact</label>
                <input
                  id={phoneInputId}
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="detail-box">
                <label htmlFor={paymentSelectId}>Payment Mode</label>
                <select
                  id={paymentSelectId}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="UPI / QR Payment">UPI / QR Payment</option>
                  <option value="Credit / Debit Card">Credit / Debit Card</option>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Voice Pay / Wallet">Voice Pay / Wallet</option>
                </select>
              </div>
            </div>

            {/* Items Table */}
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center empty-cart-td">
                        No products selected in cart.
                      </td>
                    </tr>
                  ) : (
                    invoiceItems.map((item, index) => {
                      const uPrice = Number(item.unit_price) || 60;
                      const lineTotal = uPrice * (Number(item.quantity) || 1);
                      return (
                        <tr key={item.id || index}>
                          <td className="item-num">{index + 1}</td>
                          <td className="item-name">
                            <strong>{item.name}</strong>
                            {item.unit && <span className="item-unit-tag">({item.unit})</span>}
                          </td>
                          <td className="item-cat">{item.category || "General"}</td>
                          <td className="text-center item-qty">{item.quantity}</td>
                          <td className="text-right item-price">
                            {currSymbol}{uPrice.toFixed(2)}
                          </td>
                          <td className="text-right item-total">
                            <strong>{currSymbol}{lineTotal.toFixed(2)}</strong>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculation Totals */}
            <div className="invoice-totals-row">
              <div className="invoice-notes">
                <strong>Important Notice:</strong>
                <p>Thank you for using Voice Shopping Assistant! All items are backed by our fresh quality guarantee.</p>
              </div>

              <div className="invoice-summary-box">
                <div className="summary-row">
                  <span>Subtotal ({invoiceItems.length} items):</span>
                  <strong>{currSymbol}{subtotal.toFixed(2)}</strong>
                </div>
                <div className="summary-row">
                  <span>GST / Tax (5%):</span>
                  <span>{currSymbol}{taxAmount.toFixed(2)}</span>
                </div>
                <div className="summary-divider" />
                <div className="summary-row grand-total-row">
                  <span>Grand Total:</span>
                  <span className="grand-total-val">{currSymbol}{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-footer invoice-footer-actions">
          <div className="invoice-status-notice">
            {downloadSuccess && (
              <span className="download-success-tag">
                ✓ PDF Invoice downloaded successfully!
              </span>
            )}
          </div>

          <div className="footer-btn-group">
            <button
              type="button"
              className="secondary-button"
              onClick={handlePrint}
              title="Print invoice directly"
            >
              🖨 Print
            </button>

            <button
              type="button"
              className="primary-button download-pdf-btn"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf || invoiceItems.length === 0}
            >
              {isGeneratingPdf ? "Generating PDF..." : "📥 Download Invoice (PDF)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceModal;
