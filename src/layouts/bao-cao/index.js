import { useState } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";
import { MOCK_IMPORTS, MOCK_INVOICES, MOCK_PRODUCTS, MOCK_TRUCKS } from "services/warehouseService";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const fmtCurrency = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

// Simplified mock report data per month
const MONTHLY_DATA = [
  { month: "T1", imports: 12, exports: 18, importValue: 15200000, saleValue: 28400000 },
  { month: "T2", imports: 9, exports: 14, importValue: 11500000, saleValue: 21000000 },
  { month: "T3", imports: 15, exports: 22, importValue: 19800000, saleValue: 34200000 },
  { month: "T4", imports: 11, exports: 17, importValue: 14300000, saleValue: 26000000 },
  { month: "T5", imports: 18, exports: 25, importValue: 23500000, saleValue: 41000000 },
  { month: "T6", imports: 14, exports: 20, importValue: 18200000, saleValue: 32000000 },
  { month: "T7", imports: 3, exports: 2, importValue: 5840000, saleValue: 740000 },
];

function BaoCao() {
  const [tab, setTab] = useState(0);

  const totalImportValue = MOCK_IMPORTS.reduce((s, i) => s + i.totalAmount, 0);
  const totalSaleValue = MOCK_INVOICES.reduce((s, i) => s + i.totalAmount, 0);
  const totalInventoryValue = MOCK_PRODUCTS.reduce((s, p) => s + p.stock * p.costPrice, 0);
  const profit = totalSaleValue - MOCK_INVOICES.reduce((s, inv) => {
    return s + inv.items.reduce((ss, item) => {
      const p = MOCK_PRODUCTS.find(pp => pp.id === item.productId);
      return ss + (p ? p.costPrice * item.qty : 0);
    }, 0);
  }, 0);

  const barChartData = {
    labels: MONTHLY_DATA.map(d => d.month),
    datasets: [
      { label: "Phiếu nhập", data: MONTHLY_DATA.map(d => d.imports), backgroundColor: "rgba(59, 130, 246, 0.8)", borderRadius: 4 },
      { label: "Hóa đơn bán", data: MONTHLY_DATA.map(d => d.exports), backgroundColor: "rgba(34, 197, 94, 0.8)", borderRadius: 4 },
    ],
  };

  const lineChartData = {
    labels: MONTHLY_DATA.map(d => d.month),
    datasets: [
      {
        label: "Doanh thu (VNĐ)",
        data: MONTHLY_DATA.map(d => d.saleValue),
        borderColor: "#22C55E", backgroundColor: "rgba(34, 197, 94, 0.1)", fill: true, tension: 0.4,
      },
      {
        label: "Chi phí nhập (VNĐ)",
        data: MONTHLY_DATA.map(d => d.importValue),
        borderColor: "#3B82F6", backgroundColor: "rgba(59, 130, 246, 0.1)", fill: true, tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { position: "top" } },
    scales: { y: { beginAtZero: true } },
  };

  const lineOptions = {
    responsive: true,
    plugins: { legend: { position: "top" } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${(v / 1000000).toFixed(0)}M` } } },
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        {/* KPI Summary */}
        <Grid container spacing={2} mb={3}>
          {[
            { label: "Tổng nhập kho", value: fmtCurrency(totalImportValue), icon: "download", color: "#E3F2FD", iconColor: "#1565C0" },
            { label: "Tổng doanh thu", value: fmtCurrency(totalSaleValue), icon: "trending_up", color: "#E8F5E9", iconColor: "#388E3C" },
            { label: "Lợi nhuận ước tính", value: fmtCurrency(profit), icon: "savings", color: "#FFF3E0", iconColor: "#E65100" },
            { label: "Giá trị tồn kho", value: fmtCurrency(totalInventoryValue), icon: "inventory_2", color: "#F3E5F5", iconColor: "#6A1B9A" },
          ].map((item) => (
            <Grid item xs={12} sm={6} lg={3} key={item.label}>
              <Card>
                <SoftBox p={2.5} display="flex" alignItems="center" gap={2}>
                  <SoftBox sx={{ width: 48, height: 48, borderRadius: 2, background: item.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon sx={{ color: item.iconColor }}>{item.icon}</Icon>
                  </SoftBox>
                  <SoftBox>
                    <SoftTypography variant="caption" color="text" display="block">{item.label}</SoftTypography>
                    <SoftTypography variant="h6" fontWeight="bold">{item.value}</SoftTypography>
                  </SoftBox>
                </SoftBox>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="Hoạt động nhập/xuất" />
          <Tab label="Doanh thu & Chi phí" />
          <Tab label="Hóa đơn theo xe" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <SoftBox p={3}>
                  <SoftTypography variant="h6" fontWeight="medium" mb={2}>Số lượng nhập/xuất theo tháng</SoftTypography>
                  <Bar data={barChartData} options={chartOptions} height={80} />
                </SoftBox>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%" }}>
                <SoftBox p={3}>
                  <SoftTypography variant="h6" fontWeight="medium" mb={2}>Chi tiết phiếu nhập gần nhất</SoftTypography>
                  {MOCK_IMPORTS.slice().reverse().slice(0, 5).map((imp) => (
                    <SoftBox key={imp.id} display="flex" justifyContent="space-between" py={1} sx={{ borderBottom: "1px solid #F0F0F0" }}>
                      <SoftBox>
                        <SoftTypography variant="button" fontWeight="medium">{imp.code}</SoftTypography>
                        <SoftTypography variant="caption" color="text" display="block">{imp.date}</SoftTypography>
                      </SoftBox>
                      <SoftTypography variant="button" fontWeight="bold" color="info">{fmtCurrency(imp.totalAmount)}</SoftTypography>
                    </SoftBox>
                  ))}
                </SoftBox>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: "100%" }}>
                <SoftBox p={3}>
                  <SoftTypography variant="h6" fontWeight="medium" mb={2}>Hóa đơn bán gần nhất</SoftTypography>
                  {MOCK_INVOICES.slice().reverse().slice(0, 5).map((inv) => (
                    <SoftBox key={inv.id} display="flex" justifyContent="space-between" py={1} sx={{ borderBottom: "1px solid #F0F0F0" }}>
                      <SoftBox>
                        <SoftTypography variant="button" fontWeight="medium">{inv.code}</SoftTypography>
                        <SoftTypography variant="caption" color="text" display="block">{inv.customer} · {inv.date}</SoftTypography>
                      </SoftBox>
                      <SoftBox textAlign="right">
                        <SoftTypography variant="button" fontWeight="bold" color="success">{fmtCurrency(inv.totalAmount)}</SoftTypography>
                        <SoftBox
                          px={1} py={0.3} borderRadius="md" display="block"
                          sx={{ background: inv.sourceType === "truck" ? "#E3F2FD" : "#E8F5E9" }}
                        >
                          <SoftTypography variant="caption" sx={{ color: inv.sourceType === "truck" ? "#1565C0" : "#2E7D32" }}>
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
        )}

        {tab === 1 && (
          <Card>
            <SoftBox p={3}>
              <SoftTypography variant="h6" fontWeight="medium" mb={2}>Doanh thu & Chi phí nhập theo tháng</SoftTypography>
              <Line data={lineChartData} options={lineOptions} height={80} />
            </SoftBox>
          </Card>
        )}

        {tab === 2 && (
          <Grid container spacing={3}>
            {MOCK_TRUCKS.map((truck) => {
              const truckInvoices = MOCK_INVOICES.filter(i => i.truckId === truck.id);
              const truckTotal = truckInvoices.reduce((s, i) => s + i.totalAmount, 0);
              return (
                <Grid item xs={12} md={6} key={truck.id}>
                  <Card>
                    <SoftBox p={3}>
                      <SoftBox display="flex" alignItems="center" gap={1.5} mb={2}>
                        <Icon sx={{ color: "#1565C0" }}>local_shipping</Icon>
                        <SoftTypography variant="h6" fontWeight="bold">{truck.name} – {truck.licensePlate}</SoftTypography>
                      </SoftBox>
                      <SoftBox display="flex" justifyContent="space-between" mb={2} p={1.5} sx={{ background: "#F8F9FA", borderRadius: 2 }}>
                        <SoftBox>
                          <SoftTypography variant="caption" color="text">Hóa đơn</SoftTypography>
                          <SoftTypography variant="h5" fontWeight="bold">{truckInvoices.length}</SoftTypography>
                        </SoftBox>
                        <SoftBox textAlign="right">
                          <SoftTypography variant="caption" color="text">Doanh thu</SoftTypography>
                          <SoftTypography variant="h6" fontWeight="bold" color="success">{fmtCurrency(truckTotal)}</SoftTypography>
                        </SoftBox>
                      </SoftBox>
                      {truckInvoices.length === 0 && (
                        <SoftTypography variant="body2" color="text">Chưa có hóa đơn từ xe này</SoftTypography>
                      )}
                      {truckInvoices.map((inv) => (
                        <SoftBox key={inv.id} display="flex" justifyContent="space-between" py={1} sx={{ borderBottom: "1px solid #F0F0F0" }}>
                          <SoftBox>
                            <SoftTypography variant="button">{inv.code}</SoftTypography>
                            <SoftTypography variant="caption" color="text" display="block">{inv.customer}</SoftTypography>
                          </SoftBox>
                          <SoftTypography variant="button" fontWeight="bold" color="success">{fmtCurrency(inv.totalAmount)}</SoftTypography>
                        </SoftBox>
                      ))}
                    </SoftBox>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </SoftBox>
    </DashboardLayout>
  );
}

export default BaoCao;
