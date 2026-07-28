import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
import { useSelector } from "react-redux";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import {
  CustomerService,
  CUSTOMER_SEGMENTS,
  CUSTOMER_SEGMENT_LABELS,
  CUSTOMER_SOURCE_LABELS,
} from "services/crmService";
import { toast } from "react-toastify";
import { downloadBlob, exportExcel, readExcelFile } from "utils/excel";
import { DebtPaymentHistory, DebtPaymentModal } from "./debt-payment";
import StaffMobileHeader from "components/StaffMobileHeader";
import MobileLoadMore from "components/MobileLoadMore";
import CustomerDebtHistory from "./debt-history";

const CustomerStoreProfile = lazy(() => import("./store-profile"));

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
    : "—";
const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  source: "LEAD",
  segment: "NEW_CUSTOMER",
  zaloConnected: false,
  debtLimit: 0,
  note: "",
};
const normalizePhone = (value) =>
  String(value || "")
    .split(/[,;|/]+/)
    .map((phone) => phone.replace(/\D/g, ""))
    .filter(Boolean)
    .map((phone) => (phone.startsWith("0") ? phone : `0${phone}`))
    .filter((phone, index, values) => values.indexOf(phone) === index)
    .join(", ");
const normalizeImportPhones = (row) => {
  const next = { ...row };
  const phoneKey = Object.keys(next).find((key) =>
    ["phone", "phone number", "so dien thoai", "sdt", "dien thoai"].includes(
      String(key).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    )
  );
  if (phoneKey) next[phoneKey] = normalizePhone(next[phoneKey]);
  return next;
};
const CUSTOMER_IMPORT_BATCH_SIZE = 50;
const importCustomerBatches = async (rows) => {
  const summary = {
    totalRows: rows.length,
    created: 0,
    updated: 0,
    failed: 0,
    debtLedgersCreated: 0,
    duplicatePhonesAccepted: 0,
    errors: [],
  };
  for (let start = 0; start < rows.length; start += CUSTOMER_IMPORT_BATCH_SIZE) {
    const batch = rows.slice(start, start + CUSTOMER_IMPORT_BATCH_SIZE);
    const response = await CustomerService.importExcel(batch);
    const result = response.data?.data || {};
    summary.created += Number(result.created) || 0;
    summary.updated += Number(result.updated) || 0;
    summary.failed += Number(result.failed) || 0;
    summary.debtLedgersCreated += Number(result.debtLedgersCreated) || 0;
    summary.duplicatePhonesAccepted += Number(result.duplicatePhonesAccepted) || 0;
    if (Array.isArray(result.errors)) {
      summary.errors.push(
        ...result.errors.map((error) => ({
          ...error,
          row: start + (Number(error.row) || 2),
        }))
      );
    }
  }
  return summary;
};
const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .trim()
    .toUpperCase();
