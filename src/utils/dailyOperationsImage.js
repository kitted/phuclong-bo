import { dailyOperationFileName } from "./dailyOperationsPrint";
import {
  drawCanvasLines,
  downloadDataImage,
  fitCanvasToA3,
  wrapCanvasText,
} from "./truckInventoryImage";

const money = (value) => Number(value || 0).toLocaleString("vi-VN");
const dateText = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime())
    ? String(value || "")
    : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

const createContext = (width) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  const measure = canvas.getContext("2d");
  if (!measure) throw new Error("Trình duyệt không hỗ trợ tạo ảnh tài liệu");
  return { canvas, measure };
};

const drawBrandHeader = (context, width, title, code, metaLines) => {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, 205);
  context.strokeStyle = "#0d47a1";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(82, 75, 43, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "#0d47a1";
  context.textAlign = "center";
  context.font = "900 34px Arial, sans-serif";
  context.fillText("PL", 76, 87);
  context.fillStyle = "#ff7043";
  context.font = "900 19px Arial, sans-serif";
  context.fillText("+", 103, 77);
  context.fillStyle = "#0d47a1";
  context.font = "800 14px Arial, sans-serif";
  context.fillText("PHÚC LONG", 82, 140);
  context.font = "800 29px Arial, sans-serif";
  context.fillText(title, width / 2, 52);
  context.textAlign = "left";
  context.font = "400 17px Arial, sans-serif";
  metaLines.forEach((line, index) => context.fillText(line, 160, 92 + index * 28));
  context.textAlign = "right";
  context.font = "700 17px Arial, sans-serif";
  context.fillText(code || "BẢN XEM TRƯỚC", width - 40, 185);
  context.strokeStyle = "#64748b";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(40, 204);
  context.lineTo(width - 40, 204);
  context.stroke();
  context.textAlign = "left";
};

const finishImage = (canvas, fileName) => {
  const a3Canvas = fitCanvasToA3(canvas);
  const url = a3Canvas.toDataURL("image/png");
  downloadDataImage(url, `${fileName}.png`);
  return { downloaded: true, width: a3Canvas.width, height: a3Canvas.height };
};

const operationConfig = {
  LOAD: { title: "PHIẾU TẠM ỨNG HÀNG", operation: "UNGHANG" },
  RETURN: { title: "PHIẾU HOÀN HÀNG VỀ KHO", operation: "HOANHANG" },
  TRUCK_TO_TRUCK: { title: "PHIẾU CHUYỂN HÀNG GIỮA XE", operation: "CHUYENXE" },
};

