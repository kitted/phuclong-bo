import { useCallback, useEffect, useMemo, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Icon from "@mui/material/Icon";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import PrintPreviewDialog from "components/PrintPreviewDialog";
import { DashboardAnalyticsService } from "services/analyticsService";
import {
  buildInventoryAlertDocument,
  createInventoryAlertCanvasImage,
} from "utils/inventoryAlertsExport";
import { toast } from "react-toastify";

const alertTypes = [
  { value: "LOW_STOCK", label: "Tồn thấp", icon: "warning_amber" },
  { value: "OUT_OF_STOCK", label: "Hết hàng", icon: "remove_shopping_cart" },
  { value: "SLOW_MOVING", label: "Chậm luân chuyển", icon: "history" },
];

const idOf = (row) => String(row?.id || row?._id || "");
const number = (value) => Number(value || 0).toLocaleString("vi-VN");

export default function InventoryAlertsTab() {
  const [type, setType] = useState("LOW_STOCK");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingImage, setExportingImage] = useState(false);
  const [preview, setPreview] = useState(null);

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await DashboardAnalyticsService.inventoryAlerts({
        type,
        limit: 100,
        slowMovingDays: 60,
      });
      const payload = response?.data || {};
      const nextItems = Array.isArray(payload) ? payload : payload.data || [];
      setItems(nextItems);
      const validIds = new Set(nextItems.map(idOf));
      setSelected((current) => current.filter((id) => validIds.has(id)));
    } catch (error) {
      setItems([]);
      setSelected([]);
      toast.error(error.response?.data?.message || "Không thể tải cảnh báo tồn kho");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return items;
    return items.filter((item) =>
      `${item.code || ""} ${item.name || ""}`.toLocaleLowerCase("vi").includes(keyword)
    );
  }, [items, search]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedRows = useMemo(
    () => items.filter((item) => selectedSet.has(idOf(item))),
    [items, selectedSet]
  );
  const visibleIds = filtered.map(idOf).filter(Boolean);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));

  const toggleItem = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  const toggleVisible = () => {
    setSelected((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id));
      return [...new Set([...current, ...visibleIds])];
    });
  };

  const ensureSelection = () => {
    if (selectedRows.length) return true;
    toast.warning("Hãy chọn ít nhất một sản phẩm cần xuất");
    return false;
  };

  const openPdfPreview = () => {
    if (!ensureSelection()) return;
    setPreview(buildInventoryAlertDocument({ rows: selectedRows, type }));
  };

  const exportImage = async () => {
    if (!ensureSelection()) return;
    try {
      setExportingImage(true);
      createInventoryAlertCanvasImage({ rows: selectedRows, type });
      toast.success(`Đã tải ảnh cảnh báo gồm ${selectedRows.length} sản phẩm`);
    } catch (error) {
      toast.error(error?.message || "Không thể tạo ảnh cảnh báo tồn kho");
    } finally {
      setExportingImage(false);
    }
  };

  const shortage = selectedRows.reduce(
    (sum, item) => sum + Math.max(0, Number(item.minStock || 0) - Number(item.stock || 0)),
    0
  );

  return (
    <SoftBox>
      <SoftBox
        display="flex"
        flexDirection={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        gap={1.5}
        mb={2}
      >
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold">
            Danh sách cảnh báo tồn kho
          </SoftTypography>
          <SoftTypography variant="caption" color="text">
            Chọn đúng mặt hàng cần kiểm tra, sau đó lưu PDF hoặc tải ảnh PNG để chia sẻ.
          </SoftTypography>
        </SoftBox>
        <SoftButton color="info" variant="outlined" onClick={loadAlerts} disabled={loading}>
          <Icon>refresh</Icon>&nbsp;{loading ? "Đang tải..." : "Cập nhật"}
        </SoftButton>
      </SoftBox>

      <SoftBox display="flex" gap={1} flexWrap="wrap" mb={2}>
        {alertTypes.map((option) => (
          <SoftButton
            key={option.value}
            size="small"
            color={type === option.value ? "info" : "secondary"}
            variant={type === option.value ? "gradient" : "outlined"}
            onClick={() => {
              setType(option.value);
              setSelected([]);
            }}
          >
            <Icon>{option.icon}</Icon>&nbsp;{option.label}
          </SoftButton>
        ))}
      </SoftBox>

      <SoftBox
        display="grid"
        gap={1.25}
        mb={2}
        sx={{ gridTemplateColumns: { xs: "1fr", md: "minmax(240px,1fr) repeat(3,170px)" } }}
      >
        <SoftInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo mã hoặc tên sản phẩm..."
          icon={{ component: "search", direction: "left" }}
        />
        <SoftBox p={1.25} borderRadius={2} sx={{ bgcolor: "#eef6ff", border: "1px solid #cfe3fa" }}>
          <SoftTypography variant="caption" color="text">
            Đang cảnh báo
          </SoftTypography>
          <SoftTypography variant="h6" fontWeight="bold" color="info">
            {number(items.length)}
          </SoftTypography>
        </SoftBox>
        <SoftBox p={1.25} borderRadius={2} sx={{ bgcolor: "#fff7ed", border: "1px solid #fed7aa" }}>
          <SoftTypography variant="caption" color="text">
            Đã chọn để xuất
          </SoftTypography>
          <SoftTypography variant="h6" fontWeight="bold" sx={{ color: "#c2410c" }}>
            {number(selectedRows.length)}
          </SoftTypography>
        </SoftBox>
        <SoftBox p={1.25} borderRadius={2} sx={{ bgcolor: "#fff1f2", border: "1px solid #fecdd3" }}>
          <SoftTypography variant="caption" color="text">
            Thiếu tối thiểu
          </SoftTypography>
          <SoftTypography variant="h6" fontWeight="bold" sx={{ color: "#be123c" }}>
            {number(shortage)}
          </SoftTypography>
        </SoftBox>
      </SoftBox>

      <SoftBox
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        gap={1}
        p={1.25}
        mb={1}
        borderRadius={2}
        sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <SoftBox display="flex" alignItems="center">
          <Checkbox
            checked={allVisibleSelected}
            indeterminate={!allVisibleSelected && visibleIds.some((id) => selectedSet.has(id))}
            onChange={toggleVisible}
          />
          <SoftTypography variant="button" fontWeight="bold">
            Chọn tất cả {filtered.length} kết quả đang hiển thị
          </SoftTypography>
        </SoftBox>
        <SoftBox display="flex" gap={1} flexWrap="wrap">
          <SoftButton
            color="info"
            variant="gradient"
            onClick={openPdfPreview}
            disabled={!selectedRows.length}
          >
            <Icon>picture_as_pdf</Icon>&nbsp;Xem trước / Lưu PDF
          </SoftButton>
          <SoftButton
            color="dark"
            variant="gradient"
            onClick={exportImage}
            disabled={!selectedRows.length || exportingImage}
          >
            <Icon>image</Icon>&nbsp;{exportingImage ? "Đang tạo ảnh..." : "Tải ảnh PNG"}
          </SoftButton>
        </SoftBox>
      </SoftBox>

      <SoftBox display="grid" gap={1}>
        {!loading && !filtered.length && (
          <SoftBox p={4} textAlign="center" borderRadius={2} sx={{ border: "1px dashed #cbd5e1" }}>
            <Icon sx={{ fontSize: 38, color: "#94a3b8" }}>inventory_2</Icon>
            <SoftTypography variant="button" display="block" color="text">
              Không có sản phẩm phù hợp với bộ lọc hiện tại.
            </SoftTypography>
          </SoftBox>
        )}
        {filtered.map((item) => {
          const id = idOf(item);
          const checked = selectedSet.has(id);
          const outOfStock = Number(item.stock || 0) <= 0;
          const missing = Math.max(0, Number(item.minStock || 0) - Number(item.stock || 0));
          return (
            <SoftBox
              key={id}
              component="label"
              display="grid"
              alignItems="center"
              gap={1.25}
              p={{ xs: 1.25, md: 1.5 }}
              borderRadius={2}
              sx={{
                gridTemplateColumns: { xs: "auto minmax(0,1fr)", md: "auto minmax(0,1fr) auto" },
                border: checked ? "2px solid #1976d2" : "1px solid #e2e8f0",
                bgcolor: checked ? "#f2f8ff" : "#fff",
                cursor: "pointer",
                transition: "border-color 150ms ease, background-color 150ms ease",
                "&:hover": { borderColor: "#64b5f6", bgcolor: "#f8fbff" },
              }}
            >
              <Checkbox checked={checked} onChange={() => toggleItem(id)} />
              <SoftBox minWidth={0}>
                <SoftBox display="flex" gap={0.75} alignItems="center" flexWrap="wrap">
                  <SoftTypography variant="button" fontWeight="bold">
                    {item.name}
                  </SoftTypography>
                  <SoftBox
                    component="span"
                    px={0.8}
                    py={0.2}
                    borderRadius={1}
                    sx={{ bgcolor: "#eaf2fb", color: "#0d47a1", fontSize: 11, fontWeight: 800 }}
                  >
                    {item.code}
                  </SoftBox>
                </SoftBox>
                <SoftTypography variant="caption" color="text">
                  Đơn vị: {item.unit || "—"}
                  {type === "SLOW_MOVING"
                    ? " · Không phát sinh bán trong 60 ngày"
                    : ` · Cần bổ sung tối thiểu: ${number(missing)}`}
                </SoftTypography>
              </SoftBox>
              <SoftBox
                display="flex"
                gap={{ xs: 2, md: 3 }}
                alignItems="center"
                justifyContent={{ xs: "space-between", md: "flex-end" }}
                sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, pl: { xs: 6.5, md: 0 } }}
              >
                <SoftBox textAlign={{ xs: "left", md: "right" }}>
                  <SoftTypography variant="caption" color="text">
                    Tồn hiện tại
                  </SoftTypography>
                  <SoftTypography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ color: outOfStock ? "#c62828" : "#ed6c02" }}
                  >
                    {number(item.stock)} {item.unit || ""}
                  </SoftTypography>
                </SoftBox>
                <SoftBox textAlign="right">
                  <SoftTypography variant="caption" color="text">
                    Tồn tối thiểu
                  </SoftTypography>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {number(item.minStock)}
                  </SoftTypography>
                </SoftBox>
              </SoftBox>
            </SoftBox>
          );
        })}
      </SoftBox>

      <PrintPreviewDialog
        open={Boolean(preview)}
        title="Cảnh báo tồn kho"
        html={preview?.html || ""}
        description={`${selectedRows.length} sản phẩm đã chọn. Kiểm tra nội dung trước khi lưu PDF hoặc tải ảnh.`}
        onDownloadImage={() => createInventoryAlertCanvasImage({ rows: selectedRows, type })}
        onClose={() => setPreview(null)}
      />
    </SoftBox>
  );
}
