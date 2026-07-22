import { useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { useSelector } from "react-redux";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { DashboardAnalyticsService } from "services/analyticsService";
import { toast } from "react-toastify";
import { Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
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
  ArcElement,
  Tooltip,
  Legend,
  Filler
);
const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const number = (value) => Number(value || 0).toLocaleString("vi-VN");
const metricValue = (value) => (typeof value === "object" && value !== null ? value.value : value);
const metric = (value, isMoney = false) =>
  isMoney ? money(metricValue(value)) : number(metricValue(value));
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" } },
  scales: { y: { beginAtZero: true } },
};

function Kpi({ title, value, icon, color, change }) {
  const positive =
    change?.direction === "NEGATIVE" ? change?.trend === "DOWN" : change?.trend === "UP";
  return (
    <Card sx={{ height: "100%" }}>
      <SoftBox p={2.25} display="flex" gap={1.5} alignItems="center">
        <SoftBox
          width={46}
          height={46}
          borderRadius={2}
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ background: `${color}18` }}
        >
          <Icon sx={{ color }}>{icon}</Icon>
        </SoftBox>
        <SoftBox flex={1}>
          <SoftTypography variant="caption" color="text">
            {title}
          </SoftTypography>
          <SoftTypography variant="h6" fontWeight="bold">
            {value}
          </SoftTypography>
          {change?.changePercent !== undefined && (
            <SoftTypography
              variant="caption"
              color={positive ? "success" : change.trend === "FLAT" ? "text" : "error"}
            >
              {change.trend === "UP" ? "▲" : change.trend === "DOWN" ? "▼" : "•"}{" "}
              {Math.abs(change.changePercent)}% so với kỳ trước
            </SoftTypography>
          )}
        </SoftBox>
      </SoftBox>
    </Card>
  );
}
function MiniList({ title, rows, render }) {
  return (
    <Card sx={{ height: "100%" }}>
      <SoftBox p={2.5}>
        <SoftTypography variant="h6" fontWeight="bold" mb={1.5}>
          {title}
        </SoftTypography>
        {!rows?.length && (
          <SoftTypography variant="caption" color="text">
            Chưa có dữ liệu
          </SoftTypography>
        )}
        {(rows || []).slice(0, 10).map((row, index) => (
          <SoftBox
            key={row.id || row.productId || row.customerId || row.employeeId || index}
            py={1}
            sx={{ borderBottom: "1px solid #eee" }}
          >
            {render(row, index)}
          </SoftBox>
        ))}
      </SoftBox>
    </Card>
  );
}

