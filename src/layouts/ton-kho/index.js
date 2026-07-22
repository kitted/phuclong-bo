import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Pagination from "@mui/material/Pagination";
import Tooltip from "@mui/material/Tooltip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import InventoryService from "services/inventoryService";
import { toast } from "react-toastify";

const PAGE_SIZE = 20;

const STATUS_QUERY = {
  all: undefined,
  ok: "IN_STOCK",
  low: "LOW_STOCK",
  out: "OUT_OF_STOCK",
};

const fmtCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);

const unwrap = (response) => {
  const body = response?.data ?? response ?? {};
  return body?.data !== undefined ? body.data : body;
};

const normalizeList = (response) => {
  const body = response?.data ?? response ?? {};
  const payload = body?.data !== undefined ? body.data : body;
  const nestedPayload = payload?.data !== undefined ? payload.data : payload;
  const items = Array.isArray(nestedPayload)
    ? nestedPayload
    : nestedPayload?.items || nestedPayload?.results || [];
  const meta = body?.meta || payload?.meta || nestedPayload?.meta || {};
  return { items, meta };
};

const productIdOf = (item) => item?.productId?.id || item?.productId?._id || item?.productId;

const normalizeItem = (item) => {
  const product = typeof item.product === "object" ? item.product : {};
  const productId = productIdOf(item) || product.id || product._id || item.id || item._id;
  const warehouseQuantity = Number(item.warehouseQuantity ?? item.stock ?? item.quantity ?? 0);
  const truckQuantity = Number(item.truckQuantity ?? item.stockOnTrucks ?? 0);
  const minStock = Number(item.minStock ?? product.minStock ?? 0);
  const costPrice = Number(item.costPrice ?? product.costPrice ?? 0);
  const rawCategory = item.category || product.category || product.categoryId;
  return {
    ...item,
    productId,
    productCode: item.productCode || product.code || item.code || "—",
    productName: item.productName || product.name || item.name || "—",
    categoryName:
      (typeof rawCategory === "object" ? rawCategory?.name : undefined) || item.categoryName || "—",
    unit: item.unit || product.unit || "—",
    warehouseQuantity,
    truckQuantity,
    minStock,
    costPrice,
    warehouseStockValue: Number(
      item.warehouseStockValue ?? item.stockValue ?? warehouseQuantity * costPrice
    ),
    status:
      item.status ||
      (warehouseQuantity <= 0
        ? "OUT_OF_STOCK"
        : warehouseQuantity <= minStock
        ? "LOW_STOCK"
        : "IN_STOCK"),
  };
};

const statusBadge = (status) => {
  if (status === "OUT_OF_STOCK" || status === "out")
    return { label: "Hết hàng", bg: "#FFEBEE", color: "#C62828" };
  if (status === "LOW_STOCK" || status === "low")
    return { label: "Sắp hết", bg: "#FFF3E0", color: "#E65100" };
  return { label: "Còn hàng", bg: "#E8F5E9", color: "#388E3C" };
};

