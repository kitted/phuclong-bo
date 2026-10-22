import { downloadDataImage, drawRoundedRect, fitText } from "./truckInventoryImage";

const number = (value) => Number(value || 0).toLocaleString("vi-VN");
const dateLabel = (value) => {
  const [year, month, day] = String(value || "").split("-");
  return day && month && year ? `${day}/${month}/${year}` : String(value || "");
};

export const downloadInvoiceFollowUpImage = ({ rows = [], date, summary = {}, book = {} }) => {
  // A4 ngang ở 150 DPI: giữ kích thước cố định để ảnh tải về luôn cùng tỷ lệ.
  const width = 1754;
  const height = 1240;
  const margin = 44;
  const gap = 16;
  // Ít dữ liệu giữ một cột để tận dụng chiều ngang và tăng mạnh cỡ chữ.
  const columns =
    rows.length <= 10
      ? 1
      : rows.length <= 24
      ? 2
      : rows.length <= 42
      ? 3
      : rows.length <= 64
      ? 4
      : 5;
  const panelWidth = (width - margin * 2 - gap * (columns - 1)) / columns;
  const contentTop = 318;
  const footerTop = 1178;
  const panelHeaderHeight = 46;
  const availableTableHeight = footerTop - contentTop;
  const rowsPerColumn = Math.max(1, Math.ceil(rows.length / columns));
  const rowHeight = Math.max(
    42,
    Math.min(
      168,
      Math.floor((availableTableHeight - panelHeaderHeight) / Math.max(rowsPerColumn, 5))
    )
  );
  const renderedTableHeight = panelHeaderHeight + rowsPerColumn * rowHeight;
  const tableTop =
    contentTop + Math.max(0, Math.floor((availableTableHeight - renderedTableHeight) / 2));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo ảnh báo cáo");

  context.fillStyle = "#f4f7fb";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0f4c81";
  context.fillRect(0, 0, width, 156);
  context.fillStyle = "#ffffff";
  context.font = "900 46px Arial, sans-serif";
  context.fillText("PL", margin, 62);
  context.fillStyle = "#ff7043";
  context.font = "900 27px Arial, sans-serif";
  context.fillText("+", margin + 60, 48);
  context.fillStyle = "#ffffff";
  context.font = "800 38px Arial, sans-serif";
  context.fillText("SỔ THEO DÕI GỬI HÓA ĐƠN & TƯƠNG TÁC", 148, 62);
  context.font = "500 20px Arial, sans-serif";
  context.fillText(
    `Ngày ${dateLabel(date)} · ${book.isFinalized ? "ĐÃ CHỐT SỔ" : "BẢN NHÁP"}`,
    148,
    102
  );
  context.fillText("Đối chiếu hóa đơn và tình trạng tương tác khách hàng trong ngày", 148, 136);
  context.textAlign = "right";
  context.font = "600 18px Arial, sans-serif";
  context.fillText(
    new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false }),
    width - margin,
    132
  );
  context.textAlign = "left";

  const summaryCards = [
    ["TỔNG DÒNG", rows.length, "#e3f2fd", "#1565c0"],
    ["ĐÃ GỬI", summary.sent, "#e8f5e9", "#2e7d32"],
    ["CHƯA GỬI", summary.notSent, "#fff8e1", "#ed6c02"],
    ["KHÔNG GỬI", summary.doNotSend, "#f1f5f9", "#475569"],
    ["CẬP NHẬT 24H", summary.needsFollowUp, "#ffebee", "#c62828"],
    ["KHÁCH HÀNG KHÓ", summary.difficultCustomer, "#fce8e8", "#b71c1c"],
  ];
  summaryCards.forEach(([label, value, background, color], index) => {
    const cardWidth = (width - margin * 2 - gap * (summaryCards.length - 1)) / summaryCards.length;
    const x = margin + index * (cardWidth + gap);
    drawRoundedRect(context, x, 176, cardWidth, 88, 12, background);
    context.fillStyle = "#64748b";
    context.font = "800 15px Arial, sans-serif";
    context.fillText(label, x + 15, 207);
    context.fillStyle = color;
    context.font = "900 34px Arial, sans-serif";
    context.fillText(number(value), x + 15, 250);
  });

  const panels = Array.from({ length: columns }, (_, index) =>
    rows.slice(index * rowsPerColumn, (index + 1) * rowsPerColumn)
  );
  panels.forEach((panelRows, panelIndex) => {
    const x = margin + panelIndex * (panelWidth + gap);
    drawRoundedRect(context, x, tableTop, panelWidth, panelHeaderHeight, 8, "#315f50");
    context.fillStyle = "#ffffff";
    context.font = `800 ${columns <= 2 ? 17 : 14}px Arial, sans-serif`;
    context.fillText(
      fitText(context, "KHÁCH HÀNG · KÊNH · HÓA ĐƠN · TƯƠNG TÁC", panelWidth - 24),
      x + 12,
      tableTop + 30
    );
    panelRows.forEach((row, index) => {
      const y = tableTop + panelHeaderHeight + index * rowHeight;
      context.fillStyle = row.difficultCustomer ? "#fff0f0" : index % 2 ? "#f8fafc" : "#ffffff";
      context.fillRect(x, y, panelWidth, rowHeight);
      context.strokeStyle = "#dbe3ec";
      context.strokeRect(x, y, panelWidth, rowHeight);
      const customer =
        [row.customerCode, row.customerName].filter(Boolean).join(" · ") ||
        "Khách mới / chưa định danh";
      context.fillStyle = row.difficultCustomer ? "#b71c1c" : "#172033";
      const compact = rowHeight < 64 || columns >= 5;
      const horizontalPadding = columns <= 2 ? 18 : 12;
      const customerFontSize = Math.max(
        15,
        Math.min(columns <= 2 ? 27 : 20, Math.round(rowHeight * 0.2))
      );
      const statusFontSize = Math.max(
        13,
        Math.min(columns <= 2 ? 20 : 16, Math.round(rowHeight * 0.14))
      );
      const detailFontSize = Math.max(12, Math.min(18, Math.round(rowHeight * 0.12)));
      const customerY = y + Math.max(23, Math.round(rowHeight * 0.24));
      const statusY = y + Math.max(35, Math.round(rowHeight * 0.53));
      const detailY = y + Math.max(62, Math.round(rowHeight * 0.86));
      context.font = `800 ${customerFontSize}px Arial, sans-serif`;
      context.fillText(
        fitText(context, customer, panelWidth - horizontalPadding * 2),
        x + horizontalPadding,
        customerY
      );
      context.fillStyle = row.difficultCustomer
        ? "#c62828"
        : row.zaloStatus === "CONNECTED"
        ? "#1b5e20"
        : "#c62828";
      context.font = `800 ${
        compact ? Math.min(statusFontSize, 14) : statusFontSize
      }px Arial, sans-serif`;
      const interactionChannel =
        { ZALO: "Zalo", PHONE: "Gọi điện", SMS: "SMS" }[row.interactionChannel] || "Zalo";
      const invoiceStatus =
        { SENT: "Đã gửi HĐ", NOT_SENT: "Chưa gửi HĐ", DO_NOT_SEND: "Không gửi HĐ" }[
          row.invoiceStatus
        ] || "Chưa gửi HĐ";
      const statuses = `${row.difficultCustomer ? "★ KHÁCH HÀNG KHÓ · " : ""}ZALO: ${
        row.zaloStatus === "CONNECTED" ? "ĐÃ KẾT BẠN" : "CHƯA KẾT BẠN"
      } · KÊNH: ${interactionChannel.toUpperCase()} · ${invoiceStatus.toUpperCase()}`;
      const interaction = `${
        {
          INVOICE: "HĐ bán hàng",
          DEBT_PAYMENT: "Thu công nợ",
          CUSTOMER_RETURN: "Hoàn hàng",
        }[row.documentType] || "Dòng tạm"
      } · TƯƠNG TÁC: ${(row.interaction || "Chưa cập nhật").toUpperCase()}`;
      const statusText = rowHeight >= 92 ? statuses : `${statuses} · ${interaction}`;
      context.fillText(
        fitText(context, statusText, panelWidth - horizontalPadding * 2),
        x + horizontalPadding,
        statusY
      );
      if (rowHeight >= 92) {
        context.fillStyle = "#315f50";
        context.font = `700 ${detailFontSize}px Arial, sans-serif`;
        context.fillText(
          fitText(context, interaction, panelWidth - horizontalPadding * 2),
          x + horizontalPadding,
          y + Math.round(rowHeight * 0.7)
        );
      }
      if (rowHeight >= 66) {
        context.fillStyle = row.difficultCustomer || row.needsFollowUp ? "#c62828" : "#64748b";
        context.font = `${row.difficultCustomer ? "800" : "500"} ${detailFontSize}px Arial, sans-serif`;
        context.fillText(
          fitText(
            context,
            [row.difficultCustomer ? "KHÁCH HÀNG KHÓ - SALE LÀM VIỆC" : "", row.phone, row.note]
              .filter(Boolean)
              .join(" · ") || "—",
            panelWidth - horizontalPadding * 2
          ),
          x + horizontalPadding,
          detailY
        );
      }
    });
  });

  context.fillStyle = "#64748b";
  context.font = "500 15px Arial, sans-serif";
  context.fillText(
    "Ảnh báo cáo được tạo trực tiếp từ dữ liệu sổ theo dõi.",
    margin,
    footerTop + 30
  );
  context.textAlign = "right";
  context.font = "800 15px Arial, sans-serif";
  context.fillText(`${rows.length} dòng · A4 NGANG`, width - margin, footerTop + 30);

  const fileName = `${String(date || "").replaceAll("-", "")}_THEODOI_HOADON_TUONGTAC.png`;
  downloadDataImage(canvas.toDataURL("image/png"), fileName);
  return { downloaded: true, fileName, width: canvas.width, height: canvas.height };
};
