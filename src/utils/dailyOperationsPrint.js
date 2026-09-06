const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Ho_Chi_Minh",
      });
};

const money = (value) => Number(value || 0).toLocaleString("vi-VN");
const logoUrl = () =>
  new URL(`${process.env.PUBLIC_URL || ""}/phuc-long-print-logo.svg`, window.location.origin).href;

const baseStyles = `
  @page{size:A4 portrait;margin:10mm 12mm}
  *{box-sizing:border-box}
  html,body{width:100%;margin:0;padding:0}
  body{background:#e9edf2;color:#111;font-family:"Times New Roman",Times,serif;font-size:10.5pt;line-height:1.25;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:186mm;max-width:186mm;margin:8mm auto;padding:0;background:#fff;box-shadow:0 2mm 8mm rgba(0,0,0,.16)}
  .header{display:grid;grid-template-columns:31mm minmax(0,1fr) 31mm;align-items:start;min-height:27mm;column-gap:2mm}
  .logo{display:block;width:24mm;height:22mm;object-fit:contain;object-position:center}
  .title{text-align:center;font-size:16pt;line-height:1.1;font-weight:700;margin:1mm 0 2.5mm;text-transform:uppercase}
  .meta{font-size:10.5pt;line-height:1.45}.meta-row{display:flex;gap:1.5mm}.meta-label{font-weight:700;min-width:29mm;white-space:nowrap}
  .code{text-align:right;font-weight:700;font-size:9.5pt;padding-top:1.5mm;overflow-wrap:anywhere}
  .table{width:186mm;min-width:186mm;max-width:186mm;border-collapse:collapse;border-spacing:0;table-layout:fixed;page-break-inside:auto}
  .table thead{display:table-header-group}.table tr{page-break-inside:avoid;page-break-after:auto}
  .table th,.table td{border:.3mm solid #222;padding:1.3mm 1.5mm;vertical-align:middle;overflow-wrap:anywhere}
  .table th{text-align:center;font-weight:700;font-size:10.5pt;height:9mm;background:#f7f7f7}
  .table td{height:8.5mm}.center{text-align:center}.right{text-align:right}.strong{font-weight:700}.muted{color:#444;font-size:9pt}
  .notes{margin-top:3mm;display:grid;grid-template-columns:1fr 1fr;gap:7mm;page-break-inside:avoid}
  .line{border-bottom:.25mm dotted #333;min-height:6mm;padding:0 1mm;white-space:pre-wrap;overflow-wrap:anywhere}
  .signature{margin-top:4mm;display:grid;grid-template-columns:1fr 1fr 1fr;gap:7mm;text-align:center;font-weight:700;min-height:28mm;page-break-inside:avoid}
  .signature small{display:block;font-weight:400;font-style:italic;margin-top:1mm}.section-title{text-align:center;font-weight:700;text-transform:uppercase;margin-bottom:2mm}
  .report-footer{display:grid;grid-template-columns:1fr 1.35fr;gap:7mm;margin-top:3mm}.summary-lines{line-height:1.7}.product-box{border:.3mm solid #222;min-height:48mm;padding:2mm 3mm}
  .issues{margin-top:3mm;min-height:26mm}.break-avoid{break-inside:avoid;page-break-inside:avoid}
  @media print{
    html,body{background:#fff}
    .page{width:186mm;max-width:186mm;margin:0 auto;box-shadow:none}
  }
`;

const documentHtml = (content, title) =>
  `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    title
  )}</title><style>${baseStyles}</style></head><body>${content}</body></html>`;

const operationConfig = {
  LOAD: {
    title: "PHIẾU TẠM ỨNG HÀNG",
    executor: "Người tạm ứng",
    issuer: "Người xuất kho",
  },
  RETURN: {
    title: "PHIẾU HOÀN HÀNG VỀ KHO",
    executor: "Người hoàn hàng",
    issuer: "Người nhận kho",
  },
  TRUCK_TO_TRUCK: {
    title: "PHIẾU CHUYỂN HÀNG GIỮA XE",
    executor: "Người giao hàng",
    issuer: "Người nhận hàng",
  },
};

export const buildTruckOperationPdfHtml = (transfer) => {
  const config = operationConfig[transfer?.type] || operationConfig.LOAD;
  const driver =
    transfer?.type === "TRUCK_TO_TRUCK" ? transfer?.sourceTruck?.driver : transfer?.driver;
  const route =
    transfer?.type === "TRUCK_TO_TRUCK"
      ? `${transfer?.sourceTruck?.code || ""} → ${transfer?.destinationTruck?.code || ""}`
      : `${transfer?.truck?.code || ""} · ${transfer?.truck?.name || ""}`;
  const items = transfer?.items || [];
  const rowCount = Math.max(15, items.length);
  const itemRows = Array.from({ length: rowCount }, (_, index) => {
    const item = items[index];
    return `<tr><td class="center">${item ? index + 1 : ""}</td><td>${
      item
        ? `<strong>${escapeHtml(item.productName)}</strong><br><span class="muted">${escapeHtml(
            item.productCode
          )}</span>`
        : ""
    }</td><td class="center">${item ? `${money(item.qty)} ${escapeHtml(item.unit)}` : ""}</td><td>${
      item ? escapeHtml(item.note || "") : ""
    }</td></tr>`;
  }).join("");
  return documentHtml(
    `<main class="page">
    <header class="header"><img class="logo" src="${logoUrl()}" alt="Phúc Long"><div><h1 class="title">${
      config.title
    }</h1>
      <div class="meta"><div class="meta-row"><span class="meta-label">• Thời gian:</span><span>${escapeHtml(
        formatDate(transfer?.date)
      )}</span></div><div class="meta-row"><span class="meta-label">• Người thực hiện:</span><span>${escapeHtml(
      driver?.fullName || transfer?.createdBy?.fullName || ""
    )}</span></div><div class="meta-row"><span class="meta-label">• Xe / tuyến:</span><span>${escapeHtml(
      route
    )}</span></div></div></div><div class="code">${escapeHtml(transfer?.code || "")}</div></header>
    <table class="table"><colgroup><col style="width:10%"><col style="width:45%"><col style="width:20%"><col style="width:25%"></colgroup>
      <thead><tr><th>STT</th><th>HÀNG HOÁ</th><th>SỐ LƯỢNG</th><th>GHI CHÚ</th></tr></thead><tbody>${itemRows}</tbody></table>
    <div class="notes"><div><strong>Các vấn đề cần chú ý:</strong><div class="line">${escapeHtml(
      transfer?.issues || ""
    )}</div></div><div><strong>Ghi chú:</strong><div class="line">${escapeHtml(
      transfer?.note || ""
    )}</div></div></div>
    <div class="signature"><div>Người lập phiếu<small>(ký, ghi rõ họ tên)</small></div><div>${
      config.issuer
    }<small>(ký, ghi rõ họ tên)</small></div><div>${
      config.executor
    }<small>(ký, ghi rõ họ tên)</small></div></div>
  </main>`,
    transfer?.code || config.title
  );
};

