import { downloadDataImage, drawRoundedRect, fitCanvasToA4, fitText } from "./truckInventoryImage";

const number = (value) => Number(value || 0).toLocaleString("vi-VN");
const dateLabel = (value) => {
  const [year, month, day] = String(value || "").split("-");
  return day && month && year ? `${day}/${month}/${year}` : String(value || "");
};

export const downloadInvoiceFollowUpImage = ({ rows = [], date, summary = {}, book = {} }) => {
  const width = 1200;
  const margin = 38;
  const gap = 14;
  const columns = rows.length > 42 ? 3 : 2;
  const panelWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
  const contentTop = 330;
  const baseFooterTop = 1660;
  const rowsPerColumn = Math.max(1, Math.ceil(rows.length / columns));
  const rowHeight = Math.max(
    42,
    Math.min(66, Math.floor((baseFooterTop - contentTop) / rowsPerColumn))
  );
  const height = Math.max(1714, contentTop + rowsPerColumn * rowHeight + 84);
  const footerTop = height - 54;
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
  context.font = "900 40px Arial, sans-serif";
  context.fillText("PL", margin, 58);
  context.fillStyle = "#ff7043";
  context.font = "900 23px Arial, sans-serif";
  context.fillText("+", margin + 53, 46);
  context.fillStyle = "#ffffff";
  context.font = "800 31px Arial, sans-serif";
  context.fillText("SỔ THEO DÕI GỬI HÓA ĐƠN & TƯƠNG TÁC", 132, 58);
  context.font = "400 17px Arial, sans-serif";
  context.fillText(
    `Ngày ${dateLabel(date)} · ${book.isFinalized ? "ĐÃ CHỐT SỔ" : "BẢN NHÁP"}`,
    132,
    98
  );
  context.fillText("Đối chiếu hóa đơn và tình trạng tương tác khách hàng trong ngày", 132, 132);
  context.textAlign = "right";
  context.font = "600 15px Arial, sans-serif";
  context.fillText(
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }),
    width - margin,
    154
  );
  context.textAlign = "left";

  [
    ["CHỨNG TỪ HỆ THỐNG", summary.sourceDocumentCount, "#e3f2fd", "#1565c0"],
    ["DÒNG THEO DÕI", rows.length, "#e8f5e9", "#2e7d32"],
    ["ĐÃ GỬI", summary.sent, "#f3e5f5", "#7b1fa2"],
    ["CẦN CẬP NHẬT 24H", summary.needsFollowUp, "#ffebee", "#c62828"],
  ].forEach(([label, value, background, color], index) => {
    const cardWidth = (width - margin * 2 - gap * 3) / 4;
    const x = margin + index * (cardWidth + gap);
    drawRoundedRect(context, x, 202, cardWidth, 82, 10, background);
    context.fillStyle = "#64748b";
    context.font = "700 12px Arial, sans-serif";
    context.fillText(label, x + 13, 229);
    context.fillStyle = color;
    context.font = "900 27px Arial, sans-serif";
    context.fillText(number(value), x + 13, 267);
  });

  const panels = Array.from({ length: columns }, (_, index) =>
    rows.slice(index * rowsPerColumn, (index + 1) * rowsPerColumn)
  );
  panels.forEach((panelRows, panelIndex) => {
    const x = margin + panelIndex * (panelWidth + gap);
    drawRoundedRect(context, x, 300, panelWidth, 30, 6, "#315f50");
    context.fillStyle = "#ffffff";
    context.font = "700 12px Arial, sans-serif";
    context.fillText("KHÁCH HÀNG · KÊNH · HÓA ĐƠN · TƯƠNG TÁC", x + 10, 320);
    panelRows.forEach((row, index) => {
      const y = contentTop + index * rowHeight;
      context.fillStyle = index % 2 ? "#f8fafc" : "#ffffff";
      context.fillRect(x, y, panelWidth, rowHeight);
      context.strokeStyle = "#dbe3ec";
      context.strokeRect(x, y, panelWidth, rowHeight);
      const customer =
        [row.customerCode, row.customerName].filter(Boolean).join(" · ") ||
        "Khách mới / chưa định danh";
      context.fillStyle = "#172033";
      context.font = `700 ${rowHeight < 52 ? 12 : 14}px Arial, sans-serif`;
      context.fillText(fitText(context, customer, panelWidth - 20), x + 10, y + 19);
      context.fillStyle = "#52667a";
      context.font = `${rowHeight < 52 ? 11 : 12}px Arial, sans-serif`;
      const interactionChannel =
        { ZALO: "Zalo", PHONE: "Gọi điện", SMS: "SMS" }[row.interactionChannel] || "Zalo";
      const statuses = `${interactionChannel} · ${
        row.zaloStatus === "CONNECTED" ? "Đã KB" : "Chưa KB"
      } · ${
        row.invoiceStatus === "SENT" ? "Đã gửi HĐ" : "Chưa gửi HĐ"
      } · ${
        {
          INVOICE: "HĐ bán hàng",
          DEBT_PAYMENT: "Thu công nợ",
          CUSTOMER_RETURN: "Hoàn hàng",
        }[row.documentType] || "Dòng tạm"
      } · ${row.interaction || "Chưa tương tác"}`;
      context.fillText(fitText(context, statuses, panelWidth - 20), x + 10, y + 38);
      if (rowHeight >= 58) {
        context.fillStyle = row.needsFollowUp ? "#c62828" : "#64748b";
        context.fillText(
          fitText(
            context,
            [row.phone, row.note].filter(Boolean).join(" · ") || "—",
            panelWidth - 20
          ),
          x + 10,
          y + 56
        );
      }
    });
  });

  context.fillStyle = "#64748b";
  context.font = "400 13px Arial, sans-serif";
  context.fillText(
    "Ảnh báo cáo được tạo trực tiếp từ dữ liệu sổ theo dõi.",
    margin,
    footerTop + 28
  );
  context.textAlign = "right";
  context.font = "700 13px Arial, sans-serif";
  context.fillText(`${rows.length} dòng`, width - margin, footerTop + 28);

  const a4Canvas = fitCanvasToA4(canvas);
  const fileName = `${String(date || "").replaceAll("-", "")}_THEODOI_HOADON_TUONGTAC.png`;
  downloadDataImage(a4Canvas.toDataURL("image/png"), fileName);
  return { downloaded: true, fileName, width: a4Canvas.width, height: a4Canvas.height };
};
