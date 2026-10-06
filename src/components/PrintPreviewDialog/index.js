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
import { downloadHtmlDocumentImage } from "utils/htmlDocumentImage";

function PrintPreviewDialog({
  open,
  title,
  html,
  onClose,
  description,
  onConfirm,
  confirmLabel,
  confirming,
  onDownloadImage,
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
    try {
      setExportingImage(true);
      if (onDownloadImage) await onDownloadImage();
      else await downloadHtmlDocumentImage({ html, fileName: title });
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
  onDownloadImage: PropTypes.func,
};

PrintPreviewDialog.defaultProps = {
  html: "",
  description: "Kiểm tra nội dung rồi chọn In / Lưu PDF hoặc Tải ảnh PNG.",
  onConfirm: undefined,
  confirmLabel: "Xác nhận lưu",
  confirming: false,
  onDownloadImage: undefined,
};

export default PrintPreviewDialog;
