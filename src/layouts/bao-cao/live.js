import { useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import MobileLoadMore from "components/MobileLoadMore";
import { ReportsService } from "services/analyticsService";
import { downloadBlob } from "utils/excel";
import { toast } from "react-toastify";
import { mergeUniqueItems } from "utils/infiniteList";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);
const moneyKeys = /revenue|amount|value|debt|cogs|profit|cash|cost|collected/i;
const percentKeys = /percent|margin|roi/i;
const labels = {
  invoiceCount: "Số hóa đơn",
  grossRevenue: "Doanh thu gộp",
  discountAmount: "Chiết khấu",
  netRevenue: "Doanh thu thuần",
  cogs: "Giá vốn",
  grossProfit: "Lợi nhuận gộp",
  grossMarginPercent: "Tỷ suất lợi nhuận",
  cash: "Tiền mặt",
  bankTransfer: "Chuyển khoản",
  creditSales: "Bán chịu",
  debtCollected: "Thu công nợ",
  totalCashIn: "Tổng dòng tiền vào",
  openingDebt: "Công nợ đầu kỳ",
  closingDebt: "Công nợ cuối kỳ",
  currentOutstandingDebt: "Công nợ hiện tại",
  warningCustomers: "Khách cảnh báo",
  warehouseQuantity: "Tồn kho",
  warehouseValue: "Giá trị tồn",
  importCount: "Số phiếu nhập",
  importValue: "Giá trị nhập",
  totalTrucks: "Tổng xe",
  activeTrucks: "Xe hoạt động",
  truckRevenue: "Doanh thu xe",
  totalCustomers: "Tổng khách",
  newCustomers: "Khách mới",
  returningCustomers: "Khách quay lại",
  customersWithInvoices: "Khách có mua hàng",
  customersWithoutInvoices: "Khách không mua hàng",
  customerCode: "Mã khách hàng",
  customerName: "Tên khách hàng",
  phone: "Số điện thoại",
  purchaseStatus: "Tình trạng mua hàng",
  purchaseAmount: "Tiền hàng đã mua",
  debtAddedAmount: "Công nợ cộng thêm",
  cashPaidAmount: "Tiền mặt đã trả",
  activePrograms: "CTKM đang chạy",
  activeActivationCodes: "Mã kích hoạt",
  promotionRevenue: "Doanh thu khuyến mãi",
  promotionCost: "Chi phí khuyến mãi",
  activeEmployees: "Nhân viên active",
  activeKpis: "KPI đang chạy",
  completedKpis: "KPI hoàn thành",
};
const format = (key, value) => {
  const raw = typeof value === "object" && value !== null ? value.value : value;
  if (percentKeys.test(key)) return `${Number(raw || 0).toLocaleString("vi-VN")}%`;
  if (moneyKeys.test(key))
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number(raw) || 0);
  return Number(raw || 0).toLocaleString("vi-VN");
};
const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
const monthRange = (anchorValue) => {
  const [year, month] = String(anchorValue || "")
    .slice(0, 7)
    .split("-")
    .map(Number);
  if (!year || !month) return { from: "", to: "" };
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};
const endpointByTab = {
  SALES: "sales",
  PAYMENTS: "payments",
  DEBT: "debt",
  PRODUCTS: "products",
  INVENTORY: "inventory",
  TRUCKS: "trucks",
  CUSTOMERS: "customers",
  PROMOTIONS: "promotions",
  EMPLOYEES: "employees",
};
const tabLabels = {
  SALES: "Doanh thu",
  PAYMENTS: "Thanh toán",
  DEBT: "Công nợ",
  PRODUCTS: "Sản phẩm",
  INVENTORY: "Kho & nhập",
  TRUCKS: "Xe tải",
  CUSTOMERS: "Khách hàng",
  PROMOTIONS: "Khuyến mãi",
  EMPLOYEES: "Nhân viên",
};
const tabIcons = {
  SALES: "paid",
  PAYMENTS: "payments",
  DEBT: "account_balance_wallet",
  PRODUCTS: "inventory_2",
  INVENTORY: "warehouse",
  TRUCKS: "local_shipping",
  CUSTOMERS: "groups",
  PROMOTIONS: "redeem",
  EMPLOYEES: "badge",
};
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" } },
  scales: { y: { beginAtZero: true } },
};

