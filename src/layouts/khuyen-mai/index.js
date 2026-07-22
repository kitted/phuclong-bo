import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Pagination from "@mui/material/Pagination";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Tooltip from "@mui/material/Tooltip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import { CategoryService, ProductService } from "services/warehouseService";
import { CustomerService, PromotionService, PRODUCT_TYPES } from "services/crmService";
import { toast } from "react-toastify";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);
const EMPTY = {
  code: "",
  name: "",
  type: "VOUCHER",
  discountType: "PERCENT",
  discountValue: 10,
  maxDiscount: 0,
  scope: "ALL",
  categoryIds: [],
  productType: "",
  productIds: [],
  voucherPrefix: "",
  quantity: 100,
  usageLimitPerCustomer: 1,
  minOrderValue: 0,
  startAt: "",
  endAt: "",
  status: "DRAFT",
};
const statusStyle = {
  ACTIVE: ["Đang chạy", "#2E7D32", "#E8F5E9"],
  SCHEDULED: ["Sắp diễn ra", "#1565C0", "#E3F2FD"],
  PAUSED: ["Tạm dừng", "#E65100", "#FFF3E0"],
  ENDED: ["Đã kết thúc", "#6B7280", "#F3F4F6"],
  DRAFT: ["Bản nháp", "#6A1B9A", "#F3E5F5"],
};
const pill = (status) => {
  const value = statusStyle[status] || statusStyle.DRAFT;
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: value[1],
        background: value[2],
      }}
    >
      {value[0]}
    </span>
  );
};

function FormGridField({ label, children, xs = 12, md = 6 }) {
  return (
    <Grid item xs={xs} md={md}>
      <SoftTypography variant="caption" fontWeight="medium">
        {label}
      </SoftTypography>
      {children}
    </Grid>
  );
}

