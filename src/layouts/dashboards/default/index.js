import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Divider from "@mui/material/Divider";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import { useEffect, useState } from "react";
import { DashboardService, MOCK_PRODUCTS, MOCK_TRUCKS } from "services/warehouseService";
import useAutoRefreshUser from "hook/useAutoRefreshUser";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const fmtCurrency = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function KPICard({ icon, color, title, value, sub, subColor }) {
  const colors = {
    info: "linear-gradient(195deg, #42424a, #191919)",
    success: "linear-gradient(195deg, #66BB6A, #388E3C)",
    warning: "linear-gradient(195deg, #FFA726, #F57C00)",
    error: "linear-gradient(195deg, #EF5350, #C62828)",
    primary: "linear-gradient(195deg, #EC407A, #D81B60)",
  };
  return (
    <Card sx={{ overflow: "visible" }}>
      <SoftBox p={2}>
        <SoftBox display="flex" justifyContent="space-between" pt={1} px={2}>
          <SoftBox
            variant="gradient"
            bgColor={color}
            borderRadius="xl"
            display="flex"
            justifyContent="center"
            alignItems="center"
            width="4rem"
            height="4rem"
            mt={-3}
            sx={{ background: colors[color] || colors.info }}
          >
            <Icon fontSize="medium" sx={{ color: "#fff" }}>
              {icon}
            </Icon>
          </SoftBox>
          <SoftBox textAlign="right" lineHeight={1.25}>
            <SoftTypography variant="button" fontWeight="light" color="text">
              {title}
            </SoftTypography>
            <SoftTypography variant="h4">{value}</SoftTypography>
          </SoftBox>
        </SoftBox>
        <Divider />
        <SoftBox pb={2} px={2}>
          <SoftTypography variant="button" color={subColor || "text"} display="flex" alignItems="center">
            {sub}
          </SoftTypography>
        </SoftBox>
      </SoftBox>
    </Card>
  );
}