function InventoryDetailModal({ productId, open, onClose }) {
  const [detail, setDetail] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !productId) return undefined;
    let active = true;
    setLoading(true);
    Promise.all([
      InventoryService.getProductDetail(productId),
      InventoryService.getProductMovements(productId, { page: 1, limit: 10 }),
    ])
      .then(([detailResponse, movementResponse]) => {
        if (!active) return;
        setDetail(unwrap(detailResponse));
        setMovements(normalizeList(movementResponse).items);
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || "Không thể tải chi tiết tồn kho");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, productId]);

  const product = detail?.product || detail || {};
  const trucks = detail?.truckBreakdown || detail?.trucks || [];

  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "92%", md: 760 },
          maxHeight: "88vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 3,
        }}
      >
        <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <SoftTypography variant="h5" fontWeight="bold">
            Chi tiết tồn kho
          </SoftTypography>
          <IconButton onClick={onClose}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
        {loading ? (
          <SoftTypography variant="button" color="text">
            Đang tải dữ liệu...
          </SoftTypography>
        ) : (
          <>
            <SoftTypography variant="h6" fontWeight="bold">
              {product.code || product.productCode || "—"} ·{" "}
              {product.name || product.productName || "—"}
            </SoftTypography>
            <SoftBox display="flex" gap={3} flexWrap="wrap" my={2}>
              <SoftTypography variant="button">
                Trong kho: <b>{detail?.warehouseQuantity ?? product.warehouseQuantity ?? 0}</b>
              </SoftTypography>
              <SoftTypography variant="button">
                Trên xe: <b>{detail?.truckQuantity ?? product.truckQuantity ?? 0}</b>
              </SoftTypography>
              <SoftTypography variant="button">
                Tổng cộng: <b>{detail?.totalQuantity ?? 0}</b>
              </SoftTypography>
            </SoftBox>
            {trucks.length > 0 && (
              <SoftBox mb={3}>
                <SoftTypography variant="button" fontWeight="bold">
                  Phân bổ trên xe
                </SoftTypography>
                {trucks.map((truck) => (
                  <SoftTypography
                    key={truck.truckId || truck.id}
                    variant="caption"
                    display="block"
                    color="text"
                  >
                    {truck.truckCode || truck.code || truck.truckName || "Xe"}:{" "}
                    {truck.quantity || 0}
                  </SoftTypography>
                ))}
              </SoftBox>
            )}
            <SoftTypography variant="button" fontWeight="bold">
              10 biến động gần nhất
            </SoftTypography>
            <SoftBox sx={{ overflowX: "auto", mt: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Thời gian", "Loại", "Thay đổi", "Tồn sau", "Tham chiếu"].map((h) => (
                      <th key={h} style={{ padding: "8px", textAlign: "left", fontSize: 12 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ padding: 20, textAlign: "center", color: "#9E9E9E" }}
                      >
                        Chưa có biến động
                      </td>
                    </tr>
                  )}
                  {movements.map((movement) => (
                    <tr
                      key={movement.id || movement._id}
                      style={{ borderBottom: "1px solid #eee" }}
                    >
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {movement.createdAt
                          ? new Date(movement.createdAt).toLocaleString("vi-VN")
                          : "—"}
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {movement.type || movement.movementType || "—"}
                      </td>
                      <td style={{ padding: 8, fontSize: 12, fontWeight: 600 }}>
                        {Number(movement.quantityChange ?? movement.quantity ?? 0) > 0 ? "+" : ""}
                        {movement.quantityChange ?? movement.quantity ?? 0}
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {movement.quantityAfter ?? movement.balanceAfter ?? "—"}
                      </td>
                      <td style={{ padding: 8, fontSize: 12 }}>
                        {movement.reference?.code || movement.referenceCode || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SoftBox>
          </>
        )}
      </SoftBox>
    </Modal>
  );
}

function TonKho() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detailProductId, setDetailProductId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch, filterStatus]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: STATUS_QUERY[filterStatus],
    };
    Promise.all([InventoryService.getList(params), InventoryService.getSummary()])
      .then(([listResponse, summaryResponse]) => {
        if (!active) return;
        const list = normalizeList(listResponse);
        const summaryData = unwrap(summaryResponse) || {};
        setItems(list.items.map(normalizeItem));
        setMeta({
          page: Number(list.meta.page ?? page),
          totalPages: Number(list.meta.totalPages ?? list.meta.pageCount ?? 1),
          totalItems: Number(list.meta.totalItems ?? list.meta.total ?? list.items.length),
        });
        setSummary(summaryData);
      })
      .catch((error) => {
        if (!active) return;
        setItems([]);
        toast.error(error.response?.data?.message || "Không thể tải dữ liệu tồn kho");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, filterStatus]);

  const counts = summary.statusCounts || {};
  const totalProducts = Number(summary.totalProducts ?? counts.total ?? meta.totalItems ?? 0);
  const lowStock = Number(summary.lowStockCount ?? counts.lowStock ?? counts.LOW_STOCK ?? 0);
  const outOfStock = Number(
    summary.outOfStockCount ?? counts.outOfStock ?? counts.OUT_OF_STOCK ?? 0
  );
  const inStock = Number(
    summary.inStockCount ??
      counts.inStock ??
      counts.IN_STOCK ??
      Math.max(0, totalProducts - lowStock - outOfStock)
  );
  const totalValue = Number(
    summary.warehouseStockValue ?? summary.totalStockValue ?? summary.totalInventoryValue ?? 0
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await InventoryService.exportReport({
        search: debouncedSearch || undefined,
        status: STATUS_QUERY[filterStatus],
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xuất báo cáo tồn kho");
    } finally {
      setExporting(false);
    }
  };

  const FilterBtn = ({ value, label, count }) => (
    <button
      onClick={() => setFilterStatus(value)}
      style={{
        padding: "6px 16px",
        borderRadius: 20,
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        background: filterStatus === value ? "#3B82F6" : "#F3F4F6",
        color: filterStatus === value ? "#fff" : "#374151",
        fontWeight: filterStatus === value ? 600 : 400,
      }}
    >
      {label} <span style={{ fontSize: 11 }}>({count})</span>
    </button>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
          {[
            ["Tổng sản phẩm", totalProducts, "inventory_2", "#E3F2FD", "#1565C0"],
            ["Giá trị tồn kho", fmtCurrency(totalValue), "payments", "#E8F5E9", "#388E3C"],
            ["Sắp hết hàng", lowStock, "warning_amber", "#FFF3E0", "#E65100"],
            ["Hết hàng", outOfStock, "remove_shopping_cart", "#FFEBEE", "#C62828"],
          ].map(([label, value, icon, bg, color]) => (
            <Card key={label} sx={{ flex: 1, minWidth: 180 }}>
              <SoftBox p={2.5} display="flex" alignItems="center" gap={2}>
                <SoftBox
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    background: bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon sx={{ color }}>{icon}</Icon>
                </SoftBox>
                <SoftBox>
                  <SoftTypography variant="caption" color="text">
                    {label}
                  </SoftTypography>
                  <SoftTypography
                    variant={label === "Giá trị tồn kho" ? "h6" : "h5"}
                    fontWeight="bold"
                    sx={{ color: label.includes("hàng") ? color : undefined }}
                  >
                    {value}
                  </SoftTypography>
                </SoftBox>
              </SoftBox>
            </Card>
          ))}
        </SoftBox>

        <Card>
          <SoftBox p={3}>
            <SoftBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
              gap={2}
              flexWrap="wrap"
            >
              <SoftTypography variant="h5" fontWeight="bold">
                Báo cáo Tồn kho
              </SoftTypography>
              <SoftButton
                variant="outlined"
                color="info"
                startIcon={<Icon>download</Icon>}
                disabled={exporting}
                onClick={handleExport}
              >
                {exporting ? "Đang xuất..." : "Xuất Excel"}
              </SoftButton>
            </SoftBox>
            <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap" alignItems="center">
              <SoftBox sx={{ flex: 1, minWidth: 220 }}>
                <SoftInput
                  placeholder="Tìm tên hoặc mã sản phẩm..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <SoftBox display="flex" gap={1} flexWrap="wrap">
                <FilterBtn value="all" label="Tất cả" count={totalProducts} />
                <FilterBtn value="ok" label="Còn hàng" count={inStock} />
                <FilterBtn value="low" label="Sắp hết" count={lowStock} />
                <FilterBtn value="out" label="Hết hàng" count={outOfStock} />
              </SoftBox>
            </SoftBox>
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {[
                      "Mã SP",
                      "Tên sản phẩm",
                      "Danh mục",
                      "ĐVT",
                      "Tồn kho",
                      "Trên xe tải",
                      "Tồn min",
                      "Giá trị tồn",
                      "Trạng thái",
                      "",
                    ].map((heading, index) => (
                      <th
                        key={`${heading}-${index}`}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#6B7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={10}
                        style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}
                      >
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}
                      >
                        Không tìm thấy sản phẩm
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    items.map((item, index) => {
                      const badge = statusBadge(item.status);
                      const pct =
                        item.minStock > 0
                          ? Math.min((item.warehouseQuantity / item.minStock) * 100, 100)
                          : 100;
                      return (
                        <tr
                          key={item.productId || `${item.productCode}-${index}`}
                          style={{
                            borderBottom: "1px solid #F0F0F0",
                            background: index % 2 === 0 ? "#fff" : "#FAFAFA",
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#3B82F6",
                            }}
                          >
                            {item.productCode}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13 }}>{item.productName}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B7280" }}>
                            {item.categoryName}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13 }}>{item.unit}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <SoftTypography
                              variant="button"
                              fontWeight="bold"
                              sx={{ color: badge.color }}
                            >
                              {item.warehouseQuantity}
                            </SoftTypography>
                            <SoftBox
                              sx={{
                                width: 80,
                                height: 4,
                                borderRadius: 2,
                                background: "#E5E7EB",
                                mt: 0.5,
                              }}
                            >
                              <SoftBox
                                sx={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  borderRadius: 2,
                                  background: badge.color,
                                }}
                              />
                            </SoftBox>
                          </td>
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: 13,
                              color: "#1565C0",
                              fontWeight: 600,
                            }}
                          >
                            {item.truckQuantity > 0 ? `🚛 ${item.truckQuantity}` : "—"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B7280" }}>
                            {item.minStock}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                            {fmtCurrency(item.warehouseStockValue)}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background: badge.bg,
                                color: badge.color,
                              }}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <Tooltip title="Xem chi tiết và biến động">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={!item.productId}
                                  onClick={() => setDetailProductId(item.productId)}
                                >
                                  <Icon sx={{ fontSize: 18, color: "#3B82F6" }}>visibility</Icon>
                                </IconButton>
                              </span>
                            </Tooltip>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </SoftBox>
            {!loading && meta.totalPages > 1 && (
              <SoftBox
                mt={3}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
              >
                <SoftTypography variant="caption" color="text">
                  Tổng {meta.totalItems} sản phẩm
                </SoftTypography>
                <Pagination
                  page={page}
                  count={meta.totalPages}
                  color="primary"
                  onChange={(_, value) => setPage(value)}
                />
              </SoftBox>
            )}
          </SoftBox>
        </Card>
      </SoftBox>
      <InventoryDetailModal
        productId={detailProductId}
        open={Boolean(detailProductId)}
        onClose={() => setDetailProductId(null)}
      />
    </DashboardLayout>
  );
}

export default TonKho;
