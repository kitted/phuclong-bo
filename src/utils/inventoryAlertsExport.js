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

const typeLabels = {
  LOW_STOCK: "TỒN KHO THẤP",
  OUT_OF_STOCK: "HẾT HÀNG",
  SLOW_MOVING: "HÀNG CHẬM LUÂN CHUYỂN",
};

const statusOf = (row, type) => {
  if (type === "OUT_OF_STOCK" || Number(row.stock || 0) <= 0) return "Hết hàng";
  if (type === "SLOW_MOVING") return "Chậm luân chuyển";
  return "Cần nhập thêm";
};

const fileDate = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(value)
    .replaceAll("-", "");

export const buildInventoryAlertDocument = ({ rows = [], type = "LOW_STOCK", generatedAt }) => {
  const createdAt = generatedAt || new Date();
  const fileName = `CANH-BAO-TON-KHO-${fileDate(createdAt)}`;
  const title = typeLabels[type] || typeLabels.LOW_STOCK;
  const totalStock = rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
  const totalShortage = rows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.minStock || 0) - Number(row.stock || 0)),
    0
  );
  const bodyRows = rows
    .map((row, index) => {
      const status = statusOf(row, type);
      const danger = status === "Hết hàng";
      return `<tr>
        <td class="center">${index + 1}</td>
        <td><strong>${escapeHtml(row.code || "—")}</strong></td>
        <td><strong>${escapeHtml(row.name || "Sản phẩm")}</strong></td>
        <td class="center">${escapeHtml(row.unit || "—")}</td>
        <td class="number ${danger ? "danger" : "warning"}">${number(row.stock)}</td>
        <td class="number">${number(row.minStock)}</td>
        <td class="number">${number(
          Math.max(0, Number(row.minStock || 0) - Number(row.stock || 0))
        )}</td>
        <td><span class="badge ${danger ? "badge-danger" : "badge-warning"}">${escapeHtml(
        status
      )}</span></td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${fileName}</title><style>
      @page{size:A4 landscape;margin:10mm}
      *{box-sizing:border-box}html,body{margin:0;padding:0;background:#e9eef5;color:#172033;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .page{width:277mm;min-height:190mm;margin:8mm auto;background:#fff;padding:10mm;box-shadow:0 2mm 8mm rgba(15,45,75,.16)}
      .header{display:flex;justify-content:space-between;gap:12mm;align-items:flex-start;border-bottom:1.2mm solid #1565c0;padding-bottom:5mm}
      .brand{color:#0d47a1;font-size:13pt;font-weight:900;letter-spacing:.5pt}.brand span{color:#ef4444}
      h1{margin:2mm 0 1mm;font-size:22pt;color:#102a43}.subtitle{color:#52667a;font-size:9.5pt}
      .created{text-align:right;font-size:9pt;line-height:1.6;color:#52667a}.created strong{display:block;color:#172033}
      .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:5mm 0}
      .metric{border:1px solid #d8e2ef;border-radius:3mm;padding:4mm;background:#f8fbff}.metric-label{font-size:8pt;font-weight:700;color:#64748b;text-transform:uppercase}.metric-value{margin-top:1.5mm;font-size:18pt;font-weight:900;color:#0d47a1}.metric.alert .metric-value{color:#d32f2f}
      table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9pt}thead{display:table-header-group}tr{page-break-inside:avoid}
      th{background:#173f64;color:#fff;text-align:left;padding:3mm 2mm;border:1px solid #173f64;font-size:8.5pt}
      td{padding:2.6mm 2mm;border:1px solid #d9e1ea;vertical-align:middle;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f7f9fc}
      .center{text-align:center}.number{text-align:right;font-weight:800}.danger{color:#c62828}.warning{color:#ed6c02}
      .badge{display:inline-block;border-radius:99px;padding:1.2mm 2.3mm;font-weight:800;font-size:7.5pt;white-space:nowrap}.badge-danger{background:#ffebee;color:#b71c1c}.badge-warning{background:#fff3e0;color:#e65100}
      .note{margin-top:5mm;padding:3.5mm 4mm;border-left:1.2mm solid #ef4444;background:#fff5f5;color:#7f1d1d;font-size:9pt;line-height:1.5}
      .footer{display:flex;justify-content:space-between;margin-top:5mm;color:#64748b;font-size:8pt}
      @media print{html,body{background:#fff}.page{width:auto;min-height:0;margin:0;box-shadow:none;padding:0}}
    </style></head><body><main class="page">
      <header class="header"><div><div class="brand">PHÚC LONG <span>+</span></div><h1>CẢNH BÁO ${title}</h1><div class="subtitle">Danh sách sản phẩm do quản trị viên lựa chọn để kiểm tra và lưu hồ sơ.</div></div>
      <div class="created"><strong>Thời điểm xuất</strong>${escapeHtml(
        createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false })
      )}<br />Múi giờ: Asia/Ho_Chi_Minh</div></header>
      <section class="summary"><div class="metric"><div class="metric-label">Mặt hàng đã chọn</div><div class="metric-value">${number(
        rows.length
      )}</div></div><div class="metric"><div class="metric-label">Tổng tồn hiện tại</div><div class="metric-value">${number(
    totalStock
  )}</div></div><div class="metric alert"><div class="metric-label">Số lượng thiếu tối thiểu</div><div class="metric-value">${number(
    totalShortage
  )}</div></div></section>
      <table><colgroup><col style="width:5%"><col style="width:12%"><col style="width:28%"><col style="width:7%"><col style="width:10%"><col style="width:10%"><col style="width:11%"><col style="width:17%"></colgroup>
      <thead><tr><th>STT</th><th>Mã hàng</th><th>Tên sản phẩm</th><th>ĐVT</th><th>Tồn hiện tại</th><th>Tồn tối thiểu</th><th>Cần bổ sung</th><th>Trạng thái</th></tr></thead><tbody>${bodyRows}</tbody></table>
      <div class="note"><strong>Lưu ý:</strong> Đây là ảnh chụp dữ liệu tại thời điểm xuất. Admin cần đối chiếu tồn thực tế và các phiếu đang chờ nhận trước khi lập đơn nhập hàng.</div>
      <footer class="footer"><span>Hệ thống quản trị Phúc Long</span><span>${escapeHtml(
        fileName
      )}</span></footer>
    </main></body></html>`;

  return { html, fileName };
};

export const createInventoryAlertCanvasImage = ({ rows = [], type = "LOW_STOCK", generatedAt }) => {
  const createdAt = generatedAt || new Date();
  const width = 1400;
  const margin = 50;
  const contentWidth = width - margin * 2;
  const columns = [60, 150, 430, 100, 150, 150, 150, 110];
  const measureCanvas = document.createElement("canvas");
  const measure = measureCanvas.getContext("2d");
  if (!measure) throw new Error("Trình duyệt không hỗ trợ tạo ảnh cảnh báo");
  measure.font = "400 18px Arial, sans-serif";
  const layouts = rows.map((row) => {
    const nameLines = wrapCanvasText(measure, row.name || "Sản phẩm", columns[2] - 20);
    return { row, nameLines, height: Math.max(54, 18 + nameLines.length * 25) };
  });
  const height = Math.max(
    1750,
    330 + 60 + layouts.reduce((sum, item) => sum + item.height, 0) + 150
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0f4c81";
  context.fillRect(0, 0, width, 185);
  context.fillStyle = "#ffffff";
  context.font = "900 42px Arial, sans-serif";
  context.fillText("PL+", margin, 62);
  context.font = "800 32px Arial, sans-serif";
  context.fillText(`CẢNH BÁO ${typeLabels[type] || typeLabels.LOW_STOCK}`, margin, 112);
  context.font = "400 17px Arial, sans-serif";
  context.fillText("Danh sách sản phẩm cần kiểm tra tồn kho", margin, 148);
  context.textAlign = "right";
  context.font = "600 17px Arial, sans-serif";
  context.fillText(
    createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }),
    width - margin,
    62
  );
  context.textAlign = "left";
  const totalStock = rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
  const totalShortage = rows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.minStock || 0) - Number(row.stock || 0)),
    0
  );
  [
    ["MẶT HÀNG", rows.length],
    ["TỔNG TỒN", totalStock],
    ["THIẾU TỐI THIỂU", totalShortage],
  ].forEach(([label, value], index) => {
    const x = margin + index * 300;
    context.fillStyle = index === 2 ? "#fff1f2" : "#eef6ff";
    context.fillRect(x, 210, 280, 82);
    context.fillStyle = "#64748b";
    context.font = "700 14px Arial, sans-serif";
    context.fillText(label, x + 15, 237);
    context.fillStyle = index === 2 ? "#be123c" : "#0d47a1";
    context.font = "900 27px Arial, sans-serif";
    context.fillText(number(value), x + 15, 275);
  });
  let y = 330;
  context.fillStyle = "#173f64";
  context.fillRect(margin, y, contentWidth, 60);
  const headers = [
    "STT",
    "MÃ",
    "TÊN SẢN PHẨM",
    "ĐVT",
    "TỒN",
    "TỒN MIN",
    "CẦN BỔ SUNG",
    "TRẠNG THÁI",
  ];
  let x = margin;
  context.font = "700 16px Arial, sans-serif";
  headers.forEach((header, index) => {
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.fillText(header, x + columns[index] / 2, y + 37);
    x += columns[index];
  });
  y += 60;
  layouts.forEach(({ row, nameLines, height: rowHeight }, index) => {
    context.fillStyle = index % 2 ? "#f8fafc" : "#ffffff";
    context.fillRect(margin, y, contentWidth, rowHeight);
    context.strokeStyle = "#cbd5e1";
    context.strokeRect(margin, y, contentWidth, rowHeight);
    const shortage = Math.max(0, Number(row.minStock || 0) - Number(row.stock || 0));
    const values = [
      index + 1,
      row.code || "—",
      null,
      row.unit || "—",
      number(row.stock),
      number(row.minStock),
      number(shortage),
      statusOf(row, type),
    ];
    x = margin;
    columns.forEach((columnWidth, columnIndex) => {
      context.strokeStyle = "#cbd5e1";
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + rowHeight);
      context.stroke();
      context.fillStyle = columnIndex >= 4 && columnIndex <= 6 ? "#c2410c" : "#111827";
      context.font = `${
        columnIndex === 2 || columnIndex === 6 ? "700" : "500"
      } 17px Arial, sans-serif`;
      if (columnIndex === 2) drawCanvasLines(context, nameLines, x + 10, y + 30, 25);
      else {
        context.textAlign = columnIndex >= 4 && columnIndex <= 6 ? "right" : "center";
        context.fillText(
          String(values[columnIndex]),
          columnIndex >= 4 && columnIndex <= 6 ? x + columnWidth - 10 : x + columnWidth / 2,
          y + 33
        );
      }
      x += columnWidth;
    });
    y += rowHeight;
  });
  context.fillStyle = "#7f1d1d";
  context.font = "500 17px Arial, sans-serif";
  context.textAlign = "left";
  context.fillText(
    "Lưu ý: Đối chiếu tồn thực tế và các phiếu đang chờ nhận trước khi lập đơn nhập hàng.",
    margin,
    y + 55
  );
  const a4Canvas = fitCanvasToA4(canvas);
  const fileName = `CANH-BAO-TON-KHO-${fileDate(createdAt)}.png`;
  downloadDataImage(a4Canvas.toDataURL("image/png"), fileName);
  return { downloaded: true, fileName, width: a4Canvas.width, height: a4Canvas.height };
};
