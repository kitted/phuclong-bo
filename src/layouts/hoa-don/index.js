import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { InvoiceService, ProductService, TruckService } from "services/warehouseService";
import { CustomerService, DebtPaymentService } from "services/crmService";
import EmployeeService from "services/employeeService";
import { toast } from "react-toastify";
import StaffMobileHeader from "components/StaffMobileHeader";
import MobileLoadMore from "components/MobileLoadMore";
import { debtPaymentToInvoice, moneyInWords, printInvoice } from "utils/invoicePrint";
import { downloadBlob } from "utils/excel";
import CustomerReturnModal, { InvoiceBusinessTypeSwitch } from "./customer-return-form";

const money = (value = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const getId = (value) => value?.id || value?._id;
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const errorMessage = (error, fallback) => {
  const value = error?.response?.data?.message;
  return typeof value === "object"
    ? value.message || fallback
    : Array.isArray(value)
    ? value.join(", ")
    : value || fallback;
};
const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
};
const dateValue = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};
const invoicePeriodOptions = [
  { value: "DAY", label: "Ngày" },
  { value: "WEEK", label: "Tuần" },
  { value: "MONTH", label: "Tháng" },
  { value: "QUARTER", label: "Quý" },
  { value: "YEAR", label: "Năm" },
  { value: "CUSTOM", label: "Từ ngày–đến ngày" },
];
const invoicePeriodRange = (period, anchorValue, customFrom, customTo) => {
  if (period === "CUSTOM") return { from: customFrom, to: customTo };
  const anchor = new Date(`${anchorValue || today()}T12:00:00`);
  const year = anchor.getFullYear();
  const monthIndex = anchor.getMonth();
  if (period === "DAY") {
    const value = dateValue(anchor);
    return { from: value, to: value };
  }
  if (period === "WEEK") {
    const first = new Date(anchor);
    first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const last = new Date(first);
    last.setDate(last.getDate() + 6);
    return { from: dateValue(first), to: dateValue(last) };
  }
  if (period === "QUARTER") {
    const quarterStart = Math.floor(monthIndex / 3) * 3;
    return {
      from: dateValue(new Date(year, quarterStart, 1)),
      to: dateValue(new Date(year, quarterStart + 3, 0)),
    };
  }
  if (period === "YEAR") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  return {
    from: dateValue(new Date(year, monthIndex, 1)),
    to: dateValue(new Date(year, monthIndex + 1, 0)),
  };
};
const shortDate = (value) =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
const numberText = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const moneyValue = (value) => Number(String(value || "").replace(/[^0-9]/g, "")) || 0;
const titleCaseName = (value = "") =>
  String(value)
    .trim()
    .toLocaleLowerCase("vi-VN")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toLocaleUpperCase("vi-VN")}${part.slice(1)}`)
    .join(" ");
const COMPANY_INTRO_LINES = [
  "Đối tác tin cậy tại miền Tây - Với hơn 10 năm kinh nghiệm phân phối dầu nhớt và phụ tùng",
  "Cùng hàng trăm đại lý và tiệm sửa xe tại Cần Thơ, Hậu Giang, Vĩnh Long và Đồng Tháp",
];
const COMPANY_SLOGAN = "UY TÍN TẠO NÊN THƯƠNG HIỆU";
const stockOf = (product) =>
  Number(product?.stock ?? product?.quantity ?? product?.warehouseQuantity ?? 0);
const invoiceReceivedAmount = (invoice = {}) =>
  Number(invoice.receivedAmount ?? invoice.totalReceivedAmount ?? invoice.paidAmount ?? 0);
const isDebtPaymentDocument = (document) =>
  Boolean(
    document &&
      (document.documentType === "DEBT_PAYMENT" ||
        document.type === "DEBT_PAYMENT" ||
        String(document.code || "").startsWith("PTCN-"))
  );
const normalizeInvoiceDocument = (document) => {
  if (!document || typeof document !== "object") return null;
  return isDebtPaymentDocument(document) ? debtPaymentToInvoice(document) : document;
};
const sameId = (left, right) =>
  Boolean(left && right && String(getId(left) || left) === String(getId(right) || right));
const invoiceCustomerId = (invoice = {}) =>
  getId(invoice.customerId) ||
  getId(invoice.customerSnapshot) ||
  invoice.customerId ||
  invoice.customerSnapshot?.id;
const invoiceDebtHistoryDate = (invoice = {}) => {
  const value = new Date(invoice.createdAt || invoice.date || Date.now());
  if (Number.isNaN(value.getTime())) return undefined;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
};
const enrichInvoiceDebtSnapshot = async (invoice = {}) => {
  const hasDebtSnapshot =
    invoice.customerDebtBefore !== undefined &&
    invoice.customerDebtBefore !== null &&
    invoice.customerDebtAfter !== undefined &&
    invoice.customerDebtAfter !== null;
  if (hasDebtSnapshot) return invoice;
  const customerId = invoiceCustomerId(invoice);
  if (!customerId) return invoice;
  const date = invoiceDebtHistoryDate(invoice);
  try {
    const response = await CustomerService.getDebtHistory(customerId, {
      type: "INVOICE_DEBT",
      from: date,
      to: date,
      page: 1,
      limit: 100,
    });
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const invoiceId = getId(invoice);
    const ledger = rows.find(
      (item) =>
        sameId(item.invoiceId, invoiceId) ||
        sameId(item.referenceId, invoiceId) ||
        (item.referenceCode && invoice.code && item.referenceCode === invoice.code)
    );
    if (!ledger) return invoice;
    return {
      ...invoice,
      customerDebtBefore:
        ledger.previousDebt ??
        ledger.customerDebtBefore ??
        ledger.debtBefore ??
        invoice.customerDebtBefore,
      customerDebtAfter:
        ledger.balanceAfter ??
        ledger.customerDebtAfter ??
        ledger.debtAfter ??
        invoice.customerDebtAfter,
    };
  } catch {
    // Hóa đơn vẫn có thể xem được khi API lịch sử công nợ chưa được cấp quyền.
    return invoice;
  }
};
const dateTime = (value) =>
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
const invoiceCustomer = (invoice = {}) => {
  const populatedCustomer =
    invoice.customerId && typeof invoice.customerId === "object" ? invoice.customerId : {};
  const legacyCustomer =
    invoice.customer && typeof invoice.customer === "object" ? invoice.customer : {};
  const snapshot = invoice.customerSnapshot || invoice.customerInfo || {};
  const code =
    populatedCustomer.code ||
    populatedCustomer.customerCode ||
    snapshot.code ||
    snapshot.customerCode ||
    legacyCustomer.code ||
    invoice.customerCode ||
    "";
  const name =
    populatedCustomer.name ||
    populatedCustomer.fullName ||
    populatedCustomer.customerName ||
    snapshot.name ||
    snapshot.customerName ||
    legacyCustomer.name ||
    invoice.customerName ||
    (typeof invoice.customer === "string" ? invoice.customer : "") ||
    "Khách lẻ";
  const phone =
    populatedCustomer.phone ||
    populatedCustomer.phones?.[0] ||
    snapshot.phone ||
    legacyCustomer.phone ||
    invoice.customerPhone ||
    "";
  const isUnassigned =
    populatedCustomer.codeStatus === "UNASSIGNED" ||
    snapshot.codeStatus === "UNASSIGNED" ||
    invoice.customerCodeStatus === "UNASSIGNED";
  return {
    code,
    name,
    phone,
    label: code ? `${code} · ${name}` : isUnassigned ? `Chưa có mã · ${name}` : name,
  };
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

function SectionTitle({ step, title, subtitle, accent = false }) {
  return (
    <SoftBox display="flex" gap={1.25} alignItems="center" mt={2.5} mb={1.25}>
      <SoftBox
        width={30}
        height={30}
        borderRadius="50%"
        bgcolor="success"
        color="#fff"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <SoftTypography variant="button" color="white" fontWeight="bold">
          {step}
        </SoftTypography>
      </SoftBox>
      <SoftBox>
        <SoftTypography
          variant={accent ? "h5" : "button"}
          fontWeight="bold"
          display="block"
          sx={{ color: accent ? "#1565c0" : "inherit", lineHeight: 1.2 }}
        >
          {title}
        </SoftTypography>
        {subtitle && (
          <SoftTypography variant="caption" color="text" display="block">
            {subtitle}
          </SoftTypography>
        )}
      </SoftBox>
    </SoftBox>
  );
}

function SearchSelect({
  value,
  onChange,
  options,
  loading,
  inputValue,
  onInputChange,
  placeholder,
  label,
  onOpen,
  disabled = false,
  large = false,
  disableClearable = false,
  dismissKeyboardOnSelect = false,
}) {
  return (
    <Autocomplete
      value={value}
      onChange={(_, selected) => {
        onChange(selected);
        if (dismissKeyboardOnSelect && selected) {
          window.requestAnimationFrame(() => {
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          });
        }
      }}
      options={options}
      disabled={disabled}
      disableClearable={disableClearable}
      openOnFocus
      onOpen={onOpen}
      autoHighlight
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_, next, reason) => {
        onInputChange(next);
      }}
      getOptionLabel={label}
      isOptionEqualToValue={(option, selected) => getId(option) === getId(selected)}
      noOptionsText="Không tìm thấy dữ liệu"
      loadingText="Đang tìm kiếm..."
      sx={
        large
          ? {
              "& .MuiOutlinedInput-root": {
                minHeight: 60,
                fontSize: "16px",
                borderRadius: "12px",
                alignItems: "center",
                paddingTop: "9px !important",
                paddingBottom: "9px !important",
              },
              "& .MuiOutlinedInput-root .MuiAutocomplete-input": {
                height: "28px",
                lineHeight: "28px",
                paddingTop: "1px !important",
                paddingBottom: "1px !important",
                textOverflow: "ellipsis",
              },
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "#344767",
                opacity: 1,
              },
            }
          : undefined
      }
      ListboxProps={
        large
          ? {
              sx: {
                "& .MuiAutocomplete-option": {
                  minHeight: 48,
                  py: 1,
                  lineHeight: 1.5,
                  alignItems: "center",
                },
              },
            }
          : undefined
      }
      renderInput={(params) => <TextField {...params} size="small" placeholder={placeholder} />}
    />
  );
}

export function CreateInvoiceModal({ open, onClose, onCreated }) {
  const authUser = useSelector((state) => state.auth?.user);
  const role = authUser?.role;
  const isAdmin = String(role || "").toLowerCase() === "admin";
  const [documentMode, setDocumentMode] = useState("SALE");
  const [form, setForm] = useState({
    code: "",
    date: today(),
    sourceType: "warehouse",
    note: "",
    voucherCode: "",
    paymentMode: "PAY_NOW",
    cashAmount: 0,
    bankAmount: 0,
    referenceCode: "",
    allowDebtLimitOverride: false,
    debtOverrideReason: "",
  });
  const [customerMode, setCustomerMode] = useState("EXISTING");
  const [customer, setCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [salesperson, setSalesperson] = useState(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [truck, setTruck] = useState(null);
  const [truckSearch, setTruckSearch] = useState("");
  const [trucks, setTrucks] = useState([]);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productOptionsRefresh, setProductOptionsRefresh] = useState(0);
  const [items, setItems] = useState([{ product: null, qty: 1, search: "" }]);
  const [gifts, setGifts] = useState([]);
  const [giftSearch, setGiftSearch] = useState("");
  const [giftOptions, setGiftOptions] = useState([]);
  const [giftOptionsLoading, setGiftOptionsLoading] = useState(false);
  const [giftOptionsRefresh, setGiftOptionsRefresh] = useState(0);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState("");
  const [giftPromotions, setGiftPromotions] = useState({
    eligiblePromotions: [],
    nearlyEligiblePromotions: [],
  });
  const [selectedGiftPromotion, setSelectedGiftPromotion] = useState(null);
  const [giftSelections, setGiftSelections] = useState({});
  const [appliedGiftPromotion, setAppliedGiftPromotion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [exportingInvoice, setExportingInvoice] = useState(false);
  const formInitializedRef = useRef(false);
  const sourceAutoSelectedRef = useRef(false);
  const sourceCardsRef = useRef(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const printCreatedInvoice = async () => {
    try {
      setExportingInvoice(true);
      const id = getId(createdInvoice);
      const printable =
        createdInvoice?.documentType === "DEBT_PAYMENT"
          ? createdInvoice
          : id
          ? unwrap(await InvoiceService.getById(id))
          : createdInvoice;
      const result = await printInvoice(printable);
      if (result?.downloaded) toast.success("Đã tải ảnh hóa đơn xuống thiết bị");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể xuất hóa đơn"));
    } finally {
      setExportingInvoice(false);
    }
  };
  useEffect(() => {
    if (!open) {
      formInitializedRef.current = false;
      return;
    }
    // /auth/me được làm mới khi ứng dụng focus và định kỳ. Redux vì vậy có thể
    // nhận một object user mới dù vẫn là cùng tài khoản. Chỉ khởi tạo form một
    // lần cho mỗi lần mở để không xóa dữ liệu sale đang nhập.
    if (formInitializedRef.current) return;
    formInitializedRef.current = true;
    setDocumentMode("SALE");
    setCreatedInvoice(null);
    setForm({
      code: "",
      date: today(),
      sourceType: isAdmin ? "warehouse" : "truck",
      note: "",
      voucherCode: "",
      paymentMode: "PAY_NOW",
      cashAmount: 0,
      bankAmount: 0,
      referenceCode: "",
      allowDebtLimitOverride: false,
      debtOverrideReason: "",
    });
    setCustomerMode("EXISTING");
    setCustomer(null);
    setNewCustomer({ name: "", phone: "", address: "", note: "" });
    setSalesperson(isAdmin ? null : authUser || null);
    sourceAutoSelectedRef.current = false;
    setTruck(null);
    setTrucks([]);
    setTruckSearch("");
    setProductSearch("");
    setItems([{ product: null, qty: 1, search: "" }]);
    setGifts([]);
    setGiftSearch("");
    setPreview(null);
    setAppliedVoucher("");
    setGiftPromotions({ eligiblePromotions: [], nearlyEligiblePromotions: [] });
    setSelectedGiftPromotion(null);
    setGiftSelections({});
    setAppliedGiftPromotion(null);
    setReviewOpen(false);
  }, [open, isAdmin, authUser]);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setCustomersLoading(true);
      CustomerService.getAll({ search: customerSearch || undefined, page: 1, limit: 20 })
        .then((response) => setCustomers(listOf(response)))
        .catch(() => setCustomers([]))
        .finally(() => setCustomersLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, customerSearch]);
  useEffect(() => {
    if (!open || !isAdmin) {
      setStaff([]);
      setStaffLoading(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setStaffLoading(true);
      EmployeeService.getAll({
        role: "staff",
        status: "ACTIVE",
        search: staffSearch || undefined,
        page: 1,
        limit: 20,
      })
        .then((response) => setStaff(listOf(response)))
        .catch(() => setStaff([]))
        .finally(() => setStaffLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, staffSearch, isAdmin]);
  useEffect(() => {
    if (!open || form.sourceType !== "truck") return undefined;
    const timer = setTimeout(() => {
      setTrucksLoading(true);
      TruckService.getAll({
        status: "active",
        hasInventory: "true",
        search: truckSearch || undefined,
        page: 1,
        limit: 20,
      })
        .then((response) => setTrucks(listOf(response)))
        .catch(() => setTrucks([]))
        .finally(() => setTrucksLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, form.sourceType, truckSearch]);
  useEffect(() => {
    if (!open || isAdmin || truck || !trucks.length || sourceAutoSelectedRef.current) return;
    const actorId = String(getId(authUser) || "");
    const assignedTruck =
      trucks.find((item) => {
        const driverId =
          getId(item.driver) || getId(item.driverId) || item.driverId || item.driver?.userId;
        return driverId && String(driverId) === actorId;
      }) || trucks[0];
    if (assignedTruck) {
      sourceAutoSelectedRef.current = true;
      setForm((current) => ({ ...current, sourceType: "truck" }));
      setTruck(assignedTruck);
      setItems([{ product: null, qty: 1, search: "" }]);
      setGifts([]);
    }
  }, [open, isAdmin, trucks, truck, authUser]);
  useEffect(() => {
    if (!open || isAdmin || !sourceCardsRef.current) return;
    sourceCardsRef.current.scrollTo({ left: 0, behavior: "smooth" });
  }, [open, isAdmin, form.sourceType, truck]);
  useEffect(() => {
    if (!open || (form.sourceType === "truck" && !truck)) {
      setProductOptions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      setProductsLoading(true);
      const request =
        form.sourceType === "truck"
          ? TruckService.getTruckAvailableProducts(getId(truck), {
              search: productSearch || undefined,
              page: 1,
              limit: 20,
            })
          : ProductService.getAll({ search: productSearch || undefined, page: 1, limit: 20 });
      request
        .then((response) => setProductOptions(listOf(response)))
        .catch(() => setProductOptions([]))
        .finally(() => setProductsLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, form.sourceType, truck, productSearch, productOptionsRefresh]);
  useEffect(() => {
    if (!open || !gifts.length || (form.sourceType === "truck" && !truck)) {
      setGiftOptions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      setGiftOptionsLoading(true);
      const request =
        form.sourceType === "truck"
          ? TruckService.getTruckAvailableProducts(getId(truck), {
              search: giftSearch || undefined,
              page: 1,
              limit: 20,
            })
          : ProductService.getAll({ search: giftSearch || undefined, page: 1, limit: 20 });
      request
        .then((response) => setGiftOptions(listOf(response)))
        .catch(() => setGiftOptions([]))
        .finally(() => setGiftOptionsLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, gifts.length, form.sourceType, truck, giftSearch, giftOptionsRefresh]);
  const previewItems = useMemo(
    () =>
      items
        .filter((item) => item.product && Number(item.qty) > 0)
        .map((item) => ({
          productId: getId(item.product) || item.product.productId,
          qty: Number(item.qty),
          unitPriceOverride: item.customPriceEnabled ? Number(item.customPrice || 0) : undefined,
        })),
    [items]
  );
  const loadPreview = useCallback(
    async (voucher = appliedVoucher, silent = true) => {
      if (!previewItems.length) {
        setPreview(null);
        return null;
      }
      try {
        const response = await InvoiceService.preview({
          customerId: getId(customer) || undefined,
          voucherCode: voucher || undefined,
          items: previewItems,
        });
        const data = unwrap(response);
        setPreview(data);
        setPreviewError("");
        return data;
      } catch (error) {
        const message = errorMessage(error, "Không thể tính hóa đơn");
        setPreview(null);
        setPreviewError(message);
        if (!silent) toast.error(message);
        return null;
      }
    },
    [appliedVoucher, customer, previewItems]
  );
  useEffect(() => {
    if (!open || !previewItems.length) {
      setPreview(null);
      return undefined;
    }
    const timer = setTimeout(() => loadPreview(appliedVoucher, true), 350);
    return () => clearTimeout(timer);
  }, [open, loadPreview, previewItems.length, appliedVoucher]);
  /* Promotion rule UI is temporarily disabled. Direct invoice gifts are used instead. */
  useEffect(() => {
    if (true) return undefined;
    if (!open || !previewItems.length) {
      setGiftPromotions({ eligiblePromotions: [], nearlyEligiblePromotions: [] });
      return undefined;
    }
    const timer = setTimeout(() => {
      InvoiceService.previewGiftPromotions({
        customerId: getId(customer) || undefined,
        items: previewItems,
      })
        .then((response) => {
          const data = unwrap(response) || {};
          setGiftPromotions({
            eligiblePromotions: data.eligiblePromotions || [],
            nearlyEligiblePromotions: data.nearlyEligiblePromotions || [],
          });
          setSelectedGiftPromotion(
            (current) =>
              (data.eligiblePromotions || []).find(
                (item) => item.promotionId === current?.promotionId
              ) || null
          );
        })
        .catch(() => setGiftPromotions({ eligiblePromotions: [], nearlyEligiblePromotions: [] }));
      setAppliedGiftPromotion(null);
    }, 350);
    return () => clearTimeout(timer);
  }, [open, customer, previewItems]);
  const applyVoucher = async () => {
    const code = form.voucherCode.trim().toUpperCase();
    if (!code) {
      setAppliedVoucher("");
      return;
    }
    const result = await loadPreview(code, false);
    if (result) {
      setAppliedVoucher(code);
      toast.success(`Đã áp dụng ${result.promotion?.name || code}`);
    }
  };
  const chooseGiftPromotion = (promotion) => {
    setSelectedGiftPromotion(promotion);
    setGiftSelections({});
    setAppliedGiftPromotion(null);
  };
  const changeGiftQty = (groupCode, productId, qty) =>
    setGiftSelections((current) => ({
      ...current,
      [groupCode]: { ...(current[groupCode] || {}), [productId]: Number(qty) || 0 },
    }));
  const giftSelectionPayload = () =>
    selectedGiftPromotion
      ? selectedGiftPromotion.giftGroups
          .filter((group) => group.selectionMode !== "ALL")
          .map((group) => ({
            groupCode: group.groupCode,
            items: Object.entries(giftSelections[group.groupCode] || {})
              .filter(([, qty]) => qty > 0)
              .map(([productId, qty]) => ({ productId, qty })),
          }))
      : [];
  const applyGift = async () => {
    if (!selectedGiftPromotion) return;
    try {
      const selections = giftSelectionPayload();
      const response = await InvoiceService.applyGiftPromotion({
        customerId: getId(customer) || undefined,
        promotionId: selectedGiftPromotion.promotionId,
        items: previewItems,
        giftSelections: selections,
      });
      setAppliedGiftPromotion({
        ...(unwrap(response)?.promotionApplication || {}),
        promotionId: selectedGiftPromotion.promotionId,
        giftSelections: selections,
      });
      toast.success("Đã xác nhận quà tặng");
    } catch (error) {
      toast.error(errorMessage(error, "Lựa chọn quà không hợp lệ"));
    }
  };
  const paidAmount = Number(form.cashAmount || 0) + Number(form.bankAmount || 0);
  const grandTotal = preview?.grandTotal || 0;
  const subtotal = Number(preview?.subtotal || 0);
  const vatAmount = Number(preview?.vatAmount || 0);
  const discountAmount = Number(preview?.discountAmount || 0);
  const totalQuantity = previewItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const createsUnassignedCustomer = customerMode === "NEW";
  const hasCustomerProfile = Boolean(customer) || createsUnassignedCustomer;
  const currentDebt = Number(customer?.debt || 0);
  const debtLimit = Number(customer?.debtLimit || 0);
  const isDebtPaymentOnly = previewItems.length === 0 && paidAmount > 0;
  const paysExistingDebt = form.paymentMode === "PAY_WITH_DEBT";
  const invoicePaidAmount = Math.min(grandTotal, paidAmount);
  const previousDebtPaidAmount = isDebtPaymentOnly
    ? Math.min(currentDebt, paidAmount)
    : paysExistingDebt
    ? Math.min(currentDebt, Math.max(0, paidAmount - grandTotal))
    : 0;
  const invoiceDebt = Math.max(0, grandTotal - invoicePaidAmount);
  const projectedDebt = isDebtPaymentOnly
    ? Math.max(0, currentDebt - paidAmount)
    : paysExistingDebt
    ? Math.max(0, currentDebt + grandTotal - paidAmount)
    : currentDebt + invoiceDebt;
  const maximumPaymentAmount = isDebtPaymentOnly
    ? currentDebt
    : grandTotal + (paysExistingDebt ? currentDebt : 0);
  const customerPhones = customer
    ? Array.from(
        new Set(
          [...(Array.isArray(customer.phones) ? customer.phones : []), customer.phone].filter(
            Boolean
          )
        )
      ).join(", ")
    : "";
  const debtLimitApplies = !isDebtPaymentOnly && grandTotal > 0;
  const customerAtDebtLimit = Boolean(
    debtLimitApplies && customer && debtLimit > 0 && currentDebt >= debtLimit
  );
  const overLimit = Boolean(
    debtLimitApplies && customer && debtLimit > 0 && projectedDebt > debtLimit
  );
  const paymentModePresentation =
    {
      PAY_NOW: {
        label: "Thanh toán hóa đơn",
        description:
          invoiceDebt > 0
            ? `Khách trả ${money(paidAmount)} · Cộng công nợ mới ${money(invoiceDebt)}`
            : `Khách thanh toán ${money(paidAmount)} cho hóa đơn hiện tại`,
        icon: "payments",
        color: "#2e7d32",
        background: "#ecfdf3",
      },
      PAY_WITH_DEBT: {
        label: "Thanh toán hóa đơn và trừ nợ cũ",
        description: `Trả hóa đơn ${money(invoicePaidAmount)} · Trừ nợ cũ ${money(
          previousDebtPaidAmount
        )}`,
        icon: "account_balance_wallet",
        color: "#00897b",
        background: "#e0f2f1",
      },
      DEBT: {
        label: "Ghi nợ toàn bộ",
        description: `Cộng ${money(grandTotal)} vào công nợ khách hàng`,
        icon: "pending_actions",
        color: "#ed6c02",
        background: "#fff7ed",
      },
      DEBT_PAYMENT: {
        label: "Thanh toán công nợ",
        description: `Chỉ thu ${money(paidAmount)}, không xuất hàng hóa`,
        icon: "price_check",
        color: "#1565c0",
        background: "#e3f2fd",
      },
    }[form.paymentMode] || {
      label: "Chưa xác định",
      description: "Nhập số tiền khách thanh toán để hệ thống tự ghi nhận",
      icon: "info",
      color: "#607d8b",
      background: "#f5f7fa",
    };
  useEffect(() => {
    if (!open) return;
    let paymentMode = "DEBT";
    if (paidAmount > 0 && grandTotal <= 0) paymentMode = "DEBT_PAYMENT";
    else if (paidAmount > grandTotal && customer && currentDebt > 0) paymentMode = "PAY_WITH_DEBT";
    else if (paidAmount > 0) paymentMode = "PAY_NOW";
    setForm((current) =>
      current.paymentMode === paymentMode ? current : { ...current, paymentMode }
    );
  }, [open, paidAmount, grandTotal, customer, currentDebt]);
  const selectedQuantityFor = (product) => {
    const productId = getId(product) || product?.productId;
    if (!productId) return 0;
    return [...items, ...gifts].reduce((sum, line) => {
      const lineId = getId(line.product) || line.product?.productId;
      return lineId === productId ? sum + Number(line.qty || 0) : sum;
    }, 0);
  };
  const remainingStockFor = (product) =>
    Math.max(0, stockOf(product) - selectedQuantityFor(product));
  const unitPriceFor = (product) =>
    Number(product?.sellPrice ?? product?.price ?? product?.salePrice ?? 0);
  const previewConfirmsItemPrice = (item) => {
    if (!item?.product) return false;
    const productId = String(getId(item.product) || item.product?.productId || "");
    const expectedPrice = effectiveUnitPriceFor(item);
    const rawPreviewLines = preview?.items || preview?.lines || preview?.saleItems;
    const previewLines = Array.isArray(rawPreviewLines) ? rawPreviewLines : [];
    return previewLines.some((line) => {
      const lineProductId =
        getId(line.productId) || line.productId || getId(line.product) || line.product?.productId;
      const linePrice = Number(line.price ?? line.unitPrice ?? line.sellPrice ?? 0);
      return (
        lineProductId &&
        String(lineProductId) === productId &&
        linePrice === Number(expectedPrice)
      );
    });
  };
  const effectiveUnitPriceFor = (item) =>
    item?.customPriceEnabled ? Number(item.customPrice || 0) : unitPriceFor(item?.product);
  const sourceCardOptions = [
    {
      id: "warehouse",
      sourceType: "warehouse",
      name: "Kho chính",
      subtitle: "Xuất trực tiếp từ kho",
      icon: "warehouse",
    },
    ...trucks.map((item) => ({
      ...item,
      id: getId(item),
      sourceType: "truck",
      subtitle: [item.licensePlate, item.driverName || item.driver?.fullName]
        .filter(Boolean)
        .join(" · "),
      icon: "local_shipping",
    })),
  ].sort((left, right) => {
    const isSelected = (source) =>
      source.sourceType === "warehouse"
        ? form.sourceType === "warehouse"
        : form.sourceType === "truck" && getId(truck) === source.id;
    return Number(isSelected(right)) - Number(isSelected(left));
  });
  const setDebtLimitOverride = (enabled) => {
    setForm((current) => ({
      ...current,
      allowDebtLimitOverride: enabled,
      debtOverrideReason: enabled ? current.debtOverrideReason : "",
    }));
  };
  const updateItem = (index, patch) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const validationMessage = () => {
    if (isDebtPaymentOnly) {
      if (!customer || customerMode !== "EXISTING")
        return "Thanh toán công nợ bắt buộc chọn khách hàng đã có hồ sơ";
      if (currentDebt <= 0) return "Khách hàng hiện không có công nợ";
      if (paidAmount > currentDebt) return "Số tiền thanh toán không được vượt công nợ hiện tại";
      return "";
    }
    if (!salesperson) return "Vui lòng chọn nhân viên xuất hóa đơn";
    if (!previewItems.length || previewItems.length !== items.length)
      return "Vui lòng chọn đầy đủ sản phẩm và số lượng";
    if (items.some((item) => item.customPriceEnabled && Number(item.customPrice || 0) <= 0))
      return "Giá bán điều chỉnh phải lớn hơn 0";
    if (items.some((item) => item.customPriceEnabled && !previewConfirmsItemPrice(item)))
      return "Backend chưa xác nhận giá bán điều chỉnh. Vui lòng kiểm tra API preview trước khi tạo đơn";
    if (form.sourceType === "truck" && !truck) return "Vui lòng chọn xe xuất hàng";
    if (!preview) return previewError || "Chưa tính được giá trị hóa đơn";
    if (gifts.some((gift) => !gift.product || Number(gift.qty) <= 0))
      return "Vui lòng chọn đầy đủ sản phẩm quà tặng và số lượng";
    if (createsUnassignedCustomer && !newCustomer.name.trim())
      return "Vui lòng nhập tên khách hàng mới";
    if (form.paymentMode === "DEBT" && !hasCustomerProfile)
      return "Hóa đơn ghi nợ bắt buộc có hồ sơ khách hàng";
    if (paysExistingDebt && !customer)
      return "Vui lòng chọn khách hàng để thanh toán công nợ cũ";
    if (paysExistingDebt && currentDebt <= 0) return "Khách hàng hiện không có công nợ cũ";
    if (paidAmount > maximumPaymentAmount)
      return paysExistingDebt
        ? "Số tiền thanh toán không được vượt tổng hóa đơn và công nợ cũ"
        : "Tổng tiền thanh toán không được vượt giá trị hóa đơn";
    if (!hasCustomerProfile && paidAmount !== grandTotal) return "Khách lẻ phải thanh toán đủ";
    if (overLimit && !form.allowDebtLimitOverride)
      return "Hóa đơn vượt hạn mức công nợ của khách hàng";
    if (overLimit && form.allowDebtLimitOverride && !form.debtOverrideReason.trim())
      return "Vui lòng nhập lý do vượt hạn mức";
    return "";
  };
  const openReview = () => {
    const message = validationMessage();
    if (message) {
      toast.error(message);
      return;
    }
    setReviewOpen(true);
  };
  const submit = async () => {
    const message = validationMessage();
    if (message) return toast.error(message);
    if (isDebtPaymentOnly) {
      const debtPayments = [];
      if (Number(form.cashAmount) > 0)
        debtPayments.push({ method: "CASH", amount: Number(form.cashAmount) });
      if (Number(form.bankAmount) > 0)
        debtPayments.push({
          method: "BANK_TRANSFER",
          amount: Number(form.bankAmount),
          referenceCode: form.referenceCode.trim() || undefined,
        });
      try {
        setSubmitting(true);
        const response = await DebtPaymentService.create(getId(customer), {
          date: new Date().toISOString(),
          payments: debtPayments,
          invoiceIds: [],
          note: form.note.trim() || undefined,
        });
        const receipt = unwrap(response) || {};
        toast.success(`Đã lập phiếu thu công nợ ${receipt.code || ""}`);
        setReviewOpen(false);
        setCreatedInvoice(
          debtPaymentToInvoice(
            { ...receipt, note: receipt.note ?? (form.note.trim() || undefined) },
            customer
          )
        );
        onCreated();
      } catch (error) {
        toast.error(errorMessage(error, "Không thể thanh toán công nợ"));
      } finally {
        setSubmitting(false);
      }
      return;
    }
    try {
      setSubmitting(true);
      const payments = [];
      if (Number(form.cashAmount) > 0)
        payments.push({ method: "CASH", amount: Number(form.cashAmount) });
      if (Number(form.bankAmount) > 0)
        payments.push({
          method: "BANK_TRANSFER",
          amount: Number(form.bankAmount),
          referenceCode: form.referenceCode.trim() || undefined,
        });
      const response = await InvoiceService.create({
        code: form.code.trim() || undefined,
        date: `${form.date}T00:00:00+07:00`,
        customerId: getId(customer) || undefined,
        newCustomer: createsUnassignedCustomer
          ? {
              name: newCustomer.name.trim(),
              phone: newCustomer.phone.trim() || undefined,
              address: newCustomer.address.trim() || undefined,
              note: newCustomer.note.trim() || undefined,
            }
          : undefined,
        sourceType: form.sourceType,
        truckId: getId(truck) || undefined,
        salespersonId: isAdmin ? getId(salesperson) : undefined,
        voucherCode: appliedVoucher || undefined,
        gifts: gifts.length
          ? gifts.map((gift) => ({
              productId: getId(gift.product) || gift.product?.productId,
              qty: Number(gift.qty),
            }))
          : undefined,
        payments,
        applyExcessToDebt: paysExistingDebt || undefined,
        items: previewItems,
        note: form.note.trim() || undefined,
        allowDebtLimitOverride: Boolean(overLimit && form.allowDebtLimitOverride),
        debtOverrideReason:
          overLimit && form.allowDebtLimitOverride ? form.debtOverrideReason.trim() : undefined,
      });
      const created = unwrap(response) || {};
      toast.success(
        created.debtPaymentCode
          ? `Đã tạo hóa đơn ${created.code || ""} và phiếu thu ${created.debtPaymentCode}`
          : `Đã tạo hóa đơn ${created.code || ""}`
      );
      setCreatedInvoice({
        ...created,
        note: created.note ?? (form.note.trim() || undefined),
        customerDebtBefore: created.customerDebtBefore ?? currentDebt,
        customerDebtAfter: created.customerDebtAfter ?? projectedDebt,
        receivedAmount: created.receivedAmount ?? paidAmount,
        existingDebtPaidAmount: created.existingDebtPaidAmount ?? previousDebtPaidAmount,
      });
      setReviewOpen(false);
      onCreated();
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tạo hóa đơn"));
    } finally {
      setSubmitting(false);
    }
  };
  const reviewCustomerName = customer
    ? [customer.code, customer.name].filter(Boolean).join(" · ")
    : createsUnassignedCustomer
    ? `Khách mới chưa mã · ${newCustomer.name || "Chưa nhập tên"}`
    : "Khách lẻ";
  const reviewSourceName =
    form.sourceType === "truck"
      ? [truck?.name || "Xe tải", truck?.licensePlate].filter(Boolean).join(" · ")
      : "Kho chính";
  if (documentMode === "CUSTOMER_RETURN")
    return (
      <CustomerReturnModal
        open={open}
        onClose={onClose}
        onCreated={onCreated}
        onSwitchToSale={setDocumentMode}
      />
    );
  if (reviewOpen)
    return (
      <Modal open={open} onClose={() => !submitting && setReviewOpen(false)}>
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: 0, md: "50%" },
            left: { xs: 0, md: "50%" },
            transform: { xs: "none", md: "translate(-50%, -50%)" },
            width: { xs: "100%", md: 720 },
            height: { xs: "100dvh", md: "auto" },
            maxHeight: { xs: "100dvh", md: "92vh" },
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
            borderRadius: { xs: 0, md: 3 },
            boxShadow: 24,
            overflow: "hidden",
          }}
        >
          <SoftBox
            px={{ xs: 2, md: 3 }}
            py={2}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            sx={{ borderBottom: "1px solid #e5e7eb" }}
          >
            <SoftBox>
              <SoftTypography variant="h5" fontWeight="bold">
                Kiểm tra lại hóa đơn
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                Chưa trừ hàng hoặc cập nhật công nợ ở bước này
              </SoftTypography>
            </SoftBox>
            <SoftButton
              variant="text"
              color="secondary"
              iconOnly
              disabled={submitting}
              onClick={() => setReviewOpen(false)}
            >
              <Icon>close</Icon>
            </SoftButton>
          </SoftBox>

          <SoftBox px={{ xs: 2, md: 3 }} py={2} sx={{ overflowY: "auto", flex: 1 }}>
            <SoftBox
              p={2}
              mb={2}
              borderRadius={2}
              bgcolor="#f5f8fc"
              sx={{ border: "1px solid #dbe4f0" }}
            >
              {[
                ["Khách hàng", reviewCustomerName],
                ["Nhân viên", salesperson?.fullName || salesperson?.username || "—"],
                ["Nguồn xuất", isDebtPaymentOnly ? "Không xuất hàng" : reviewSourceName],
                ["Hình thức", paymentModePresentation.label],
              ].map(([label, value]) => (
                <SoftBox
                  key={label}
                  display="flex"
                  justifyContent="space-between"
                  gap={2}
                  py={0.55}
                >
                  <SoftTypography variant="caption" color="text">
                    {label}
                  </SoftTypography>
                  <SoftTypography variant="button" fontWeight="bold" textAlign="right">
                    {value}
                  </SoftTypography>
                </SoftBox>
              ))}
            </SoftBox>

            {!isDebtPaymentOnly && (
              <SoftBox mb={2.5}>
                <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
                  Hàng hóa ({items.length})
                </SoftTypography>
                {items.map((item, index) => {
                  const unitPrice = effectiveUnitPriceFor(item);
                  return (
                    <SoftBox
                      key={`${getId(item.product) || "item"}-${index}`}
                      display="grid"
                      sx={{ gridTemplateColumns: "32px 1fr auto", gap: 1.25 }}
                      alignItems="center"
                      py={1.25}
                      px={1.5}
                      mb={1}
                      borderRadius={1.5}
                      bgcolor="#fff"
                      border="1px solid #e5e7eb"
                    >
                      <SoftBox
                        width={32}
                        height={32}
                        borderRadius="50%"
                        display="grid"
                        sx={{ placeItems: "center", bgcolor: "#e3f2fd", color: "#1976d2" }}
                      >
                        {index + 1}
                      </SoftBox>
                      <SoftBox minWidth={0}>
                        <SoftTypography variant="button" fontWeight="bold" display="block">
                          {item.product?.name || "Sản phẩm"}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text">
                          {money(unitPrice)} × {numberText(item.qty)}
                          {item.customPriceEnabled ? " · Giá điều chỉnh" : ""}
                        </SoftTypography>
                      </SoftBox>
                      <SoftTypography variant="button" fontWeight="bold">
                        {money(unitPrice * Number(item.qty || 0))}
                      </SoftTypography>
                    </SoftBox>
                  );
                })}
              </SoftBox>
            )}

            {gifts.length > 0 && (
              <SoftBox mb={2.5} p={1.5} borderRadius={2} bgcolor="#eef8ff">
                <SoftTypography variant="button" fontWeight="bold" color="info">
                  Quà tặng kèm
                </SoftTypography>
                {gifts.map((gift, index) => (
                  <SoftTypography
                    key={`${getId(gift.product) || "gift"}-${index}`}
                    variant="caption"
                    display="block"
                    mt={0.75}
                  >
                    {gift.product?.name || "Sản phẩm quà"} × {numberText(gift.qty)}
                  </SoftTypography>
                ))}
              </SoftBox>
            )}

            <SoftBox
              p={2}
              borderRadius={2}
              sx={{ border: `2px solid ${paymentModePresentation.color}55` }}
              bgcolor={paymentModePresentation.background}
            >
              {[
                ["Tổng hóa đơn", grandTotal],
                ["Nợ cũ", currentDebt],
                ["Khách thanh toán", paidAmount],
                ["Còn nợ sau hóa đơn", projectedDebt],
              ].map(([label, value]) => (
                <SoftBox
                  key={label}
                  display="flex"
                  justifyContent="space-between"
                  py={0.6}
                >
                  <SoftTypography variant="button">{label}</SoftTypography>
                  <SoftTypography
                    variant="button"
                    fontWeight="bold"
                    color={label === "Còn nợ sau hóa đơn" && value > 0 ? "error" : "dark"}
                  >
                    {money(value)}
                  </SoftTypography>
                </SoftBox>
              ))}
            </SoftBox>

            <SoftBox mt={2} p={1.5} borderRadius={1.5} bgcolor="#fff8e1">
              <SoftTypography variant="caption" color="text" display="block">
                Ghi chú hóa đơn
              </SoftTypography>
              <SoftTypography
                variant="button"
                fontWeight={form.note.trim() ? "regular" : "light"}
                sx={{ whiteSpace: "pre-wrap" }}
              >
                {form.note.trim() || "Không có ghi chú"}
              </SoftTypography>
            </SoftBox>
          </SoftBox>

          <SoftBox
            display="flex"
            gap={1.5}
            px={{ xs: 2, md: 3 }}
            py={2}
            bgcolor="#fff"
            sx={{ borderTop: "1px solid #e5e7eb" }}
          >
            <SoftButton
              variant="outlined"
              color="secondary"
              fullWidth
              disabled={submitting}
              onClick={() => setReviewOpen(false)}
            >
              Quay lại chỉnh sửa
            </SoftButton>
            <SoftButton
              variant="gradient"
              color="success"
              fullWidth
              disabled={submitting}
              onClick={submit}
            >
              {submitting
                ? "Đang xử lý..."
                : isDebtPaymentOnly
                ? "Xác nhận thu nợ"
                : "Xác nhận bán hàng"}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>
    );
  if (createdInvoice)
    return (
      <Modal open={open} onClose={onClose}>
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: isAdmin ? "50%" : 0, md: "50%" },
            left: { xs: isAdmin ? "50%" : 0, md: "50%" },
            transform: {
              xs: isAdmin ? "translate(-50%, -50%)" : "none",
              md: "translate(-50%, -50%)",
            },
            width: { xs: isAdmin ? "92%" : "100%", md: 560 },
            height: { xs: isAdmin ? "auto" : "100dvh", md: "auto" },
            overflowY: "auto",
            bgcolor: "background.paper",
            borderRadius: { xs: isAdmin ? 3 : 0, md: 3 },
            boxShadow: 24,
            p: { xs: 3, md: 4 },
          }}
        >
          <SoftBox textAlign="center">
            <Icon sx={{ fontSize: 54, color: "#2E7D32" }}>check_circle</Icon>
            <SoftTypography variant="h5" fontWeight="bold">
              {createdInvoice.documentType === "DEBT_PAYMENT"
                ? "Thanh toán công nợ thành công"
                : "Tạo hóa đơn thành công"}
            </SoftTypography>
            <SoftTypography variant="h6" color="info" mt={1}>
              {createdInvoice.code}
            </SoftTypography>
          </SoftBox>
          {(createdInvoice.giftCode || createdInvoice.gift?.code) && (
            <SoftBox mt={2} p={2} bgcolor="#E3F2FD" borderRadius={2} textAlign="center">
              <SoftTypography variant="caption" color="text" display="block">
                Mã quà tặng kèm đơn
              </SoftTypography>
              <SoftTypography variant="h6" color="info" fontWeight="bold" sx={{ letterSpacing: 1 }}>
                {createdInvoice.giftCode || createdInvoice.gift?.code}
              </SoftTypography>
            </SoftBox>
          )}
          {Number(createdInvoice.existingDebtPaidAmount || 0) > 0 && (
            <SoftBox
              mt={2}
              p={2}
              bgcolor="#E8F5E9"
              borderRadius={2}
              sx={{ border: "1px solid #81c784" }}
            >
              <SoftBox display="flex" alignItems="center" gap={1} mb={1.25}>
                <Icon sx={{ color: "#2e7d32" }}>check_circle</Icon>
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#1b5e20" }}>
                  Đã thanh toán kèm công nợ cũ
                </SoftTypography>
              </SoftBox>
              <Grid container spacing={1}>
                {[
                  ["Khách đã trả", createdInvoice.receivedAmount],
                  ["Đã trừ nợ cũ", createdInvoice.existingDebtPaidAmount],
                  ["Công nợ còn lại", createdInvoice.customerDebtAfter],
                ].map(([label, value]) => (
                  <Grid item xs={12} sm={4} key={label}>
                    <SoftBox bgcolor="rgba(255,255,255,.75)" borderRadius={1.5} p={1}>
                      <SoftTypography variant="caption" color="text" display="block">
                        {label}
                      </SoftTypography>
                      <SoftTypography
                        variant="button"
                        fontWeight="bold"
                        display="block"
                        sx={{
                          color: label === "Công nợ còn lại" && value > 0 ? "#c62828" : "#2e7d32",
                        }}
                      >
                        {money(value)}
                      </SoftTypography>
                    </SoftBox>
                  </Grid>
                ))}
              </Grid>
              {(createdInvoice.debtPaymentCode || createdInvoice.debtPayment?.code) && (
                <SoftBox
                  mt={1.25}
                  pt={1.25}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ borderTop: "1px dashed #81c784" }}
                >
                  <SoftTypography variant="caption" color="text">
                    Phiếu thu công nợ
                  </SoftTypography>
                  <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#1565c0" }}>
                    {createdInvoice.debtPaymentCode || createdInvoice.debtPayment?.code}
                  </SoftTypography>
                </SoftBox>
              )}
            </SoftBox>
          )}
          {(createdInvoice.promotionActivations || []).length > 0 && (
            <SoftBox mt={3} p={2} bgcolor="#F3E5F5" borderRadius={2}>
              <SoftTypography variant="button" fontWeight="bold" color="secondary">
                Mã kích hoạt của khách hàng
              </SoftTypography>
              {createdInvoice.promotionActivations.map((activation) => (
                <SoftBox
                  key={activation.id || activation.code}
                  mt={1.5}
                  p={1.5}
                  bgcolor="#fff"
                  borderRadius={1}
                >
                  <SoftTypography variant="caption" color="text" display="block">
                    {activation.promotionName || activation.promotionCode}
                  </SoftTypography>
                  <SoftBox display="flex" justifyContent="space-between" alignItems="center">
                    <SoftTypography variant="h6" fontWeight="bold" sx={{ letterSpacing: 1 }}>
                      {activation.code}
                    </SoftTypography>
                    <SoftButton
                      size="small"
                      variant="text"
                      color="info"
                      onClick={() => {
                        navigator.clipboard?.writeText(activation.code);
                        toast.success("Đã sao chép mã kích hoạt");
                      }}
                    >
                      Sao chép
                    </SoftButton>
                  </SoftBox>
                </SoftBox>
              ))}
            </SoftBox>
          )}
          {createdInvoice.documentType !== "DEBT_PAYMENT" && (
            <SoftTypography variant="caption" color="text" display="block" mt={2}>
              Mã kích hoạt đã được lưu vào hồ sơ khách hàng và hóa đơn.
            </SoftTypography>
          )}
          <SoftBox display="flex" gap={1.5} mt={3}>
            <SoftButton
              variant="outlined"
              color="info"
              fullWidth
              disabled={exportingInvoice}
              startIcon={<Icon>{isAdmin ? "print" : "image"}</Icon>}
              onClick={printCreatedInvoice}
            >
              {exportingInvoice ? "Đang tạo ảnh..." : isAdmin ? "Xuất hóa đơn" : "Lưu ảnh hóa đơn"}
            </SoftButton>
            <SoftButton variant="gradient" color="success" fullWidth onClick={onClose}>
              Hoàn tất
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>
    );
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: { xs: 0, md: "50%" },
          left: { xs: 0, md: "50%" },
          transform: { xs: "none", md: "translate(-50%, -50%)" },
          width: { xs: "100%", md: isAdmin ? "96vw" : 900 },
          maxWidth: { md: isAdmin ? 1320 : 900 },
          height: { xs: "100dvh", md: "auto" },
          maxHeight: { xs: "100dvh", md: "94vh" },
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: { xs: 0, md: 3 },
          boxShadow: 24,
          p: { xs: 0, md: isAdmin ? 3 : 4 },
        }}
      >
        <SoftBox
          position={{ xs: "sticky", md: "static" }}
          top={0}
          zIndex={5}
          bgcolor="background.paper"
          px={{ xs: 2, md: 0 }}
          py={{ xs: 1.5, md: 0 }}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ borderBottom: { xs: "1px solid #eee", md: "none" } }}
        >
          <SoftBox>
            <SoftTypography variant="h5" fontWeight="bold">
              {isAdmin ? "Tạo hóa đơn bán hàng" : "Bán hàng nhanh"}
            </SoftTypography>
            {isAdmin ? (
              <SoftTypography variant="caption" color="text">
                Nhập thông tin đơn hàng bên trái và kiểm tra thanh toán bên phải
              </SoftTypography>
            ) : (
              <SoftTypography variant="caption" color="text">
                {authUser?.employeeCode || "NV"} · {authUser?.fullName || authUser?.username}
              </SoftTypography>
            )}
          </SoftBox>
          <IconButton onClick={onClose}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
        <SoftBox px={{ xs: 2, md: 0 }} py={{ xs: 1.25, md: 1.5 }}>
          <InvoiceBusinessTypeSwitch value="SALE" onChange={setDocumentMode} />
        </SoftBox>
        {!isAdmin && (
          <SoftBox
            display={{ xs: "grid", md: "none" }}
            px={2}
            py={1}
            sx={{
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0.75,
              bgcolor: "#f7f9fc",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {[
              ["person", "Khách"],
              ["local_shipping", "Nguồn"],
              ["inventory_2", "Hàng"],
              ["payments", "Thanh toán"],
            ].map(([icon, label], index) => (
              <SoftBox key={label} textAlign="center">
                <SoftBox
                  width={34}
                  height={34}
                  mx="auto"
                  borderRadius="50%"
                  bgcolor="#e8f5e9"
                  color="#2e7d32"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon sx={{ fontSize: 18 }}>{icon}</Icon>
                </SoftBox>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mt={0.25}>
                  {index + 1}. {label}
                </SoftTypography>
              </SoftBox>
            ))}
          </SoftBox>
        )}
        <SoftBox
          px={{ xs: 2, md: 0 }}
          pb={{ xs: 12, md: 0 }}
          sx={
            !isAdmin
              ? {
                  "@media (max-width: 899.95px)": {
                    "& .MuiInputBase-root": {
                      minHeight: 52,
                      fontSize: "16px",
                      borderRadius: "12px",
                    },
                    "& .MuiAutocomplete-input": { fontSize: "16px !important" },
                    "& .MuiFormControlLabel-label": {
                      fontSize: "15px",
                      lineHeight: 1.35,
                    },
                    "& .MuiButton-root": {
                      minHeight: 48,
                      borderRadius: "12px",
                      fontSize: "14px",
                    },
                    "& .MuiIconButton-root": {
                      width: 44,
                      height: 44,
                    },
                  },
                }
              : undefined
          }
        >
          <SoftBox
            sx={
              isAdmin
                ? {
                    display: { xs: "block", md: "grid" },
                    gridTemplateColumns: {
                      md: "minmax(0, 1.65fr) minmax(360px, 0.78fr)",
                      xl: "minmax(0, 1.8fr) minmax(390px, 0.72fr)",
                    },
                    gap: 3,
                    alignItems: "start",
                  }
                : undefined
            }
          >
            <SoftBox minWidth={0}>
              <SectionTitle
                step="1"
                title="Khách hàng"
                subtitle="Tìm nhanh theo tên hoặc số điện thoại"
              />
              <Grid container spacing={2} mt={0}>
                {isAdmin && (
                  <>
                    <Field label="Mã hóa đơn">
                      <SoftInput
                        value={form.code}
                        onChange={(e) => set("code", e.target.value.toUpperCase())}
                        placeholder="Để trống để tự sinh"
                      />
                    </Field>
                    <Field label="Ngày hóa đơn *">
                      <SoftInput
                        type="date"
                        value={form.date}
                        onChange={(e) => set("date", e.target.value)}
                      />
                    </Field>
                  </>
                )}
                <Grid item xs={12}>
                  <SoftTypography variant="caption" fontWeight="bold">
                    Chọn loại khách hàng
                  </SoftTypography>
                  <SoftBox
                    display="flex"
                    gap={1}
                    mt={0.75}
                    pb={0.5}
                    sx={{
                      overflowX: "auto",
                      scrollSnapType: "x mandatory",
                      WebkitOverflowScrolling: "touch",
                      scrollbarWidth: "none",
                      "&::-webkit-scrollbar": { display: "none" },
                    }}
                  >
                    {[
                      {
                        value: "EXISTING",
                        title: "Khách có hồ sơ",
                        subtitle: "Tìm trong danh sách khách hàng",
                        icon: "person_search",
                        color: "#1565c0",
                        background: "#e7f3ff",
                      },
                      {
                        value: "NEW",
                        title: "Khách mới chưa mã",
                        subtitle: "Chỉ bắt buộc nhập tên",
                        icon: "person_add",
                        color: "#7b1fa2",
                        background: "#f3e5f5",
                      },
                      {
                        value: "WALK_IN",
                        title: "Khách lẻ",
                        subtitle: "Không tạo hồ sơ, phải trả đủ",
                        icon: "person_outline",
                        color: "#616161",
                        background: "#f5f5f5",
                      },
                    ].map((option) => {
                      const selected = customerMode === option.value;
                      return (
                        <SoftBox
                          key={option.value}
                          component="button"
                          type="button"
                          onClick={() => {
                            setCustomerMode(option.value);
                            setCustomer(null);
                            setCustomerSearch("");
                            setAppliedVoucher("");
                            setForm((current) => ({
                              ...current,
                              voucherCode: "",
                              allowDebtLimitOverride: false,
                              debtOverrideReason: "",
                              paymentMode:
                                option.value !== "EXISTING" &&
                                (current.paymentMode === "PAY_WITH_DEBT" ||
                                  (option.value === "WALK_IN" && current.paymentMode === "DEBT"))
                                  ? "PAY_NOW"
                                  : current.paymentMode,
                            }));
                          }}
                          p={1.25}
                          textAlign="left"
                          sx={{
                            minWidth: { xs: 210, md: 0 },
                            flex: { md: 1 },
                            scrollSnapAlign: "start",
                            border: selected ? `2px solid ${option.color}` : "1px solid #dfe3e8",
                            borderRadius: 2,
                            background: selected ? option.background : "#fff",
                            cursor: "pointer",
                            transition: "all .16s ease",
                          }}
                        >
                          <SoftBox display="flex" alignItems="center" gap={1}>
                            <Icon sx={{ color: option.color }}>{option.icon}</Icon>
                            <SoftBox>
                              <SoftTypography variant="button" fontWeight="bold" display="block">
                                {option.title}
                              </SoftTypography>
                              <SoftTypography variant="caption" color="text">
                                {option.subtitle}
                              </SoftTypography>
                            </SoftBox>
                          </SoftBox>
                        </SoftBox>
                      );
                    })}
                  </SoftBox>
                </Grid>
                {customerMode === "EXISTING" && (
                  <Field label="Khách hàng" md={isAdmin ? 8 : 12}>
                    <SoftBox display="flex" alignItems="stretch" gap={1}>
                      <SoftBox flex={1} minWidth={0}>
                        <SearchSelect
                          value={customer}
                          onChange={(selected) => {
                            if (customer) return;
                            setCustomer(selected);
                            setForm((current) => ({
                              ...current,
                              allowDebtLimitOverride: false,
                              debtOverrideReason: "",
                            }));
                          }}
                          options={customers}
                          loading={customersLoading}
                          inputValue={customerSearch}
                          onInputChange={setCustomerSearch}
                          placeholder="Tìm mã, tên hoặc số điện thoại..."
                          label={(item) =>
                            [item.code || "Chưa có mã", item.name || "Khách hàng"]
                              .filter(Boolean)
                              .join(" · ")
                          }
                          disabled={Boolean(customer)}
                          disableClearable
                          large
                        />
                      </SoftBox>
                      {customer && (
                        <Tooltip title="Xóa khách hàng để chọn lại">
                          <IconButton
                            color="error"
                            onClick={() => {
                              setCustomer(null);
                              setCustomerSearch("");
                              setAppliedVoucher("");
                              setForm((current) => ({
                                ...current,
                                voucherCode: "",
                                allowDebtLimitOverride: false,
                                debtOverrideReason: "",
                                paymentMode:
                                  current.paymentMode === "PAY_WITH_DEBT"
                                    ? "PAY_NOW"
                                    : current.paymentMode,
                                cashAmount:
                                  current.paymentMode === "PAY_WITH_DEBT" ? 0 : current.cashAmount,
                                bankAmount:
                                  current.paymentMode === "PAY_WITH_DEBT" ? 0 : current.bankAmount,
                                referenceCode:
                                  current.paymentMode === "PAY_WITH_DEBT"
                                    ? ""
                                    : current.referenceCode,
                              }));
                            }}
                            sx={{
                              width: "58px !important",
                              minWidth: "58px !important",
                              height: "58px !important",
                              minHeight: "58px !important",
                              border: "1px solid #ef9a9a",
                              borderRadius: "12px",
                              bgcolor: "#fff5f5",
                              flexShrink: 0,
                            }}
                            aria-label="Xóa khách hàng đã chọn"
                          >
                            <Icon>delete_outline</Icon>
                          </IconButton>
                        </Tooltip>
                      )}
                    </SoftBox>
                    {customer && (
                      <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
                        Bấm nút xóa bên cạnh nếu muốn chọn khách hàng khác.
                      </SoftTypography>
                    )}
                  </Field>
                )}
                {customerMode === "NEW" && (
                  <Grid item xs={12} md={isAdmin ? 8 : 12}>
                    <SoftBox
                      p={{ xs: 1.5, md: 2 }}
                      borderRadius={2}
                      bgcolor="#faf5ff"
                      sx={{ border: "1px solid #ce93d8" }}
                    >
                      <SoftBox display="flex" alignItems="center" gap={1} mb={1.5}>
                        <Icon sx={{ color: "#7b1fa2" }}>person_add</Icon>
                        <SoftBox>
                          <SoftTypography variant="button" fontWeight="bold" display="block">
                            Tạo hồ sơ khách hàng chưa có mã
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text">
                            Hồ sơ được tạo cùng hóa đơn và có thể cấp mã sau.
                          </SoftTypography>
                        </SoftBox>
                      </SoftBox>
                      <Grid container spacing={1.25}>
                        <Grid item xs={12} sm={6}>
                          <SoftTypography variant="caption">Tên khách hàng *</SoftTypography>
                          <SoftInput
                            value={newCustomer.name}
                            placeholder="Nhập tên khách hàng"
                            onChange={(event) =>
                              setNewCustomer((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <SoftTypography variant="caption">Số điện thoại</SoftTypography>
                          <SoftInput
                            value={newCustomer.phone}
                            inputProps={{ inputMode: "tel" }}
                            placeholder="Có thể bổ sung sau"
                            onChange={(event) =>
                              setNewCustomer((current) => ({
                                ...current,
                                phone: event.target.value,
                              }))
                            }
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <SoftTypography variant="caption">Địa chỉ</SoftTypography>
                          <SoftInput
                            value={newCustomer.address}
                            placeholder="Có thể bổ sung sau"
                            onChange={(event) =>
                              setNewCustomer((current) => ({
                                ...current,
                                address: event.target.value,
                              }))
                            }
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <SoftTypography variant="caption">Ghi chú khách hàng</SoftTypography>
                          <SoftInput
                            value={newCustomer.note}
                            multiline
                            minRows={2}
                            placeholder="Thông tin nhận biết khách hàng..."
                            onChange={(event) =>
                              setNewCustomer((current) => ({
                                ...current,
                                note: event.target.value,
                              }))
                            }
                          />
                        </Grid>
                      </Grid>
                      <SoftBox mt={1.25} p={1} borderRadius={1.5} bgcolor="#fff">
                        <SoftTypography
                          variant="caption"
                          fontWeight="bold"
                          sx={{ color: "#6a1b9a" }}
                        >
                          Chưa có mã · Chưa đặt hạn mức · Có thể thanh toán hoặc ghi nợ
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  </Grid>
                )}
                {customerMode === "WALK_IN" && (
                  <Grid item xs={12} md={isAdmin ? 8 : 12}>
                    <SoftBox
                      p={1.5}
                      borderRadius={2}
                      bgcolor="#f5f5f5"
                      sx={{ border: "1px solid #e0e0e0" }}
                    >
                      <SoftTypography variant="button" fontWeight="bold">
                        Hóa đơn khách lẻ
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text" display="block">
                        Không tạo hồ sơ khách hàng và hóa đơn phải được thanh toán đủ.
                      </SoftTypography>
                    </SoftBox>
                  </Grid>
                )}
                {isAdmin && (
                  <Field label="Nhân viên xuất hóa đơn *" md={4}>
                    <SearchSelect
                      value={salesperson}
                      onChange={setSalesperson}
                      options={staff}
                      loading={staffLoading}
                      inputValue={staffSearch}
                      onInputChange={setStaffSearch}
                      placeholder="Tìm mã, tên hoặc số điện thoại..."
                      label={(item) =>
                        `${item.employeeCode || ""} · ${item.fullName || item.username || ""} · ${
                          item.phone || ""
                        }`
                      }
                    />
                  </Field>
                )}
              </Grid>
              {customer && (
                <SoftBox mt={2} p={2} borderRadius={2} bgcolor={overLimit ? "#FFF3E0" : "#F3F8FF"}>
                  <SoftBox
                    display="flex"
                    alignItems="flex-start"
                    gap={1.25}
                    pb={1.5}
                    mb={1.5}
                    sx={{ borderBottom: "1px solid rgba(25, 118, 210, 0.14)" }}
                  >
                    <SoftBox
                      width={40}
                      height={40}
                      borderRadius="50%"
                      bgcolor="#e3f2fd"
                      color="#1565c0"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Icon>person</Icon>
                    </SoftBox>
                    <SoftBox flex={1} minWidth={0}>
                      <SoftBox display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                        <SoftTypography variant="button" fontWeight="bold">
                          {[customer.code, customer.name].filter(Boolean).join(" · ")}
                        </SoftTypography>
                        {customer.zaloConnected && (
                          <SoftTypography
                            variant="caption"
                            fontWeight="bold"
                            sx={{ color: "#0068ff", bgcolor: "#e7f3ff", px: 0.75, borderRadius: 1 }}
                          >
                            Zalo
                          </SoftTypography>
                        )}
                      </SoftBox>
                      <SoftTypography variant="caption" color="text" display="block">
                        Số điện thoại: {customerPhones || "Chưa có"}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text" display="block">
                        Địa chỉ: {customer.address || "Chưa có"}
                      </SoftTypography>
                      {(customer.sourceLabel ||
                        customer.source ||
                        customer.segmentLabel ||
                        customer.segment) && (
                        <SoftTypography variant="caption" color="text" display="block">
                          {[
                            customer.sourceLabel || customer.source,
                            customer.segmentLabel || customer.segment,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </SoftTypography>
                      )}
                    </SoftBox>
                  </SoftBox>
                  <Grid container spacing={1}>
                    {(isDebtPaymentOnly
                      ? [
                          ["Công nợ hiện tại", currentDebt],
                          ["Đang thanh toán", previousDebtPaidAmount],
                          ["Công nợ sau thu", projectedDebt],
                        ]
                      : [
                          ["Công nợ cũ", currentDebt],
                          ["Hạn mức", debtLimit],
                          [
                            "Hạn mức còn lại",
                            customer.availableDebtLimit ?? Math.max(0, debtLimit - currentDebt),
                          ],
                          ["Công nợ sau hóa đơn", projectedDebt],
                        ]
                    ).map(([label, value]) => (
                      <Grid item xs={6} md={3} key={label}>
                        <SoftTypography variant="caption" color="text">
                          {label}
                        </SoftTypography>
                        <SoftTypography
                          variant="button"
                          fontWeight="bold"
                          display="block"
                          color={label === "Công nợ sau hóa đơn" && overLimit ? "error" : "dark"}
                        >
                          {money(value)}
                        </SoftTypography>
                      </Grid>
                    ))}
                  </Grid>
                  {customerAtDebtLimit && (
                    <SoftBox mt={1.5} pt={1.5} sx={{ borderTop: "1px solid #ffcc80" }}>
                      <SoftTypography
                        variant="caption"
                        color="error"
                        fontWeight="bold"
                        display="block"
                      >
                        Khách hàng đã chạm hoặc vượt hạn mức công nợ
                      </SoftTypography>
                    </SoftBox>
                  )}
                </SoftBox>
              )}
              <SectionTitle
                step="2"
                title="Nguồn hàng"
                subtitle="Chọn kho chính hoặc xe đang đi thị trường"
              />
              <SoftBox
                p={{ xs: isAdmin ? 2 : 1.5, md: 2 }}
                border="1px solid #E5E7EB"
                borderRadius={2}
              >
                <SoftTypography variant="button" fontWeight="bold">
                  Nguồn xuất hàng
                </SoftTypography>
                {!isAdmin ? (
                  <SoftBox
                    ref={sourceCardsRef}
                    display="flex"
                    gap={1.25}
                    mt={1.25}
                    pb={0.5}
                    sx={{
                      overflowX: "auto",
                      scrollSnapType: "x mandatory",
                      WebkitOverflowScrolling: "touch",
                      scrollbarWidth: "none",
                      "&::-webkit-scrollbar": { display: "none" },
                    }}
                  >
                    {sourceCardOptions.map((source) => {
                      const selected =
                        source.sourceType === "warehouse"
                          ? form.sourceType === "warehouse"
                          : form.sourceType === "truck" && getId(truck) === source.id;
                      return (
                        <SoftBox
                          key={`${source.sourceType}-${source.id}`}
                          component="button"
                          type="button"
                          onClick={() => {
                            sourceAutoSelectedRef.current = true;
                            setForm((current) => ({
                              ...current,
                              sourceType: source.sourceType,
                            }));
                            setTruck(source.sourceType === "truck" ? source : null);
                            setItems([{ product: null, qty: 1, search: "" }]);
                            setGifts([]);
                          }}
                          p={1.5}
                          textAlign="left"
                          sx={{
                            minWidth: 190,
                            maxWidth: 220,
                            scrollSnapAlign: "start",
                            border: selected ? "2px solid #2e7d32" : "1px solid #dfe3e8",
                            borderRadius: 2,
                            background: selected ? "#ecfdf3" : "#fff",
                            boxShadow: selected
                              ? "0 4px 14px rgba(46,125,50,.16)"
                              : "0 2px 7px rgba(0,0,0,.05)",
                            cursor: "pointer",
                            position: "relative",
                          }}
                        >
                          {selected && (
                            <Icon
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                color: "#2e7d32",
                                fontSize: 20,
                              }}
                            >
                              check_circle
                            </Icon>
                          )}
                          <SoftBox
                            width={38}
                            height={38}
                            borderRadius={1.5}
                            bgcolor={selected ? "#2e7d32" : "#eef2f6"}
                            color={selected ? "#fff" : "#52606d"}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            mb={1}
                          >
                            <Icon>{source.icon}</Icon>
                          </SoftBox>
                          <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                            {source.name || "Xe tải"}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block" noWrap>
                            {source.subtitle || "Chưa có thông tin tài xế"}
                          </SoftTypography>
                          {source.sourceType === "truck" && (
                            <SoftTypography
                              variant="caption"
                              fontWeight="bold"
                              color={selected ? "success" : "text"}
                              display="block"
                              mt={0.5}
                            >
                              Giá trị hàng:{" "}
                              {money(
                                source.inventorySummary?.totalValue ??
                                  source.totalValue ??
                                  source.inventoryValue ??
                                  source.totalInventoryValue ??
                                  0
                              )}
                            </SoftTypography>
                          )}
                        </SoftBox>
                      );
                    })}
                    {trucksLoading && (
                      <SoftBox minWidth={190} p={2} border="1px solid #dfe3e8" borderRadius={2}>
                        <SoftTypography variant="caption" color="text">
                          Đang tải danh sách xe...
                        </SoftTypography>
                      </SoftBox>
                    )}
                  </SoftBox>
                ) : (
                  <>
                    <RadioGroup
                      row
                      value={form.sourceType}
                      onChange={(e) => {
                        set("sourceType", e.target.value);
                        setTruck(null);
                        setItems([{ product: null, qty: 1, search: "" }]);
                      }}
                      sx={{ gap: 1, mt: 1 }}
                    >
                      <FormControlLabel value="warehouse" control={<Radio />} label="Kho chính" />
                      <FormControlLabel value="truck" control={<Radio />} label="Xe tải" />
                    </RadioGroup>
                    {form.sourceType === "truck" && (
                      <SearchSelect
                        value={truck}
                        onChange={(selected) => {
                          setTruck(selected);
                          setItems([{ product: null, qty: 1, search: "" }]);
                        }}
                        options={trucks}
                        loading={trucksLoading}
                        inputValue={truckSearch}
                        onInputChange={setTruckSearch}
                        placeholder="Tìm tên xe, biển số hoặc tài xế..."
                        label={(item) =>
                          `${item.name || "Xe tải"} · ${item.licensePlate || "Chưa có biển số"}`
                        }
                      />
                    )}
                  </>
                )}
              </SoftBox>
              <SectionTitle
                step="3"
                title="HÀNG HÓA"
                subtitle="Các sản phẩm chính đang bán trong hóa đơn"
                accent
              />
              {items.map((item, index) => (
                <SoftBox
                  key={index}
                  display="flex"
                  flexDirection={{ xs: "column", sm: "row" }}
                  gap={1}
                  alignItems={{ xs: "stretch", sm: "center" }}
                  mb={1.5}
                  p={{ xs: 1.5, sm: isAdmin ? 0 : 1.5 }}
                  sx={{
                    border: isAdmin
                      ? { xs: "1px solid #eee", sm: "none" }
                      : item.product
                      ? "2px solid #1976d2"
                      : "2px dashed #b7c8dc",
                    borderRadius: 2,
                    bgcolor: !isAdmin && item.product ? "#f4f9ff" : "#fff",
                    boxShadow:
                      !isAdmin && item.product ? "0 5px 16px rgba(25,118,210,.12)" : "none",
                  }}
                >
                  <SoftBox sx={{ flex: 3 }}>
                    {!isAdmin && (
                      <SoftBox display="flex" alignItems="center" gap={1} mb={1}>
                        <SoftBox
                          width={36}
                          height={36}
                          borderRadius={1.5}
                          bgcolor={item.product ? "#1976d2" : "#e9eff5"}
                          color={item.product ? "#fff" : "#607d8b"}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon>shopping_cart</Icon>
                        </SoftBox>
                        <SoftBox flex={1}>
                          <SoftTypography
                            variant="button"
                            fontWeight="bold"
                            color={item.product ? "info" : "text"}
                            display="block"
                          >
                            Sản phẩm bán #{index + 1}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            {item.product ? "Đã chọn vào hóa đơn" : "Chưa chọn hàng hóa"}
                          </SoftTypography>
                        </SoftBox>
                        {item.product && <Icon color="info">check_circle</Icon>}
                      </SoftBox>
                    )}
                    <SearchSelect
                      value={item.product}
                      onChange={(product) =>
                        updateItem(index, {
                          product,
                          customPriceEnabled: false,
                          customPrice: 0,
                        })
                      }
                      options={productOptions}
                      loading={productsLoading}
                      inputValue={item.search || ""}
                      onInputChange={(search) => {
                        updateItem(index, { search });
                        setProductSearch(search);
                      }}
                      onOpen={() => {
                        // Mỗi dòng hàng dùng chung request autocomplete. Xóa từ khóa
                        // của dòng trước để luôn tải gợi ý mặc định từ đúng nguồn.
                        setProductSearch("");
                        setProductsLoading(true);
                        setProductOptionsRefresh((value) => value + 1);
                      }}
                      placeholder="Tìm mã, tên hoặc barcode..."
                      label={(product) =>
                        `${product.name || "Sản phẩm"} · Tồn ${numberText(stockOf(product))} ${
                          product.unit || ""
                        }`
                      }
                      dismissKeyboardOnSelect
                    />
                    {item.product && (
                      <SoftBox
                        mt={0.75}
                        px={1.25}
                        py={0.9}
                        borderRadius={1.5}
                        bgcolor={
                          stockOf(item.product) - selectedQuantityFor(item.product) < 0
                            ? "#ffebee"
                            : "#e7f3ff"
                        }
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={1}
                      >
                        <SoftTypography variant="caption" color="text">
                          Tồn {numberText(stockOf(item.product))} {item.product.unit || ""} · tổng
                          đã chọn {numberText(selectedQuantityFor(item.product))}
                        </SoftTypography>
                        <SoftTypography
                          variant="button"
                          fontWeight="bold"
                          color={
                            stockOf(item.product) - selectedQuantityFor(item.product) < 0
                              ? "error"
                              : "info"
                          }
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          Còn lại {numberText(remainingStockFor(item.product))}{" "}
                          {item.product.unit || ""}
                        </SoftTypography>
                      </SoftBox>
                    )}
                    {item.product && (
                      <SoftBox mt={1} display="flex" justifyContent="flex-end">
                        <FormControlLabel
                          label="Nhập giá khác"
                          labelPlacement="start"
                          sx={{
                            m: 0,
                            gap: 0.5,
                            "& .MuiFormControlLabel-label": {
                              fontSize: 12,
                              fontWeight: 700,
                              color: item.customPriceEnabled ? "#7b1fa2" : "#667085",
                            },
                          }}
                          control={
                            <Radio
                              size="small"
                              checked={Boolean(item.customPriceEnabled)}
                              onClick={() =>
                                updateItem(index, {
                                  customPriceEnabled: !item.customPriceEnabled,
                                  customPrice: !item.customPriceEnabled
                                    ? unitPriceFor(item.product)
                                    : 0,
                                })
                              }
                            />
                          }
                        />
                      </SoftBox>
                    )}
                    {item.product && item.customPriceEnabled && (
                      <SoftBox
                        mt={0.75}
                        p={1.25}
                        borderRadius={1.5}
                        bgcolor="#faf5ff"
                        sx={{ border: "1px solid #ce93d8" }}
                      >
                        <SoftTypography
                          variant="caption"
                          fontWeight="bold"
                          sx={{ color: "#7b1fa2" }}
                          display="block"
                          mb={0.5}
                        >
                          Giá bán riêng trong hóa đơn này
                        </SoftTypography>
                        <SoftInput
                          value={numberText(item.customPrice)}
                          onChange={(event) =>
                            updateItem(index, {
                              customPrice: moneyValue(event.target.value),
                            })
                          }
                          inputProps={{ inputMode: "numeric" }}
                        />
                        <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
                          Giá niêm yết: {money(unitPriceFor(item.product))}
                        </SoftTypography>
                      </SoftBox>
                    )}
                  </SoftBox>
                  <SoftBox sx={{ width: { xs: "100%", sm: isAdmin ? 190 : 150 }, flexShrink: 0 }}>
                    <SoftBox display="flex" alignItems="center" gap={1}>
                      <SoftTypography
                        variant="caption"
                        sx={{ display: { xs: "block", sm: "none" }, minWidth: 65 }}
                      >
                        Số lượng
                      </SoftTypography>
                      {!isAdmin && (
                        <IconButton
                          onClick={() =>
                            updateItem(index, { qty: Math.max(1, Number(item.qty || 1) - 1) })
                          }
                          sx={{ border: "1px solid #dbe1e8", flexShrink: 0 }}
                        >
                          <Icon>remove</Icon>
                        </IconButton>
                      )}
                      <SoftBox sx={{ width: { xs: isAdmin ? "100%" : 74, sm: 72 } }}>
                        <SoftInput
                          type="number"
                          inputProps={{
                            min: 1,
                            step: 1,
                            style: { textAlign: "center", fontWeight: 700 },
                          }}
                          value={item.qty}
                          onChange={(e) => updateItem(index, { qty: e.target.value })}
                        />
                      </SoftBox>
                      {!isAdmin && (
                        <IconButton
                          disabled={!item.product || remainingStockFor(item.product) <= 0}
                          onClick={() => updateItem(index, { qty: Number(item.qty || 0) + 1 })}
                          sx={{ border: "1px solid #dbe1e8", flexShrink: 0 }}
                        >
                          <Icon>add</Icon>
                        </IconButton>
                      )}
                      <IconButton
                        disabled={items.length === 1}
                        onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                      >
                        <Icon color="error">remove_circle</Icon>
                      </IconButton>
                    </SoftBox>
                    {item.product && (
                      <SoftBox
                        mt={0.75}
                        pt={0.75}
                        textAlign={{ xs: "right", sm: "center" }}
                        sx={{ borderTop: "1px dashed #cbd5e1" }}
                      >
                        <SoftTypography
                          variant="caption"
                          fontWeight="bold"
                          color="info"
                          sx={{ whiteSpace: "nowrap" }}
                        >
                          {money(effectiveUnitPriceFor(item))} × {numberText(item.qty)} ={" "}
                          {money(effectiveUnitPriceFor(item) * Number(item.qty || 0))}
                        </SoftTypography>
                      </SoftBox>
                    )}
                  </SoftBox>
                </SoftBox>
              ))}
              <SoftButton
                variant="outlined"
                color="info"
                startIcon={<Icon>add</Icon>}
                fullWidth={!isAdmin}
                sx={{
                  mt: 0.5,
                  border: "2px dashed #1976d2",
                  bgcolor: "#f4f9ff",
                  fontWeight: 700,
                  "&:hover": { border: "2px solid #1976d2", bgcolor: "#e7f3ff" },
                }}
                onClick={() =>
                  setItems((current) => [...current, { product: null, qty: 1, search: "" }])
                }
              >
                Thêm sản phẩm
              </SoftButton>
              <SoftBox mt={2} p={2} border="1px solid #BBDEFB" borderRadius={2} bgcolor="#F7FBFF">
                <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                  <SoftBox>
                    <SoftTypography variant="button" fontWeight="bold" color="info">
                      Quà tặng kèm đơn
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text" display="block">
                      Chọn hàng có sẵn từ cùng nguồn xuất; quà có giá bán bằng 0 và vẫn trừ tồn.
                    </SoftTypography>
                  </SoftBox>
                  <SoftButton
                    size="small"
                    variant="outlined"
                    color="info"
                    startIcon={<Icon>card_giftcard</Icon>}
                    onClick={() =>
                      setGifts((current) => [...current, { product: null, qty: 1, search: "" }])
                    }
                  >
                    Thêm quà
                  </SoftButton>
                </SoftBox>
                {gifts.map((gift, index) => (
                  <SoftBox
                    key={index}
                    display="flex"
                    flexDirection={{ xs: "column", sm: "row" }}
                    gap={1}
                    mt={1.5}
                    p={1.5}
                    bgcolor={gift.product ? "#edf7ff" : "#fff"}
                    border={gift.product ? "2px solid #2196f3" : "2px dashed #90caf9"}
                    borderRadius={2}
                    sx={{
                      boxShadow: gift.product ? "0 5px 16px rgba(33,150,243,.12)" : "none",
                    }}
                  >
                    <SoftBox flex={1} minWidth={0}>
                      <SoftBox display="flex" alignItems="center" gap={1} mb={1}>
                        <SoftBox
                          width={36}
                          height={36}
                          borderRadius={1.5}
                          bgcolor={gift.product ? "#2196f3" : "#e3f2fd"}
                          color={gift.product ? "#fff" : "#1976d2"}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Icon>card_giftcard</Icon>
                        </SoftBox>
                        <SoftBox flex={1}>
                          <SoftTypography
                            variant="button"
                            fontWeight="bold"
                            color="info"
                            display="block"
                          >
                            Quà tặng #{index + 1}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            {gift.product ? "Đã chọn quà kèm đơn" : "Chưa chọn sản phẩm quà"}
                          </SoftTypography>
                        </SoftBox>
                        {gift.product && <Icon color="info">check_circle</Icon>}
                      </SoftBox>
                      <SearchSelect
                        value={gift.product}
                        onChange={(product) =>
                          setGifts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, product } : item
                            )
                          )
                        }
                        options={giftOptions}
                        loading={giftOptionsLoading}
                        inputValue={gift.search || ""}
                        onInputChange={(search) => {
                          setGifts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, search } : item
                            )
                          );
                          setGiftSearch(search);
                        }}
                        onOpen={() => {
                          setGiftSearch("");
                          setGiftOptionsLoading(true);
                          setGiftOptionsRefresh((value) => value + 1);
                        }}
                        placeholder="Tìm sản phẩm làm quà..."
                        label={(product) =>
                          `${product.name || "Sản phẩm"} · Tồn ${numberText(stockOf(product))} ${
                            product.unit || ""
                          }`
                        }
                        dismissKeyboardOnSelect
                      />
                      {gift.product && (
                        <SoftBox
                          mt={0.75}
                          px={1.25}
                          py={0.9}
                          borderRadius={1.5}
                          bgcolor={
                            stockOf(gift.product) - selectedQuantityFor(gift.product) < 0
                              ? "#ffebee"
                              : "#e3f2fd"
                          }
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          gap={1}
                        >
                          <SoftTypography variant="caption" color="text">
                            Tồn {numberText(stockOf(gift.product))} {gift.product.unit || ""} · tổng
                            đã chọn {numberText(selectedQuantityFor(gift.product))}
                          </SoftTypography>
                          <SoftTypography
                            variant="button"
                            fontWeight="bold"
                            color={
                              stockOf(gift.product) - selectedQuantityFor(gift.product) < 0
                                ? "error"
                                : "info"
                            }
                            sx={{ whiteSpace: "nowrap" }}
                          >
                            Còn lại {numberText(remainingStockFor(gift.product))}{" "}
                            {gift.product.unit || ""}
                          </SoftTypography>
                        </SoftBox>
                      )}
                    </SoftBox>
                    <SoftBox
                      display="flex"
                      gap={1}
                      alignItems="center"
                      justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                      sx={{
                        width: { xs: "100%", sm: isAdmin ? 300 : 230 },
                        minWidth: { sm: isAdmin ? 300 : 230 },
                        flexShrink: 0,
                      }}
                    >
                      <SoftTypography
                        variant="caption"
                        fontWeight={isAdmin ? "bold" : "regular"}
                        sx={{
                          display: { xs: "block", sm: isAdmin ? "block" : "none" },
                          minWidth: isAdmin ? 52 : 65,
                        }}
                      >
                        Số lượng
                      </SoftTypography>
                      <IconButton
                        onClick={() =>
                          setGifts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, qty: Math.max(1, Number(item.qty || 1) - 1) }
                                : item
                            )
                          )
                        }
                        sx={{ border: "1px solid #90caf9", flexShrink: 0 }}
                      >
                        <Icon>remove</Icon>
                      </IconButton>
                      <SoftBox width={72} minWidth={72} flexShrink={0}>
                        <SoftInput
                          type="number"
                          value={gift.qty}
                          inputProps={{
                            min: 1,
                            step: 1,
                            style: { textAlign: "center", fontWeight: 700 },
                          }}
                          onChange={(event) =>
                            setGifts((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, qty: event.target.value } : item
                              )
                            )
                          }
                        />
                      </SoftBox>
                      <IconButton
                        disabled={!gift.product || remainingStockFor(gift.product) <= 0}
                        onClick={() =>
                          setGifts((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, qty: Number(item.qty || 0) + 1 }
                                : item
                            )
                          )
                        }
                        sx={{ border: "1px solid #90caf9", flexShrink: 0 }}
                      >
                        <Icon>add</Icon>
                      </IconButton>
                      <IconButton
                        onClick={() =>
                          setGifts((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                      >
                        <Icon color="error">delete</Icon>
                      </IconButton>
                    </SoftBox>
                  </SoftBox>
                ))}
              </SoftBox>
              {false &&
                (giftPromotions.eligiblePromotions.length > 0 ||
                  giftPromotions.nearlyEligiblePromotions.length > 0) && (
                  <SoftBox mt={2} p={2} border="1px solid #D1E7DD" borderRadius={2}>
                    <SoftTypography variant="button" fontWeight="bold" color="success">
                      Chương trình quà tặng
                    </SoftTypography>
                    {giftPromotions.eligiblePromotions.map((promotion) => (
                      <SoftBox
                        key={promotion.promotionId}
                        mt={1}
                        p={1.5}
                        bgcolor={
                          selectedGiftPromotion?.promotionId === promotion.promotionId
                            ? "#E8F5E9"
                            : "#F8F9FA"
                        }
                        borderRadius={2}
                      >
                        <FormControlLabel
                          control={
                            <Radio
                              checked={selectedGiftPromotion?.promotionId === promotion.promotionId}
                              onChange={() => chooseGiftPromotion(promotion)}
                            />
                          }
                          label={`${promotion.code} · ${promotion.name} · áp dụng ${promotion.applicationCount} lần`}
                        />
                        {selectedGiftPromotion?.promotionId === promotion.promotionId && (
                          <SoftBox pl={1}>
                            {promotion.giftGroups.map((group) => (
                              <SoftBox key={group.groupCode} mt={1}>
                                <SoftTypography variant="caption" fontWeight="bold" display="block">
                                  {group.name || group.groupCode} — cần {group.requiredQuantity} sản
                                  phẩm{" "}
                                  {group.selectionMode === "ALL" ? "(tự động nhận tất cả)" : ""}
                                </SoftTypography>
                                {group.selectionMode !== "ALL" && (
                                  <Grid container spacing={1} mt={0}>
                                    {group.options.map((option) => (
                                      <Grid item xs={12} sm={6} key={option.productId}>
                                        <SoftBox
                                          display="flex"
                                          alignItems="center"
                                          justifyContent="space-between"
                                          gap={1}
                                          p={1}
                                          border="1px solid #E5E7EB"
                                          borderRadius={1}
                                        >
                                          <SoftTypography variant="caption">
                                            {option.code} · {option.name}
                                            <br />
                                            Còn {option.availableStock}
                                          </SoftTypography>
                                          <SoftBox sx={{ width: 80 }}>
                                            <SoftInput
                                              type="number"
                                              inputProps={{ min: 0, max: group.requiredQuantity }}
                                              value={
                                                giftSelections[group.groupCode]?.[
                                                  option.productId
                                                ] || 0
                                              }
                                              onChange={(event) =>
                                                changeGiftQty(
                                                  group.groupCode,
                                                  option.productId,
                                                  event.target.value
                                                )
                                              }
                                            />
                                          </SoftBox>
                                        </SoftBox>
                                      </Grid>
                                    ))}
                                  </Grid>
                                )}
                              </SoftBox>
                            ))}
                            <SoftButton
                              variant="outlined"
                              color="success"
                              size="small"
                              sx={{ mt: 2 }}
                              onClick={applyGift}
                            >
                              {appliedGiftPromotion ? "Đã xác nhận quà" : "Xác nhận quà tặng"}
                            </SoftButton>
                            {appliedGiftPromotion && (
                              <SoftBox mt={1}>
                                {(appliedGiftPromotion.gifts || []).map((gift, index) => (
                                  <SoftTypography
                                    key={`${gift.productId}-${index}`}
                                    variant="caption"
                                    display="block"
                                    color="success"
                                  >
                                    🎁 {gift.productName}: {gift.qty} {gift.unit}
                                  </SoftTypography>
                                ))}
                              </SoftBox>
                            )}
                          </SoftBox>
                        )}
                      </SoftBox>
                    ))}
                    {giftPromotions.nearlyEligiblePromotions.slice(0, 3).map((promotion) => (
                      <SoftTypography
                        key={promotion.promotionId}
                        variant="caption"
                        color="warning"
                        display="block"
                        mt={1}
                      >
                        Gợi ý: {promotion.name} — {promotion.message}
                      </SoftTypography>
                    ))}
                  </SoftBox>
                )}
            </SoftBox>
            <SoftBox
              minWidth={0}
              sx={
                isAdmin
                  ? {
                      position: { md: "sticky" },
                      top: { md: 0 },
                      p: { md: 2 },
                      bgcolor: { md: "#f8fafc" },
                      border: { md: "1px solid #e2e8f0" },
                      borderRadius: { md: 2.5 },
                      boxShadow: { md: "0 8px 24px rgba(15, 23, 42, 0.06)" },
                    }
                  : undefined
              }
            >
              <SectionTitle
                step="4"
                title="Thanh toán và ưu đãi"
                subtitle="Chọn cách thanh toán, voucher và kiểm tra tổng tiền"
              />
              <SoftBox
                display="none"
                mt={2}
                p={2}
                sx={{ border: "1px solid #e5e7eb", borderRadius: 2 }}
              >
                <SoftTypography variant="button" fontWeight="bold">
                  Hình thức ghi nhận hóa đơn
                </SoftTypography>
                <SoftTypography variant="caption" color="text" display="block">
                  Hệ thống tự chọn theo số tiền khách thực tế thanh toán.
                </SoftTypography>
                <SoftBox
                  display={{ xs: "flex", md: "grid" }}
                  gap={1.25}
                  mt={1.25}
                  sx={{
                    gridTemplateColumns: {
                      md: isAdmin ? "1fr" : "repeat(3, minmax(0, 1fr))",
                    },
                    overflowX: { xs: "auto", md: "visible" },
                    scrollSnapType: { xs: "x mandatory", md: "none" },
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                  }}
                >
                  {[
                    {
                      value: "PAY_NOW",
                      label: "Thanh toán hóa đơn",
                      subtitle: "Thanh toán đủ hoặc một phần; phần chưa trả sẽ cộng vào công nợ",
                      icon: "payments",
                      color: "#2e7d32",
                      background: "#ecfdf3",
                    },
                    {
                      value: "PAY_WITH_DEBT",
                      label: "Thanh toán hóa đơn và trừ nợ cũ",
                      subtitle: customer
                        ? `Công nợ cũ: ${money(currentDebt)}`
                        : "Chọn khách hàng có công nợ để sử dụng",
                      icon: "account_balance_wallet",
                      color: "#00897b",
                      background: "#e0f2f1",
                      disabled: !customer || currentDebt <= 0,
                    },
                    {
                      value: "DEBT",
                      label: "Ghi nợ toàn bộ",
                      subtitle: hasCustomerProfile
                        ? "Cộng toàn bộ giá trị hóa đơn vào công nợ"
                        : "Chọn hoặc tạo hồ sơ khách hàng để ghi nợ",
                      icon: "pending_actions",
                      color: "#ed6c02",
                      background: "#fff7ed",
                      disabled: !hasCustomerProfile,
                    },
                    {
                      value: "DEBT_PAYMENT",
                      label: "Thanh toán công nợ",
                      subtitle: customer
                        ? `Chỉ lập phiếu thu, không xuất hàng · Nợ hiện tại ${money(currentDebt)}`
                        : "Chọn khách hàng đã có hồ sơ để thu công nợ",
                      icon: "price_check",
                      color: "#1565c0",
                      background: "#e3f2fd",
                      disabled: !customer || currentDebt <= 0,
                    },
                  ].map((option) => {
                    const selected = form.paymentMode === option.value;
                    return (
                      <SoftBox
                        key={option.value}
                        component="button"
                        type="button"
                        disabled={option.disabled}
                        p={1.5}
                        textAlign="left"
                        aria-current={selected ? "true" : undefined}
                        sx={{
                          minWidth: { xs: 225, md: 0 },
                          minHeight: 126,
                          scrollSnapAlign: "start",
                          border: selected ? `2px solid ${option.color}` : "1px solid #dfe3e8",
                          borderRadius: 2,
                          background: selected ? option.background : "#fff",
                          boxShadow: selected
                            ? `0 5px 16px ${option.color}29`
                            : "0 2px 7px rgba(0,0,0,.05)",
                          cursor: "default",
                          opacity: option.disabled ? 0.5 : 1,
                          position: "relative",
                          transition:
                            "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
                          "&:focus-visible": {
                            outline: `3px solid ${option.color}45`,
                            outlineOffset: 2,
                          },
                        }}
                      >
                        {selected && (
                          <Icon
                            sx={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              color: option.color,
                              fontSize: 22,
                            }}
                          >
                            check_circle
                          </Icon>
                        )}
                        <SoftBox
                          width={40}
                          height={40}
                          borderRadius={1.5}
                          bgcolor={selected ? option.color : "#eef2f6"}
                          color={selected ? "#fff" : "#52606d"}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          mb={1}
                        >
                          <Icon>{option.icon}</Icon>
                        </SoftBox>
                        <SoftTypography
                          variant="button"
                          fontWeight="bold"
                          display="block"
                          pr={selected ? 2.5 : 0}
                          sx={{ color: selected ? option.color : "#253858", lineHeight: 1.25 }}
                        >
                          {option.label}
                        </SoftTypography>
                        <SoftTypography
                          variant="caption"
                          color="text"
                          display="block"
                          mt={0.5}
                          sx={{ lineHeight: 1.3 }}
                        >
                          {option.subtitle}
                        </SoftTypography>
                      </SoftBox>
                    );
                  })}
                </SoftBox>
                {form.paymentMode === "DEBT" && (
                  <SoftTypography variant="caption" color="error">
                    Hóa đơn sẽ ở trạng thái Chưa thanh toán và toàn bộ thành tiền được cộng vào công
                    nợ khách hàng.
                  </SoftTypography>
                )}
                {form.paymentMode === "PAY_WITH_DEBT" && (
                  <SoftTypography
                    variant="caption"
                    fontWeight="bold"
                    display="block"
                    mt={1}
                    sx={{ color: "#00695c" }}
                  >
                    Tiền thanh toán sẽ trả hóa đơn hiện tại trước; phần còn lại tự động trừ vào công
                    nợ cũ.
                  </SoftTypography>
                )}
                {form.paymentMode === "DEBT_PAYMENT" && (
                  <SoftTypography
                    variant="caption"
                    fontWeight="bold"
                    display="block"
                    mt={1}
                    sx={{ color: "#1565c0" }}
                  >
                    Không có hàng hóa: hệ thống sẽ lập phiếu thu và tự phân bổ vào công nợ cũ theo
                    FIFO.
                  </SoftTypography>
                )}
              </SoftBox>
              <Grid container spacing={2} mt={1}>
                <Field label="Mã khuyến mãi" md={isAdmin ? 12 : 8}>
                  <SoftBox display="flex" gap={1} flexWrap={isAdmin ? "wrap" : "nowrap"}>
                    <SoftBox
                      flex={isAdmin ? 1 : undefined}
                      width={isAdmin ? undefined : "100%"}
                      minWidth={isAdmin ? 170 : 0}
                    >
                      <SoftInput
                        value={form.voucherCode}
                        onChange={(e) => set("voucherCode", e.target.value.toUpperCase())}
                        placeholder="Nhập mã voucher"
                      />
                    </SoftBox>
                    <SoftButton variant="outlined" color="info" onClick={applyVoucher}>
                      {appliedVoucher ? "Kiểm tra lại" : "Áp dụng"}
                    </SoftButton>
                    {appliedVoucher && (
                      <SoftButton
                        variant="text"
                        color="secondary"
                        onClick={() => {
                          setAppliedVoucher("");
                          set("voucherCode", "");
                        }}
                      >
                        Bỏ mã
                      </SoftButton>
                    )}
                  </SoftBox>
                </Field>
              </Grid>
              {previewError && (
                <SoftTypography variant="caption" color="error" display="block" mt={1}>
                  {previewError}
                </SoftTypography>
              )}
              <Grid container spacing={2} mt={1}>
                <Field label="Tiền mặt">
                  <SoftInput
                    value={numberText(form.cashAmount)}
                    onChange={(e) => set("cashAmount", moneyValue(e.target.value))}
                    inputProps={{ inputMode: "numeric" }}
                  />
                </Field>
                <Field label="Chuyển khoản">
                  <SoftInput
                    value={numberText(form.bankAmount)}
                    onChange={(e) => set("bankAmount", moneyValue(e.target.value))}
                    inputProps={{ inputMode: "numeric" }}
                  />
                </Field>
                {Number(form.bankAmount) > 0 && (
                  <Field label="Mã giao dịch" md={12}>
                    <SoftInput
                      value={form.referenceCode}
                      onChange={(e) => set("referenceCode", e.target.value)}
                    />
                  </Field>
                )}
              </Grid>
              {form.paymentMode === "PAY_WITH_DEBT" && (
                <SoftBox
                  mt={2}
                  p={2}
                  borderRadius={2}
                  bgcolor="#e8f5e9"
                  sx={{ border: "2px solid #81c784" }}
                >
                  <SoftBox display="flex" alignItems="center" gap={1} mb={1.25}>
                    <Icon sx={{ color: "#2e7d32", fontSize: 26 }}>account_balance_wallet</Icon>
                    <SoftBox>
                      <SoftTypography
                        variant="button"
                        fontWeight="bold"
                        display="block"
                        sx={{ color: "#1b5e20" }}
                      >
                        Thanh toán kèm công nợ cũ
                      </SoftTypography>
                      <SoftTypography variant="caption" sx={{ color: "#2e5d34" }}>
                        Có thể thu tối đa {money(grandTotal + currentDebt)}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                  <Grid container spacing={1}>
                    {[
                      ["Tiền hóa đơn", invoicePaidAmount, "#1565c0"],
                      ["Trừ nợ cũ", previousDebtPaidAmount, "#2e7d32"],
                      ["Công nợ còn lại", projectedDebt, projectedDebt > 0 ? "#c62828" : "#2e7d32"],
                    ].map(([label, value, color]) => (
                      <Grid item xs={12} sm={4} key={label}>
                        <SoftBox p={1.25} borderRadius={1.5} bgcolor="rgba(255,255,255,.8)">
                          <SoftTypography variant="caption" color="text" display="block">
                            {label}
                          </SoftTypography>
                          <SoftTypography
                            variant="button"
                            fontWeight="bold"
                            display="block"
                            sx={{ color }}
                          >
                            {money(value)}
                          </SoftTypography>
                        </SoftBox>
                      </Grid>
                    ))}
                  </Grid>
                  {paidAmount > maximumPaymentAmount && (
                    <SoftTypography
                      variant="caption"
                      color="error"
                      fontWeight="bold"
                      display="block"
                      mt={1}
                    >
                      Số tiền đang vượt quá tổng cần thu {money(paidAmount - maximumPaymentAmount)}.
                    </SoftTypography>
                  )}
                </SoftBox>
              )}
              {overLimit && (
                <SoftBox mt={2} p={2} bgcolor="#FFF3E0" borderRadius={2}>
                  <SoftTypography variant="button" color="error" fontWeight="bold" display="block">
                    {invoiceDebt > 0
                      ? `Công nợ sau hóa đơn vượt hạn mức ${money(projectedDebt - debtLimit)}`
                      : `Công nợ cũ đang vượt hạn mức ${money(projectedDebt - debtLimit)}`}
                  </SoftTypography>
                  <Grid container spacing={1} mt={0.5}>
                    {[
                      ["Công nợ cũ", currentDebt],
                      ["Công nợ hiện tại", invoiceDebt],
                      ["Công nợ sau đơn hàng", projectedDebt],
                    ].map(([label, value]) => (
                      <Grid item xs={12} sm={4} key={label}>
                        <SoftBox
                          p={1.25}
                          borderRadius={1.5}
                          bgcolor="rgba(255,255,255,0.72)"
                          height="100%"
                        >
                          <SoftTypography variant="caption" color="text" display="block">
                            {label}
                          </SoftTypography>
                          <SoftTypography
                            variant="button"
                            fontWeight="bold"
                            color={label === "Công nợ sau đơn hàng" ? "error" : "dark"}
                            display="block"
                          >
                            {money(value)}
                          </SoftTypography>
                        </SoftBox>
                      </Grid>
                    ))}
                  </Grid>
                  <SoftBox
                    component="label"
                    role="alert"
                    mt={1.5}
                    p={1.5}
                    display="flex"
                    alignItems="flex-start"
                    gap={1}
                    sx={{
                      cursor: "pointer",
                      border: `2px solid ${form.allowDebtLimitOverride ? "#2e7d32" : "#d32f2f"}`,
                      borderRadius: 2,
                      bgcolor: form.allowDebtLimitOverride ? "#e8f5e9" : "#fff1f2",
                      boxShadow: form.allowDebtLimitOverride
                        ? "0 5px 18px rgba(46,125,50,.2)"
                        : "0 5px 16px rgba(211,47,47,.16)",
                      transition: "all .2s ease",
                      "&:hover": {
                        bgcolor: form.allowDebtLimitOverride ? "#dcfce7" : "#ffe4e6",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Checkbox
                      checked={form.allowDebtLimitOverride}
                      onChange={(e) => setDebtLimitOverride(e.target.checked)}
                      color="success"
                      sx={{
                        width: 44,
                        height: 44,
                        p: 0,
                        mt: -0.5,
                        flexShrink: 0,
                        color: "#c62828",
                        bgcolor: "#fff",
                        border: `2px solid ${form.allowDebtLimitOverride ? "#2e7d32" : "#ef9a9a"}`,
                        borderRadius: 1.25,
                        "&:hover": {
                          bgcolor: form.allowDebtLimitOverride ? "#c8e6c9" : "#ffebee",
                        },
                        "&.Mui-checked": {
                          color: "#2e7d32",
                          bgcolor: "#c8e6c9",
                        },
                        "& .MuiSvgIcon-root": { fontSize: 34 },
                      }}
                    />
                    <SoftBox flex={1} minWidth={0}>
                      <SoftBox display="flex" alignItems="center" gap={0.75}>
                        <Icon
                          sx={{
                            color: form.allowDebtLimitOverride ? "#2e7d32" : "#d32f2f",
                            fontSize: 26,
                          }}
                        >
                          {form.allowDebtLimitOverride ? "check_circle" : "warning_amber"}
                        </Icon>
                        <SoftTypography
                          variant="button"
                          fontWeight="bold"
                          sx={{
                            color: form.allowDebtLimitOverride ? "#1b5e20" : "#b71c1c",
                            fontSize: { xs: 14, md: 15 },
                            lineHeight: 1.25,
                          }}
                        >
                          {invoiceDebt > 0
                            ? "Vẫn cho khách mua và cộng phần chưa thanh toán vào công nợ"
                            : "Vẫn cho khách mua dù công nợ cũ đang vượt hạn mức"}
                        </SoftTypography>
                      </SoftBox>
                      <SoftTypography
                        variant="caption"
                        display="block"
                        mt={0.5}
                        sx={{
                          color: form.allowDebtLimitOverride ? "#2e5d34" : "#7f1d1d",
                          lineHeight: 1.35,
                        }}
                      >
                        Việc xác nhận này không thay đổi hình thức thanh toán đã chọn. Bắt buộc nhập
                        lý do để lưu lịch sử truy xuất.
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                  {form.allowDebtLimitOverride && (
                    <SoftBox mt={1}>
                      <SoftInput
                        value={form.debtOverrideReason}
                        onChange={(e) => set("debtOverrideReason", e.target.value)}
                        placeholder="Lý do cho mua vượt hạn mức *"
                      />
                      <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
                        Lý do được lưu cùng hóa đơn và lịch sử công nợ để truy xuất.
                      </SoftTypography>
                    </SoftBox>
                  )}
                </SoftBox>
              )}
              <SoftBox
                mt={2}
                sx={{
                  border: "1px solid #c7cdd4",
                  borderRadius: 1.5,
                  overflow: "hidden",
                  bgcolor: "#fff",
                }}
              >
                {[
                  ["Tạm tính", "", subtotal],
                  ["VAT", "", vatAmount],
                  ["Chiết khấu", "", discountAmount],
                  ["Tổng cộng (1)", totalQuantity, grandTotal],
                  ["Nợ cũ (2)", "", currentDebt],
                  ["Số tiền thanh toán (3)", "", paidAmount],
                  ["Còn nợ (1 + 2 - 3)", "", projectedDebt],
                ].map(([label, quantity, value], index) => {
                  const important = index >= 3;
                  const finalDebt = index === 6;
                  return (
                    <SoftBox
                      key={label}
                      display="grid"
                      sx={{
                        gridTemplateColumns: {
                          xs: isAdmin ? "minmax(0, 1fr) 56px 116px" : "minmax(0, 1fr) 62px 132px",
                          sm: isAdmin ? "minmax(0, 1fr) 60px 132px" : "minmax(0, 1fr) 100px 190px",
                        },
                        borderBottom: index < 6 ? "1px solid #c7cdd4" : 0,
                        bgcolor: finalDebt ? "#fff7ed" : "#fff",
                      }}
                    >
                      <SoftTypography
                        variant="button"
                        fontWeight={important ? "bold" : "regular"}
                        px={1.5}
                        py={0.65}
                      >
                        {label}
                      </SoftTypography>
                      <SoftTypography
                        variant="button"
                        fontWeight={important ? "bold" : "regular"}
                        textAlign="center"
                        px={1}
                        py={0.65}
                        sx={{ borderLeft: "1px solid #c7cdd4" }}
                      >
                        {quantity === "" ? "" : numberText(quantity)}
                      </SoftTypography>
                      <SoftTypography
                        variant="button"
                        fontWeight={important ? "bold" : "regular"}
                        color={finalDebt && projectedDebt > 0 ? "error" : "dark"}
                        textAlign="right"
                        px={1.5}
                        py={0.65}
                        sx={{ borderLeft: "1px solid #c7cdd4" }}
                      >
                        {money(value)}
                      </SoftTypography>
                    </SoftBox>
                  );
                })}
              </SoftBox>
              <SoftBox mt={2.25}>
                <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.75}>
                  Hình thức ghi nhận hóa đơn
                </SoftTypography>
                <SoftBox
                  p={1.5}
                  borderRadius={2}
                  display="flex"
                  alignItems="center"
                  gap={1.25}
                  bgcolor={paymentModePresentation.background}
                  sx={{ border: `2px solid ${paymentModePresentation.color}55` }}
                >
                  <SoftBox
                    width={42}
                    height={42}
                    borderRadius={1.5}
                    bgcolor={paymentModePresentation.color}
                    color="#fff"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Icon>{paymentModePresentation.icon}</Icon>
                  </SoftBox>
                  <SoftBox flex={1} minWidth={0}>
                    <SoftBox display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
                      <SoftTypography
                        variant="button"
                        fontWeight="bold"
                        sx={{ color: paymentModePresentation.color }}
                      >
                        {paymentModePresentation.label}
                      </SoftTypography>
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        sx={{
                          px: 0.75,
                          py: 0.2,
                          borderRadius: 4,
                          bgcolor: "#fff",
                          color: "#607d8b",
                        }}
                      >
                        Tự động
                      </SoftTypography>
                    </SoftBox>
                    <SoftTypography variant="caption" color="text" display="block" mt={0.25}>
                      {paymentModePresentation.description}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              </SoftBox>
              <SoftBox mt={1.5}>
                <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.75}>
                  Ghi chú hóa đơn
                </SoftTypography>
                <SoftInput
                  value={form.note}
                  onChange={(e) => set("note", e.target.value)}
                  placeholder="Nhập ghi chú cho hóa đơn (nếu có)..."
                  multiline
                  rows={3}
                  fullWidth
                />
              </SoftBox>
              <SoftBox
                display="flex"
                gap={1.5}
                mt={3}
                position={{ xs: "sticky", md: "static" }}
                bottom={0}
                zIndex={5}
                bgcolor="background.paper"
                mx={{ xs: -2, md: 0 }}
                px={{ xs: 2, md: 0 }}
                py={{ xs: 1.25, md: 0 }}
                sx={{
                  borderTop: { xs: "1px solid #e5e7eb", md: "none" },
                  boxShadow: { xs: "0 -4px 16px rgba(0,0,0,.08)", md: "none" },
                }}
              >
                <SoftButton
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={onClose}
                  sx={{ display: { xs: "none", sm: "inline-flex" } }}
                >
                  Hủy
                </SoftButton>
                <SoftBox sx={{ display: { xs: "block", sm: "none" }, minWidth: 112 }}>
                  <SoftTypography variant="caption" color="text" display="block">
                    Tổng đơn
                  </SoftTypography>
                  <SoftTypography
                    variant="button"
                    fontWeight="bold"
                    color={invoiceDebt > 0 ? "error" : "success"}
                  >
                    {money(grandTotal)}
                  </SoftTypography>
                </SoftBox>
                <SoftButton
                  variant="gradient"
                  color="info"
                  fullWidth
                  disabled={submitting}
                  startIcon={<Icon>fact_check</Icon>}
                  onClick={openReview}
                >
                  Xem lại hóa đơn
                </SoftButton>
              </SoftBox>
            </SoftBox>
          </SoftBox>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function InvoiceColgroup() {
  return (
    <colgroup>
      <col style={{ width: "6.2%" }} />
      <col style={{ width: "28.2%" }} />
      <col style={{ width: "9.2%" }} />
      <col style={{ width: "10.6%" }} />
      <col style={{ width: "13.2%" }} />
      <col style={{ width: "14.3%" }} />
      <col style={{ width: "18.3%" }} />
    </colgroup>
  );
}

function InvoicePaperView({ invoice }) {
  const customer = invoice.customerId || invoice.customerSnapshot || {};
  const customerName = customer.name || invoice.customerName || invoice.customer || "Khách lẻ";
  const customerPhones = Array.from(
    new Set(
      [
        ...(Array.isArray(customer.phones) ? customer.phones : []),
        ...(Array.isArray(invoice.customerPhones) ? invoice.customerPhones : []),
        customer.phone,
        invoice.customerPhone,
      ].filter(Boolean)
    )
  ).join(", ");
  const customerAddress = customer.address || invoice.customerAddress || "";
  const invoiceNote = String(invoice.note || invoice.invoiceNote || "").trim();
  const occurredAt = new Date(invoice.createdAt || invoice.date || Date.now());
  const subtotal = Number(invoice.subtotal ?? invoice.totalAmount ?? 0);
  const discount = Number(invoice.discountAmount || 0);
  const grandTotal = Number(invoice.grandTotal ?? invoice.totalAmount ?? 0);
  const paidAmount = Number(
    invoice.receivedAmount ?? invoice.totalReceivedAmount ?? invoice.paidAmount ?? 0
  );
  const existingDebtPaidAmount = Number(invoice.existingDebtPaidAmount || 0);
  const oldDebt = Number(
    invoice.customerDebtBefore ??
      invoice.debtPayment?.customerDebtBefore ??
      invoice.debtPaymentSnapshot?.customerDebtBefore ??
      invoice.previousDebt ??
      invoice.oldDebt ??
      existingDebtPaidAmount
  );
  const debtAfter = Math.max(
    0,
    Number(
      invoice.customerDebtAfter ??
        invoice.debtPayment?.customerDebtAfter ??
        invoice.debtPaymentSnapshot?.customerDebtAfter ??
        invoice.totalCustomerDebtAfter ??
        oldDebt + grandTotal - paidAmount
    )
  );
  const totalQuantity = (invoice.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  return (
    <SoftBox
      maxWidth={1080}
      mx="auto"
      bgcolor="#fff"
      p={{ xs: 1.5, sm: 3, md: 4 }}
      sx={{
        color: "#000",
        fontFamily: '"Times New Roman", Times, serif',
        boxShadow: "0 2px 12px rgba(0,0,0,.12)",
        minHeight: { xs: "auto", sm: 1450 },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SoftBox
        display="grid"
        sx={{
          gridTemplateColumns: { xs: "88px 1fr", sm: "130px 1fr" },
          gap: { xs: 1.5, sm: 3 },
          alignItems: "start",
        }}
      >
        <SoftBox
          component="img"
          src={`${process.env.PUBLIC_URL || ""}/og-1200x1200.png`}
          alt="Phúc Long"
          width={{ xs: 84, sm: 120 }}
          height={{ xs: 84, sm: 120 }}
          sx={{ objectFit: "contain" }}
        />
        <SoftBox pt={0.5} sx={{ "& p": { fontFamily: "inherit", color: "#000" } }}>
          <SoftTypography
            component="h3"
            fontWeight="bold"
            fontSize={{ xs: 16, sm: 20 }}
            mb={{ xs: 1, sm: 2 }}
          >
            NPP PHÚC LONG
          </SoftTypography>
          <SoftTypography
            component="p"
            fontSize={{ xs: 9, sm: 12 }}
            lineHeight={1.4}
            textAlign="justify"
          >
            {COMPANY_INTRO_LINES.map((line) => (
              <SoftBox component="span" display="block" key={line}>
                {line}
              </SoftBox>
            ))}
            <SoftBox component="span" display="block">
              Với phương châm <b>{COMPANY_SLOGAN}</b>
            </SoftBox>
            <SoftBox component="span" display="block">
              Mong muốn đem đến anh em thợ các sản phẩm tốt với giá phù hợp
            </SoftBox>
          </SoftTypography>
        </SoftBox>
      </SoftBox>

      <SoftBox textAlign="center" mt={{ xs: 1, sm: 0 }} mb={2.5}>
        <SoftTypography
          component="h1"
          fontFamily="inherit"
          fontSize={{ xs: 19, sm: 28 }}
          fontWeight="bold"
          color="dark"
          lineHeight={1.1}
        >
          PHIẾU BÁN HÀNG - KIÊM XUẤT KHO
        </SoftTypography>
        <SoftTypography
          component="p"
          fontFamily="inherit"
          fontSize={{ xs: 12, sm: 15 }}
          fontStyle="italic"
          color="dark"
          mt={0.5}
        >
          Số phiếu: {invoice.code || "—"} &nbsp; - &nbsp; Ngày{" "}
          {occurredAt.toLocaleString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </SoftTypography>
      </SoftBox>

      <SoftBox
        display="grid"
        mb={2}
        px={0.5}
        sx={{
          gridTemplateColumns: { xs: "1fr", sm: "1.4fr 1fr" },
          gap: { xs: 0.5, sm: 2 },
          "& p": {
            fontFamily: "inherit",
            fontSize: { xs: 13, sm: 16 },
            color: "#000",
            margin: 0,
            marginBottom: "4px",
          },
        }}
      >
        <SoftBox>
          <SoftTypography component="p">
            Khách hàng: <b>{customerName}</b>
          </SoftTypography>
          <SoftTypography component="p">Địa chỉ: {customerAddress}</SoftTypography>
        </SoftBox>
        <SoftBox>
          <SoftTypography component="p">SĐT: {customerPhones}</SoftTypography>
          <SoftTypography component="p">
            Quản Lý Khu Vực:{" "}
            {titleCaseName(invoice.salespersonName || invoice.salespersonId?.fullName || "") || "—"}
          </SoftTypography>
        </SoftBox>
      </SoftBox>

      <SoftBox overflow="auto">
        <SoftBox
          minWidth={760}
          sx={{
            "& table": {
              width: "100%",
              tableLayout: "fixed",
              borderCollapse: "collapse",
              fontFamily: '"Times New Roman", Times, serif',
              color: "#000",
            },
            "& th, & td": {
              border: "1px solid #000",
              px: 0.75,
              py: 0.65,
              fontSize: 14,
              lineHeight: 1.2,
              verticalAlign: "middle",
              overflowWrap: "anywhere",
            },
            "& th": {
              height: 62,
              bgcolor: "#f1f1f1",
              textAlign: "center",
              fontWeight: 700,
            },
            "& .number": { textAlign: "right", whiteSpace: "nowrap" },
            "& .center": { textAlign: "center" },
            "& .left": { textAlign: "left" },
            "& .summary-label": { pl: 6, textAlign: "left", fontWeight: 700 },
            "& .summary-value": {
              textAlign: "right",
              fontWeight: 700,
              whiteSpace: "nowrap",
            },
          }}
        >
          <table>
            <InvoiceColgroup />
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên hàng</th>
                <th>ĐVT</th>
                <th>Số lượng</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).length ? (
                invoice.items.map((item, index) => {
                  const gift = item.lineType === "GIFT";
                  return (
                    <tr key={`${getId(item.productId) || item.productId}-${index}`}>
                      <td className="center">{index + 1}</td>
                      <td className="left">
                        {item.productName || item.productId?.name || "Sản phẩm"}
                        {gift && <b style={{ color: "#1565c0", fontSize: 11 }}> (QUÀ TẶNG)</b>}
                      </td>
                      <td className="center">{item.unit || item.productId?.unit || ""}</td>
                      <td className="number">{numberText(item.qty)}</td>
                      <td className="number">{numberText(gift ? 0 : item.price)}</td>
                      <td className="number">{numberText(gift ? 0 : item.lineTotal)}</td>
                      <td className="left">
                        {gift ? item.giftCode || invoice.giftCode || "Quà tặng" : item.note || ""}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="center">
                    Không có hàng hóa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <table style={{ marginTop: -1 }}>
            <InvoiceColgroup />
            <tbody>
              <tr>
                <td className="summary-label" colSpan={5}>
                  Thành tiền
                </td>
                <td className="summary-value">{numberText(subtotal)}</td>
                <td />
              </tr>
              <tr>
                <td className="summary-label" colSpan={5}>
                  VAT
                </td>
                <td className="summary-value">{numberText(invoice.vatAmount || 0)}</td>
                <td />
              </tr>
              <tr>
                <td className="summary-label" colSpan={5}>
                  Chiết khấu
                </td>
                <td className="summary-value">{numberText(discount)}</td>
                <td />
              </tr>
              <tr>
                <td className="summary-label" colSpan={3}>
                  Tổng cộng (1)
                </td>
                <td className="summary-value">{numberText(totalQuantity)}</td>
                <td />
                <td className="summary-value">{numberText(grandTotal)}</td>
                <td />
              </tr>
              <tr>
                <td className="summary-label" colSpan={5}>
                  Nợ cũ (2)
                </td>
                <td className="summary-value">{numberText(oldDebt)}</td>
                <td />
              </tr>
              <tr>
                <td className="summary-label" colSpan={5}>
                  Số tiền thanh toán (3)
                </td>
                <td className="summary-value">{numberText(paidAmount)}</td>
                <td />
              </tr>
              <tr>
                <td className="summary-label" colSpan={5}>
                  Còn nợ (1 + 2 - 3)
                </td>
                <td className="summary-value">{numberText(debtAfter)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </SoftBox>
      </SoftBox>

      {invoiceNote && (
        <SoftBox
          mt={2}
          p={1.5}
          bgcolor="#fff8e1"
          sx={{ border: "1px solid #d7c58f" }}
        >
          <SoftTypography
            component="p"
            fontFamily="inherit"
            color="dark"
            fontSize={{ xs: 13, sm: 15 }}
            sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          >
            <b>Ghi chú hóa đơn:</b> {invoiceNote}
          </SoftTypography>
        </SoftBox>
      )}

      {invoice.giftCode && (
        <SoftTypography component="p" fontFamily="inherit" color="dark" fontSize={14} mt={2}>
          <b>Mã quà tặng:</b> {invoice.giftCode}
        </SoftTypography>
      )}
      <SoftTypography
        component="p"
        fontFamily="inherit"
        color="dark"
        fontSize={{ xs: 13, sm: 16 }}
        mt={2.5}
      >
        Số tiền bằng chữ: <i>{moneyInWords(paidAmount)}.</i>
      </SoftTypography>

      <SoftBox
        display="grid"
        mt={4}
        textAlign="center"
        sx={{
          gridTemplateColumns: "1fr 1fr",
          "& p": {
            fontFamily: "inherit",
            color: "#000",
            margin: 0,
            fontSize: { xs: 12, sm: 15 },
          },
        }}
      >
        <SoftBox>
          <SoftTypography component="p">&nbsp;</SoftTypography>
          <SoftTypography component="p" fontWeight="bold">
            THỦ KHO
          </SoftTypography>
          <SoftTypography component="p">(ký, họ tên)</SoftTypography>
          <SoftBox height={70} />
        </SoftBox>
        <SoftBox>
          <SoftTypography component="p" fontStyle="italic">
            Ngày {occurredAt.getDate()} tháng {occurredAt.getMonth() + 1} năm{" "}
            {occurredAt.getFullYear()}
          </SoftTypography>
          <SoftTypography component="p" fontWeight="bold">
            NGƯỜI NHẬN HÀNG
          </SoftTypography>
          <SoftTypography component="p">(ký, họ tên)</SoftTypography>
          <SoftBox height={70} />
        </SoftBox>
      </SoftBox>
      <SoftBox
        mt={{ xs: 4, sm: "auto" }}
        pt={2}
        textAlign="center"
        sx={{ borderTop: "1px solid #777" }}
      >
        <SoftTypography
          component="p"
          fontFamily="inherit"
          color="dark"
          fontWeight="bold"
          fontSize={{ xs: 11, sm: 15 }}
          mb={0.5}
        >
          NHÀ PHÂN PHỐI PHỤ TÙNG DẦU NHỚT PHÚC LONG
        </SoftTypography>
        <SoftTypography
          component="p"
          fontFamily="inherit"
          color="dark"
          fontSize={{ xs: 10, sm: 14 }}
        >
          Địa chỉ: B1/19 Lê Hồng Phong, P. Bình Thủy, TP. Cần Thơ · SĐT: 0939869861
        </SoftTypography>
        <SoftTypography
          component="p"
          fontFamily="inherit"
          color="dark"
          fontSize={{ xs: 10, sm: 14 }}
        >
          Số TK: 0111000206533 · Ngân hàng: Vietcombank · Chủ TK: Nguyễn Tuấn Vi
        </SoftTypography>
      </SoftBox>
    </SoftBox>
  );
}

function InvoiceDetail({ id, document, onClose, mobile = false, isAdmin = false, onReversed }) {
  const [invoice, setInvoice] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [reversing, setReversing] = useState(false);
  useEffect(() => {
    if (document) {
      setInvoice(normalizeInvoiceDocument(document));
      return undefined;
    }
    if (id) {
      let active = true;
      setInvoice(null);
      InvoiceService.getById(id)
        .then((response) => enrichInvoiceDebtSnapshot(unwrap(response)))
        .then((data) => {
          if (active) setInvoice(data);
        })
        .catch((error) => toast.error(errorMessage(error, "Không thể tải hóa đơn")));
      return () => {
        active = false;
      };
    }
    return undefined;
  }, [id, document]);
  const debtPaymentDocument = isDebtPaymentDocument(invoice);
  const reversed =
    invoice?.status === "REVERSED" ||
    invoice?.invoiceStatus === "REVERSED" ||
    Boolean(invoice?.reversedAt);
  const reverseInvoice = async () => {
    const reason = window.prompt(
      `Nhập lý do hoàn hóa đơn ${invoice?.code || ""}. Nội dung này được lưu để truy xuất:`
    );
    if (reason === null) return;
    if (reason.trim().length < 5) {
      toast.error("Lý do hoàn hóa đơn phải có ít nhất 5 ký tự");
      return;
    }
    if (
      !window.confirm(
        "Xác nhận hoàn hóa đơn? Backend sẽ hoàn tồn kho/xe, công nợ, voucher, quà tặng và các liên kết thanh toán trong một transaction."
      )
    )
      return;
    try {
      setReversing(true);
      await InvoiceService.reverse(id, { reason: reason.trim() });
      toast.success(`Đã hoàn hóa đơn ${invoice?.code || ""}`);
      await onReversed?.();
    } catch (error) {
      toast.error(errorMessage(error, "Không thể hoàn hóa đơn"));
    } finally {
      setReversing(false);
    }
  };
  return (
    <Modal open={Boolean(id || document)} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: { xs: mobile ? 0 : "50%", md: "50%" },
          left: { xs: mobile ? 0 : "50%", md: "50%" },
          transform: { xs: mobile ? "none" : "translate(-50%, -50%)", md: "translate(-50%, -50%)" },
          width: { xs: mobile ? "100%" : "96%", md: "96vw" },
          maxWidth: 1180,
          height: { xs: mobile ? "100dvh" : "94vh", md: "94vh" },
          overflow: "hidden",
          bgcolor: "#e8eaed",
          borderRadius: { xs: mobile ? 0 : 2, md: 2 },
          boxShadow: 24,
        }}
      >
        <SoftBox
          height={64}
          px={{ xs: 1.5, md: 2.5 }}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          bgcolor="#fff"
          sx={{ borderBottom: "1px solid #d7dce1" }}
        >
          <SoftBox minWidth={0}>
            <SoftTypography variant="button" fontWeight="bold" display="block">
              Chi tiết hóa đơn {invoice?.code || ""}
            </SoftTypography>
            {invoice && (
              <SoftTypography variant="caption" color="text" display="block">
                {dateTime(invoice.createdAt || invoice.date)}
              </SoftTypography>
            )}
          </SoftBox>
          <IconButton onClick={onClose} aria-label="Đóng chi tiết hóa đơn">
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
        <SoftBox height="calc(100% - 128px)" overflow="auto" p={{ xs: 1, sm: 2, md: 3 }}>
          {!invoice ? (
            <SoftBox bgcolor="#fff" p={4} textAlign="center" maxWidth={1080} mx="auto">
              <SoftTypography>Đang tải hóa đơn...</SoftTypography>
            </SoftBox>
          ) : (
            <InvoicePaperView invoice={invoice} />
          )}
        </SoftBox>
        <SoftBox
          height={64}
          px={{ xs: 1.5, md: 2.5 }}
          display="flex"
          alignItems="center"
          gap={1}
          bgcolor="#fff"
          sx={{ borderTop: "1px solid #d7dce1" }}
        >
          <SoftButton variant="outlined" color="secondary" fullWidth onClick={onClose}>
            Đóng
          </SoftButton>
          {isAdmin && !debtPaymentDocument && (
            <SoftButton
              variant="outlined"
              color="error"
              fullWidth
              disabled={!invoice || reversed || reversing}
              startIcon={<Icon>undo</Icon>}
              onClick={reverseInvoice}
            >
              {reversing ? "Đang hoàn..." : reversed ? "Đã hoàn hóa đơn" : "Hoàn hóa đơn"}
            </SoftButton>
          )}
          <SoftButton
            variant="gradient"
            color="info"
            fullWidth
            disabled={!invoice || exporting}
            startIcon={<Icon>{mobile ? "image" : "print"}</Icon>}
            onClick={async () => {
              try {
                setExporting(true);
                const result = await printInvoice(invoice);
                if (result?.downloaded) toast.success("Đã tải ảnh hóa đơn xuống thiết bị");
              } catch (error) {
                toast.error(error.message || "Không thể xuất hóa đơn");
              } finally {
                setExporting(false);
              }
            }}
          >
            {exporting ? "Đang tạo ảnh..." : mobile ? "Lưu ảnh hóa đơn" : "Xuất hóa đơn"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

export default function HoaDon() {
  const currentUser = useSelector((state) => state.auth?.user);
  const [urlSearchParams] = useSearchParams();
  const isStaff = String(currentUser?.role || "").toLowerCase() === "staff";
  const canViewAllCompanyInvoices = Boolean(
    currentUser?.canViewAllInvoices || currentUser?.permissions?.viewAllInvoices
  );
  const [invoices, setInvoices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState(() => urlSearchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [period, setPeriod] = useState("MONTH");
  const [anchor, setAnchor] = useState(today());
  const [customFrom, setCustomFrom] = useState(() => `${today().slice(0, 7)}-01`);
  const [customTo, setCustomTo] = useState(() => {
    const current = new Date();
    return dateValue(new Date(current.getFullYear(), current.getMonth() + 1, 0));
  });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [exportingList, setExportingList] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailDocument, setDetailDocument] = useState(null);
  useEffect(() => {
    const nextSearch = urlSearchParams.get("search") || "";
    setSearch(nextSearch);
    const nextInvoiceId = urlSearchParams.get("invoiceId");
    if (nextInvoiceId) setDetailId(nextInvoiceId);
  }, [urlSearchParams]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (isStaff) return;
    EmployeeService.getAll({ role: "staff", status: "ACTIVE", page: 1, limit: 100 })
      .then((response) => setEmployees(listOf(response)))
      .catch(() => setEmployees([]));
  }, [isStaff]);
  useEffect(
    () => setPage(1),
    [debouncedSearch, salespersonId, paymentStatus, period, anchor, customFrom, customTo]
  );
  const selectedRange = useMemo(
    () => invoicePeriodRange(period, anchor, customFrom, customTo),
    [period, anchor, customFrom, customTo]
  );
  const filters = useMemo(() => {
    return {
      salespersonId: salespersonId || undefined,
      paymentStatus: paymentStatus || undefined,
      search: debouncedSearch || undefined,
      from: selectedRange.from || undefined,
      to: selectedRange.to || undefined,
    };
  }, [selectedRange, salespersonId, paymentStatus, debouncedSearch]);
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      InvoiceService.getTimeline({ ...filters, page, limit: 20 }),
      InvoiceService.getSummary(filters),
    ])
      .then(([listResponse, summaryResponse]) => {
        const nextInvoices = listOf(listResponse).map(normalizeInvoiceDocument).filter(Boolean);
        setInvoices((current) =>
          isStaff && page > 1 ? [...current, ...nextInvoices] : nextInvoices
        );
        setMeta(listResponse.data?.meta || { totalPages: 1, total: 0 });
        setSummary(summaryResponse.data?.data || {});
      })
      .catch((error) => toast.error(errorMessage(error, "Không thể tải hóa đơn")))
      .finally(() => setLoading(false));
  }, [filters, page, isStaff]);
  useEffect(load, [load]);
  const exportInvoiceList = async () => {
    if (!selectedRange.from || !selectedRange.to) {
      toast.error("Vui lòng chọn đầy đủ từ ngày và đến ngày");
      return;
    }
    if (selectedRange.from > selectedRange.to) {
      toast.error("Từ ngày không được lớn hơn đến ngày");
      return;
    }
    try {
      setExportingList(true);
      const response = await InvoiceService.exportExcel(filters);
      const disposition = response.headers?.["content-disposition"] || "";
      const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      const fileName = utf8Name
        ? decodeURIComponent(utf8Name)
        : plainName || `hoa-don-${selectedRange.from}-${selectedRange.to}.xlsx`;
      downloadBlob(response.data, fileName);
      toast.success("Đã xuất danh sách hóa đơn");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể xuất danh sách hóa đơn"));
    } finally {
      setExportingList(false);
    }
  };
  const openDocument = (document) => {
    if (isDebtPaymentDocument(document)) {
      setDetailId(null);
      setDetailDocument(normalizeInvoiceDocument(document));
      return;
    }
    setDetailDocument(null);
    setDetailId(getId(document));
  };
  return (
    <DashboardLayout compactMobile={isStaff}>
      {!isStaff && <DashboardNavbar />}
      {isStaff && (
        <StaffMobileHeader
          title="Hóa đơn"
          subtitle={
            canViewAllCompanyInvoices
              ? "Toàn bộ hóa đơn của công ty"
              : "Lịch sử bán hàng của tôi"
          }
          onRefresh={load}
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
          container
          spacing={2}
          mb={3}
          sx={{ display: { xs: isStaff ? "none" : "flex", md: "flex" } }}
        >
          {[
            ["Số hóa đơn", summary.invoiceCount || 0],
            ["Doanh thu", money(summary.netRevenue)],
            ["Đã thu", money(summary.paidAmount)],
            ["Công nợ", money(summary.debtAmount)],
            ["Mã kích hoạt", summary.promotionActivationCount || 0],
          ].map(([label, value]) => (
            <Grid item xs={12} sm={6} lg key={label}>
              <Card>
                <SoftBox p={2}>
                  <SoftTypography variant="caption" color="text">
                    {label}
                  </SoftTypography>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {value}
                  </SoftTypography>
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
              gap={1}
              mb={3}
            >
              <SoftBox sx={{ display: { xs: isStaff ? "none" : "block", md: "block" } }}>
                <SoftTypography variant="h5" fontWeight="bold">
                  {isStaff ? "Bán hàng thị trường" : "Hóa đơn bán hàng"}
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {isStaff
                    ? "Tạo đơn nhanh và xem lịch sử bán trong tháng"
                    : "Doanh thu, thanh toán, khuyến mãi và công nợ"}
                </SoftTypography>
              </SoftBox>
              <SoftBox display="flex" gap={1} flexWrap="wrap" ml="auto">
                <SoftButton
                  variant="outlined"
                  color="info"
                  startIcon={<Icon>file_download</Icon>}
                  disabled={exportingList}
                  onClick={exportInvoiceList}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {exportingList ? "Đang xuất..." : "Xuất Excel"}
                </SoftButton>
                <SoftButton
                  variant="gradient"
                  color="success"
                  startIcon={<Icon>add</Icon>}
                  onClick={() => setCreateOpen(true)}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {isStaff ? "Bán hàng nhanh" : "Tạo hóa đơn"}
                </SoftButton>
              </SoftBox>
            </SoftBox>
            <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
              <SoftBox sx={{ flex: 1, minWidth: 230 }}>
                <SoftInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm hóa đơn, khách hàng, mã kích hoạt..."
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              {!isStaff && (
                <FormControl size="small" sx={{ minWidth: 210 }}>
                  <Select
                    displayEmpty
                    value={salespersonId}
                    onChange={(event) => setSalespersonId(event.target.value)}
                  >
                    <MenuItem value="">Tất cả nhân viên</MenuItem>
                    {employees.map((employee) => (
                      <MenuItem key={getId(employee)} value={getId(employee)}>
                        {employee.employeeCode} - {employee.fullName || employee.username}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <FormControl
                size="small"
                sx={{
                  minWidth: 190,
                  display: { xs: isStaff ? "none" : "inline-flex", md: "inline-flex" },
                }}
              >
                <Select
                  displayEmpty
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                >
                  <MenuItem value="">Mọi trạng thái thanh toán</MenuItem>
                  <MenuItem value="PAID">Đã thanh toán</MenuItem>
                  <MenuItem value="PARTIAL">Thanh toán một phần</MenuItem>
                  <MenuItem value="UNPAID">Chưa thanh toán</MenuItem>
                </Select>
              </FormControl>
            </SoftBox>
            <SoftBox
              mb={3}
              p={{ xs: 1.25, md: 1.5 }}
              border="1px solid #e1e7ef"
              borderRadius={2}
              bgcolor="#f8fafc"
            >
              <SoftBox
                display="flex"
                gap={1}
                pb={0.5}
                sx={{
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  scrollSnapType: "x mandatory",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {invoicePeriodOptions.map((option) => {
                  const active = period === option.value;
                  return (
                    <SoftBox
                      key={option.value}
                      component="button"
                      type="button"
                      onClick={() => setPeriod(option.value)}
                      px={1.5}
                      py={1}
                      sx={{
                        minWidth: option.value === "CUSTOM" ? 150 : 82,
                        flexShrink: 0,
                        scrollSnapAlign: "start",
                        border: active ? "2px solid #1976d2" : "1px solid #d7dee8",
                        borderRadius: 1.5,
                        bgcolor: active ? "#e7f3ff" : "#fff",
                        color: active ? "#1565c0" : "#52606d",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {option.label}
                    </SoftBox>
                  );
                })}
              </SoftBox>
              <SoftBox
                mt={1.25}
                display="flex"
                gap={1}
                alignItems={{ xs: "stretch", sm: "center" }}
                flexDirection={{ xs: "column", sm: "row" }}
                flexWrap="wrap"
              >
                {period === "MONTH" && (
                  <SoftInput
                    type="month"
                    value={anchor.slice(0, 7)}
                    onChange={(event) =>
                      event.target.value && setAnchor(`${event.target.value}-01`)
                    }
                    sx={{ width: { xs: "100%", sm: 190 } }}
                  />
                )}
                {["DAY", "WEEK"].includes(period) && (
                  <SoftInput
                    type="date"
                    value={anchor}
                    onChange={(event) => event.target.value && setAnchor(event.target.value)}
                    sx={{ width: { xs: "100%", sm: 190 } }}
                  />
                )}
                {period === "QUARTER" && (
                  <>
                    <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 130 } }}>
                      <Select
                        value={Math.floor((Number(anchor.slice(5, 7)) - 1) / 3) + 1}
                        onChange={(event) => {
                          const startMonth = (Number(event.target.value) - 1) * 3 + 1;
                          setAnchor(`${anchor.slice(0, 4)}-${String(startMonth).padStart(2, "0")}-01`);
                        }}
                      >
                        {[1, 2, 3, 4].map((quarter) => (
                          <MenuItem key={quarter} value={quarter}>
                            Quý {quarter}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <SoftInput
                      type="number"
                      value={anchor.slice(0, 4)}
                      inputProps={{ min: 2000, max: 2100 }}
                      onChange={(event) => {
                        const year = String(event.target.value).slice(0, 4);
                        if (year.length === 4) setAnchor(`${year}-${anchor.slice(5, 7)}-01`);
                      }}
                      sx={{ width: { xs: "100%", sm: 120 } }}
                    />
                  </>
                )}
                {period === "YEAR" && (
                  <SoftInput
                    type="number"
                    value={anchor.slice(0, 4)}
                    inputProps={{ min: 2000, max: 2100 }}
                    onChange={(event) => {
                      const year = String(event.target.value).slice(0, 4);
                      if (year.length === 4) setAnchor(`${year}-01-01`);
                    }}
                    sx={{ width: { xs: "100%", sm: 150 } }}
                  />
                )}
                {period === "CUSTOM" && (
                  <>
                    <SoftBox flex={{ sm: 1 }} minWidth={{ sm: 180 }}>
                      <SoftTypography variant="caption" color="text" display="block" mb={0.5}>
                        Từ ngày
                      </SoftTypography>
                      <SoftInput
                        type="date"
                        value={customFrom}
                        onChange={(event) => setCustomFrom(event.target.value)}
                      />
                    </SoftBox>
                    <SoftBox flex={{ sm: 1 }} minWidth={{ sm: 180 }}>
                      <SoftTypography variant="caption" color="text" display="block" mb={0.5}>
                        Đến ngày
                      </SoftTypography>
                      <SoftInput
                        type="date"
                        value={customTo}
                        onChange={(event) => setCustomTo(event.target.value)}
                      />
                    </SoftBox>
                  </>
                )}
                <SoftTypography variant="caption" color="text" ml={{ sm: "auto" }}>
                  Đang xem: <strong>{shortDate(selectedRange.from)}</strong> đến{" "}
                  <strong>{shortDate(selectedRange.to)}</strong>
                </SoftTypography>
              </SoftBox>
            </SoftBox>
            {isStaff && (
              <SoftBox display={{ xs: "block", md: "none" }}>
                {!loading &&
                  invoices.map((invoice) => {
                    const customerInfo = invoiceCustomer(invoice);
                    const debtPaymentDocument = isDebtPaymentDocument(invoice);
                    const isReversed =
                      invoice.status === "REVERSED" ||
                      invoice.invoiceStatus === "REVERSED" ||
                      Boolean(invoice.reversedAt);
                    return (
                      <SoftBox
                        key={`${debtPaymentDocument ? "debt-" : "invoice-"}${getId(invoice)}`}
                        py={1.5}
                        display="flex"
                        gap={1.25}
                        alignItems="flex-start"
                        onClick={() => openDocument(invoice)}
                        sx={{ borderBottom: "1px solid #edf0f5", cursor: "pointer" }}
                      >
                        <SoftBox
                          width={44}
                          height={44}
                          borderRadius="50%"
                          bgcolor={
                            isReversed ? "#ffebee" : debtPaymentDocument ? "#e8f5e9" : "#e7f3ff"
                          }
                          color={
                            isReversed ? "#c62828" : debtPaymentDocument ? "#2e7d32" : "#1877f2"
                          }
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <Icon>
                            {isReversed ? "undo" : debtPaymentDocument ? "payments" : "receipt"}
                          </Icon>
                        </SoftBox>
                        <SoftBox flex={1} minWidth={0}>
                          <SoftBox
                            display="flex"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            gap={1}
                          >
                            <SoftTypography variant="button" fontWeight="bold" display="block">
                              {invoice.code || "Hóa đơn"}
                            </SoftTypography>
                            <SoftBox textAlign="right" flexShrink={0}>
                              <SoftTypography variant="caption" color="text" display="block">
                                Đã trả (3)
                              </SoftTypography>
                              <SoftTypography
                                variant="button"
                                fontWeight="bold"
                                sx={{
                                  color: invoiceReceivedAmount(invoice) > 0 ? "#2e7d32" : "#6b7280",
                                }}
                              >
                                {money(invoiceReceivedAmount(invoice))}
                              </SoftTypography>
                            </SoftBox>
                          </SoftBox>
                          <SoftTypography
                            variant="button"
                            fontWeight="bold"
                            display="block"
                            mt={0.25}
                            sx={{
                              lineHeight: 1.35,
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {customerInfo.code
                              ? `${customerInfo.code} · ${customerInfo.name}`
                              : customerInfo.label}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block" mt={0.25}>
                            {dateTime(invoice.createdAt || invoice.date)}
                          </SoftTypography>
                          {canViewAllCompanyInvoices && (
                            <SoftTypography
                              variant="caption"
                              color="text"
                              display="block"
                              mt={0.2}
                            >
                              Nhân viên:{" "}
                              {invoice.salespersonName ||
                                invoice.collectorName ||
                                invoice.salespersonId?.fullName ||
                                "Chưa xác định"}
                            </SoftTypography>
                          )}
                          <SoftBox display="flex" gap={0.75} mt={0.75} flexWrap="wrap">
                            <SoftTypography
                              variant="caption"
                              fontWeight="bold"
                              sx={{
                                color: isReversed
                                  ? "#c62828"
                                  : debtPaymentDocument
                                  ? "#2e7d32"
                                  : invoice.debtAmount > 0
                                  ? "#c62828"
                                  : "#2e7d32",
                                bgcolor: isReversed
                                  ? "#ffebee"
                                  : debtPaymentDocument
                                  ? "#e8f5e9"
                                  : invoice.debtAmount > 0
                                  ? "#fff3e0"
                                  : "#e8f5e9",
                                px: 0.8,
                                py: 0.25,
                                borderRadius: 5,
                              }}
                            >
                              {isReversed
                                ? "Đã hoàn hóa đơn"
                                : debtPaymentDocument
                                ? invoice.status === "CANCELLED"
                                  ? "Phiếu thu đã hủy"
                                  : "Thanh toán công nợ"
                                : invoice.paymentStatus === "PAID"
                                ? "Đã thanh toán"
                                : `Công nợ ${money(invoice.debtAmount)}`}
                            </SoftTypography>
                            {customerInfo.phone && (
                              <SoftTypography variant="caption" color="text">
                                {customerInfo.phone}
                              </SoftTypography>
                            )}
                          </SoftBox>
                        </SoftBox>
                      </SoftBox>
                    );
                  })}
              </SoftBox>
            )}
            <SoftBox
              sx={{ overflowX: "auto", display: { xs: isStaff ? "none" : "block", md: "block" } }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {[
                      "Mã chứng từ",
                      "Ngày",
                      "Khách hàng",
                      "Nhân viên",
                      "Tổng tiền",
                      "Đã trả",
                      "Công nợ",
                      "Trạng thái",
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
                  {loading && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 40 }}>
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loading && !invoices.length && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ textAlign: "center", padding: 40, color: "#9E9E9E" }}
                      >
                        Chưa có hóa đơn
                      </td>
                    </tr>
                  )}
                  {invoices.map((invoice) => {
                    const debtPaymentDocument = isDebtPaymentDocument(invoice);
                    return (
                      <tr
                        key={`${debtPaymentDocument ? "debt-" : "invoice-"}${getId(invoice)}`}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td
                          style={{ padding: 12, fontSize: 13, fontWeight: 600, color: "#1565C0" }}
                        >
                          {invoice.code}
                          {debtPaymentDocument && (
                            <>
                              <br />
                              <span style={{ color: "#2e7d32", fontSize: 11 }}>
                                THANH TOÁN CÔNG NỢ
                              </span>
                            </>
                          )}
                          {invoice.voucherCode && (
                            <>
                              <br />
                              <span style={{ color: "#7B1FA2", fontSize: 11 }}>
                                🎟 {invoice.voucherCode}
                              </span>
                            </>
                          )}
                        </td>
                        <td style={{ padding: 12, fontSize: 13 }}>
                          {dateTime(invoice.createdAt || invoice.date)}
                        </td>
                        <td style={{ padding: 12, fontSize: 13 }}>
                          {invoiceCustomer(invoice).label}
                          <br />
                          <span style={{ color: "#6B7280" }}>{invoiceCustomer(invoice).phone}</span>
                        </td>
                        <td style={{ padding: 12, fontSize: 13 }}>
                          {invoice.salespersonName ||
                            invoice.collectorName ||
                            invoice.salespersonId?.fullName ||
                            "—"}
                        </td>
                        <td style={{ padding: 12, fontSize: 13, fontWeight: 600 }}>
                          {money(
                            debtPaymentDocument ? 0 : invoice.grandTotal ?? invoice.totalAmount
                          )}
                        </td>
                        <td style={{ padding: 12, fontSize: 13, color: "#2E7D32" }}>
                          {money(invoiceReceivedAmount(invoice))}
                        </td>
                        <td
                          style={{
                            padding: 12,
                            fontSize: 13,
                            color:
                              (debtPaymentDocument
                                ? invoice.customerDebtAfter
                                : invoice.debtAmount) > 0
                                ? "#C62828"
                                : "#6B7280",
                          }}
                        >
                          {money(
                            debtPaymentDocument ? invoice.customerDebtAfter : invoice.debtAmount
                          )}
                        </td>
                        <td style={{ padding: 12 }}>
                          <span
                            style={{
                              padding: "4px 9px",
                              borderRadius: 10,
                              fontSize: 11,
                              background: debtPaymentDocument
                                ? invoice.status === "CANCELLED"
                                  ? "#FFEBEE"
                                  : "#E8F5E9"
                                : invoice.paymentStatus === "PAID"
                                ? "#E8F5E9"
                                : invoice.paymentStatus === "PARTIAL"
                                ? "#FFF3E0"
                                : "#FFEBEE",
                              color: debtPaymentDocument
                                ? invoice.status === "CANCELLED"
                                  ? "#C62828"
                                  : "#2E7D32"
                                : invoice.paymentStatus === "PAID"
                                ? "#2E7D32"
                                : invoice.paymentStatus === "PARTIAL"
                                ? "#E65100"
                                : "#C62828",
                            }}
                          >
                            {debtPaymentDocument
                              ? invoice.status === "CANCELLED"
                                ? "Phiếu thu đã hủy"
                                : "Đã thu công nợ"
                              : invoice.paymentStatus === "PAID"
                              ? "Đã thanh toán"
                              : invoice.paymentStatus === "PARTIAL"
                              ? "Thanh toán một phần"
                              : "Chưa thanh toán"}
                          </span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <Tooltip title="Xem chi tiết">
                            <IconButton size="small" onClick={() => openDocument(invoice)}>
                              <Icon color="info">visibility</Icon>
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SoftBox>
            {isStaff && (
              <MobileLoadMore
                loading={loading}
                hasMore={page < (meta.totalPages || 1)}
                onLoadMore={() => setPage((value) => value + 1)}
              />
            )}
            {!isStaff && meta.totalPages > 1 && (
              <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
                <SoftTypography variant="caption">Tổng {meta.total || 0} hóa đơn</SoftTypography>
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
      <CreateInvoiceModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <InvoiceDetail
        id={detailId}
        document={detailDocument}
        onClose={() => {
          setDetailId(null);
          setDetailDocument(null);
        }}
        mobile={isStaff}
        isAdmin={!isStaff}
        onReversed={() => {
          setDetailId(null);
          load();
        }}
      />
    </DashboardLayout>
  );
}