function Default() {
  const [stats, setStats] = useState(null);
  const lowStock = MOCK_PRODUCTS.filter((p) => p.stock <= p.minStock);

  useEffect(() => {
    DashboardService.getStats().then(({ data }) => setStats(data));
  }, []);

  const chartData = {
    labels: stats?.weeklyChart?.map((d) => d.day) || [],
    datasets: [
      {
        label: "Nhập kho",
        data: stats?.weeklyChart?.map((d) => d.imports) || [],
        backgroundColor: "rgba(66, 153, 225, 0.8)",
        borderRadius: 4,
      },
      {
        label: "Xuất kho",
        data: stats?.weeklyChart?.map((d) => d.exports) || [],
        backgroundColor: "rgba(72, 187, 120, 0.8)",
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: "top" }, title: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        {/* KPI Cards */}
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} xl={3}>
            <KPICard
              icon="inventory_2"
              color="info"
              title="Tổng sản phẩm"
              value={stats?.totalProducts ?? "—"}
              sub={`Giá trị tồn: ${stats ? fmtCurrency(stats.totalStockValue) : "—"}`}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <KPICard
              icon="local_shipping"
              color="success"
              title="Xe đang hoạt động"
              value={stats?.activeTrucks ?? "—"}
              sub={`${MOCK_TRUCKS.length} xe tổng cộng`}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <KPICard
              icon="warning_amber"
              color="warning"
              title="Hàng sắp hết"
              value={stats?.lowStockCount ?? "—"}
              sub="Cần nhập thêm"
              subColor="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <KPICard
              icon="receipt_long"
              color="error"
              title="Hóa đơn hôm nay"
              value={stats?.todayExportsCount ?? "—"}
              sub={`Nhập: ${stats?.todayImportsCount ?? 0} phiếu`}
            />
          </Grid>
        </Grid>

        {/* Charts + Tables Row */}
        <Grid container spacing={3}>
          {/* Weekly Chart */}
          <Grid item xs={12} lg={7}>
            <Card>
              <SoftBox p={3}>
                <SoftTypography variant="h6" fontWeight="medium" mb={2}>
                  Hoạt động nhập/xuất 7 ngày qua
                </SoftTypography>
                {stats && <Bar data={chartData} options={chartOptions} height={120} />}
              </SoftBox>
            </Card>
          </Grid>

          {/* Low Stock Alert */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ height: "100%" }}>
              <SoftBox p={3}>
                <SoftBox display="flex" alignItems="center" mb={2}>
                  <Icon sx={{ color: "#F57C00", mr: 1 }}>warning_amber</Icon>
                  <SoftTypography variant="h6" fontWeight="medium">
                    Cảnh báo tồn kho thấp
                  </SoftTypography>
                </SoftBox>
                {lowStock.length === 0 ? (
                  <SoftTypography variant="body2" color="success">
                    ✅ Tất cả sản phẩm đủ hàng
                  </SoftTypography>
                ) : (
                  lowStock.map((p) => (
                    <SoftBox
                      key={p.id}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                      sx={{ borderBottom: "1px solid #f0f0f0" }}
                    >
                      <SoftBox>
                        <SoftTypography variant="button" fontWeight="medium">
                          {p.name}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text" display="block">
                          Tối thiểu: {p.minStock} {p.unit}
                        </SoftTypography>
                      </SoftBox>
                      <SoftBox
                        px={1.5}
                        py={0.5}
                        borderRadius="lg"
                        sx={{ background: p.stock === 0 ? "#FFEBEE" : "#FFF3E0" }}
                      >
                        <SoftTypography
                          variant="caption"
                          fontWeight="bold"
                          sx={{ color: p.stock === 0 ? "#C62828" : "#E65100" }}
                        >
                          Còn: {p.stock} {p.unit}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  ))
                )}
              </SoftBox>
            </Card>
          </Grid>

          {/* Truck Status */}
          <Grid item xs={12} lg={6}>
            <Card>
              <SoftBox p={3}>
                <SoftTypography variant="h6" fontWeight="medium" mb={2}>
                  Trạng thái xe tải
                </SoftTypography>
                {MOCK_TRUCKS.map((truck) => {
                  const totalItems = truck.inventory.reduce((s, i) => s + i.qty, 0);
                  return (
                    <SoftBox
                      key={truck.id}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1.5}
                      sx={{ borderBottom: "1px solid #f0f0f0" }}
                    >
                      <SoftBox display="flex" alignItems="center" gap={2}>
                        <Icon sx={{ color: truck.status === "active" ? "#388E3C" : "#9E9E9E", fontSize: 28 }}>
                          local_shipping
                        </Icon>
                        <SoftBox>
                          <SoftTypography variant="button" fontWeight="medium">
                            {truck.name} – {truck.licensePlate}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            {truck.driver} · {truck.phone}
                          </SoftTypography>
                        </SoftBox>
                      </SoftBox>
                      <SoftBox textAlign="right">
                        <SoftBox
                          px={1.5}
                          py={0.5}
                          borderRadius="lg"
                          sx={{ background: truck.status === "active" ? "#E8F5E9" : "#F5F5F5", display: "inline-block" }}
                        >
                          <SoftTypography
                            variant="caption"
                            fontWeight="bold"
                            sx={{ color: truck.status === "active" ? "#388E3C" : "#9E9E9E" }}
                          >
                            {truck.status === "active" ? "Hoạt động" : "Ngừng"}
                          </SoftTypography>
                        </SoftBox>
                        <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
                          {totalItems} sp trên xe
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  );
                })}
              </SoftBox>
            </Card>
          </Grid>

          {/* Recent Invoices */}
          <Grid item xs={12} lg={6}>
            <Card>
              <SoftBox p={3}>
                <SoftTypography variant="h6" fontWeight="medium" mb={2}>
                  Hóa đơn gần đây
                </SoftTypography>
                {(stats?.recentInvoices || []).length === 0 && (
                  <SoftTypography variant="body2" color="text">
                    Chưa có hóa đơn
                  </SoftTypography>
                )}
                {(stats?.recentInvoices || []).map((inv) => (
                  <SoftBox
                    key={inv.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={1}
                    sx={{ borderBottom: "1px solid #f0f0f0" }}
                  >
                    <SoftBox>
                      <SoftTypography variant="button" fontWeight="medium">
                        {inv.code}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text" display="block">
                        {inv.customer} · {inv.date}
                      </SoftTypography>
                    </SoftBox>
                    <SoftBox textAlign="right">
                      <SoftTypography variant="button" fontWeight="bold" color="success">
                        {fmtCurrency(inv.totalAmount)}
                      </SoftTypography>
                      <SoftBox
                        px={1}
                        py={0.3}
                        borderRadius="md"
                        sx={{ background: inv.sourceType === "truck" ? "#E3F2FD" : "#E8F5E9", display: "block" }}
                      >
                        <SoftTypography
                          variant="caption"
                          sx={{ color: inv.sourceType === "truck" ? "#1565C0" : "#2E7D32" }}
                        >
                          {inv.sourceType === "truck" ? "Từ xe" : "Từ kho"}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  </SoftBox>
                ))}
              </SoftBox>
            </Card>
          </Grid>
        </Grid>
      </SoftBox>
    </DashboardLayout>
  );
}

export default Default;
