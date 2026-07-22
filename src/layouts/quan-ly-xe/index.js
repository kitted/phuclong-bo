import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import Pagination from "@mui/material/Pagination";
import Select from "@mui/material/Select";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { TruckService } from "services/warehouseService";
import { downloadBlob } from "utils/excel";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import StaffMobileHeader from "components/StaffMobileHeader";
import MobileLoadMore from "components/MobileLoadMore";

const EMPTY_TRUCK = { code: "", name: "", licensePlate: "", driverId: "", status: "active" };
const EMPTY_META = { totalPages: 1, totalItems: 0 };
const getId = (value) => value?.id || value?._id;
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  if (Array.isArray(value)) return value;
  return value?.items || value?.docs || [];
};
const metaOf = (response) => response?.data?.meta || unwrap(response)?.meta || EMPTY_META;
const productOf = (item) =>
  item?.product ||
  (typeof item?.productId === "object" ? item.productId : null) ||
  (item?.name || item?.code ? item : null) ||
  {};
const productIdOf = (item) => getId(productOf(item)) || item?.productId;
const quantityOf = (item) => Number(item?.qty ?? item?.quantity ?? 0);
const apiError = (error, fallback) => {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(", ") : message || fallback;
};
const money = (value = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
const date = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : "—";
const todayValue = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
};

function Field({ label, children, xs = 12, md = 6 }) {
  return (
    <Grid item xs={xs} md={md}>
      <SoftTypography variant="caption" fontWeight="medium">
        {label}
      </SoftTypography>
      {children}
    </Grid>
  );
}