const documentType = {
  SALE: "Bán hàng",
  DEBT_PAYMENT: "Thu nợ",
  CUSTOMER_RETURN: "Hoàn hàng",
};

export const buildDailyReportPdfHtml = (report) => {
  const snapshot = report?.snapshot || report;
  const summary = snapshot?.summary || {};
  const documents = snapshot?.documents || [];
  const products = snapshot?.products || [];
  const adjustments = report?.manualAdjustments || [];
  const expense = (type) => adjustments.find((item) => item.type === type)?.amount || 0;
  const totalExpenses = adjustments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const rowCount = Math.max(13, documents.length);
  const documentRows = Array.from({ length: rowCount }, (_, index) => {
    const item = documents[index];
    return `<tr><td class="center">${item ? index + 1 : ""}</td><td>${escapeHtml(
      item?.customerName || ""
    )}</td><td class="center">${escapeHtml(
      documentType[item?.type] || item?.type || ""
    )}</td><td class="center">${escapeHtml(item?.paymentMethod || "")}</td><td class="right">${
      item ? money(item.amount) : ""
    }</td><td>${escapeHtml(item?.note || "")}</td></tr>`;
  }).join("");
  const productRows = products
    .map(
      (item) =>
        `<div>${escapeHtml(item.productName)}: <strong>${money(item.quantity)} ${escapeHtml(
          item.unit
        )}</strong></div>`
    )
    .join("");
  return documentHtml(
    `<main class="page">
    <header class="header"><img class="logo" src="${logoUrl()}" alt="Phúc Long"><div><h1 class="title">TỔNG HỢP BÁO CÁO NGÀY</h1>
      <div class="meta"><div class="meta-row"><span class="meta-label">• Thời gian:</span><span>${escapeHtml(
        formatDate(report?.reportDate || snapshot?.reportDate)
      )}</span></div><div class="meta-row"><span class="meta-label">• Địa bàn:</span><span>${escapeHtml(
      report?.area || ""
    )}</span></div><div class="meta-row"><span class="meta-label">• Người thực hiện:</span><span>${escapeHtml(
      report?.performerName || ""
    )}</span></div><div class="meta-row"><span class="meta-label">• Phương tiện:</span><span>${escapeHtml(
      report?.vehicle || ""
    )}</span></div></div></div><div class="code">${escapeHtml(report?.code || "")}</div></header>
    <table class="table"><colgroup><col style="width:7%"><col style="width:27%"><col style="width:17%"><col style="width:14%"><col style="width:17%"><col style="width:18%"></colgroup>
      <thead><tr><th>STT</th><th>Khách hàng</th><th>Nghiệp vụ PS</th><th>Thanh toán<br>TM/CK</th><th>Số tiền</th><th>Ghi chú</th></tr></thead><tbody>${documentRows}</tbody></table>
    <section class="report-footer break-avoid"><div class="summary-lines">
      <div>CK: <span class="line">${money(
        summary.bankTransfer
      )}</span></div><div>TM: <span class="line">${money(
      summary.cash
    )}</span> ⇒ <strong>DT (TM+CK) hôm nay: ${money(summary.totalCollected)}</strong></div>
      <div style="margin-top:2mm"><strong>Chi phí:</strong></div><div>Dầu: <span class="line">${money(
        expense("FUEL")
      )}</span></div><div>Ăn: <span class="line">${money(
      expense("MEAL")
    )}</span></div><div>Trạm: <span class="line">${money(
      expense("TOLL")
    )}</span></div><div>CP khác: <span class="line">${money(expense("OTHER"))}</span></div>
      <div style="margin-top:2mm"><strong>Còn lại nộp: ${money(
        Number(summary.cash || 0) - totalExpenses
      )}</strong></div>
    </div><div class="product-box"><div class="section-title">SỐ HÀNG BÁN TRONG NGÀY</div>${productRows}</div></section>
    <section class="issues break-avoid"><strong><em>Các vấn đề cần giải quyết ngay:</em></strong><div class="line">${escapeHtml(
      report?.issues || ""
    )}</div><div class="line">${escapeHtml(report?.notes || "")}</div></section>
  </main>`,
    report?.code || "Báo cáo ngày"
  );
};
