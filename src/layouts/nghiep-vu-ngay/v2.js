import { useCallback, useEffect, useState } from "react";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import EntityThumbnail from "components/EntityThumbnail";
import PrintPreviewDialog from "components/PrintPreviewDialog";
import { DailyReportService } from "services/dailyOperationsService";
import { buildDailyReportPdfHtml } from "utils/dailyOperationsPrint";
import QuickTruckOperations from "./QuickTruckOperations";
import { toast } from "react-toastify";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const rows = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const idOf = (value) => value?.id || value?._id || "";
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const documentLabels = { SALE: "Bán hàng", DEBT_PAYMENT: "Thu nợ", CUSTOMER_RETURN: "Hoàn hàng" };
const emptyMeta = { area: "", performerName: "", vehicle: "", notes: "", issues: "" };
const emptyExpenses = { FUEL: "", MEAL: "", TOLL: "", OTHER: "" };

function DailyReportTab() {
  const [date, setDate] = useState(today());
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [expenses, setExpenses] = useState(emptyExpenses);
  const [loading, setLoading] = useState(false);
  const [printPreview, setPrintPreview] = useState(null);

  const loadList = useCallback(
    () =>
      DailyReportService.list({ page: 1, limit: 100 })
        .then((response) => setSaved(rows(response)))
        .catch(() => setSaved([])),
    []
  );
  const loadPreview = useCallback(async () => {
    try {
      setLoading(true);
      setPreview(unwrap(await DailyReportService.preview(date)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tổng hợp báo cáo");
    } finally {
      setLoading(false);
    }
  }, [date]);
  useEffect(() => {
    loadPreview();
    loadList();
  }, [loadList, loadPreview]);

  const create = async () => {
    try {
      setLoading(true);
      const manualAdjustments = Object.entries(expenses)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([type, amount]) => ({
          type,
          label: { FUEL: "Dầu", MEAL: "Ăn", TOLL: "Trạm", OTHER: "Chi phí khác" }[type],
          amount: Number(amount),
        }));
      const response = await DailyReportService.create({
        date,
        ...meta,
        area: meta.area || undefined,
        performerName: meta.performerName || undefined,
        vehicle: meta.vehicle || undefined,
        notes: meta.notes || undefined,
        issues: meta.issues || undefined,
        manualAdjustments,
      });
      const report = unwrap(response);
      toast.success("Đã chốt báo cáo ngày");
      await loadList();
      setPrintPreview({
        title: `Báo cáo ngày · ${report?.code || report?.reportDate || date}`,
        html: buildDailyReportPdfHtml(report),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể chốt báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const exportDoc = async (doc) => {
    try {
      setLoading(true);
      const response = await DailyReportService.detail(idOf(doc));
      const report = unwrap(response);
      setPrintPreview({
        title: `Báo cáo ngày · ${report?.code || report?.reportDate || ""}`,
        html: buildDailyReportPdfHtml(report),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tạo file PDF");
    } finally {
      setLoading(false);
    }
  };

  const summary = preview?.summary || {};
  return (
    <SoftBox>
      <SoftBox display="flex" justifyContent="space-between" gap={1} flexWrap="wrap" mb={2}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold">
            Tổng hợp báo cáo ngày
          </SoftTypography>
          <SoftTypography variant="caption" color="text">
            Dữ liệu được tổng hợp tự động; thông tin bổ sung sẽ xuất đúng mẫu giấy A4.
          </SoftTypography>
        </SoftBox>
        <SoftBox display="flex" gap={1} flexWrap="wrap">
          <SoftInput
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            sx={{ width: 190 }}
          />
          <SoftButton color="info" variant="outlined" onClick={loadPreview} disabled={loading}>
            <Icon>refresh</Icon>&nbsp;Tổng hợp lại
          </SoftButton>
        </SoftBox>
      </SoftBox>
      {preview && (
        <>
          <Grid container spacing={1.25}>
            {[
              ["Chứng từ", summary.documentCount, "description", "#eef5ff"],
              ["Doanh thu bán", money(summary.salesRevenue), "payments", "#e8f5e9"],
              ["Tiền mặt", money(summary.cash), "account_balance_wallet", "#fff8e1"],
              ["Chuyển khoản", money(summary.bankTransfer), "account_balance", "#f3e5f5"],
              ["Doanh thu ròng", money(summary.netRevenue), "trending_up", "#e0f7fa"],
            ].map(([label, value, icon, background]) => (
              <Grid item xs={6} md key={label}>
                <SoftBox p={1.5} borderRadius={2} bgcolor={background} height="100%">
                  <Icon fontSize="small">{icon}</Icon>
                  <SoftTypography variant="caption" color="text" display="block">
                    {label}
                  </SoftTypography>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {value || 0}
                  </SoftTypography>
                </SoftBox>
              </Grid>
            ))}
          </Grid>
          <SoftBox mt={2} p={{ xs: 1.5, md: 2 }} borderRadius={2} bgcolor="#f7f9fc">
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
              Thông tin trên đầu phiếu
            </SoftTypography>
            <Grid container spacing={1.25}>
              {[
                ["area", "Địa bàn"],
                ["performerName", "Người thực hiện"],
                ["vehicle", "Phương tiện"],
              ].map(([key, label]) => (
                <Grid item xs={12} md={4} key={key}>
                  <SoftInput
                    value={meta[key]}
                    onChange={(event) => setMeta({ ...meta, [key]: event.target.value })}
                    placeholder={label}
                  />
                </Grid>
              ))}
            </Grid>
          </SoftBox>
          <Grid container spacing={2} mt={0.25}>
            <Grid item xs={12} lg={7}>
              <SoftTypography variant="button" fontWeight="bold">
                Chứng từ trong ngày
              </SoftTypography>
              {(preview.documents || []).map((doc) => (
                <SoftBox
                  key={`${doc.type}-${doc.id}`}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                  p={1}
                  mt={0.5}
                  borderRadius={1.5}
                  bgcolor="#fafafa"
                >
                  <SoftBox display="flex" alignItems="center" gap={1} minWidth={0}>
                    <EntityThumbnail entity={doc.customer || doc} type="customer" size={36} />
                    <SoftBox minWidth={0}>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {doc.customerName || "Khách lẻ"}
                      </SoftTypography>
                      <SoftTypography variant="caption" display="block" color="text">
                        {doc.code} · {documentLabels[doc.type] || doc.type} ·{" "}
                        {doc.paymentMethod || "—"}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                  <SoftTypography variant="button" fontWeight="bold">
                    {money(doc.amount)}
                  </SoftTypography>
                </SoftBox>
              ))}
            </Grid>
            <Grid item xs={12} lg={5}>
              <SoftTypography variant="button" fontWeight="bold">
                Số hàng bán trong ngày
              </SoftTypography>
              {(preview.products || []).map((product) => (
                <SoftBox
                  key={product.productId}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={1}
                  mt={0.5}
                  bgcolor="#f3f8ff"
                  borderRadius={1.5}
                >
                  <SoftBox display="flex" alignItems="center" gap={1}>
                    <EntityThumbnail entity={product} size={36} />
                    <SoftTypography variant="button">{product.productName}</SoftTypography>
                  </SoftBox>
                  <SoftTypography variant="button" fontWeight="bold">
                    {product.quantity} {product.unit}
                  </SoftTypography>
                </SoftBox>
              ))}
            </Grid>
          </Grid>
          <SoftBox mt={2} p={{ xs: 1.5, md: 2 }} borderRadius={2} bgcolor="#fffaf0">
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
              Chi phí trong ngày
            </SoftTypography>
            <Grid container spacing={1.25}>
              {[
                ["FUEL", "Dầu"],
                ["MEAL", "Ăn"],
                ["TOLL", "Trạm"],
                ["OTHER", "Chi phí khác"],
              ].map(([key, label]) => (
                <Grid item xs={6} md={3} key={key}>
                  <SoftInput
                    type="number"
                    value={expenses[key]}
                    onChange={(event) => setExpenses({ ...expenses, [key]: event.target.value })}
                    placeholder={label}
                  />
                </Grid>
              ))}
            </Grid>
          </SoftBox>
          <Grid container spacing={1.25} mt={0.5}>
            <Grid item xs={12} md={6}>
              <SoftInput
                multiline
                rows={3}
                value={meta.notes}
                onChange={(event) => setMeta({ ...meta, notes: event.target.value })}
                placeholder="Ghi chú báo cáo"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <SoftInput
                multiline
                rows={3}
                value={meta.issues}
                onChange={(event) => setMeta({ ...meta, issues: event.target.value })}
                placeholder="Các vấn đề cần giải quyết ngay"
              />
            </Grid>
          </Grid>
          <SoftButton
            fullWidth
            color="success"
            variant="gradient"
            sx={{ mt: 1.5 }}
            disabled={loading}
            onClick={create}
          >
            <Icon>visibility</Icon>&nbsp;Chốt báo cáo & xem trước PDF
          </SoftButton>
        </>
      )}
      <SoftTypography variant="h6" fontWeight="bold" mt={3} mb={1}>
        Báo cáo đã chốt
      </SoftTypography>
      {saved.map((doc) => (
        <SoftBox
          key={idOf(doc)}
          p={1.25}
          mb={1}
          borderRadius={2}
          sx={{ border: "1px solid #e1e6ee" }}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <SoftBox>
            <SoftTypography variant="button" fontWeight="bold">
              {doc.code}
            </SoftTypography>
            <SoftTypography variant="caption" display="block" color="text">
              {doc.reportDate} · {doc.performerName || "Chưa ghi người thực hiện"}
            </SoftTypography>
          </SoftBox>
          <SoftButton size="small" color="info" onClick={() => exportDoc(doc)} disabled={loading}>
            <Icon>visibility</Icon>&nbsp;Xem PDF
          </SoftButton>
        </SoftBox>
      ))}
      <PrintPreviewDialog
        open={Boolean(printPreview)}
        title={printPreview?.title || "Xem trước báo cáo PDF"}
        html={printPreview?.html || ""}
        onClose={() => setPrintPreview(null)}
      />
    </SoftBox>
  );
}

export default function DailyOperationsV2() {
  const [tab, setTab] = useState(0);
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3} pb={{ xs: 10, md: 3 }}>
        <SoftBox bgcolor="#fff" borderRadius={3} p={{ xs: 1.5, md: 3 }}>
          <SoftBox mb={1.5}>
            <SoftTypography variant="h4" fontWeight="bold">
              Nghiệp vụ trong ngày
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Thao tác tồn xe nhanh và lập biểu mẫu PDF đúng mẫu giấy nội bộ.
            </SoftTypography>
          </SoftBox>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
            <Tab label="Ứng · Hoàn · Chuyển hàng" />
            <Tab label="Báo cáo tổng hợp ngày" />
          </Tabs>
          {tab === 0 ? <QuickTruckOperations /> : <DailyReportTab />}
        </SoftBox>
      </SoftBox>
    </DashboardLayout>
  );
}
