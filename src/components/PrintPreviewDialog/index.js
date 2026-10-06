import { useRef, useState } from "react";
import PropTypes from "prop-types";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftTypography from "components/SoftTypography";
import { toast } from "react-toastify";

const safeImageFileName = (value) =>
  `${
    String(value || "tai-lieu")
      .replace(/[<>:"/\\|?*]/g, "-")
      .replace(/\s+/g, " ")
      .trim() || "tai-lieu"
  }.png`;

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

function PrintPreviewDialog({
  open,
  title,
  html,
  onClose,
  description,
  onConfirm,
  confirmLabel,
  confirming,
}) {
  const iframeRef = useRef(null);
  const [exportingImage, setExportingImage] = useState(false);

  const handlePrint = () => {
    const printWindow = iframeRef.current?.contentWindow;
    if (!printWindow) return;
    const previousTitle = document.title;
    const fileName = printWindow.document?.title;
    const restoreTitle = () => {
      document.title = previousTitle;
    };
    if (fileName) document.title = fileName;
    printWindow.addEventListener("afterprint", restoreTitle, { once: true });
    window.setTimeout(restoreTitle, 60000);
    printWindow.focus();
    printWindow.print();
  };

  const handleImage = async () => {
    const previewDocument = iframeRef.current?.contentDocument;
    const target = previewDocument?.querySelector(".page") || previewDocument?.body;
    if (!previewDocument || !target) return;
    try {
      setExportingImage(true);
      await previewDocument.fonts?.ready;
      await waitForImages(previewDocument);
      const html2pdfModule = await import("html2pdf.js/dist/html2pdf.bundle.min.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;
      const worker = html2pdf()
        .set({
          html2canvas: {
            scale: Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            width: target.scrollWidth,
            height: target.scrollHeight,
            windowWidth: target.scrollWidth,
            windowHeight: target.scrollHeight,
          },
        })
        .from(target)
        .toCanvas();
      const canvas = await worker.get("canvas");
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
      if (!blob) throw new Error("Không thể tạo ảnh từ bản xem trước");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeImageFileName(previewDocument.title || title);
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success("Đã tải ảnh PNG xuống thiết bị");
    } catch (error) {
      toast.error(error?.message || "Không thể xuất tài liệu thành ảnh");
    } finally {
      setExportingImage(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { height: { xs: "96vh", md: "94vh" }, m: { xs: 1, md: 2 } } }}
    >
      <DialogTitle sx={{ py: 1.25, pr: 6 }}>
        <SoftTypography variant="h6" fontWeight="bold">
          {title}
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {description}
        </SoftTypography>
        <IconButton
          aria-label="Đóng xem trước"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8 }}
        >
          <Icon>close</Icon>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: "#dfe3e8", overflow: "hidden" }}>
        {html ? (
          <SoftBox
            component="iframe"
            ref={iframeRef}
            title={title}
            srcDoc={html}
            width="100%"
            height="100%"
            sx={{ display: "block", border: 0, bgcolor: "#dfe3e8" }}
          />
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25, flexWrap: "wrap", gap: 0.75 }}>
        <SoftButton variant="outlined" color="secondary" onClick={onClose}>
          Đóng
        </SoftButton>
        {onConfirm && (
          <SoftButton
            variant="gradient"
            color="success"
            onClick={onConfirm}
            disabled={!html || confirming}
          >
            <Icon>check_circle</Icon>&nbsp;
            {confirming ? "Đang lưu..." : confirmLabel}
          </SoftButton>
        )}
        <SoftButton variant="gradient" color="info" onClick={handlePrint} disabled={!html}>
          <Icon>print</Icon>&nbsp;In / Lưu PDF
        </SoftButton>
        <SoftButton
          variant="gradient"
          color="dark"
          onClick={handleImage}
          disabled={!html || exportingImage}
        >
          <Icon>image</Icon>&nbsp;{exportingImage ? "Đang tạo ảnh..." : "Tải ảnh PNG"}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
}

PrintPreviewDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  html: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  description: PropTypes.string,
  onConfirm: PropTypes.func,
  confirmLabel: PropTypes.string,
  confirming: PropTypes.bool,
};

PrintPreviewDialog.defaultProps = {
  html: "",
  description: "Kiểm tra nội dung rồi chọn In / Lưu PDF hoặc Tải ảnh PNG.",
  onConfirm: undefined,
  confirmLabel: "Xác nhận lưu",
  confirming: false,
};

export default PrintPreviewDialog;
