import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import FormControl from "@mui/material/FormControl";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import EmployeeKpiService from "services/employeeKpiService";
import { PromotionService } from "services/crmService";
import { CategoryService, ProductService } from "services/warehouseService";
import { toast } from "react-toastify";

const METRICS = {
  PROMOTION_ACTIVATION_COUNT: "Số mã khuyến mãi kích hoạt",
  PRODUCT_REVENUE: "Doanh thu nhóm sản phẩm",
  TOTAL_REVENUE: "Tổng doanh thu",
  INVOICE_COUNT: "Số hóa đơn",
};
const MONEY_METRICS = ["PRODUCT_REVENUE", "TOTAL_REVENUE"];
const newTarget = () => ({
  metric: "PROMOTION_ACTIVATION_COUNT",
  targetValue: "",
  promotionId: "",
  scopeMode: "PRODUCT",
  productId: "",
  categoryId: "",
  productType: "",
});
const rowsOf = (response) => {
  const value = response?.data?.data;
  return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
};
const modalSx = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "94%", md: 760 },
  maxHeight: "90vh",
  overflowY: "auto",
  bgcolor: "background.paper",
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
};
const displayValue = (metric, value) =>
  MONEY_METRICS.includes(metric)
    ? `${Number(value || 0).toLocaleString("vi-VN")} ₫`
    : Number(value || 0).toLocaleString("vi-VN");