function TruckModal({ open, onClose, truck, onSaved }) {
  const [form, setForm] = useState(EMPTY_TRUCK);
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const currentDriverId = getId(truck?.driver) || truck?.driverId || "";
    setForm(truck ? { ...EMPTY_TRUCK, ...truck, driverId: currentDriverId } : EMPTY_TRUCK);
    setLoadingDrivers(true);
    TruckService.getAvailableDrivers({ excludeTruckId: getId(truck) || undefined, limit: 100 })
      .then((response) => setDrivers(listOf(response)))
      .catch((error) => toast.error(apiError(error, "Không thể tải danh sách tài xế")))
      .finally(() => setLoadingDrivers(false));
  }, [open, truck]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!form.name?.trim() || !form.licensePlate?.trim())
      return toast.error("Vui lòng nhập tên xe và biển số");
    const payload = {
      code: form.code?.trim() || undefined,
      name: form.name.trim(),
      licensePlate: form.licensePlate.trim(),
      driverId: form.driverId || null,
    };
    try {
      setSaving(true);
      if (getId(truck)) await TruckService.update(getId(truck), payload);
      else await TruckService.create({ ...payload, status: form.status });
      toast.success(getId(truck) ? "Đã cập nhật xe" : "Đã thêm xe");
      onSaved(!getId(truck));
      onClose();
    } catch (error) {
      toast.error(apiError(error, "Không thể lưu xe"));
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
          width: { xs: "92%", md: 620 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          {truck ? "Cập nhật xe tải" : "Thêm xe tải"}
        </SoftTypography>
        <Grid container spacing={2} mt={1}>
          <Field label="Tên xe *">
            <SoftInput value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Mã xe">
            <SoftInput
              value={form.code || ""}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="Để trống để tự sinh"
            />
          </Field>
          <Field label="Biển số *">
            <SoftInput
              value={form.licensePlate || ""}
              onChange={(e) => set("licensePlate", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Trạng thái">
            <FormControl fullWidth size="small">
              <Select
                value={form.status || "active"}
                disabled={Boolean(truck)}
                onChange={(e) => set("status", e.target.value)}
              >
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="inactive">Ngừng hoạt động</MenuItem>
              </Select>
            </FormControl>
          </Field>
          <Field label="Tài xế" md={12}>
            <FormControl fullWidth size="small">
              <Select
                displayEmpty
                value={form.driverId || ""}
                disabled={loadingDrivers}
                onChange={(e) => set("driverId", e.target.value)}
              >
                <MenuItem value="">
                  <em>{loadingDrivers ? "Đang tải tài xế..." : "Chưa phân công"}</em>
                </MenuItem>
                {drivers.map((driver) => (
                  <MenuItem key={getId(driver)} value={getId(driver)}>
                    {driver.employeeCode ? `${driver.employeeCode} - ` : ""}
                    {driver.fullName || "Chưa cập nhật tên"}
                    {driver.phone ? ` · ${driver.phone}` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <SoftTypography variant="caption" color="text">
              Chỉ hiển thị nhân viên Staff đang hoạt động và chưa phụ trách xe khác.
            </SoftTypography>
          </Field>
        </Grid>
        <SoftBox display="flex" gap={2} mt={3}>
          <SoftButton variant="outlined" color="secondary" fullWidth onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton
            variant="gradient"
            color="info"
            fullWidth
            disabled={saving || loadingDrivers}
            onClick={save}
          >
            {saving ? "Đang lưu..." : "Lưu xe"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function TransferModal({ open, onClose, truck, type, onSaved }) {
  const [items, setItems] = useState([{ productId: "", qty: 1 }]);
  const [products, setProducts] = useState([]);
  const [code, setCode] = useState("");
  const [transferDate, setTransferDate] = useState(todayValue());
  const [note, setNote] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const isLoad = type === "LOAD";
  useEffect(() => {
    if (!open || !truck) return;
    setItems([{ productId: "", qty: 1 }]);
    setProducts([]);
    setCode("");
    setTransferDate(todayValue());
    setNote("");
    setLoadingProducts(true);
    if (isLoad)
      TruckService.getAvailableProducts({ limit: 1000 })
        .then((response) => setProducts(listOf(response)))
        .catch((error) => toast.error(apiError(error, "Không thể tải sản phẩm trong kho")))
        .finally(() => setLoadingProducts(false));
    else
      TruckService.getById(getId(truck))
        .then((response) =>
          setProducts(
            (unwrap(response)?.inventory || []).map((item) => ({
              ...productOf(item),
              id: productIdOf(item),
              stock: quantityOf(item),
            }))
          )
        )
        .catch((error) => toast.error(apiError(error, "Không thể tải tồn xe")))
        .finally(() => setLoadingProducts(false));
  }, [open, truck, isLoad]);
  const change = (index, key, value) =>
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  const save = async () => {
    const normalized = items.map((item) => ({ productId: item.productId, qty: Number(item.qty) }));
    if (normalized.some((item) => !item.productId || !Number.isInteger(item.qty) || item.qty <= 0))
      return toast.error("Sản phẩm và số lượng nguyên dương là bắt buộc");
    try {
      setSaving(true);
      const payload = {
        code: code.trim() || undefined,
        date: `${transferDate}T00:00:00+07:00`,
        note: note.trim() || undefined,
        items: normalized,
      };
      if (isLoad) await TruckService.loadGoods(getId(truck), payload);
      else await TruckService.returnGoods(getId(truck), payload);
      toast.success(isLoad ? "Đã xuất hàng lên xe" : "Đã hoàn hàng về kho");
      onSaved();
      onClose();
    } catch (error) {
      toast.error(apiError(error, isLoad ? "Không thể xuất hàng" : "Không thể hoàn hàng"));
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
          width: { xs: "94%", md: 650 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          {isLoad ? "Xuất hàng lên" : "Hoàn hàng từ"} {truck?.name}
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {isLoad
            ? "Kho chính sẽ được trừ sau khi phiếu thành công"
            : "Hàng trên xe sẽ được nhập lại kho chính"}
        </SoftTypography>
        <Grid container spacing={2} mt={0.5}>
          <Field label="Mã phiếu">
            <SoftInput
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Để trống để tự sinh"
            />
          </Field>
          <Field label="Ngày chứng từ *">
            <SoftInput
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </Field>
        </Grid>
        <SoftBox mt={2}>
          {loadingProducts && (
            <SoftTypography variant="caption" color="text" display="block" mb={1}>
              Đang tải danh sách sản phẩm...
            </SoftTypography>
          )}
          {items.map((item, index) => (
            <SoftBox key={index} display="flex" gap={1} mb={1.5}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <Select
                  displayEmpty
                  value={item.productId}
                  onChange={(e) => change(index, "productId", e.target.value)}
                >
                  <MenuItem value="">
                    <em>Chọn sản phẩm</em>
                  </MenuItem>
                  {!loadingProducts && products.length === 0 && (
                    <MenuItem disabled>Không có sản phẩm khả dụng</MenuItem>
                  )}
                  {products.map((product) => (
                    <MenuItem key={getId(product)} value={getId(product)}>
                      {product.code ? `${product.code} - ` : ""}
                      {product.name} (còn {product.stock ?? product.quantity ?? 0}{" "}
                      {product.unit || ""})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <SoftBox sx={{ flex: 1 }}>
                <SoftInput
                  type="number"
                  inputProps={{ min: 1, step: 1 }}
                  value={item.qty}
                  onChange={(e) => change(index, "qty", e.target.value)}
                />
              </SoftBox>
              <IconButton
                disabled={items.length === 1}
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              >
                <Icon color="error">remove_circle</Icon>
              </IconButton>
            </SoftBox>
          ))}
        </SoftBox>
        <SoftButton
          variant="text"
          color={isLoad ? "info" : "warning"}
          startIcon={<Icon>add</Icon>}
          onClick={() => setItems((current) => [...current, { productId: "", qty: 1 }])}
        >
          Thêm dòng
        </SoftButton>
        <SoftBox mt={2}>
          <SoftTypography variant="caption" fontWeight="medium">
            Ghi chú
          </SoftTypography>
          <SoftInput value={note} onChange={(e) => setNote(e.target.value)} />
        </SoftBox>
        <SoftBox display="flex" gap={2} mt={3}>
          <SoftButton variant="outlined" color="secondary" fullWidth onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton
            variant="gradient"
            color={isLoad ? "info" : "warning"}
            fullWidth
            disabled={saving || loadingProducts || !transferDate || products.length === 0}
            onClick={save}
          >
            {saving ? "Đang xử lý..." : isLoad ? "Xuất lên xe" : "Hoàn về kho"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function TruckToTruckModal({ open, onClose, sourceTruck, onSaved }) {
  const [destination, setDestination] = useState(null);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [destinations, setDestinations] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ productId: "", qty: 1 }]);
  const [transferDate, setTransferDate] = useState(todayValue());
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open || !sourceTruck) return;
    setDestination(null);
    setDestinationSearch("");
    setItems([{ productId: "", qty: 1 }]);
    setTransferDate(todayValue());
    setNote("");
    setPreview(null);
    TruckService.getById(getId(sourceTruck))
      .then((response) =>
        setProducts(
          (unwrap(response)?.inventory || []).map((item) => ({
            ...productOf(item),
            id: productIdOf(item),
            stock: quantityOf(item),
          }))
        )
      )
      .catch((error) => toast.error(apiError(error, "Không thể tải tồn xe nguồn")));
  }, [open, sourceTruck]);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setLoading(true);
      TruckService.getAll({
        search: destinationSearch.trim() || undefined,
        status: "active",
        page: 1,
        limit: 30,
        sortBy: "code",
        sortOrder: "asc",
      })
        .then((response) =>
          setDestinations(
            listOf(response).filter(
              (truck) =>
                getId(truck) !== getId(sourceTruck) && (getId(truck.driver) || truck.driverId)
            )
          )
        )
        .catch(() => setDestinations([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, destinationSearch, sourceTruck]);
  const change = (index, key, value) => {
    setPreview(null);
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item))
    );
  };
  const payload = () => ({
    destinationTruckId: getId(destination),
    date: `${transferDate}T00:00:00+07:00`,
    items: items.map((item) => ({ productId: item.productId, qty: Number(item.qty) })),
    note: note.trim() || undefined,
  });
  const validate = () => {
    if (!destination) return "Vui lòng chọn xe nhận";
    if (!transferDate) return "Vui lòng chọn ngày chứng từ";
    if (
      items.some(
        (item) => !item.productId || !Number.isInteger(Number(item.qty)) || Number(item.qty) <= 0
      )
    )
      return "Sản phẩm và số lượng nguyên dương là bắt buộc";
    return "";
  };
  const runPreview = async () => {
    const error = validate();
    if (error) return toast.error(error);
    try {
      setSaving(true);
      const response = await TruckService.previewTruckTransfer(getId(sourceTruck), payload());
      setPreview(unwrap(response));
    } catch (requestError) {
      toast.error(apiError(requestError, "Không thể kiểm tra phiếu chuyển"));
    } finally {
      setSaving(false);
    }
  };
  const submit = async () => {
    const error = validate();
    if (error) return toast.error(error);
    if (!preview) return runPreview();
    try {
      setSaving(true);
      await TruckService.transferToTruck(getId(sourceTruck), payload());
      toast.success("Đã chuyển hàng giữa hai xe");
      onSaved();
      onClose();
    } catch (requestError) {
      toast.error(apiError(requestError, "Không thể chuyển hàng giữa hai xe"));
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
          width: { xs: "95%", md: 760 },
          maxHeight: "92vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          Chuyển hàng sang xe khác
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          Xe nguồn: {sourceTruck?.code} - {sourceTruck?.name} · {sourceTruck?.licensePlate}
        </SoftTypography>
        <Grid container spacing={2} mt={1}>
          <Field label="Xe nhận *" md={8}>
            <Autocomplete
              options={destinations}
              value={destination}
              loading={loading}
              onChange={(_, value) => {
                setDestination(value);
                setPreview(null);
              }}
              onInputChange={(_, value, reason) =>
                reason === "input" && setDestinationSearch(value)
              }
              getOptionLabel={(truck) =>
                `${truck.code || ""} - ${truck.name || ""} · ${truck.licensePlate || ""}`
              }
              isOptionEqualToValue={(option, value) => getId(option) === getId(value)}
              noOptionsText="Không có xe active, có tài xế phù hợp"
              renderInput={(params) => (
                <TextField {...params} size="small" placeholder="Tìm mã, tên hoặc biển số xe" />
              )}
            />
          </Field>
          <Field label="Ngày chứng từ *" md={4}>
            <SoftInput
              type="date"
              value={transferDate}
              onChange={(event) => {
                setTransferDate(event.target.value);
                setPreview(null);
              }}
            />
          </Field>
        </Grid>
        <SoftBox mt={2}>
          {items.map((item, index) => (
            <SoftBox key={index} display="flex" gap={1} mb={1.5}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <Select
                  displayEmpty
                  value={item.productId}
                  onChange={(event) => change(index, "productId", event.target.value)}
                >
                  <MenuItem value="">
                    <em>Chọn hàng trên xe nguồn</em>
                  </MenuItem>
                  {products.map((product) => (
                    <MenuItem key={getId(product)} value={getId(product)}>
                      {product.code} - {product.name} (còn {product.stock} {product.unit || ""})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <SoftBox sx={{ flex: 1 }}>
                <SoftInput
                  type="number"
                  value={item.qty}
                  inputProps={{ min: 1, step: 1 }}
                  onChange={(event) => change(index, "qty", event.target.value)}
                />
              </SoftBox>
              <IconButton
                disabled={items.length === 1}
                onClick={() => {
                  setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
                  setPreview(null);
                }}
              >
                <Icon color="error">remove_circle</Icon>
              </IconButton>
            </SoftBox>
          ))}
        </SoftBox>
        <SoftButton
          variant="text"
          color="info"
          startIcon={<Icon>add</Icon>}
          onClick={() => {
            setItems((current) => [...current, { productId: "", qty: 1 }]);
            setPreview(null);
          }}
        >
          Thêm dòng
        </SoftButton>
        <SoftTypography variant="caption" display="block" mt={1}>
          Ghi chú
        </SoftTypography>
        <SoftInput
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setPreview(null);
          }}
        />
        {preview && (
          <SoftBox mt={2} p={2} bgcolor="#F3F8FF" borderRadius={2}>
            <SoftTypography variant="button" fontWeight="bold" display="block">
              Xác nhận: {preview.sourceTruck?.name || sourceTruck?.name} →{" "}
              {preview.destinationTruck?.name || destination?.name}
            </SoftTypography>
            <SoftTypography variant="caption">
              Tổng {preview.totalQuantity || 0} sản phẩm · {money(preview.totalValue)}
            </SoftTypography>
            {(preview.warnings || []).map((warning, index) => (
              <SoftTypography key={index} variant="caption" color="warning" display="block">
                ⚠ {typeof warning === "string" ? warning : warning.message}
              </SoftTypography>
            ))}
          </SoftBox>
        )}
        <SoftBox display="flex" gap={2} mt={3}>
          <SoftButton fullWidth variant="outlined" color="secondary" onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton
            fullWidth
            variant={preview ? "outlined" : "gradient"}
            color="info"
            disabled={saving || !products.length}
            onClick={runPreview}
          >
            Kiểm tra
          </SoftButton>
          <SoftButton
            fullWidth
            variant="gradient"
            color="success"
            disabled={saving || !preview}
            onClick={submit}
          >
            {saving ? "Đang xử lý..." : "Xác nhận chuyển"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

export default function QuanLyXe() {
  const isStaff = useSelector((state) => state.auth?.user?.role === "staff");
  const [tab, setTab] = useState(0);
  const [trucks, setTrucks] = useState([]);
  const [summary, setSummary] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [transferMeta, setTransferMeta] = useState(EMPTY_META);
  const [page, setPage] = useState(1);
  const [transferPage, setTransferPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [transferType, setTransferType] = useState("");
  const [transferTruckId, setTransferTruckId] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferSummary, setTransferSummary] = useState({});
  const [truckOptions, setTruckOptions] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editTruck, setEditTruck] = useState(null);
  const [truckModal, setTruckModal] = useState(false);
  const [transferModal, setTransferModal] = useState(null);
  const [truckToTruck, setTruckToTruck] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setPage(1);
    setTransferPage(1);
  }, [debouncedSearch, status, transferType, transferTruckId, transferFrom, transferTo]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const request =
      tab === 0
        ? Promise.all([
            TruckService.getAll({
              search: debouncedSearch || undefined,
              status: status || undefined,
              page,
              limit: 12,
              sortBy: "createdAt",
              sortOrder: "desc",
            }),
            TruckService.getSummary(),
          ])
        : Promise.all([
            TruckService.getTransfers({
              search: debouncedSearch || undefined,
              type: transferType || undefined,
              truckId: transferTruckId || undefined,
              from: transferFrom || undefined,
              to: transferTo || undefined,
              page: transferPage,
              limit: 20,
            }),
            TruckService.getTransferSummary({
              search: debouncedSearch || undefined,
              type: transferType || undefined,
              truckId: transferTruckId || undefined,
              from: transferFrom || undefined,
              to: transferTo || undefined,
            }),
          ]);
    request
      .then(([listResponse, summaryResponse]) => {
        if (!active) return;
        if (tab === 0) {
          const nextTrucks = listOf(listResponse);
          setTrucks((current) => (isStaff && page > 1 ? [...current, ...nextTrucks] : nextTrucks));
          setMeta(metaOf(listResponse));
        } else {
          const nextTransfers = listOf(listResponse);
          setTransfers((current) => (isStaff && transferPage > 1 ? [...current, ...nextTransfers] : nextTransfers));
          setTransferMeta(metaOf(listResponse));
          setTransferSummary(unwrap(summaryResponse) || {});
        }
        if (tab === 0) setSummary(unwrap(summaryResponse) || {});
      })
      .catch((error) => active && toast.error(apiError(error, "Không thể tải dữ liệu xe tải")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [
    tab,
    page,
    transferPage,
    debouncedSearch,
    status,
    transferType,
    transferTruckId,
    transferFrom,
    transferTo,
    refreshKey,
    isStaff,
  ]);
  useEffect(() => {
    if (tab !== 1 || truckOptions.length) return;
    TruckService.getAll({ page: 1, limit: 100, sortBy: "code", sortOrder: "asc" })
      .then(async (firstResponse) => {
        const firstPage = listOf(firstResponse);
        const totalPages = metaOf(firstResponse).totalPages || 1;
        if (totalPages <= 1) return firstPage;
        const remaining = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            TruckService.getAll({ page: index + 2, limit: 100, sortBy: "code", sortOrder: "asc" })
          )
        );
        return firstPage.concat(...remaining.map(listOf));
      })
      .then((options) => setTruckOptions(options))
      .catch((error) => toast.error(apiError(error, "Không thể tải danh sách xe để lọc")));
  }, [tab, truckOptions.length]);
  const refresh = (firstPage = false) => {
    if (firstPage) setPage(1);
    setRefreshKey((value) => value + 1);
  };
  const changeStatus = async (truck) => {
    const next = truck.status === "active" ? "inactive" : "active";
    try {
      await TruckService.changeStatus(getId(truck), next);
      toast.success("Đã đổi trạng thái xe");
      refresh();
    } catch (error) {
      toast.error(apiError(error, "Không thể đổi trạng thái"));
    }
  };
  const remove = async (truck) => {
    if (!window.confirm(`Xóa xe ${truck.name}? Xe còn hàng sẽ không thể xóa.`)) return;
    try {
      await TruckService.delete(getId(truck));
      toast.success("Đã xóa xe");
      if (trucks.length === 1 && page > 1) setPage((value) => value - 1);
      else refresh();
    } catch (error) {
      toast.error(apiError(error, "Không thể xóa xe"));
    }
  };
  const transferFilters = {
    search: debouncedSearch || undefined,
    type: transferType || undefined,
    truckId: transferTruckId || undefined,
    from: transferFrom || undefined,
    to: transferTo || undefined,
  };
  const exportTransfers = async () => {
    if (transferFrom && transferTo && transferFrom > transferTo)
      return toast.error("Ngày bắt đầu không được lớn hơn ngày kết thúc");
    try {
      setExporting(true);
      const response = await TruckService.exportTransfers(transferFilters);
      downloadBlob(
        response.data,
        `phieu-dieu-chuyen-${transferFrom || "tat-ca"}-${
          transferTo || new Date().toISOString().slice(0, 10)
        }.xlsx`
      );
      toast.success("Đã tải file phiếu điều chuyển");
    } catch (error) {
      toast.error(apiError(error, "Không thể xuất file Excel"));
    } finally {
      setExporting(false);
    }
  };
  const reverseTransfer = async (transfer) => {
    if (!window.confirm(`Tạo phiếu chuyển ngược cho ${transfer.code}?`)) return;
    try {
      await TruckService.reverseTransfer(getId(transfer));
      toast.success("Đã tạo phiếu chuyển ngược");
      refresh();
    } catch (error) {
      toast.error(apiError(error, "Không thể đảo phiếu chuyển xe"));
    }
  };
  const kpis = [
    ["Tổng xe", summary.totalTrucks, "local_shipping", "#1565C0"],
    ["Đang hoạt động", summary.activeTrucks, "check_circle", "#2E7D32"],
    ["Chưa có tài xế", summary.trucksWithoutDriver, "person_off", "#C62828"],
    ["Xe đang có hàng", summary.trucksWithInventory, "inventory_2", "#E65100"],
    ["Giá trị tồn trên xe", money(summary.totalTruckInventoryValue), "payments", "#7B1FA2"],
  ];
  return (
    <DashboardLayout compactMobile={isStaff}>
      {!isStaff && <DashboardNavbar />}
      {isStaff && <StaffMobileHeader title="Xe hàng" subtitle="Tồn xe và lịch sử hàng hóa" onRefresh={() => refresh()} />}
      <SoftBox py={{ xs: isStaff ? 1 : 3, md: 3 }} pb={{ xs: isStaff ? 10 : 3, md: 3 }} sx={{ bgcolor: { xs: isStaff ? "#f0f2f5" : "transparent", md: "transparent" }, minHeight: "100vh" }}>
        <Grid container spacing={{ xs: isStaff ? 1 : 2, md: 2 }} mb={{ xs: isStaff ? 1 : 3, md: 3 }} px={{ xs: isStaff ? 1 : 0, md: 0 }} sx={{ flexWrap: { xs: isStaff ? "nowrap" : "wrap", md: "wrap" }, overflowX: { xs: "auto", md: "visible" } }}>
          {kpis.map(([label, value, icon, color]) => (
            <Grid item xs={isStaff ? 7 : 12} sm={6} lg={3} key={label} sx={{ flexShrink: 0 }}>
              <Card sx={{ boxShadow: { xs: isStaff ? "none" : undefined, md: undefined } }}>
                <SoftBox p={{ xs: isStaff ? 1.5 : 2.5, md: 2.5 }} display="flex" alignItems="center" gap={1.25}>
                  <Icon sx={{ color }}>{icon}</Icon>
                  <SoftBox>
                    <SoftTypography variant="caption" color="text">
                      {label}
                    </SoftTypography>
                    <SoftTypography variant="h5" fontWeight="bold" sx={{ color }}>
                      {value ?? 0}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Card sx={{ borderRadius: { xs: isStaff ? 0 : undefined, md: undefined }, boxShadow: { xs: isStaff ? "none" : undefined, md: undefined } }}>
          <SoftBox p={{ xs: isStaff ? 2 : 3, md: 3 }}>
            <SoftBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
              flexWrap="wrap"
            >
              <SoftBox sx={{ display: { xs: isStaff ? "none" : "block", md: "block" } }}>
                <SoftTypography variant="h5" fontWeight="bold">
                  Quản lý xe tải
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Tồn xe và lịch sử điều chuyển kho
                </SoftTypography>
              </SoftBox>
              {!isStaff && (tab === 0 ? (
                <SoftButton
                  variant="gradient"
                  color="info"
                  startIcon={<Icon>add</Icon>}
                  onClick={() => {
                    setEditTruck(null);
                    setTruckModal(true);
                  }}
                >
                  Thêm xe
                </SoftButton>
              ) : (
                <SoftButton
                  variant="gradient"
                  color="success"
                  startIcon={<Icon>download</Icon>}
                  disabled={exporting}
                  onClick={exportTransfers}
                >
                  {exporting ? "Đang xuất..." : "Xuất Excel"}
                </SoftButton>
              ))}
            </SoftBox>
            <Tabs
              value={tab}
              onChange={(_, value) => {
                setTab(value);
                setSearch("");
              }}
              sx={{ mt: 2, mb: 2 }}
            >
              <Tab label="Danh sách xe" />
              <Tab label="Lịch sử điều chuyển" />
            </Tabs>
            <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
              <SoftBox sx={{ flex: 1, minWidth: 240 }}>
                <SoftInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    tab === 0 ? "Tìm mã, tên xe, biển số, tài xế..." : "Tìm mã phiếu hoặc xe..."
                  }
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              {tab === 0 ? (
                <FormControl size="small" sx={{ minWidth: 180, display: { xs: isStaff ? "none" : "inline-flex", md: "inline-flex" } }}>
                  <Select displayEmpty value={status} onChange={(e) => setStatus(e.target.value)}>
                    <MenuItem value="">Mọi trạng thái</MenuItem>
                    <MenuItem value="active">Hoạt động</MenuItem>
                    <MenuItem value="inactive">Ngừng hoạt động</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <>
                  <FormControl size="small" sx={{ minWidth: 165 }}>
                    <Select
                      displayEmpty
                      value={transferType}
                      onChange={(e) => setTransferType(e.target.value)}
                    >
                      <MenuItem value="">Mọi loại phiếu</MenuItem>
                      <MenuItem value="LOAD">Phiếu xuất lên xe</MenuItem>
                      <MenuItem value="RETURN">Phiếu hoàn về kho</MenuItem>
                      <MenuItem value="TRUCK_TO_TRUCK">Chuyển xe → xe</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 190 }}>
                    <Select
                      displayEmpty
                      value={transferTruckId}
                      onChange={(e) => setTransferTruckId(e.target.value)}
                    >
                      <MenuItem value="">Tất cả xe</MenuItem>
                      {truckOptions.map((truck) => (
                        <MenuItem key={getId(truck)} value={getId(truck)}>
                          {truck.code} - {truck.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <SoftBox sx={{ width: 160 }}>
                    <SoftInput
                      type="date"
                      value={transferFrom}
                      onChange={(e) => setTransferFrom(e.target.value)}
                      inputProps={{ max: transferTo || undefined }}
                    />
                  </SoftBox>
                  <SoftBox sx={{ width: 160 }}>
                    <SoftInput
                      type="date"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      inputProps={{ min: transferFrom || undefined }}
                    />
                  </SoftBox>
                  {(transferType || transferTruckId || transferFrom || transferTo) && (
                    <SoftButton
                      variant="text"
                      color="secondary"
                      onClick={() => {
                        setTransferType("");
                        setTransferTruckId("");
                        setTransferFrom("");
                        setTransferTo("");
                      }}
                    >
                      Xóa bộ lọc
                    </SoftButton>
                  )}
                </>
              )}
            </SoftBox>
            {tab === 1 && (
              <Grid container spacing={2} mb={3}>
                {[
                  ["Số phiếu", transferSummary.totalTransfers, "receipt_long", "#1565C0"],
                  ["Tổng số lượng", transferSummary.totalQuantity, "inventory", "#2E7D32"],
                  ["Số xe", transferSummary.truckCount, "local_shipping", "#E65100"],
                  ["Số sản phẩm", transferSummary.productCount, "category", "#7B1FA2"],
                  ["Tổng giá trị", money(transferSummary.totalValue), "payments", "#C62828"],
                  [
                    "Phiếu chuyển xe",
                    transferSummary.truckToTruckTransfers,
                    "swap_horiz",
                    "#00897B",
                  ],
                ].map(([label, value, icon, color]) => (
                  <Grid item xs={12} sm={6} lg key={label}>
                    <SoftBox
                      bgcolor="#F8F9FA"
                      borderRadius={2}
                      p={2}
                      display="flex"
                      gap={1.5}
                      alignItems="center"
                    >
                      <Icon sx={{ color }}>{icon}</Icon>
                      <SoftBox>
                        <SoftTypography variant="caption" color="text">
                          {label}
                        </SoftTypography>
                        <SoftTypography variant="h6" fontWeight="bold" sx={{ color }}>
                          {value ?? 0}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  </Grid>
                ))}
              </Grid>
            )}
            {loading && (
              <SoftTypography variant="button" display="block" textAlign="center" py={5}>
                Đang tải...
              </SoftTypography>
            )}
            {tab === 0 && (trucks.length > 0 || !loading) && (
              <TruckGrid
                trucks={trucks}
                readOnly={isStaff}
                onLoad={(truck) => setTransferModal({ truck, type: "LOAD" })}
                onReturn={(truck) => setTransferModal({ truck, type: "RETURN" })}
                onTransfer={(truck) => setTruckToTruck(truck)}
                onEdit={(truck) => {
                  setEditTruck(truck);
                  setTruckModal(true);
                }}
                onStatus={changeStatus}
                onDelete={remove}
              />
            )}
            {tab === 1 && (transfers.length > 0 || !loading) && (
              <TransferTable transfers={transfers} onReverse={reverseTransfer} readOnly={isStaff} />
            )}
            {isStaff && tab === 0 && <MobileLoadMore loading={loading} hasMore={page < (meta.totalPages || 1)} onLoadMore={() => setPage((value) => value + 1)} />}
            {isStaff && tab === 1 && <MobileLoadMore loading={loading} hasMore={transferPage < (transferMeta.totalPages || 1)} onLoadMore={() => setTransferPage((value) => value + 1)} />}
            {!isStaff && tab === 0 && meta.totalPages > 1 && (
              <Pager meta={meta} page={page} setPage={setPage} label="xe" />
            )}
            {!isStaff && tab === 1 && transferMeta.totalPages > 1 && (
              <Pager
                meta={transferMeta}
                page={transferPage}
                setPage={setTransferPage}
                label="phiếu"
              />
            )}
          </SoftBox>
        </Card>
      </SoftBox>
      <TruckModal
        open={truckModal}
        truck={editTruck}
        onClose={() => setTruckModal(false)}
        onSaved={refresh}
      />
      {transferModal && (
        <TransferModal
          open
          truck={transferModal.truck}
          type={transferModal.type}
          onClose={() => setTransferModal(null)}
          onSaved={refresh}
        />
      )}
      {truckToTruck && (
        <TruckToTruckModal
          open
          sourceTruck={truckToTruck}
          onClose={() => setTruckToTruck(null)}
          onSaved={refresh}
        />
      )}
    </DashboardLayout>
  );
}

function TruckGrid({ trucks, onLoad, onReturn, onTransfer, onEdit, onStatus, onDelete, readOnly }) {
  if (!trucks.length)
    return (
      <SoftTypography variant="button" color="text" display="block" textAlign="center" py={5}>
        Không tìm thấy xe tải
      </SoftTypography>
    );
  return (
    <Grid container spacing={2}>
      {trucks.map((truck) => {
        const inventory = truck.inventoryPreview || truck.inventory || [];
        const quantity =
          truck.inventorySummary?.totalQuantity ??
          truck.totalQuantity ??
          inventory.reduce((sum, item) => sum + quantityOf(item), 0);
        const driverName =
          truck.driver?.fullName ||
          truck.driverName ||
          (typeof truck.driver === "string" ? truck.driver : "") ||
          "Chưa phân công";
        const driverPhone = truck.driver?.phone || truck.driverPhone || truck.phone || "—";
        return (
          <Grid item xs={12} md={6} lg={4} key={getId(truck)}>
            <Card variant="outlined">
              <SoftBox p={2.5}>
                <SoftBox display="flex" justifyContent="space-between" mb={2}>
                  <SoftBox>
                    <SoftTypography variant="h6" fontWeight="bold">
                      {truck.name}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {truck.code} · {truck.licensePlate}
                    </SoftTypography>
                  </SoftBox>
                  <span
                    style={{
                      height: 24,
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      color: truck.status === "active" ? "#2E7D32" : "#C62828",
                      background: truck.status === "active" ? "#E8F5E9" : "#FFEBEE",
                    }}
                  >
                    {truck.status === "active" ? "Hoạt động" : "Ngừng"}
                  </span>
                </SoftBox>
                <SoftBox bgcolor="#F8F9FA" borderRadius={2} p={1.5} mb={2}>
                  <SoftTypography variant="caption" display="block">
                    Tài xế: {driverName}
                  </SoftTypography>
                  <SoftTypography variant="caption" display="block">
                    Điện thoại: {driverPhone}
                  </SoftTypography>
                  <SoftBox display="flex" justifyContent="space-between" mt={1}>
                    <SoftTypography variant="caption" fontWeight="bold">
                      {truck.inventorySummary?.productTypes ??
                        truck.productTypes ??
                        inventory.length}{" "}
                      loại · {quantity} sản phẩm
                    </SoftTypography>
                    <SoftTypography variant="caption" color="info" fontWeight="bold">
                      {money(truck.inventorySummary?.totalValue ?? truck.totalValue)}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
                {inventory.map((item, index) => {
                  const product = productOf(item);
                  return (
                    <SoftBox
                      key={`${productIdOf(item)}-${index}`}
                      display="flex"
                      justifyContent="space-between"
                      py={0.5}
                      borderBottom="1px solid #eee"
                    >
                      <SoftTypography variant="caption">
                        {product.name ||
                          item.productName ||
                          item.name ||
                          "Sản phẩm không còn tồn tại"}
                      </SoftTypography>
                      <SoftTypography variant="caption" fontWeight="bold">
                        {quantityOf(item)} {product.unit || item.unit || ""}
                      </SoftTypography>
                    </SoftBox>
                  );
                })}
                {!readOnly && <SoftBox display="flex" gap={0.5} mt={2} flexWrap="wrap">
                  <SoftButton
                    size="small"
                    variant="outlined"
                    color="info"
                    disabled={
                      truck.status !== "active" || (!getId(truck.driver) && !truck.driverId)
                    }
                    onClick={() => onLoad(truck)}
                  >
                    Xuất hàng
                  </SoftButton>
                  <SoftButton
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={!quantity}
                    onClick={() => onReturn(truck)}
                  >
                    Hoàn hàng
                  </SoftButton>
                  <SoftButton
                    size="small"
                    variant="outlined"
                    color="success"
                    disabled={!quantity}
                    onClick={() => onTransfer(truck)}
                  >
                    Chuyển xe
                  </SoftButton>
                  <Tooltip title="Sửa">
                    <IconButton size="small" onClick={() => onEdit(truck)}>
                      <Icon color="info">edit</Icon>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={truck.status === "active" ? "Ngừng hoạt động" : "Kích hoạt"}>
                    <IconButton size="small" onClick={() => onStatus(truck)}>
                      <Icon sx={{ color: truck.status === "active" ? "#E65100" : "#2E7D32" }}>
                        {truck.status === "active" ? "pause_circle" : "play_circle"}
                      </Icon>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Xóa">
                    <IconButton size="small" onClick={() => onDelete(truck)}>
                      <Icon color="error">delete</Icon>
                    </IconButton>
                  </Tooltip>
                </SoftBox>}
              </SoftBox>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

function TransferTable({ transfers, onReverse, readOnly }) {
  return (
    <>
    {readOnly && <SoftBox display={{ xs: "block", md: "none" }}>
      {!transfers.length && <SoftTypography variant="button" color="text" display="block" textAlign="center" py={4}>Chưa có phiếu điều chuyển</SoftTypography>}
      {transfers.map((transfer) => <SoftBox key={getId(transfer)} py={1.75} sx={{ borderBottom: "1px solid #edf0f5" }}>
        <SoftBox display="flex" justifyContent="space-between" gap={1} mb={0.75}><SoftTypography variant="button" fontWeight="bold">{transfer.code}</SoftTypography><SoftTypography variant="caption" color="text">{date(transfer.date || transfer.createdAt)}</SoftTypography></SoftBox>
        <SoftTypography variant="caption" fontWeight="bold" display="block">{transfer.type === "LOAD" ? "Xuất hàng lên xe" : transfer.type === "RETURN" ? "Hoàn hàng về kho" : "Chuyển hàng giữa xe"}</SoftTypography>
        <SoftTypography variant="caption" color="text" display="block">{transfer.type === "TRUCK_TO_TRUCK" ? `${transfer.sourceTruckName || "Xe nguồn"} → ${transfer.destinationTruckName || "Xe nhận"}` : transfer.truckName || transfer.truck?.name || "—"}</SoftTypography>
        <SoftBox mt={1} p={1.25} borderRadius={2} bgcolor="#f0f2f5">{(transfer.items || []).slice(0, 4).map((item, index) => <SoftBox key={`${item.productId || index}`} display="flex" justifyContent="space-between" py={0.4}><SoftTypography variant="caption">{item.productName || item.name || "Sản phẩm"}</SoftTypography><SoftTypography variant="caption" fontWeight="bold">{quantityOf(item)} {item.unit || ""}</SoftTypography></SoftBox>)}</SoftBox>
        <SoftBox display="flex" justifyContent="space-between" mt={1}><SoftTypography variant="caption" color="text">Tổng {transfer.totalQuantity || 0} sản phẩm</SoftTypography><SoftTypography variant="button" fontWeight="bold">{money(transfer.totalValue)}</SoftTypography></SoftBox>
      </SoftBox>)}
    </SoftBox>}
    <SoftBox sx={{ overflowX: "auto", display: { xs: readOnly ? "none" : "block", md: "block" } }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8F9FA" }}>
            {[
              "Mã phiếu",
              "Ngày",
              "Loại",
              "Xe",
              "Tài xế",
              "Hàng hóa",
              "Tổng SL",
              "Giá trị",
              "Người tạo",
              "Ghi chú",
              "",
            ].map((heading) => (
              <th
                key={heading}
                style={{
                  padding: 12,
                  textAlign: "left",
                  fontSize: 12,
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
          {!transfers.length && (
            <tr>
              <td colSpan={11} style={{ textAlign: "center", padding: 40, color: "#9E9E9E" }}>
                Chưa có phiếu điều chuyển
              </td>
            </tr>
          )}
          {transfers.map((transfer) => (
            <tr key={getId(transfer)} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 12, fontSize: 13, fontWeight: 600 }}>{transfer.code}</td>
              <td style={{ padding: 12, fontSize: 13, whiteSpace: "nowrap" }}>
                {date(transfer.date || transfer.createdAt)}
              </td>
              <td style={{ padding: 12 }}>
                <span
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 10,
                    color:
                      transfer.type === "LOAD"
                        ? "#1565C0"
                        : transfer.type === "RETURN"
                        ? "#E65100"
                        : "#2E7D32",
                    background:
                      transfer.type === "LOAD"
                        ? "#E3F2FD"
                        : transfer.type === "RETURN"
                        ? "#FFF3E0"
                        : "#E8F5E9",
                  }}
                >
                  {transfer.type === "LOAD"
                    ? "Xuất lên xe"
                    : transfer.type === "RETURN"
                    ? "Hoàn về kho"
                    : "Chuyển xe → xe"}
                </span>
              </td>
              <td style={{ padding: 12, fontSize: 13 }}>
                {transfer.type === "TRUCK_TO_TRUCK"
                  ? `${transfer.sourceTruckName || transfer.sourceTruck?.name || "—"} → ${
                      transfer.destinationTruckName || transfer.destinationTruck?.name || "—"
                    }`
                  : transfer.truckName || transfer.truck?.name || "—"}
                <br />
                <span style={{ color: "#6B7280" }}>
                  {transfer.type === "TRUCK_TO_TRUCK"
                    ? `${transfer.sourceTruckCode || transfer.sourceTruck?.code || ""} · ${
                        transfer.sourceTruckLicensePlate || transfer.sourceTruck?.licensePlate || ""
                      } → ${
                        transfer.destinationTruckCode || transfer.destinationTruck?.code || ""
                      } · ${
                        transfer.destinationTruckLicensePlate ||
                        transfer.destinationTruck?.licensePlate ||
                        ""
                      }`
                    : transfer.truck?.code || transfer.truckCode || ""}
                  {transfer.type !== "TRUCK_TO_TRUCK" &&
                  (transfer.truck?.licensePlate || transfer.truckLicensePlate)
                    ? ` · ${transfer.truck?.licensePlate || transfer.truckLicensePlate}`
                    : ""}
                </span>
              </td>
              <td style={{ padding: 12, fontSize: 13 }}>
                {transfer.type === "TRUCK_TO_TRUCK"
                  ? `${transfer.sourceDriverName || transfer.sourceDriver?.fullName || "—"} → ${
                      transfer.destinationDriverName || transfer.destinationDriver?.fullName || "—"
                    }`
                  : transfer.driver?.fullName || transfer.driverName || "—"}
                <br />
                <span style={{ color: "#6B7280" }}>
                  {transfer.driver?.employeeCode || transfer.driverCode || ""}
                </span>
              </td>
              <td style={{ padding: 12, minWidth: 280 }}>
                {(transfer.items || []).length === 0
                  ? "—"
                  : (transfer.items || []).map((item, index) => (
                      <SoftBox
                        key={`${item.productId || item.productCode || index}-${index}`}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={2}
                        py={0.75}
                        sx={{
                          borderBottom:
                            index < transfer.items.length - 1 ? "1px dashed #E5E7EB" : "none",
                        }}
                      >
                        <SoftBox>
                          <SoftTypography variant="caption" fontWeight="bold" display="block">
                            {item.productName || item.name || "Sản phẩm"}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text">
                            {item.productCode || item.code || "Không có mã"}
                          </SoftTypography>
                        </SoftBox>
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            padding: "3px 8px",
                            borderRadius: 10,
                            background: "#F3F4F6",
                            color: "#374151",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {quantityOf(item)} {item.unit || ""}
                        </span>
                      </SoftBox>
                    ))}
              </td>
              <td style={{ padding: 12, fontSize: 13 }}>{transfer.totalQuantity || 0}</td>
              <td style={{ padding: 12, fontSize: 13, whiteSpace: "nowrap" }}>
                {money(transfer.totalValue)}
              </td>
              <td style={{ padding: 12, fontSize: 13 }}>
                {transfer.createdBy?.fullName || transfer.createdBy?.username || "—"}
              </td>
              <td style={{ padding: 12, fontSize: 13 }}>{transfer.note || "—"}</td>
              <td style={{ padding: 12 }}>
                {!readOnly && transfer.type === "TRUCK_TO_TRUCK" && !transfer.reversalOf && (
                  <Tooltip title="Tạo phiếu chuyển ngược">
                    <IconButton size="small" onClick={() => onReverse(transfer)}>
                      <Icon color="warning">swap_horiz</Icon>
                    </IconButton>
                  </Tooltip>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SoftBox>
    </>
  );
}

function Pager({ meta, page, setPage, label }) {
  return (
    <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
      <SoftTypography variant="caption" color="text">
        Tổng {meta.totalItems || 0} {label}
      </SoftTypography>
      <Pagination
        page={page}
        count={meta.totalPages || 1}
        color="primary"
        onChange={(_, value) => setPage(value)}
      />
    </SoftBox>
  );
}
