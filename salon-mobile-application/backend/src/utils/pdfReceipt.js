const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const LOGO_PATH = path.join(__dirname, "../assets/salon-logo.jpeg");
const BRAND_RED = "#C5161D";
const PAGE_MARGIN = 36;
const COMPANY_INFO = {
  location: "Main Street, Diyathalawa",
  phone: "+94 729 300 846",
  email: "salon.oski.0@gmail.com",
  website: "https://gevindu2004-salonoski.hf.space/"
};

const toText = (value, fallback = "N/A") => {
  const text = String(value || "").trim();
  return text || fallback;
};

const toAmount = (value, currency = "LKR") =>
  `${String(currency || "LKR").toUpperCase()} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const drawLabelValue = (doc, { x, y, label, value, labelColor = BRAND_RED, valueColor = "#111111" }) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(labelColor)
    .text(label, x, y, { continued: true });
  doc
    .font("Helvetica")
    .fontSize(10.5)
    .fillColor(valueColor)
    .text(` : ${value}`);
};

const normalizeLegacyLines = (lines) => {
  const safeLines = Array.isArray(lines) ? lines : [];
  return {
    invoiceNo: "N/A",
    date: new Date().toLocaleDateString(),
    paymentMethod: "N/A",
    status: "PAID",
    customerName: "N/A",
    customerEmail: "N/A",
    customerPhone: "N/A",
    items: safeLines.map((line, index) => ({
      no: index + 1,
      product: toText(line, "-"),
      quantity: 1,
      unitPrice: 0,
      total: 0
    })),
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
    notes: "Thank you for your purchase!"
  };
};

const buildSimpleReceiptPdf = async (payload = {}) => {
  const invoice = Array.isArray(payload) ? normalizeLegacyLines(payload) : payload;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - PAGE_MARGIN * 2;
    let cursorY = PAGE_MARGIN;

    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, PAGE_MARGIN - 2, cursorY - 6, { fit: [84, 84] });
    }

    doc
      .moveTo(PAGE_MARGIN + 96, cursorY + 2)
      .lineTo(PAGE_MARGIN + 96, cursorY + 84)
      .strokeColor(BRAND_RED)
      .lineWidth(0.9)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#111111")
      .text("SALON", PAGE_MARGIN + 114, cursorY + 12, { continued: true });
    doc.fillColor(BRAND_RED).text(" OSKI");
    doc
      .font("Helvetica-Oblique")
      .fontSize(11.5)
      .fillColor("#333333")
      .text("Beauty. Confidence. You.", PAGE_MARGIN + 114, cursorY + 40);

    const contactBoxWidth = 220;
    const contactBoxX = PAGE_MARGIN + pageWidth - contactBoxWidth;
    const contactBoxY = cursorY + 2;
    doc.roundedRect(contactBoxX, contactBoxY, contactBoxWidth, 108, 6).strokeColor("#DADADA").lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(BRAND_RED).text("CONTACT", contactBoxX + 12, contactBoxY + 10);
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor("#111111")
      .text(COMPANY_INFO.location, contactBoxX + 12, contactBoxY + 30, { width: contactBoxWidth - 24 })
      .text(COMPANY_INFO.phone, contactBoxX + 12, contactBoxY + 46, { width: contactBoxWidth - 24 })
      .text(COMPANY_INFO.email, contactBoxX + 12, contactBoxY + 62, { width: contactBoxWidth - 24 })
      .fontSize(9.5)
      .text(COMPANY_INFO.website, contactBoxX + 12, contactBoxY + 78, { width: contactBoxWidth - 24 });

    cursorY += 130;
    doc.font("Helvetica-Bold").fontSize(34).fillColor("#111111").text("INVOICE", PAGE_MARGIN, cursorY + 12, {
      width: pageWidth,
      align: "center"
    });
    cursorY += 72;

    const cardGap = 14;
    const cardWidth = (pageWidth - cardGap) / 2;
    const cardHeight = 130;
    doc.roundedRect(PAGE_MARGIN, cursorY, cardWidth, cardHeight, 3).strokeColor("#D5D5D5").lineWidth(1).stroke();
    doc.roundedRect(PAGE_MARGIN + cardWidth + cardGap, cursorY, cardWidth, cardHeight, 3).strokeColor("#D5D5D5").lineWidth(1).stroke();

    let boxY = cursorY + 16;
    drawLabelValue(doc, { x: PAGE_MARGIN + 12, y: boxY, label: "Invoice No", value: toText(invoice.invoiceNo) });
    boxY += 24;
    drawLabelValue(doc, { x: PAGE_MARGIN + 12, y: boxY, label: "Date", value: toText(invoice.date) });
    boxY += 24;
    drawLabelValue(doc, { x: PAGE_MARGIN + 12, y: boxY, label: "Payment Method", value: toText(invoice.paymentMethod) });
    boxY += 24;
    drawLabelValue(doc, {
      x: PAGE_MARGIN + 12,
      y: boxY,
      label: "Status",
      value: toText(invoice.status).toUpperCase(),
      valueColor: String(invoice.status || "").toLowerCase() === "paid" ? "#228B22" : BRAND_RED
    });

    doc.font("Helvetica-Bold").fontSize(11).fillColor(BRAND_RED).text("Supplier / Customer", PAGE_MARGIN + cardWidth + cardGap + 12, cursorY + 16);
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#111111")
      .text(toText(invoice.customerName), PAGE_MARGIN + cardWidth + cardGap + 12, cursorY + 42)
      .text(toText(invoice.customerEmail), PAGE_MARGIN + cardWidth + cardGap + 12, cursorY + 64)
      .text(toText(invoice.customerPhone), PAGE_MARGIN + cardWidth + cardGap + 12, cursorY + 86);

    cursorY += cardHeight + 24;

    const headers = ["#", "Product", "Quantity", "Unit Price (LKR)", "Total (LKR)"];
    const tableFractions = [0.07, 0.33, 0.16, 0.22, 0.22];
    const colWidths = [];
    let usedWidth = 0;
    for (let i = 0; i < tableFractions.length; i += 1) {
      if (i === tableFractions.length - 1) {
        colWidths.push(pageWidth - usedWidth);
      } else {
        const width = Math.floor(pageWidth * tableFractions[i]);
        colWidths.push(width);
        usedWidth += width;
      }
    }
    const rowHeight = 32;
    let rowX = PAGE_MARGIN;
    headers.forEach((header, index) => {
      doc.rect(rowX, cursorY, colWidths[index], rowHeight).fillAndStroke("#1F1F1F", "#8A8A8A");
      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor("#FFFFFF")
        .text(header, rowX, cursorY + 10, { width: colWidths[index], align: "center" });
      rowX += colWidths[index];
    });

    cursorY += rowHeight;
    const items = Array.isArray(invoice.items) && invoice.items.length ? invoice.items : [];
    items.forEach((item, idx) => {
      const values = [
        String(item.no || idx + 1),
        toText(item.product, "-"),
        String(item.quantity ?? 0),
        Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        Number(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      ];
      rowX = PAGE_MARGIN;
      values.forEach((value, colIndex) => {
        doc.rect(rowX, cursorY, colWidths[colIndex], rowHeight).strokeColor("#CFCFCF").lineWidth(0.9).stroke();
        doc
          .font("Helvetica")
          .fontSize(10.5)
          .fillColor("#111111")
          .text(value, rowX + (colIndex === 1 ? 8 : 0), cursorY + 10, {
            width: colWidths[colIndex] - (colIndex === 1 ? 16 : 0),
            align: colIndex === 1 ? "left" : "center"
          });
        rowX += colWidths[colIndex];
      });
      cursorY += rowHeight;
    });

    cursorY += 18;
    const totalsWidth = 260;
    const totalsX = PAGE_MARGIN + pageWidth - totalsWidth;
    const totalsRows = [
      ["Subtotal", Number(invoice.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ["Discount", Number(invoice.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })],
      ["Tax (0%)", Number(invoice.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })]
    ];
    totalsRows.forEach(([label, value]) => {
      doc.rect(totalsX, cursorY, totalsWidth * 0.5, 28).strokeColor("#CFCFCF").lineWidth(0.9).stroke();
      doc.rect(totalsX + totalsWidth * 0.5, cursorY, totalsWidth * 0.5, 28).strokeColor("#CFCFCF").lineWidth(0.9).stroke();
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#111111").text(label, totalsX + 10, cursorY + 9);
      doc.font("Helvetica").fontSize(11).fillColor("#111111").text(value, totalsX + totalsWidth * 0.5, cursorY + 9, {
        width: totalsWidth * 0.5 - 10,
        align: "right"
      });
      cursorY += 28;
    });

    doc.rect(totalsX, cursorY, totalsWidth, 30).fill(BRAND_RED);
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#FFFFFF").text("GRAND TOTAL", totalsX + 10, cursorY + 9);
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#FFFFFF").text(toAmount(invoice.total, invoice.currency), totalsX + totalsWidth * 0.5, cursorY + 9, {
      width: totalsWidth * 0.5 - 10,
      align: "right"
    });
    cursorY += 44;

    doc.font("Helvetica-Bold").fontSize(12).fillColor(BRAND_RED).text("Notes", PAGE_MARGIN, cursorY);
    doc.moveTo(PAGE_MARGIN, cursorY + 20).lineTo(PAGE_MARGIN + 220, cursorY + 20).strokeColor("#BDBDBD").lineWidth(1).stroke();
    doc.font("Helvetica").fontSize(11).fillColor("#222222").text(toText(invoice.notes, "Thank you for your purchase!"), PAGE_MARGIN, cursorY + 30);

    cursorY += 84;
    doc.roundedRect(PAGE_MARGIN, cursorY, pageWidth, 90, 4).strokeColor("#D5D5D5").lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(22).fillColor("#111111").text("Thank you for choosing Salon Oski.", PAGE_MARGIN, cursorY + 34, { width: pageWidth, align: "center" });
    doc.font("Helvetica-Oblique").fontSize(14).fillColor(BRAND_RED).text("We appreciate your trust and support.", PAGE_MARGIN, cursorY + 60, { width: pageWidth, align: "center" });

    doc.end();
  });
};

module.exports = { buildSimpleReceiptPdf };
