import { useCallback, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import DocumentSafetyService from "services/documentSafetyService";
import { toast } from "react-toastify";

const CONFIRMATION_TEXT = "HOAN TAC CHUNG TU TRONG NGAY";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const errorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (message && typeof message === "object") return message.message || fallback;
  return message || fallback;
};
const makeIdempotencyKey = () =>
  window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const typeConfig = {
  INVOICE: { label: "Hóa đơn", color: "info", icon: "receipt_long" },
  DEBT_PAYMENT: { label: "Thu công nợ", color: "success", icon: "payments" },
  CUSTOMER_RETURN: { label: "Trả hàng", color: "warning", icon: "assignment_return" },
};
const operationStatus = {
  PROCESSING: { label: "Đang xử lý", color: "info" },
  COMPLETED: { label: "Hoàn tất", color: "success" },
  PARTIAL: { label: "Một phần", color: "warning" },
  FAILED: { label: "Thất bại", color: "error" },
};

export default function DocumentSafety() {
  const [date, setDate] = useState(today());
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [previewResponse, historyResponse] = await Promise.all([
        DocumentSafetyService.preview(date),
        DocumentSafetyService.history({ date, page: 1, limit: 20 }),
      ]);
      setPreview(unwrap(previewResponse));
      const historyData = unwrap(historyResponse);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tải vùng an toàn chứng từ"));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const documents = useMemo(() => {
    const source = preview?.documents || {};
    return [
      ...(source.invoices || []),
      ...(source.debtPayments || []),
      ...(source.customerReturns || []),
    ].sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt));
  }, [preview]);

  const openReverse = () => {
    setReason("");
    setConfirmation("");
    setAcknowledged(false);
    setIdempotencyKey(makeIdempotencyKey());
    setReverseOpen(true);
  };

  const exportDay = async () => {
    try {
      setExporting(true);
      const response = await DocumentSafetyService.export(date);
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `vung-an-toan-chung-tu-${date}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast.success("Đã trích xuất toàn bộ chứng từ trong ngày");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể trích xuất chứng từ"));
    } finally {
      setExporting(false);
    }
  };

  const reverseDay = async () => {
    try {
      setReversing(true);
      const response = await DocumentSafetyService.reverseDay({
        date,
        reason: reason.trim(),
        confirmation: confirmation.trim(),
        idempotencyKey,
      });
      const result = unwrap(response);
      if (result.status === "COMPLETED") {
        toast.success("Đã hoàn tác toàn bộ chứng từ đang hoạt động trong ngày");
        setReverseOpen(false);
      } else {
        toast.error(
          result.status === "PARTIAL"
            ? "Chỉ hoàn tác được một phần. Hãy xem lịch sử để kiểm tra lỗi."
            : result.errorMessage || "Không thể hoàn tác chứng từ"
        );
      }
      await load();
    } catch (error) {
      toast.error(errorMessage(error, "Không thể hoàn tác chứng từ trong ngày"));
    } finally {
      setReversing(false);
    }
  };

  const canSubmit =
    acknowledged &&
    reason.trim().length >= 5 &&
    confirmation.trim() === CONFIRMATION_TEXT &&
    !reversing;
  const summary = preview?.summary || {};

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3} pb={{ xs: 10, md: 3 }}>
        <SoftBox bgcolor="#fff" borderRadius={3} p={{ xs: 1.5, md: 3 }}>
          <SoftBox display="flex" justifyContent="space-between" gap={1.5} flexWrap="wrap">
            <SoftBox>
              <SoftTypography variant="h4" fontWeight="bold">
                Vùng an toàn chứng từ
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                Kiểm tra, trích xuất và hoàn tác hóa đơn, thu công nợ, trả hàng theo ngày.
              </SoftTypography>
            </SoftBox>
            <SoftBox display="flex" gap={1} flexWrap="wrap">
              <SoftInput
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                sx={{ width: 190 }}
              />
              <SoftButton variant="outlined" color="info" onClick={load} disabled={loading}>
                <Icon>refresh</Icon>&nbsp;Tải lại
              </SoftButton>
              <SoftButton color="success" onClick={exportDay} disabled={exporting || loading}>
                <Icon>download</Icon>&nbsp;{exporting ? "Đang xuất..." : "Trích xuất Excel"}
              </SoftButton>
            </SoftBox>
          </SoftBox>

          <Alert severity="warning" sx={{ mt: 2 }}>
            Hoàn tác sẽ đảo nghiệp vụ và phục hồi tồn kho, tồn xe, công nợ. Chứng từ không bị xóa
            khỏi lịch sử.
          </Alert>

          <Grid container spacing={1.25} mt={0.5}>
            {[
              [
                "Hóa đơn đang hoạt động",
                summary.activeInvoiceCount,
                money(summary.invoiceAmount),
                "#e8f3ff",
              ],
              [
                "Phiếu thu đang hoạt động",
                summary.activeDebtPaymentCount,
                money(summary.debtPaymentAmount),
                "#e8f7ee",
              ],
              [
                "Phiếu trả đang hoạt động",
                summary.activeCustomerReturnCount,
                money(summary.customerReturnAmount),
                "#fff3e5",
              ],
              [
                "Tổng cần hoàn tác",
                summary.activeDocuments,
                `${summary.totalDocuments || 0} chứng từ trong ngày`,
                "#f2ecff",
              ],
            ].map(([label, value, detail, background]) => (
              <Grid item xs={12} sm={6} lg={3} key={label}>
                <SoftBox p={1.5} bgcolor={background} borderRadius={2} height="100%">
                  <SoftTypography variant="caption" color="text">
                    {label}
                  </SoftTypography>
                  <SoftTypography variant="h5" fontWeight="bold">
                    {value || 0}
                  </SoftTypography>
                  <SoftTypography variant="caption">{detail}</SoftTypography>
                </SoftBox>
              </Grid>
            ))}
          </Grid>

          {(preview?.blockers || []).map((item) => (
            <Alert severity="error" key={`${item.code}-${item.documentId || "all"}`} sx={{ mt: 1 }}>
              {item.message}
            </Alert>
          ))}
          {(preview?.warnings || []).map((item) => (
            <Alert
              severity="warning"
              key={`${item.code}-${item.documentId || "all"}`}
              sx={{ mt: 1 }}
            >
              {item.message}
            </Alert>
          ))}

          <SoftBox mt={2} display="flex" justifyContent="space-between" alignItems="center">
            <SoftTypography variant="h6" fontWeight="bold">
              Chứng từ ngày {date}
            </SoftTypography>
            <SoftButton
              color="error"
              variant="gradient"
              disabled={!preview?.canReverse || loading}
              onClick={openReverse}
            >
              <Icon>settings_backup_restore</Icon>&nbsp;Hoàn tác toàn bộ trong ngày
            </SoftButton>
          </SoftBox>

          <Grid container spacing={1.25} mt={0.25}>
            {documents.map((item) => {
              const config = typeConfig[item.type] || typeConfig.INVOICE;
              const inactive = ["REVERSED", "CANCELLED"].includes(item.status);
              return (
                <Grid item xs={12} md={6} lg={4} key={`${item.type}-${item.id}`}>
                  <SoftBox
                    p={1.5}
                    borderRadius={2}
                    height="100%"
                    sx={{ border: "1px solid #e0e5ec", opacity: inactive ? 0.65 : 1 }}
                  >
                    <SoftBox display="flex" justifyContent="space-between" gap={1}>
                      <SoftBox display="flex" gap={1} minWidth={0}>
                        <Icon color={config.color}>{config.icon}</Icon>
                        <SoftBox minWidth={0}>
                          <SoftTypography variant="button" fontWeight="bold" display="block">
                            {item.code}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            {item.customerCode ? `${item.customerCode} · ` : ""}
                            {item.customerName || "Khách lẻ"}
                          </SoftTypography>
                        </SoftBox>
                      </SoftBox>
                      <Chip
                        size="small"
                        color={inactive ? "default" : config.color}
                        label={inactive ? item.status : config.label}
                      />
                    </SoftBox>
                    <SoftBox display="flex" justifyContent="space-between" mt={1} gap={1}>
                      <SoftTypography variant="caption" color="text">
                        {dateTime(item.occurredAt)}
                      </SoftTypography>
                      <SoftTypography variant="button" fontWeight="bold">
                        {money(item.amount)}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                </Grid>
              );
            })}
            {!documents.length && (
              <Grid item xs={12}>
                <SoftTypography variant="caption" color="text">
                  Không có chứng từ trong ngày đã chọn.
                </SoftTypography>
              </Grid>
            )}
          </Grid>

          <SoftTypography variant="h6" fontWeight="bold" mt={3} mb={1}>
            Lịch sử hoàn tác
          </SoftTypography>
          {history.map((item) => {
            const status = operationStatus[item.status] || operationStatus.FAILED;
            return (
              <SoftBox
                key={item.id || item._id}
                p={1.25}
                mb={1}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={1}
                borderRadius={2}
                sx={{ border: "1px solid #e0e5ec" }}
              >
                <SoftBox>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {item.documentDate} · {item.createdByName || "Admin"}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {dateTime(item.createdAt)} · {item.reason}
                  </SoftTypography>
                  {item.errorMessage && (
                    <SoftTypography variant="caption" color="error" display="block">
                      Lỗi: {item.errorMessage}
                    </SoftTypography>
                  )}
                </SoftBox>
                <Chip size="small" color={status.color} label={status.label} />
              </SoftBox>
            );
          })}
          {!history.length && (
            <SoftTypography variant="caption" color="text">
              Chưa có lần hoàn tác nào cho ngày này.
            </SoftTypography>
          )}
        </SoftBox>
      </SoftBox>

      <Dialog open={reverseOpen} onClose={() => !reversing && setReverseOpen(false)} fullWidth>
        <DialogTitle>Hoàn tác toàn bộ chứng từ ngày {date}</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Thao tác này sẽ đảo {summary.activeDocuments || 0} chứng từ. Không đóng trang cho đến
            khi hệ thống báo hoàn tất.
          </Alert>
          <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
            Lý do bắt buộc
          </SoftTypography>
          <SoftInput
            multiline
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ví dụ: Nhập nhầm toàn bộ chứng từ ngày..."
          />
          <SoftTypography variant="caption" fontWeight="bold" display="block" mt={2} mb={0.5}>
            Nhập chính xác: {CONFIRMATION_TEXT}
          </SoftTypography>
          <SoftInput
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={CONFIRMATION_TEXT}
          />
          <FormControlLabel
            sx={{ mt: 1 }}
            control={
              <Checkbox
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
            }
            label="Tôi đã trích xuất dữ liệu và hiểu thao tác sẽ thay đổi tồn kho, tồn xe, công nợ."
          />
        </DialogContent>
        <DialogActions>
          <SoftButton color="secondary" variant="outlined" onClick={() => setReverseOpen(false)}>
            Hủy
          </SoftButton>
          <SoftButton color="error" variant="gradient" disabled={!canSubmit} onClick={reverseDay}>
            {reversing ? "Đang hoàn tác..." : "Xác nhận hoàn tác"}
          </SoftButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