export const createTruckOperationCanvasImage = (transfer) => {
  const width = 1200;
  const margin = 40;
  const contentWidth = width - margin * 2;
  const columns = [70, 650, 170, 230];
  const config = operationConfig[transfer?.type] || operationConfig.LOAD;
  const sourceTruck = transfer?.sourceTruck || transfer?.truck || {};
  const destinationTruck = transfer?.destinationTruck || {};
  const route =
    transfer?.type === "TRUCK_TO_TRUCK"
      ? `${sourceTruck.code || sourceTruck.name || "Xe nguồn"} → ${
          destinationTruck.code || destinationTruck.name || "Xe nhận"
        }`
      : `${sourceTruck.code || ""} · ${sourceTruck.name || ""}`;
  const driver = transfer?.driver || sourceTruck.driver || transfer?.createdBy || {};
  const items = transfer?.items || [];
  const { canvas, measure } = createContext(width);
  measure.font = "400 19px Arial, sans-serif";
  const rows = items.map((item) => {
    const nameLines = wrapCanvasText(
      measure,
      [item.productName || item.name || "Sản phẩm", item.productCode].filter(Boolean).join(" · "),
      columns[1] - 24
    );
    const noteLines = wrapCanvasText(measure, item.note || "", columns[3] - 24);
    return {
      item,
      nameLines,
      noteLines,
      height: Math.max(54, 18 + Math.max(nameLines.length, noteLines.length) * 26),
    };
  });
  const issueLines = wrapCanvasText(measure, transfer?.issues || "—", contentWidth / 2 - 40);
  const noteLines = wrapCanvasText(measure, transfer?.note || "—", contentWidth / 2 - 40);
  const notesHeight = Math.max(issueLines.length, noteLines.length) * 25 + 70;
  const height = 205 + 30 + 58 + rows.reduce((sum, row) => sum + row.height, 0) + notesHeight + 185;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#111827";
  context.fillRect(0, 0, width, height);
  drawBrandHeader(context, width, config.title, transfer?.code, [
    `Ngày: ${dateText(transfer?.date)}`,
    `Người thực hiện: ${driver.fullName || driver.name || "—"}`,
    `Xe / tuyến: ${route || "—"}`,
  ]);
  let y = 235;
  context.fillStyle = "#eeeeee";
  context.fillRect(margin, y, contentWidth, 58);
  const headers = ["STT", "HÀNG HÓA", "SỐ LƯỢNG", "GHI CHÚ"];
  let x = margin;
  context.font = "700 18px Arial, sans-serif";
  headers.forEach((header, index) => {
    context.fillStyle = "#111827";
    context.textAlign = "center";
    context.fillText(header, x + columns[index] / 2, y + 36);
    x += columns[index];
  });
  y += 58;
  rows.forEach(({ item, nameLines, noteLines: itemNotes, height: rowHeight }, index) => {
    context.fillStyle = index % 2 ? "#f8fafc" : "#ffffff";
    context.fillRect(margin, y, contentWidth, rowHeight);
    context.strokeStyle = "#222222";
    context.strokeRect(margin, y, contentWidth, rowHeight);
    x = margin;
    columns.forEach((columnWidth, columnIndex) => {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + rowHeight);
      context.stroke();
      context.fillStyle = "#111827";
      if (columnIndex === 1) {
        context.font = "600 19px Arial, sans-serif";
        drawCanvasLines(context, nameLines, x + 12, y + 30, 26);
      } else if (columnIndex === 3) {
        context.font = "400 18px Arial, sans-serif";
        drawCanvasLines(context, itemNotes, x + 12, y + 30, 25);
      } else {
        context.font = "500 19px Arial, sans-serif";
        context.textAlign = "center";
        context.fillText(
          columnIndex === 0
            ? String(index + 1)
            : `${money(item.qty || item.quantity)} ${item.unit || ""}`,
          x + columnWidth / 2,
          y + 33
        );
      }
      x += columnWidth;
    });
    y += rowHeight;
  });
  context.fillStyle = "#f8fafc";
  context.fillRect(margin, y + 18, contentWidth, notesHeight - 20);
  context.fillStyle = "#111827";
  context.font = "700 18px Arial, sans-serif";
  context.textAlign = "left";
  context.fillText("CÁC VẤN ĐỀ CẦN CHÚ Ý", margin + 18, y + 50);
  context.fillText("GHI CHÚ", margin + contentWidth / 2 + 18, y + 50);
  context.font = "400 18px Arial, sans-serif";
  drawCanvasLines(context, issueLines, margin + 18, y + 82, 25);
  drawCanvasLines(context, noteLines, margin + contentWidth / 2 + 18, y + 82, 25);
  y += notesHeight;
  context.font = "700 18px Arial, sans-serif";
  context.textAlign = "center";
  ["NGƯỜI LẬP PHIẾU", "NGƯỜI GIAO HÀNG", "NGƯỜI NHẬN HÀNG"].forEach((label, index) =>
    context.fillText(label, margin + (contentWidth * (index * 2 + 1)) / 6, y + 48)
  );
  context.font = "italic 15px Arial, sans-serif";
  [0, 1, 2].forEach((index) =>
    context.fillText("(ký, ghi rõ họ tên)", margin + (contentWidth * (index * 2 + 1)) / 6, y + 75)
  );
  const subject =
    transfer?.type === "TRUCK_TO_TRUCK"
      ? `${sourceTruck.name || sourceTruck.code}-${destinationTruck.name || destinationTruck.code}`
      : sourceTruck.name || sourceTruck.code;
  return finishImage(canvas, dailyOperationFileName(transfer?.date, config.operation, subject));
};