const interactionStatus = (value, connectedLabel, disconnectedLabel) => {
  const normalized = normalizeText(value);
  if (
    ["DA KET BAN", "DA GUI", "CO", "YES", "TRUE", "CONNECTED", "SENT"].includes(normalized)
  )
    return connectedLabel;
  if (
    [
      "CHUA KET BAN",
      "KHONG GUI",
      "CHUA GUI",
      "KHONG",
      "NO",
      "FALSE",
      "NOT_CONNECTED",
      "NOT_SENT",
    ].includes(normalized)
  )
    return disconnectedLabel;
  return "";
};
const interactionDate = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const text = String(value).trim();
  const vietnameseDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (vietnameseDate) {
    const [, day, month, year] = vietnameseDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00+07:00`;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};
const normalizeInteractionRow = (row, index) => {
  const customerCode = String(
    row.makhachhang || row.customerCode || row.customercode || ""
  )
    .trim()
    .toUpperCase();
  const rawDate = row.ngay || row.date || row.interactiondate || "";
  return {
    rowNumber: index + 2,
    customerCode,
    customerName: String(row.tenkhachhang || row.customerName || row.customername || "").trim(),
    zaloStatus: interactionStatus(
      row.tinhtrangzalo || row.zaloStatus || row.zalostatus,
      "CONNECTED",
      "NOT_CONNECTED"
    ),
    invoiceStatus: interactionStatus(
      row.tinhtranghoadon || row.invoiceStatus || row.invoicestatus,
      "SENT",
      "NOT_SENT"
    ),
    interaction: String(row.tuongtac || row.interaction || row.action || "").trim(),
    phone: normalizePhone(row.sodienthoai || row.phone || row.sdt || ""),
    note: String(row.note || row.ghichu || "").trim(),
    occurredAt: interactionDate(rawDate),
    originalDate: rawDate,
  };
};
const CUSTOMER_INTERACTION_IMPORT_BATCH_SIZE = 50;
const importInteractionBatches = async (rows) => {
  const summary = {
    totalRows: rows.length,
    imported: 0,
    created: 0,
    updated: 0,
    zaloUpdated: 0,
    duplicatesSkipped: 0,
    failed: 0,
    errors: [],
  };
  for (let start = 0; start < rows.length; start += CUSTOMER_INTERACTION_IMPORT_BATCH_SIZE) {
    const batch = rows.slice(start, start + CUSTOMER_INTERACTION_IMPORT_BATCH_SIZE);
    const response = await CustomerService.importInteractions(batch);
    const result = response.data?.data || {};
    summary.imported += Number(result.imported) || 0;
    summary.created += Number(result.created) || 0;
    summary.updated += Number(result.updated) || 0;
    summary.zaloUpdated += Number(result.zaloUpdated) || 0;
    summary.duplicatesSkipped += Number(result.duplicatesSkipped) || 0;
    summary.failed += Number(result.failed) || 0;
    if (Array.isArray(result.errors)) {
      summary.errors.push(
        ...result.errors.map((error) => ({
          ...error,
          row: error.row || error.rowNumber || batch[Number(error.index) || 0]?.rowNumber,
        }))
      );
    }
  }
  return summary;
};
const badge = (label, color, background) => (
  <span
    style={{
      padding: "4px 9px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      color,
      background,
    }}
  >
    {label}
  </span>
);
const hasCustomerLocation = (customer = {}) => {
  if (typeof customer.hasStoreLocation === "boolean") return customer.hasStoreLocation;
  const location = customer.storeLocation || {};
  const latitude = Number(location.latitude ?? location.lat);
  const longitude = Number(location.longitude ?? location.lng ?? location.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude);
};
const hasCustomerStorefront = (customer = {}) => {
  if (typeof customer.hasStorefrontImage === "boolean") return customer.hasStorefrontImage;
  const image = customer.storefrontImage || {};
  return Boolean(
    image.url ||
      image.secureUrl ||
      image.secure_url ||
      customer.storefrontImageUrl ||
      customer.storeImageUrl
  );
};
const CustomerStoreTags = ({ customer }) => {
  const hasLocation = hasCustomerLocation(customer);
  const hasStorefront = hasCustomerStorefront(customer);
  if (!hasLocation && !hasStorefront) return null;
  return (
    <SoftBox display="flex" gap={0.6} flexWrap="wrap" mt={0.5}>
      {hasLocation && (
        <SoftBox
          display="inline-flex"
          alignItems="center"
          gap={0.35}
          px={0.75}
          py={0.2}
          borderRadius={1}
          bgcolor="#e7f3ff"
          sx={{ color: "#1565c0" }}
        >
          <Icon sx={{ fontSize: "14px !important" }}>location_on</Icon>
          <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "inherit" }}>
            Vị trí
          </SoftTypography>
        </SoftBox>
      )}
      {hasStorefront && (
        <SoftBox
          display="inline-flex"
          alignItems="center"
          gap={0.35}
          px={0.75}
          py={0.2}
          borderRadius={1}
          bgcolor="#fff3e0"
          sx={{ color: "#e65100" }}
        >
          <Icon sx={{ fontSize: "14px !important" }}>storefront</Icon>
          <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "inherit" }}>
            Cửa tiệm
          </SoftTypography>
        </SoftBox>
      )}
    </SoftBox>
  );
};
const normalizeCustomerDetail = (response) => {
  const data = response?.data?.data || response?.data || {};
  return {
    ...data,
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    vouchers: Array.isArray(data.vouchers) ? data.vouchers : [],
    interactions: Array.isArray(data.interactions) ? data.interactions : [],
  };
};

function CustomerForm({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  useEffect(
    () => setForm(customer ? { ...EMPTY_FORM, ...customer } : EMPTY_FORM),
    [customer, open]
  );
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const save = async () => {
    if (!form.name.trim()) return toast.error("Tên khách hàng là bắt buộc");
    try {
      setSaving(true);
      const payload = {
        ...form,
        name: form.name.trim(),
        phone: normalizePhone(form.phone) || undefined,
        debtLimit: Number(form.debtLimit) || 0,
      };
      if (customer?.id) await CustomerService.update(customer.id, payload);
      else await CustomerService.create(payload);
      toast.success(customer ? "Đã cập nhật khách hàng" : "Đã thêm khách hàng");
      onSaved(!customer);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu khách hàng");
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
          width: { xs: "92%", md: 650 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold" mb={3}>
          {customer ? "Cập nhật khách hàng" : "Thêm khách hàng"}
        </SoftTypography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption">Tên khách hàng *</SoftTypography>
            <SoftInput value={form.name} onChange={(e) => set("name", e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption">Số điện thoại</SoftTypography>
            <SoftInput
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() => set("phone", normalizePhone(form.phone))}
              placeholder="VD: 0901234567, 0912345678"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption">Email</SoftTypography>
            <SoftInput
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption">Địa chỉ</SoftTypography>
            <SoftInput
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <SoftTypography variant="caption">Nguồn khách hàng</SoftTypography>
            <FormControl fullWidth size="small">
              <Select value={form.source} onChange={(e) => set("source", e.target.value)}>
                <MenuItem value="LEAD">Khách lead</MenuItem>
                <MenuItem value="LEGACY">Khách cũ</MenuItem>
                <MenuItem value="NEW">Khách mới</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <SoftTypography variant="caption">Phân loại</SoftTypography>
            <FormControl fullWidth size="small">
              <Select value={form.segment} onChange={(e) => set("segment", e.target.value)}>
                {CUSTOMER_SEGMENTS.map((item) => (
                  <MenuItem value={item.value} key={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <SoftTypography variant="caption">Kết bạn Zalo</SoftTypography>
            <FormControl fullWidth size="small">
              <Select
                value={form.zaloConnected ? "yes" : "no"}
                onChange={(e) => set("zaloConnected", e.target.value === "yes")}
              >
                <MenuItem value="yes">Đã kết bạn</MenuItem>
                <MenuItem value="no">Chưa kết bạn</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption">Giới hạn công nợ</SoftTypography>
            <SoftInput
              type="number"
              value={form.debtLimit}
              onChange={(e) => set("debtLimit", e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <SoftTypography variant="caption">Ghi chú</SoftTypography>
            <SoftInput value={form.note} onChange={(e) => set("note", e.target.value)} fullWidth />
          </Grid>
        </Grid>
        <SoftBox display="flex" gap={2} mt={3}>
          <SoftButton color="secondary" variant="outlined" fullWidth onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton color="info" variant="gradient" fullWidth disabled={saving} onClick={save}>
            {saving ? "Đang lưu..." : "Lưu khách hàng"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function CustomerDetail({ customerId, open, onClose, onEdit, readOnly = false }) {
  const [customer, setCustomer] = useState(null);
  const [tab, setTab] = useState(0);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interaction, setInteraction] = useState({ channel: "Zalo", action: "", result: "" });
  const [savingInteraction, setSavingInteraction] = useState(false);
  const [activations, setActivations] = useState([]);
  const [debtPaymentOpen, setDebtPaymentOpen] = useState(false);
  const [debtRefreshKey, setDebtRefreshKey] = useState(0);
  const loadDetail = () =>
    CustomerService.getById(customerId).then((response) =>
      setCustomer(normalizeCustomerDetail(response))
    );
  useEffect(() => {
    let active = true;
    if (open && customerId) {
      setCustomer(null);
      setActivations([]);
      setTab(0);
      CustomerService.getById(customerId)
        .then((response) => {
          if (active) setCustomer(normalizeCustomerDetail(response));
        })
        .catch(
          (error) =>
            active && toast.error(error.response?.data?.message || "Không thể tải hồ sơ khách hàng")
        );
      CustomerService.getPromotionActivations(customerId, { page: 1, limit: 100 })
        .then((response) => {
          if (active) setActivations(Array.isArray(response.data?.data) ? response.data.data : []);
        })
        .catch(() => active && setActivations([]));
    }
    return () => {
      active = false;
    };
  }, [open, customerId]);
  const saveInteraction = async () => {
    if (!interaction.action.trim()) return toast.error("Vui lòng nhập nội dung tương tác");
    try {
      setSavingInteraction(true);
      await CustomerService.addInteraction(customerId, interaction);
      toast.success("Đã ghi nhận tương tác");
      setInteractionOpen(false);
      setInteraction({ channel: "Zalo", action: "", result: "" });
      await loadDetail();
      setTab(7);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể ghi nhận tương tác");
    } finally {
      setSavingInteraction(false);
    }
  };
  const debtRatio = customer?.debtLimit
    ? Math.round((customer.debt / customer.debtLimit) * 100)
    : 0;
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: { xs: readOnly ? 0 : "50%", md: "50%" },
          left: { xs: readOnly ? 0 : "50%", md: "50%" },
          transform: { xs: readOnly ? "none" : "translate(-50%, -50%)", md: "translate(-50%, -50%)" },
          width: { xs: readOnly ? "100%" : "95%", lg: 1000 },
          height: { xs: readOnly ? "100%" : "88vh", md: "88vh" },
          overflowY: "auto",
          bgcolor: "#F8F9FA",
          borderRadius: { xs: readOnly ? 0 : 3, md: 3 },
          boxShadow: 24,
          p: { xs: readOnly ? 2 : 3, md: 3 },
        }}
      >
        {!customer ? (
          <SoftBox height="100%" display="flex" alignItems="center" justifyContent="center">
            <SoftTypography variant="button" color="text">
              Đang tải hồ sơ khách hàng...
            </SoftTypography>
          </SoftBox>
        ) : (
          <>
            <SoftBox display="flex" justifyContent="space-between" alignItems="start">
              <SoftBox>
                <SoftTypography variant="h4" fontWeight="bold">
                  {customer.name}
                </SoftTypography>
                <SoftTypography variant="button" color="text">
                  {customer.code} · {customer.phone} · {customer.email || "Chưa có email"}
                </SoftTypography>
              </SoftBox>
              <SoftBox display="flex" gap={1}>
                {!readOnly && Number(customer.debt || 0) > 0 && (
                  <SoftButton
                    size="small"
                    color="success"
                    variant="gradient"
                    startIcon={<Icon>payments</Icon>}
                    onClick={() => setDebtPaymentOpen(true)}
                  >
                    Thu công nợ
                  </SoftButton>
                )}
                {!readOnly && <SoftButton
                  size="small"
                  color="success"
                  variant="outlined"
                  startIcon={<Icon>add_comment</Icon>}
                  onClick={() => setInteractionOpen(true)}
                >
                  Ghi nhận tương tác
                </SoftButton>}
                {!readOnly && <SoftButton
                  size="small"
                  color="info"
                  variant="outlined"
                  startIcon={<Icon>edit</Icon>}
                  onClick={() => onEdit(customer)}
                >
                  Chỉnh sửa
                </SoftButton>}
                <IconButton onClick={onClose}>
                  <Icon>close</Icon>
                </IconButton>
              </SoftBox>
            </SoftBox>
            {customer.debt > customer.debtLimit && (
              <SoftBox
                mt={2}
                p={1.5}
                sx={{ background: "#FFEBEE", borderRadius: 2, border: "1px solid #FFCDD2" }}
              >
                <SoftTypography variant="button" sx={{ color: "#C62828" }}>
                  <Icon sx={{ verticalAlign: "middle", mr: 1 }}>warning</Icon>Công nợ đã vượt hạn
                  mức {money(customer.debt - customer.debtLimit)}. Cần duyệt trước khi tạo hóa đơn
                  mới.
                </SoftTypography>
              </SoftBox>
            )}
            <Grid container spacing={2} mt={0}>
              <Grid item xs={6} md={3}>
                <Card>
                  <SoftBox p={2}>
                    <SoftTypography variant="caption">Tổng doanh số</SoftTypography>
                    <SoftTypography variant="h6" fontWeight="bold">
                      {money(customer.totalSpent)}
                    </SoftTypography>
                  </SoftBox>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <SoftBox p={2}>
                    <SoftTypography variant="caption">Số hóa đơn</SoftTypography>
                    <SoftTypography variant="h5" fontWeight="bold">
                      {customer.orderCount}
                    </SoftTypography>
                  </SoftBox>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <SoftBox p={2}>
                    <SoftTypography variant="caption">Công nợ hiện tại</SoftTypography>
                    <SoftTypography
                      variant="h6"
                      fontWeight="bold"
                      color={debtRatio >= 100 ? "error" : "warning"}
                    >
                      {money(customer.debt)}
                    </SoftTypography>
                    <SoftTypography variant="caption">{debtRatio}% hạn mức</SoftTypography>
                  </SoftBox>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card>
                  <SoftBox p={2}>
                    <SoftTypography variant="caption">Zalo</SoftTypography>
                    <SoftTypography
                      variant="button"
                      fontWeight="bold"
                      color={customer.zaloConnected ? "success" : "text"}
                    >
                      {customer.zaloConnected ? "Đã kết bạn" : "Chưa kết bạn"}
                    </SoftTypography>
                  </SoftBox>
                </Card>
              </Grid>
            </Grid>
            <Card sx={{ mt: 2, overflow: "hidden", borderRadius: { xs: readOnly ? 0 : 2, md: 2 } }}>
              <SoftBox
                display="flex"
                sx={{
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  borderBottom: "1px solid #e4e6eb",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {[
                  "Hồ sơ",
                  `Hóa đơn (${customer.invoices.length})`,
                  `Voucher (${customer.vouchers.length})`,
                  `Mã kích hoạt (${activations.length})`,
                  "Phiếu thu công nợ",
                  "Lịch sử công nợ",
                  "Cửa tiệm",
                  `Tương tác (${customer.interactions.length})`,
                ].map((label, index) => (
                  <SoftBox
                    key={label}
                    component="button"
                    type="button"
                    onClick={() => setTab(index)}
                    px={{ xs: 1.75, md: 2.25 }}
                    py={1.5}
                    flex={{ md: "1 0 auto" }}
                    flexShrink={0}
                    sx={{
                      border: 0,
                      borderBottom:
                        tab === index ? "3px solid #1877f2" : "3px solid transparent",
                      background: "#fff",
                      color: tab === index ? "#1877f2" : "#65676b",
                      fontSize: 12,
                      fontWeight: tab === index ? 700 : 500,
                      minWidth: { md: 120 },
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      "&:hover": { background: "#f5f7fa" },
                    }}
                  >
                    {label}
                  </SoftBox>
                ))}
              </SoftBox>
              <SoftBox p={{ xs: readOnly ? 1.5 : 3, md: 3 }} sx={{ overflow: "hidden" }}>
                {tab === 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      {[
                        [
                          "Phân loại",
                          CUSTOMER_SEGMENT_LABELS[customer.segment] || customer.segment,
                        ],
                        [
                          "Nguồn",
                          customer.sourceLabel ||
                            CUSTOMER_SOURCE_LABELS[customer.source] ||
                            customer.source,
                        ],
                        ["Địa chỉ", customer.address],
                        ["Đơn gần nhất", customer.lastOrderAt || "—"],
                      ].map(([key, value]) => (
                        <SoftBox key={key} mb={1}>
                          <SoftTypography variant="caption" color="text">
                            {key}
                          </SoftTypography>
                          <SoftTypography variant="button" display="block">
                            {value}
                          </SoftTypography>
                        </SoftBox>
                      ))}
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <SoftTypography variant="caption" color="text">
                        Hạn mức công nợ
                      </SoftTypography>
                      <SoftTypography variant="h6">{money(customer.debtLimit)}</SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        Ghi chú
                      </SoftTypography>
                      <SoftTypography variant="button" display="block">
                        {customer.note || "Không có ghi chú"}
                      </SoftTypography>
                    </Grid>
                  </Grid>
                )}
                {tab === 1 && (
                  <DataTable
                    headers={["Mã hóa đơn", "Ngày", "Tổng tiền", "Đã thanh toán", "Trạng thái"]}
                    rows={customer.invoices.map((item) => [
                      item.code,
                      dateTime(item.createdAt || item.date),
                      money(item.total),
                      money(item.paid),
                      item.status === "PAID"
                        ? badge("Đã thanh toán", "#388E3C", "#E8F5E9")
                        : item.status === "PARTIAL"
                        ? badge("Một phần", "#E65100", "#FFF3E0")
                        : badge("Chưa thanh toán", "#C62828", "#FFEBEE"),
                    ])}
                  />
                )}
                {tab === 2 && (
                  <DataTable
                    headers={["Mã voucher", "Chương trình", "Ưu đãi", "Hết hạn", "Trạng thái"]}
                    rows={customer.vouchers.map((item) => [
                      item.code,
                      item.campaign,
                      item.benefit,
                      item.expiresAt,
                      item.status === "ACTIVE"
                        ? badge("Có thể dùng", "#388E3C", "#E8F5E9")
                        : badge("Đã sử dụng", "#6B7280", "#F3F4F6"),
                    ])}
                  />
                )}
                {tab === 3 && (
                  <DataTable
                    headers={[
                      "Mã kích hoạt",
                      "Chương trình",
                      "Hóa đơn",
                      "Ngày kích hoạt",
                      "Trạng thái",
                    ]}
                    rows={activations.map((item) => [
                      <SoftTypography variant="button" fontWeight="bold" color="secondary">
                        {item.code}
                      </SoftTypography>,
                      item.promotionName,
                      item.invoiceCode,
                      dateTime(item.activatedAt),
                      item.status === "ACTIVE"
                        ? badge("Đang hoạt động", "#388E3C", "#E8F5E9")
                        : badge(
                            item.status === "CANCELLED" ? "Đã hủy" : "Đã thu hồi",
                            "#6B7280",
                            "#F3F4F6"
                          ),
                    ])}
                  />
                )}
                {tab === 4 && (
                  <DebtPaymentHistory
                    customerId={customerId}
                    refreshKey={debtRefreshKey}
                    onChanged={async () => {
                      await loadDetail();
                      setDebtRefreshKey((value) => value + 1);
                    }}
                  />
                )}
                {tab === 5 && (
                  <CustomerDebtHistory
                    customerId={customerId}
                    refreshKey={debtRefreshKey}
                  />
                )}
                {tab === 6 && (
                  <Suspense
                    fallback={
                      <SoftBox py={6} textAlign="center">
                        <SoftTypography variant="button" color="text">
                          Đang tải bản đồ cửa tiệm...
                        </SoftTypography>
                      </SoftBox>
                    }
                  >
                    <CustomerStoreProfile
                      customer={customer}
                      readOnly={readOnly}
                      onSaved={loadDetail}
                    />
                  </Suspense>
                )}
                {tab === 7 && (
                  <DataTable
                    headers={[
                      "Ngày",
                      "Tình trạng Zalo",
                      "Tình trạng hóa đơn",
                      "Tương tác",
                      "Số điện thoại",
                      "Note",
                    ]}
                    rows={customer.interactions.map((item) => [
                      dateTime(item.occurredAt || item.at),
                      item.zaloStatus === "CONNECTED"
                        ? badge("Đã kết bạn", "#2E7D32", "#E8F5E9")
                        : item.zaloStatus === "NOT_CONNECTED"
                        ? badge("Chưa kết bạn", "#6B7280", "#F3F4F6")
                        : item.channel || "—",
                      item.invoiceStatus === "SENT"
                        ? badge("Đã gửi", "#4338CA", "#EDE9FE")
                        : item.invoiceStatus === "NOT_SENT"
                        ? badge("Không gửi", "#475569", "#E2E8F0")
                        : "—",
                      item.interaction || item.action || "—",
                      item.phone || customer.phone || "—",
                      item.note || item.result || "—",
                    ])}
                  />
                )}
              </SoftBox>
            </Card>
            <Modal open={interactionOpen} onClose={() => setInteractionOpen(false)}>
              <SoftBox
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: { xs: "90%", md: 480 },
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  boxShadow: 24,
                  p: 3,
                }}
              >
                <SoftTypography variant="h6" fontWeight="bold" mb={2}>
                  Ghi nhận tương tác
                </SoftTypography>
                <SoftTypography variant="caption">Kênh tương tác</SoftTypography>
                <FormControl fullWidth size="small">
                  <Select
                    value={interaction.channel}
                    onChange={(e) =>
                      setInteraction((value) => ({ ...value, channel: e.target.value }))
                    }
                  >
                    <MenuItem value="Zalo">Zalo</MenuItem>
                    <MenuItem value="Điện thoại">Điện thoại</MenuItem>
                    <MenuItem value="Email">Email</MenuItem>
                    <MenuItem value="SMS">SMS</MenuItem>
                    <MenuItem value="Trực tiếp">Trực tiếp</MenuItem>
                  </Select>
                </FormControl>
                <SoftBox mt={2}>
                  <SoftTypography variant="caption">Nội dung *</SoftTypography>
                  <SoftInput
                    value={interaction.action}
                    onChange={(e) =>
                      setInteraction((value) => ({ ...value, action: e.target.value }))
                    }
                    fullWidth
                  />
                </SoftBox>
                <SoftBox mt={2}>
                  <SoftTypography variant="caption">Kết quả</SoftTypography>
                  <SoftInput
                    value={interaction.result}
                    onChange={(e) =>
                      setInteraction((value) => ({ ...value, result: e.target.value }))
                    }
                    fullWidth
                  />
                </SoftBox>
                <SoftBox display="flex" gap={1} mt={3}>
                  <SoftButton
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    onClick={() => setInteractionOpen(false)}
                  >
                    Hủy
                  </SoftButton>
                  <SoftButton
                    variant="gradient"
                    color="info"
                    fullWidth
                    disabled={savingInteraction}
                    onClick={saveInteraction}
                  >
                    {savingInteraction ? "Đang lưu..." : "Lưu tương tác"}
                  </SoftButton>
                </SoftBox>
              </SoftBox>
            </Modal>
            <DebtPaymentModal
              open={debtPaymentOpen}
              customer={customer}
              onClose={() => setDebtPaymentOpen(false)}
              onCreated={async () => {
                await loadDetail();
                setDebtRefreshKey((value) => value + 1);
                setTab(4);
              }}
            />
          </>
        )}
      </SoftBox>
    </Modal>
  );
}

function DataTable({ headers, rows }) {
  return (
    <SoftBox sx={{ width: "100%", maxWidth: "100%", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse", tableLayout: "auto" }}>
        <thead>
          <tr style={{ background: "#F8F9FA" }}>
            {headers.map((item) => (
              <th
                key={item}
                style={{ padding: 10, textAlign: "left", fontSize: 12, color: "#6B7280" }}
              >
                {item}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={headers.length}
                style={{ textAlign: "center", padding: 24, color: "#9E9E9E" }}
              >
                Chưa có dữ liệu
              </td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ padding: 10, fontSize: 13 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </SoftBox>
  );
}

export default function KhachHang() {
  const isStaff = useSelector((state) => state.auth?.user?.role === "staff");
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [segment, setSegment] = useState("");
  const [source, setSource] = useState("");
  const [zalo, setZalo] = useState("");
  const [debtWarning, setDebtWarning] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [meta, setMeta] = useState({ totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [importing, setImporting] = useState(false);
  const [interactionImporting, setInteractionImporting] = useState(false);
  const [interactionExporting, setInteractionExporting] = useState(false);
  const importInputRef = useRef(null);
  const interactionImportInputRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(1), [debouncedSearch, segment, source, zalo, debtWarning]);
  const load = () => {
    setLoading(true);
    Promise.all([
      CustomerService.getAll({
        search: debouncedSearch || undefined,
        segment: segment || undefined,
        source: source || undefined,
        zaloConnected: zalo || undefined,
        debtWarning: debtWarning || undefined,
        page,
        limit: 20,
      }),
      CustomerService.getSummary(),
    ])
      .then(([listResponse, summaryResponse]) => {
        const nextCustomers = Array.isArray(listResponse.data?.data) ? listResponse.data.data : [];
        setCustomers((current) => (isStaff && page > 1 ? [...current, ...nextCustomers] : nextCustomers));
        setMeta(listResponse.data?.meta || { totalPages: 1, totalItems: 0 });
        setSummary(summaryResponse.data?.data || {});
      })
      .catch((error) => {
        setCustomers([]);
        toast.error(error.response?.data?.message || "Không thể tải danh sách khách hàng");
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, debouncedSearch, segment, source, zalo, debtWarning, refreshKey, isStaff]);
  const refresh = (firstPage = false) => {
    if (firstPage) setPage(1);
    setRefreshKey((value) => value + 1);
  };
  const handleExport = async () => {
    try {
      const response = await CustomerService.exportExcel();
      downloadBlob(response.data, `customers-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xuất danh sách khách hàng");
    }
  };
  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const rows = (await readExcelFile(file)).map(normalizeImportPhones);
      if (rows.length > 10000) throw new Error("Mỗi lần chỉ được import tối đa 10.000 dòng");
      const result = await importCustomerBatches(rows);
      toast.success(
        `Import ${result.totalRows || 0} dòng: thêm ${result.created || 0}, cập nhật ${
          result.updated || 0
        }, lịch sử công nợ ${result.debtLedgersCreated || 0}, chấp nhận ${
          result.duplicatePhonesAccepted || 0
        } số điện thoại trùng, lỗi ${result.failed || 0}`
      );
      if (result.errors?.length)
        exportExcel(
          result.errors.map((error) => ({
            Dòng: error.row,
            "Lỗi import": error.message,
            "Dữ liệu": JSON.stringify(error.data || {}),
          })),
          `loi-import-khach-hang-${Date.now()}.xlsx`,
          "Loi import"
        );
      refresh(true);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Không thể import file Excel");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };
  const handleInteractionImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setInteractionImporting(true);
      const parsedRows = (await readExcelFile(file)).map(normalizeInteractionRow);
      if (!parsedRows.length) throw new Error("File không có dữ liệu tương tác");
      if (parsedRows.length > 10000)
        throw new Error("Mỗi lần chỉ được import tối đa 10.000 dòng");
      const localErrors = [];
      const validRows = parsedRows.filter((row) => {
        if (!row.customerCode) {
          localErrors.push({ row: row.rowNumber, message: "Thiếu mã khách hàng", data: row });
          return false;
        }
        if (!row.occurredAt) {
          localErrors.push({
            row: row.rowNumber,
            message: "Ngày không hợp lệ hoặc đang để trống",
            data: row,
          });
          return false;
        }
        if (
          !row.zaloStatus &&
          !row.invoiceStatus &&
          !row.interaction &&
          !row.note
        ) {
          localErrors.push({
            row: row.rowNumber,
            message: "Dòng chưa có nội dung hoặc trạng thái tương tác",
            data: row,
          });
          return false;
        }
        return true;
      });
      const result = validRows.length
        ? await importInteractionBatches(validRows)
        : {
            totalRows: 0,
            imported: 0,
            created: 0,
            updated: 0,
            zaloUpdated: 0,
            duplicatesSkipped: 0,
            failed: 0,
            errors: [],
          };
      const errors = [...localErrors, ...(result.errors || [])];
      toast.success(
        `Import tương tác: thành công ${
          result.imported || result.created || result.updated || 0
        }, cập nhật Zalo ${result.zaloUpdated || 0}, bỏ qua trùng ${
          result.duplicatesSkipped || 0
        }, lỗi ${errors.length}`
      );
      if (errors.length) {
        exportExcel(
          errors.map((error) => ({
            Dòng: error.row,
            "Lỗi import": error.message,
            "Mã khách hàng": error.data?.customerCode || "",
            "Tên khách hàng": error.data?.customerName || "",
            "Ngày": error.data?.originalDate || error.data?.occurredAt || "",
            "Dữ liệu": JSON.stringify(error.data || {}),
          })),
          `loi-import-tuong-tac-khach-hang-${Date.now()}.xlsx`,
          "Lỗi import"
        );
      }
      refresh(true);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Không thể import tình hình tương tác khách hàng"
      );
    } finally {
      setInteractionImporting(false);
      event.target.value = "";
    }
  };
  const handleInteractionExport = async () => {
    try {
      setInteractionExporting(true);
      const response = await CustomerService.exportInteractions();
      downloadBlob(
        response.data,
        `tinh-hinh-tuong-tac-khach-hang-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Không thể export tình hình tương tác khách hàng"
      );
    } finally {
      setInteractionExporting(false);
    }
  };
  const downloadInteractionTemplate = () => {
    const displayDate = new Date().toLocaleDateString("vi-VN");
    exportExcel(
      [
        {
          "MÃ KHÁCH HÀNG": "KH001",
          "TÊN KHÁCH HÀNG": "KHÁCH HÀNG MẪU",
          "TÌNH TRẠNG ZALO": "ĐÃ KẾT BẠN",
          "TÌNH TRẠNG HOÁ ĐƠN": "ĐÃ GỬI",
          "TƯƠNG TÁC": "Khách đã nhận hóa đơn",
          "#": "",
          "SỐ ĐIỆN THOẠI": "0901234567",
          NOTE: "Ghi chú mẫu",
          NGÀY: displayDate,
        },
      ],
      "mau-import-tuong-tac-khach-hang.xlsx",
      "Tương tác khách hàng"
    );
  };
  return (
    <DashboardLayout compactMobile={isStaff}>
      {!isStaff && <DashboardNavbar />}
      {isStaff && <StaffMobileHeader title="Khách hàng" subtitle="Danh bạ và hồ sơ khách hàng" onRefresh={() => refresh()} />}
      <SoftBox py={{ xs: isStaff ? 1 : 3, md: 3 }} pb={{ xs: isStaff ? 10 : 3, md: 3 }} sx={{ bgcolor: { xs: isStaff ? "#f0f2f5" : "transparent", md: "transparent" }, minHeight: "100vh" }}>
        <SoftBox display="flex" gap={{ xs: 1, md: 2 }} mb={{ xs: 1, md: 3 }} flexWrap={{ xs: isStaff ? "nowrap" : "wrap", md: "wrap" }} sx={{ overflowX: { xs: "auto", md: "visible" }, px: { xs: isStaff ? 1.5 : 0, md: 0 }, scrollbarWidth: "none" }}>
          {[
            ["Tổng khách hàng", summary.totalCustomers || 0, "groups", "#1565C0"],
            ["Đã kết bạn Zalo", summary.zaloConnected || 0, "chat", "#2E7D32"],
            ["Khách lead", summary.leads || 0, "person_add", "#7B1FA2"],
            ["Cảnh báo công nợ", summary.debtWarnings || 0, "warning", "#C62828"],
          ].map(([label, value, icon, color]) => (
            <Card key={label} sx={{ flex: 1, minWidth: { xs: isStaff ? 145 : 180, md: 180 }, borderRadius: { xs: isStaff ? 2 : undefined, md: undefined }, boxShadow: { xs: isStaff ? "none" : undefined, md: undefined } }}>
              <SoftBox p={{ xs: isStaff ? 1.5 : 2.5, md: 2.5 }} display="flex" gap={1.25} alignItems="center">
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
        <Card sx={{ borderRadius: { xs: isStaff ? 0 : undefined, md: undefined }, boxShadow: { xs: isStaff ? "none" : undefined, md: undefined } }}>
          <SoftBox p={{ xs: isStaff ? 2 : 3, md: 3 }}>
            <SoftBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
              flexWrap="wrap"
              gap={2}
            >
              <SoftBox sx={{ display: { xs: isStaff ? "none" : "block", md: "block" } }}>
                <SoftTypography variant="h5" fontWeight="bold">
                  Quản lý khách hàng
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Hồ sơ 360°, công nợ, hóa đơn và tương tác
                </SoftTypography>
              </SoftBox>
              {!isStaff && <SoftBox display="flex" gap={1} flexWrap="wrap">
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                  style={{ display: "none" }}
                />
                <SoftButton
                  color="info"
                  variant="outlined"
                  startIcon={<Icon>upload_file</Icon>}
                  disabled={importing}
                  onClick={() => importInputRef.current?.click()}
                >
                  {importing ? "Đang import..." : "Import khách hàng"}
                </SoftButton>
                <SoftButton
                  color="success"
                  variant="outlined"
                  startIcon={<Icon>download</Icon>}
                  onClick={handleExport}
                >
                  Export khách hàng
                </SoftButton>
                <input
                  ref={interactionImportInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleInteractionImport}
                  style={{ display: "none" }}
                />
                <SoftBox
                  display="flex"
                  gap={0.75}
                  flexWrap="wrap"
                  p={0.6}
                  borderRadius={2}
                  bgcolor="#f3f8ff"
                  sx={{ border: "1px solid #bbdefb" }}
                >
                  <SoftButton
                    color="secondary"
                    variant="text"
                    size="small"
                    startIcon={<Icon>description</Icon>}
                    onClick={downloadInteractionTemplate}
                  >
                    File mẫu tương tác
                  </SoftButton>
                  <SoftButton
                    color="info"
                    variant="outlined"
                    size="small"
                    startIcon={<Icon>upload_file</Icon>}
                    disabled={interactionImporting}
                    onClick={() => interactionImportInputRef.current?.click()}
                  >
                    {interactionImporting ? "Đang import..." : "Import tương tác"}
                  </SoftButton>
                  <SoftButton
                    color="success"
                    variant="outlined"
                    size="small"
                    startIcon={<Icon>download</Icon>}
                    disabled={interactionExporting}
                    onClick={handleInteractionExport}
                  >
                    {interactionExporting ? "Đang export..." : "Export tương tác"}
                  </SoftButton>
                </SoftBox>
                <SoftButton
                  color="info"
                  variant="gradient"
                  startIcon={<Icon>person_add</Icon>}
                  onClick={() => {
                    setSelected(null);
                    setFormOpen(true);
                  }}
                >
                  Thêm khách hàng
                </SoftButton>
              </SoftBox>}
            </SoftBox>
            <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
              <SoftBox sx={{ flex: 1, minWidth: 230 }}>
                <SoftInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm mã, tên, số điện thoại..."
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <FormControl size="small" sx={{ minWidth: 150, display: { xs: isStaff ? "none" : "inline-flex", md: "inline-flex" } }}>
                <Select displayEmpty value={segment} onChange={(e) => setSegment(e.target.value)}>
                  <MenuItem value="">Mọi phân loại</MenuItem>
                  {CUSTOMER_SEGMENTS.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150, display: { xs: isStaff ? "none" : "inline-flex", md: "inline-flex" } }}>
                <Select displayEmpty value={source} onChange={(e) => setSource(e.target.value)}>
                  <MenuItem value="">Mọi nguồn</MenuItem>
                  <MenuItem value="LEAD">Khách lead</MenuItem>
                  <MenuItem value="LEGACY">Khách cũ</MenuItem>
                  <MenuItem value="NEW">Khách mới</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150, display: { xs: isStaff ? "none" : "inline-flex", md: "inline-flex" } }}>
                <Select displayEmpty value={zalo} onChange={(e) => setZalo(e.target.value)}>
                  <MenuItem value="">Mọi trạng thái Zalo</MenuItem>
                  <MenuItem value="true">Đã kết bạn Zalo</MenuItem>
                  <MenuItem value="false">Chưa kết bạn</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 190, display: { xs: isStaff ? "none" : "inline-flex", md: "inline-flex" } }}>
                <Select
                  displayEmpty
                  value={debtWarning}
                  onChange={(e) => setDebtWarning(e.target.value)}
                >
                  <MenuItem value="">Mọi trạng thái công nợ</MenuItem>
                  <MenuItem value="true">Có cảnh báo công nợ</MenuItem>
                </Select>
              </FormControl>
            </SoftBox>
            {isStaff && <SoftBox display={{ xs: "block", md: "none" }}>
              {customers.map((item) => {
                const warning = item.debtLimit > 0 && item.debt >= item.debtLimit;
                return <SoftBox key={item.id || item._id} py={1.5} display="flex" gap={1.5} alignItems="center" onClick={() => setDetailId(item.id || item._id)} sx={{ borderBottom: "1px solid #edf0f5", cursor: "pointer" }}>
                  <SoftBox width={44} height={44} borderRadius="50%" bgcolor="#e7f3ff" color="#1877f2" display="flex" alignItems="center" justifyContent="center" flexShrink={0}><Icon>person</Icon></SoftBox>
                  <SoftBox flex={1} minWidth={0}>
                    <SoftBox display="flex" alignItems="center" gap={0.75}>
                      <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                        {item.name}
                      </SoftTypography>
                      {item.zaloConnected && (
                        <SoftTypography
                          variant="caption"
                          fontWeight="bold"
                          sx={{
                            color: "#0068ff",
                            bgcolor: "#e7f3ff",
                            px: 0.75,
                            py: 0.15,
                            borderRadius: 1,
                          }}
                        >
                          Zalo
                        </SoftTypography>
                      )}
                    </SoftBox>
                    <SoftTypography variant="caption" color="text">
                      {item.code} · {item.phone}
                    </SoftTypography>
                    <CustomerStoreTags customer={item} />
                    <SoftTypography
                      variant="caption"
                      display="block"
                      mt={0.35}
                      sx={{ color: warning ? "#c62828" : "#65676b" }}
                    >
                      Công nợ {money(item.debt)} / {money(item.debtLimit)}
                    </SoftTypography>
                  </SoftBox>
                  <Icon>chevron_right</Icon>
                </SoftBox>;
              })}
            </SoftBox>}
            <SoftBox sx={{ overflowX: "auto", display: { xs: isStaff ? "none" : "block", md: "block" } }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {[
                      "Khách hàng",
                      "Liên hệ",
                      "Nguồn",
                      "Phân loại",
                      "Zalo",
                      "Công nợ / Hạn mức",
                      "Ngày tạo",
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
                      <td colSpan={8} style={{ padding: 30, textAlign: "center" }}>
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loading && customers.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        style={{ padding: 30, textAlign: "center", color: "#9E9E9E" }}
                      >
                        Không tìm thấy khách hàng
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    customers.map((item) => {
                      const warning = item.debtLimit > 0 && item.debt >= item.debtLimit;
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: 10 }}>
                            <SoftTypography variant="button" fontWeight="bold">
                              {item.name}
                            </SoftTypography>
                            <SoftTypography variant="caption" display="block" color="text">
                              {item.code}
                            </SoftTypography>
                            <CustomerStoreTags customer={item} />
                          </td>
                          <td style={{ padding: 10, fontSize: 13 }}>
                            {item.phone}
                            <br />
                            <span style={{ color: "#6B7280" }}>{item.email || "—"}</span>
                          </td>
                          <td style={{ padding: 10 }}>
                            {badge(
                              item.sourceLabel ||
                                CUSTOMER_SOURCE_LABELS[item.source] ||
                                item.source,
                              "#1565C0",
                              "#E3F2FD"
                            )}
                          </td>
                          <td style={{ padding: 10 }}>
                            {badge(
                              CUSTOMER_SEGMENT_LABELS[item.segment] || item.segment,
                              "#6A1B9A",
                              "#F3E5F5"
                            )}
                          </td>
                          <td style={{ padding: 10 }}>
                            {item.zaloConnected
                              ? badge("Đã kết bạn", "#2E7D32", "#E8F5E9")
                              : badge("Chưa kết bạn", "#6B7280", "#F3F4F6")}
                          </td>
                          <td
                            style={{
                              padding: 10,
                              fontSize: 13,
                              color: warning ? "#C62828" : "inherit",
                              fontWeight: warning ? 700 : 400,
                            }}
                          >
                            {money(item.debt)}
                            <br />
                            <span style={{ fontSize: 11, color: "#6B7280" }}>
                              / {money(item.debtLimit)}
                            </span>
                            {warning && <Icon sx={{ fontSize: 16, ml: 0.5 }}>warning</Icon>}
                          </td>
                          <td style={{ padding: 10, fontSize: 13 }}>
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString("vi-VN")
                              : "—"}
                          </td>
                          <td style={{ padding: 10 }}>
                            <Tooltip title="Xem hồ sơ 360°">
                              <IconButton onClick={() => setDetailId(item.id)}>
                                <Icon color="info">visibility</Icon>
                              </IconButton>
                            </Tooltip>
                            {!isStaff && <Tooltip title="Chỉnh sửa">
                              <IconButton
                                onClick={() => {
                                  setSelected(item);
                                  setFormOpen(true);
                                }}
                              >
                                <Icon color="info">edit</Icon>
                              </IconButton>
                            </Tooltip>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </SoftBox>
            {isStaff && <MobileLoadMore loading={loading} hasMore={page < (meta.totalPages || 1)} onLoadMore={() => setPage((value) => value + 1)} />}
            {!isStaff && meta.totalPages > 1 && (
              <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
                <SoftTypography variant="caption" color="text">
                  Tổng {meta.totalItems} khách hàng
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
      <CustomerForm
        open={formOpen}
        customer={selected}
        onClose={() => setFormOpen(false)}
        onSaved={(created) => refresh(created)}
      />
      <CustomerDetail
        customerId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        readOnly={isStaff}
        onEdit={(customer) => {
          setDetailId(null);
          setSelected(customer);
          setFormOpen(true);
        }}
      />
    </DashboardLayout>
  );
}
