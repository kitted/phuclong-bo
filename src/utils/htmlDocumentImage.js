const waitForImages = (document) =>
  Promise.all(
    [...document.images].map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    })
  );

const imageFileName = (value) =>
  `${
    String(value || "tai-lieu")
      .replace(/\.png$/i, "")
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, " ")
      .trim() || "tai-lieu"
  }.png`;

const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const createExportFrame = (html, viewportWidth) =>
  new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = [
      "position:fixed",
      "left:-100000px",
      "top:0",
      `width:${viewportWidth}px`,
      "height:1px",
      "border:0",
      "pointer-events:none",
    ].join(";");
    frame.onload = () => resolve(frame);
    frame.onerror = () => reject(new Error("Không thể dựng tài liệu để xuất ảnh"));
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });

export async function downloadHtmlDocumentImage({
  html,
  fileName,
  selector = ".page, .invoice-sheet",
  viewportWidth = 1200,
}) {
  if (!html) throw new Error("Không có nội dung để xuất ảnh");
  let frame;
  try {
    frame = await createExportFrame(html, viewportWidth);
    const exportDocument = frame.contentDocument;
    if (!exportDocument) throw new Error("Không thể đọc tài liệu để xuất ảnh");
    await exportDocument.fonts?.ready;
    await waitForImages(exportDocument);

    const target = exportDocument.querySelector(selector) || exportDocument.body;
    if (!target) throw new Error("Không tìm thấy nội dung để xuất ảnh");

    // Loại bỏ phần trang trí của màn hình xem trước. Ảnh được dựng từ toàn bộ
    // tài liệu gốc, không phụ thuộc vùng đang nhìn thấy trên điện thoại/máy tính.
    target.style.margin = "0";
    target.style.boxShadow = "none";
    target.style.overflow = "visible";
    exportDocument.body.style.margin = "0";
    exportDocument.body.style.background = "#ffffff";

    const width = Math.ceil(Math.max(target.scrollWidth, target.getBoundingClientRect().width));
    const height = Math.ceil(Math.max(target.scrollHeight, target.getBoundingClientRect().height));
    if (!width || !height) throw new Error("Kích thước tài liệu không hợp lệ");

    // Giữ ảnh sắc nét nhưng tự hạ tỉ lệ khi tài liệu rất dài để canvas không
    // vượt giới hạn trình duyệt và làm mất phần cuối của bảng/ghi chú/chữ ký.
    const maxSide = 30000;
    const maxArea = 32000000;
    const scale = Math.min(
      2.25,
      maxSide / width,
      maxSide / height,
      Math.sqrt(maxArea / (width * height))
    );
    const html2pdfModule = await import("html2pdf.js/dist/html2pdf.bundle.min.js");
    const html2pdf = html2pdfModule.default || html2pdfModule;
    const worker = html2pdf()
      .set({
        html2canvas: {
          scale,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          width,
          height,
          windowWidth: Math.max(viewportWidth, width),
          windowHeight: height,
          scrollX: 0,
          scrollY: 0,
        },
      })
      .from(target)
      .toCanvas();
    const canvas = await worker.get("canvas");
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!blob) throw new Error("Không thể tạo file ảnh PNG");

    const resolvedFileName = imageFileName(exportDocument.title || fileName);
    downloadBlob(blob, resolvedFileName);
    return {
      downloaded: true,
      fileName: resolvedFileName,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    frame?.remove();
  }
}