export default function DashboardLive() {
  const role = useSelector((state) => state.auth?.user?.role);
  const isAdmin = String(role || "").toLowerCase() === "admin";
  const [period, setPeriod] = useState("MONTH");
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const params = useMemo(
    () => ({
      period,
      anchor,
      compare: "PREVIOUS_PERIOD",
      timezone: "Asia/Ho_Chi_Minh",
      ...(period === "CUSTOM"
        ? { from: custom.from || undefined, to: custom.to || undefined }
        : {}),
    }),
    [period, anchor, custom]
  );
  useEffect(() => {
    if (params.period === "CUSTOM" && (!params.from || !params.to)) return;
    let active = true;
    setLoading(true);
    const requests = {
      overview: DashboardAnalyticsService.overview(params),
      trend: DashboardAnalyticsService.salesTrend(params),
      alerts: DashboardAnalyticsService.inventoryAlerts({
        ...params,
        type: "LOW_STOCK",
        limit: 10,
      }),
      products: DashboardAnalyticsService.topProducts({ ...params, limit: 10 }),
      trucks: DashboardAnalyticsService.trucks({ ...params, limit: 10 }),
      customers: DashboardAnalyticsService.customers(params),
      promotions: DashboardAnalyticsService.promotions(params),
      employees: DashboardAnalyticsService.employees({ ...params, limit: 10 }),
    };
    if (isAdmin) {
      requests.debt = DashboardAnalyticsService.debtSummary(params);
      requests.health = DashboardAnalyticsService.systemHealth(params);
    }
    Promise.all(Object.entries(requests).map(async ([key, request]) => [key, (await request).data]))
      .then((entries) => active && setData(Object.fromEntries(entries)))
      .catch(
        (error) => active && toast.error(error.response?.data?.message || "Không thể tải Dashboard")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params, isAdmin]);
  const sales = data.overview?.data?.sales || {};
  const inventory = data.overview?.data?.inventory || {};
  const trend = data.trend?.data || [];
  const debt = data.debt?.data || {};
  const trucks = data.trucks?.data || {};
  const customers = data.customers?.data || {};
  const promotions = data.promotions?.data || {};
  const employees = data.employees?.data || {};
  const health = data.health?.data || {};
  const trendChart = {
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
        label: "Bán chịu",
        data: trend.map((item) => item.creditSales),
        borderColor: "#C62828",
        tension: 0.35,
      },
    ],
  };
  const paymentChart = {
    labels: ["Đã thu", "Bán chịu"],
    datasets: [
      {
        data: [metricValue(sales.collectedAmount), metricValue(sales.creditSales)],
        backgroundColor: ["#43A047", "#EF5350"],
      },
    ],
  };
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
              Tổng quan vận hành
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Dữ liệu thật ·{" "}
              {data.overview?.data?.period?.from
                ? `${new Date(data.overview.data.period.from).toLocaleDateString(
                    "vi-VN"
                  )} – ${new Date(data.overview.data.period.to).toLocaleDateString("vi-VN")}`
                : "Đang xác định kỳ"}
            </SoftTypography>
          </SoftBox>
          <SoftBox display="flex" gap={1}>
            <FormControl size="small" sx={{ minWidth: 145 }}>
              <Select value={period} onChange={(event) => setPeriod(event.target.value)}>
                {[
                  ["WEEK", "Tuần"],
                  ["MONTH", "Tháng"],
                  ["QUARTER", "Quý"],
                  ["YEAR", "Năm"],
                  ["CUSTOM", "Tùy chỉnh"],
                ].map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {period !== "CUSTOM" ? (
              <SoftBox width={160}>
                <SoftInput
                  type="date"
                  value={anchor}
                  onChange={(event) => setAnchor(event.target.value)}
                />
              </SoftBox>
            ) : (
              <>
                <SoftBox width={155}>
                  <SoftInput
                    type="date"
                    value={custom.from}
                    onChange={(event) => setCustom({ ...custom, from: event.target.value })}
                  />
                </SoftBox>
                <SoftBox width={155}>
                  <SoftInput
                    type="date"
                    value={custom.to}
                    onChange={(event) => setCustom({ ...custom, to: event.target.value })}
                  />
                </SoftBox>
              </>
            )}
          </SoftBox>
        </SoftBox>
        {loading && (
          <SoftTypography variant="button" display="block" mb={2}>
            Đang tổng hợp dữ liệu...
          </SoftTypography>
        )}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} xl={3}>
            <Kpi
              title="Doanh thu thuần"
              value={metric(sales.netRevenue, true)}
              icon="trending_up"
              color="#2E7D32"
              change={sales.netRevenue}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <Kpi
              title="Số hóa đơn"
              value={metric(sales.invoiceCount)}
              icon="receipt_long"
              color="#1565C0"
              change={sales.invoiceCount}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <Kpi
              title="Đã thu"
              value={metric(sales.collectedAmount, true)}
              icon="payments"
              color="#00897B"
              change={sales.collectedAmount}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <Kpi
              title="Bán chịu"
              value={metric(sales.creditSales, true)}
              icon="credit_score"
              color="#C62828"
              change={sales.creditSales}
            />
          </Grid>
          {isAdmin && (
            <>
              <Grid item xs={12} sm={6} xl={3}>
                <Kpi
                  title="Lợi nhuận gộp"
                  value={metric(sales.grossProfit, true)}
                  icon="savings"
                  color="#7B1FA2"
                  change={sales.grossProfit}
                />
              </Grid>
              <Grid item xs={12} sm={6} xl={3}>
                <Kpi
                  title="Công nợ hiện tại"
                  value={money(debt.outstandingDebt)}
                  icon="warning"
                  color="#D84315"
                />
              </Grid>
              <Grid item xs={12} sm={6} xl={3}>
                <Kpi
                  title="Giá trị tồn hệ thống"
                  value={money(inventory.totalValue)}
                  icon="inventory_2"
                  color="#6A1B9A"
                />
              </Grid>
              <Grid item xs={12} sm={6} xl={3}>
                <Kpi
                  title="Hàng tồn thấp / hết"
                  value={`${number(inventory.lowStockCount)} / ${number(
                    inventory.outOfStockCount
                  )}`}
                  icon="production_quantity_limits"
                  color="#EF6C00"
                />
              </Grid>
            </>
          )}
        </Grid>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Card>
              <SoftBox p={3} height={360}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Doanh thu – dòng tiền – bán chịu
                </SoftTypography>
                <Line data={trendChart} options={chartOptions} />
              </SoftBox>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card>
              <SoftBox p={3} height={360}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Cơ cấu thu tiền trong kỳ
                </SoftTypography>
                <Doughnut
                  data={paymentChart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              </SoftBox>
            </Card>
          </Grid>
          <Grid item xs={12} lg={6}>
            <MiniList
              title="Top sản phẩm theo doanh thu"
              rows={data.products?.data}
              render={(row, index) => (
                <SoftBox display="flex" justifyContent="space-between">
                  <SoftTypography variant="button">
                    {index + 1}. {row.code} - {row.name}
                    <br />
                    <small>
                      {number(row.quantity)} {row.unit || ""}
                    </small>
                  </SoftTypography>
                  <SoftTypography variant="button" fontWeight="bold" color="success">
                    {money(row.netRevenue)}
                  </SoftTypography>
                </SoftBox>
              )}
            />
          </Grid>
          <Grid item xs={12} lg={6}>
            <MiniList
              title="Cảnh báo tồn kho thấp"
              rows={data.alerts?.data}
              render={(row) => (
                <SoftBox display="flex" justifyContent="space-between">
                  <SoftTypography variant="button">
                    {row.code} - {row.name}
                  </SoftTypography>
                  <SoftTypography variant="button" fontWeight="bold" color="warning">
                    Còn {number(row.stock)} {row.unit}
                  </SoftTypography>
                </SoftBox>
              )}
            />
          </Grid>
          <Grid item xs={12} md={6} xl={3}>
            <Kpi
              title="Xe active / tổng xe"
              value={`${number(trucks.activeTrucks)} / ${number(trucks.totalTrucks)}`}
              icon="local_shipping"
              color="#1565C0"
            />
          </Grid>
          <Grid item xs={12} md={6} xl={3}>
            <Kpi
              title="Khách mới / quay lại"
              value={`${number(customers.newCustomers)} / ${number(customers.returningCustomers)}`}
              icon="groups"
              color="#00897B"
            />
          </Grid>
          <Grid item xs={12} md={6} xl={3}>
            <Kpi
              title="Mã kích hoạt"
              value={number(promotions.activeActivationCodes)}
              icon="confirmation_number"
              color="#7B1FA2"
            />
          </Grid>
          <Grid item xs={12} md={6} xl={3}>
            <Kpi
              title="KPI active / hoàn thành"
              value={`${number(employees.activeKpis)} / ${number(employees.completedKpis)}`}
              icon="task_alt"
              color="#2E7D32"
            />
          </Grid>
          {isAdmin && (
            <>
              <Grid item xs={12} lg={6}>
                <MiniList
                  title="Khách hàng công nợ cao"
                  rows={debt.topDebtors}
                  render={(row) => (
                    <SoftBox display="flex" justifyContent="space-between">
                      <SoftTypography variant="button">
                        {row.customerCode} - {row.customerName}
                        <br />
                        <small>{row.phone}</small>
                      </SoftTypography>
                      <SoftTypography variant="button" fontWeight="bold" color="error">
                        {money(row.debt)}
                      </SoftTypography>
                    </SoftBox>
                  )}
                />
              </Grid>
              <Grid item xs={12} lg={6}>
                <Card>
                  <SoftBox p={3}>
                    <SoftTypography variant="h6" fontWeight="bold" mb={2}>
                      Sức khỏe hệ thống
                    </SoftTypography>
                    <Grid container spacing={2}>
                      {[
                        ["Request lỗi", health.failedRequests],
                        ["Lỗi 5xx", health.serverErrors],
                        ["Login thất bại", health.failedLogins],
                        ["Request chậm", health.slowRequests],
                      ].map(([label, value]) => (
                        <Grid item xs={6} key={label}>
                          <SoftBox p={2} bgcolor="#F8F9FA" borderRadius={2}>
                            <SoftTypography variant="caption">{label}</SoftTypography>
                            <SoftTypography variant="h5" color={value ? "error" : "success"}>
                              {number(value)}
                            </SoftTypography>
                          </SoftBox>
                        </Grid>
                      ))}
                    </Grid>
                  </SoftBox>
                </Card>
              </Grid>
            </>
          )}
        </Grid>
      </SoftBox>
    </DashboardLayout>
  );
}
