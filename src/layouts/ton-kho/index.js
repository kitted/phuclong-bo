import { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_TRUCKS } from "services/warehouseService";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function TonKho() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "low" | "ok" | "out"

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "all" ? true :
      filterStatus === "out" ? p.stock === 0 :
      filterStatus === "low" ? p.stock > 0 && p.stock <= p.minStock :
      p.stock > p.minStock;
    return matchSearch && matchStatus;
  });

  const totalProducts = MOCK_PRODUCTS.length;
  const outOfStock = MOCK_PRODUCTS.filter(p => p.stock === 0).length;
  const lowStock = MOCK_PRODUCTS.filter(p => p.stock > 0 && p.stock <= p.minStock).length;
  const totalValue = MOCK_PRODUCTS.reduce((s, p) => s + p.stock * p.costPrice, 0);

  const getTruckStockForProduct = (productId) => {
    return MOCK_TRUCKS.reduce((total, truck) => {
      const inv = truck.inventory.find(i => i.productId === productId);
      return total + (inv ? inv.qty : 0);
    }, 0);
  };

  const statusBadge = (p) => {
    if (p.stock === 0) return { label: "Hết hàng", bg: "#FFEBEE", color: "#C62828" };
    if (p.stock <= p.minStock) return { label: "Sắp hết", bg: "#FFF3E0", color: "#E65100" };
    return { label: "Còn hàng", bg: "#E8F5E9", color: "#388E3C" };
  };

  const FilterBtn = ({ value, label, count }) => (
    <button
      onClick={() => setFilterStatus(value)}
      style={{
        padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13,
        background: filterStatus === value ? "#3B82F6" : "#F3F4F6",
        color: filterStatus === value ? "#fff" : "#374151", fontWeight: filterStatus === value ? 600 : 400,
        transition: "all 0.2s",
      }}
    >
      {label} {count !== undefined && <span style={{ fontSize: 11 }}>({count})</span>}
    </button>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        {/* Summary KPIs */}
        <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
          <Card sx={{ flex: 1, minWidth: 180 }}>
            <SoftBox p={2.5} display="flex" alignItems="center" gap={2}>
              <SoftBox sx={{ width: 44, height: 44, borderRadius: 2, background: "#E3F2FD", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon sx={{ color: "#1565C0" }}>inventory_2</Icon>
              </SoftBox>
              <SoftBox>
                <SoftTypography variant="caption" color="text">Tổng sản phẩm</SoftTypography>
                <SoftTypography variant="h5" fontWeight="bold">{totalProducts}</SoftTypography>
              </SoftBox>
            </SoftBox>
          </Card>
          <Card sx={{ flex: 1, minWidth: 180 }}>
            <SoftBox p={2.5} display="flex" alignItems="center" gap={2}>
              <SoftBox sx={{ width: 44, height: 44, borderRadius: 2, background: "#E8F5E9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon sx={{ color: "#388E3C" }}>payments</Icon>
              </SoftBox>
              <SoftBox>
                <SoftTypography variant="caption" color="text">Giá trị tồn kho</SoftTypography>
                <SoftTypography variant="h6" fontWeight="bold">{fmtCurrency(totalValue)}</SoftTypography>
              </SoftBox>
            </SoftBox>
          </Card>
          <Card sx={{ flex: 1, minWidth: 180 }}>
            <SoftBox p={2.5} display="flex" alignItems="center" gap={2}>
              <SoftBox sx={{ width: 44, height: 44, borderRadius: 2, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon sx={{ color: "#E65100" }}>warning_amber</Icon>
              </SoftBox>
              <SoftBox>
                <SoftTypography variant="caption" color="text">Sắp hết hàng</SoftTypography>
                <SoftTypography variant="h5" fontWeight="bold" sx={{ color: "#E65100" }}>{lowStock}</SoftTypography>
              </SoftBox>
            </SoftBox>
          </Card>
          <Card sx={{ flex: 1, minWidth: 180 }}>
            <SoftBox p={2.5} display="flex" alignItems="center" gap={2}>
              <SoftBox sx={{ width: 44, height: 44, borderRadius: 2, background: "#FFEBEE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon sx={{ color: "#C62828" }}>remove_shopping_cart</Icon>
              </SoftBox>
              <SoftBox>
                <SoftTypography variant="caption" color="text">Hết hàng</SoftTypography>
                <SoftTypography variant="h5" fontWeight="bold" sx={{ color: "#C62828" }}>{outOfStock}</SoftTypography>
              </SoftBox>
            </SoftBox>
          </Card>
        </SoftBox>

        <Card>
          <SoftBox p={3}>
            <SoftTypography variant="h5" fontWeight="bold" mb={2}>Báo cáo Tồn kho</SoftTypography>

            {/* Filters */}
            <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
              <SoftBox sx={{ flex: 1, minWidth: 220 }}>
                <SoftInput
                  placeholder="Tìm sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <SoftBox display="flex" gap={1} flexWrap="wrap">
                <FilterBtn value="all" label="Tất cả" count={totalProducts} />
                <FilterBtn value="ok" label="Còn hàng" count={totalProducts - lowStock - outOfStock} />
                <FilterBtn value="low" label="Sắp hết" count={lowStock} />
                <FilterBtn value="out" label="Hết hàng" count={outOfStock} />
              </SoftBox>
            </SoftBox>

            {/* Table */}
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Mã SP", "Tên sản phẩm", "Danh mục", "ĐVT", "Tồn kho", "Trên xe tải", "Tồn min", "Giá trị tồn", "Trạng thái"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}>Không tìm thấy</td></tr>
                  )}
                  {filteredProducts.map((p, idx) => {
                    const catName = MOCK_CATEGORIES.find(c => c.id === p.categoryId)?.name || "—";
                    const badge = statusBadge(p);
                    const truckStock = getTruckStockForProduct(p.id);
                    const stockValue = p.stock * p.costPrice;
                    const pct = p.minStock > 0 ? Math.min((p.stock / p.minStock) * 100, 100) : 100;
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid #F0F0F0", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#3B82F6" }}>{p.code}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{p.name}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B7280" }}>{catName}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{p.unit}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <SoftBox>
                            <SoftTypography variant="button" fontWeight="bold" sx={{ color: p.stock === 0 ? "#C62828" : p.stock <= p.minStock ? "#E65100" : "#388E3C" }}>
                              {p.stock}
                            </SoftTypography>
                            <SoftBox sx={{ width: 80, height: 4, borderRadius: 2, background: "#E5E7EB", mt: 0.5 }}>
                              <SoftBox sx={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: p.stock === 0 ? "#EF4444" : p.stock <= p.minStock ? "#F59E0B" : "#22C55E" }} />
                            </SoftBox>
                          </SoftBox>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#1565C0", fontWeight: 600 }}>
                          {truckStock > 0 ? `🚛 ${truckStock}` : "—"}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B7280" }}>{p.minStock}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{fmtCurrency(stockValue)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>
    </DashboardLayout>
  );
}

export default TonKho;
