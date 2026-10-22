const safeFilePart = (value, fallback = "xe") =>
  String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || fallback;

export const drawRoundedRect = (context, x, y, width, height, radius, fillStyle) => {
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

export const fitText = (context, value, maxWidth) => {
  const text = String(value ?? "");
  if (context.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length && context.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
};

export const wrapCanvasText = (context, value, maxWidth) => {
  const paragraphs = String(value ?? "").split(/\r?\n/);
  const lines = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= maxWidth) {
        line = candidate;
        return;
      }
      if (line) lines.push(line);
      if (context.measureText(word).width <= maxWidth) {
        line = word;
        return;
      }
      let chunk = "";
      [...word].forEach((character) => {
        if (context.measureText(`${chunk}${character}`).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = character;
        } else chunk += character;
      });
      line = chunk;
    });
    if (line) lines.push(line);
  });
  return lines.length ? lines : [""];
};

export const drawCanvasLines = (context, lines, x, y, lineHeight, alignment = "left") => {
  context.textAlign = alignment;
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
};

export const A3_IMAGE_WIDTH = 1754;
export const A3_IMAGE_HEIGHT = 2480;
export const A4_IMAGE_WIDTH = 1240;
export const A4_IMAGE_HEIGHT = 1754;
export const A4_LANDSCAPE_IMAGE_WIDTH = 1754;
export const A4_LANDSCAPE_IMAGE_HEIGHT = 1240;

export const fitCanvasToA3 = (sourceCanvas, padding = 54) => {
  const canvas = document.createElement("canvas");
  canvas.width = A3_IMAGE_WIDTH;
  canvas.height = A3_IMAGE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo ảnh A3");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const availableWidth = canvas.width - padding * 2;
  const availableHeight = canvas.height - padding * 2;
  const scale = Math.min(
    availableWidth / sourceCanvas.width,
    availableHeight / sourceCanvas.height
  );
  const renderedWidth = Math.round(sourceCanvas.width * scale);
  const renderedHeight = Math.round(sourceCanvas.height * scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    sourceCanvas,
    Math.round((canvas.width - renderedWidth) / 2),
    padding,
    renderedWidth,
    renderedHeight
  );
  return canvas;
};

