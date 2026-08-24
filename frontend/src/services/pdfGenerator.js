import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates and downloads a clean, professional PDF invoice
 */
export function generateInvoicePDF({
  invoiceNumber,
  date,
  customerName = "Valued Customer",
  customerPhone = "",
  paymentMethod = "Cash on Delivery / UPI",
  items = [],
  currency = "INR",
  currencySymbol = "₹",
  subtotal = 0,
  taxAmount = 0,
  taxRate = 0.05,
  grandTotal = 0,
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const darkTextColor = [32, 35, 30];
  const mutedTextColor = [105, 116, 122];

  // Header Banner Background
  doc.setFillColor(33, 107, 130);
  doc.rect(0, 0, pageWidth, 28, "F");

  // Title / Store Branding
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("VOICE SHOPPING ASSISTANT", 15, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 235, 240);
  doc.text("Automated Voice Commerce & Smart Retail Assistant", 15, 20);

  // Invoice Title on Right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", pageWidth - 15, 14, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`# ${invoiceNumber}`, pageWidth - 15, 20, { align: "right" });

  // Invoice Meta Box
  doc.setFillColor(248, 246, 240);
  doc.setDrawColor(217, 213, 204);
  doc.roundedRect(15, 34, pageWidth - 30, 24, 2, 2, "FD");

  doc.setTextColor(...darkTextColor);
  doc.setFontSize(8.5);

  // Col 1: Customer Details
  doc.setFont("helvetica", "bold");
  doc.text("BILLED TO:", 20, 41);
  doc.setFont("helvetica", "normal");
  doc.text(customerName || "Customer", 20, 47);
  if (customerPhone) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedTextColor);
    doc.text(`Phone: ${customerPhone}`, 20, 52);
    doc.setTextColor(...darkTextColor);
  }

  // Col 2: Invoice Date & Status
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE DATE:", 85, 41);
  doc.setFont("helvetica", "normal");
  doc.text(date || new Date().toLocaleDateString(), 85, 47);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedTextColor);
  doc.text("Status: Completed", 85, 52);
  doc.setTextColor(...darkTextColor);

  // Col 3: Payment Mode
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT MODE:", 145, 41);
  doc.setFont("helvetica", "normal");
  doc.text(paymentMethod || "Direct Payment", 145, 47);
  doc.setTextColor(...mutedTextColor);
  doc.text(`Currency: ${currency} (${currencySymbol})`, 145, 52);
  doc.setTextColor(...darkTextColor);

  // Table of Items
  const currPrefix = currency === "INR" ? "Rs." : "$";
  const tableData = items.map((item, index) => {
    const unitPrice = Number(item.unit_price || 0).toFixed(2);
    const itemTotal = Number(item.total || (item.quantity * item.unit_price) || 0).toFixed(2);
    const unitStr = item.unit ? ` (${item.unit})` : "";
    return [
      index + 1,
      item.name + unitStr,
      item.category || "General",
      item.quantity,
      `${currPrefix}${unitPrice}`,
      `${currPrefix}${itemTotal}`,
    ];
  });

  autoTable(doc, {
    startY: 64,
    head: [["#", "Item Description", "Category", "Qty", "Unit Price", "Total"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [33, 107, 130],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
      cellPadding: 3.5,
    },
    bodyStyles: {
      textColor: [32, 35, 30],
      fontSize: 8.5,
      cellPadding: 3,
      lineColor: [225, 222, 215],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [250, 249, 245],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { cellWidth: 65 },
      2: { cellWidth: 35, textColor: [105, 116, 122] },
      3: { halign: "center", cellWidth: 18 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 24, fontStyle: "bold" },
    },
    margin: { left: 15, right: 15 },
  });

  // Calculate final Y after table
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 120;

  // Summary Box (Subtotal, GST, Grand Total)
  const summaryX = pageWidth - 85;
  const summaryWidth = 70;

  doc.setFillColor(248, 246, 240);
  doc.setDrawColor(217, 213, 204);
  doc.roundedRect(summaryX, finalY, summaryWidth, 34, 2, 2, "FD");

  // Subtotal
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...mutedTextColor);
  doc.text("Subtotal:", summaryX + 4, finalY + 7);
  doc.setTextColor(...darkTextColor);
  doc.text(`${currPrefix} ${subtotal.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 7, { align: "right" });

  // GST / Tax
  doc.setTextColor(...mutedTextColor);
  doc.text(`GST / Tax (${(taxRate * 100).toFixed(0)}%):`, summaryX + 4, finalY + 15);
  doc.setTextColor(...darkTextColor);
  doc.text(`${currPrefix} ${taxAmount.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 15, { align: "right" });

  // Divider Line
  doc.setDrawColor(200, 195, 185);
  doc.line(summaryX + 4, finalY + 20, summaryX + summaryWidth - 4, finalY + 20);

  // Grand Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(33, 107, 130);
  doc.text("Grand Total:", summaryX + 4, finalY + 28);
  doc.text(`${currPrefix} ${grandTotal.toFixed(2)}`, summaryX + summaryWidth - 4, finalY + 28, { align: "right" });

  // Additional Note / Terms on Left
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkTextColor);
  doc.text("Notes & Payment Information", 15, finalY + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedTextColor);
  doc.text("• Generated via Smart Voice Shopping Assistant.", 15, finalY + 13);
  doc.text("• Thank you for shopping with us!", 15, finalY + 18);
  doc.text("• For assistance or returns, contact support within 7 days.", 15, finalY + 23);

  // Footer on bottom of page
  doc.setDrawColor(217, 213, 204);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedTextColor);
  doc.text("Voice Command Shopping Assistant • Smart Multilingual Voice Commerce", 15, pageHeight - 10);
  doc.text("Page 1 of 1", pageWidth - 15, pageHeight - 10, { align: "right" });

  // Save the PDF
  const filename = `Invoice_${invoiceNumber}_${Date.now()}.pdf`;
  doc.save(filename);
  return filename;
}
