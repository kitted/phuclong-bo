import { useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { InvoiceService, TruckService } from "services/warehouseService";
import InventoryService from "services/inventoryService";
import { createExcelFile, downloadBlob } from "utils/excel";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import StaffMobileHeader from "components/StaffMobileHeader";
import MobileLoadMore from "components/MobileLoadMore";
import QuickSortBar from "components/QuickSortBar";
import CustomerReturnService from "services/customerReturnService";
import { mergeUniqueItems } from "utils/infiniteList";

const EMPTY_TRUCK = { code: "", name: "", licensePlate: "", driverId: "", status: "active" };
const EMPTY_META = { totalPages: 1, totalItems: 0 };
const STOCK_CHECK_STATUSES = {
  MATCHED: { label: "Khớp tồn", color: "#2e7d32", background: "#e8f5e9", icon: "check_circle" },
  SHORTAGE: { label: "Thiếu hàng", color: "#c62828", background: "#ffebee", icon: "remove_circle" },
  SURPLUS: { label: "Thừa hàng", color: "#ef6c00", background: "#fff3e0", icon: "add_circle" },
  NOT_COUNTED: { label: "Chưa kiểm", color: "#607d8b", background: "#eceff1", icon: "pending" },
  UNKNOWN: { label: "Mã không tồn tại", color: "#8d6e00", background: "#fff8e1", icon: "help" },
  NOT_ON_TRUCK: {
    label: "Không có trên xe",
    color: "#8d6e00",
    background: "#fff8e1",
    icon: "warning",
  },
  INVALID: { label: "Dữ liệu lỗi", color: "#ad1457", background: "#fce4ec", icon: "error" },
};
const getId = (value) => value?.id || value?._id;
const sameId = (left, right) =>
  Boolean(left && right && String(getId(left) || left) === String(getId(right) || right));
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
const optionalQuantity = (...values) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  return value === undefined ? null : Number(value);
};
const saleInventorySnapshot = (item = {}) => {
  const deducted = Number(item.qty ?? item.quantityDeducted ?? item.deductedQuantity ?? 0);
  let before = optionalQuantity(
    item.truckQuantityBefore,
    item.sourceQuantityBefore,
    item.quantityBefore,
    item.stockBefore,
    item.inventoryBefore,
    item.inventorySnapshot?.before
  );
  let after = optionalQuantity(
    item.truckQuantityAfter,
    item.sourceQuantityAfter,
    item.quantityAfter,
    item.stockAfter,
    item.inventoryAfter,
    item.inventorySnapshot?.after
  );
  if (before === null && after !== null) before = after + deducted;
  if (after === null && before !== null) after = before - deducted;
  return { before, deducted, after };
};
const apiError = (error, fallback) => {
  const message = error?.response?.data?.message;
  return Array.isArray(message) ? message.join(", ") : message || fallback;
};
const downloadApiFile = (response, fallbackName) => {
  const disposition = response?.headers?.["content-disposition"] || "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const fileName = utf8Name ? decodeURIComponent(utf8Name) : plainName || fallbackName;
  downloadBlob(response.data, fileName);
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
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";
const makeIdempotencyKey = (prefix) => {
  const uuid = typeof window !== "undefined" ? window.crypto?.randomUUID?.() : "";
  return `${prefix}-${uuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
};
const backupSourceLabel = (source) =>
  source === "BEFORE_RESTORE" ? "Trước khi khôi phục" : "Trước khi đồng bộ kiểm hàng";
function SegmentedTabs({ value, onChange, items, fullWidth = false }) {
  return (
    <SoftBox
      display="flex"
      gap={0.75}
      p={0.5}
      mb={2}
      borderRadius={2}
      bgcolor="#eef2f6"
      sx={{ overflowX: "auto" }}
    >
      {items.map((item, index) => {
        const selected = value === index;
        return (
          <SoftBox
            key={item.label}
            component="button"
            type="button"
            onClick={() => onChange(index)}
            minHeight={44}
            px={1.5}
            borderRadius={1.5}
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={0.75}
            flex={fullWidth ? "1 0 0" : "0 0 auto"}
            bgcolor={selected ? "#fff" : "transparent"}
            sx={{
              border: 0,
              color: selected ? "#1565c0" : "#67748e",
              cursor: "pointer",
              font: "inherit",
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              boxShadow: selected ? "0 1px 4px rgba(52, 71, 103, 0.12)" : "none",
            }}
          >
            {item.icon && <Icon sx={{ fontSize: 19 }}>{item.icon}</Icon>}
            {item.label}
          </SoftBox>
        );
      })}
    </SoftBox>
  );
}
const vietnamDateKey = (value) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
};
const todayValue = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
};
const currentWeekValue = () => {
  const value = new Date();
  const dateValue = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  const day = dateValue.getUTCDay() || 7;
  dateValue.setUTCDate(dateValue.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dateValue.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((dateValue - yearStart) / 86400000 + 1) / 7);
  return `${dateValue.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};
const weekRange = (weekValue) => {
  const [yearText, weekText] = String(weekValue || "").split("-W");
  const year = Number(yearText);
  const week = Number(weekText);
  if (!year || !week) return {};
  const januaryFourth = new Date(year, 0, 4);
  const monday = new Date(januaryFourth);
  monday.setDate(januaryFourth.getDate() - ((januaryFourth.getDay() || 7) - 1) + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toValue = (value) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate()
    ).padStart(2, "0")}`;
  return { from: toValue(monday), to: toValue(sunday) };
};
const invoiceCustomerLabel = (invoice = {}) => {
  const customer =
    (invoice.customerId && typeof invoice.customerId === "object" ? invoice.customerId : null) ||
    invoice.customerSnapshot ||
    {};
  const code = customer.code || customer.customerCode || invoice.customerCode || "";
  const name =
    customer.name ||
    customer.customerName ||
    invoice.customerName ||
    (typeof invoice.customer === "string" ? invoice.customer : "") ||
    "Khách lẻ";
  return [code, name].filter(Boolean).join(" · ");
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
  const [productSearch, setProductSearch] = useState("");
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
    setProductSearch("");
    setCode("");
    setTransferDate(todayValue());
    setNote("");
    if (!isLoad) {
      setLoadingProducts(true);
      TruckService.getById(getId(truck))
        .then((response) =>
          setProducts(
            (Array.isArray(unwrap(response)?.inventory) ? unwrap(response).inventory : []).map(
              (item) => ({
                ...productOf(item),
                id: productIdOf(item),
                stock: quantityOf(item),
              })
            )
          )
        )
        .catch((error) => toast.error(apiError(error, "Không thể tải tồn xe")))
        .finally(() => setLoadingProducts(false));
    }
  }, [open, truck, isLoad]);

  useEffect(() => {
    if (!open || !truck || !isLoad) return undefined;
    let active = true;
    const timer = setTimeout(
      () => {
        setLoadingProducts(true);
        TruckService.getAvailableProducts({
          search: productSearch.trim() || undefined,
          page: 1,
          limit: 20,
        })
          .then((response) => {
            if (!active) return;
            const nextProducts = listOf(response);
            setProducts(
              productSearch.trim()
                ? nextProducts
                : [...nextProducts].sort((a, b) =>
                    String(a.code || a.name || "").localeCompare(
                      String(b.code || b.name || ""),
                      "vi",
                      { numeric: true }
                    )
                  )
            );
          })
          .catch(
            (error) => active && toast.error(apiError(error, "Không thể tải sản phẩm trong kho"))
          )
          .finally(() => active && setLoadingProducts(false));
      },
      productSearch ? 300 : 0
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, truck, isLoad, productSearch]);

  const stockOf = (product) =>
    Number(product?.stock ?? product?.warehouseQuantity ?? product?.quantity ?? product?.qty ?? 0);
  const selectedProduct = (item) =>
    item.product ||
    products.find(
      (product) => String(getId(product) || product.productId) === String(item.productId)
    ) ||
    {};
  const addProduct = (product) => {
    const productId = getId(product) || product?.productId;
    if (!productId) return;
    const stock = stockOf(product);
    if (stock <= 0) {
      toast.warning("Sản phẩm này hiện không còn tồn khả dụng");
      return;
    }
    setItems((current) => {
      const existingIndex = current.findIndex(
        (item) => String(item.productId) === String(productId)
      );
      if (existingIndex >= 0) {
        const currentQty = Number(current[existingIndex].qty || 0);
        if (stock > 0 && currentQty >= stock) {
          toast.warning(`Sản phẩm chỉ còn ${stock} ${product.unit || ""}`);
          return current;
        }
        return current.map((item, index) =>
          index === existingIndex ? { ...item, qty: currentQty + 1, product } : item
        );
      }
      return [...current, { productId, qty: 1, product }];
    });
    setProductSearch("");
  };
  const changeQty = (index, value) =>
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (value === "") return { ...item, qty: "" };
        const product = selectedProduct(item);
        const stock = stockOf(product);
        const quantity = Math.max(1, Math.floor(Number(value) || 1));
        return { ...item, qty: stock > 0 ? Math.min(quantity, stock) : quantity };
      })
    );
  const selectedTotalQuantity = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const selectAllTruckItems = () => {
    const allItems = products
      .filter((product) => {
        const stock = stockOf(product);
        return stock > 0;
      })
      .map((product) => ({
        productId: getId(product) || product?.productId,
        qty: stockOf(product),
        product,
      }));
    if (!allItems.length) {
      toast.info("Xe hiện không có hàng để trả về kho");
      return;
    }
    setItems(allItems);
    toast.success(`Đã chọn tất cả ${allItems.length} loại hàng trên xe`);
  };

  const save = async () => {
    const normalized = items.map((item) => ({ productId: item.productId, qty: Number(item.qty) }));
    if (!normalized.length) return toast.error("Vui lòng chọn ít nhất một sản phẩm");
    if (normalized.some((item) => !item.productId || !Number.isInteger(item.qty) || item.qty <= 0))
      return toast.error("Sản phẩm và số lượng nguyên dương là bắt buộc");
    const overStockItem = items.find((item) => {
      const stock = stockOf(selectedProduct(item));
      return stock > 0 && Number(item.qty) > stock;
    });
    if (overStockItem) {
      const product = selectedProduct(overStockItem);
      return toast.error(
        `${product.name || "Sản phẩm"} chỉ còn ${stockOf(product)} ${product.unit || ""}`
      );
    }
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
          width: { xs: "96%", md: 760 },
          maxHeight: { xs: "94dvh", md: "92vh" },
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: { xs: 2, md: 3.5 },
        }}
      >
        <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <SoftBox display="flex" alignItems="center" gap={1.5}>
            <SoftBox
              width={46}
              height={46}
              borderRadius={2}
              bgcolor={isLoad ? "#e3f2fd" : "#fff3e0"}
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Icon sx={{ color: isLoad ? "#1565c0" : "#e65100", fontSize: 28 }}>
                {isLoad ? "add_road" : "assignment_return"}
              </Icon>
            </SoftBox>
            <SoftBox>
              <SoftTypography
                variant="h5"
                fontWeight="bold"
                sx={{ fontSize: { xs: "1.1rem", md: "1.3rem" } }}
              >
                {isLoad ? "Xuất hàng lên xe" : "Hoàn hàng về kho"}
              </SoftTypography>
              <SoftTypography variant="button" fontWeight="bold" color="info" display="block">
                {truck?.name} · {truck?.licensePlate || truck?.code}
              </SoftTypography>
            </SoftBox>
          </SoftBox>
          <IconButton onClick={onClose} sx={{ bgcolor: "#f0f2f5" }}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
        <SoftBox mt={1.5} px={1.5} py={1} borderRadius={2} bgcolor={isLoad ? "#e8f5e9" : "#fff8e1"}>
          <SoftTypography
            variant="caption"
            fontWeight="bold"
            sx={{ color: isLoad ? "#2e7d32" : "#e65100" }}
          >
            {isLoad
              ? "Kho chính sẽ tự động trừ tồn sau khi tạo phiếu thành công."
              : "Hàng trên xe sẽ được cộng trở lại kho chính."}
          </SoftTypography>
        </SoftBox>
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
        <SoftBox mt={2.5}>
          <SoftBox display="flex" alignItems="center" justifyContent="space-between" mb={0.75} gap={1}>
            <SoftTypography variant="button" fontWeight="bold" display="block">
              {isLoad ? "Tìm và chọn hàng trong kho" : "Tìm và chọn hàng trên xe"}
            </SoftTypography>
            {!isLoad && (
              <SoftButton
                size="small"
                variant="outlined"
                color="info"
                startIcon={<Icon>done_all</Icon>}
                onClick={selectAllTruckItems}
                sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Chọn tất cả hàng trên xe
              </SoftButton>
            )}
          </SoftBox>
          <Autocomplete
            value={null}
            inputValue={productSearch}
            onInputChange={(_, value, reason) => {
              if (reason !== "reset") setProductSearch(value);
            }}
            onChange={(_, product) => product && addProduct(product)}
            options={products}
            loading={loadingProducts}
            openOnFocus
            autoHighlight
            filterOptions={isLoad ? (options) => options : undefined}
            getOptionLabel={(product) =>
              product?.name || product?.productName || product?.code || ""
            }
            isOptionEqualToValue={(option, value) =>
              String(getId(option) || option.productId) === String(getId(value) || value.productId)
            }
            noOptionsText={
              loadingProducts
                ? "Đang tìm sản phẩm..."
                : isLoad
                ? "Không tìm thấy hàng còn tồn trong kho"
                : "Không tìm thấy hàng trên xe"
            }
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                placeholder="Nhập tên, mã hoặc barcode sản phẩm..."
                sx={{
                  "& .MuiOutlinedInput-root": {
                    minHeight: 54,
                    borderRadius: 2,
                    bgcolor: "#fff",
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <Icon sx={{ color: "#1565c0", mr: 1 }}>search</Icon>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, product) => {
              const { key, ...optionProps } = props;
              const stock = stockOf(product);
              return (
                <SoftBox
                  component="li"
                  key={key || getId(product)}
                  {...optionProps}
                  sx={{
                    display: "flex !important",
                    justifyContent: "space-between !important",
                    alignItems: "center !important",
                    gap: "12px !important",
                    py: "10px !important",
                  }}
                >
                  <SoftBox minWidth={0}>
                    <SoftTypography variant="button" fontWeight="bold" display="block">
                      {product.name || product.productName || "Sản phẩm"}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {[product.code, product.barcode].filter(Boolean).join(" · ") || "Chưa có mã"}
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox
                    px={1.25}
                    py={0.6}
                    borderRadius={1.5}
                    bgcolor="#e8f5e9"
                    flexShrink={0}
                    textAlign="center"
                  >
                    <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "#2e7d32" }}>
                      Còn {stock} {product.unit || ""}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              );
            }}
          />

          {!productSearch && products.length > 0 && (
            <SoftBox mt={1.25}>
              <SoftTypography variant="caption" color="text" display="block" mb={0.75}>
                Gợi ý chọn nhanh
              </SoftTypography>
              <SoftBox display="flex" gap={0.75} sx={{ overflowX: "auto", pb: 0.5 }}>
                {products.slice(0, 6).map((product) => (
                  <SoftButton
                    key={getId(product) || product.productId}
                    variant="outlined"
                    color={isLoad ? "info" : "warning"}
                    size="small"
                    onClick={() => addProduct(product)}
                    sx={{
                      minWidth: 150,
                      justifyContent: "flex-start",
                      textTransform: "none",
                      flexShrink: 0,
                    }}
                  >
                    <SoftBox textAlign="left" minWidth={0}>
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        display="block"
                        sx={{ color: "inherit" }}
                      >
                        {product.name || product.productName}
                      </SoftTypography>
                      <SoftTypography variant="caption" sx={{ color: "inherit", opacity: 0.8 }}>
                        Còn {stockOf(product)} {product.unit || ""}
                      </SoftTypography>
                    </SoftBox>
                  </SoftButton>
                ))}
              </SoftBox>
            </SoftBox>
          )}
        </SoftBox>

        <SoftBox mt={2.5}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <SoftTypography variant="button" fontWeight="bold">
              Sản phẩm đã chọn
            </SoftTypography>
            <SoftTypography variant="caption" color="info" fontWeight="bold">
              {items.length} loại
            </SoftTypography>
          </SoftBox>
          {!items.length && (
            <SoftBox
              py={3}
              px={2}
              borderRadius={2}
              textAlign="center"
              bgcolor="#f8fafc"
              sx={{ border: "1px dashed #b8c6d8" }}
            >
              <Icon sx={{ color: "#90a4ae", fontSize: 34 }}>inventory_2</Icon>
              <SoftTypography variant="caption" color="text" display="block">
                Tìm sản phẩm phía trên hoặc bấm vào một gợi ý để chọn nhanh
              </SoftTypography>
            </SoftBox>
          )}
          {items.map((item, index) => {
            const product = selectedProduct(item);
            const stock = stockOf(product);
            const quantity = Number(item.qty || 0);
            return (
              <SoftBox
                key={item.productId}
                p={{ xs: 1.25, md: 1.5 }}
                mb={1}
                borderRadius={2}
                bgcolor="#fff"
                sx={{ border: "1px solid #dce5ef" }}
              >
                <SoftBox display="flex" justifyContent="space-between" gap={1}>
                  <SoftBox minWidth={0}>
                    <SoftTypography variant="button" fontWeight="bold" display="block">
                      {index + 1}. {product.name || product.productName || "Sản phẩm"}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {product.code ? `${product.code} · ` : ""}
                      Còn <b>{stock}</b> {product.unit || ""}
                    </SoftTypography>
                  </SoftBox>
                  <IconButton
                    size="small"
                    aria-label="Xóa sản phẩm"
                    onClick={() =>
                      setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    sx={{ alignSelf: "flex-start", bgcolor: "#ffebee" }}
                  >
                    <Icon color="error">delete</Icon>
                  </IconButton>
                </SoftBox>
                <SoftBox
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={1}
                  mt={1.25}
                >
                  <SoftTypography variant="caption" fontWeight="bold">
                    Số lượng
                  </SoftTypography>
                  <SoftBox display="flex" alignItems="center" gap={0.75}>
                    <IconButton
                      onClick={() => changeQty(index, Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      sx={{ width: 40, height: 40, border: "1px solid #d5dde7" }}
                    >
                      <Icon>remove</Icon>
                    </IconButton>
                    <SoftBox width={80}>
                      <SoftInput
                        type="number"
                        inputProps={{ min: 1, max: stock || undefined, step: 1 }}
                        value={item.qty}
                        onChange={(event) => changeQty(index, event.target.value)}
                        sx={{ textAlign: "center" }}
                      />
                    </SoftBox>
                    <IconButton
                      onClick={() => changeQty(index, quantity + 1)}
                      disabled={stock > 0 && quantity >= stock}
                      sx={{
                        width: 40,
                        height: 40,
                        color: "#fff",
                        bgcolor: "#1976d2",
                        "&:hover": { bgcolor: "#1565c0" },
                        "&.Mui-disabled": { bgcolor: "#e0e0e0" },
                      }}
                    >
                      <Icon>add</Icon>
                    </IconButton>
                  </SoftBox>
                </SoftBox>
              </SoftBox>
            );
          })}
        </SoftBox>
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
            disabled={saving || !transferDate || items.length === 0}
            onClick={save}
          >
            {saving
              ? "Đang xử lý..."
              : isLoad
              ? `Xuất ${selectedTotalQuantity} sản phẩm lên xe`
              : `Hoàn ${selectedTotalQuantity} sản phẩm về kho`}
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
  const [productSearch, setProductSearch] = useState("");
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
    setProductSearch("");
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
  const selectedProduct = (item) =>
    item.product ||
    products.find((product) => String(getId(product)) === String(item.productId)) ||
    {};
  const addProduct = (product) => {
    const productId = getId(product);
    if (!productId) return;
    setPreview(null);
    setItems((current) => {
      const emptyIndex = current.findIndex((item) => !item.productId);
      if (emptyIndex >= 0) {
        return current.map((item, index) =>
          index === emptyIndex ? { ...item, productId, product } : item
        );
      }
      return [...current, { productId, qty: 1, product }];
    });
    setProductSearch("");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };
  const changeQty = (index, value) => {
    change(index, "qty", value === "" ? "" : Math.max(1, Math.floor(Number(value) || 1)));
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
          top: { xs: 0, sm: "50%" },
          left: { xs: 0, sm: "50%" },
          transform: { xs: "none", sm: "translate(-50%, -50%)" },
          width: { xs: "100%", sm: "calc(100% - 32px)", md: 800 },
          height: { xs: "100dvh", sm: "auto" },
          maxHeight: { xs: "100dvh", sm: "92dvh" },
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: { xs: 0, sm: 3 },
          boxShadow: 24,
          p: { xs: 2, sm: 3 },
          WebkitOverflowScrolling: "touch",
        }}
      >
        <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
          <SoftBox display="flex" alignItems="center" gap={1.25} minWidth={0}>
            <SoftBox
              width={44}
              height={44}
              borderRadius={2}
              bgcolor="#e3f2fd"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
            >
              <Icon sx={{ color: "#1565c0", fontSize: 26 }}>sync_alt</Icon>
            </SoftBox>
            <SoftBox minWidth={0}>
              <SoftTypography variant="h5" fontWeight="bold" lineHeight={1.2}>
                Chuyển hàng sang xe khác
              </SoftTypography>
              <SoftTypography variant="caption" color="text" display="block" noWrap>
                Từ {sourceTruck?.code} · {sourceTruck?.name} · {sourceTruck?.licensePlate}
              </SoftTypography>
            </SoftBox>
          </SoftBox>
          <IconButton onClick={onClose} aria-label="Đóng" sx={{ bgcolor: "#f0f2f5" }}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
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
        <SoftBox mt={2.5}>
          <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.75}>
            Tìm hàng đang có trên xe nguồn
          </SoftTypography>
          <Autocomplete
            value={null}
            inputValue={productSearch}
            onInputChange={(_, value, reason) => reason !== "reset" && setProductSearch(value)}
            onChange={(_, product) => product && addProduct(product)}
            options={products}
            openOnFocus
            autoHighlight
            getOptionLabel={(product) => product?.name || product?.code || ""}
            isOptionEqualToValue={(option, value) => getId(option) === getId(value)}
            noOptionsText="Không còn sản phẩm phù hợp trên xe nguồn"
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Nhập tên hoặc mã sản phẩm..."
                sx={{
                  "& .MuiOutlinedInput-root": { minHeight: 52, borderRadius: 2 },
                  "& .MuiAutocomplete-input": { py: "9px !important", lineHeight: "22px" },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <Icon sx={{ color: "#1565c0", mr: 1 }}>search</Icon>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, product) => {
              const { key, ...optionProps } = props;
              return (
                <SoftBox
                  component="li"
                  key={key || getId(product)}
                  {...optionProps}
                  display="flex !important"
                  justifyContent="space-between !important"
                  gap="12px !important"
                  py="10px !important"
                >
                  <SoftBox minWidth={0}>
                    <SoftTypography variant="button" fontWeight="bold" display="block">
                      {product.name || "Sản phẩm"}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {product.code || "Chưa có mã"}
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox px={1.1} py={0.5} borderRadius={1.5} bgcolor="#e8f5e9" flexShrink={0}>
                    <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "#2e7d32" }}>
                      Còn {product.stock || 0} {product.unit || ""}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              );
            }}
          />
          {!productSearch && products.length > 0 && (
            <SoftBox mt={1} display="flex" gap={0.75} sx={{ overflowX: "auto", pb: 0.5 }}>
              {products.slice(0, 6).map((product) => (
                <SoftButton
                  key={getId(product)}
                  variant="outlined"
                  color="info"
                  size="small"
                  onClick={() => addProduct(product)}
                  sx={{
                    minWidth: 145,
                    flexShrink: 0,
                    justifyContent: "flex-start",
                    textTransform: "none",
                  }}
                >
                  <SoftBox textAlign="left" minWidth={0}>
                    <SoftTypography variant="caption" fontWeight="bold" display="block" noWrap>
                      {product.name}
                    </SoftTypography>
                    <SoftTypography variant="caption" sx={{ color: "inherit", opacity: 0.8 }}>
                      Còn {product.stock || 0} {product.unit || ""}
                    </SoftTypography>
                  </SoftBox>
                </SoftButton>
              ))}
            </SoftBox>
          )}
        </SoftBox>

        <SoftBox mt={2.5}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <SoftTypography variant="button" fontWeight="bold">
              Hàng sẽ chuyển
            </SoftTypography>
            <SoftTypography variant="caption" color="info" fontWeight="bold">
              {items.length} loại
            </SoftTypography>
          </SoftBox>
          {!items.length && (
            <SoftBox
              py={3}
              px={2}
              textAlign="center"
              borderRadius={2}
              bgcolor="#f8fafc"
              sx={{ border: "1px dashed #b8c6d8" }}
            >
              <Icon sx={{ color: "#90a4ae", fontSize: 34 }}>inventory_2</Icon>
              <SoftTypography variant="caption" color="text" display="block">
                Chọn sản phẩm ở ô tìm kiếm phía trên
              </SoftTypography>
            </SoftBox>
          )}
          {items.map((item, index) => {
            const product = selectedProduct(item);
            const quantity = Math.max(1, Number(item.qty) || 1);
            const stock = Number(product.stock || 0);
            return (
              <SoftBox
                key={item.productId}
                p={{ xs: 1.5, sm: 2 }}
                mb={1}
                borderRadius={2.5}
                bgcolor="#fff"
                sx={{ border: "2px solid #d9e8f7" }}
              >
                <SoftBox display="flex" justifyContent="space-between" gap={1}>
                  <SoftBox minWidth={0}>
                    <SoftTypography variant="button" color="info" fontWeight="bold" display="block">
                      SẢN PHẨM CHUYỂN #{index + 1}
                    </SoftTypography>
                    <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                      {product.name || "Chưa chọn sản phẩm"}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      Còn trên xe nguồn: <b>{stock}</b> {product.unit || ""}
                    </SoftTypography>
                  </SoftBox>
                  <IconButton
                    size="small"
                    aria-label="Xóa sản phẩm"
                    onClick={() => {
                      setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
                      setPreview(null);
                    }}
                    sx={{ bgcolor: "#ffebee", alignSelf: "flex-start" }}
                  >
                    <Icon color="error">delete</Icon>
                  </IconButton>
                </SoftBox>
                <SoftBox
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                  mt={1.25}
                >
                  <SoftTypography variant="caption" fontWeight="bold">
                    Số lượng chuyển
                  </SoftTypography>
                  <SoftBox display="flex" alignItems="center" gap={0.75}>
                    <IconButton
                      onClick={() => changeQty(index, quantity - 1)}
                      disabled={quantity <= 1}
                      sx={{ width: 42, height: 42, border: "1px solid #d5dde7" }}
                    >
                      <Icon>remove</Icon>
                    </IconButton>
                    <SoftBox width={84}>
                      <SoftInput
                        type="number"
                        inputProps={{ min: 1, step: 1 }}
                        value={item.qty}
                        onChange={(event) => changeQty(index, event.target.value)}
                        sx={{ "& input": { textAlign: "center", fontWeight: 700 } }}
                      />
                    </SoftBox>
                    <IconButton
                      onClick={() => changeQty(index, quantity + 1)}
                      sx={{
                        width: 42,
                        height: 42,
                        color: "#fff",
                        bgcolor: "#1976d2",
                        "&:hover": { bgcolor: "#1565c0" },
                        "&.Mui-disabled": { bgcolor: "#e0e0e0" },
                      }}
                    >
                      <Icon>add</Icon>
                    </IconButton>
                  </SoftBox>
                </SoftBox>
              </SoftBox>
            );
          })}
          <SoftButton
            variant="outlined"
            color="info"
            startIcon={<Icon>add</Icon>}
            fullWidth
            onClick={() => {
              setItems((current) => [...current, { productId: "", qty: 1 }]);
              setPreview(null);
            }}
            sx={{
              mt: 0.5,
              minHeight: 52,
              border: "2px dashed #1976d2",
              bgcolor: "#f3f8ff",
              fontWeight: 700,
              "&:hover": { border: "2px solid #1976d2", bgcolor: "#eaf3ff" },
            }}
          >
            Thêm dòng sản phẩm
          </SoftButton>
        </SoftBox>
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
        <SoftBox
          display="grid"
          gap={1.25}
          mt={3}
          sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" } }}
        >
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

function TruckInventoryModal({ truck, onClose, onChanged }) {
  const isAdmin =
    String(useSelector((state) => state.auth?.user?.role) || "").toLowerCase() === "admin";
  const [detail, setDetail] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [detailTab, setDetailTab] = useState(0);
  const [salesPeriod, setSalesPeriod] = useState("WEEK");
  const [salesDate, setSalesDate] = useState(todayValue());
  const [salesWeek, setSalesWeek] = useState(currentWeekValue());
  const [salesSort, setSalesSort] = useState("desc");
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [goodsReport, setGoodsReport] = useState({ summary: {}, data: [] });
  const [goodsReportLoading, setGoodsReportLoading] = useState(false);
  const [goodsReportExporting, setGoodsReportExporting] = useState(false);
  const [stockCheckFile, setStockCheckFile] = useState(null);
  const [stockCheckResult, setStockCheckResult] = useState(null);
  const [stockCheckFilter, setStockCheckFilter] = useState("ALL");
  const [stockCheckDownloading, setStockCheckDownloading] = useState(false);
  const [stockCheckComparing, setStockCheckComparing] = useState(false);
  const [stockCheckExporting, setStockCheckExporting] = useState(false);
  const [stockCheckMode, setStockCheckMode] = useState("DIRECT");
  const [directCounts, setDirectCounts] = useState({});
  const [directNotes, setDirectNotes] = useState({});
  const [directSearch, setDirectSearch] = useState("");
  const [directFilter, setDirectFilter] = useState("ALL");
  const [directDraftTruckId, setDirectDraftTruckId] = useState("");
  const [stockAction, setStockAction] = useState(null);
  const [stockActionReason, setStockActionReason] = useState("");
  const [stockActionConfirmation, setStockActionConfirmation] = useState("");
  const [stockActionAcknowledged, setStockActionAcknowledged] = useState(false);
  const [stockActionLoading, setStockActionLoading] = useState(false);
  const [inventoryBackups, setInventoryBackups] = useState([]);
  const [inventoryBackupMeta, setInventoryBackupMeta] = useState(EMPTY_META);
  const [inventoryBackupPage, setInventoryBackupPage] = useState(1);
  const [inventoryBackupReloadKey, setInventoryBackupReloadKey] = useState(0);
  const [inventoryBackupsLoading, setInventoryBackupsLoading] = useState(false);
  const [inventoryBackupDetail, setInventoryBackupDetail] = useState(null);
  const [inventoryBackupDetailLoading, setInventoryBackupDetailLoading] = useState(false);
  const [inventoryBackupExporting, setInventoryBackupExporting] = useState("");

  useEffect(() => {
    if (!isAdmin && detailTab > 2) setDetailTab(0);
  }, [isAdmin, detailTab]);

  useEffect(() => {
    if (!truck) return undefined;
    let active = true;
    setDetail(null);
    setAvailableProducts([]);
    setSearch("");
    setDetailTab(0);
    setSalesPeriod("WEEK");
    setSalesDate(todayValue());
    setSalesWeek(currentWeekValue());
    setSalesSort("desc");
    setSalesInvoices([]);
    setGoodsReport({ summary: {}, data: [] });
    setStockCheckFile(null);
    setStockCheckResult(null);
    setStockCheckFilter("ALL");
    setStockCheckMode("DIRECT");
    setDirectSearch("");
    setDirectFilter("ALL");
    setDirectDraftTruckId("");
    setStockAction(null);
    setStockActionReason("");
    setStockActionConfirmation("");
    setStockActionAcknowledged(false);
    setInventoryBackups([]);
    setInventoryBackupMeta(EMPTY_META);
    setInventoryBackupPage(1);
    setInventoryBackupDetail(null);
    try {
      const saved = JSON.parse(
        localStorage.getItem(`truck-stock-check-draft-${getId(truck)}`) || "{}"
      );
      setDirectCounts(saved.counts && typeof saved.counts === "object" ? saved.counts : {});
      setDirectNotes(saved.notes && typeof saved.notes === "object" ? saved.notes : {});
    } catch {
      setDirectCounts({});
      setDirectNotes({});
    }
    setDirectDraftTruckId(String(getId(truck)));
    setLoading(true);
    setPricesLoading(true);
    TruckService.getById(getId(truck))
      .then((response) => {
        if (active) setDetail(unwrap(response) || truck);
      })
      .catch((error) => {
        if (active) {
          setDetail(truck);
          toast.error(apiError(error, "Không thể tải chi tiết hàng trên xe"));
        }
      })
      .finally(() => active && setLoading(false));
    TruckService.getTruckAvailableProducts(getId(truck), { page: 1, limit: 20 })
      .then(async (firstResponse) => {
        const firstPage = listOf(firstResponse);
        const totalPages = metaOf(firstResponse).totalPages || 1;
        if (totalPages <= 1) return firstPage;
        const remaining = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            TruckService.getTruckAvailableProducts(getId(truck), {
              page: index + 2,
              limit: 20,
            })
          )
        );
        return firstPage.concat(...remaining.map(listOf));
      })
      .then((products) => active && setAvailableProducts(products))
      .catch(() => active && setAvailableProducts([]))
      .finally(() => active && setPricesLoading(false));
    return () => {
      active = false;
    };
  }, [truck]);

  useEffect(() => {
    if (!truck || directDraftTruckId !== String(getId(truck))) return;
    localStorage.setItem(
      `truck-stock-check-draft-${getId(truck)}`,
      JSON.stringify({
        counts: directCounts,
        notes: directNotes,
        savedAt: new Date().toISOString(),
      })
    );
  }, [truck, directCounts, directNotes, directDraftTruckId]);

  useEffect(() => {
    if (!truck || !isAdmin || detailTab !== 3 || stockCheckMode !== "BACKUPS") return undefined;
    let active = true;
    setInventoryBackupsLoading(true);
    TruckService.getInventoryBackups(getId(truck), {
      page: inventoryBackupPage,
      limit: 10,
    })
      .then((response) => {
        if (!active) return;
        const nextBackups = listOf(response);
        setInventoryBackups((current) =>
          inventoryBackupPage > 1 ? mergeUniqueItems(current, nextBackups) : nextBackups
        );
        const responseMeta = metaOf(response);
        setInventoryBackupMeta({
          ...EMPTY_META,
          ...responseMeta,
          totalItems: responseMeta.totalItems ?? responseMeta.total ?? 0,
        });
      })
      .catch((error) => {
        if (!active) return;
        if (inventoryBackupPage === 1) setInventoryBackups([]);
        toast.error(apiError(error, "Không thể tải danh sách bản sao tồn xe"));
      })
      .finally(() => active && setInventoryBackupsLoading(false));
    return () => {
      active = false;
    };
  }, [truck, isAdmin, detailTab, stockCheckMode, inventoryBackupPage, inventoryBackupReloadKey]);

  useEffect(() => {
    if (!truck || detailTab !== 1) return undefined;
    let active = true;
    const range =
      salesPeriod === "DAY"
        ? { from: salesDate, to: salesDate }
        : salesPeriod === "WEEK"
        ? weekRange(salesWeek)
        : {};
    setGoodsReportLoading(true);
    TruckService.getGoodsReport(getId(truck), range)
      .then((response) => {
        if (!active) return;
        const report = unwrap(response) || {};
        setGoodsReport({
          ...report,
          summary: report.summary && typeof report.summary === "object" ? report.summary : {},
          data: Array.isArray(report.data) ? report.data : [],
        });
      })
      .catch((error) => {
        if (!active) return;
        setGoodsReport({ summary: {}, data: [] });
        toast.error(apiError(error, "Không thể tải tổng hợp hàng hóa trên xe"));
      })
      .finally(() => active && setGoodsReportLoading(false));
    return () => {
      active = false;
    };
  }, [truck, detailTab, salesPeriod, salesDate, salesWeek]);

  useEffect(() => {
    if (!truck || detailTab !== 2) return undefined;
    let active = true;
    const range =
      salesPeriod === "DAY"
        ? { from: salesDate, to: salesDate }
        : salesPeriod === "WEEK"
        ? weekRange(salesWeek)
        : {};
    const params = {
      truckId: getId(truck),
      sourceType: "truck",
      from: range.from,
      to: range.to,
      page: 1,
      limit: 100,
    };
    setSalesLoading(true);
    const returnParams = {
      destinationTruckId: getId(truck),
      page: 1,
      limit: 100,
    };
    Promise.all([InvoiceService.getAll(params), CustomerReturnService.getAll(returnParams)])
      .then(async ([firstInvoiceResponse, firstReturnResponse]) => {
        const invoiceFirstPage = listOf(firstInvoiceResponse);
        const invoiceTotalPages = metaOf(firstInvoiceResponse).totalPages || 1;
        const returnFirstPage = listOf(firstReturnResponse);
        const returnTotalPages = metaOf(firstReturnResponse).totalPages || 1;
        const [invoiceRemaining, returnRemaining] = await Promise.all([
          invoiceTotalPages <= 1
            ? []
            : Promise.all(
                Array.from({ length: invoiceTotalPages - 1 }, (_, index) =>
                  InvoiceService.getAll({ ...params, page: index + 2 })
                )
              ),
          returnTotalPages <= 1
            ? []
            : Promise.all(
                Array.from({ length: returnTotalPages - 1 }, (_, index) =>
                  CustomerReturnService.getAll({ ...returnParams, page: index + 2 })
                )
              ),
        ]);
        const customerReturns = returnFirstPage
          .concat(...returnRemaining.map(listOf))
          .filter((item) => {
            const inRange = (value) => {
              const day = vietnamDateKey(value);
              return (
                Boolean(day) && (!range.from || day >= range.from) && (!range.to || day <= range.to)
              );
            };
            return inRange(item.createdAt || item.date) || inRange(item.reversedAt);
          });
        return {
          invoices: invoiceFirstPage.concat(...invoiceRemaining.map(listOf)),
          customerReturns,
        };
      })
      .then(async ({ invoices, customerReturns }) => {
        const truckInvoices = invoices.filter(
          (invoice) => invoice.sourceType === "truck" && sameId(invoice.truckId, getId(truck))
        );
        const completed = await Promise.all(
          truckInvoices.map(async (invoice) => {
            if (Array.isArray(invoice.items)) return invoice;
            try {
              return unwrap(await InvoiceService.getById(getId(invoice))) || invoice;
            } catch {
              return invoice;
            }
          })
        );
        const truckInventoryValue =
          detail?.inventory ||
          detail?.inventoryItems ||
          detail?.products ||
          truck?.inventory ||
          truck?.inventoryItems ||
          [];
        const truckInventoryRows = Array.isArray(truckInventoryValue)
          ? truckInventoryValue
          : truckInventoryValue?.items || truckInventoryValue?.docs || [];
        const productIds = Array.from(
          new Set(
            [
              ...completed.flatMap((invoice) =>
                (Array.isArray(invoice.items) ? invoice.items : []).map(
                  (item) =>
                    getId(item.productId) ||
                    getId(item.product) ||
                    (typeof item.productId === "string" ? item.productId : null)
                )
              ),
              ...customerReturns.flatMap((customerReturn) =>
                (Array.isArray(customerReturn.items) ? customerReturn.items : [])
                  .map((item) => item.productId)
                  .filter(Boolean)
              ),
              ...truckInventoryRows.map(productIdOf),
              ...availableProducts.map(productIdOf),
            ].filter(Boolean)
          )
        );
        const movementGroups = await Promise.all(
          productIds.map(async (productId) => {
            const movementParams = {
              from: range.from,
              to: range.to,
              page: 1,
              limit: 100,
            };
            const firstResponse = await InventoryService.getProductMovements(
              productId,
              movementParams
            );
            const firstPage = listOf(firstResponse);
            const totalPages = metaOf(firstResponse).totalPages || 1;
            if (totalPages <= 1) {
              return firstPage.map((movement) => ({ ...movement, productId }));
            }
            const remaining = await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, index) =>
                InventoryService.getProductMovements(productId, {
                  ...movementParams,
                  page: index + 2,
                })
              )
            );
            return firstPage
              .concat(...remaining.map(listOf))
              .map((movement) => ({ ...movement, productId }));
          })
        );
        const movements = movementGroups.flat();
        const usedMovements = new Set();
        const withInventorySnapshots = completed.map((invoice) => ({
          ...invoice,
          items: (Array.isArray(invoice.items) ? invoice.items : []).map((item) => {
            const productId =
              getId(item.productId) ||
              getId(item.product) ||
              (typeof item.productId === "string" ? item.productId : null);
            const giftTypes = ["INVOICE_GIFT_FROM_TRUCK", "PROMOTION_GIFT_FROM_TRUCK"];
            const expectedTypes = item.lineType === "GIFT" ? giftTypes : ["TRUCK_SALE"];
            const movementIndex = movements.findIndex(
              (movement, index) =>
                !usedMovements.has(index) &&
                sameId(movement.productId, productId) &&
                expectedTypes.includes(movement.type) &&
                sameId(movement.sourceLocation?.id, getId(truck)) &&
                (sameId(movement.reference?.id, getId(invoice)) ||
                  (movement.reference?.code &&
                    invoice.code &&
                    movement.reference.code === invoice.code))
            );
            if (movementIndex < 0) return item;
            usedMovements.add(movementIndex);
            const movement = movements[movementIndex];
            return {
              ...item,
              truckQuantityBefore: movement.quantityBefore,
              truckQuantityAfter: movement.quantityAfter,
            };
          }),
        }));
        const productMeta = new Map();
        const rememberProduct = (item) => {
          const id = productIdOf(item);
          if (!id) return;
          const product = productOf(item);
          productMeta.set(String(id), {
            id,
            name:
              item?.productName ||
              item?.name ||
              product?.name ||
              product?.productName ||
              "Sản phẩm",
            code: item?.productCode || item?.code || product?.code || product?.productCode || "",
            unit: item?.unit || product?.unit || "",
          });
        };
        truckInventoryRows.forEach(rememberProduct);
        availableProducts.forEach(rememberProduct);
        completed.forEach((invoice) =>
          (Array.isArray(invoice.items) ? invoice.items : []).forEach(rememberProduct)
        );
        customerReturns.forEach((customerReturn) =>
          (Array.isArray(customerReturn.items) ? customerReturn.items : []).forEach(rememberProduct)
        );
        const reversalGroups = new Map();
        movements
          .filter(
            (movement) =>
              movement.type === "INVOICE_REVERSAL_TO_TRUCK" &&
              sameId(movement.destinationLocation?.id, getId(truck))
          )
          .forEach((movement) => {
            const key =
              movement.reference?.id ||
              movement.reference?.code ||
              movement.id ||
              `${movement.productId}-${movement.createdAt}`;
            reversalGroups.set(key, [...(reversalGroups.get(key) || []), movement]);
          });
        const reversalInvoiceIds = Array.from(reversalGroups.values())
          .map((group) => group[0]?.reference?.id)
          .filter(Boolean);
        const reversalInvoiceRows = await Promise.all(
          reversalInvoiceIds.map(async (invoiceId) => {
            try {
              return unwrap(await InvoiceService.getById(invoiceId));
            } catch {
              return null;
            }
          })
        );
        const reversalInvoiceById = new Map(
          reversalInvoiceRows.filter(Boolean).map((invoice) => [String(getId(invoice)), invoice])
        );
        const reversalEvents = Array.from(reversalGroups.entries()).map(([key, group]) => {
          const firstMovement = group[0] || {};
          const originalInvoice = reversalInvoiceById.get(
            String(firstMovement.reference?.id || "")
          );
          const eventDate = group.reduce((latest, movement) => {
            const movementTime = new Date(movement.createdAt || 0).getTime();
            return movementTime > latest ? movementTime : latest;
          }, 0);
          return {
            ...(originalInvoice || {}),
            id: `reversal-${key}`,
            eventType: "REVERSAL",
            code: firstMovement.reference?.code || originalInvoice?.reversalCode || "HOÀN HÀNG",
            invoiceCode: originalInvoice?.code,
            createdAt: eventDate ? new Date(eventDate).toISOString() : new Date().toISOString(),
            items: group.map((movement) => {
              const meta = productMeta.get(String(movement.productId)) || {};
              return {
                productId: movement.productId,
                productName: meta.name || "Sản phẩm",
                productCode: meta.code || "",
                unit: meta.unit || "",
                qty: Math.abs(Number(movement.quantityChange || 0)),
                truckQuantityBefore: movement.quantityBefore,
                truckQuantityAfter: movement.quantityAfter,
                movementType: movement.type,
              };
            }),
          };
        });
        const isInSelectedRange = (value) => {
          const day = vietnamDateKey(value);
          return (
            Boolean(day) && (!range.from || day >= range.from) && (!range.to || day <= range.to)
          );
        };
        const movementForReturnItem = (customerReturn, item, movementType) =>
          movements.find(
            (movement) =>
              movement.type === movementType &&
              sameId(movement.productId, item.productId) &&
              (sameId(movement.reference?.id, getId(customerReturn)) ||
                (movement.reference?.code && movement.reference.code === customerReturn.code)) &&
              (movementType === "CUSTOMER_RETURN_REVERSED"
                ? sameId(movement.sourceLocation?.id, getId(truck))
                : sameId(movement.destinationLocation?.id, getId(truck)))
          );
        const mapReturnItems = (customerReturn, movementType) =>
          (Array.isArray(customerReturn.items) ? customerReturn.items : []).map((item) => {
            const movement = item.productId
              ? movementForReturnItem(customerReturn, item, movementType)
              : null;
            return {
              ...item,
              productName: item.productName || item.manualName || "Hàng ngoài danh mục",
              productCode: item.productCode || item.manualCode || "",
              unit: item.unit || item.manualUnit || "",
              qty: Number(item.qty || 0),
              truckQuantityBefore: movement?.quantityBefore,
              truckQuantityAfter: movement?.quantityAfter,
              movementType: movement?.type || movementType,
              unclassified: item.itemType === "MANUAL" || Boolean(item.manualName),
            };
          });
        const customerReturnEvents = customerReturns.flatMap((customerReturn) => {
          const events = [];
          if (isInSelectedRange(customerReturn.createdAt || customerReturn.date)) {
            events.push({
              ...customerReturn,
              id: `customer-return-${getId(customerReturn) || customerReturn.code}`,
              eventType: "CUSTOMER_RETURN",
              createdAt: customerReturn.createdAt || customerReturn.date,
              items: mapReturnItems(customerReturn, "CUSTOMER_RETURN_TO_TRUCK"),
            });
          }
          if (
            customerReturn.status === "REVERSED" &&
            isInSelectedRange(customerReturn.reversedAt)
          ) {
            events.push({
              ...customerReturn,
              id: `customer-return-reversed-${getId(customerReturn) || customerReturn.code}`,
              eventType: "CUSTOMER_RETURN_REVERSAL",
              code: customerReturn.code,
              createdAt: customerReturn.reversedAt,
              items: mapReturnItems(customerReturn, "CUSTOMER_RETURN_REVERSED"),
            });
          }
          return events;
        });
        if (!active) return;
        const sorted = [...withInventorySnapshots, ...reversalEvents, ...customerReturnEvents].sort(
          (left, right) => {
            const leftTime = new Date(left.createdAt || left.date || 0).getTime();
            const rightTime = new Date(right.createdAt || right.date || 0).getTime();
            return salesSort === "asc" ? leftTime - rightTime : rightTime - leftTime;
          }
        );
        setSalesInvoices(sorted);
      })
      .catch((error) => {
        if (active) {
          setSalesInvoices([]);
          toast.error(apiError(error, "Không thể tải lịch sử bán hàng trên xe"));
        }
      })
      .finally(() => active && setSalesLoading(false));
    return () => {
      active = false;
    };
  }, [truck, detail, availableProducts, detailTab, salesPeriod, salesDate, salesWeek, salesSort]);

  if (!truck) return null;

  const currentTruck = detail || truck;
  const inventoryValue =
    currentTruck.inventory ||
    currentTruck.inventoryItems ||
    currentTruck.products ||
    truck.inventoryPreview ||
    truck.inventory ||
    [];
  const inventory = Array.isArray(inventoryValue)
    ? inventoryValue
    : inventoryValue?.items || inventoryValue?.docs || [];
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const visibleInventory = inventory.filter((item) => {
    if (!normalizedSearch) return true;
    const product = productOf(item);
    return [
      product.name,
      item.productName,
      item.name,
      product.code,
      item.productCode,
      item.code,
      product.barcode,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("vi").includes(normalizedSearch));
  });
  const totalQuantity =
    currentTruck.inventorySummary?.totalQuantity ??
    currentTruck.totalQuantity ??
    inventory.reduce((sum, item) => sum + quantityOf(item), 0);
  const availableProductMap = new Map();
  availableProducts.forEach((item) => {
    const product = productOf(item);
    [productIdOf(item), getId(item), item.productId, product.code, item.productCode, item.code]
      .filter((value) => typeof value === "string" || typeof value === "number")
      .forEach((value) => availableProductMap.set(String(value), item));
  });
  const driverName =
    currentTruck.driver?.fullName ||
    currentTruck.driverName ||
    (typeof currentTruck.driver === "string" ? currentTruck.driver : "") ||
    "Chưa phân công";
  const driverPhone =
    currentTruck.driver?.phone || currentTruck.driverPhone || currentTruck.phone || "—";

  const productDetail = (item) => {
    const product = productOf(item);
    const quantity = quantityOf(item);
    const availableItem =
      availableProductMap.get(String(productIdOf(item) || "")) ||
      availableProductMap.get(String(product.code || item.productCode || item.code || "")) ||
      {};
    const availableProduct = productOf(availableItem);
    const sellPrice = Number(
      availableItem.sellPrice ??
        availableItem.salePrice ??
        availableItem.sellingPrice ??
        availableItem.price ??
        availableProduct.sellPrice ??
        availableProduct.salePrice ??
        availableProduct.sellingPrice ??
        availableProduct.price ??
        item.sellPrice ??
        item.salePrice ??
        item.sellingPrice ??
        product.sellPrice ??
        product.salePrice ??
        product.sellingPrice ??
        product.price ??
        item.price ??
        0
    );
    return {
      product,
      quantity,
      sellPrice,
      name: product.name || item.productName || item.name || "Sản phẩm không còn tồn tại",
      code: product.code || item.productCode || item.code || "—",
      barcode: product.barcode || item.barcode || "",
      unit: product.unit || item.unit || "—",
    };
  };
  const totalSellingValue = inventory.reduce(
    (sum, item) => sum + productDetail(item).sellPrice * quantityOf(item),
    0
  );
  const directStockRows = inventory.map((item, index) => {
    const product = productDetail(item);
    const code =
      product.code === "—"
        ? ""
        : String(product.code || "")
            .trim()
            .toUpperCase();
    const key = code || `missing-code-${productIdOf(item) || index}`;
    const rawActual = Object.prototype.hasOwnProperty.call(directCounts, key)
      ? directCounts[key]
      : "";
    const actualQuantity = rawActual === "" ? null : Number(rawActual);
    const differenceQuantity =
      actualQuantity === null || Number.isNaN(actualQuantity)
        ? null
        : actualQuantity - product.quantity;
    return {
      key,
      code,
      name: product.name,
      barcode: product.barcode,
      unit: product.unit,
      systemQuantity: product.quantity,
      rawActual,
      actualQuantity,
      differenceQuantity,
      note: directNotes[key] || "",
    };
  });
  const directCountedProducts = directStockRows.filter(
    (item) => item.rawActual !== "" && Number.isInteger(item.actualQuantity)
  ).length;
  const directProgressPercent = directStockRows.length
    ? Math.round((directCountedProducts / directStockRows.length) * 100)
    : 0;
  const normalizedDirectSearch = directSearch.trim().toLocaleLowerCase("vi");
  const visibleDirectStockRows = directStockRows.filter((item) => {
    const searchMatches =
      !normalizedDirectSearch ||
      [item.code, item.name, item.barcode].some((value) =>
        String(value || "")
          .toLocaleLowerCase("vi")
          .includes(normalizedDirectSearch)
      );
    if (!searchMatches) return false;
    if (directFilter === "NOT_COUNTED") return item.rawActual === "";
    if (directFilter === "COUNTED") return item.rawActual !== "";
    if (directFilter === "DIFFERENCE") {
      return item.differenceQuantity !== null && item.differenceQuantity !== 0;
    }
    return true;
  });
  const selectedSalesRange =
    salesPeriod === "DAY"
      ? { from: salesDate, to: salesDate }
      : salesPeriod === "WEEK"
      ? weekRange(salesWeek)
      : {};
  const salesProductSummary = Array.isArray(goodsReport.data) ? goodsReport.data : [];
  const salesTotals = {
    documentCount: 0,
    soldQuantity: 0,
    giftQuantity: 0,
    invoiceReturnQuantity: 0,
    customerReturnQuantity: 0,
    inboundQuantity: 0,
    outboundQuantity: 0,
    returnReversedQuantity: 0,
    netQuantity: 0,
    revenue: 0,
    ...(goodsReport.summary || {}),
  };
  const exportTruckGoods = async () => {
    if (!salesProductSummary.length) {
      toast.error("Không có dữ liệu hàng hóa trong khoảng thời gian đã chọn");
      return;
    }
    try {
      setGoodsReportExporting(true);
      const response = await TruckService.exportGoodsReport(getId(truck), selectedSalesRange);
      downloadApiFile(
        response,
        `hang-hoa-${currentTruck.code || "xe"}-${selectedSalesRange.from || "tat-ca"}-${
          selectedSalesRange.to || "tat-ca"
        }.xlsx`
      );
      toast.success("Đã xuất tổng hợp hàng hóa trên xe");
    } catch (error) {
      toast.error(apiError(error, "Không thể xuất file Excel"));
    } finally {
      setGoodsReportExporting(false);
    }
  };
  const downloadStockCheckTemplate = async () => {
    try {
      setStockCheckDownloading(true);
      const response = await TruckService.downloadStockCheckTemplate(getId(truck));
      downloadApiFile(response, `kiem-hang-${currentTruck.code || "xe"}.xlsx`);
      toast.success("Đã tải file mẫu kiểm hàng");
    } catch (error) {
      toast.error(apiError(error, "Không thể tải file mẫu kiểm hàng"));
    } finally {
      setStockCheckDownloading(false);
    }
  };
  const selectStockCheckFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!String(file.name).toLowerCase().endsWith(".xlsx")) {
      toast.error("Chỉ hỗ trợ file Excel định dạng .xlsx");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File Excel không được vượt quá 10MB");
      return;
    }
    setStockCheckFile(file);
    setStockCheckResult(null);
    setStockCheckFilter("ALL");
  };
  const runStockCheckComparison = async (file) => {
    try {
      setStockCheckComparing(true);
      const response = await TruckService.compareStockCheck(getId(truck), file);
      const result = unwrap(response) || {};
      setStockCheckResult({
        ...result,
        summary: result.summary && typeof result.summary === "object" ? result.summary : {},
        items: Array.isArray(result.items) ? result.items : [],
      });
      setStockCheckFilter("ALL");
      toast.success("Đã đối chiếu số lượng thực tế với tồn trên app");
    } catch (error) {
      toast.error(apiError(error, "Không thể đối chiếu file kiểm hàng"));
    } finally {
      setStockCheckComparing(false);
    }
  };
  const compareStockCheck = () => {
    if (!stockCheckFile) {
      toast.error("Vui lòng chọn file Excel đã điền số lượng thực tế");
      return;
    }
    runStockCheckComparison(stockCheckFile);
  };
  const compareDirectStockCheck = () => {
    if (!directCountedProducts) {
      toast.error("Vui lòng nhập số lượng thực tế của ít nhất một sản phẩm");
      return;
    }
    const rows = directStockRows.map((item, index) => ({
      STT: index + 1,
      "MÃ SẢN PHẨM": item.code,
      "TÊN SẢN PHẨM": item.name,
      "ĐƠN VỊ": item.unit,
      "SỐ LƯỢNG TRÊN APP": item.systemQuantity,
      "SỐ LƯỢNG THỰC TẾ": item.rawActual === "" ? "" : Number(item.rawActual),
      "GHI CHÚ": item.note,
    }));
    const file = createExcelFile(
      rows,
      `kiem-hang-truc-tiep-${currentTruck.code || "xe"}.xlsx`,
      "Kiểm hàng xe"
    );
    runStockCheckComparison(file);
  };
  const clearDirectStockCheck = () => {
    if (
      directCountedProducts &&
      !window.confirm("Xóa toàn bộ số lượng thực tế và ghi chú đang nhập?")
    )
      return;
    setDirectCounts({});
    setDirectNotes({});
    setStockCheckResult(null);
    localStorage.removeItem(`truck-stock-check-draft-${getId(truck)}`);
  };
  const exportStockCheckResult = async () => {
    if (!stockCheckResult?.comparisonId) return;
    try {
      setStockCheckExporting(true);
      const response = await TruckService.exportStockCheck(stockCheckResult.comparisonId);
      downloadApiFile(response, `ket-qua-kiem-hang-${currentTruck.code || "xe"}.xlsx`);
      toast.success("Đã tải kết quả đối chiếu");
    } catch (error) {
      toast.error(apiError(error, "Không thể xuất kết quả đối chiếu"));
    } finally {
      setStockCheckExporting(false);
    }
  };
  const refreshTruckInventory = async () => {
    const response = await TruckService.getById(getId(truck));
    setDetail(unwrap(response) || truck);
    onChanged?.();
  };
  const resetStockAction = () => {
    setStockAction(null);
    setStockActionReason("");
    setStockActionConfirmation("");
    setStockActionAcknowledged(false);
  };
  const openStockSyncPreview = async () => {
    if (!stockCheckResult?.comparisonId) return;
    try {
      setStockActionLoading(true);
      const response = await TruckService.previewStockCheckSync(stockCheckResult.comparisonId);
      setStockAction({
        type: "SYNC",
        preview: unwrap(response) || {},
        idempotencyKey: makeIdempotencyKey("stock-sync"),
      });
      setStockActionReason("");
      setStockActionConfirmation("");
      setStockActionAcknowledged(false);
    } catch (error) {
      toast.error(apiError(error, "Không thể kiểm tra điều kiện đồng bộ"));
    } finally {
      setStockActionLoading(false);
    }
  };
  const openBackupDetail = async (backup) => {
    try {
      setInventoryBackupDetailLoading(true);
      const response = await TruckService.getInventoryBackup(getId(backup));
      setInventoryBackupDetail(unwrap(response) || backup);
    } catch (error) {
      toast.error(apiError(error, "Không thể tải chi tiết bản sao"));
    } finally {
      setInventoryBackupDetailLoading(false);
    }
  };
  const exportInventoryBackup = async (backup) => {
    const backupId = getId(backup);
    try {
      setInventoryBackupExporting(String(backupId));
      const response = await TruckService.exportInventoryBackup(backupId);
      downloadApiFile(response, `${backup.code || "backup-ton-xe"}.xlsx`);
      toast.success("Đã tải file bản sao tồn xe");
    } catch (error) {
      toast.error(apiError(error, "Không thể xuất bản sao tồn xe"));
    } finally {
      setInventoryBackupExporting("");
    }
  };
  const openRestorePreview = async (backup) => {
    try {
      setStockActionLoading(true);
      const response = await TruckService.previewInventoryRestore(getId(backup));
      setStockAction({
        type: "RESTORE",
        backup,
        preview: unwrap(response) || {},
        idempotencyKey: makeIdempotencyKey("restore"),
      });
      setStockActionReason("");
      setStockActionConfirmation("");
      setStockActionAcknowledged(false);
    } catch (error) {
      toast.error(apiError(error, "Không thể kiểm tra điều kiện khôi phục"));
    } finally {
      setStockActionLoading(false);
    }
  };
  const submitStockAction = async () => {
    if (!stockAction) return;
    const isRestore = stockAction.type === "RESTORE";
    const requiredConfirmation = isRestore ? "KHOI PHUC TON XE" : "DONG BO TON XE";
    if (!stockActionReason.trim()) {
      toast.error("Vui lòng nhập lý do thực hiện");
      return;
    }
    if (stockActionConfirmation.trim() !== requiredConfirmation) {
      toast.error(`Vui lòng nhập chính xác ${requiredConfirmation}`);
      return;
    }
    try {
      setStockActionLoading(true);
      const payload = {
        reason: stockActionReason.trim(),
        confirmation: requiredConfirmation,
        idempotencyKey:
          stockAction.idempotencyKey || makeIdempotencyKey(isRestore ? "restore" : "stock-sync"),
      };
      if (isRestore) {
        await TruckService.restoreInventoryBackup(getId(stockAction.backup), payload);
      } else {
        await TruckService.syncStockCheck(stockCheckResult.comparisonId, payload);
        localStorage.removeItem(`truck-stock-check-draft-${getId(truck)}`);
        setDirectCounts({});
        setDirectNotes({});
      }
      await refreshTruckInventory();
      setInventoryBackupPage(1);
      setInventoryBackups([]);
      setInventoryBackupReloadKey((value) => value + 1);
      setStockCheckResult(null);
      resetStockAction();
      setStockCheckMode("BACKUPS");
      toast.success(
        isRestore ? "Đã khôi phục tồn xe từ bản sao" : "Đã đồng bộ số lượng thực tế lên xe"
      );
    } catch (error) {
      const payload = error?.response?.data;
      const changedProducts = payload?.changedProducts || payload?.message?.changedProducts;
      if (Array.isArray(changedProducts) && changedProducts.length) {
        toast.error(`Tồn xe đã thay đổi ở ${changedProducts.length} sản phẩm. Hãy kiểm hàng lại.`);
      } else {
        toast.error(
          apiError(error, isRestore ? "Không thể khôi phục tồn xe" : "Không thể đồng bộ tồn xe")
        );
      }
    } finally {
      setStockActionLoading(false);
    }
  };
  const stockCheckItems = Array.isArray(stockCheckResult?.items) ? stockCheckResult.items : [];
  const visibleStockCheckItems = stockCheckItems.filter(
    (item) => stockCheckFilter === "ALL" || item.status === stockCheckFilter
  );

  return (
    <>
      <Modal open onClose={onClose}>
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: 0, md: "50%" },
            left: { xs: 0, md: "50%" },
            transform: { xs: "none", md: "translate(-50%, -50%)" },
            width: { xs: "100%", md: "min(1100px, 94vw)" },
            height: { xs: "100dvh", md: "auto" },
            maxHeight: { md: "92vh" },
            bgcolor: "#fff",
            borderRadius: { xs: 0, md: 3 },
            boxShadow: 24,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SoftBox
            px={{ xs: 2, md: 3 }}
            py={{ xs: 1.75, md: 2.25 }}
            sx={{ borderBottom: "1px solid #e9ecef", flexShrink: 0 }}
          >
            <SoftBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
              <SoftBox display="flex" alignItems="center" gap={1.5} minWidth={0}>
                <SoftBox
                  width={{ xs: 44, md: 50 }}
                  height={{ xs: 44, md: 50 }}
                  borderRadius={2}
                  bgcolor="#e3f2fd"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Icon sx={{ color: "#1565c0", fontSize: { xs: 27, md: 31 } }}>
                    local_shipping
                  </Icon>
                </SoftBox>
                <SoftBox minWidth={0}>
                  <SoftTypography
                    variant="h5"
                    fontWeight="bold"
                    sx={{ fontSize: { xs: "1.1rem", md: "1.35rem" } }}
                  >
                    {currentTruck.name || "Chi tiết xe"}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text" display="block">
                    {currentTruck.code || "—"} · {currentTruck.licensePlate || "Chưa có biển số"}
                  </SoftTypography>
                </SoftBox>
              </SoftBox>
              <IconButton
                aria-label="Đóng chi tiết xe"
                onClick={onClose}
                sx={{ bgcolor: "#f0f2f5", flexShrink: 0 }}
              >
                <Icon>close</Icon>
              </IconButton>
            </SoftBox>
          </SoftBox>

          <SoftBox
            px={{ xs: 1.5, md: 3 }}
            py={{ xs: 1.5, md: 2.5 }}
            sx={{ overflowY: "auto", flex: 1, bgcolor: { xs: "#f5f7fa", md: "#fff" } }}
          >
            <Grid container spacing={{ xs: 1, md: 1.5 }} mb={2}>
              {[
                ["Loại hàng", inventory.length, "category", "#1565c0", "#e3f2fd"],
                ["Tổng số lượng", totalQuantity, "inventory_2", "#2e7d32", "#e8f5e9"],
                [
                  "Giá trị theo giá bán",
                  money(totalSellingValue),
                  "payments",
                  "#7b1fa2",
                  "#f3e5f5",
                ],
              ].map(([label, value, icon, color, background]) => (
                <Grid item xs={label === "Giá trị theo giá bán" ? 12 : 6} md={4} key={label}>
                  <SoftBox
                    p={{ xs: 1.4, md: 1.75 }}
                    borderRadius={2.5}
                    bgcolor={background}
                    height="100%"
                    display="flex"
                    alignItems="center"
                    gap={1.25}
                  >
                    <Icon sx={{ color, fontSize: { xs: 24, md: 28 } }}>{icon}</Icon>
                    <SoftBox minWidth={0}>
                      <SoftTypography variant="caption" color="text" display="block">
                        {label}
                      </SoftTypography>
                      <SoftTypography
                        variant="h6"
                        fontWeight="bold"
                        sx={{ color, fontSize: { xs: "1rem", md: "1.15rem" } }}
                      >
                        {value ?? 0}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                </Grid>
              ))}
            </Grid>

            <SoftBox
              mb={2}
              px={{ xs: 1.5, md: 2 }}
              py={1.25}
              borderRadius={2}
              bgcolor="#fff"
              sx={{ border: "1px solid #e9ecef" }}
            >
              <Grid container spacing={1}>
                <Grid item xs={12} md={7}>
                  <SoftTypography variant="caption" color="text">
                    Tài xế
                  </SoftTypography>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {driverName}
                  </SoftTypography>
                </Grid>
                <Grid item xs={12} md={5}>
                  <SoftTypography variant="caption" color="text">
                    Điện thoại
                  </SoftTypography>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {driverPhone}
                  </SoftTypography>
                </Grid>
              </Grid>
            </SoftBox>

            <SegmentedTabs
              value={detailTab}
              onChange={setDetailTab}
              fullWidth
              items={[
                { icon: "inventory_2", label: "Hàng hiện có" },
                { icon: "analytics", label: "Tổng hợp hàng hóa" },
                { icon: "receipt_long", label: "Lịch sử bán / hoàn" },
                ...(isAdmin ? [{ icon: "fact_check", label: "Kiểm hàng & backup" }] : []),
              ]}
            />

            <SoftBox display={detailTab === 0 ? "block" : "none"}>
              <SoftBox
                display="flex"
                alignItems={{ xs: "stretch", md: "center" }}
                justifyContent="space-between"
                flexDirection={{ xs: "column", md: "row" }}
                gap={1.25}
                mb={1.5}
              >
                <SoftBox>
                  <SoftTypography variant="h6" fontWeight="bold">
                    Toàn bộ hàng trên xe
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {visibleInventory.length} / {inventory.length} loại hàng
                  </SoftTypography>
                </SoftBox>
                {inventory.length > 5 && (
                  <SoftBox width={{ xs: "100%", md: 330 }}>
                    <SoftInput
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Tìm tên, mã hoặc barcode..."
                      icon={{ component: "search", direction: "left" }}
                    />
                  </SoftBox>
                )}
              </SoftBox>

              {loading && (
                <SoftBox py={6} textAlign="center">
                  <Icon sx={{ color: "#1565c0", fontSize: 38, mb: 1 }}>hourglass_top</Icon>
                  <SoftTypography variant="button" color="text" display="block">
                    Đang tải toàn bộ sản phẩm trên xe...
                  </SoftTypography>
                </SoftBox>
              )}

              {!loading && !visibleInventory.length && (
                <SoftBox py={6} textAlign="center" bgcolor="#fff" borderRadius={2}>
                  <Icon sx={{ color: "#b0bec5", fontSize: 46 }}>inventory_2</Icon>
                  <SoftTypography variant="button" color="text" display="block" mt={1}>
                    {inventory.length ? "Không tìm thấy sản phẩm phù hợp" : "Xe hiện không có hàng"}
                  </SoftTypography>
                </SoftBox>
              )}

              {!loading && visibleInventory.length > 0 && (
                <>
                  <SoftBox display={{ xs: "block", md: "none" }}>
                    {visibleInventory.map((item, index) => {
                      const row = productDetail(item);
                      return (
                        <SoftBox
                          key={`${productIdOf(item)}-${index}`}
                          bgcolor="#fff"
                          borderRadius={2.5}
                          p={1.5}
                          mb={1}
                          sx={{ border: "1px solid #e7ebf0" }}
                        >
                          <SoftBox display="flex" justifyContent="space-between" gap={1.5}>
                            <SoftBox display="flex" gap={1.1} minWidth={0}>
                              <SoftBox
                                width={32}
                                height={32}
                                borderRadius="50%"
                                bgcolor="#e3f2fd"
                                color="#1565c0"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                flexShrink={0}
                                fontSize={13}
                                fontWeight={700}
                              >
                                <SoftTypography
                                  variant="caption"
                                  fontWeight="bold"
                                  sx={{ color: "#1565c0", lineHeight: 1 }}
                                >
                                  STT
                                  <br />
                                  {index + 1}
                                </SoftTypography>
                              </SoftBox>
                              <SoftBox minWidth={0}>
                                <SoftTypography variant="button" fontWeight="bold" display="block">
                                  {row.name}
                                </SoftTypography>
                                <SoftTypography variant="caption" color="text" display="block">
                                  {row.code}
                                  {row.barcode ? ` · ${row.barcode}` : ""}
                                </SoftTypography>
                              </SoftBox>
                            </SoftBox>
                            <SoftBox
                              minWidth={86}
                              px={1.25}
                              py={0.75}
                              borderRadius={2}
                              bgcolor="#e8f5e9"
                              textAlign="center"
                              flexShrink={0}
                            >
                              <SoftTypography
                                variant="h5"
                                fontWeight="bold"
                                sx={{ color: "#2e7d32", lineHeight: 1.1 }}
                              >
                                {row.quantity}
                              </SoftTypography>
                              <SoftTypography variant="caption" sx={{ color: "#2e7d32" }}>
                                {row.unit}
                              </SoftTypography>
                            </SoftBox>
                          </SoftBox>
                          <SoftBox
                            display="flex"
                            justifyContent="space-between"
                            mt={1.25}
                            pt={1}
                            sx={{ borderTop: "1px dashed #e0e0e0" }}
                          >
                            <SoftTypography variant="caption" color="text">
                              Giá bán
                            </SoftTypography>
                            <SoftTypography variant="button" fontWeight="bold" color="info">
                              {pricesLoading && !row.sellPrice
                                ? "Đang tải..."
                                : money(row.sellPrice)}
                            </SoftTypography>
                          </SoftBox>
                        </SoftBox>
                      );
                    })}
                  </SoftBox>

                  <SoftBox
                    display={{ xs: "none", md: "block" }}
                    borderRadius={2}
                    overflow="hidden"
                    sx={{ border: "1px solid #e3e7ed" }}
                  >
                    <SoftBox
                      component="table"
                      sx={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
                    >
                      <SoftBox component="thead" bgcolor="#f1f5f9">
                        <SoftBox component="tr">
                          {[
                            ["STT", "6%"],
                            ["Sản phẩm", "31%"],
                            ["Mã / Barcode", "21%"],
                            ["Đơn vị", "12%"],
                            ["Số lượng", "13%"],
                            ["Giá bán", "17%"],
                          ].map(([label, width]) => (
                            <SoftBox
                              component="th"
                              key={label}
                              width={width}
                              px={1.25}
                              py={1.35}
                              textAlign={
                                label === "Sản phẩm" || label === "Mã / Barcode" ? "left" : "center"
                              }
                              sx={{ borderBottom: "1px solid #dce2e9" }}
                            >
                              <SoftTypography variant="caption" fontWeight="bold">
                                {label}
                              </SoftTypography>
                            </SoftBox>
                          ))}
                        </SoftBox>
                      </SoftBox>
                      <SoftBox component="tbody">
                        {visibleInventory.map((item, index) => {
                          const row = productDetail(item);
                          return (
                            <SoftBox
                              component="tr"
                              key={`${productIdOf(item)}-${index}`}
                              sx={{ "&:hover": { bgcolor: "#f8fbff" } }}
                            >
                              <SoftBox component="td" px={1.25} py={1.3} textAlign="center">
                                <SoftTypography variant="button">{index + 1}</SoftTypography>
                              </SoftBox>
                              <SoftBox component="td" px={1.25} py={1.3}>
                                <SoftTypography variant="button" fontWeight="bold">
                                  {row.name}
                                </SoftTypography>
                              </SoftBox>
                              <SoftBox component="td" px={1.25} py={1.3}>
                                <SoftTypography variant="caption" display="block">
                                  {row.code}
                                </SoftTypography>
                                {row.barcode && (
                                  <SoftTypography variant="caption" color="text">
                                    {row.barcode}
                                  </SoftTypography>
                                )}
                              </SoftBox>
                              <SoftBox component="td" px={1.25} py={1.3} textAlign="center">
                                <SoftTypography variant="button">{row.unit}</SoftTypography>
                              </SoftBox>
                              <SoftBox component="td" px={1.25} py={1.3} textAlign="center">
                                <SoftTypography
                                  variant="h6"
                                  fontWeight="bold"
                                  sx={{ color: "#2e7d32" }}
                                >
                                  {row.quantity}
                                </SoftTypography>
                              </SoftBox>
                              <SoftBox component="td" px={1.25} py={1.3} textAlign="right">
                                <SoftTypography variant="button" fontWeight="bold" color="info">
                                  {pricesLoading && !row.sellPrice
                                    ? "Đang tải..."
                                    : money(row.sellPrice)}
                                </SoftTypography>
                              </SoftBox>
                            </SoftBox>
                          );
                        })}
                      </SoftBox>
                    </SoftBox>
                  </SoftBox>
                </>
              )}
            </SoftBox>

            {detailTab === 1 && (
              <SoftBox>
                <QuickSortBar
                  label="Xem lịch sử theo"
                  value={salesPeriod}
                  onChange={setSalesPeriod}
                  mobileColumns={3}
                  compact
                  options={[
                    { value: "DAY", label: "Ngày", icon: "today" },
                    { value: "WEEK", label: "Tuần", icon: "date_range" },
                    { value: "ALL", label: "Tất cả", icon: "history" },
                  ]}
                />

                <Grid container spacing={1.25} mt={0.25} mb={2}>
                  {salesPeriod === "DAY" && (
                    <Grid item xs={12}>
                      <SoftInput
                        type="date"
                        value={salesDate}
                        onChange={(event) => setSalesDate(event.target.value)}
                      />
                    </Grid>
                  )}
                  {salesPeriod === "WEEK" && (
                    <Grid item xs={12}>
                      <SoftInput
                        type="week"
                        value={salesWeek}
                        onChange={(event) => setSalesWeek(event.target.value)}
                      />
                    </Grid>
                  )}
                </Grid>

                {goodsReportLoading && (
                  <SoftBox py={6} textAlign="center">
                    <Icon sx={{ color: "#1565c0", fontSize: 38 }}>hourglass_top</Icon>
                    <SoftTypography variant="button" color="text" display="block" mt={1}>
                      Đang tải tổng hợp hàng hóa trên xe...
                    </SoftTypography>
                  </SoftBox>
                )}

                {!goodsReportLoading && !salesProductSummary.length && (
                  <SoftBox py={6} textAlign="center" bgcolor="#fff" borderRadius={2}>
                    <Icon sx={{ color: "#b0bec5", fontSize: 46 }}>analytics</Icon>
                    <SoftTypography variant="button" color="text" display="block" mt={1}>
                      Không có hoạt động hàng hóa trong khoảng thời gian này
                    </SoftTypography>
                  </SoftBox>
                )}

                {!goodsReportLoading && salesProductSummary.length > 0 && (
                  <>
                    <Grid container spacing={1.25} mt={0.25} mb={2}>
                      {[
                        ["Chứng từ", salesTotals.documentCount, "receipt_long", "#1565c0", "#e3f2fd"],
                        [
                          "Đã bán",
                          salesTotals.soldQuantity,
                          "remove_shopping_cart",
                          "#c62828",
                          "#ffebee",
                        ],
                        ["Quà tặng", salesTotals.giftQuantity, "redeem", "#ef6c00", "#fff3e0"],
                        ["Hoàn về xe", salesTotals.inboundQuantity, "restore", "#2e7d32", "#e8f5e9"],
                        [
                          "Biến động ròng",
                          salesTotals.netQuantity > 0
                            ? `+${salesTotals.netQuantity}`
                            : salesTotals.netQuantity,
                          "swap_vert",
                          salesTotals.netQuantity > 0 ? "#2e7d32" : "#c62828",
                          salesTotals.netQuantity > 0 ? "#e8f5e9" : "#ffebee",
                        ],
                        ["Doanh thu", money(salesTotals.revenue), "payments", "#7b1fa2", "#f3e5f5"],
                      ].map(([label, value, icon, color, background]) => (
                        <Grid item xs={6} sm={4} md={2} key={label}>
                          <SoftBox p={1.4} borderRadius={2} bgcolor={background}>
                            <SoftBox display="flex" alignItems="center" gap={0.75}>
                              <Icon sx={{ color, fontSize: 21 }}>{icon}</Icon>
                              <SoftTypography variant="caption" color="text">
                                {label}
                              </SoftTypography>
                            </SoftBox>
                            <SoftTypography variant="h6" fontWeight="bold" sx={{ color }}>
                              {value}
                            </SoftTypography>
                          </SoftBox>
                        </Grid>
                      ))}
                    </Grid>

                    <SoftBox
                      mb={2}
                      bgcolor="#fff"
                      borderRadius={2.5}
                      overflow="hidden"
                      sx={{ border: "1px solid #dfe5ec" }}
                    >
                      <SoftBox
                        px={{ xs: 1.5, md: 2 }}
                        py={1.35}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={1}
                        bgcolor="#f8fbff"
                        sx={{ borderBottom: "1px solid #e5eaf0" }}
                      >
                        <SoftBox minWidth={0}>
                          <SoftTypography variant="button" fontWeight="bold" display="block">
                            Tổng hợp hàng hóa trong kỳ
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            {salesProductSummary.length} mặt hàng ·{" "}
                            {selectedSalesRange.from || "Tất cả"}
                            {selectedSalesRange.to ? ` đến ${selectedSalesRange.to}` : ""}
                          </SoftTypography>
                        </SoftBox>
                        <SoftButton
                          size="small"
                          variant="gradient"
                          color="success"
                          startIcon={<Icon>file_download</Icon>}
                          disabled={goodsReportExporting}
                          onClick={exportTruckGoods}
                          sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
                        >
                          {goodsReportExporting ? "Đang xuất..." : "Xuất Excel"}
                        </SoftButton>
                      </SoftBox>

                      <SoftBox display={{ xs: "block", md: "none" }} p={1.25}>
                        {salesProductSummary.map((item, index) => (
                          <SoftBox
                            key={`${item.productId || item.code || item.name}-${index}`}
                            p={1.25}
                            mb={1}
                            borderRadius={2}
                            bgcolor="#f8fafc"
                            sx={{ border: "1px solid #e3e8ef" }}
                          >
                            <SoftBox display="flex" justifyContent="space-between" gap={1}>
                              <SoftBox minWidth={0}>
                                <SoftTypography variant="button" fontWeight="bold" display="block">
                                  {index + 1}. {item.name}
                                </SoftTypography>
                                <SoftTypography variant="caption" color="text">
                                  {[item.code, item.unit, `${item.documentCount} chứng từ`]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </SoftTypography>
                              </SoftBox>
                              <SoftBox
                                px={1}
                                py={0.45}
                                height="fit-content"
                                borderRadius={1.5}
                                bgcolor={item.netQuantity > 0 ? "#e8f5e9" : "#ffebee"}
                                flexShrink={0}
                              >
                                <SoftTypography
                                  variant="caption"
                                  fontWeight="bold"
                                  sx={{ color: item.netQuantity > 0 ? "#2e7d32" : "#c62828" }}
                                >
                                  Ròng {item.netQuantity > 0 ? "+" : ""}
                                  {item.netQuantity}
                                </SoftTypography>
                              </SoftBox>
                            </SoftBox>
                            <SoftBox
                              mt={1}
                              display="grid"
                              gap={0.75}
                              sx={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
                            >
                              {[
                                ["Tồn đầu", item.openingQuantity ?? "—", "#1565c0", "#e3f2fd"],
                                ["Đã bán", item.soldQuantity, "#c62828", "#ffebee"],
                                ["Quà tặng", item.giftQuantity, "#ef6c00", "#fff3e0"],
                                ["Hoàn về", item.inboundQuantity, "#2e7d32", "#e8f5e9"],
                                ["Đảo hoàn", item.returnReversedQuantity, "#ad1457", "#fce4ec"],
                                ["Tồn cuối", item.closingQuantity ?? "—", "#1b5e20", "#dcedc8"],
                              ].map(([label, value, color, background]) => (
                                <SoftBox key={label} p={0.85} borderRadius={1.5} bgcolor={background}>
                                  <SoftTypography variant="caption" sx={{ color }} display="block">
                                    {label}
                                  </SoftTypography>
                                  <SoftTypography variant="button" fontWeight="bold" sx={{ color }}>
                                    {value}
                                  </SoftTypography>
                                </SoftBox>
                              ))}
                            </SoftBox>
                            <SoftBox display="flex" justifyContent="space-between" mt={1}>
                              <SoftTypography variant="caption" color="text">
                                Doanh thu hàng bán
                              </SoftTypography>
                              <SoftTypography variant="button" fontWeight="bold" color="info">
                                {money(item.revenue)}
                              </SoftTypography>
                            </SoftBox>
                          </SoftBox>
                        ))}
                      </SoftBox>

                      <SoftBox display={{ xs: "none", md: "block" }} sx={{ overflowX: "auto" }}>
                        <SoftBox
                          component="table"
                          sx={{ width: "100%", minWidth: 1050, borderCollapse: "collapse" }}
                        >
                          <SoftBox component="thead" bgcolor="#f1f5f9">
                            <SoftBox component="tr">
                              {[
                                "STT",
                                "Sản phẩm",
                                "Tồn đầu",
                                "Đã bán",
                                "Quà tặng",
                                "Hoàn về xe",
                                "Đảo hoàn",
                                "Biến động",
                                "Tồn cuối",
                                "Doanh thu",
                              ].map((label) => (
                                <SoftBox
                                  component="th"
                                  key={label}
                                  px={1.15}
                                  py={1.2}
                                  textAlign={label === "Sản phẩm" ? "left" : "right"}
                                  sx={{ borderBottom: "1px solid #dce2e9", whiteSpace: "nowrap" }}
                                >
                                  <SoftTypography variant="caption" fontWeight="bold">
                                    {label}
                                  </SoftTypography>
                                </SoftBox>
                              ))}
                            </SoftBox>
                          </SoftBox>
                          <SoftBox component="tbody">
                            {salesProductSummary.map((item, index) => (
                              <SoftBox
                                component="tr"
                                key={`${item.productId || item.code || item.name}-${index}`}
                                sx={{ borderBottom: "1px solid #edf0f3" }}
                              >
                                <SoftBox component="td" px={1.15} py={1.15} textAlign="right">
                                  <SoftTypography variant="caption">{index + 1}</SoftTypography>
                                </SoftBox>
                                <SoftBox component="td" px={1.15} py={1.15} minWidth={220}>
                                  <SoftTypography variant="button" fontWeight="bold" display="block">
                                    {item.name}
                                  </SoftTypography>
                                  <SoftTypography variant="caption" color="text">
                                    {[item.code, item.unit, `${item.documentCount} chứng từ`]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </SoftTypography>
                                </SoftBox>
                                {[
                                  item.openingQuantity ?? "—",
                                  item.soldQuantity,
                                  item.giftQuantity,
                                  item.inboundQuantity,
                                  item.returnReversedQuantity,
                                ].map((value, valueIndex) => (
                                  <SoftBox
                                    component="td"
                                    key={`${item.name}-${valueIndex}`}
                                    px={1.15}
                                    py={1.15}
                                    textAlign="right"
                                  >
                                    <SoftTypography variant="button">{value}</SoftTypography>
                                  </SoftBox>
                                ))}
                                <SoftBox component="td" px={1.15} py={1.15} textAlign="right">
                                  <SoftTypography
                                    variant="button"
                                    fontWeight="bold"
                                    sx={{ color: item.netQuantity > 0 ? "#2e7d32" : "#c62828" }}
                                  >
                                    {item.netQuantity > 0 ? "+" : ""}
                                    {item.netQuantity}
                                  </SoftTypography>
                                </SoftBox>
                                <SoftBox component="td" px={1.15} py={1.15} textAlign="right">
                                  <SoftTypography variant="button" fontWeight="bold">
                                    {item.closingQuantity ?? "—"}
                                  </SoftTypography>
                                </SoftBox>
                                <SoftBox component="td" px={1.15} py={1.15} textAlign="right">
                                  <SoftTypography variant="button" fontWeight="bold" color="info">
                                    {money(item.revenue)}
                                  </SoftTypography>
                                </SoftBox>
                              </SoftBox>
                            ))}
                          </SoftBox>
                        </SoftBox>
                      </SoftBox>
                    </SoftBox>
                  </>
                )}
              </SoftBox>
            )}

            {detailTab === 2 && (
              <SoftBox>
                <QuickSortBar
                  label="Xem lịch sử theo"
                  value={salesPeriod}
                  onChange={setSalesPeriod}
                  mobileColumns={3}
                  compact
                  options={[
                    { value: "DAY", label: "Ngày", icon: "today" },
                    { value: "WEEK", label: "Tuần", icon: "date_range" },
                    { value: "ALL", label: "Tất cả", icon: "history" },
                  ]}
                />

                <Grid container spacing={1.25} mt={0.25} mb={2}>
                  {salesPeriod === "DAY" && (
                    <Grid item xs={12} sm={6}>
                      <SoftInput
                        type="date"
                        value={salesDate}
                        onChange={(event) => setSalesDate(event.target.value)}
                      />
                    </Grid>
                  )}
                  {salesPeriod === "WEEK" && (
                    <Grid item xs={12} sm={6}>
                      <SoftInput
                        type="week"
                        value={salesWeek}
                        onChange={(event) => setSalesWeek(event.target.value)}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12} sm={salesPeriod === "ALL" ? 12 : 6}>
                    <QuickSortBar
                      label="Thứ tự hiển thị"
                      value={salesSort}
                      onChange={setSalesSort}
                      color="#1565c0"
                      compact
                      options={[
                        { value: "desc", label: "Mới nhất", icon: "south" },
                        { value: "asc", label: "Cũ nhất", icon: "north" },
                      ]}
                    />
                  </Grid>
                </Grid>

                {salesLoading && (
                  <SoftBox py={6} textAlign="center">
                    <Icon sx={{ color: "#1565c0", fontSize: 38 }}>hourglass_top</Icon>
                    <SoftTypography variant="button" color="text" display="block" mt={1}>
                      Đang tải lịch sử hàng hóa trên xe...
                    </SoftTypography>
                  </SoftBox>
                )}

                {!salesLoading && !salesInvoices.length && (
                  <SoftBox py={6} textAlign="center" bgcolor="#fff" borderRadius={2}>
                    <Icon sx={{ color: "#b0bec5", fontSize: 46 }}>receipt_long</Icon>
                    <SoftTypography variant="button" color="text" display="block" mt={1}>
                      Không có hoạt động bán hoặc hoàn hàng trong khoảng thời gian này
                    </SoftTypography>
                  </SoftBox>
                )}

                {!salesLoading &&
                  salesInvoices.map((invoice) => {
                    const items = Array.isArray(invoice.items) ? invoice.items : [];
                    const isInvoiceReversal = invoice.eventType === "REVERSAL";
                    const isCustomerReturn = invoice.eventType === "CUSTOMER_RETURN";
                    const isCustomerReturnReversal =
                      invoice.eventType === "CUSTOMER_RETURN_REVERSAL";
                    const isInbound = isInvoiceReversal || isCustomerReturn;
                    const soldQuantity = items.reduce(
                      (sum, item) => sum + Number(item.qty || 0),
                      0
                    );
                    return (
                      <SoftBox
                        key={getId(invoice) || invoice.code}
                        bgcolor="#fff"
                        borderRadius={2.5}
                        mb={1.25}
                        overflow="hidden"
                        sx={{ border: "1px solid #dfe5ec" }}
                      >
                        <SoftBox
                          px={{ xs: 1.5, md: 2 }}
                          py={1.35}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          gap={1}
                          bgcolor={
                            isInbound ? "#f1f8f3" : isCustomerReturnReversal ? "#fff3f3" : "#f8fbff"
                          }
                          sx={{ borderBottom: "1px solid #e5eaf0" }}
                        >
                          <SoftBox minWidth={0}>
                            <SoftTypography variant="button" fontWeight="bold" display="block">
                              {invoice.code || "Hóa đơn"}
                            </SoftTypography>
                            {isInvoiceReversal && invoice.invoiceCode && (
                              <SoftTypography
                                variant="caption"
                                fontWeight="bold"
                                display="block"
                                sx={{ color: "#2e7d32" }}
                              >
                                Hoàn từ hóa đơn {invoice.invoiceCode}
                              </SoftTypography>
                            )}
                            {isCustomerReturn && (
                              <SoftTypography
                                variant="caption"
                                fontWeight="bold"
                                display="block"
                                sx={{ color: "#2e7d32" }}
                              >
                                Khách hoàn hàng về xe
                                {invoice.status === "REVERSED" ? " · Phiếu đã đảo" : ""}
                              </SoftTypography>
                            )}
                            {isCustomerReturnReversal && (
                              <SoftTypography
                                variant="caption"
                                fontWeight="bold"
                                display="block"
                                sx={{ color: "#c62828" }}
                              >
                                Đảo phiếu hoàn hàng · Hàng được trừ lại khỏi xe
                              </SoftTypography>
                            )}
                            <SoftTypography variant="caption" color="text" display="block">
                              {date(invoice.createdAt || invoice.date)}
                            </SoftTypography>
                            <SoftTypography variant="caption" color="text" display="block" noWrap>
                              {invoiceCustomerLabel(invoice)}
                            </SoftTypography>
                          </SoftBox>
                          <SoftBox
                            px={1.1}
                            py={0.65}
                            bgcolor={isInbound ? "#e8f5e9" : "#ffebee"}
                            borderRadius={2}
                            textAlign="center"
                            flexShrink={0}
                          >
                            <SoftTypography
                              variant="button"
                              fontWeight="bold"
                              sx={{ color: isInbound ? "#2e7d32" : "#c62828" }}
                            >
                              {isInbound ? "+" : "−"}
                              {soldQuantity}
                            </SoftTypography>
                            <SoftTypography
                              variant="caption"
                              display="block"
                              sx={{ color: isInbound ? "#1b5e20" : "#8e1b1b" }}
                            >
                              {isInbound
                                ? "hoàn về xe"
                                : isCustomerReturnReversal
                                ? "đảo hoàn hàng"
                                : "sản phẩm"}
                            </SoftTypography>
                          </SoftBox>
                        </SoftBox>

                        <SoftBox px={{ xs: 1.5, md: 2 }} py={0.5}>
                          {items.map((item, index) => {
                            const product =
                              (item.productId && typeof item.productId === "object"
                                ? item.productId
                                : null) ||
                              item.product ||
                              {};
                            const isGift = !isInbound && item.lineType === "GIFT";
                            const stockSnapshot = saleInventorySnapshot(item);
                            const unit = item.unit || product.unit || "";
                            return (
                              <SoftBox
                                key={`${getId(item) || getId(product) || item.productId}-${index}`}
                                py={1.25}
                                sx={{
                                  borderBottom: index < items.length - 1 ? "1px dashed #e3e7ed" : 0,
                                }}
                              >
                                <SoftBox
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  gap={1}
                                >
                                  <SoftBox display="flex" alignItems="center" gap={1} minWidth={0}>
                                    <SoftBox
                                      width={34}
                                      height={34}
                                      borderRadius="50%"
                                      bgcolor={
                                        isInbound ? "#e8f5e9" : isGift ? "#fff3e0" : "#e8f5e9"
                                      }
                                      color={isInbound ? "#2e7d32" : isGift ? "#ef6c00" : "#2e7d32"}
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      flexShrink={0}
                                    >
                                      <Icon sx={{ fontSize: 19 }}>
                                        {isInbound
                                          ? "restore"
                                          : isCustomerReturnReversal
                                          ? "undo"
                                          : isGift
                                          ? "redeem"
                                          : "remove_shopping_cart"}
                                      </Icon>
                                    </SoftBox>
                                    <SoftBox minWidth={0}>
                                      <SoftTypography
                                        variant="button"
                                        fontWeight="bold"
                                        display="block"
                                      >
                                        {item.productName ||
                                          product.name ||
                                          item.name ||
                                          "Sản phẩm"}
                                      </SoftTypography>
                                      <SoftTypography
                                        variant="caption"
                                        color="text"
                                        display="block"
                                      >
                                        {[
                                          item.productCode || product.code,
                                          isCustomerReturn
                                            ? item.unclassified
                                              ? "Hàng hoàn chờ phân loại"
                                              : "Khách hoàn về xe"
                                            : isInvoiceReversal
                                            ? "Hoàn hóa đơn về xe"
                                            : isCustomerReturnReversal
                                            ? "Đảo phiếu hoàn"
                                            : isGift
                                            ? "Quà tặng"
                                            : "Hàng bán",
                                        ]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </SoftTypography>
                                    </SoftBox>
                                  </SoftBox>
                                  <SoftTypography variant="caption" color="text" flexShrink={0}>
                                    {unit}
                                  </SoftTypography>
                                </SoftBox>

                                <SoftBox
                                  mt={1.1}
                                  display="grid"
                                  sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                                  gap={{ xs: 0.75, md: 1 }}
                                >
                                  {(isInbound
                                    ? [
                                        [
                                          "Trước khi hoàn",
                                          stockSnapshot.before,
                                          "#1565c0",
                                          "#e3f2fd",
                                        ],
                                        ["Đã cộng", stockSnapshot.deducted, "#2e7d32", "#e8f5e9"],
                                        ["Sau khi hoàn", stockSnapshot.after, "#1b5e20", "#dcedc8"],
                                      ]
                                    : isCustomerReturnReversal
                                    ? [
                                        [
                                          "Trước khi đảo",
                                          stockSnapshot.before,
                                          "#1565c0",
                                          "#e3f2fd",
                                        ],
                                        ["Đã trừ", stockSnapshot.deducted, "#c62828", "#ffebee"],
                                        ["Sau khi đảo", stockSnapshot.after, "#2e7d32", "#e8f5e9"],
                                      ]
                                    : [
                                        [
                                          "Trước khi bán",
                                          stockSnapshot.before,
                                          "#1565c0",
                                          "#e3f2fd",
                                        ],
                                        ["Đã trừ", stockSnapshot.deducted, "#c62828", "#ffebee"],
                                        ["Còn lại", stockSnapshot.after, "#2e7d32", "#e8f5e9"],
                                      ]
                                  ).map(([label, value, color, background]) => (
                                    <SoftBox
                                      key={label}
                                      px={{ xs: 0.75, md: 1.25 }}
                                      py={0.85}
                                      borderRadius={1.75}
                                      bgcolor={background}
                                      textAlign="center"
                                    >
                                      <SoftTypography
                                        variant="caption"
                                        display="block"
                                        sx={{
                                          color,
                                          fontSize: { xs: 10, sm: 12 },
                                          lineHeight: 1.2,
                                        }}
                                      >
                                        {label}
                                      </SoftTypography>
                                      <SoftTypography
                                        variant="button"
                                        fontWeight="bold"
                                        sx={{ color, fontSize: { xs: 14, sm: 16 } }}
                                      >
                                        {value === null
                                          ? "—"
                                          : `${
                                              label === "Đã trừ"
                                                ? "−"
                                                : label === "Đã cộng"
                                                ? "+"
                                                : ""
                                            }${value}`}
                                      </SoftTypography>
                                    </SoftBox>
                                  ))}
                                </SoftBox>
                                {stockSnapshot.before === null && stockSnapshot.after === null && (
                                  <SoftTypography
                                    variant="caption"
                                    color="text"
                                    display="block"
                                    mt={0.6}
                                    textAlign="right"
                                    sx={{ fontStyle: "italic" }}
                                  >
                                    {item.unclassified
                                      ? "Hàng ngoài danh mục đã được lưu tại khu vực chờ phân loại trên xe"
                                      : isInbound
                                      ? "Movement hoàn hàng chưa có snapshot tồn xe"
                                      : isCustomerReturnReversal
                                      ? "Movement đảo phiếu hoàn chưa có snapshot tồn xe"
                                      : "Hóa đơn cũ chưa có snapshot tồn xe"}
                                  </SoftTypography>
                                )}
                              </SoftBox>
                            );
                          })}
                          {!items.length && (
                            <SoftTypography
                              variant="caption"
                              color="text"
                              display="block"
                              py={1.5}
                              textAlign="center"
                            >
                              API danh sách chưa trả chi tiết sản phẩm của hóa đơn này
                            </SoftTypography>
                          )}
                        </SoftBox>
                      </SoftBox>
                    );
                  })}
              </SoftBox>
            )}

            {detailTab === 3 && (
              <SoftBox>
                <SoftBox
                  display="grid"
                  gap={1}
                  mb={1.5}
                  sx={{
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: `repeat(${isAdmin ? 3 : 2}, minmax(0, 1fr))`,
                    },
                  }}
                >
                  {[
                    ["DIRECT", "Nhập trực tiếp", "touch_app", "Đếm và nhập ngay trên thiết bị"],
                    ["EXCEL", "Dùng file Excel", "table_view", "Tải mẫu và đối chiếu bằng file"],
                    ...(isAdmin
                      ? [
                          [
                            "BACKUPS",
                            "Bản sao tồn xe",
                            "restore",
                            "Xem và khôi phục bản sao đã lưu",
                          ],
                        ]
                      : []),
                  ].map(([value, label, icon, description]) => {
                    const active = stockCheckMode === value;
                    return (
                      <SoftBox
                        component="button"
                        type="button"
                        key={value}
                        onClick={() => {
                          setStockCheckMode(value);
                          setStockCheckResult(null);
                          if (value === "BACKUPS") setInventoryBackupPage(1);
                        }}
                        p={{ xs: 1.2, sm: 1.5 }}
                        textAlign="left"
                        sx={{
                          border: active ? "2px solid #1976d2" : "1px solid #dce2e9",
                          borderRadius: 2.25,
                          bgcolor: active ? "#e7f3ff" : "#fff",
                          color: active ? "#0d47a1" : "#52606d",
                          cursor: "pointer",
                        }}
                      >
                        <SoftBox display="flex" alignItems="center" gap={0.8}>
                          <Icon sx={{ fontSize: 22 }}>{icon}</Icon>
                          <SoftTypography
                            variant="button"
                            fontWeight="bold"
                            sx={{ color: "inherit" }}
                          >
                            {label}
                          </SoftTypography>
                        </SoftBox>
                        <SoftTypography
                          variant="caption"
                          color="text"
                          display={{ xs: "none", sm: "block" }}
                          mt={0.4}
                        >
                          {description}
                        </SoftTypography>
                      </SoftBox>
                    );
                  })}
                </SoftBox>

                {stockCheckMode === "EXCEL" && (
                  <>
                    <SoftBox
                      p={{ xs: 1.5, md: 2 }}
                      mb={1.5}
                      borderRadius={2.5}
                      bgcolor="#f8fbff"
                      sx={{ border: "1px solid #d9e8f7" }}
                    >
                      <SoftBox display="flex" alignItems="flex-start" gap={1.25}>
                        <SoftBox
                          width={42}
                          height={42}
                          borderRadius={2}
                          bgcolor="#e3f2fd"
                          color="#1565c0"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <Icon>fact_check</Icon>
                        </SoftBox>
                        <SoftBox>
                          <SoftTypography variant="button" fontWeight="bold" display="block">
                            Đối chiếu tồn xe bằng Excel
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            1. Tải file mẫu · 2. Nhập số lượng thực tế · 3. Tải lại để kiểm tra
                          </SoftTypography>
                          <SoftTypography variant="caption" fontWeight="bold" color="info">
                            Chức năng chỉ đối chiếu, không thay đổi tồn hàng trên app.
                          </SoftTypography>
                        </SoftBox>
                      </SoftBox>
                    </SoftBox>

                    <Grid container spacing={1.25} mb={2}>
                      <Grid item xs={12} md={4}>
                        <SoftButton
                          fullWidth
                          variant="outlined"
                          color="info"
                          startIcon={<Icon>download</Icon>}
                          disabled={stockCheckDownloading}
                          onClick={downloadStockCheckTemplate}
                          sx={{ minHeight: 48 }}
                        >
                          {stockCheckDownloading ? "Đang tải..." : "1. Tải file mẫu"}
                        </SoftButton>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <SoftButton
                          component="label"
                          fullWidth
                          variant={stockCheckFile ? "gradient" : "outlined"}
                          color={stockCheckFile ? "success" : "secondary"}
                          startIcon={<Icon>{stockCheckFile ? "check_circle" : "upload_file"}</Icon>}
                          sx={{ minHeight: 48 }}
                        >
                          {stockCheckFile ? "Đã chọn file" : "2. Chọn file Excel"}
                          <input
                            type="file"
                            hidden
                            accept=".xlsx"
                            onChange={selectStockCheckFile}
                          />
                        </SoftButton>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <SoftButton
                          fullWidth
                          variant="gradient"
                          color="success"
                          startIcon={<Icon>rule</Icon>}
                          disabled={!stockCheckFile || stockCheckComparing}
                          onClick={compareStockCheck}
                          sx={{ minHeight: 48 }}
                        >
                          {stockCheckComparing ? "Đang đối chiếu..." : "3. Đối chiếu số lượng"}
                        </SoftButton>
                      </Grid>
                    </Grid>

                    {stockCheckFile && (
                      <SoftBox
                        mb={2}
                        px={1.5}
                        py={1.1}
                        borderRadius={2}
                        bgcolor="#fff"
                        display="flex"
                        alignItems="center"
                        gap={1}
                        sx={{ border: "1px solid #dfe5ec" }}
                      >
                        <Icon sx={{ color: "#2e7d32" }}>description</Icon>
                        <SoftBox flex={1} minWidth={0}>
                          <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                            {stockCheckFile.name}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text">
                            {(stockCheckFile.size / 1024).toFixed(1)} KB
                          </SoftTypography>
                        </SoftBox>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setStockCheckFile(null);
                            setStockCheckResult(null);
                          }}
                        >
                          <Icon color="error">close</Icon>
                        </IconButton>
                      </SoftBox>
                    )}
                  </>
                )}

                {stockCheckMode === "DIRECT" && !stockCheckResult && (
                  <SoftBox mb={2}>
                    <SoftBox
                      p={{ xs: 1.35, md: 1.75 }}
                      mb={1.25}
                      borderRadius={2.5}
                      bgcolor="#f8fbff"
                      sx={{ border: "1px solid #d9e8f7" }}
                    >
                      <SoftBox
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={1}
                      >
                        <SoftBox minWidth={0}>
                          <SoftTypography variant="button" fontWeight="bold" display="block">
                            Tiến độ kiểm hàng
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text">
                            Đã nhập {directCountedProducts}/{directStockRows.length} sản phẩm · Tự
                            lưu trên thiết bị
                          </SoftTypography>
                        </SoftBox>
                        <SoftTypography variant="h5" fontWeight="bold" color="info">
                          {directProgressPercent}%
                        </SoftTypography>
                      </SoftBox>
                      <SoftBox
                        mt={1}
                        height={8}
                        borderRadius={5}
                        bgcolor="#dbe7f3"
                        overflow="hidden"
                      >
                        <SoftBox
                          height="100%"
                          borderRadius={5}
                          bgcolor="#1976d2"
                          sx={{
                            width: `${directProgressPercent}%`,
                            transition: "width .2s ease",
                          }}
                        />
                      </SoftBox>
                    </SoftBox>

                    <SoftBox
                      display="flex"
                      gap={1}
                      mb={1.25}
                      alignItems={{ xs: "stretch", md: "center" }}
                      flexDirection={{ xs: "column", md: "row" }}
                    >
                      <SoftBox flex={1}>
                        <SoftInput
                          value={directSearch}
                          onChange={(event) => setDirectSearch(event.target.value)}
                          placeholder="Tìm tên, mã hoặc barcode..."
                          icon={{ component: "search", direction: "left" }}
                        />
                      </SoftBox>
                      <SoftBox display="flex" gap={0.75} overflow="auto">
                        {[
                          ["ALL", "Tất cả"],
                          ["NOT_COUNTED", "Chưa kiểm"],
                          ["COUNTED", "Đã kiểm"],
                          ["DIFFERENCE", "Có lệch"],
                        ].map(([value, label]) => (
                          <SoftBox
                            component="button"
                            type="button"
                            key={value}
                            onClick={() => setDirectFilter(value)}
                            px={1.15}
                            py={0.8}
                            minWidth="max-content"
                            sx={{
                              border:
                                directFilter === value ? "2px solid #1976d2" : "1px solid #dce2e9",
                              borderRadius: 2,
                              bgcolor: directFilter === value ? "#e3f2fd" : "#fff",
                              color: directFilter === value ? "#0d47a1" : "#5f6b7a",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </SoftBox>
                        ))}
                      </SoftBox>
                    </SoftBox>

                    <SoftBox display="flex" gap={1} mb={1.25} flexWrap="wrap">
                      <SoftButton
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<Icon>done_all</Icon>}
                        onClick={() => {
                          if (
                            !window.confirm(
                              "Điền số lượng thực tế bằng đúng tồn trên app cho tất cả sản phẩm chưa kiểm?"
                            )
                          )
                            return;
                          setDirectCounts((current) => ({
                            ...directStockRows.reduce(
                              (result, item) => ({
                                ...result,
                                [item.key]:
                                  current[item.key] === undefined || current[item.key] === ""
                                    ? item.systemQuantity
                                    : current[item.key],
                              }),
                              {}
                            ),
                          }));
                        }}
                      >
                        Đánh dấu phần còn lại là khớp
                      </SoftButton>
                      <SoftButton
                        size="small"
                        variant="text"
                        color="error"
                        startIcon={<Icon>delete_sweep</Icon>}
                        onClick={clearDirectStockCheck}
                      >
                        Xóa bản nháp
                      </SoftButton>
                    </SoftBox>

                    <SoftBox
                      display="grid"
                      gap={1.15}
                      sx={{ gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}
                    >
                      {visibleDirectStockRows.map((item, index) => {
                        const counted = item.rawActual !== "";
                        const difference = item.differenceQuantity;
                        const matched = counted && difference === 0;
                        return (
                          <SoftBox
                            key={item.key}
                            p={{ xs: 1.35, sm: 1.5 }}
                            borderRadius={2.5}
                            bgcolor={matched ? "#f1f8f3" : counted ? "#fff8f1" : "#fff"}
                            sx={{
                              border: matched
                                ? "2px solid #81c784"
                                : counted
                                ? "2px solid #ffb74d"
                                : "1px solid #dfe5ec",
                            }}
                          >
                            <SoftBox display="flex" justifyContent="space-between" gap={1}>
                              <SoftBox minWidth={0}>
                                <SoftTypography variant="button" fontWeight="bold" display="block">
                                  {item.name}
                                </SoftTypography>
                                <SoftTypography variant="caption" color="text">
                                  {[item.code, item.barcode, item.unit].filter(Boolean).join(" · ")}
                                </SoftTypography>
                              </SoftBox>
                              <SoftBox textAlign="right" flexShrink={0}>
                                <SoftTypography variant="caption" color="text" display="block">
                                  Trên app
                                </SoftTypography>
                                <SoftTypography variant="h6" fontWeight="bold" color="info">
                                  {item.systemQuantity}
                                </SoftTypography>
                              </SoftBox>
                            </SoftBox>

                            <SoftBox
                              mt={1.15}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              gap={{ xs: 0.75, sm: 1 }}
                            >
                              <IconButton
                                disabled={!counted || Number(item.rawActual) <= 0}
                                onClick={() =>
                                  setDirectCounts((current) => ({
                                    ...current,
                                    [item.key]: Math.max(0, Number(item.rawActual || 0) - 1),
                                  }))
                                }
                                sx={{ border: "1px solid #cfd8e3", width: 44, height: 44 }}
                              >
                                <Icon>remove</Icon>
                              </IconButton>
                              <SoftBox width={110}>
                                <SoftInput
                                  type="number"
                                  value={item.rawActual}
                                  placeholder="Thực tế"
                                  inputProps={{
                                    min: 0,
                                    step: 1,
                                    inputMode: "numeric",
                                    style: { textAlign: "center", fontWeight: 800, fontSize: 18 },
                                  }}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (value === "" || /^\d+$/.test(value)) {
                                      setDirectCounts((current) => ({
                                        ...current,
                                        [item.key]: value === "" ? "" : Number(value),
                                      }));
                                    }
                                  }}
                                />
                              </SoftBox>
                              <IconButton
                                onClick={() =>
                                  setDirectCounts((current) => ({
                                    ...current,
                                    [item.key]: Number(item.rawActual || 0) + 1,
                                  }))
                                }
                                sx={{
                                  border: "1px solid #90caf9",
                                  bgcolor: "#e3f2fd",
                                  width: 44,
                                  height: 44,
                                }}
                              >
                                <Icon color="info">add</Icon>
                              </IconButton>
                              <SoftButton
                                size="small"
                                variant={matched ? "gradient" : "outlined"}
                                color="success"
                                onClick={() =>
                                  setDirectCounts((current) => ({
                                    ...current,
                                    [item.key]: item.systemQuantity,
                                  }))
                                }
                                sx={{ minWidth: 60, height: 44 }}
                              >
                                Khớp
                              </SoftButton>
                            </SoftBox>

                            {counted && (
                              <SoftBox
                                mt={1}
                                px={1}
                                py={0.7}
                                borderRadius={1.5}
                                bgcolor={
                                  matched ? "#e8f5e9" : difference < 0 ? "#ffebee" : "#fff3e0"
                                }
                                textAlign="center"
                              >
                                <SoftTypography
                                  variant="caption"
                                  fontWeight="bold"
                                  sx={{
                                    color: matched
                                      ? "#2e7d32"
                                      : difference < 0
                                      ? "#c62828"
                                      : "#ef6c00",
                                  }}
                                >
                                  {matched
                                    ? "Khớp với tồn trên app"
                                    : difference < 0
                                    ? `Thiếu ${Math.abs(difference)}`
                                    : `Thừa ${difference}`}
                                </SoftTypography>
                              </SoftBox>
                            )}

                            <SoftBox mt={1}>
                              <SoftInput
                                value={item.note}
                                onChange={(event) =>
                                  setDirectNotes((current) => ({
                                    ...current,
                                    [item.key]: event.target.value,
                                  }))
                                }
                                placeholder="Ghi chú sản phẩm (nếu có)..."
                              />
                            </SoftBox>
                          </SoftBox>
                        );
                      })}
                    </SoftBox>

                    {!visibleDirectStockRows.length && (
                      <SoftBox py={4} textAlign="center" bgcolor="#fff" borderRadius={2}>
                        <SoftTypography variant="button" color="text">
                          Không có sản phẩm phù hợp
                        </SoftTypography>
                      </SoftBox>
                    )}

                    <SoftBox
                      position="sticky"
                      bottom={-20}
                      mt={1.5}
                      mx={{ xs: -1.5, md: -3 }}
                      px={{ xs: 1.5, md: 3 }}
                      py={1.25}
                      bgcolor="#fff"
                      zIndex={3}
                      sx={{
                        borderTop: "1px solid #dfe5ec",
                        boxShadow: "0 -6px 18px rgba(0,0,0,.06)",
                      }}
                    >
                      <SoftButton
                        fullWidth
                        variant="gradient"
                        color="success"
                        startIcon={<Icon>fact_check</Icon>}
                        disabled={!directCountedProducts || stockCheckComparing}
                        onClick={compareDirectStockCheck}
                        sx={{ minHeight: 48 }}
                      >
                        {stockCheckComparing
                          ? "Đang đối chiếu..."
                          : `Xem kết quả (${directCountedProducts}/${directStockRows.length})`}
                      </SoftButton>
                    </SoftBox>
                  </SoftBox>
                )}

                {stockCheckMode === "EXCEL" && !stockCheckResult && !stockCheckComparing && (
                  <SoftBox py={5} px={2} textAlign="center" bgcolor="#fff" borderRadius={2.5}>
                    <Icon sx={{ color: "#b0bec5", fontSize: 48 }}>inventory</Icon>
                    <SoftTypography variant="button" fontWeight="bold" display="block" mt={1}>
                      Chưa có kết quả đối chiếu
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      Hãy tải file mẫu, nhập cột SỐ LƯỢNG THỰC TẾ rồi chọn file để kiểm tra.
                    </SoftTypography>
                  </SoftBox>
                )}

                {stockCheckMode === "BACKUPS" && isAdmin && (
                  <SoftBox>
                    <SoftBox
                      p={{ xs: 1.35, md: 1.75 }}
                      mb={1.5}
                      borderRadius={2.5}
                      bgcolor="#fff8e1"
                      sx={{ border: "1px solid #ffe0a3" }}
                    >
                      <SoftBox display="flex" alignItems="flex-start" gap={1}>
                        <Icon sx={{ color: "#ef6c00" }}>verified_user</Icon>
                        <SoftBox>
                          <SoftTypography variant="button" fontWeight="bold" display="block">
                            Bản sao an toàn lưu trong hệ thống
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            Mỗi lần đồng bộ hoặc khôi phục, backend tự lưu tồn xe trước khi thay
                            đổi. Khôi phục sẽ thay toàn bộ tồn hiện tại bằng số lượng trong bản sao
                            đã chọn.
                          </SoftTypography>
                        </SoftBox>
                      </SoftBox>
                    </SoftBox>

                    {inventoryBackupsLoading && !inventoryBackups.length ? (
                      <SoftBox py={5} textAlign="center">
                        <SoftTypography variant="button" color="text">
                          Đang tải danh sách bản sao...
                        </SoftTypography>
                      </SoftBox>
                    ) : (
                      inventoryBackups.map((backup) => (
                        <SoftBox
                          key={getId(backup)}
                          p={{ xs: 1.25, md: 1.6 }}
                          mb={1}
                          borderRadius={2.25}
                          bgcolor="#fff"
                          sx={{ border: "1px solid #dfe5ec" }}
                        >
                          <SoftBox
                            display="flex"
                            justifyContent="space-between"
                            alignItems={{ xs: "flex-start", md: "center" }}
                            flexDirection={{ xs: "column", md: "row" }}
                            gap={1}
                          >
                            <SoftBox minWidth={0}>
                              <SoftBox
                                display="flex"
                                gap={0.75}
                                alignItems="center"
                                flexWrap="wrap"
                              >
                                <SoftTypography variant="button" fontWeight="bold">
                                  {backup.code || "Bản sao tồn xe"}
                                </SoftTypography>
                                <SoftBox
                                  component="span"
                                  px={0.8}
                                  py={0.3}
                                  borderRadius={1.5}
                                  bgcolor={
                                    backup.sourceType === "BEFORE_RESTORE" ? "#fce4ec" : "#e3f2fd"
                                  }
                                >
                                  <SoftTypography
                                    component="span"
                                    variant="caption"
                                    fontWeight="bold"
                                    sx={{
                                      color:
                                        backup.sourceType === "BEFORE_RESTORE"
                                          ? "#ad1457"
                                          : "#1565c0",
                                    }}
                                  >
                                    {backupSourceLabel(backup.sourceType)}
                                  </SoftTypography>
                                </SoftBox>
                                {backup.restoredAt && (
                                  <SoftBox
                                    component="span"
                                    px={0.8}
                                    py={0.3}
                                    borderRadius={1.5}
                                    bgcolor="#e8f5e9"
                                  >
                                    <SoftTypography
                                      component="span"
                                      variant="caption"
                                      fontWeight="bold"
                                      color="success"
                                    >
                                      Đã khôi phục
                                    </SoftTypography>
                                  </SoftBox>
                                )}
                              </SoftBox>
                              <SoftTypography
                                variant="caption"
                                color="text"
                                display="block"
                                mt={0.25}
                              >
                                {date(backup.createdAt)} · Người tạo: {backup.createdByName || "—"}
                              </SoftTypography>
                              {backup.reason && (
                                <SoftTypography variant="caption" color="text" display="block">
                                  Lý do: {backup.reason}
                                </SoftTypography>
                              )}
                            </SoftBox>
                            <SoftBox
                              display="flex"
                              gap={0.65}
                              flexWrap="wrap"
                              width={{ xs: "100%", md: "auto" }}
                            >
                              <SoftButton
                                size="small"
                                variant="outlined"
                                color="info"
                                startIcon={<Icon>visibility</Icon>}
                                disabled={inventoryBackupDetailLoading}
                                onClick={() => openBackupDetail(backup)}
                                sx={{ flex: { xs: 1, md: "none" } }}
                              >
                                Chi tiết
                              </SoftButton>
                              <SoftButton
                                size="small"
                                variant="outlined"
                                color="secondary"
                                startIcon={<Icon>download</Icon>}
                                disabled={inventoryBackupExporting === String(getId(backup))}
                                onClick={() => exportInventoryBackup(backup)}
                                sx={{ flex: { xs: 1, md: "none" } }}
                              >
                                Excel
                              </SoftButton>
                              <SoftButton
                                size="small"
                                variant="gradient"
                                color="warning"
                                startIcon={<Icon>restore</Icon>}
                                disabled={Boolean(backup.restoredAt) || stockActionLoading}
                                onClick={() => openRestorePreview(backup)}
                                sx={{ flex: { xs: "1 0 100%", md: "none" } }}
                              >
                                {backup.restoredAt ? "Đã khôi phục" : "Khôi phục bản sao"}
                              </SoftButton>
                            </SoftBox>
                          </SoftBox>
                          <SoftBox
                            mt={1}
                            display="grid"
                            gap={0.75}
                            sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                          >
                            {[
                              ["Loại hàng", backup.totalProducts || 0],
                              ["Tổng số lượng", backup.totalQuantity || 0],
                              ["Giá trị bán", money(backup.totalSellValue || 0)],
                            ].map(([label, value]) => (
                              <SoftBox key={label} p={0.8} borderRadius={1.5} bgcolor="#f5f7fa">
                                <SoftTypography variant="caption" color="text" display="block">
                                  {label}
                                </SoftTypography>
                                <SoftTypography variant="button" fontWeight="bold">
                                  {value}
                                </SoftTypography>
                              </SoftBox>
                            ))}
                          </SoftBox>
                        </SoftBox>
                      ))
                    )}

                    {!inventoryBackupsLoading && !inventoryBackups.length && (
                      <SoftBox py={5} textAlign="center" bgcolor="#fff" borderRadius={2.5}>
                        <Icon sx={{ color: "#b0bec5", fontSize: 46 }}>restore_page</Icon>
                        <SoftTypography
                          variant="button"
                          fontWeight="bold"
                          display="block"
                          mt={0.75}
                        >
                          Chưa có bản sao tồn xe
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text">
                          Bản sao đầu tiên sẽ được tạo tự động khi admin đồng bộ kết quả kiểm hàng.
                        </SoftTypography>
                      </SoftBox>
                    )}

                    <MobileLoadMore
                      loading={inventoryBackupsLoading}
                      hasMore={inventoryBackupPage < (inventoryBackupMeta.totalPages || 1)}
                      onLoadMore={() => setInventoryBackupPage((value) => value + 1)}
                    />
                  </SoftBox>
                )}

                {stockCheckResult && (
                  <>
                    <SoftBox
                      mb={1.5}
                      display="flex"
                      justifyContent="space-between"
                      alignItems={{ xs: "stretch", sm: "center" }}
                      flexDirection={{ xs: "column", sm: "row" }}
                      gap={1}
                    >
                      <SoftBox>
                        <SoftTypography variant="button" fontWeight="bold" display="block">
                          Kết quả đối chiếu
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text">
                          {date(stockCheckResult.comparedAt)} · {stockCheckResult.items.length} dòng
                        </SoftTypography>
                      </SoftBox>
                      <SoftBox display="flex" gap={0.75} flexWrap="wrap">
                        {stockCheckMode === "DIRECT" && (
                          <SoftButton
                            size="small"
                            variant="outlined"
                            color="info"
                            startIcon={<Icon>edit</Icon>}
                            onClick={() => setStockCheckResult(null)}
                          >
                            Kiểm lại số lượng
                          </SoftButton>
                        )}
                        {isAdmin && (
                          <SoftButton
                            size="small"
                            variant="gradient"
                            color="warning"
                            startIcon={<Icon>sync</Icon>}
                            disabled={stockActionLoading || !stockCheckResult.comparisonId}
                            onClick={openStockSyncPreview}
                          >
                            {stockActionLoading ? "Đang kiểm tra..." : "Đồng bộ tồn xe"}
                          </SoftButton>
                        )}
                        <SoftButton
                          size="small"
                          variant="gradient"
                          color="info"
                          startIcon={<Icon>file_download</Icon>}
                          disabled={stockCheckExporting}
                          onClick={exportStockCheckResult}
                        >
                          {stockCheckExporting ? "Đang xuất..." : "Xuất kết quả Excel"}
                        </SoftButton>
                      </SoftBox>
                    </SoftBox>

                    <Grid container spacing={1} mb={1.5}>
                      {[
                        [
                          "Đã kiểm",
                          `${stockCheckResult.summary.countedProducts || 0}/${
                            stockCheckResult.summary.totalProducts || 0
                          }`,
                          "fact_check",
                          "#1565c0",
                          "#e3f2fd",
                        ],
                        [
                          "Khớp",
                          stockCheckResult.summary.matchedProducts || 0,
                          "check_circle",
                          "#2e7d32",
                          "#e8f5e9",
                        ],
                        [
                          "Thiếu",
                          `${stockCheckResult.summary.shortageProducts || 0} SP · −${
                            stockCheckResult.summary.totalShortageQuantity || 0
                          }`,
                          "remove_circle",
                          "#c62828",
                          "#ffebee",
                        ],
                        [
                          "Thừa",
                          `${stockCheckResult.summary.surplusProducts || 0} SP · +${
                            stockCheckResult.summary.totalSurplusQuantity || 0
                          }`,
                          "add_circle",
                          "#ef6c00",
                          "#fff3e0",
                        ],
                        [
                          "Chưa kiểm",
                          stockCheckResult.summary.notCountedProducts || 0,
                          "pending",
                          "#607d8b",
                          "#eceff1",
                        ],
                        [
                          "Cần xem lại",
                          Number(stockCheckResult.summary.unknownProducts || 0) +
                            Number(stockCheckResult.summary.notOnTruckProducts || 0) +
                            Number(stockCheckResult.summary.invalidRows || 0),
                          "warning",
                          "#8d6e00",
                          "#fff8e1",
                        ],
                      ].map(([label, value, icon, color, background]) => (
                        <Grid item xs={6} sm={4} md={2} key={label}>
                          <SoftBox p={1.25} height="100%" borderRadius={2} bgcolor={background}>
                            <SoftBox display="flex" alignItems="center" gap={0.6}>
                              <Icon sx={{ color, fontSize: 19 }}>{icon}</Icon>
                              <SoftTypography variant="caption" color="text">
                                {label}
                              </SoftTypography>
                            </SoftBox>
                            <SoftTypography variant="h6" fontWeight="bold" sx={{ color }}>
                              {value}
                            </SoftTypography>
                          </SoftBox>
                        </Grid>
                      ))}
                    </Grid>

                    <SoftBox mb={1.5}>
                      <QuickSortBar
                        label="Lọc nhanh kết quả"
                        value={stockCheckFilter}
                        onChange={setStockCheckFilter}
                        compact
                        options={[
                          ["ALL", "Tất cả"],
                          ...Object.entries(STOCK_CHECK_STATUSES).map(([value, meta]) => [
                            value,
                            meta.label,
                          ]),
                        ].map(([value, label]) => {
                          const count =
                            value === "ALL"
                              ? stockCheckItems.length
                              : stockCheckItems.filter((item) => item.status === value).length;
                          return { value, label: `${label} (${count})` };
                        })}
                      />
                    </SoftBox>

                    <SoftBox display={{ xs: "block", md: "none" }}>
                      {visibleStockCheckItems.map((item, index) => {
                        const status =
                          STOCK_CHECK_STATUSES[item.status] || STOCK_CHECK_STATUSES.INVALID;
                        return (
                          <SoftBox
                            key={`${item.productCode}-${item.rowNumber || index}`}
                            p={1.35}
                            mb={1}
                            bgcolor="#fff"
                            borderRadius={2.25}
                            sx={{ border: `1px solid ${status.color}35` }}
                          >
                            <SoftBox display="flex" justifyContent="space-between" gap={1}>
                              <SoftBox minWidth={0}>
                                <SoftTypography variant="button" fontWeight="bold" display="block">
                                  {item.productName || "Sản phẩm chưa xác định"}
                                </SoftTypography>
                                <SoftTypography variant="caption" color="text">
                                  {[item.productCode, item.unit].filter(Boolean).join(" · ")}
                                </SoftTypography>
                              </SoftBox>
                              <SoftBox
                                px={0.9}
                                py={0.4}
                                height="fit-content"
                                borderRadius={1.5}
                                bgcolor={status.background}
                                flexShrink={0}
                              >
                                <SoftTypography
                                  variant="caption"
                                  fontWeight="bold"
                                  sx={{ color: status.color }}
                                >
                                  {status.label}
                                </SoftTypography>
                              </SoftBox>
                            </SoftBox>
                            <SoftBox
                              mt={1}
                              display="grid"
                              gap={0.75}
                              sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                            >
                              {[
                                ["Trên app", item.systemQuantity],
                                ["Thực tế", item.actualQuantity],
                                ["Chênh lệch", item.differenceQuantity],
                              ].map(([label, value]) => (
                                <SoftBox key={label} p={0.8} borderRadius={1.5} bgcolor="#f5f7fa">
                                  <SoftTypography variant="caption" color="text" display="block">
                                    {label}
                                  </SoftTypography>
                                  <SoftTypography variant="button" fontWeight="bold">
                                    {value === undefined || value === null
                                      ? "—"
                                      : `${label === "Chênh lệch" && value > 0 ? "+" : ""}${value}`}
                                  </SoftTypography>
                                </SoftBox>
                              ))}
                            </SoftBox>
                            {item.note && (
                              <SoftTypography variant="caption" color="text" display="block" mt={1}>
                                Ghi chú: {item.note}
                              </SoftTypography>
                            )}
                          </SoftBox>
                        );
                      })}
                    </SoftBox>

                    <SoftBox
                      display={{ xs: "none", md: "block" }}
                      bgcolor="#fff"
                      borderRadius={2}
                      sx={{ overflowX: "auto", border: "1px solid #dfe5ec" }}
                    >
                      <SoftBox
                        component="table"
                        sx={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}
                      >
                        <SoftBox component="thead" bgcolor="#f1f5f9">
                          <SoftBox component="tr">
                            {[
                              "STT",
                              "Sản phẩm",
                              "Trên app",
                              "Thực tế",
                              "Chênh lệch",
                              "Trạng thái",
                              "Ghi chú",
                            ].map((label) => (
                              <SoftBox
                                component="th"
                                key={label}
                                px={1.2}
                                py={1.2}
                                textAlign={
                                  label === "Sản phẩm" || label === "Ghi chú" ? "left" : "center"
                                }
                                sx={{ whiteSpace: "nowrap", borderBottom: "1px solid #dce2e9" }}
                              >
                                <SoftTypography variant="caption" fontWeight="bold">
                                  {label}
                                </SoftTypography>
                              </SoftBox>
                            ))}
                          </SoftBox>
                        </SoftBox>
                        <SoftBox component="tbody">
                          {visibleStockCheckItems.map((item, index) => {
                            const status =
                              STOCK_CHECK_STATUSES[item.status] || STOCK_CHECK_STATUSES.INVALID;
                            return (
                              <SoftBox
                                component="tr"
                                key={`${item.productCode}-${item.rowNumber || index}`}
                                sx={{ borderBottom: "1px solid #edf0f3" }}
                              >
                                <SoftBox component="td" px={1.2} py={1.15} textAlign="center">
                                  <SoftTypography variant="caption">{index + 1}</SoftTypography>
                                </SoftBox>
                                <SoftBox component="td" px={1.2} py={1.15} minWidth={230}>
                                  <SoftTypography
                                    variant="button"
                                    fontWeight="bold"
                                    display="block"
                                  >
                                    {item.productName || "Sản phẩm chưa xác định"}
                                  </SoftTypography>
                                  <SoftTypography variant="caption" color="text">
                                    {[item.productCode, item.unit].filter(Boolean).join(" · ")}
                                  </SoftTypography>
                                </SoftBox>
                                {[
                                  item.systemQuantity,
                                  item.actualQuantity,
                                  item.differenceQuantity,
                                ].map((value, valueIndex) => (
                                  <SoftBox
                                    component="td"
                                    key={`${item.productCode}-${valueIndex}`}
                                    px={1.2}
                                    py={1.15}
                                    textAlign="center"
                                  >
                                    <SoftTypography variant="button" fontWeight="bold">
                                      {value === undefined || value === null
                                        ? "—"
                                        : `${valueIndex === 2 && value > 0 ? "+" : ""}${value}`}
                                    </SoftTypography>
                                  </SoftBox>
                                ))}
                                <SoftBox component="td" px={1.2} py={1.15} textAlign="center">
                                  <SoftBox
                                    component="span"
                                    px={0.9}
                                    py={0.4}
                                    borderRadius={1.5}
                                    bgcolor={status.background}
                                  >
                                    <SoftTypography
                                      component="span"
                                      variant="caption"
                                      fontWeight="bold"
                                      sx={{ color: status.color }}
                                    >
                                      {status.label}
                                    </SoftTypography>
                                  </SoftBox>
                                </SoftBox>
                                <SoftBox component="td" px={1.2} py={1.15} minWidth={220}>
                                  <SoftTypography variant="caption" color="text">
                                    {item.note || "—"}
                                  </SoftTypography>
                                </SoftBox>
                              </SoftBox>
                            );
                          })}
                        </SoftBox>
                      </SoftBox>
                    </SoftBox>

                    {!visibleStockCheckItems.length && (
                      <SoftBox py={4} textAlign="center" bgcolor="#fff" borderRadius={2}>
                        <SoftTypography variant="button" color="text">
                          Không có sản phẩm thuộc trạng thái đã chọn
                        </SoftTypography>
                      </SoftBox>
                    )}
                  </>
                )}
              </SoftBox>
            )}
          </SoftBox>
        </SoftBox>
      </Modal>

      <Modal
        open={Boolean(stockAction)}
        onClose={stockActionLoading ? undefined : resetStockAction}
      >
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: 0, md: "50%" },
            left: { xs: 0, md: "50%" },
            transform: { xs: "none", md: "translate(-50%, -50%)" },
            width: { xs: "100%", md: "min(680px, 94vw)" },
            height: { xs: "100dvh", md: "auto" },
            maxHeight: { md: "92vh" },
            overflowY: "auto",
            bgcolor: "#fff",
            borderRadius: { xs: 0, md: 3 },
            boxShadow: 24,
            p: { xs: 2, md: 2.5 },
          }}
        >
          {stockAction &&
            (() => {
              const isRestore = stockAction.type === "RESTORE";
              const preview = stockAction.preview || {};
              const allowed = isRestore ? preview.canRestore : preview.canSync;
              const requiredConfirmation = isRestore ? "KHOI PHUC TON XE" : "DONG BO TON XE";
              const blockers = Array.isArray(preview.blockers) ? preview.blockers : [];
              const changes = Array.isArray(preview.changes) ? preview.changes : [];
              return (
                <>
                  <SoftBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={1}
                    mb={1.5}
                  >
                    <SoftBox display="flex" gap={1} alignItems="center">
                      <SoftBox
                        width={44}
                        height={44}
                        borderRadius={2}
                        bgcolor={isRestore ? "#fff3e0" : "#e3f2fd"}
                        color={isRestore ? "#ef6c00" : "#1565c0"}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon>{isRestore ? "restore" : "sync"}</Icon>
                      </SoftBox>
                      <SoftBox>
                        <SoftTypography variant="h6" fontWeight="bold">
                          {isRestore ? "Xác nhận khôi phục tồn xe" : "Xác nhận đồng bộ tồn xe"}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text">
                          {preview.truck?.code} · {preview.truck?.name}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                    <IconButton onClick={resetStockAction} disabled={stockActionLoading}>
                      <Icon>close</Icon>
                    </IconButton>
                  </SoftBox>

                  <SoftBox
                    p={1.35}
                    mb={1.25}
                    borderRadius={2}
                    bgcolor={allowed ? "#fff8e1" : "#ffebee"}
                    sx={{ border: `1px solid ${allowed ? "#ffcc80" : "#ef9a9a"}` }}
                  >
                    <SoftTypography
                      variant="button"
                      fontWeight="bold"
                      sx={{ color: allowed ? "#e65100" : "#b71c1c" }}
                    >
                      <Icon sx={{ verticalAlign: "middle", mr: 0.5 }}>warning</Icon>
                      {allowed
                        ? isRestore
                          ? "Tồn hiện tại sẽ được thay bằng dữ liệu của bản sao. Hệ thống sẽ tự tạo thêm một bản sao an toàn trước khi khôi phục."
                          : "Số lượng trên app sẽ được thay bằng số lượng thực tế vừa kiểm. Hệ thống sẽ tự tạo bản sao trước khi đồng bộ."
                        : "Không thể thực hiện vì dữ liệu chưa đáp ứng điều kiện an toàn."}
                    </SoftTypography>
                  </SoftBox>

                  {blockers.map((blocker, index) => (
                    <SoftBox
                      key={`${blocker.code}-${index}`}
                      p={1}
                      mb={0.75}
                      borderRadius={1.5}
                      bgcolor="#ffebee"
                    >
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        color="error"
                        display="block"
                      >
                        {blocker.message || blocker.code}
                      </SoftTypography>
                      {Array.isArray(blocker.changedProducts) &&
                        blocker.changedProducts.length > 0 && (
                          <SoftTypography variant="caption" color="text">
                            Có {blocker.changedProducts.length} sản phẩm đã đổi tồn sau lúc đối
                            chiếu.
                          </SoftTypography>
                        )}
                    </SoftBox>
                  ))}

                  <SoftBox
                    display="grid"
                    gap={0.75}
                    mb={1.5}
                    sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                  >
                    {(isRestore
                      ? [
                          ["Sản phẩm đổi", preview.summary?.changedProducts || 0],
                          ["Số lượng tăng", `+${preview.summary?.gainQuantity || 0}`],
                          ["Số lượng giảm", `−${preview.summary?.lossQuantity || 0}`],
                        ]
                      : [
                          ["Đã kiểm", preview.summary?.countedProducts || 0],
                          [
                            "Thiếu",
                            preview.summary?.shortageQuantity ||
                              preview.summary?.totalShortageQuantity ||
                              0,
                          ],
                          [
                            "Thừa",
                            preview.summary?.surplusQuantity ||
                              preview.summary?.totalSurplusQuantity ||
                              0,
                          ],
                        ]
                    ).map(([label, value]) => (
                      <SoftBox key={label} p={0.9} borderRadius={1.5} bgcolor="#f5f7fa">
                        <SoftTypography variant="caption" color="text" display="block">
                          {label}
                        </SoftTypography>
                        <SoftTypography variant="button" fontWeight="bold">
                          {value}
                        </SoftTypography>
                      </SoftBox>
                    ))}
                  </SoftBox>

                  {isRestore && changes.length > 0 && (
                    <SoftBox
                      mb={1.5}
                      maxHeight={180}
                      overflow="auto"
                      borderRadius={2}
                      sx={{ border: "1px solid #e0e5eb" }}
                    >
                      {changes.slice(0, 50).map((item, index) => (
                        <SoftBox
                          key={item.productId || index}
                          px={1.2}
                          py={0.8}
                          display="flex"
                          justifyContent="space-between"
                          sx={{ borderBottom: "1px solid #edf0f3" }}
                        >
                          <SoftTypography variant="caption">Sản phẩm {index + 1}</SoftTypography>
                          <SoftTypography variant="caption" fontWeight="bold">
                            {item.currentQuantity || 0} → {item.restoreQuantity || 0}
                            {item.differenceQuantity > 0
                              ? ` (+${item.differenceQuantity})`
                              : ` (${item.differenceQuantity})`}
                          </SoftTypography>
                        </SoftBox>
                      ))}
                    </SoftBox>
                  )}

                  {allowed && (
                    <>
                      <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                        Lý do thực hiện *
                      </SoftTypography>
                      <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        value={stockActionReason}
                        onChange={(event) => setStockActionReason(event.target.value)}
                        placeholder={
                          isRestore
                            ? "Ví dụ: Khôi phục tồn trước lần kiểm sai..."
                            : "Ví dụ: Đã kiểm đếm thực tế và xác nhận chênh lệch..."
                        }
                        sx={{ mb: 1.25 }}
                      />
                      <SoftBox
                        component="label"
                        display="flex"
                        alignItems="flex-start"
                        gap={1}
                        p={1.1}
                        mb={1.25}
                        borderRadius={2}
                        bgcolor={stockActionAcknowledged ? "#e8f5e9" : "#f7f8fa"}
                        sx={{
                          border: stockActionAcknowledged
                            ? "2px solid #43a047"
                            : "1px solid #dce2e9",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={stockActionAcknowledged}
                          onChange={(event) => setStockActionAcknowledged(event.target.checked)}
                          style={{ width: 22, height: 22, flexShrink: 0 }}
                        />
                        <SoftTypography variant="caption" fontWeight="bold">
                          Tôi đã kiểm tra số liệu và hiểu rằng thao tác này sẽ thay đổi tồn hàng
                          trên xe.
                        </SoftTypography>
                      </SoftBox>
                      <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                        Nhập “{requiredConfirmation}” để xác nhận *
                      </SoftTypography>
                      <TextField
                        fullWidth
                        value={stockActionConfirmation}
                        onChange={(event) =>
                          setStockActionConfirmation(event.target.value.toUpperCase())
                        }
                        placeholder={requiredConfirmation}
                      />
                    </>
                  )}

                  <SoftBox
                    display="flex"
                    gap={1}
                    mt={2}
                    flexDirection={{ xs: "column-reverse", sm: "row" }}
                  >
                    <SoftButton
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      onClick={resetStockAction}
                      disabled={stockActionLoading}
                    >
                      Đóng
                    </SoftButton>
                    {allowed && (
                      <SoftButton
                        fullWidth
                        variant="gradient"
                        color={isRestore ? "warning" : "success"}
                        onClick={submitStockAction}
                        disabled={
                          stockActionLoading ||
                          !stockActionAcknowledged ||
                          !stockActionReason.trim() ||
                          stockActionConfirmation.trim() !== requiredConfirmation
                        }
                      >
                        {stockActionLoading
                          ? "Đang xử lý..."
                          : isRestore
                          ? "Khôi phục tồn xe"
                          : "Đồng bộ số lượng thực tế"}
                      </SoftButton>
                    )}
                  </SoftBox>
                </>
              );
            })()}
        </SoftBox>
      </Modal>

      <Modal open={Boolean(inventoryBackupDetail)} onClose={() => setInventoryBackupDetail(null)}>
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: 0, md: "50%" },
            left: { xs: 0, md: "50%" },
            transform: { xs: "none", md: "translate(-50%, -50%)" },
            width: { xs: "100%", md: "min(820px, 94vw)" },
            height: { xs: "100dvh", md: "auto" },
            maxHeight: { md: "92vh" },
            overflowY: "auto",
            bgcolor: "#fff",
            borderRadius: { xs: 0, md: 3 },
            boxShadow: 24,
            p: { xs: 1.5, md: 2.5 },
          }}
        >
          {inventoryBackupDetail && (
            <>
              <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <SoftBox>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {inventoryBackupDetail.code || "Chi tiết bản sao tồn xe"}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {backupSourceLabel(inventoryBackupDetail.sourceType)} ·{" "}
                    {date(inventoryBackupDetail.createdAt)}
                  </SoftTypography>
                </SoftBox>
                <IconButton onClick={() => setInventoryBackupDetail(null)}>
                  <Icon>close</Icon>
                </IconButton>
              </SoftBox>
              <Grid container spacing={1} mb={1.5}>
                {[
                  ["Loại hàng", inventoryBackupDetail.totalProducts || 0],
                  ["Tổng số lượng", inventoryBackupDetail.totalQuantity || 0],
                  ["Giá trị bán", money(inventoryBackupDetail.totalSellValue || 0)],
                ].map(([label, value]) => (
                  <Grid item xs={4} key={label}>
                    <SoftBox p={1} borderRadius={1.5} bgcolor="#f5f7fa" height="100%">
                      <SoftTypography variant="caption" color="text" display="block">
                        {label}
                      </SoftTypography>
                      <SoftTypography variant="button" fontWeight="bold">
                        {value}
                      </SoftTypography>
                    </SoftBox>
                  </Grid>
                ))}
              </Grid>
              <SoftBox display={{ xs: "block", md: "none" }}>
                {(inventoryBackupDetail.items || []).map((item, index) => (
                  <SoftBox
                    key={`${item.productId}-${index}`}
                    p={1.1}
                    mb={0.75}
                    borderRadius={2}
                    bgcolor="#f8fafc"
                  >
                    <SoftTypography variant="button" fontWeight="bold" display="block">
                      {index + 1}. {item.productName || "Sản phẩm"}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text" display="block">
                      {[item.productCode, item.unit].filter(Boolean).join(" · ")}
                    </SoftTypography>
                    <SoftBox display="flex" justifyContent="space-between" mt={0.75}>
                      <SoftTypography variant="caption">
                        Số lượng: <b>{item.quantity || 0}</b>
                      </SoftTypography>
                      <SoftTypography variant="caption">
                        Giá bán: <b>{money(item.sellPrice || 0)}</b>
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                ))}
              </SoftBox>
              <SoftBox
                display={{ xs: "none", md: "block" }}
                sx={{ overflowX: "auto", border: "1px solid #dfe5ec", borderRadius: 2 }}
              >
                <SoftBox
                  component="table"
                  sx={{ width: "100%", minWidth: 680, borderCollapse: "collapse" }}
                >
                  <SoftBox component="thead" bgcolor="#f1f5f9">
                    <SoftBox component="tr">
                      {["STT", "Mã", "Sản phẩm", "Đơn vị", "Số lượng", "Giá bán", "Thành tiền"].map(
                        (label) => (
                          <SoftBox
                            component="th"
                            key={label}
                            px={1}
                            py={1}
                            textAlign={label === "Sản phẩm" ? "left" : "center"}
                          >
                            <SoftTypography variant="caption" fontWeight="bold">
                              {label}
                            </SoftTypography>
                          </SoftBox>
                        )
                      )}
                    </SoftBox>
                  </SoftBox>
                  <SoftBox component="tbody">
                    {(inventoryBackupDetail.items || []).map((item, index) => (
                      <SoftBox
                        component="tr"
                        key={`${item.productId}-${index}`}
                        sx={{ borderTop: "1px solid #edf0f3" }}
                      >
                        <SoftBox component="td" px={1} py={0.9} textAlign="center">
                          {index + 1}
                        </SoftBox>
                        <SoftBox component="td" px={1} py={0.9} textAlign="center">
                          {item.productCode || "—"}
                        </SoftBox>
                        <SoftBox component="td" px={1} py={0.9}>
                          <SoftTypography variant="caption" fontWeight="bold">
                            {item.productName || "—"}
                          </SoftTypography>
                        </SoftBox>
                        <SoftBox component="td" px={1} py={0.9} textAlign="center">
                          {item.unit || "—"}
                        </SoftBox>
                        <SoftBox component="td" px={1} py={0.9} textAlign="center">
                          <b>{item.quantity || 0}</b>
                        </SoftBox>
                        <SoftBox component="td" px={1} py={0.9} textAlign="right">
                          {money(item.sellPrice || 0)}
                        </SoftBox>
                        <SoftBox component="td" px={1} py={0.9} textAlign="right">
                          <b>{money((item.quantity || 0) * (item.sellPrice || 0))}</b>
                        </SoftBox>
                      </SoftBox>
                    ))}
                  </SoftBox>
                </SoftBox>
              </SoftBox>
              <SoftBox display="flex" gap={1} mt={1.5} flexDirection={{ xs: "column", sm: "row" }}>
                <SoftButton
                  fullWidth
                  variant="outlined"
                  color="info"
                  startIcon={<Icon>download</Icon>}
                  onClick={() => exportInventoryBackup(inventoryBackupDetail)}
                >
                  Xuất Excel
                </SoftButton>
                <SoftButton
                  fullWidth
                  variant="gradient"
                  color="warning"
                  startIcon={<Icon>restore</Icon>}
                  disabled={Boolean(inventoryBackupDetail.restoredAt)}
                  onClick={() => {
                    const backup = inventoryBackupDetail;
                    setInventoryBackupDetail(null);
                    openRestorePreview(backup);
                  }}
                >
                  {inventoryBackupDetail.restoredAt
                    ? "Bản sao đã khôi phục"
                    : "Khôi phục bản sao này"}
                </SoftButton>
              </SoftBox>
            </>
          )}
        </SoftBox>
      </Modal>
    </>
  );
}

export default function QuanLyXe() {
  const currentUser = useSelector((state) => state.auth?.user || {});
  const isStaff = currentUser?.role === "staff";
  const theme = useTheme();
  const touchViewport = useMediaQuery(theme.breakpoints.down("xl"));
  const isTouchAdmin = String(currentUser?.role || "").toLowerCase() === "admin" && touchViewport;
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
  const [truckSort, setTruckSort] = useState("NEWEST");
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
  const [detailTruck, setDetailTruck] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setPage(1);
    setTransferPage(1);
  }, [debouncedSearch, status, truckSort, transferType, transferTruckId, transferFrom, transferTo]);
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
              sortBy:
                truckSort === "CODE_ASC" ? "code" : truckSort === "NAME_ASC" ? "name" : "createdAt",
              sortOrder: truckSort === "NEWEST" ? "desc" : "asc",
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
          setTrucks((current) => (page > 1 ? mergeUniqueItems(current, nextTrucks) : nextTrucks));
          setMeta(metaOf(listResponse));
        } else {
          const nextTransfers = listOf(listResponse);
          setTransfers((current) =>
            transferPage > 1 ? mergeUniqueItems(current, nextTransfers) : nextTransfers
          );
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
    truckSort,
    transferType,
    transferTruckId,
    transferFrom,
    transferTo,
    refreshKey,
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
  const refresh = () => {
    setPage(1);
    setTransferPage(1);
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
      refresh();
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
      {isStaff && (
        <StaffMobileHeader
          title="Xe hàng"
          subtitle="Tồn xe và lịch sử hàng hóa"
          onRefresh={() => refresh()}
        />
      )}
      <SoftBox
        py={{ xs: isStaff ? 1 : 3, md: 3 }}
        pb={{ xs: isStaff ? 10 : 3, md: 3 }}
        sx={{
          bgcolor: { xs: isStaff ? "#f0f2f5" : "transparent", md: "transparent" },
          minHeight: "100vh",
        }}
      >
        <Grid
          className="admin-summary-grid"
          container
          spacing={{ xs: isStaff ? 1 : 2, md: 2 }}
          mb={{ xs: isStaff ? 1 : 3, md: 3 }}
          px={{ xs: isStaff ? 1 : 0, md: 0 }}
          sx={{
            flexWrap: { xs: isStaff ? "nowrap" : "wrap", md: "wrap" },
            overflowX: { xs: "auto", md: "visible" },
          }}
        >
          {kpis.map(([label, value, icon, color]) => (
            <Grid item xs={isStaff ? 7 : 12} sm={6} lg={3} key={label} sx={{ flexShrink: 0 }}>
              <Card
                className="admin-summary-card"
                sx={{ boxShadow: { xs: isStaff ? "none" : undefined, md: undefined } }}
              >
                <SoftBox
                  className="admin-summary-content"
                  p={{ xs: isStaff ? 1.5 : 2.5, md: 2.5 }}
                  display="flex"
                  alignItems="center"
                  gap={1.25}
                >
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
        <Card
          sx={{
            borderRadius: { xs: isStaff ? 0 : undefined, md: undefined },
            boxShadow: { xs: isStaff ? "none" : undefined, md: undefined },
          }}
        >
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
              {!isStaff &&
                (tab === 0 ? (
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
            <SegmentedTabs
              value={tab}
              onChange={(value) => {
                setTab(value);
                setSearch("");
              }}
              items={[
                { icon: "local_shipping", label: "Danh sách xe" },
                { icon: "swap_horiz", label: "Lịch sử điều chuyển" },
              ]}
            />
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
                <FormControl
                  size="small"
                  sx={{
                    minWidth: 180,
                    display: { xs: isStaff ? "none" : "inline-flex", md: "inline-flex" },
                  }}
                >
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
            {tab === 0 && (
              <SoftBox mb={2}>
                <QuickSortBar
                  value={truckSort}
                  onChange={(value) => {
                    setTruckSort(value);
                    setPage(1);
                    setTrucks([]);
                  }}
                  color="#1565c0"
                  mobileColumns={3}
                  compact
                  options={[
                    { value: "NEWEST", label: "Mới nhất", icon: "schedule" },
                    { value: "CODE_ASC", label: "Mã xe A–Z", icon: "tag" },
                    { value: "NAME_ASC", label: "Tên xe A–Z", icon: "sort_by_alpha" },
                  ]}
                />
              </SoftBox>
            )}
            {tab === 1 && (
              <Grid className="admin-summary-grid" container spacing={2} mb={3}>
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
                      className="admin-summary-card admin-summary-content"
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
                onView={setDetailTruck}
              />
            )}
            {tab === 1 && (transfers.length > 0 || !loading) && (
              <TransferTable
                transfers={transfers}
                onReverse={reverseTransfer}
                readOnly={isStaff}
                touchMode={isTouchAdmin}
              />
            )}
            {tab === 0 && (
              <MobileLoadMore
                loading={loading}
                hasMore={page < (meta.totalPages || 1)}
                onLoadMore={() => setPage((value) => value + 1)}
              />
            )}
            {tab === 1 && (
              <MobileLoadMore
                loading={loading}
                hasMore={transferPage < (transferMeta.totalPages || 1)}
                onLoadMore={() => setTransferPage((value) => value + 1)}
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
      <TruckInventoryModal
        truck={detailTruck}
        onClose={() => setDetailTruck(null)}
        onChanged={refresh}
      />
    </DashboardLayout>
  );
}

function TruckGrid({
  trucks,
  onLoad,
  onReturn,
  onTransfer,
  onEdit,
  onStatus,
  onDelete,
  onView,
  readOnly,
}) {
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
            <Card
              variant="outlined"
              role="button"
              tabIndex={0}
              onClick={() => onView(truck)}
              onKeyDown={(event) => {
                if (
                  event.currentTarget === event.target &&
                  (event.key === "Enter" || event.key === " ")
                ) {
                  event.preventDefault();
                  onView(truck);
                }
              }}
              sx={{
                cursor: "pointer",
                height: "100%",
                transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 24px rgba(18, 69, 119, 0.12)",
                  borderColor: "#90caf9",
                },
                "&:focus-visible": { outline: "3px solid #90caf9", outlineOffset: 2 },
              }}
            >
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
                <SoftBox
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mt={1.5}
                  pt={1.25}
                  sx={{ borderTop: "1px dashed #dce3ea" }}
                >
                  <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "#1565c0" }}>
                    Xem toàn bộ hàng trên xe
                  </SoftTypography>
                  <Icon sx={{ color: "#1565c0", fontSize: 20 }}>arrow_forward</Icon>
                </SoftBox>
                {!readOnly && (
                  <SoftBox
                    display="flex"
                    gap={0.5}
                    mt={2}
                    flexWrap="wrap"
                    onClick={(event) => event.stopPropagation()}
                  >
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
                  </SoftBox>
                )}
              </SoftBox>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}

function TransferTable({ transfers, onReverse, readOnly, touchMode = false }) {
  return (
    <>
      {(readOnly || touchMode) && (
        <SoftBox display={touchMode ? "block" : { xs: "block", md: "none" }}>
          {!transfers.length && (
            <SoftTypography variant="button" color="text" display="block" textAlign="center" py={4}>
              Chưa có phiếu điều chuyển
            </SoftTypography>
          )}
          {transfers.map((transfer) => (
            <SoftBox key={getId(transfer)} py={1.75} sx={{ borderBottom: "1px solid #edf0f5" }}>
              <SoftBox display="flex" justifyContent="space-between" gap={1} mb={0.75}>
                <SoftTypography variant="button" fontWeight="bold">
                  {transfer.code}
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {date(transfer.date || transfer.createdAt)}
                </SoftTypography>
              </SoftBox>
              <SoftTypography variant="caption" fontWeight="bold" display="block">
                {transfer.type === "LOAD"
                  ? "Xuất hàng lên xe"
                  : transfer.type === "RETURN"
                  ? "Hoàn hàng về kho"
                  : "Chuyển hàng giữa xe"}
              </SoftTypography>
              <SoftTypography variant="caption" color="text" display="block">
                {transfer.type === "TRUCK_TO_TRUCK"
                  ? `${transfer.sourceTruckName || "Xe nguồn"} → ${
                      transfer.destinationTruckName || "Xe nhận"
                    }`
                  : transfer.truckName || transfer.truck?.name || "—"}
              </SoftTypography>
              <SoftBox mt={1} p={1.25} borderRadius={2} bgcolor="#f0f2f5">
                {(transfer.items || []).slice(0, 4).map((item, index) => (
                  <SoftBox
                    key={`${item.productId || index}`}
                    display="flex"
                    justifyContent="space-between"
                    py={0.4}
                  >
                    <SoftTypography variant="caption">
                      {item.productName || item.name || "Sản phẩm"}
                    </SoftTypography>
                    <SoftTypography variant="caption" fontWeight="bold">
                      {quantityOf(item)} {item.unit || ""}
                    </SoftTypography>
                  </SoftBox>
                ))}
              </SoftBox>
              <SoftBox display="flex" justifyContent="space-between" mt={1}>
                <SoftTypography variant="caption" color="text">
                  Tổng {transfer.totalQuantity || 0} sản phẩm
                </SoftTypography>
                <SoftTypography variant="button" fontWeight="bold">
                  {money(transfer.totalValue)}
                </SoftTypography>
              </SoftBox>
              {!readOnly && (
                <SoftButton
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => onReverse(transfer)}
                  sx={{ mt: 1.25 }}
                >
                  Tạo phiếu chuyển ngược
                </SoftButton>
              )}
            </SoftBox>
          ))}
        </SoftBox>
      )}
      <SoftBox
        sx={{
          overflowX: "auto",
          display: touchMode ? "none" : { xs: readOnly ? "none" : "block", md: "block" },
        }}
      >
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
                          transfer.sourceTruckLicensePlate ||
                          transfer.sourceTruck?.licensePlate ||
                          ""
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
                        transfer.destinationDriverName ||
                        transfer.destinationDriver?.fullName ||
                        "—"
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
