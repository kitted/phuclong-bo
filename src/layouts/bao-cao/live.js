import { useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { ReportsService } from "services/analyticsService";
import { downloadBlob } from "utils/excel";
import { toast } from "react-toastify";
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
  const [exporting, setExporting] = useState(false);
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
  useEffect(() => {
    if (period === "WEEK" || period === "MONTH") setGranularity("DAY");
    else setGranularity("MONTH");
  }, [period]);
  useEffect(() => {
    if (params.period === "CUSTOM" && (!params.from || !params.to)) return;
    let active = true;
    setLoading(true);
    Promise.all([
      ReportsService.overview(params),
      ReportsService.salesTrend(params),
      ReportsService[endpointByTab[tab]](params),
    ])
      .then(([overviewResponse, trendResponse, reportResponse]) => {
        if (!active) return;
        setOverview(overviewResponse.data?.data || {});
        setTrend(trendResponse.data?.data || []);
        const body = reportResponse.data || {};
        setReport(body.data || body);
      })
      .catch(
        (error) => active && toast.error(error.response?.data?.message || "Không thể tải báo cáo")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params, tab]);
  const exportReport = async () => {
    try {
      setExporting(true);
      const response = await ReportsService.export({ ...params, report: tab });
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
            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </SoftButton>
        </SoftBox>
        <Card>
          <SoftBox p={2.5} display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
                {[
                  ["WEEK", "Theo tuần"],
                  ["MONTH", "Theo tháng"],
                  ["QUARTER", "Theo quý"],
                  ["YEAR", "Theo năm"],
                  ["CUSTOM", "Tùy chỉnh"],
                ].map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {period !== "CUSTOM" ? (
              <SoftBox width={165}>
                <SoftInput
                  type="date"
                  value={anchor}
                  onChange={(event) => setAnchor(event.target.value)}
                />
              </SoftBox>
            ) : (
              <>
                <SoftBox width={160}>
                  <SoftInput
                    type="date"
                    value={custom.from}
                    onChange={(event) => setCustom({ ...custom, from: event.target.value })}
                  />
                </SoftBox>
                <SoftBox width={160}>
                  <SoftInput
                    type="date"
                    value={custom.to}
                    onChange={(event) => setCustom({ ...custom, to: event.target.value })}
                  />
                </SoftBox>
              </>
            )}
            <FormControl size="small" sx={{ minWidth: 145 }}>
              <Select value={granularity} onChange={(event) => setGranularity(event.target.value)}>
                <MenuItem value="DAY">Theo ngày</MenuItem>
                <MenuItem value="WEEK">Theo tuần</MenuItem>
                <MenuItem value="MONTH">Theo tháng</MenuItem>
              </Select>
            </FormControl>
          </SoftBox>
        </Card>
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
        <Card sx={{ mt: 3 }}>
          <SoftBox px={2} pt={1} sx={{ overflowX: "auto" }}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              sx={{ minWidth: 900, "& .MuiTabs-flexContainer": { flexWrap: "nowrap" } }}
            >
              {Object.entries(tabLabels).map(([value, label]) => (
                <Tab key={value} value={value} label={label} />
              ))}
            </Tabs>
          </SoftBox>
          <SoftBox p={3}>
            {report.summary && <SummaryCards summary={report.summary} />}
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
              <SoftTypography variant="h6" fontWeight="bold" mb={1.5}>
                Dữ liệu chi tiết
              </SoftTypography>
              <GenericTable rows={detailRows} />
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>
    </DashboardLayout>
  );
}
