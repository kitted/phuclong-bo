import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftTypography from "components/SoftTypography";
import { DashboardAnalyticsService } from "services/analyticsService";
import EmployeeKpiService from "services/employeeKpiService";
import { InvoiceService } from "services/warehouseService";
import { CreateInvoiceModal } from "layouts/hoa-don";
import { toast } from "react-toastify";
import StaffAccountMenu from "components/StaffAccountMenu";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const number = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || value?.rows || [];
};
const metricValue = (value) =>
  typeof value === "object" && value !== null ? Number(value.value || 0) : Number(value || 0);
const initials = (name = "NV") =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "—");
const formatDateTime = (value) => value ? new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";

const KPI_META = {
  PROMOTION_ACTIVATION_COUNT: { label: "Mã kích hoạt", icon: "confirmation_number", money: false },
  PRODUCT_REVENUE: { label: "Doanh thu sản phẩm", icon: "inventory_2", money: true },
  TOTAL_REVENUE: { label: "Tổng doanh thu", icon: "payments", money: true },
  INVOICE_COUNT: { label: "Số hóa đơn", icon: "receipt_long", money: false },
};

function FeedHeader({ user, subtitle }) {
  const name = user?.fullName || user?.name || user?.username || "Nhân viên";
  return (
    <SoftBox display="flex" alignItems="center" gap={1.25} px={2} pt={1.75} pb={1}>
      <Avatar src={user?.avatar || user?.avatarUrl} sx={{ width: 42, height: 42, bgcolor: "#1877f2" }}>
        {initials(name)}
      </Avatar>
      <SoftBox flex={1} minWidth={0}>
        <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
          {name}
        </SoftTypography>
        <SoftTypography variant="caption" color="text" display="block">
          {subtitle}
        </SoftTypography>
      </SoftBox>
      <IconButton size="small"><Icon>more_horiz</Icon></IconButton>
    </SoftBox>
  );
}

function Stat({ label, value, color = "#1c1e21" }) {
  return (
    <SoftBox flex={1} minWidth={0}>
      <SoftTypography variant="caption" color="text" display="block">{label}</SoftTypography>
      <SoftTypography variant="button" fontWeight="bold" sx={{ color }} noWrap display="block">
        {value}
      </SoftTypography>
    </SoftBox>
  );
}