function KpiEvidenceModal({ open, kpi, targetIndex, onClose }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(1), [debouncedSearch, targetIndex]);
  useEffect(() => {
    if (!open || !kpi) return;
    setLoading(true);
    EmployeeKpiService.getEvidence(kpi.id || kpi._id, {
      targetIndex,
      search: debouncedSearch || undefined,
      page,
      limit: 20,
    })
      .then((response) => {
        setResult(response.data?.data || null);
        setMeta(response.data?.meta || { page: 1, totalPages: 1, total: 0 });
      })
      .catch((error) =>
        toast.error(error.response?.data?.message || "Không thể tải hóa đơn đóng góp KPI")
      )
      .finally(() => setLoading(false));
  }, [open, kpi, targetIndex, debouncedSearch, page]);
  const target = result?.target;
  const invoices = Array.isArray(result?.invoices) ? result.invoices : [];
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox sx={{ ...modalSx, width: { xs: "96%", lg: 980 } }}>
        <SoftTypography variant="h5" fontWeight="bold">
          Hóa đơn đóng góp KPI
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {result?.kpi?.name || kpi?.name} · {target ? METRICS[target.metric] || target.metric : ""}
        </SoftTypography>
        {target && (
          <SoftBox mt={2} p={2} bgcolor="#F3F8FF" borderRadius={2}>
            <SoftTypography variant="button" fontWeight="bold">
              Đã đạt {displayValue(target.metric, target.actualValue)} /{" "}
              {displayValue(target.metric, target.targetValue)}
            </SoftTypography>
          </SoftBox>
        )}
        <SoftBox mt={2}>
          <SoftInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm mã hóa đơn, khách hàng hoặc mã kích hoạt..."
            icon={{ component: "search", direction: "left" }}
          />
        </SoftBox>
        <SoftBox mt={2} sx={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8F9FA" }}>
                {[
                  "Hóa đơn",
                  "Ngày",
                  "Khách hàng",
                  "Giá trị đơn",
                  "Đóng góp KPI",
                  "Mã kích hoạt",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{ padding: 10, textAlign: "left", fontSize: 12, whiteSpace: "nowrap" }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ padding: 30, textAlign: "center" }}>
                    Đang tải...
                  </td>
                </tr>
              )}
              {!loading && !invoices.length && (
                <tr>
                  <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#9E9E9E" }}>
                    Không có hóa đơn đóng góp
                  </td>
                </tr>
              )}
              {!loading &&
                invoices.map((invoice) => (
                  <tr key={invoice.id || invoice._id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 10, fontSize: 13, fontWeight: 600 }}>{invoice.code}</td>
                    <td style={{ padding: 10, fontSize: 13 }}>
                      {invoice.date ? new Date(invoice.date).toLocaleDateString("vi-VN") : "—"}
                    </td>
                    <td style={{ padding: 10, fontSize: 13 }}>
                      {invoice.customerName || "Khách lẻ"}
                      <br />
                      <span style={{ color: "#6B7280" }}>{invoice.customerCode || ""}</span>
                    </td>
                    <td style={{ padding: 10, fontSize: 13 }}>
                      {displayValue("TOTAL_REVENUE", invoice.grandTotal)}
                    </td>
                    <td style={{ padding: 10, fontSize: 13, fontWeight: 600 }}>
                      {displayValue(target?.metric, invoice.contributionValue)}
                    </td>
                    <td style={{ padding: 10, fontSize: 12 }}>
                      {(invoice.activationCodes || []).map((activation) => (
                        <div key={activation.id || activation.code}>
                          {activation.code || activation}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </SoftBox>
        <SoftBox mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <SoftTypography variant="caption">Tổng {meta.total || 0} hóa đơn</SoftTypography>
          <SoftBox display="flex" gap={1}>
            <SoftButton
              size="small"
              variant="outlined"
              color="info"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Trước
            </SoftButton>
            <SoftTypography variant="caption" px={1} pt={1}>
              Trang {page}/{meta.totalPages || 1}
            </SoftTypography>
            <SoftButton
              size="small"
              variant="outlined"
              color="info"
              disabled={page >= (meta.totalPages || 1)}
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
            </SoftButton>
          </SoftBox>
        </SoftBox>
        <SoftButton fullWidth variant="outlined" color="secondary" sx={{ mt: 3 }} onClick={onClose}>
          Đóng
        </SoftButton>
      </SoftBox>
    </Modal>
  );
}

export function AssignKpiModal({ open, employee, kpi, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    from: "",
    to: "",
    note: "",
    status: "ACTIVE",
    targets: [newTarget()],
  });
  const [promotions, setPromotions] = useState([]);
  const [promotionSearch, setPromotionSearch] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open || !employee) return;
    setForm(
      kpi
        ? {
            name: kpi.name || "",
            from: String(kpi.from || "").slice(0, 10),
            to: String(kpi.to || "").slice(0, 10),
            note: kpi.note || "",
            status: kpi.status || "DRAFT",
            targets: (kpi.targets || []).map((target) => ({
              ...newTarget(),
              ...target,
              targetValue: target.targetValue || "",
              promotionId:
                target.promotionId?.id || target.promotionId?._id || target.promotionId || "",
              productId:
                target.productIds?.[0]?.id ||
                target.productIds?.[0]?._id ||
                target.productIds?.[0] ||
                "",
              categoryId:
                target.categoryIds?.[0]?.id ||
                target.categoryIds?.[0]?._id ||
                target.categoryIds?.[0] ||
                "",
              scopeMode: target.productIds?.length
                ? "PRODUCT"
                : target.categoryIds?.length
                ? "CATEGORY"
                : target.productType
                ? "PRODUCT_TYPE"
                : "ALL",
            })),
          }
        : {
            name: `KPI ${employee.fullName || employee.username}`,
            from: "",
            to: "",
            note: "",
            status: "ACTIVE",
            targets: [newTarget()],
          }
    );
    Promise.all([CategoryService.getAll(), ProductService.getAll({ page: 1, limit: 100 })])
      .then(([categoryResponse, productResponse]) => {
        setCategories(rowsOf(categoryResponse));
        setProducts(rowsOf(productResponse));
      })
      .catch(() => toast.error("Không thể tải danh mục cấu hình KPI"));
  }, [open, employee, kpi]);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      PromotionService.getOptions({
        search: promotionSearch.trim() || undefined,
        types: "BUY_X_GET_Y,BUNDLE_GIFT",
        statuses: form.status === "ACTIVE" ? "ACTIVE,SCHEDULED" : "ACTIVE,SCHEDULED,DRAFT",
        page: 1,
        limit: 20,
      })
        .then((response) => setPromotions(rowsOf(response)))
        .catch(() => setPromotions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, promotionSearch, form.status]);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      ProductService.getAll({
        search: productSearch.trim() || undefined,
        page: 1,
        limit: 30,
      })
        .then((response) => setProducts(rowsOf(response)))
        .catch(() => setProducts([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, productSearch]);
  const setTarget = (index, key, value) =>
    setForm((current) => ({
      ...current,
      targets: current.targets.map((target, targetIndex) =>
        targetIndex === index ? { ...target, [key]: value } : target
      ),
    }));
  const save = async () => {
    if (!form.from || !form.to) return toast.error("Vui lòng nhập thời gian KPI");
    if (new Date(form.from) > new Date(form.to))
      return toast.error("Ngày bắt đầu phải trước ngày kết thúc");
    if (form.targets.some((target) => Number(target.targetValue) <= 0))
      return toast.error("Mỗi chỉ tiêu phải có mục tiêu lớn hơn 0");
    if (
      form.targets.some(
        (target) => target.metric === "PROMOTION_ACTIVATION_COUNT" && !target.promotionId
      )
    )
      return toast.error("KPI mã kích hoạt phải chọn một chương trình cụ thể");
    if (
      form.targets.some(
        (target) =>
          target.metric === "PRODUCT_REVENUE" &&
          ((target.scopeMode === "PRODUCT" && !target.productId) ||
            (target.scopeMode === "CATEGORY" && !target.categoryId) ||
            (target.scopeMode === "PRODUCT_TYPE" && !target.productType.trim()))
      )
    )
      return toast.error("Vui lòng chọn đúng phạm vi sản phẩm cho KPI doanh thu");
    const targets = form.targets.map((target) => ({
      metric: target.metric,
      targetValue: Number(target.targetValue),
      ...(target.metric === "PROMOTION_ACTIVATION_COUNT" && target.promotionId
        ? { promotionId: target.promotionId }
        : {}),
      ...(target.metric === "PRODUCT_REVENUE" && target.categoryId
        ? { categoryIds: [target.categoryId] }
        : {}),
      ...(target.metric === "PRODUCT_REVENUE" && target.productId
        ? { productIds: [target.productId] }
        : {}),
      ...(target.metric === "PRODUCT_REVENUE" && target.productType.trim()
        ? { productType: target.productType.trim() }
        : {}),
    }));
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim() || undefined,
        employeeId: employee.id || employee._id,
        from: form.from,
        to: form.to,
        targets,
        status: form.status,
        note: form.note.trim() || undefined,
      };
      if (kpi) {
        const updatePayload = { ...payload };
        delete updatePayload.employeeId;
        delete updatePayload.status;
        await EmployeeKpiService.update(kpi.id || kpi._id, updatePayload);
        if (form.status !== kpi.status)
          await EmployeeKpiService.changeStatus(kpi.id || kpi._id, form.status);
      } else await EmployeeKpiService.create(payload);
      toast.success(kpi ? "Đã cập nhật KPI" : "Đã giao KPI cho nhân viên");
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể giao KPI");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox sx={modalSx}>
        <SoftTypography variant="h5" fontWeight="bold">
          {kpi ? "Cập nhật KPI" : "Giao KPI nhân viên"}
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {employee?.employeeCode} · {employee?.fullName || employee?.username}
        </SoftTypography>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12}>
            <SoftTypography variant="caption">Tên kỳ KPI (để trống để tự sinh)</SoftTypography>
            <SoftInput
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SoftTypography variant="caption">Từ ngày *</SoftTypography>
            <SoftInput
              type="date"
              value={form.from}
              onChange={(event) => setForm({ ...form, from: event.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SoftTypography variant="caption">Đến ngày *</SoftTypography>
            <SoftInput
              type="date"
              value={form.to}
              onChange={(event) => setForm({ ...form, to: event.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SoftTypography variant="caption">Trạng thái</SoftTypography>
            <SoftInput
              select
              value={form.status}
              onChange={(event) => {
                const nextStatus = event.target.value;
                setForm((current) => ({
                  ...current,
                  status: nextStatus,
                  targets: current.targets.map((target) => {
                    const selectedPromotion = promotions.find(
                      (promotion) => (promotion.id || promotion._id) === target.promotionId
                    );
                    return nextStatus === "ACTIVE" && selectedPromotion?.status === "DRAFT"
                      ? { ...target, promotionId: "" }
                      : target;
                  }),
                }));
              }}
            >
              <MenuItem value="DRAFT">Bản nháp</MenuItem>
              <MenuItem value="ACTIVE">Áp dụng ngay</MenuItem>
            </SoftInput>
          </Grid>
        </Grid>
        <SoftBox mt={3} display="flex" justifyContent="space-between">
          <SoftTypography variant="button" fontWeight="bold">
            Các chỉ tiêu
          </SoftTypography>
          <SoftButton
            size="small"
            variant="outlined"
            color="info"
            onClick={() =>
              setForm((current) => ({ ...current, targets: [...current.targets, newTarget()] }))
            }
          >
            <Icon>add</Icon>&nbsp;Thêm chỉ tiêu
          </SoftButton>
        </SoftBox>
        {form.targets.map((target, index) => (
          <SoftBox key={index} mt={2} p={2} sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center">
              <SoftTypography variant="caption" fontWeight="bold">
                Chỉ tiêu {index + 1}
              </SoftTypography>
              {form.targets.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      targets: current.targets.filter((_, targetIndex) => targetIndex !== index),
                    }))
                  }
                >
                  <Icon color="error">delete</Icon>
                </IconButton>
              )}
            </SoftBox>
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <SoftTypography variant="caption">Loại KPI *</SoftTypography>
                <FormControl fullWidth size="small">
                  <Select
                    value={target.metric}
                    onChange={(event) => setTarget(index, "metric", event.target.value)}
                  >
                    {Object.entries(METRICS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={5}>
                <SoftTypography variant="caption">
                  {MONEY_METRICS.includes(target.metric)
                    ? "Doanh thu mục tiêu (VNĐ) *"
                    : "Số lượng mục tiêu *"}
                </SoftTypography>
                <SoftInput
                  type="number"
                  value={target.targetValue}
                  onChange={(event) => setTarget(index, "targetValue", event.target.value)}
                  placeholder={
                    MONEY_METRICS.includes(target.metric) ? "Mục tiêu (đồng)" : "Số lượng mục tiêu"
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <SoftTypography variant="caption" color="text">
                  {target.metric === "PROMOTION_ACTIVATION_COUNT" &&
                    "Đếm số mã kích hoạt ACTIVE của chương trình được chọn."}
                  {target.metric === "PRODUCT_REVENUE" &&
                    "Tính doanh thu dòng hàng bán, không tính quà tặng."}
                  {target.metric === "TOTAL_REVENUE" &&
                    "Tính tổng doanh thu hóa đơn do nhân viên phụ trách."}
                  {target.metric === "INVOICE_COUNT" &&
                    "Đếm tổng số hóa đơn do nhân viên phụ trách."}
                </SoftTypography>
              </Grid>
              {target.metric === "PROMOTION_ACTIVATION_COUNT" && (
                <Grid item xs={12}>
                  <SoftTypography variant="caption">Chương trình bắt buộc *</SoftTypography>
                  <Autocomplete
                    options={promotions}
                    value={
                      promotions.find(
                        (promotion) => (promotion.id || promotion._id) === target.promotionId
                      ) || null
                    }
                    onChange={(_, promotion) =>
                      setTarget(
                        index,
                        "promotionId",
                        promotion ? promotion.id || promotion._id : ""
                      )
                    }
                    onInputChange={(_, value, reason) =>
                      reason === "input" && setPromotionSearch(value)
                    }
                    getOptionLabel={(promotion) =>
                      `${promotion.code || ""} - ${promotion.name || ""}`
                    }
                    isOptionEqualToValue={(option, value) =>
                      (option.id || option._id) === (value.id || value._id)
                    }
                    noOptionsText="Không tìm thấy chương trình tặng quà"
                    renderOption={(props, promotion) => (
                      <li {...props} key={promotion.id || promotion._id}>
                        <SoftBox>
                          <SoftTypography variant="button" fontWeight="medium">
                            {promotion.code} - {promotion.name}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            {promotion.type === "BUY_X_GET_Y"
                              ? "Mua X tặng Y"
                              : "Gói điều kiện tặng quà"}
                            {promotion.status ? ` · ${promotion.status}` : ""}
                          </SoftTypography>
                        </SoftBox>
                      </li>
                    )}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Tìm theo mã hoặc tên chương trình"
                      />
                    )}
                  />
                </Grid>
              )}
              {target.metric === "PRODUCT_REVENUE" && (
                <>
                  <Grid item xs={12}>
                    <SoftTypography variant="caption">Tính doanh thu theo *</SoftTypography>
                    <SoftInput
                      select
                      value={target.scopeMode}
                      onChange={(event) => {
                        setTarget(index, "scopeMode", event.target.value);
                        setTarget(index, "productId", "");
                        setTarget(index, "categoryId", "");
                        setTarget(index, "productType", "");
                      }}
                    >
                      <MenuItem value="PRODUCT">Một sản phẩm cụ thể</MenuItem>
                      <MenuItem value="CATEGORY">Một danh mục sản phẩm</MenuItem>
                      <MenuItem value="PRODUCT_TYPE">Một loại sản phẩm</MenuItem>
                      <MenuItem value="ALL">Tất cả sản phẩm bán ra</MenuItem>
                    </SoftInput>
                  </Grid>
                  {target.scopeMode === "PRODUCT" && (
                    <Grid item xs={12}>
                      <SoftTypography variant="caption">Sản phẩm *</SoftTypography>
                      <Autocomplete
                        options={products}
                        value={
                          products.find(
                            (product) => (product.id || product._id) === target.productId
                          ) || null
                        }
                        onChange={(_, product) =>
                          setTarget(index, "productId", product ? product.id || product._id : "")
                        }
                        onInputChange={(_, value, reason) =>
                          reason === "input" && setProductSearch(value)
                        }
                        getOptionLabel={(product) =>
                          `${product.code || ""} - ${product.name || ""}`
                        }
                        isOptionEqualToValue={(option, value) =>
                          (option.id || option._id) === (value.id || value._id)
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Tìm theo mã hoặc tên sản phẩm"
                          />
                        )}
                      />
                    </Grid>
                  )}
                  {target.scopeMode === "CATEGORY" && (
                    <Grid item xs={12}>
                      <SoftTypography variant="caption">Danh mục *</SoftTypography>
                      <SoftInput
                        select
                        value={target.categoryId}
                        onChange={(event) => setTarget(index, "categoryId", event.target.value)}
                      >
                        <MenuItem value="">Chọn danh mục</MenuItem>
                        {categories.map((category) => (
                          <MenuItem
                            key={category.id || category._id}
                            value={category.id || category._id}
                          >
                            {category.name}
                          </MenuItem>
                        ))}
                      </SoftInput>
                    </Grid>
                  )}
                  {target.scopeMode === "PRODUCT_TYPE" && (
                    <Grid item xs={12}>
                      <SoftTypography variant="caption">Loại sản phẩm *</SoftTypography>
                      <SoftInput
                        value={target.productType}
                        onChange={(event) => setTarget(index, "productType", event.target.value)}
                        placeholder="Loại sản phẩm, ví dụ: Sên"
                      />
                    </Grid>
                  )}
                </>
              )}
            </Grid>
          </SoftBox>
        ))}
        <SoftTypography variant="caption" display="block" mt={2}>
          Ghi chú
        </SoftTypography>
        <SoftInput
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
        />
        <SoftBox display="flex" gap={2} mt={3}>
          <SoftButton fullWidth variant="outlined" color="secondary" onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton fullWidth variant="gradient" color="info" disabled={saving} onClick={save}>
            {saving ? "Đang lưu..." : kpi ? "Lưu cập nhật" : "Giao KPI"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

export function KpiProgressModal({ open, employee, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    if (!open || !employee) return;
    setLoading(true);
    EmployeeKpiService.getForEmployee(employee.id || employee._id, { page: 1, limit: 100 })
      .then(async (response) =>
        Promise.all(
          rowsOf(response).map((kpi) =>
            EmployeeKpiService.getProgress(kpi.id || kpi._id).then(
              (progress) => progress.data?.data || kpi
            )
          )
        )
      )
      .then(setItems)
      .catch((error) => toast.error(error.response?.data?.message || "Không thể tải tiến độ KPI"))
      .finally(() => setLoading(false));
  }, [open, employee, refreshKey]);
  const removeKpi = async (kpi) => {
    if (!window.confirm(`Xóa kỳ KPI “${kpi.name}”?`)) return;
    try {
      await EmployeeKpiService.remove(kpi.id || kpi._id);
      toast.success("Đã xóa KPI");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa KPI");
    }
  };
  const changeKpiStatus = async (kpi, status) => {
    try {
      await EmployeeKpiService.changeStatus(kpi.id || kpi._id, status);
      toast.success("Đã cập nhật trạng thái KPI");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đổi trạng thái KPI");
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox sx={modalSx}>
        <SoftTypography variant="h5" fontWeight="bold">
          Tiến độ KPI
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {employee?.employeeCode} · {employee?.fullName || employee?.username}
        </SoftTypography>
        {loading && (
          <SoftTypography variant="button" display="block" mt={3}>
            Đang tổng hợp dữ liệu...
          </SoftTypography>
        )}
        {!loading && items.length === 0 && (
          <SoftTypography variant="button" color="text" display="block" mt={3}>
            Nhân viên chưa được giao KPI.
          </SoftTypography>
        )}
        {!loading &&
          items.map((kpi) => (
            <SoftBox
              key={kpi.id || kpi._id}
              mt={2}
              p={2.5}
              sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}
            >
              <SoftBox display="flex" justifyContent="space-between" gap={2}>
                <SoftBox>
                  <SoftTypography variant="button" fontWeight="bold">
                    {kpi.name}
                  </SoftTypography>
                  <SoftTypography variant="caption" display="block" color="text">
                    {new Date(kpi.from).toLocaleDateString("vi-VN")} -{" "}
                    {new Date(kpi.to).toLocaleDateString("vi-VN")}
                  </SoftTypography>
                </SoftBox>
                <SoftBox textAlign="right">
                  <SoftTypography variant="caption" fontWeight="bold" display="block">
                    {kpi.status}
                  </SoftTypography>
                  <Tooltip title="Cập nhật KPI">
                    <IconButton size="small" onClick={() => setEditingKpi(kpi)}>
                      <Icon color="info">edit</Icon>
                    </IconButton>
                  </Tooltip>
                  {kpi.status === "DRAFT" && (
                    <Tooltip title="Kích hoạt KPI">
                      <IconButton size="small" onClick={() => changeKpiStatus(kpi, "ACTIVE")}>
                        <Icon color="success">play_arrow</Icon>
                      </IconButton>
                    </Tooltip>
                  )}
                  {kpi.status === "ACTIVE" && (
                    <Tooltip title="Đánh dấu hoàn thành">
                      <IconButton size="small" onClick={() => changeKpiStatus(kpi, "COMPLETED")}>
                        <Icon color="success">check_circle</Icon>
                      </IconButton>
                    </Tooltip>
                  )}
                  {!["COMPLETED", "CANCELLED"].includes(kpi.status) && (
                    <Tooltip title="Hủy KPI">
                      <IconButton size="small" onClick={() => changeKpiStatus(kpi, "CANCELLED")}>
                        <Icon color="warning">cancel</Icon>
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Xóa KPI">
                    <IconButton size="small" onClick={() => removeKpi(kpi)}>
                      <Icon color="error">delete</Icon>
                    </IconButton>
                  </Tooltip>
                </SoftBox>
              </SoftBox>
              {(kpi.targets || []).map((target, index) => {
                const percent = Math.min(Number(target.progressPercent || 0), 100);
                return (
                  <SoftBox key={`${target.metric}-${index}`} mt={2}>
                    <SoftBox display="flex" justifyContent="space-between" gap={2}>
                      <SoftTypography variant="caption">
                        {METRICS[target.metric] || target.metric}
                      </SoftTypography>
                      <SoftTypography variant="caption" fontWeight="bold">
                        {displayValue(target.metric, target.actualValue)} /{" "}
                        {displayValue(target.metric, target.targetValue)} (
                        {Number(target.progressPercent || 0).toLocaleString("vi-VN")}%)
                      </SoftTypography>
                    </SoftBox>
                    <LinearProgress
                      variant="determinate"
                      value={percent}
                      color={percent >= 100 ? "success" : "info"}
                      sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                    />
                    <SoftButton
                      size="small"
                      variant="text"
                      color="info"
                      sx={{ mt: 0.5 }}
                      onClick={() => setEvidence({ kpi, targetIndex: index })}
                    >
                      Xem hóa đơn đóng góp
                    </SoftButton>
                  </SoftBox>
                );
              })}
            </SoftBox>
          ))}
        <SoftButton fullWidth variant="outlined" color="secondary" sx={{ mt: 3 }} onClick={onClose}>
          Đóng
        </SoftButton>
        <AssignKpiModal
          open={Boolean(editingKpi)}
          employee={employee}
          kpi={editingKpi}
          onClose={() => setEditingKpi(null)}
          onSaved={() => {
            setEditingKpi(null);
            setRefreshKey((value) => value + 1);
          }}
        />
        <KpiEvidenceModal
          open={Boolean(evidence)}
          kpi={evidence?.kpi}
          targetIndex={evidence?.targetIndex || 0}
          onClose={() => setEvidence(null)}
        />
      </SoftBox>
    </Modal>
  );
}