function MultiSelectField({ value, onChange, options, placeholder }) {
  const safeValue = Array.isArray(value) ? value : [];
  const safeOptions = Array.isArray(options) ? options : [];
  return (
    <FormControl fullWidth size="small">
      <Select
        multiple
        value={safeValue}
        onChange={(event) => onChange(event.target.value)}
        displayEmpty
        renderValue={(selected) =>
          Array.isArray(selected) && selected.length
            ? selected
                .map(
                  (id) =>
                    safeOptions.find((item) => String(item.id || item._id) === String(id))?.name
                )
                .filter(Boolean)
                .join(", ")
            : placeholder
        }
      >
        {safeOptions.map((item) => (
          <MenuItem key={item.id || item._id} value={item.id || item._id}>
            {item.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function PromotionForm({ open, promotion, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm(
      promotion
        ? {
            ...EMPTY,
            ...promotion,
            categoryIds: (promotion.categoryIds || []).map((item) => item?.id || item?._id || item),
            productIds: (promotion.productIds || []).map((item) => item?.id || item?._id || item),
            startAt: promotion.startAt
              ? new Date(promotion.startAt).toISOString().slice(0, 16)
              : "",
            endAt: promotion.endAt ? new Date(promotion.endAt).toISOString().slice(0, 16) : "",
          }
        : EMPTY
    );
    if (open)
      Promise.all([CategoryService.getAll(), ProductService.getAll()])
        .then(([categoryResponse, productResponse]) => {
          const categoryData = categoryResponse?.data?.data || categoryResponse?.data || [];
          const productData = productResponse?.data?.data || productResponse?.data || [];
          setCategories(Array.isArray(categoryData) ? categoryData : []);
          setProducts(Array.isArray(productData) ? productData : []);
        })
        .catch(() => toast.error("Không thể tải danh mục sản phẩm"));
  }, [open, promotion]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (status = form.status) => {
    if (!form.code.trim() || !form.name.trim())
      return toast.error("Vui lòng nhập mã và tên chương trình");
    if (!form.startAt || !form.endAt || new Date(form.endAt) <= new Date(form.startAt))
      return toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
    if (form.scope === "CATEGORY" && !(form.categoryIds || []).length)
      return toast.error("Vui lòng chọn ít nhất một danh mục");
    if (form.scope === "PRODUCT_TYPE" && !form.productType)
      return toast.error("Vui lòng chọn loại sản phẩm");
    if (form.scope === "PRODUCTS" && !(form.productIds || []).length)
      return toast.error("Vui lòng chọn ít nhất một sản phẩm");
    if (form.type === "VOUCHER" && (!form.voucherPrefix.trim() || Number(form.quantity) <= 0))
      return toast.error("Voucher cần tiền tố mã và số lượng phát hành");
    try {
      setSaving(true);
      const payload = {
        ...form,
        status,
        discountValue: Number(form.discountValue),
        maxDiscount: Number(form.maxDiscount),
        quantity: Number(form.quantity),
        usageLimitPerCustomer: Number(form.usageLimitPerCustomer),
        minOrderValue: Number(form.minOrderValue),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      };
      if (promotion?.id) await PromotionService.update(promotion.id, payload);
      else await PromotionService.create(payload);
      toast.success(status === "DRAFT" ? "Đã lưu bản nháp" : "Đã lưu chương trình khuyến mãi");
      onSaved(!promotion);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu chương trình");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "95%", lg: 920 },
          maxHeight: "92vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          {promotion ? "Cập nhật chương trình" : "Thiết lập chương trình khuyến mãi"}
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          Cấu hình ưu đãi, phạm vi sản phẩm, voucher và thời gian áp dụng
        </SoftTypography>
        <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
          1. Thông tin chương trình
        </SoftTypography>
        <Grid container spacing={2}>
          <FormGridField label="Mã chương trình *" md={4}>
            <SoftInput
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Tên chương trình *" md={8}>
            <SoftInput value={form.name} onChange={(e) => set("name", e.target.value)} fullWidth />
          </FormGridField>
          <FormGridField label="Cơ chế áp dụng">
            <FormControl fullWidth size="small">
              <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
                <MenuItem value="VOUCHER">Phát hành voucher</MenuItem>
                <MenuItem value="AUTO_DISCOUNT">Tự động giảm giá</MenuItem>
              </Select>
            </FormControl>
          </FormGridField>
          <FormGridField label="Loại ưu đãi">
            <FormControl fullWidth size="small">
              <Select
                value={form.discountType}
                onChange={(e) => set("discountType", e.target.value)}
              >
                <MenuItem value="PERCENT">Giảm theo phần trăm</MenuItem>
                <MenuItem value="FIXED">Giảm số tiền cố định</MenuItem>
              </Select>
            </FormControl>
          </FormGridField>
          <FormGridField
            label={form.discountType === "PERCENT" ? "Mức giảm (%)" : "Số tiền giảm"}
            md={4}
          >
            <SoftInput
              type="number"
              value={form.discountValue}
              onChange={(e) => set("discountValue", e.target.value)}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Giảm tối đa" md={4}>
            <SoftInput
              type="number"
              value={form.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
              disabled={form.discountType === "FIXED"}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Giá trị đơn tối thiểu" md={4}>
            <SoftInput
              type="number"
              value={form.minOrderValue}
              onChange={(e) => set("minOrderValue", e.target.value)}
              fullWidth
            />
          </FormGridField>
        </Grid>
        <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
          2. Phạm vi sản phẩm
        </SoftTypography>
        <Grid container spacing={2}>
          <FormGridField label="Áp dụng cho" md={4}>
            <FormControl fullWidth size="small">
              <Select value={form.scope} onChange={(e) => set("scope", e.target.value)}>
                <MenuItem value="ALL">Tất cả sản phẩm</MenuItem>
                <MenuItem value="CATEGORY">Theo danh mục</MenuItem>
                <MenuItem value="PRODUCT_TYPE">Theo loại sản phẩm</MenuItem>
                <MenuItem value="PRODUCTS">Nhiều sản phẩm chỉ định</MenuItem>
              </Select>
            </FormControl>
          </FormGridField>
          {form.scope === "CATEGORY" && (
            <FormGridField label="Danh mục áp dụng" md={8}>
              <MultiSelectField
                value={form.categoryIds}
                onChange={(value) => set("categoryIds", value)}
                options={categories}
                placeholder="Chọn danh mục"
              />
            </FormGridField>
          )}
          {form.scope === "PRODUCT_TYPE" && (
            <FormGridField label="Loại sản phẩm" md={8}>
              <FormControl fullWidth size="small">
                <Select
                  value={form.productType}
                  onChange={(e) => set("productType", e.target.value)}
                >
                  {PRODUCT_TYPES.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormGridField>
          )}
          {form.scope === "PRODUCTS" && (
            <FormGridField label="Sản phẩm áp dụng" md={8}>
              <MultiSelectField
                value={form.productIds}
                onChange={(value) => set("productIds", value)}
                options={products}
                placeholder="Chọn nhiều sản phẩm"
              />
            </FormGridField>
          )}
        </Grid>
        {form.type === "VOUCHER" && (
          <>
            <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
              3. Thiết lập voucher
            </SoftTypography>
            <Grid container spacing={2}>
              <FormGridField label="Tiền tố mã voucher" md={4}>
                <SoftInput
                  value={form.voucherPrefix}
                  onChange={(e) => set("voucherPrefix", e.target.value.toUpperCase())}
                  placeholder="VD: SUMMER"
                  fullWidth
                />
              </FormGridField>
              <FormGridField label="Số lượng phát hành" md={4}>
                <SoftInput
                  type="number"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  fullWidth
                />
              </FormGridField>
              <FormGridField label="Lượt dùng / khách" md={4}>
                <SoftInput
                  type="number"
                  value={form.usageLimitPerCustomer}
                  onChange={(e) => set("usageLimitPerCustomer", e.target.value)}
                  fullWidth
                />
              </FormGridField>
            </Grid>
          </>
        )}
        <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
          {form.type === "VOUCHER" ? "4" : "3"}. Thời gian hiệu lực
        </SoftTypography>
        <Grid container spacing={2}>
          <FormGridField label="Bắt đầu">
            <SoftInput
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => set("startAt", e.target.value)}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Kết thúc">
            <SoftInput
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => set("endAt", e.target.value)}
              fullWidth
            />
          </FormGridField>
        </Grid>
        <SoftBox display="flex" justifyContent="flex-end" gap={1.5} mt={4}>
          <SoftButton variant="outlined" color="secondary" onClick={onClose}>
            Hủy
          </SoftButton>
          {!promotion && (
            <SoftButton
              variant="outlined"
              color="info"
              disabled={saving}
              onClick={() => save("DRAFT")}
            >
              Lưu nháp
            </SoftButton>
          )}
          <SoftButton
            variant="gradient"
            color="info"
            disabled={saving}
            onClick={() =>
              save(
                promotion
                  ? form.status
                  : new Date(form.startAt) > new Date()
                  ? "SCHEDULED"
                  : "ACTIVE"
              )
            }
          >
            {saving ? "Đang lưu..." : promotion ? "Lưu thay đổi" : "Lưu & kích hoạt"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function AssignVoucherModal({ promotion, open, onClose, onAssigned }) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      CustomerService.getAll({ search: search || undefined, page: 1, limit: 20 })
        .then((response) => setCustomers(response.data?.data || []))
        .catch(() => setCustomers([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, search]);
  const assign = async () => {
    if (!customerId) return toast.error("Vui lòng chọn khách hàng");
    try {
      setSaving(true);
      const response = await PromotionService.assignVoucher(promotion.id, customerId);
      toast.success(`Đã cấp voucher ${response.data?.data?.code || ""}`);
      setCustomerId("");
      onAssigned();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cấp voucher");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "92%", md: 520 },
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 3,
        }}
      >
        <SoftTypography variant="h6" fontWeight="bold">
          Cấp voucher cho khách hàng
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {promotion?.name} · Còn{" "}
          {Math.max(0, Number(promotion?.quantity || 0) - Number(promotion?.activated || 0))}{" "}
          voucher
        </SoftTypography>
        <SoftBox mt={2}>
          <SoftInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã, tên hoặc số điện thoại..."
            icon={{ component: "search", direction: "left" }}
          />
        </SoftBox>
        <SoftBox mt={2}>
          <FormControl fullWidth size="small">
            <Select displayEmpty value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <MenuItem value="">Chọn khách hàng</MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.code} · {customer.name} · {customer.phone}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </SoftBox>
        <SoftBox display="flex" gap={1} mt={3}>
          <SoftButton fullWidth variant="outlined" color="secondary" onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton fullWidth variant="gradient" color="info" disabled={saving} onClick={assign}>
            {saving ? "Đang cấp..." : "Cấp voucher"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function PromotionPerformance({ promotion, onClose }) {
  const [performance, setPerformance] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!promotion?.id) return;
    setLoading(true);
    Promise.all([
      PromotionService.getPerformance(promotion.id),
      PromotionService.getInvoices(promotion.id, { page: 1, limit: 20 }),
    ])
      .then(([performanceResponse, invoicesResponse]) => {
        setPerformance(performanceResponse.data?.data || {});
        const data = invoicesResponse.data?.data || [];
        setInvoices(Array.isArray(data) ? data : data.items || data.docs || []);
      })
      .catch((error) =>
        toast.error(error.response?.data?.message || "Không thể tải hiệu quả chương trình")
      )
      .finally(() => setLoading(false));
  }, [promotion]);
  return (
    <Modal open={Boolean(promotion)} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "95%", md: 780 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          Hiệu quả chương trình
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {promotion?.code} · {promotion?.name}
        </SoftTypography>
        {loading ? (
          <SoftTypography display="block" mt={3}>
            Đang tải...
          </SoftTypography>
        ) : (
          <>
            <Grid container spacing={2} mt={1}>
              {[
                ["Số hóa đơn", performance.invoiceCount || 0],
                ["Doanh thu gộp", money(performance.grossRevenue)],
                ["Tổng tiền giảm", money(performance.discountAmount)],
                ["Doanh thu thuần", money(performance.netRevenue)],
                ["Khách hàng", performance.uniqueCustomers || 0],
              ].map(([label, value]) => (
                <Grid item xs={6} md key={label}>
                  <SoftBox p={2} bgcolor="#F8F9FA" borderRadius={2}>
                    <SoftTypography variant="caption" color="text">
                      {label}
                    </SoftTypography>
                    <SoftTypography variant="h6" fontWeight="bold">
                      {value}
                    </SoftTypography>
                  </SoftBox>
                </Grid>
              ))}
            </Grid>
            <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
              Hóa đơn đã áp dụng
            </SoftTypography>
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Mã HĐ", "Ngày", "Khách hàng", "Mã voucher", "Tổng tiền", "Đã giảm"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{ padding: 10, textAlign: "left", fontSize: 12, color: "#6B7280" }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {!invoices.length && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ padding: 30, textAlign: "center", color: "#9E9E9E" }}
                      >
                        Chưa có hóa đơn áp dụng
                      </td>
                    </tr>
                  )}
                  {invoices.map((invoice) => (
                    <tr key={invoice.id || invoice._id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 10, fontSize: 13, fontWeight: 600 }}>{invoice.code}</td>
                      <td style={{ padding: 10, fontSize: 13 }}>
                        {new Date(invoice.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td style={{ padding: 10, fontSize: 13 }}>
                        {invoice.customerId?.name || invoice.customer || "Khách lẻ"}
                      </td>
                      <td style={{ padding: 10, fontSize: 13 }}>{invoice.voucherCode || "—"}</td>
                      <td style={{ padding: 10, fontSize: 13 }}>
                        {money(invoice.grandTotal ?? invoice.totalAmount)}
                      </td>
                      <td style={{ padding: 10, fontSize: 13, color: "#2E7D32" }}>
                        {money(invoice.discountAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SoftBox>
          </>
        )}
        <SoftButton variant="outlined" color="secondary" fullWidth sx={{ mt: 3 }} onClick={onClose}>
          Đóng
        </SoftButton>
      </SoftBox>
    </Modal>
  );
}

export default function KhuyenMai() {
  const [promotions, setPromotions] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [meta, setMeta] = useState({ totalPages: 1, totalItems: 0 });
  const [selected, setSelected] = useState(null);
  const [voucherPromotion, setVoucherPromotion] = useState(null);
  const [performancePromotion, setPerformancePromotion] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(1), [debouncedSearch, status, type]);
  const load = () => {
    setLoading(true);
    Promise.all([
      PromotionService.getAll({
        search: debouncedSearch || undefined,
        status: status || undefined,
        type: type || undefined,
        page,
        limit: 20,
      }),
      PromotionService.getSummary(),
    ])
      .then(([listResponse, summaryResponse]) => {
        setPromotions(listResponse.data?.data || []);
        setMeta(listResponse.data?.meta || { totalPages: 1, totalItems: 0 });
        setSummary(summaryResponse.data?.data || {});
      })
      .catch((error) => {
        setPromotions([]);
        toast.error(error.response?.data?.message || "Không thể tải chương trình khuyến mãi");
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, debouncedSearch, status, type, refreshKey]);
  const refresh = (firstPage = false) => {
    if (firstPage) setPage(1);
    setRefreshKey((value) => value + 1);
  };
  const scopeLabel = (item) =>
    item.scope === "ALL"
      ? "Tất cả sản phẩm"
      : item.scope === "CATEGORY"
      ? `${(item.categoryIds || []).length} danh mục`
      : item.scope === "PRODUCT_TYPE"
      ? `Loại: ${item.productType || "—"}`
      : `${(item.productIds || []).length} sản phẩm`;
  const editPromotion = async (item) => {
    try {
      const response = await PromotionService.getById(item.id);
      setSelected(response.data?.data);
      setOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải chi tiết chương trình");
    }
  };
  const nextStatus = (item) => {
    const now = new Date();
    const started = now >= new Date(item.startAt);
    const notEnded = now <= new Date(item.endAt);
    if (item.status === "ACTIVE") return "PAUSED";
    if (item.status === "PAUSED") return started && notEnded ? "ACTIVE" : null;
    if (item.status === "DRAFT")
      return started && notEnded ? "ACTIVE" : !started ? "SCHEDULED" : null;
    if (item.status === "SCHEDULED") return started && notEnded ? "ACTIVE" : "PAUSED";
    return null;
  };
  const changeStatus = async (item) => {
    const next = nextStatus(item);
    if (!next) return;
    try {
      await PromotionService.changeStatus(item.id, next);
      toast.success(
        next === "ACTIVE"
          ? "Đã kích hoạt chương trình"
          : next === "SCHEDULED"
          ? "Đã lên lịch chương trình"
          : "Đã tạm dừng chương trình"
      );
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đổi trạng thái chương trình");
    }
  };
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
          {[
            ["Tổng chương trình", summary.totalPrograms || 0, "local_offer", "#1565C0"],
            ["Đang chạy", summary.active || 0, "play_circle", "#2E7D32"],
            ["Sắp diễn ra", summary.scheduled || 0, "schedule", "#7B1FA2"],
            ["Voucher đã dùng", summary.usedVouchers || 0, "confirmation_number", "#E65100"],
          ].map(([label, value, icon, color]) => (
            <Card key={label} sx={{ flex: 1, minWidth: 180 }}>
              <SoftBox p={2.5} display="flex" gap={2} alignItems="center">
                <Icon sx={{ color }}>{icon}</Icon>
                <SoftBox>
                  <SoftTypography variant="caption">{label}</SoftTypography>
                  <SoftTypography variant="h5" fontWeight="bold" sx={{ color }}>
                    {value}
                  </SoftTypography>
                </SoftBox>
              </SoftBox>
            </Card>
          ))}
        </SoftBox>
        <Card>
          <SoftBox p={3}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <SoftBox>
                <SoftTypography variant="h5" fontWeight="bold">
                  Chương trình khuyến mãi
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Gói ưu đãi theo danh mục, loại và sản phẩm
                </SoftTypography>
              </SoftBox>
              <SoftButton
                color="info"
                variant="gradient"
                startIcon={<Icon>add</Icon>}
                onClick={() => {
                  setSelected(null);
                  setOpen(true);
                }}
              >
                Tạo chương trình
              </SoftButton>
            </SoftBox>
            <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
              <SoftBox sx={{ flex: 1, minWidth: 230 }}>
                <SoftInput
                  placeholder="Tìm mã hoặc tên chương trình..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select displayEmpty value={status} onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="">Mọi trạng thái</MenuItem>
                  {Object.entries(statusStyle).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value[0]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select displayEmpty value={type} onChange={(e) => setType(e.target.value)}>
                  <MenuItem value="">Mọi cơ chế</MenuItem>
                  <MenuItem value="VOUCHER">Voucher</MenuItem>
                  <MenuItem value="AUTO_DISCOUNT">Tự động giảm giá</MenuItem>
                </Select>
              </FormControl>
            </SoftBox>
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {[
                      "Chương trình",
                      "Ưu đãi",
                      "Phạm vi",
                      "Thời gian",
                      "Đã cấp / Đã dùng",
                      "Trạng thái",
                      "",
                    ].map((item, index) => (
                      <th
                        key={`${item}-${index}`}
                        style={{ padding: 10, textAlign: "left", fontSize: 12, color: "#6B7280" }}
                      >
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 30 }}>
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loading && promotions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ textAlign: "center", padding: 30, color: "#9E9E9E" }}
                      >
                        Không tìm thấy chương trình
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    promotions.map((item) => {
                      const next = nextStatus(item);
                      const canAssign =
                        item.type === "VOUCHER" &&
                        ["ACTIVE", "SCHEDULED"].includes(item.status) &&
                        Number(item.activated) < Number(item.quantity);
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: 10 }}>
                            <SoftTypography variant="button" fontWeight="bold">
                              {item.name}
                            </SoftTypography>
                            <SoftTypography variant="caption" color="text" display="block">
                              {item.code} · {item.type === "VOUCHER" ? "Voucher" : "Tự động"}
                            </SoftTypography>
                          </td>
                          <td style={{ padding: 10, fontSize: 13, fontWeight: 600 }}>
                            {item.discountType === "PERCENT"
                              ? `${item.discountValue}%${
                                  item.maxDiscount ? ` · tối đa ${money(item.maxDiscount)}` : ""
                                }`
                              : money(item.discountValue)}
                            <br />
                            <span style={{ fontSize: 11, color: "#6B7280" }}>
                              Đơn từ {money(item.minOrderValue)}
                            </span>
                          </td>
                          <td style={{ padding: 10, fontSize: 13 }}>{scopeLabel(item)}</td>
                          <td style={{ padding: 10, fontSize: 12 }}>
                            {new Date(item.startAt).toLocaleString("vi-VN")}
                            <br />→ {new Date(item.endAt).toLocaleString("vi-VN")}
                          </td>
                          <td style={{ padding: 10, fontSize: 13 }}>
                            {item.activated || 0} / <b>{item.used || 0}</b>
                            {item.type === "VOUCHER" && (
                              <span style={{ fontSize: 11, color: "#6B7280" }}>
                                {" "}
                                / {item.quantity}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: 10 }}>{pill(item.status)}</td>
                          <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                            <Tooltip title="Hiệu quả và hóa đơn áp dụng">
                              <IconButton onClick={() => setPerformancePromotion(item)}>
                                <Icon sx={{ color: "#2E7D32" }}>analytics</Icon>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Chỉnh sửa">
                              <IconButton onClick={() => editPromotion(item)}>
                                <Icon color="info">edit</Icon>
                              </IconButton>
                            </Tooltip>
                            {item.type === "VOUCHER" && (
                              <Tooltip
                                title={
                                  canAssign
                                    ? "Cấp voucher cho khách"
                                    : "Không thể cấp voucher lúc này"
                                }
                              >
                                <span>
                                  <IconButton
                                    disabled={!canAssign}
                                    onClick={() => setVoucherPromotion(item)}
                                  >
                                    <Icon sx={{ color: canAssign ? "#7B1FA2" : "#BDBDBD" }}>
                                      confirmation_number
                                    </Icon>
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip
                              title={
                                next
                                  ? next === "ACTIVE"
                                    ? "Kích hoạt"
                                    : next === "SCHEDULED"
                                    ? "Lên lịch"
                                    : "Tạm dừng"
                                  : "Không thể đổi trạng thái"
                              }
                            >
                              <span>
                                <IconButton disabled={!next} onClick={() => changeStatus(item)}>
                                  <Icon
                                    sx={{
                                      color: !next
                                        ? "#BDBDBD"
                                        : item.status === "ACTIVE" ||
                                          (item.status === "SCHEDULED" && next === "PAUSED")
                                        ? "#E65100"
                                        : "#2E7D32",
                                    }}
                                  >
                                    {next === "PAUSED"
                                      ? "pause_circle"
                                      : next === "SCHEDULED"
                                      ? "schedule"
                                      : "play_circle"}
                                  </Icon>
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
            {meta.totalPages > 1 && (
              <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
                <SoftTypography variant="caption" color="text">
                  Tổng {meta.totalItems} chương trình
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
      <PromotionForm
        open={open}
        promotion={selected}
        onClose={() => setOpen(false)}
        onSaved={(created) => refresh(created)}
      />
      <AssignVoucherModal
        promotion={voucherPromotion}
        open={Boolean(voucherPromotion)}
        onClose={() => setVoucherPromotion(null)}
        onAssigned={() => refresh()}
      />
      <PromotionPerformance
        promotion={performancePromotion}
        onClose={() => setPerformancePromotion(null)}
      />
    </DashboardLayout>
  );
}