export const createDailyReportCanvasImage = (report) => {
  const snapshot = report?.snapshot || report || {};
  const documents = snapshot.documents || [];
  const products = snapshot.products || [];
  const summary = snapshot.summary || {};
  const width = 1400;
  const margin = 50;
  const contentWidth = width - margin * 2;
  const columns = [60, 350, 180, 160, 200, 350];
  const { canvas, measure } = createContext(width);
  measure.font = "400 18px Arial, sans-serif";
  const rows = documents.map((item) => {
    const customerLines = wrapCanvasText(measure, item.customerName || "Khách lẻ", columns[1] - 20);
    const noteLines = wrapCanvasText(measure, item.note || "", columns[5] - 20);
    return {
      item,
      customerLines,
      noteLines,
      height: Math.max(52, 18 + Math.max(customerLines.length, noteLines.length) * 25),
    };
  });
  const productLines = products.flatMap((item) =>
    wrapCanvasText(
      measure,
      `${item.productName}: ${money(item.quantity)} ${item.unit || ""}${
        Number(item.giftQuantity || 0) > 0 ? ` (KM ${money(item.giftQuantity)})` : ""
      }`,
      contentWidth / 2 - 35
    )
  );
  const issueLines = wrapCanvasText(measure, report?.issues || "—", contentWidth - 30);
  const noteLines = wrapCanvasText(measure, report?.notes || "—", contentWidth - 30);
  const lowerHeight =
    Math.max(260, productLines.length * 25 + 90) +
    (issueLines.length + noteLines.length) * 25 +
    110;
  const height = 215 + 58 + rows.reduce((sum, row) => sum + row.height, 0) + lowerHeight;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  const salesperson =
    [report?.salespersonCode, report?.salespersonName].filter(Boolean).join(" · ") ||
    snapshot?.salesperson?.name ||
    report?.performerName ||
    "—";
  drawBrandHeader(context, width, "BÁO CÁO CUỐI NGÀY THEO SALE", report?.code, [
    `Ngày: ${dateText(report?.reportDate || snapshot?.reportDate)}`,
    `Sale: ${salesperson}`,
    `Địa bàn: ${report?.area || "—"}`,
  ]);
  let y = 215;
  context.fillStyle = "#eeeeee";
  context.fillRect(margin, y, contentWidth, 58);
  const headers = ["STT", "KHÁCH HÀNG", "NGHIỆP VỤ", "TM/CK", "SỐ TIỀN", "GHI CHÚ"];
  let x = margin;
  context.font = "700 17px Arial, sans-serif";
  headers.forEach((header, index) => {
    context.fillStyle = "#111827";
    context.textAlign = "center";
    context.fillText(header, x + columns[index] / 2, y + 36);
    x += columns[index];
  });
  y += 58;
  const typeName = { SALE: "Bán hàng", DEBT_PAYMENT: "Thu nợ", CUSTOMER_RETURN: "Hoàn hàng" };
  rows.forEach(({ item, customerLines, noteLines: rowNotes, height: rowHeight }, index) => {
    context.fillStyle = index % 2 ? "#f8fafc" : "#ffffff";
    context.fillRect(margin, y, contentWidth, rowHeight);
    context.strokeStyle = "#222222";
    context.strokeRect(margin, y, contentWidth, rowHeight);
    const values = [
      String(index + 1),
      null,
      typeName[item.type] || item.type || "—",
      item.paymentMethod || "—",
      money(item.amount),
      null,
    ];
    x = margin;
    columns.forEach((columnWidth, columnIndex) => {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + rowHeight);
      context.stroke();
      context.fillStyle = "#111827";
      context.font = "400 18px Arial, sans-serif";
      if (columnIndex === 1) drawCanvasLines(context, customerLines, x + 10, y + 29, 25);
      else if (columnIndex === 5) drawCanvasLines(context, rowNotes, x + 10, y + 29, 25);
      else {
        context.textAlign = columnIndex === 4 ? "right" : "center";
        context.fillText(
          values[columnIndex],
          columnIndex === 4 ? x + columnWidth - 10 : x + columnWidth / 2,
          y + 31
        );
      }
      x += columnWidth;
    });
    y += rowHeight;
  });
  y += 22;
  context.fillStyle = "#e8f5e9";
  context.fillRect(margin, y, 600, 210);
  context.fillStyle = "#111827";
  context.font = "700 19px Arial, sans-serif";
  context.textAlign = "left";
  context.fillText("TỔNG HỢP", margin + 18, y + 34);
  context.font = "500 18px Arial, sans-serif";
  [
    `Doanh thu: ${money(summary.salesRevenue)} đ`,
    `Tiền mặt: ${money(summary.cash)} đ`,
    `Chuyển khoản: ${money(summary.bankTransfer)} đ`,
    `Doanh thu ròng: ${money(summary.netRevenue)} đ`,
    `Tổng chứng từ: ${money(summary.documentCount)}`,
  ].forEach((line, index) => context.fillText(line, margin + 18, y + 68 + index * 27));
  context.fillStyle = "#eef5ff";
  const productHeight = Math.max(210, productLines.length * 25 + 65);
  context.fillRect(margin + 620, y, contentWidth - 620, productHeight);
  context.fillStyle = "#111827";
  context.font = "700 19px Arial, sans-serif";
  context.fillText("HÀNG BÁN VÀ KHUYẾN MÃI", margin + 638, y + 34);
  context.font = "400 18px Arial, sans-serif";
  drawCanvasLines(context, productLines, margin + 638, y + 67, 25);
  y += Math.max(210, productHeight) + 25;
  context.font = "700 18px Arial, sans-serif";
  context.fillText("CÁC VẤN ĐỀ CẦN GIẢI QUYẾT", margin, y);
  context.font = "400 18px Arial, sans-serif";
  drawCanvasLines(context, issueLines, margin, y + 30, 25);
  y += issueLines.length * 25 + 60;
  context.font = "700 18px Arial, sans-serif";
  context.fillText("GHI CHÚ", margin, y);
  context.font = "400 18px Arial, sans-serif";
  drawCanvasLines(context, noteLines, margin, y + 30, 25);
  return finishImage(
    canvas,
    dailyOperationFileName(
      report?.reportDate || snapshot?.reportDate,
      "BAOCAO",
      report?.salespersonName || snapshot?.salesperson?.name || report?.performerName
    )
  );
};
