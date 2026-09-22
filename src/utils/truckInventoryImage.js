const money = (value = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);

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
  const margin = 55;
  const rowsPerPage = 22;
  const rowHeight = 54;
  const tableTop = 300;
  const footerHeight = 78;
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const generatedAt = new Date();
  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const totalValue = rows.reduce(
    (sum, row) => sum + Number(row.quantity || 0) * Number(row.sellPrice || 0),
    0
  );
  const fileBase = `hang-tren-xe-${safeFilePart(truck.code || truck.name)}-${generatedAt
    .toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" })
    .replaceAll("-", "")}`;

  return Array.from({ length: totalPages }, (_, pageIndex) => {
    const pageRows = rows.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
    const height = tableTop + 50 + pageRows.length * rowHeight + footerHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ tạo ảnh báo cáo");

    context.fillStyle = "#f4f7fb";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#0f4c81";
    context.fillRect(0, 0, width, 166);
    context.fillStyle = "#ffffff";
    context.font = "700 34px Arial, sans-serif";
    context.fillText("HÀNG HÓA HIỆN CÓ TRÊN XE", margin, 64);
    context.font = "700 24px Arial, sans-serif";
    context.fillText(`${truck.code || "—"} · ${truck.name || "Xe bán hàng"}`, margin, 105);
    context.font = "400 18px Arial, sans-serif";
    context.fillStyle = "#dbeafe";
    context.fillText(
      `${truck.licensePlate || "Chưa có biển số"} · Tài xế: ${driverName} · ${driverPhone}`,
      margin,
      140
    );
    context.textAlign = "right";
    context.fillText(
      `Xuất lúc ${generatedAt.toLocaleString("vi-VN", { hour12: false })}`,
      width - margin,
      140
    );
    context.textAlign = "left";

    const summaryWidth = 330;
    [
      ["LOẠI HÀNG", rows.length.toLocaleString("vi-VN"), "#e3f2fd", "#1565c0"],
      ["TỔNG SỐ LƯỢNG", totalQuantity.toLocaleString("vi-VN"), "#e8f5e9", "#2e7d32"],
      ["GIÁ TRỊ BÁN", money(totalValue), "#f3e5f5", "#7b1fa2"],
    ].forEach(([label, value, background, color], index) => {
      const x = margin + index * (summaryWidth + 50);
      drawRoundedRect(context, x, 188, summaryWidth, 82, 14, background);
      context.fillStyle = "#64748b";
      context.font = "700 14px Arial, sans-serif";
      context.fillText(label, x + 18, 217);
      context.fillStyle = color;
      context.font = "700 24px Arial, sans-serif";
      context.fillText(fitText(context, value, summaryWidth - 36), x + 18, 251);
    });

    const columns = [
      ["STT", 60, "center"],
      ["MÃ HÀNG", 170, "left"],
      ["TÊN SẢN PHẨM", 385, "left"],
      ["ĐVT", 100, "center"],
      ["SỐ LƯỢNG", 135, "right"],
      ["GIÁ BÁN", 180, "right"],
    ];
    drawRoundedRect(context, margin, tableTop, width - margin * 2, 50, 10, "#173f64");
    let columnX = margin;
    columns.forEach(([label, columnWidth, alignment]) => {
      context.fillStyle = "#ffffff";
      context.font = "700 15px Arial, sans-serif";
      context.textAlign = alignment;
      const x =
        alignment === "center"
          ? columnX + columnWidth / 2
          : alignment === "right"
          ? columnX + columnWidth - 14
          : columnX + 14;
      context.fillText(label, x, tableTop + 31);
      columnX += columnWidth;
    });

    pageRows.forEach((row, rowIndex) => {
      const y = tableTop + 50 + rowIndex * rowHeight;
      context.fillStyle = rowIndex % 2 ? "#f8fafc" : "#ffffff";
      context.fillRect(margin, y, width - margin * 2, rowHeight);
      context.strokeStyle = "#e2e8f0";
      context.beginPath();
      context.moveTo(margin, y + rowHeight);
      context.lineTo(width - margin, y + rowHeight);
      context.stroke();
      const values = [
        pageIndex * rowsPerPage + rowIndex + 1,
        row.code || "—",
        row.name || "Sản phẩm",
        row.unit || "—",
        Number(row.quantity || 0).toLocaleString("vi-VN"),
        money(row.sellPrice || 0),
      ];
      let valueX = margin;
      columns.forEach(([, columnWidth, alignment], columnIndex) => {
        context.fillStyle = columnIndex === 4 ? "#1b5e20" : "#1e293b";
        context.font = `${columnIndex === 2 || columnIndex === 4 ? "700" : "400"} 17px Arial, sans-serif`;
        context.textAlign = alignment;
        const x =
          alignment === "center"
            ? valueX + columnWidth / 2
            : alignment === "right"
            ? valueX + columnWidth - 14
            : valueX + 14;
        context.fillText(fitText(context, values[columnIndex], columnWidth - 28), x, y + 34);
        valueX += columnWidth;
      });
    });

    context.textAlign = "left";
    context.fillStyle = "#64748b";
    context.font = "400 15px Arial, sans-serif";
    context.fillText("Dữ liệu tồn xe tại thời điểm xuất báo cáo.", margin, height - 30);
    context.textAlign = "right";
    context.font = "700 15px Arial, sans-serif";
    context.fillText(`Trang ${pageIndex + 1}/${totalPages}`, width - margin, height - 30);

    return {
      url: canvas.toDataURL("image/png"),
      fileName: `${fileBase}${totalPages > 1 ? `-trang-${pageIndex + 1}` : ""}.png`,
    };
  });
};
