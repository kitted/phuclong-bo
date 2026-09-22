const safeFilePart = (value, fallback = "xe") =>
  String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || fallback;

const drawRoundedRect = (context, x, y, width, height, radius, fillStyle) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
};

const fitText = (context, value, maxWidth) => {
  const text = String(value ?? "");
  if (context.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length && context.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
};

export const downloadDataImage = (url, fileName) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

export const createTruckInventoryImages = ({ truck, driverName, driverPhone, rows }) => {
  const width = 1200;
  const margin = 40;
  const columnGap = 20;
  const panelWidth = (width - margin * 2 - columnGap) / 2;
  const rowHeight = 38;
  const tableTop = 258;
  const tableHeaderHeight = 40;
  const footerHeight = 58;
  const rowsPerColumn = Math.max(1, Math.ceil(rows.length / 2));
  const generatedAt = new Date();
  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const fileBase = `hang-tren-xe-${safeFilePart(truck.code || truck.name)}-${generatedAt
    .toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
    .replaceAll("-", "")}`;
  const height = tableTop + tableHeaderHeight + rowsPerColumn * rowHeight + footerHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo ảnh báo cáo");

  context.fillStyle = "#f4f7fb";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0f4c81";
  context.fillRect(0, 0, width, 172);
  context.fillStyle = "#ffffff";
  context.font = "700 42px Arial, sans-serif";
  context.fillText(
    fitText(context, String(truck.name || "Xe bán hàng").toUpperCase(), 760),
    margin,
    60
  );
  context.font = "700 23px Arial, sans-serif";
  context.fillStyle = "#dbeafe";
  context.fillText("DANH SÁCH HÀNG HÓA HIỆN CÓ", margin, 99);
  context.font = "400 17px Arial, sans-serif";
  context.fillStyle = "#ffffff";
  context.fillText(
    fitText(
      context,
      `${truck.code || "—"} · ${truck.licensePlate || "Chưa có biển số"} · Tài xế: ${
        driverName || "Chưa phân công"
      } · ${driverPhone || "—"}`,
      780
    ),
    margin,
    140
  );
  context.textAlign = "right";
  context.font = "700 18px Arial, sans-serif";
  context.fillStyle = "#ffffff";
  context.fillText(
    `NGÀY TẠO: ${generatedAt.toLocaleString("vi-VN", { hour12: false })}`,
    width - margin,
    60
  );
  context.textAlign = "left";

  [
    ["LOẠI HÀNG", rows.length.toLocaleString("vi-VN"), "#e3f2fd", "#1565c0"],
    ["TỔNG SỐ LƯỢNG", totalQuantity.toLocaleString("vi-VN"), "#e8f5e9", "#2e7d32"],
  ].forEach(([label, value, background, color], index) => {
    const summaryWidth = 260;
    const x = margin + index * (summaryWidth + 16);
    drawRoundedRect(context, x, 188, summaryWidth, 54, 12, background);
    context.fillStyle = "#64748b";
    context.font = "700 13px Arial, sans-serif";
    context.fillText(label, x + 14, 210);
    context.fillStyle = color;
    context.font = "700 21px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText(value, x + summaryWidth - 14, 224);
    context.textAlign = "left";
  });

  const columns = [
    ["STT", 52, "center"],
    ["TÊN SẢN PHẨM", panelWidth - 52 - 78 - 92, "left"],
    ["ĐVT", 78, "center"],
    ["SL", 92, "right"],
  ];
  const panels = [rows.slice(0, rowsPerColumn), rows.slice(rowsPerColumn)];
  panels.forEach((panelRows, panelIndex) => {
    const panelX = margin + panelIndex * (panelWidth + columnGap);
    drawRoundedRect(context, panelX, tableTop, panelWidth, tableHeaderHeight, 8, "#173f64");
    let headerX = panelX;
    columns.forEach(([label, columnWidth, alignment]) => {
      context.fillStyle = "#ffffff";
      context.font = "700 13px Arial, sans-serif";
      context.textAlign = alignment;
      const x =
        alignment === "center"
          ? headerX + columnWidth / 2
          : alignment === "right"
          ? headerX + columnWidth - 10
          : headerX + 10;
      context.fillText(label, x, tableTop + 26);
      headerX += columnWidth;
    });

    panelRows.forEach((row, rowIndex) => {
      const y = tableTop + tableHeaderHeight + rowIndex * rowHeight;
      context.fillStyle = rowIndex % 2 ? "#f8fafc" : "#ffffff";
      context.fillRect(panelX, y, panelWidth, rowHeight);
      context.strokeStyle = "#e2e8f0";
      context.beginPath();
      context.moveTo(panelX, y + rowHeight);
      context.lineTo(panelX + panelWidth, y + rowHeight);
      context.stroke();
      const values = [
        panelIndex * rowsPerColumn + rowIndex + 1,
        row.name || "Sản phẩm",
        row.unit || "—",
        Number(row.quantity || 0).toLocaleString("vi-VN"),
      ];
      let valueX = panelX;
      columns.forEach(([, columnWidth, alignment], columnIndex) => {
        context.fillStyle = columnIndex === 3 ? "#1b5e20" : "#1e293b";
        context.font = `${columnIndex === 1 || columnIndex === 3 ? "700" : "400"} 14px Arial, sans-serif`;
        context.textAlign = alignment;
        const x =
          alignment === "center"
            ? valueX + columnWidth / 2
            : alignment === "right"
            ? valueX + columnWidth - 10
            : valueX + 10;
        context.fillText(fitText(context, values[columnIndex], columnWidth - 20), x, y + 25);
        valueX += columnWidth;
      });
    });
  });

  context.textAlign = "left";
  context.fillStyle = "#64748b";
  context.font = "400 14px Arial, sans-serif";
  context.fillText("Dữ liệu tồn xe tại thời điểm tạo ảnh.", margin, height - 23);
  context.textAlign = "right";
  context.font = "700 14px Arial, sans-serif";
  context.fillText(`${rows.length} mặt hàng`, width - margin, height - 23);

  return [{ url: canvas.toDataURL("image/png"), fileName: `${fileBase}.png` }];
};
