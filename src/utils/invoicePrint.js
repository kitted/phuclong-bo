const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const number = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const readTriple = (value, full) => {
  const digit = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const hundred = Math.floor(value / 100);
  const ten = Math.floor((value % 100) / 10);
  const unit = value % 10;
  const words = [];
  if (hundred || full) words.push(`${digit[hundred]} trăm`);
  if (ten > 1) words.push(`${digit[ten]} mươi`);
  else if (ten === 1) words.push("mười");
  else if (unit && (hundred || full)) words.push("lẻ");
  if (unit) {
    if (unit === 1 && ten > 1) words.push("mốt");
    else if (unit === 5 && ten > 0) words.push("lăm");
    else words.push(digit[unit]);
  }
  return words.join(" ");
};
export const moneyInWords = (input) => {
  let value = Math.round(Number(input) || 0);
  if (!value) return "Không đồng";
  const levels = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const groups = [];
  while (value > 0) {
    groups.push(value % 1000);
    value = Math.floor(value / 1000);
  }
  const text = groups
    .map((group, index) => ({ group, index }))
    .reverse()
    .filter(({ group }) => group)
    .map(({ group, index }, position) => `${readTriple(group, position > 0 && group < 100)} ${levels[index]}`.trim())
    .join(" ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
};

const buildInvoiceDocument = (invoice, autoPrint = false) => {
  if (!invoice) return;
  const logoUrl = new URL(
    `${process.env.PUBLIC_URL || ""}/og-1200x1200.png`,
    window.location.origin
  ).href;
  const customer = invoice.customerId || invoice.customerSnapshot || {};
  const customerName = customer.name || invoice.customerName || invoice.customer || "Khách lẻ";
  const phoneValues = [
    ...(Array.isArray(customer.phones) ? customer.phones : []),
    ...(Array.isArray(invoice.customerPhones) ? invoice.customerPhones : []),
  ].filter(Boolean);
  const customerPhone =
    customer.phone ||
    invoice.customerPhone ||
    [...new Set(phoneValues)].join(", ") ||
    "";
  const customerAddress = customer.address || invoice.customerAddress || "";
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const subtotal = Number(invoice.subtotal ?? invoice.totalAmount ?? 0);
  const discount = Number(invoice.discountAmount || 0);
  const grandTotal = Number(invoice.grandTotal ?? invoice.totalAmount ?? subtotal - discount);
  const paid = Number(
    invoice.receivedAmount ?? invoice.totalReceivedAmount ?? invoice.paidAmount ?? 0
  );
  const existingDebtPaidAmount = Number(invoice.existingDebtPaidAmount || 0);
  const oldDebt = Number(
    invoice.customerDebtBefore ??
      invoice.debtPayment?.customerDebtBefore ??
      invoice.debtPaymentSnapshot?.customerDebtBefore ??
      invoice.previousDebt ??
      invoice.oldDebt ??
      existingDebtPaidAmount
  );
  const remainingDebt = Math.max(
    0,
    Number(
      invoice.customerDebtAfter ??
        invoice.debtPayment?.customerDebtAfter ??
        invoice.debtPaymentSnapshot?.customerDebtAfter ??
        invoice.totalCustomerDebtAfter ??
        oldDebt + grandTotal - paid
    )
  );
  const occurredAt = new Date(invoice.createdAt || invoice.date || Date.now());
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const rows = items.map((item, index) => {
    const gift = item.lineType === "GIFT";
    return `<tr class="item-row">
      <td>${index + 1}</td>
      <td class="left product-name">${escapeHtml(item.productName || item.productId?.name || "Sản phẩm")}${gift ? ' <b class="gift">(QUÀ TẶNG)</b>' : ""}</td>
      <td>${escapeHtml(item.unit || item.productId?.unit || "")}</td>
      <td class="numeric">${number(item.qty)}</td>
      <td class="numeric">${number(gift ? 0 : item.price)}</td>
      <td class="numeric">${number(gift ? 0 : item.lineTotal)}</td>
      <td class="note">${escapeHtml(gift ? item.giftCode || invoice.giftCode || "Quà tặng" : item.note || "")}</td>
    </tr>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.code || "Hóa đơn")}</title><style>
    @page {
      size: A3 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
    }
    html,
    body {
      width: 100%;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      color: #000;
      font-size: 12pt;
      line-height: 1.25;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .invoice-sheet {
      width: 273mm;
      min-width: 273mm;
      max-width: 273mm;
      min-height: 396mm;
      margin: 0 auto;
      overflow: visible;
    }
    .head {
      position: relative;
      display: grid;
      grid-template-columns: 62mm 1fr;
      column-gap: 8mm;
      min-height: 37mm;
      align-items: start;
    }
    .logo {
      width: 42mm;
      height: 37mm;
      margin-left: 1mm;
      object-fit: contain;
      object-position: center;
    }
    .company {
      padding-top: 1.5mm;
    }
    .company h3 {
      margin: 0 0 5mm;
      font-size: 16pt;
      line-height: 1;
      font-weight: 700;
    }
    .company p {
      margin: 0 0 2mm;
      font-size: 10pt;
      line-height: 1.2;
      white-space: nowrap;
    }
    .title {
      text-align: center;
      margin: -2mm 0 8mm;
    }
    .title h1 {
      margin: 0;
      font-size: 21.5pt;
      line-height: 1.1;
      font-weight: 700;
    }
    .title p {
      margin: 2mm 0 0;
      font-size: 12pt;
    }
    .customer {
      display: grid;
      grid-template-columns: 150mm 1fr;
      column-gap: 10mm;
      margin: 0 2mm 5mm;
      font-size: 12pt;
    }
    .customer p {
      min-height: 4.5mm;
      margin: 0 0 1mm;
    }
    table {
      width: 273mm;
      min-width: 273mm;
      max-width: 273mm;
      border-collapse: collapse;
      border-spacing: 0;
      table-layout: fixed;
      page-break-inside: auto;
    }
    col.stt { width: 17mm; }
    col.product { width: 77mm; }
    col.unit { width: 25mm; }
    col.quantity { width: 29mm; }
    col.price { width: 36mm; }
    col.total { width: 39mm; }
    col.note { width: 50mm; }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th,
    td {
      border: 0.35mm solid #000;
      padding: 1.1mm 1.5mm;
      text-align: center;
      vertical-align: middle;
      font-size: 11.5pt;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    th {
      height: 19mm;
      padding: 2mm 1mm;
      background: #f1f1f1;
      font-weight: 700;
    }
    .item-row td {
      height: 7mm;
    }
    .left,
    .product-name {
      text-align: left;
    }
    .numeric,
    .amount {
      text-align: right;
      white-space: nowrap;
    }
    .note {
      text-align: left;
    }
    .summary {
      margin-top: -0.35mm;
      page-break-inside: avoid;
    }
    .summary td {
      height: 6.5mm;
      padding: 0.7mm 1.8mm;
      font-size: 11.5pt;
      line-height: 1.1;
    }
    .summary .label {
      text-align: left;
      padding-left: 18mm;
      font-weight: 700;
    }
    .summary .quantity-total {
      text-align: right;
      font-weight: 700;
    }
    .summary .amount {
      font-weight: 700;
    }
    .gift {
      color: #1565c0;
      font-size: 9.5pt;
    }
    .gift-code {
      margin: 4mm 2mm 0;
      font-size: 11.5pt;
    }
    .words {
      margin: 7mm 2mm 0;
      font-size: 12pt;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: center;
      margin-top: 11mm;
      font-size: 12pt;
      page-break-inside: avoid;
    }
    .signatures strong,
    .signatures span {
      display: block;
    }
    .signature-date {
      min-height: 5mm;
      font-style: italic;
    }
    .space {
      height: 22mm;
    }
    .bank {
      margin: 33mm 2mm 0;
      font-size: 12pt;
    }
    @media screen {
      body {
        background: #fff;
      }
    }
    @media print {
      button {
        display: none !important;
      }
      .invoice-sheet {
        break-after: avoid;
      }
    }
  </style></head><body><main class="invoice-sheet">
    <div class="head">
      <img class="logo" src="${escapeHtml(logoUrl)}" alt="Phúc Long"/>
      <div class="company">
        <h3>NPP PHÚC LONG</h3>
        <p>Địa chỉ: B1/19 LÊ HỒNG PHONG, P. BÌNH THỦY, TP CẦN THƠ - SĐT: 0939890861</p>
        <p>Tài khoản: Số TK: 101100002653, Ngân hàng: Vietcombank, Chủ TK: Nguyễn Tuấn Vũ</p>
      </div>
    </div>
    <div class="title">
      <h1>PHIẾU BÁN HÀNG - KIÊM XUẤT KHO</h1>
      <p><i>Số phiếu: ${escapeHtml(invoice.code || "—")} &nbsp; - &nbsp; Ngày ${occurredAt.toLocaleString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}</i></p>
    </div>
    <div class="customer">
      <div>
        <p>Khách hàng: <b>${escapeHtml(customerName)}</b></p>
        <p>Địa chỉ: ${escapeHtml(customerAddress)}</p>
      </div>
      <div>
        <p>SĐT: ${escapeHtml(customerPhone)}</p>
        <p>Nhân viên: ${escapeHtml(invoice.salespersonName || invoice.salespersonId?.fullName || "")}</p>
      </div>
    </div>
    <table class="items-table">
      <colgroup>
        <col class="stt"/><col class="product"/><col class="unit"/><col class="quantity"/>
        <col class="price"/><col class="total"/><col class="note"/>
      </colgroup>
      <thead><tr><th>STT</th><th>Tên hàng</th><th>ĐVT</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th><th>Ghi chú</th></tr></thead>
      <tbody>${rows || '<tr class="item-row"><td colspan="7">Không có hàng hóa</td></tr>'}</tbody>
    </table>
    <table class="summary">
      <colgroup>
        <col class="stt"/><col class="product"/><col class="unit"/><col class="quantity"/>
        <col class="price"/><col class="total"/><col class="note"/>
      </colgroup>
      <tbody>
        <tr><td class="label" colspan="5">T thành tiền</td><td class="amount">${number(subtotal)}</td><td></td></tr>
        <tr><td class="label" colspan="5">VAT</td><td class="amount">${number(invoice.vatAmount || 0)}</td><td></td></tr>
        <tr><td class="label" colspan="5">Chiết khấu</td><td class="amount">${number(discount)}</td><td></td></tr>
        <tr><td class="label" colspan="3">Tổng cộng (1)</td><td class="quantity-total">${number(totalQuantity)}</td><td></td><td class="amount">${number(grandTotal)}</td><td></td></tr>
        <tr><td class="label" colspan="5">Nợ cũ (2)</td><td class="amount">${number(oldDebt)}</td><td></td></tr>
        <tr><td class="label" colspan="5">Số tiền thanh toán (3)</td><td class="amount">${number(paid)}</td><td></td></tr>
        <tr><td class="label" colspan="5">Còn nợ (1 + 2 - 3)</td><td class="amount">${number(remainingDebt)}</td><td></td></tr>
      </tbody>
    </table>
    ${invoice.giftCode ? `<p class="gift-code"><b>Mã quà tặng:</b> ${escapeHtml(invoice.giftCode)}</p>` : ""}
    <p class="words">Số tiền bằng chữ: <i>${escapeHtml(moneyInWords(paid))}.</i></p>
    <div class="signatures">
      <div>
        <div class="signature-date">&nbsp;</div>
        <strong>THỦ KHO</strong>
        <span>(ký, họ tên)</span>
        <div class="space"></div>
      </div>
      <div>
        <div class="signature-date">Ngày ${occurredAt.getDate()} tháng ${occurredAt.getMonth()+1} năm ${occurredAt.getFullYear()}</div>
        <strong>NGƯỜI NHẬN HÀNG</strong>
        <span>(ký, họ tên)</span>
        <div class="space"></div>
      </div>
    </div>
    <p class="bank">Số TK: ............, Ngân hàng: ............, Chủ TK: ............</p>
  </main>
    ${autoPrint ? "<script>window.onload=()=>setTimeout(()=>window.print(),250);</script>" : ""}
  </body></html>`;
};

const invoiceFileName = (invoice) =>
  `${String(invoice?.code || "hoa-don").replace(/[^a-zA-Z0-9_-]/g, "-")}.png`;

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export async function saveInvoiceImage(invoice) {
  if (!invoice) throw new Error("Không tìm thấy dữ liệu hóa đơn");
  const html2pdfModule = await import("html2pdf.js/dist/html2pdf.bundle.min.js");
  const html2pdf = html2pdfModule.default || html2pdfModule;
  const html = buildInvoiceDocument(invoice, false);
  const worker = html2pdf()
    .set({
      margin: 0,
      filename: invoiceFileName(invoice),
      image: { type: "png", quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1120,
      },
      jsPDF: { unit: "mm", format: "a3", orientation: "portrait" },
    })
    .from(html, "string")
    .toCanvas();
  const canvas = await worker.get("canvas");
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
  if (!blob) throw new Error("Không thể tạo ảnh hóa đơn");

  const fileName = invoiceFileName(invoice);
  const file =
    typeof File === "function" ? new File([blob], fileName, { type: "image/png" }) : null;
  if (
    file &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: `Hóa đơn ${invoice.code || ""}`,
        text: "Chọn “Lưu hình ảnh” để lưu hóa đơn vào thư viện ảnh.",
      });
      return { shared: true };
    } catch (error) {
      if (error?.name === "AbortError") return { cancelled: true };
    }
  }

  downloadBlob(blob, fileName);
  return { downloaded: true };
}

export async function printInvoice(invoice, options = {}) {
  if (!invoice) return;
  const isMobile =
    options.mobile ??
    window.matchMedia?.("(max-width: 767px), (pointer: coarse)")?.matches ??
    false;
  if (isMobile) return saveInvoiceImage(invoice);

  const popup = window.open("", "_blank", "width=900,height=1000");
  if (!popup) throw new Error("Trình duyệt đang chặn cửa sổ in hóa đơn");
  popup.document.write(buildInvoiceDocument(invoice, true));
  popup.document.close();
  return { printed: true };
}