function SummaryCards({ summary }) {
  const rows = Object.entries(summary || {}).filter(
    ([, value]) => typeof value === "number" || typeof value?.value === "number"
  );
  return (
    <Grid container spacing={2}>
      {rows.slice(0, 12).map(([key, value]) => (
        <Grid item xs={12} sm={6} lg={3} key={key}>
          <Card sx={{ height: "100%" }}>
            <SoftBox p={2}>
              <SoftTypography variant="caption" color="text">
                {labels[key] || key}
              </SoftTypography>
              <SoftTypography variant="h6" fontWeight="bold">
                {format(key, value)}
              </SoftTypography>
              {value?.changePercent !== undefined && (
                <SoftTypography
                  variant="caption"
                  color={
                    value.trend === "UP"
                      ? value.direction === "NEGATIVE"
                        ? "error"
                        : "success"
                      : "text"
                  }
                >
                  {value.trend === "UP" ? "▲" : value.trend === "DOWN" ? "▼" : "•"}{" "}
                  {Math.abs(value.changePercent)}%
                </SoftTypography>
              )}
            </SoftBox>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
function GenericTable({ rows }) {
  if (!rows?.length)
    return (
      <SoftTypography variant="caption" color="text">
        Chưa có dữ liệu chi tiết.
      </SoftTypography>
    );
  const keys = Object.keys(rows[0])
    .filter((key) => typeof rows[0][key] !== "object")
    .slice(0, 8);
  return (
    <SoftBox sx={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8F9FA" }}>
            {keys.map((key) => (
              <th
                key={key}
                style={{ padding: 10, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}
              >
                {labels[key] || key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((row, index) => (
            <tr
              key={row.id || row.productId || row.employeeId || index}
              style={{ borderBottom: "1px solid #eee" }}
            >
              {keys.map((key) => (
                <td key={key} style={{ padding: 10, fontSize: 13, whiteSpace: "nowrap" }}>
                  {typeof row[key] === "number" ? format(key, row[key]) : String(row[key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SoftBox>
  );
}

function CustomerActivityTable({ rows = [] }) {
  if (!rows.length)
    return (
      <SoftBox py={5} textAlign="center">
        <Icon sx={{ color: "#b0bec5", fontSize: 44 }}>groups</Icon>
        <SoftTypography variant="button" color="text" display="block" mt={1}>
          Không có khách hàng phù hợp với bộ lọc.
        </SoftTypography>
      </SoftBox>
    );

  return (
    <SoftBox sx={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F4F7FB" }}>
            {[
              "STT",
              "Khách hàng",
              "Tình trạng",
              "Số hóa đơn",
              "Tiền hàng đã mua",
              "Công nợ cộng thêm",
              "Tiền mặt đã trả",
            ].map((label) => (
              <th key={label} style={{ padding: "12px 10px", textAlign: "left", fontSize: 12 }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const purchased =
              row.hasPurchased === true ||
              row.purchaseStatus === "PURCHASED" ||
              Number(row.invoiceCount || 0) > 0;
            return (
              <tr
                key={row.customerId || row.id || `${row.customerCode || "customer"}-${index}`}
                style={{ borderBottom: "1px solid #e9edf2" }}
              >
                <td style={{ padding: 12, fontSize: 13 }}>{row.rowNumber || index + 1}</td>
                <td style={{ padding: 12, minWidth: 270 }}>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {[row.customerCode || "Chưa có mã", row.customerName || row.name]
                      .filter(Boolean)
                      .join(" · ")}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {row.phone || row.customerPhone || "Chưa có số điện thoại"}
                  </SoftTypography>
                </td>
                <td style={{ padding: 12 }}>
                  <SoftBox
                    component="span"
                    px={1.1}
                    py={0.55}
                    borderRadius={2}
                    bgcolor={purchased ? "#E8F5E9" : "#F1F3F5"}
                    color={purchased ? "#2E7D32" : "#616161"}
                    sx={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
                  >
                    {purchased ? "Có mua hàng" : "Không mua hàng"}
                  </SoftBox>
                </td>
                <td style={{ padding: 12, fontSize: 13, fontWeight: 700 }}>
                  {Number(row.invoiceCount || 0).toLocaleString("vi-VN")}
                </td>
                <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: "#1565C0" }}>
                  {format("purchaseAmount", row.purchaseAmount || 0)}
                </td>
                <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: "#C62828" }}>
                  {format("debtAddedAmount", row.debtAddedAmount || 0)}
                </td>
                <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: "#2E7D32" }}>
                  {format("cashPaidAmount", row.cashPaidAmount || 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SoftBox>
  );
}

export default function ReportsLive() {
  const [tab, setTab] = useState("SALES");
  const [period, setPeriod] = useState("MONTH");
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [granularity, setGranularity] = useState("DAY");
  const [overview, setOverview] = useState({});
  const [trend, setTrend] = useState([]);
  const [report, setReport] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [customerPurchaseStatus, setCustomerPurchaseStatus] = useState("ALL");
  const [customerSearchInput, setCustomerSearchInput] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(1);
  const params = useMemo(
    () => ({
      period,
      anchor,
      compare: "PREVIOUS_PERIOD",
      granularity,
      timezone: "Asia/Ho_Chi_Minh",
      ...(period === "CUSTOM"
        ? { from: custom.from || undefined, to: custom.to || undefined }
        : {}),
    }),
    [period, anchor, custom, granularity]
  );
  const reportParams = useMemo(
    () =>
      tab === "CUSTOMERS"
        ? {
            ...params,
            purchaseStatus: customerPurchaseStatus,
            search: customerSearch || undefined,
            page: customerPage,
            limit: 20,
          }
        : params,
    [params, tab, customerPurchaseStatus, customerSearch, customerPage]
  );
  useEffect(() => {
    if (period === "WEEK" || period === "MONTH") setGranularity("DAY");
    else setGranularity("MONTH");
  }, [period]);
  useEffect(() => {
    const timer = window.setTimeout(() => setCustomerSearch(customerSearchInput.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [customerSearchInput]);
  useEffect(() => {
    setCustomerPage(1);
  }, [period, anchor, custom.from, custom.to, customerPurchaseStatus, customerSearch]);
  useEffect(() => {
    if (params.period === "CUSTOM" && (!params.from || !params.to)) return;
    let active = true;
    const appendingCustomers = tab === "CUSTOMERS" && customerPage > 1;
    if (appendingCustomers) setLoadingMore(true);
    else setLoading(true);
    Promise.all([
      ReportsService.overview(params),
      ReportsService.salesTrend(params),
      ReportsService[endpointByTab[tab]](reportParams),
    ])
      .then(([overviewResponse, trendResponse, reportResponse]) => {
        if (!active) return;
        setOverview(overviewResponse.data?.data || {});
        setTrend(trendResponse.data?.data || []);
        const body = reportResponse.data || {};
        const nextReport = body.data || body;
        setReport((current) => {
          if (!appendingCustomers) return nextReport;
          const currentRows = Array.isArray(current?.data) ? current.data : [];
          const nextRows = Array.isArray(nextReport?.data) ? nextReport.data : [];
          return {
            ...nextReport,
            data: mergeUniqueItems(currentRows, nextRows, (item, index) =>
              String(item?.customerId || item?.id || item?._id || item?.customerCode || index)
            ),
          };
        });
      })
      .catch(
        (error) => active && toast.error(error.response?.data?.message || "Không thể tải báo cáo")
      )
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLoadingMore(false);
      });
    return () => {
      active = false;
    };
  }, [params, reportParams, tab, customerPage]);
  const changePeriod = (nextPeriod) => {
    if (nextPeriod === "CUSTOM" && (!custom.from || !custom.to)) {
      setCustom(monthRange(anchor));
    }
    setPeriod(nextPeriod);
  };
  const exportReport = async () => {
    try {
      setExporting(true);
      const exportParams =
        tab === "CUSTOMERS"
          ? {
              ...params,
              report: tab,
              purchaseStatus: customerPurchaseStatus,
              search: customerSearch || undefined,
            }
          : { ...params, report: tab };
      const response = await ReportsService.export(exportParams);
      downloadBlob(
        response.data,
        `bao-cao-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xuất báo cáo");
    } finally {
      setExporting(false);
    }
  };
  const seriesChart = {
    labels: trend.map((item) => item.label),
    datasets: [
      {
        label: "Doanh thu",
        data: trend.map((item) => item.netRevenue),
        borderColor: "#2E7D32",
        backgroundColor: "#2E7D3220",
        fill: true,
        tension: 0.35,
      },
      {
        label: "Đã thu",
        data: trend.map((item) => item.collectedAmount),
        borderColor: "#1565C0",
        tension: 0.35,
      },
      {
        label: "Lợi nhuận",
        data: trend.map((item) => item.grossProfit),
        borderColor: "#7B1FA2",
        tension: 0.35,
      },
    ],
  };
  const breakdownEntries = Object.entries(report.breakdowns || {}).filter(
    ([, value]) => value && typeof value === "object"
  );
  const detailRows = Array.isArray(report) ? report : report.topItems || report.data || [];
  const customerMeta = report.meta || {};
  const customerSummary = report.summary || {};
  const customerMetricSummary = Object.fromEntries(
    Object.entries(customerSummary).filter(
      ([key]) =>
        !["totalCustomers", "customersWithInvoices", "customersWithoutInvoices"].includes(key)
    )
  );
  const customerPeriodLabel = report.period
    ? `${shortDate(report.period.from)} - ${shortDate(report.period.to)}`
    : "Đang xác định khoảng thời gian";
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
          flexWrap="wrap"
          mb={3}
        >
          <SoftBox>
            <SoftTypography variant="h4" fontWeight="bold">
              Báo cáo quản trị
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Tuần · tháng · quý · năm · dữ liệu thực
            </SoftTypography>
          </SoftBox>
          <SoftButton
            variant="gradient"
            color="success"
            startIcon={<Icon>download</Icon>}
            disabled={exporting}
            onClick={exportReport}
          >
            {exporting
              ? "Đang xuất..."
              : tab === "CUSTOMERS"
              ? "Xuất danh sách khách hàng"
              : "Xuất Excel"}
          </SoftButton>
        </SoftBox>
        <Card>
          <SoftBox
            px={1.5}
            py={1.25}
            display="flex"
            gap={1}
            sx={{ overflowX: "auto", scrollbarWidth: "thin" }}
          >
            {Object.entries(tabLabels).map(([value, label]) => {
              const selected = tab === value;
              return (
                <SoftBox
                  key={value}
                  component="button"
                  type="button"
                  onClick={() => setTab(value)}
                  px={1.75}
                  py={1.1}
                  borderRadius={2}
                  display="flex"
                  alignItems="center"
                  gap={0.75}
                  flexShrink={0}
                  bgcolor={selected ? "#E3F2FD" : "transparent"}
                  sx={{
                    border: `1.5px solid ${selected ? "#1976D2" : "transparent"}`,
                    color: selected ? "#1565C0" : "#67748E",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: selected ? 700 : 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon sx={{ fontSize: 19 }}>{tabIcons[value]}</Icon>
                  {label}
                </SoftBox>
              );
            })}
          </SoftBox>
        </Card>
        <Card sx={{ mt: 2 }}>
          <SoftBox p={2.5}>
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1.5}>
              {tab === "CUSTOMERS" ? "1. Chọn thời gian báo cáo" : "Chọn thời gian báo cáo"}
            </SoftTypography>
            <SoftBox display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
              <SoftBox width="100%">
                <SoftTypography variant="caption" color="text" display="block" mb={0.5}>
                  Loại kỳ báo cáo
                </SoftTypography>
                <SoftBox display="flex" gap={1} flexWrap="wrap">
                  {[
                    ["WEEK", "Tuần", "date_range"],
                    ["MONTH", "Tháng", "calendar_month"],
                    ["QUARTER", "Quý", "view_week"],
                    ["YEAR", "Năm", "event"],
                    ["CUSTOM", "Từ ngày - đến ngày", "edit_calendar"],
                  ].map(([value, label, icon]) => {
                    const selected = period === value;
                    return (
                      <SoftBox
                        key={value}
                        component="button"
                        type="button"
                        onClick={() => changePeriod(value)}
                        px={1.5}
                        py={1}
                        borderRadius={2}
                        display="flex"
                        alignItems="center"
                        gap={0.75}
                        bgcolor={selected ? "#E3F2FD" : "#fff"}
                        sx={{
                          border: `1.5px solid ${selected ? "#1976D2" : "#dfe4ea"}`,
                          color: selected ? "#1565C0" : "#67748E",
                          cursor: "pointer",
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        <Icon sx={{ fontSize: 18 }}>{icon}</Icon>
                        {label}
                      </SoftBox>
                    );
                  })}
                </SoftBox>
              </SoftBox>
              {period !== "CUSTOM" ? (
                <SoftBox width={180}>
                  <SoftTypography variant="caption" color="text" display="block" mb={0.5}>
                    {period === "MONTH"
                      ? "Chọn tháng"
                      : period === "WEEK"
                      ? "Chọn ngày trong tuần"
                      : period === "QUARTER"
                      ? "Chọn ngày trong quý"
                      : "Chọn ngày trong năm"}
                  </SoftTypography>
                  <SoftInput
                    type={period === "MONTH" ? "month" : "date"}
                    value={period === "MONTH" ? anchor.slice(0, 7) : anchor}
                    onChange={(event) =>
                      setAnchor(
                        period === "MONTH" ? `${event.target.value}-01` : event.target.value
                      )
                    }
                  />
                </SoftBox>
              ) : (
                <>
                  <SoftBox width={180}>
                    <SoftTypography variant="caption" color="text" display="block" mb={0.5}>
                      Từ ngày
                    </SoftTypography>
                    <SoftInput
                      type="date"
                      value={custom.from}
                      onChange={(event) => setCustom({ ...custom, from: event.target.value })}
                    />
                  </SoftBox>
                  <SoftBox width={180}>
                    <SoftTypography variant="caption" color="text" display="block" mb={0.5}>
                      Đến ngày
                    </SoftTypography>
                    <SoftInput
                      type="date"
                      value={custom.to}
                      onChange={(event) => setCustom({ ...custom, to: event.target.value })}
                    />
                  </SoftBox>
                </>
              )}
              {tab !== "CUSTOMERS" && (
                <SoftBox minWidth={155}>
                  <SoftTypography variant="caption" color="text" display="block" mb={0.5}>
                    Nhóm biểu đồ
                  </SoftTypography>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={granularity}
                      onChange={(event) => setGranularity(event.target.value)}
                    >
                      <MenuItem value="DAY">Theo ngày</MenuItem>
                      <MenuItem value="WEEK">Theo tuần</MenuItem>
                      <MenuItem value="MONTH">Theo tháng</MenuItem>
                    </Select>
                  </FormControl>
                </SoftBox>
              )}
            </SoftBox>
          </SoftBox>
        </Card>
        {tab !== "CUSTOMERS" && (
          <>
            <SoftBox mt={3}>
              <SummaryCards summary={overview.summary} />
            </SoftBox>
            <Card sx={{ mt: 3 }}>
              <SoftBox p={3} height={380}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Xu hướng doanh thu và dòng tiền
                </SoftTypography>
                {loading ? (
                  <SoftTypography variant="button">Đang tải...</SoftTypography>
                ) : (
                  <Line data={seriesChart} options={chartOptions} />
                )}
              </SoftBox>
            </Card>
          </>
        )}
        <Card sx={{ mt: 3 }}>
          <SoftBox p={{ xs: 2, md: 3 }}>
            {tab === "CUSTOMERS" && (
              <SoftBox mb={3}>
                <SoftBox mb={2}>
                  <SoftTypography variant="h5" fontWeight="bold">
                    2. Chọn nhóm khách hàng
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {customerPeriodLabel} · Chạm vào một thẻ để lọc danh sách
                  </SoftTypography>
                </SoftBox>
                <Grid container spacing={1.5}>
                  {[
                    [
                      "ALL",
                      "Tất cả khách hàng",
                      customerSummary.totalCustomers,
                      "#1565C0",
                      "#E3F2FD",
                    ],
                    [
                      "PURCHASED",
                      "Có mua hàng",
                      customerSummary.customersWithInvoices,
                      "#2E7D32",
                      "#E8F5E9",
                    ],
                    [
                      "NOT_PURCHASED",
                      "Không mua hàng",
                      customerSummary.customersWithoutInvoices,
                      "#616161",
                      "#F1F3F5",
                    ],
                  ].map(([value, label, count, color, background]) => {
                    const selected = customerPurchaseStatus === value;
                    return (
                      <Grid item xs={12} sm={4} key={value}>
                        <SoftBox
                          component="button"
                          type="button"
                          onClick={() => setCustomerPurchaseStatus(value)}
                          width="100%"
                          p={1.5}
                          borderRadius={2}
                          textAlign="left"
                          bgcolor={selected ? background : "#fff"}
                          sx={{
                            cursor: "pointer",
                            border: `2px solid ${selected ? color : "#e4e8ed"}`,
                            transition: "all 160ms ease",
                          }}
                        >
                          <SoftBox
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <SoftBox>
                              <SoftTypography
                                variant="button"
                                fontWeight="bold"
                                display="block"
                                sx={{ color: selected ? color : "#344767" }}
                              >
                                {label}
                              </SoftTypography>
                              <SoftTypography variant="h6" fontWeight="bold" sx={{ color }}>
                                {count === undefined ? "—" : Number(count).toLocaleString("vi-VN")}
                              </SoftTypography>
                            </SoftBox>
                            <Icon sx={{ color: selected ? color : "#cfd5dc", fontSize: 26 }}>
                              {selected ? "check_circle" : "radio_button_unchecked"}
                            </Icon>
                          </SoftBox>
                        </SoftBox>
                      </Grid>
                    );
                  })}
                </Grid>
              </SoftBox>
            )}
            {report.summary && (
              <SummaryCards
                summary={tab === "CUSTOMERS" ? customerMetricSummary : report.summary}
              />
            )}
            {report.summary?.ledgerCoverageNotice && (
              <SoftBox mt={2} p={2} bgcolor="#FFF3E0" borderRadius={2}>
                <SoftTypography variant="caption" color="warning">
                  ⚠ {report.summary.ledgerCoverageNotice}
                </SoftTypography>
              </SoftBox>
            )}
            {breakdownEntries.length > 0 && (
              <Grid container spacing={3} mt={0}>
                {breakdownEntries.map(([key, values]) => {
                  const entries = Object.entries(values);
                  const chart = {
                    labels: entries.map(([label]) => label),
                    datasets: [
                      {
                        label: labels[key] || key,
                        data: entries.map(([, value]) => value),
                        backgroundColor: ["#1565C0", "#2E7D32", "#E65100", "#7B1FA2", "#C62828"],
                      },
                    ],
                  };
                  return (
                    <Grid item xs={12} lg={6} key={key}>
                      <SoftBox height={300}>
                        <SoftTypography variant="button" fontWeight="bold">
                          {labels[key] || key}
                        </SoftTypography>
                        <Bar data={chart} options={chartOptions} />
                      </SoftBox>
                    </Grid>
                  );
                })}
              </Grid>
            )}
            <SoftBox mt={3}>
              {tab === "CUSTOMERS" ? (
                <SoftBox
                  display="flex"
                  justifyContent="space-between"
                  alignItems={{ xs: "stretch", md: "flex-end" }}
                  flexDirection={{ xs: "column", md: "row" }}
                  gap={1.5}
                  mb={2}
                >
                  <SoftBox>
                    <SoftTypography variant="h5" fontWeight="bold">
                      3. Tìm và xem khách hàng
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {Number(customerMeta.totalItems || 0).toLocaleString("vi-VN")} khách hàng phù
                      hợp
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox width={{ xs: "100%", md: 380 }}>
                    <SoftInput
                      value={customerSearchInput}
                      onChange={(event) => setCustomerSearchInput(event.target.value)}
                      placeholder="Nhập mã, tên hoặc số điện thoại..."
                      icon={{ component: "search", direction: "left" }}
                    />
                  </SoftBox>
                </SoftBox>
              ) : (
                <SoftTypography variant="h6" fontWeight="bold" mb={1.5}>
                  Dữ liệu chi tiết
                </SoftTypography>
              )}
              {loading ? (
                <SoftBox py={4} textAlign="center">
                  <SoftTypography variant="button" color="text">
                    Đang tải dữ liệu báo cáo...
                  </SoftTypography>
                </SoftBox>
              ) : tab === "CUSTOMERS" ? (
                <CustomerActivityTable rows={detailRows} />
              ) : (
                <GenericTable rows={detailRows} />
              )}
              {tab === "CUSTOMERS" && (
                <MobileLoadMore
                  loading={loadingMore}
                  hasMore={customerPage < Number(customerMeta.totalPages || 1)}
                  onLoadMore={() => setCustomerPage((value) => value + 1)}
                />
              )}
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>
    </DashboardLayout>
  );
}
