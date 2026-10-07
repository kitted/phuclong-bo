import {
  downloadDataImage,
  drawCanvasLines,
  fitCanvasToA4,
  wrapCanvasText,
} from "./truckInventoryImage";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
const number = (value) => Number(value || 0).toLocaleString("vi-VN");
const date = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const fileDate = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(value)
    .replaceAll("-", "");

export const buildNewCustomersDocument = ({ rows = [], days = 45, generatedAt }) => {
  const createdAt = generatedAt || new Date();
  const fileName = `KHACH-HANG-MOI-${days}-NGAY-${fileDate(createdAt)}`;
  const revenue = rows.reduce((sum, row) => sum + Number(row.totalRevenue || 0), 0);
  const invoiceCount = rows.reduce((sum, row) => sum + Number(row.invoiceCount || 0), 0);
  const body = rows
    .map(
      (row, index) =>
        `<tr><td class="center">${index + 1}</td><td><strong>${escapeHtml(
          row.customerCode || "—"
        )}</strong></td><td><strong>${escapeHtml(
          row.customerName || "Khách hàng"
        )}</strong><br><span>${escapeHtml(row.address || "")}</span></td><td>${escapeHtml(
          row.phone || "—"
        )}</td><td class="center">${number(row.invoiceCount)}</td><td class="number">${number(
          row.totalRevenue
        )} đ</td><td class="center">${date(row.firstInvoiceAt)}</td><td class="center">${date(
          row.latestInvoiceAt
        )}</td><td>${escapeHtml((row.salespersonNames || []).join(", ") || "—")}</td></tr>`
    )
    .join("");
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${fileName}</title><style>
    @page{size:A3 landscape;margin:12mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#eef2f7;color:#111827;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{width:396mm;min-height:273mm;margin:8mm auto;padding:10mm;background:#fff;box-shadow:0 2mm 8mm #0002}.header{display:flex;justify-content:space-between;border-bottom:1.2mm solid #0f4c81;padding-bottom:5mm}.brand{font-size:15pt;font-weight:900;color:#0d47a1}.brand span{color:#f4511e}h1{font-size:23pt;margin:3mm 0 1mm}.muted{color:#64748b;font-size:9pt}.created{text-align:right;font-size:9pt;line-height:1.5}
    .metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:5mm 0}.metric{padding:4mm;border:1px solid #d9e2ec;background:#f8fbff}.metric b{display:block;font-size:18pt;color:#0d47a1;margin-top:1mm}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5pt}th{background:#173f64;color:#fff;padding:2.7mm 1.5mm;border:1px solid #173f64}td{padding:2.5mm 1.5mm;border:1px solid #d7dee8;vertical-align:middle;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f8fafc}.center{text-align:center}.number{text-align:right;font-weight:700}td span{font-size:7.5pt;color:#64748b}.footer{display:flex;justify-content:space-between;margin-top:5mm;font-size:8pt;color:#64748b}@media print{html,body{background:#fff}.page{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}}
  </style></head><body><main class="page"><header class="header"><div><div class="brand">PL<span>+</span> PHÚC LONG</div><h1>KHÁCH HÀNG MỚI TRONG ${days} NGÀY</h1><div class="muted">Khách hàng có đúng 1 hoặc 2 hóa đơn phát sinh trong khoảng báo cáo.</div></div><div class="created"><strong>Thời điểm xuất</strong><br>${escapeHtml(
    createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false })
  )}</div></header><section class="metrics"><div class="metric">Khách hàng<b>${number(
    rows.length
  )}</b></div><div class="metric">Tổng hóa đơn<b>${number(
    invoiceCount
  )}</b></div><div class="metric">Doanh thu<b>${number(
    revenue
  )} đ</b></div></section><table><colgroup><col style="width:4%"><col style="width:9%"><col style="width:23%"><col style="width:10%"><col style="width:7%"><col style="width:11%"><col style="width:10%"><col style="width:10%"><col style="width:16%"></colgroup><thead><tr><th>STT</th><th>Mã KH</th><th>Khách hàng / Địa chỉ</th><th>Điện thoại</th><th>Số đơn</th><th>Doanh thu</th><th>Đơn đầu</th><th>Đơn gần nhất</th><th>Sale phụ trách</th></tr></thead><tbody>${body}</tbody></table><footer class="footer"><span>Hệ thống quản trị Phúc Long</span><span>${fileName}</span></footer></main></body></html>`;
  return { html, fileName };
};

export const createNewCustomersCanvasImage = ({ rows = [], days = 45, generatedAt }) => {
  const createdAt = generatedAt || new Date();
  const width = 1400;
  const margin = 50;
  const contentWidth = width - margin * 2;
  const columns = [60, 140, 380, 170, 100, 170, 140, 140];
  const measureCanvas = document.createElement("canvas");
  const measure = measureCanvas.getContext("2d");
  if (!measure) throw new Error("Trình duyệt không hỗ trợ tạo ảnh khách hàng");
  measure.font = "400 18px Arial, sans-serif";
  const layouts = rows.map((row) => {
    const customerLines = wrapCanvasText(
      measure,
      [row.customerName, row.address].filter(Boolean).join(" · "),
      columns[2] - 20
    );
    return { row, customerLines, height: Math.max(54, 18 + customerLines.length * 25) };
  });
  const sourceHeight = Math.max(
    1750,
    330 + 60 + layouts.reduce((sum, item) => sum + item.height, 0) + 120
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = sourceHeight;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, sourceHeight);
  context.fillStyle = "#0f4c81";
  context.fillRect(0, 0, width, 185);
  context.fillStyle = "#ffffff";
  context.font = "900 42px Arial, sans-serif";
  context.fillText("PL+", margin, 62);
  context.font = "800 31px Arial, sans-serif";
  context.fillText(`KHÁCH HÀNG MỚI TRONG ${days} NGÀY`, margin, 112);
  context.font = "400 17px Arial, sans-serif";
  context.fillText("Tiêu chí: có đúng 1 hoặc 2 hóa đơn trong kỳ", margin, 148);
  context.textAlign = "right";
  context.fillText(
    createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }),
    width - margin,
    62
  );
  context.textAlign = "left";
  const revenue = rows.reduce((sum, row) => sum + Number(row.totalRevenue || 0), 0);
  const invoiceCount = rows.reduce((sum, row) => sum + Number(row.invoiceCount || 0), 0);
  [
    ["KHÁCH HÀNG", rows.length],
    ["TỔNG HÓA ĐƠN", invoiceCount],
    ["DOANH THU", `${number(revenue)} đ`],
  ].forEach(([label, value], index) => {
    const x = margin + index * 330;
    context.fillStyle = "#eef6ff";
    context.fillRect(x, 210, 310, 82);
    context.fillStyle = "#64748b";
    context.font = "700 14px Arial, sans-serif";
    context.fillText(label, x + 15, 237);
    context.fillStyle = "#0d47a1";
    context.font = "900 25px Arial, sans-serif";
    context.fillText(String(value), x + 15, 275);
  });
  let y = 330;
  context.fillStyle = "#173f64";
  context.fillRect(margin, y, contentWidth, 60);
  const headers = [
    "STT",
    "MÃ KH",
    "KHÁCH HÀNG / ĐỊA CHỈ",
    "ĐIỆN THOẠI",
    "SỐ ĐƠN",
    "DOANH THU",
    "ĐƠN ĐẦU",
    "ĐƠN GẦN NHẤT",
  ];
  let x = margin;
  context.font = "700 15px Arial, sans-serif";
  headers.forEach((header, index) => {
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.fillText(header, x + columns[index] / 2, y + 37);
    x += columns[index];
  });
  y += 60;
  layouts.forEach(({ row, customerLines, height: rowHeight }, index) => {
    context.fillStyle = index % 2 ? "#f8fafc" : "#ffffff";
    context.fillRect(margin, y, contentWidth, rowHeight);
    context.strokeStyle = "#cbd5e1";
    context.strokeRect(margin, y, contentWidth, rowHeight);
    const values = [
      index + 1,
      row.customerCode || "—",
      null,
      row.phone || "—",
      number(row.invoiceCount),
      `${number(row.totalRevenue)} đ`,
      date(row.firstInvoiceAt),
      date(row.latestInvoiceAt),
    ];
    x = margin;
    columns.forEach((columnWidth, columnIndex) => {
      context.strokeStyle = "#cbd5e1";
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + rowHeight);
      context.stroke();
      context.fillStyle = "#111827";
      context.font = `${
        columnIndex === 2 || columnIndex === 5 ? "700" : "500"
      } 17px Arial, sans-serif`;
      if (columnIndex === 2) drawCanvasLines(context, customerLines, x + 10, y + 30, 25);
      else {
        context.textAlign = columnIndex === 5 ? "right" : "center";
        context.fillText(
          String(values[columnIndex]),
          columnIndex === 5 ? x + columnWidth - 10 : x + columnWidth / 2,
          y + 33
        );
      }
      x += columnWidth;
    });
    y += rowHeight;
  });
  const a4Canvas = fitCanvasToA4(canvas);
  const fileName = `KHACH-HANG-MOI-${days}-NGAY-${fileDate(createdAt)}.png`;
  downloadDataImage(a4Canvas.toDataURL("image/png"), fileName);
  return { downloaded: true, fileName, width: a4Canvas.width, height: a4Canvas.height };
};
