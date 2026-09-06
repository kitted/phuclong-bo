import { useRef } from "react";
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

function PrintPreviewDialog({ open, title, html, onClose }) {
  const iframeRef = useRef(null);

  const handlePrint = () => {
    const printWindow = iframeRef.current?.contentWindow;
    if (!printWindow) return;
    printWindow.focus();
    printWindow.print();
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
          Kiểm tra đúng một trang A4 rồi chọn In / Lưu PDF.
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
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <SoftButton variant="outlined" color="secondary" onClick={onClose}>
          Đóng
        </SoftButton>
        <SoftButton variant="gradient" color="info" onClick={handlePrint} disabled={!html}>
          <Icon>print</Icon>&nbsp;In / Lưu PDF
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
};

PrintPreviewDialog.defaultProps = {
  html: "",
};

export default PrintPreviewDialog;