function KpiDetail({ item, open, onClose }) {
  const progress = item?.progress || {};
  const targets = progress.targets || item?.targets || [];
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={false} PaperProps={{ sx: { borderRadius: { xs: "20px 20px 0 0", sm: 3 }, m: { xs: 0, sm: 2 }, position: { xs: "fixed", sm: "relative" }, bottom: { xs: 0, sm: "auto" }, width: { xs: "100%", sm: "calc(100% - 32px)" } } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between">
          <SoftTypography variant="h6" fontWeight="bold">{item?.name || "Chi tiết KPI"}</SoftTypography>
          <IconButton onClick={onClose}><Icon>close</Icon></IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent>
        <SoftTypography variant="caption" color="text">
          {formatDate(item?.from || item?.startDate)} – {formatDate(item?.to || item?.endDate)}
        </SoftTypography>
        {!targets.length && <SoftTypography variant="button" display="block" py={3}>Chưa có chỉ tiêu chi tiết.</SoftTypography>}
        {targets.map((target, index) => {
          const meta = KPI_META[target.metric] || { label: target.metric || "Chỉ tiêu", money: false };
          const actual = Number(target.actualValue || 0);
          const goal = Number(target.targetValue || 0);
          const percent = Number(target.progressPercent ?? (goal ? (actual / goal) * 100 : 0));
          return (
            <SoftBox key={`${target.metric}-${index}`} py={2} sx={{ borderBottom: "1px solid #edf0f5" }}>
              <SoftBox display="flex" justifyContent="space-between" gap={2} mb={1}>
                <SoftTypography variant="button" fontWeight="bold">{meta.label}</SoftTypography>
                <SoftTypography variant="button" fontWeight="bold" color={percent >= 100 ? "success" : "info"}>{number(percent)}%</SoftTypography>
              </SoftBox>
              <LinearProgress variant="determinate" value={Math.min(percent, 100)} sx={{ height: 9, borderRadius: 9, mb: 1 }} />
              <SoftTypography variant="caption" color="text">
                Đã đạt {meta.money ? money(actual) : number(actual)} / {meta.money ? money(goal) : number(goal)}
              </SoftTypography>
            </SoftBox>
          );
        })}
      </DialogContent>
    </Dialog>
  );
}

export default function StaffHome() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user || {});
  const [loading, setLoading] = useState(true);
  const [saleOpen, setSaleOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [overview, setOverview] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const params = useMemo(() => ({
    period: "MONTH",
    anchor: new Date().toISOString().slice(0, 10),
    compare: "PREVIOUS_PERIOD",
    timezone: "Asia/Ho_Chi_Minh",
  }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        DashboardAnalyticsService.overview(params),
        InvoiceService.getAll({ page: 1, limit: 5, sortBy: "date", sortOrder: "desc" }),
        EmployeeKpiService.getAll({ status: "ACTIVE", page: 1, limit: 20 }),
      ];
      const [overviewResult, invoiceResult, kpiResult] = await Promise.allSettled(requests);
      if (overviewResult.status === "fulfilled") setOverview(unwrap(overviewResult.value) || {});
      if (invoiceResult.status === "fulfilled") setInvoices(listOf(invoiceResult.value));
      const baseKpis = kpiResult.status === "fulfilled" ? listOf(kpiResult.value) : [];
      const detailed = await Promise.all(baseKpis.map(async (kpi) => {
        try {
          const response = await EmployeeKpiService.getProgress(kpi.id || kpi._id);
          return { ...kpi, progress: unwrap(response) || {} };
        } catch (_) {
          return kpi;
        }
      }));
      setKpis(detailed);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tải bảng tin bán hàng");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { load(); }, [load, refreshKey]);
  const name = user?.fullName || user?.name || user?.username || "Nhân viên";
  const sales = overview?.sales || {};
  const netRevenue = metricValue(sales.netRevenue);
  const invoiceCount = metricValue(sales.invoiceCount);
  const collected = metricValue(sales.collectedAmount);
  const credit = metricValue(sales.creditSales);

  return (
    <SoftBox minHeight="100vh" sx={{ bgcolor: "#f0f2f5", pb: { xs: 10, md: 4 } }}>
      <SoftBox maxWidth={720} mx="auto" sx={{ bgcolor: { xs: "#f0f2f5", md: "transparent" }, minHeight: "100vh" }}>
        <SoftBox position="sticky" top={0} zIndex={20} bgcolor="#fff" px={2} py={1.25} sx={{ borderBottom: "1px solid #e4e6eb" }}>
          <SoftBox display="flex" alignItems="center" gap={1.25}>
            <Avatar src={user?.avatar || user?.avatarUrl} sx={{ width: 42, height: 42, bgcolor: "#1877f2" }}>{initials(name)}</Avatar>
            <SoftBox flex={1} minWidth={0}>
              <SoftTypography variant="h6" fontWeight="bold" noWrap>{name}</SoftTypography>
              <SoftTypography variant="caption" color="text">{user?.employeeCode || "Nhân viên kinh doanh"}</SoftTypography>
            </SoftBox>
            <IconButton onClick={() => setRefreshKey((value) => value + 1)} sx={{ bgcolor: "#f0f2f5" }}><Icon>refresh</Icon></IconButton>
            <IconButton onClick={() => setSaleOpen(true)} sx={{ bgcolor: "#f0f2f5" }}><Icon>add</Icon></IconButton>
            <StaffAccountMenu />
          </SoftBox>
        </SoftBox>

        <Card sx={{ borderRadius: 0, boxShadow: "none", mt: { xs: 0, md: 2 }, mb: 1, overflow: "hidden" }}>
          <SoftBox px={2} pt={1.5} display="flex" justifyContent="space-between" alignItems="center">
            <SoftTypography variant="button" fontWeight="bold">KPI của tôi</SoftTypography>
            <SoftTypography variant="caption" color="info">Chạm để xem tiến độ</SoftTypography>
          </SoftBox>
          <SoftBox display="flex" gap={1.25} p={2} pt={1.25} sx={{ overflowX: "auto", scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
            {loading && <SoftBox width="100%" display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></SoftBox>}
            {!loading && !kpis.length && (
              <SoftBox width="100%" p={2} borderRadius={2} bgcolor="#f0f2f5"><SoftTypography variant="button">Bạn chưa có KPI đang hoạt động.</SoftTypography></SoftBox>
            )}
            {kpis.map((kpi, index) => {
              const targets = kpi.progress?.targets || kpi.targets || [];
              const average = targets.length ? targets.reduce((sum, item) => sum + Number(item.progressPercent || 0), 0) / targets.length : Number(kpi.progress?.progressPercent || 0);
              return (
                <SoftBox key={kpi.id || kpi._id || index} onClick={() => setSelectedKpi(kpi)} minWidth={158} height={205} p={1.5} borderRadius={3} color="#fff" display="flex" flexDirection="column" justifyContent="space-between" sx={{ cursor: "pointer", background: index % 2 ? "linear-gradient(145deg,#7b2ff7,#f107a3)" : "linear-gradient(145deg,#1877f2,#42b72a)", boxShadow: "0 4px 14px #0002" }}>
                  <SoftBox width={45} height={45} borderRadius="50%" bgcolor="#fff" color="#1877f2" display="flex" alignItems="center" justifyContent="center"><Icon>flag</Icon></SoftBox>
                  <SoftBox>
                    <SoftTypography variant="h5" color="white" fontWeight="bold">{number(average)}%</SoftTypography>
                    <SoftTypography variant="button" color="white" fontWeight="bold" display="block" sx={{ lineHeight: 1.25 }}>{kpi.name || `KPI ${index + 1}`}</SoftTypography>
                    <SoftTypography variant="caption" color="white">Đến {formatDate(kpi.to || kpi.endDate)}</SoftTypography>
                  </SoftBox>
                </SoftBox>
              );
            })}
          </SoftBox>
        </Card>

        <Card sx={{ borderRadius: 0, boxShadow: "none", mb: 1 }}>
          <FeedHeader user={user} subtitle="Tổng kết bán hàng tháng này" />
          <SoftBox px={2} pb={2}>
            <SoftTypography variant="h4" fontWeight="bold" color="info">{money(netRevenue)}</SoftTypography>
            <SoftTypography variant="caption" color="text">Doanh thu cá nhân trong kỳ hiện tại</SoftTypography>
            <SoftBox display="flex" gap={1.5} mt={2} pt={1.5} sx={{ borderTop: "1px solid #e4e6eb" }}>
              <Stat label="Hóa đơn" value={number(invoiceCount)} />
              <Stat label="Đã thu" value={money(collected)} color="#2e7d32" />
              <Stat label="Ghi nợ" value={money(credit)} color="#d32f2f" />
            </SoftBox>
          </SoftBox>
          <SoftBox display="flex" borderTop="1px solid #e4e6eb">
            <SoftButton fullWidth variant="text" color="dark" onClick={() => navigate("/hoa-don")} startIcon={<Icon>receipt_long</Icon>}>Xem hóa đơn</SoftButton>
            <SoftButton fullWidth variant="text" color="info" onClick={() => setSaleOpen(true)} startIcon={<Icon>add_shopping_cart</Icon>}>Bán ngay</SoftButton>
          </SoftBox>
        </Card>

        <Card sx={{ borderRadius: 0, boxShadow: "none", mb: 1 }}>
          <FeedHeader user={user} subtitle="Hoạt động bán hàng gần đây" />
          <SoftBox px={2} pb={1}>
            <SoftTypography variant="h6" fontWeight="bold">Hóa đơn mới nhất</SoftTypography>
            {!invoices.length && <SoftTypography variant="button" color="text" display="block" py={2}>Chưa có hóa đơn trong kỳ.</SoftTypography>}
            {invoices.map((invoice, index) => (
              <SoftBox key={invoice.id || invoice._id || index} py={1.5} display="flex" alignItems="center" gap={1.25} sx={{ borderBottom: index === invoices.length - 1 ? 0 : "1px solid #edf0f5", cursor: "pointer" }} onClick={() => navigate(`/hoa-don?search=${encodeURIComponent(invoice.code || "")}`)}>
                <SoftBox width={42} height={42} borderRadius="50%" bgcolor="#e7f3ff" color="#1877f2" display="flex" alignItems="center" justifyContent="center" flexShrink={0}><Icon>receipt</Icon></SoftBox>
                <SoftBox flex={1} minWidth={0}>
                  <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>{invoice.code || "Hóa đơn"} · {invoice.customerName || invoice.customer?.name || "Khách lẻ"}</SoftTypography>
                  <SoftTypography variant="caption" color="text">{formatDateTime(invoice.createdAt || invoice.date)} · {invoice.paymentStatus === "PAID" ? "Đã thanh toán" : invoice.paymentStatus === "PARTIAL" ? "Thanh toán một phần" : "Cộng công nợ"}</SoftTypography>
                </SoftBox>
                <SoftTypography variant="button" fontWeight="bold">{money(invoice.grandTotal ?? invoice.totalAmount)}</SoftTypography>
              </SoftBox>
            ))}
          </SoftBox>
          <SoftButton variant="text" color="info" fullWidth onClick={() => navigate("/hoa-don")}>Xem tất cả hoạt động</SoftButton>
        </Card>
      </SoftBox>

      <SoftButton onClick={() => setSaleOpen(true)} variant="gradient" color="success" sx={{ position: "fixed", right: { xs: 16, md: 30 }, bottom: { xs: 78, md: 30 }, zIndex: 35, minWidth: 0, width: 58, height: 58, borderRadius: "50%", p: 0, boxShadow: "0 6px 20px #2e7d3260" }}><Icon sx={{ fontSize: "28px !important" }}>add_shopping_cart</Icon></SoftButton>
      <CreateInvoiceModal open={saleOpen} onClose={() => setSaleOpen(false)} onCreated={() => { setSaleOpen(false); setRefreshKey((value) => value + 1); }} />
      <KpiDetail item={selectedKpi} open={Boolean(selectedKpi)} onClose={() => setSelectedKpi(null)} />
    </SoftBox>
  );
}