export const fitCanvasToA4 = (sourceCanvas, padding = 20) => {
  const canvas = document.createElement("canvas");
  canvas.width = A4_IMAGE_WIDTH;
  canvas.height = A4_IMAGE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo ảnh A4");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const availableWidth = canvas.width - padding * 2;
  const availableHeight = canvas.height - padding * 2;
  const scale = Math.min(
    availableWidth / sourceCanvas.width,
    availableHeight / sourceCanvas.height
  );
  const renderedWidth = Math.round(sourceCanvas.width * scale);
  const renderedHeight = Math.round(sourceCanvas.height * scale);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    sourceCanvas,
    Math.round((canvas.width - renderedWidth) / 2),
    padding,
    renderedWidth,
    renderedHeight
  );
  return canvas;
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
  // Dựng trực tiếp trên A4 ngang để nội dung không bị thu nhỏ lần hai.
  const width = A4_LANDSCAPE_IMAGE_WIDTH;
  const height = A4_LANDSCAPE_IMAGE_HEIGHT;
  const margin = 44;
  const columnGap = 18;
  const tableTop = 326;
  const tableHeaderHeight = 48;
  const tableBottom = 1176;
  const availableRowsHeight = tableBottom - tableTop - tableHeaderHeight;
  const readableRowsPerColumn = Math.max(1, Math.floor(availableRowsHeight / 40));
  const columnCount = Math.min(
    5,
    Math.max(1, Math.ceil(Math.max(rows.length, 1) / readableRowsPerColumn))
  );
  const panelWidth = (width - margin * 2 - columnGap * (columnCount - 1)) / columnCount;
  const rowsPerColumn = Math.max(1, Math.ceil(rows.length / columnCount));
  const rowHeight = Math.max(
    26,
    Math.min(94, Math.floor(availableRowsHeight / Math.max(rowsPerColumn, 8)))
  );
  const generatedAt = new Date();
  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const fileBase = `hang-tren-xe-${safeFilePart(truck.code || truck.name)}-${generatedAt
    .toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
    .replaceAll("-", "")}`;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo ảnh báo cáo");

  context.fillStyle = "#f4f7fb";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0f4c81";
  context.fillRect(0, 0, width, 178);
  context.fillStyle = "#ffffff";
  context.font = "800 48px Arial, sans-serif";
  context.fillText(
    fitText(context, String(truck.name || "Xe bán hàng").toUpperCase(), 1080),
    margin,
    60
  );
  context.font = "800 25px Arial, sans-serif";
  context.fillStyle = "#dbeafe";
  context.fillText("DANH SÁCH HÀNG HÓA HIỆN CÓ", margin, 99);
  context.font = "500 20px Arial, sans-serif";
  context.fillStyle = "#ffffff";
  context.fillText(
    fitText(
      context,
      `${truck.code || "—"} · ${truck.licensePlate || "Chưa có biển số"} · Tài xế: ${
        driverName || "Chưa phân công"
      } · ${driverPhone || "—"}`,
      1120
    ),
    margin,
    140
  );
  context.textAlign = "right";
  context.font = "700 20px Arial, sans-serif";
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
    const summaryWidth = 330;
    const x = margin + index * (summaryWidth + 16);
    drawRoundedRect(context, x, 202, summaryWidth, 82, 14, background);
    context.fillStyle = "#64748b";
    context.font = "800 16px Arial, sans-serif";
    context.fillText(label, x + 18, 231);
    context.fillStyle = color;
    context.font = "900 31px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText(value, x + summaryWidth - 18, 269);
    context.textAlign = "left";
  });

  const indexWidth = columnCount >= 4 ? 38 : columnCount === 3 ? 44 : 58;
  const unitWidth = columnCount >= 4 ? 48 : columnCount === 3 ? 62 : 88;
  const quantityWidth = columnCount >= 4 ? 58 : columnCount === 3 ? 76 : 104;
  const columns = [
    ["STT", indexWidth, "center"],
    ["TÊN SẢN PHẨM", panelWidth - indexWidth - unitWidth - quantityWidth, "left"],
    ["ĐVT", unitWidth, "center"],
    ["SL", quantityWidth, "right"],
  ];
  const panels = Array.from({ length: columnCount }, (_, index) =>
    rows.slice(index * rowsPerColumn, (index + 1) * rowsPerColumn)
  );
  panels.forEach((panelRows, panelIndex) => {
    const panelX = margin + panelIndex * (panelWidth + columnGap);
    drawRoundedRect(context, panelX, tableTop, panelWidth, tableHeaderHeight, 9, "#173f64");
    let headerX = panelX;
    columns.forEach(([label, columnWidth, alignment]) => {
      context.fillStyle = "#ffffff";
      context.font = `800 ${columnCount >= 4 ? 13 : 16}px Arial, sans-serif`;
      context.textAlign = alignment;
      const x =
        alignment === "center"
          ? headerX + columnWidth / 2
          : alignment === "right"
          ? headerX + columnWidth - 10
          : headerX + 10;
      context.fillText(label, x, tableTop + 31);
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
        const maxFontSize = columnCount >= 4 ? 17 : columnCount === 3 ? 20 : 24;
        const fontSize = Math.max(13, Math.min(maxFontSize, Math.round(rowHeight * 0.34)));
        context.font = `${columnIndex === 1 || columnIndex === 3 ? "700" : "500"} ${
          fontSize
        }px Arial, sans-serif`;
        context.textAlign = alignment;
        const x =
          alignment === "center"
            ? valueX + columnWidth / 2
            : alignment === "right"
            ? valueX + columnWidth - 10
            : valueX + 10;
        context.fillText(
          fitText(context, values[columnIndex], columnWidth - 16),
          x,
          y + Math.round(rowHeight / 2) + Math.round(fontSize * 0.35)
        );
        valueX += columnWidth;
      });
    });
  });

  context.textAlign = "left";
  context.fillStyle = "#64748b";
  context.font = "500 17px Arial, sans-serif";
  context.fillText("Dữ liệu tồn xe tại thời điểm tạo ảnh.", margin, height - 24);
  context.textAlign = "right";
  context.font = "800 17px Arial, sans-serif";
  context.fillText(`${rows.length} mặt hàng · A4 NGANG`, width - margin, height - 24);

  return [{ url: canvas.toDataURL("image/png"), fileName: `${fileBase}.png` }];
};
