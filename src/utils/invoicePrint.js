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
const moneyInWords = (input) => {
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

export function printInvoice(invoice) {
  if (!invoice) return;
  const popup = window.open("", "_blank", "width=900,height=1000");
  if (!popup) throw new Error("Trình duyệt đang chặn cửa sổ in hóa đơn");
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
  const oldDebt = Number(invoice.customerDebtBefore ?? invoice.previousDebt ?? invoice.oldDebt ?? 0);
  const paid = Number(invoice.paidAmount || 0);
  const remainingDebt = Number(invoice.customerDebtAfter ?? invoice.totalCustomerDebtAfter ?? oldDebt + grandTotal - paid);
  const occurredAt = new Date(invoice.createdAt || invoice.date || Date.now());
  const rows = items.map((item, index) => {
    const gift = item.lineType === "GIFT";
    return `<tr><td>${index + 1}</td><td class="left">${escapeHtml(item.productName || item.productId?.name || "Sản phẩm")}${gift ? ' <b class="gift">(QUÀ TẶNG)</b>' : ""}</td><td>${escapeHtml(item.unit || item.productId?.unit || "")}</td><td>${number(item.qty)}</td><td>${number(gift ? 0 : item.price)}</td><td>${number(gift ? 0 : item.lineTotal)}</td><td>${escapeHtml(gift ? item.giftCode || invoice.giftCode || "Quà tặng" : item.note || "")}</td></tr>`;
  }).join("");
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(invoice.code || "Hóa đơn")}</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:"Times New Roman",serif;color:#111;font-size:13px;margin:0}.head{display:grid;grid-template-columns:105px 1fr;gap:15px;align-items:start}.logo{width:92px}.company h3{margin:3px 0;font-size:16px}.company p{margin:3px 0;font-size:11px}.title{text-align:center;margin:14px 0 12px}.title h1{font-size:21px;margin:0}.title p{margin:4px}.customer{display:grid;grid-template-columns:1fr 220px;gap:15px;margin:10px 4px}.customer p{margin:4px 0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #111;padding:6px 5px;text-align:center}th{background:#f1f1f1;height:42px}.left{text-align:left}.summary td{padding:3px 6px}.summary .label{text-align:left;font-weight:bold}.summary .amount{text-align:right;font-weight:bold}.gift{font-size:10px;color:#1565c0}.words{margin:14px 4px}.signatures{display:grid;grid-template-columns:1fr 1fr;text-align:center;margin-top:26px}.signatures strong{display:block}.space{height:60px}.bank{margin-top:34px}@media print{button{display:none}}</style></head><body>
    <div class="head"><img class="logo" src="${window.location.origin}/logo192.png" alt="Phúc Long"/><div class="company"><h3>NPP PHÚC LONG</h3><p>Địa chỉ: ................................................................................................</p><p>Điện thoại: ................................ · Ngân hàng: ................................</p></div></div>
    <div class="title"><h1>PHIẾU BÁN HÀNG - KIÊM XUẤT KHO</h1><p><i>Số phiếu: ${escapeHtml(invoice.code || "—")} &nbsp; - &nbsp; Ngày ${occurredAt.toLocaleString("vi-VN", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}</i></p></div>
    <div class="customer"><div><p>Khách hàng: <b>${escapeHtml(customerName)}</b></p><p>Địa chỉ: ${escapeHtml(customerAddress)}</p></div><div><p>SĐT: ${escapeHtml(customerPhone)}</p><p>Nhân viên: ${escapeHtml(invoice.salespersonName || invoice.salespersonId?.fullName || "")}</p></div></div>
    <table><thead><tr><th>STT</th><th>Tên hàng</th><th>ĐVT</th><th>Số lượng</th><th>Đơn giá</th><th>Thành tiền</th><th>Ghi chú</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Không có hàng hóa</td></tr>'}</tbody></table>
    <table class="summary"><tbody><tr><td class="label" colspan="5">Tạm tính</td><td class="amount">${number(subtotal)}</td><td></td></tr><tr><td class="label" colspan="5">VAT</td><td class="amount">${number(invoice.vatAmount || 0)}</td><td></td></tr><tr><td class="label" colspan="5">Chiết khấu</td><td class="amount">${number(discount)}</td><td></td></tr><tr><td class="label" colspan="5">Tổng cộng (1)</td><td class="amount">${number(grandTotal)}</td><td></td></tr><tr><td class="label" colspan="5">Nợ cũ (2)</td><td class="amount">${number(oldDebt)}</td><td></td></tr><tr><td class="label" colspan="5">Số tiền thanh toán (3)</td><td class="amount">${number(paid)}</td><td></td></tr><tr><td class="label" colspan="5">Còn nợ (1 + 2 - 3)</td><td class="amount">${number(remainingDebt)}</td><td></td></tr></tbody></table>
    ${invoice.giftCode ? `<p><b>Mã quà tặng:</b> ${escapeHtml(invoice.giftCode)}</p>` : ""}<p class="words">Số tiền bằng chữ: <i>${escapeHtml(moneyInWords(grandTotal))}.</i></p>
    <div class="signatures"><div><strong>THỦ KHO</strong><span>(ký, họ tên)</span><div class="space"></div></div><div><i>Ngày ${occurredAt.getDate()} tháng ${occurredAt.getMonth()+1} năm ${occurredAt.getFullYear()}</i><strong>NGƯỜI NHẬN HÀNG</strong><span>(ký, họ tên)</span><div class="space"></div></div></div><p class="bank">Số TK: ............, Ngân hàng: ............, Chủ TK: ............</p>
    <script>window.onload=()=>setTimeout(()=>window.print(),250);</script></body></html>`);
  popup.document.close();
}
