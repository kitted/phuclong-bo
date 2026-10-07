import { useCallback, useEffect, useMemo, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import Icon from "@mui/material/Icon";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import PrintPreviewDialog from "components/PrintPreviewDialog";
import { DashboardAnalyticsService } from "services/analyticsService";
import { buildNewCustomersDocument, createNewCustomersCanvasImage } from "utils/newCustomersExport";
import { toast } from "react-toastify";

const idOf = (item) => String(item?.id || item?._id || "");
const number = (value) => Number(value || 0).toLocaleString("vi-VN");
const date = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";

export default function NewCustomersTab() {
  const days = 45;
  const [invoiceCount, setInvoiceCount] = useState("ALL");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await DashboardAnalyticsService.newCustomers({
        days,
        invoiceCount,
        limit: 500,
      });
      const rows = response?.data?.data || [];
      setItems(Array.isArray(rows) ? rows : []);
      setSelected((Array.isArray(rows) ? rows : []).map(idOf).filter(Boolean));
    } catch (error) {
      setItems([]);
      setSelected([]);
      toast.error(error.response?.data?.message || "Không thể tải khách hàng mới");
    } finally {
      setLoading(false);
    }
  }, [invoiceCount]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    if (!keyword) return items;
    return items.filter((item) =>
      `${item.customerCode || ""} ${item.customerName || ""} ${item.phone || ""}`
        .toLocaleLowerCase("vi")
        .includes(keyword)
    );
  }, [items, search]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedRows = useMemo(
    () => filtered.filter((item) => selectedSet.has(idOf(item))),
    [filtered, selectedSet]
  );
  const visibleIds = filtered.map(idOf).filter(Boolean);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const toggleAll = () =>
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    );
  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  const reportRows = selectedRows;
  const ensureRows = () => {
    if (reportRows.length) return true;
    toast.warning("Hãy chọn ít nhất một khách hàng để xuất báo cáo");
    return false;
  };
  const openPreview = () => {
    if (!ensureRows()) return;
    setPreview(buildNewCustomersDocument({ rows: reportRows, days }));
  };
  const downloadImage = () => {
    if (!ensureRows()) return;
    createNewCustomersCanvasImage({ rows: reportRows, days });
    toast.success(`Đã tải ảnh báo cáo ${reportRows.length} khách hàng`);
  };
  const totalInvoices = reportRows.reduce((sum, item) => sum + Number(item.invoiceCount || 0), 0);
  const revenue = reportRows.reduce((sum, item) => sum + Number(item.totalRevenue || 0), 0);

  return (
    <SoftBox>
      <SoftBox display="flex" justifyContent="space-between" gap={1} flexWrap="wrap" mb={2}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold">
            Khách hàng mới trong 45 ngày
          </SoftTypography>
          <SoftTypography variant="caption" color="text">
            Lọc khách hàng có đúng 1 hoặc 2 hóa đơn phát sinh trong 45 ngày gần nhất.
          </SoftTypography>
        </SoftBox>
        <SoftButton color="info" variant="outlined" onClick={load} disabled={loading}>
          <Icon>refresh</Icon>&nbsp;{loading ? "Đang tải..." : "Cập nhật"}
        </SoftButton>
      </SoftBox>

      <SoftBox display="flex" gap={1} flexWrap="wrap" mb={1.5}>
        {[
          ["ALL", "Tất cả 1–2 đơn"],
          ["1", "Đúng 1 đơn"],
          ["2", "Đúng 2 đơn"],
        ].map(([value, label]) => (
          <SoftButton
            key={value}
            size="small"
            color={invoiceCount === value ? "info" : "secondary"}
            variant={invoiceCount === value ? "gradient" : "outlined"}
            onClick={() => setInvoiceCount(value)}
          >
            {label}
          </SoftButton>
        ))}
      </SoftBox>

      <SoftBox
        display="grid"
        gap={1}
        mb={2}
        sx={{ gridTemplateColumns: { xs: "1fr", md: "minmax(240px,1fr) repeat(3,160px)" } }}
      >
        <SoftInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm mã, tên hoặc số điện thoại..."
          icon={{ component: "search", direction: "left" }}
        />
        {[
          ["Đã chọn", number(reportRows.length)],
          ["Tổng hóa đơn", number(totalInvoices)],
          ["Doanh thu", `${number(revenue)} đ`],
        ].map(([label, value]) => (
          <SoftBox
            key={label}
            p={1.25}
            borderRadius={2}
            sx={{ bgcolor: "#eef6ff", border: "1px solid #cfe3fa" }}
          >
            <SoftTypography variant="caption" color="text">
              {label}
            </SoftTypography>
            <SoftTypography variant="h6" fontWeight="bold" color="info">
              {value}
            </SoftTypography>
          </SoftBox>
        ))}
      </SoftBox>

      <SoftBox
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        gap={1}
        flexWrap="wrap"
        p={1.25}
        mb={1}
        borderRadius={2}
        sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <SoftBox display="flex" alignItems="center">
          <Checkbox checked={allVisibleSelected} onChange={toggleAll} />
          <SoftTypography variant="button" fontWeight="bold">
            Chọn tất cả {filtered.length} khách hàng đang hiển thị
          </SoftTypography>
        </SoftBox>
        <SoftBox display="flex" gap={1} flexWrap="wrap">
          <SoftButton
            color="info"
            variant="gradient"
            disabled={!reportRows.length}
            onClick={openPreview}
          >
            <Icon>picture_as_pdf</Icon>&nbsp;Xem trước / Lưu PDF
          </SoftButton>
          <SoftButton
            color="dark"
            variant="gradient"
            disabled={!reportRows.length}
            onClick={downloadImage}
          >
            <Icon>image</Icon>&nbsp;Tải ảnh PNG
          </SoftButton>
        </SoftBox>
      </SoftBox>

      <SoftBox display="grid" gap={1}>
        {!loading && !filtered.length && (
          <SoftBox p={4} textAlign="center" borderRadius={2} sx={{ border: "1px dashed #cbd5e1" }}>
            <SoftTypography variant="button" color="text">
              Không có khách hàng phù hợp với bộ lọc.
            </SoftTypography>
          </SoftBox>
        )}
        {filtered.map((item) => {
          const id = idOf(item);
          const checked = selectedSet.has(id);
          return (
            <SoftBox
              key={id}
              component="label"
              display="grid"
              alignItems="center"
              gap={1.25}
              p={1.25}
              borderRadius={2}
              sx={{
                gridTemplateColumns: { xs: "auto minmax(0,1fr)", md: "auto minmax(0,1fr) auto" },
                border: checked ? "2px solid #1976d2" : "1px solid #e2e8f0",
                bgcolor: checked ? "#f2f8ff" : "#fff",
                cursor: "pointer",
              }}
            >
              <Checkbox checked={checked} onChange={() => toggle(id)} />
              <SoftBox minWidth={0}>
                <SoftTypography variant="button" fontWeight="bold" display="block">
                  {[item.customerCode, item.customerName].filter(Boolean).join(" · ")}
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {item.phone || "Chưa có SĐT"} · {item.address || "Chưa có địa chỉ"}
                </SoftTypography>
              </SoftBox>
              <SoftBox
                textAlign={{ xs: "left", md: "right" }}
                sx={{ gridColumn: { xs: "2", md: "auto" } }}
              >
                <SoftTypography variant="button" fontWeight="bold" color="info" display="block">
                  {item.invoiceCount} đơn · {number(item.totalRevenue)} đ
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {date(item.firstInvoiceAt)} → {date(item.latestInvoiceAt)}
                </SoftTypography>
              </SoftBox>
            </SoftBox>
          );
        })}
      </SoftBox>

      <PrintPreviewDialog
        open={Boolean(preview)}
        title="Báo cáo khách hàng mới 45 ngày"
        html={preview?.html || ""}
        description={`${reportRows.length} khách hàng đã chọn. Kiểm tra trước khi lưu PDF hoặc ảnh.`}
        onDownloadImage={() => createNewCustomersCanvasImage({ rows: reportRows, days })}
        onClose={() => setPreview(null)}
      />
    </SoftBox>
  );
}
