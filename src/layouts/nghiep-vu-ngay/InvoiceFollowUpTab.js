import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import { toast } from "react-toastify";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { CustomerService, DebtPaymentService } from "services/crmService";
import { InvoiceService } from "services/warehouseService";
import CustomerReturnService from "services/customerReturnService";
import {
  customerReturnToInvoice,
  debtPaymentToInvoice,
  saveInvoiceImage,
} from "utils/invoicePrint";
import { downloadInvoiceFollowUpImage } from "utils/invoiceFollowUpImage";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const rowKey = (row) => row?.draftId || row?.invoiceId || row?.id || "";
const documentKey = (row) => {
  const id = row?.documentId || row?.invoiceId;
  const type = row?.documentType || (row?.invoiceId ? "INVOICE" : "");
  return id ? `${type || "DOCUMENT"}:${String(id)}` : "";
};
const documentCodeKey = (row) => {
  const code = String(row?.documentCode || row?.invoiceCode || "")
    .trim()
    .toUpperCase();
  return code ? `CODE:${code}` : "";
};
const customerKey = (row) => {
  if (row?.customerId) return `ID:${String(row.customerId)}`;
  if (row?.customerCode) return `CODE:${String(row.customerCode).trim().toUpperCase()}`;
  const phone = String(row?.phone || "").replace(/\D/g, "");
  if (phone) return `PHONE:${phone}`;
  const name = normalizeSearch(row?.customerName);
  return name ? `NAME:${name}` : "";
};
const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
const normalizeSearch = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
const timeText = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "Chưa cập nhật";

const selectSx = {
  minWidth: 132,
  height: 34,
  fontSize: 13,
  bgcolor: "#fff",
  "& .MuiSelect-select": { py: 0.75, px: 1 },
};
const selectTones = {
  CONNECTED: { color: "#1b5e20", background: "#e8f5e9", border: "#81c784" },
  NOT_CONNECTED: { color: "#b45309", background: "#fff8e1", border: "#f6c453" },
  SENT: { color: "#1b5e20", background: "#e8f5e9", border: "#81c784" },
  NOT_SENT: { color: "#b45309", background: "#fff8e1", border: "#f6c453" },
  DO_NOT_SEND: { color: "#475569", background: "#f1f5f9", border: "#94a3b8" },
  ZALO: { color: "#1565c0", background: "#e3f2fd", border: "#64b5f6" },
  PHONE: { color: "#6a1b9a", background: "#f3e5f5", border: "#ba68c8" },
  SMS: { color: "#00695c", background: "#e0f2f1", border: "#4db6ac" },
  NONE: { color: "#64748b", background: "#f8fafc", border: "#cbd5e1" },
  INTERACTED: { color: "#1b5e20", background: "#e8f5e9", border: "#81c784" },
  CANCELLED: { color: "#b91c1c", background: "#ffebee", border: "#ef9a9a" },
  WAITING: { color: "#b45309", background: "#fff8e1", border: "#f6c453" },
  CONTACT_AGAIN: { color: "#6a1b9a", background: "#f3e5f5", border: "#ba68c8" },
};
const interactionTone = (value) =>
  ({
    "Có tương tác": selectTones.INTERACTED,
    "Khách hủy kết bạn": selectTones.CANCELLED,
    "Đã xem, chưa phản hồi": selectTones.WAITING,
    "Cần liên hệ lại": selectTones.CONTACT_AGAIN,
  }[value] || selectTones.NONE);
const statusSelectSx = (tone = selectTones.NONE) => ({
  ...selectSx,
  width: "100%",
  minWidth: 0,
  height: 32,
  color: `${tone.color} !important`,
  backgroundColor: `${tone.background} !important`,
  fontWeight: 700,
  transition: "background-color 150ms ease, border-color 150ms ease",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: tone.border },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: tone.color },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: tone.color,
    borderWidth: 2,
  },
  "& .MuiSelect-icon": { color: tone.color },
  "& .MuiSelect-select": {
    py: "4px !important",
    px: "7px !important",
    color: `${tone.color} !important`,
    backgroundColor: `${tone.background} !important`,
  },
});
const statusValue = (label, tone = selectTones.NONE) => (
  <SoftBox
    component="span"
    display="flex"
    alignItems="center"
    gap={0.65}
    minWidth={0}
    sx={{ color: `${tone.color} !important`, fontWeight: "700 !important" }}
  >
    <SoftBox
      component="span"
      width={8}
      height={8}
      borderRadius="50%"
      sx={{ bgcolor: tone.color, flexShrink: 0 }}
    />
    <SoftBox component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
      {label}
    </SoftBox>
  </SoftBox>
);
const statusMenuSx = (tone = selectTones.NONE) => ({
  color: tone.color,
  "&.Mui-selected": { bgcolor: `${tone.background} !important` },
  "&.Mui-selected:hover": { bgcolor: `${tone.background} !important` },
});
const draftFieldSx = {
  "& .MuiInputBase-root": {
    display: "flex !important",
    alignItems: "center !important",
    minHeight: 44,
    height: 44,
    padding: "10px 12px !important",
    borderRadius: "10px !important",
  },
  "& .MuiInputBase-input": {
    width: "100% !important",
    height: "20px !important",
    minHeight: "20px !important",
    padding: "0 !important",
    fontSize: "14px !important",
    lineHeight: "20px !important",
  },
  "& .MuiSelect-select": {
    display: "flex !important",
    alignItems: "center !important",
    minHeight: "20px !important",
    padding: "0 28px 0 0 !important",
    fontSize: "14px !important",
    lineHeight: "20px !important",
  },
  "& .MuiSelect-icon": { display: "block", right: 10, color: "#64748b" },
  "& .MuiFormHelperText-root": {
    margin: "6px 2px 0 !important",
    fontSize: "12px !important",
    lineHeight: "17px !important",
  },
};
const draftAutocompleteSx = {
  ...draftFieldSx,
  "& .MuiOutlinedInput-root": {
    display: "flex !important",
    alignItems: "center !important",
    minHeight: 44,
    height: 44,
    padding: "8px 42px 8px 12px !important",
    borderRadius: "10px !important",
  },
  "& .MuiOutlinedInput-root .MuiAutocomplete-input": {
    width: "100% !important",
    height: "20px !important",
    padding: "0 !important",
    fontSize: "14px !important",
    lineHeight: "20px !important",
  },
};
const draftMultilineSx = {
  ...draftFieldSx,
  "& .MuiInputBase-root.MuiInputBase-multiline": {
    display: "flex !important",
    alignItems: "flex-start !important",
    minHeight: 96,
    height: "auto",
    padding: "12px !important",
  },
  "& textarea.MuiInputBase-input": {
    height: "auto !important",
    minHeight: "68px !important",
    fontSize: "14px !important",
    lineHeight: "21px !important",
  },
};
const documentLabels = {
  INVOICE: "Hóa đơn bán hàng",
  DEBT_PAYMENT: "Phiếu thu công nợ",
  CUSTOMER_RETURN: "Phiếu hoàn hàng",
};
const interactionChannelLabels = {
  ZALO: "Zalo",
  PHONE: "Gọi điện",
  SMS: "SMS",
};
const invoiceStatusLabels = {
  SENT: "Đã gửi",
  NOT_SENT: "Chưa gửi",
  DO_NOT_SEND: "Không gửi",
};
const emptyDraftForm = {
  customerMode: "EXISTING",
  customerId: "",
  customerCode: "",
  customerName: "",
  phone: "",
  invoiceCode: "",
  zaloStatus: "NOT_CONNECTED",
  invoiceStatus: "NOT_SENT",
  interactionChannel: "ZALO",
  interaction: "",
  note: "",
};

export default function InvoiceFollowUpTab() {
  const [date, setDate] = useState(today());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState([]);
  const [dirtyIds, setDirtyIds] = useState([]);
  const [history, setHistory] = useState(null);
  const [book, setBook] = useState({ isFinalized: false });
  const [customerOptions, setCustomerOptions] = useState([]);
  const [draftDialog, setDraftDialog] = useState(null);
  const [draftForm, setDraftForm] = useState(emptyDraftForm);
  const [savingDraft, setSavingDraft] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconciliation, setReconciliation] = useState(null);
  const customerLookupTimer = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await CustomerService.getInvoiceFollowUps({ date });
      const payload = response?.data || {};
      setData(Array.isArray(payload.data) ? payload.data : []);
      setSummary(payload.summary || {});
      setBook(payload.book || { isFinalized: false });
      setDirtyIds([]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải danh sách theo dõi hóa đơn");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const lookupCustomers = (value = "") => {
    window.clearTimeout(customerLookupTimer.current);
    customerLookupTimer.current = window.setTimeout(async () => {
      try {
        const response = await CustomerService.getAll({
          search: value.trim() || undefined,
          page: 1,
          limit: 20,
        });
        setCustomerOptions(listOf(response));
      } catch (_error) {
        setCustomerOptions([]);
      }
    }, 250);
  };

  const reconcileInvoices = async () => {
    try {
      setReconciling(true);
      const response = await CustomerService.getInvoiceFollowUps({ date });
      const payload = response?.data || {};
      const freshRows = Array.isArray(payload.data) ? payload.data : [];
      const sourceRows = freshRows.filter((row) => documentKey(row));
      const currentDocumentKeys = new Set(data.map(documentKey).filter(Boolean));
      const currentDocumentCodeKeys = new Set(data.map(documentCodeKey).filter(Boolean));
      const freshDocumentKeys = new Set(sourceRows.map(documentKey).filter(Boolean));
      const freshDocumentCodeKeys = new Set(sourceRows.map(documentCodeKey).filter(Boolean));
      const freshCustomerKeys = new Set(sourceRows.map(customerKey).filter(Boolean));
      const missingRows = sourceRows.filter((row) => {
        const key = documentKey(row);
        const codeKey = documentCodeKey(row);
        return !currentDocumentKeys.has(key) && (!codeKey || !currentDocumentCodeKeys.has(codeKey));
      });
      const withoutInvoiceMap = new Map();
      data.forEach((row) => {
        const key = documentKey(row);
        const codeKey = documentCodeKey(row);
        const ownerKey = customerKey(row);
        const hasDocument =
          (key && freshDocumentKeys.has(key)) ||
          (codeKey && freshDocumentCodeKeys.has(codeKey)) ||
          (ownerKey && freshCustomerKeys.has(ownerKey));
        if (!hasDocument && ownerKey && !withoutInvoiceMap.has(ownerKey))
          withoutInvoiceMap.set(ownerKey, row);
      });
      setReconciliation({
        currentCount: data.length,
        missingRows,
        withoutInvoiceRows: [...withoutInvoiceMap.values()],
        summary: payload.summary || {},
        book: payload.book || book,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đối chiếu hóa đơn trong ngày");
    } finally {
      setReconciling(false);
    }
  };

  const applyReconciliation = () => {
    if (!reconciliation) return;
    setData((current) => {
      const documentKeys = new Set(current.map(documentKey).filter(Boolean));
      const codeKeys = new Set(current.map(documentCodeKey).filter(Boolean));
      const additions = reconciliation.missingRows.filter((row) => {
        const key = documentKey(row);
        const codeKey = documentCodeKey(row);
        return !documentKeys.has(key) && (!codeKey || !codeKeys.has(codeKey));
      });
      return [...current, ...additions];
    });
    setSummary(reconciliation.summary);
    setBook(reconciliation.book);
    const added = reconciliation.missingRows.length;
    toast.success(
      added
        ? `Đã bổ sung ${added} chứng từ còn thiếu, các dòng hiện có được giữ nguyên`
        : "Đã đối chiếu, không phát hiện chứng từ bị thiếu"
    );
    setReconciliation(null);
  };

  const visibleRows = useMemo(() => {
    const keywords = normalizeSearch(search).split(" ").filter(Boolean);
    return data.filter((row) => {
      if (filter === "NOT_SENT" && row.invoiceStatus !== "NOT_SENT") return false;
      if (filter === "DO_NOT_SEND" && row.invoiceStatus !== "DO_NOT_SEND") return false;
      if (filter === "FOLLOW_UP" && !row.needsFollowUp) return false;
      if (filter === "INTERACTED" && !row.interaction) return false;
      if (!keywords.length) return true;
      const haystack = normalizeSearch(
        [row.customerCode, row.customerName, row.phone, row.invoiceCode, row.salespersonName].join(
          " "
        )
      );
      const compactHaystack = haystack.replace(/\s/g, "");
      return keywords.every(
        (keyword) =>
          haystack.includes(keyword) || compactHaystack.includes(keyword.replace(/\s/g, ""))
      );
    });
  }, [data, filter, search]);
  const currentSummary = useMemo(
    () => ({
      total: data.length || summary.total || 0,
      sourceInvoiceCount: summary.sourceInvoiceCount || 0,
      debtPaymentCount: summary.debtPaymentCount || 0,
      customerReturnCount: summary.customerReturnCount || 0,
      sourceDocumentCount: summary.sourceDocumentCount || 0,
      trackedInvoiceCount: summary.trackedInvoiceCount || 0,
      manualCount: summary.manualCount || 0,
      sent: data.filter((row) => row.invoiceStatus === "SENT").length,
      notSent: data.filter((row) => row.invoiceStatus === "NOT_SENT").length,
      doNotSend: data.filter((row) => row.invoiceStatus === "DO_NOT_SEND").length,
      needsFollowUp: data.filter((row) => row.needsFollowUp).length,
    }),
    [
      data,
      summary.customerReturnCount,
      summary.debtPaymentCount,
      summary.manualCount,
      summary.sourceDocumentCount,
      summary.sourceInvoiceCount,
      summary.total,
      summary.trackedInvoiceCount,
    ]
  );

  const edit = (id, key, value, autoSave = false) => {
    if (book.isFinalized) return;
    const next = data.map((row) => (rowKey(row) === id ? { ...row, [key]: value } : row));
    setData(next);
    setDirtyIds((current) => [...new Set([...current, id])]);
    if (autoSave) {
      const changed = next.find((row) => rowKey(row) === id);
      if (!changed?.isNew) save(changed);
    }
  };

  const selectCustomer = (id, customer) => {
    if (book.isFinalized) return;
    const isNewCustomer = !customer || customer.id === "__NEW__";
    setData((current) =>
      current.map((row) =>
        rowKey(row) === id
          ? {
              ...row,
              customerId: isNewCustomer ? "" : customer.id || customer._id,
              customerCode: isNewCustomer ? "" : customer.code || "",
              customerName: isNewCustomer ? "" : customer.name || "",
              phone: isNewCustomer
                ? row.phone || ""
                : customer.phone || customer.phones?.[0] || row.phone || "",
            }
          : row
      )
    );
    setDirtyIds((current) => [...new Set([...current, id])]);
  };

  const save = async (row, overrides = {}) => {
    const key = rowKey(row);
    if (!key || savingIds.includes(key) || book.isFinalized) return false;
    const payload = { ...row, ...overrides };
    try {
      setSavingIds((current) => [...current, key]);
      const draftPayload = {
        date,
        documentType: payload.documentType || undefined,
        documentId: payload.documentId || undefined,
        documentCode: payload.documentCode || undefined,
        invoiceId: payload.invoiceId || undefined,
        customerId: payload.customerId || undefined,
        customerCode: payload.customerCode || undefined,
        customerName: payload.customerName || undefined,
        phone: payload.phone || undefined,
        invoiceCode: payload.invoiceCode || undefined,
        zaloStatus: payload.zaloStatus,
        invoiceStatus: payload.invoiceStatus,
        interactionChannel: payload.interactionChannel || "ZALO",
        interaction: payload.interaction || undefined,
        note: payload.note || undefined,
        salespersonName: payload.salespersonName || undefined,
      };
      const hasSavedDraft = row.draftId && !row.isNew;
      const response = hasSavedDraft
        ? await CustomerService.updateInvoiceFollowUpDraft(row.draftId, draftPayload)
        : await CustomerService.createInvoiceFollowUpDraft(draftPayload);
      const savedDraft = unwrap(response);
      setData((current) =>
        current.map((item) =>
          rowKey(item) === key
            ? {
                ...item,
                ...overrides,
                id: savedDraft?.id || savedDraft?._id || item.id,
                draftId: savedDraft?.id || savedDraft?._id || item.draftId,
                isNew: false,
                lastUpdatedAt: new Date().toISOString(),
                followUpAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                needsFollowUp: false,
                historyCount: item.historyCount || 0,
              }
            : item
        )
      );
      setDirtyIds((current) => current.filter((id) => id !== key));
      toast.success(`Đã lưu nháp ${row.customerCode || row.customerName || "khách mới"}`);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu sổ nháp theo dõi");
      return false;
    } finally {
      setSavingIds((current) => current.filter((id) => id !== key));
    }
  };

  const addTemporaryRow = () => {
    if (book.isFinalized) return;
    setDraftForm(emptyDraftForm);
    setDraftDialog({ mode: "CREATE" });
    lookupCustomers("");
  };

  const editTemporaryRow = (row) => {
    if (book.isFinalized) return;
    setDraftForm({
      customerMode: row.customerId ? "EXISTING" : "NEW",
      customerId: row.customerId || "",
      customerCode: row.customerCode || "",
      customerName: row.customerName || "",
      phone: row.phone || "",
      invoiceCode: row.invoiceCode || "",
      zaloStatus: row.zaloStatus || "NOT_CONNECTED",
      invoiceStatus: row.invoiceStatus || "NOT_SENT",
      interactionChannel: row.interactionChannel || "ZALO",
      interaction: row.interaction || "",
      note: row.note || "",
    });
    setDraftDialog({ mode: "EDIT", row });
    lookupCustomers("");
  };

  const submitTemporaryRow = async () => {
    if (draftForm.customerMode === "EXISTING" && !draftForm.customerId)
      return toast.error("Vui lòng tìm và chọn khách hàng có sẵn");
    try {
      setSavingDraft(true);
      const payload = {
        date,
        customerId: draftForm.customerMode === "EXISTING" ? draftForm.customerId : undefined,
        customerCode: draftForm.customerMode === "EXISTING" ? draftForm.customerCode : undefined,
        customerName: draftForm.customerName || undefined,
        phone: draftForm.phone || undefined,
        invoiceCode: draftForm.invoiceCode || undefined,
        zaloStatus: draftForm.zaloStatus,
        invoiceStatus: draftForm.invoiceStatus,
        interactionChannel: draftForm.interactionChannel,
        interaction: draftForm.interaction || undefined,
        note: draftForm.note || undefined,
      };
      if (draftDialog?.mode === "EDIT")
        await CustomerService.updateInvoiceFollowUpDraft(draftDialog.row.draftId, payload);
      else await CustomerService.createInvoiceFollowUpDraft(payload);
      toast.success(draftDialog?.mode === "EDIT" ? "Đã cập nhật dòng tạm" : "Đã thêm dòng tạm");
      setDraftDialog(null);
      setDraftForm(emptyDraftForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu dòng tạm");
    } finally {
      setSavingDraft(false);
    }
  };

  const removeTemporaryRow = async (row) => {
    if (book.isFinalized) return;
    const key = rowKey(row);
    if (!row.isNew && !window.confirm(`Xóa dòng tạm ${row.customerName || row.customerCode}?`))
      return;
    try {
      if (!row.isNew) await CustomerService.removeInvoiceFollowUpDraft(row.draftId);
      setData((current) => current.filter((item) => rowKey(item) !== key));
      setDirtyIds((current) => current.filter((id) => id !== key));
      if (!row.isNew) toast.success("Đã xóa dòng tạm");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa dòng tạm");
    }
  };

  const downloadInvoice = async (row) => {
    try {
      if (row.documentType === "DEBT_PAYMENT") {
        const payment = unwrap(await DebtPaymentService.getById(row.documentId));
        await saveInvoiceImage(debtPaymentToInvoice(payment, row));
      } else if (row.documentType === "CUSTOMER_RETURN") {
        const customerReturn = unwrap(await CustomerReturnService.getById(row.documentId));
        await saveInvoiceImage(customerReturnToInvoice(customerReturn));
      } else {
        const invoice = unwrap(await InvoiceService.getById(row.documentId || row.invoiceId));
        await saveInvoiceImage(invoice);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải ảnh hóa đơn");
    }
  };

  const openZalo = (row) => {
    const phone = normalizePhone(row.phone);
    if (!phone) return toast.error("Khách hàng chưa có số điện thoại");
    window.open(`https://zalo.me/${phone}`, "_blank", "noopener,noreferrer");
  };

  const openHistory = async (row) => {
    try {
      const customer = unwrap(await CustomerService.getById(row.customerId));
      const items = (customer?.interactions || []).filter((item) => {
        if (row.documentType && row.documentType !== "INVOICE")
          return (
            item.documentType === row.documentType &&
            (String(item.documentId || "") === String(row.documentId) ||
              item.documentCode === row.documentCode)
          );
        return item.invoiceId
          ? String(item.invoiceId) === String(row.invoiceId)
          : item.invoiceCode === row.invoiceCode;
      });
      setHistory({ row, items });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải lịch sử tương tác");
    }
  };

  const exportExcel = async () => {
    try {
      const response = await CustomerService.exportInvoiceFollowUps({ date });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${date}_THEODOI_HOADON_ZALO.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xuất báo cáo Excel");
    }
  };

  const saveAll = async () => {
    const pending = data.filter((row) => dirtyIds.includes(rowKey(row)));
    for (const row of pending) {
      const saved = await save(row);
      if (!saved) return false;
    }
    return true;
  };

  const finalizeBook = async () => {
    if (
      !window.confirm(
        `Chốt sổ ngày ${date}? Chỉ thao tác này mới ghi các trạng thái vào lịch sử tương tác khách hàng. Hóa đơn sẽ không bị thay đổi.`
      )
    )
      return;
    const saved = await saveAll();
    if (!saved) return;
    try {
      setLoading(true);
      const response = await CustomerService.finalizeInvoiceFollowUps(date);
      const result = unwrap(response);
      toast.success(
        `Đã chốt sổ và cập nhật ${Number(result?.interactionCount || 0).toLocaleString(
          "vi-VN"
        )} lịch sử tương tác`
      );
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể chốt sổ theo dõi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SoftBox>
      <SoftBox display="flex" justifyContent="space-between" gap={1.5} flexWrap="wrap" mb={2}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold">
            Sổ theo dõi gửi hóa đơn qua Zalo
          </SoftTypography>
          <SoftTypography variant="caption" color="text">
            Hóa đơn trong ngày được tự động đưa vào bảng. Dòng màu đỏ cần cập nhật phản hồi sau 24
            giờ.
          </SoftTypography>
        </SoftBox>
        <SoftBox display="flex" gap={1} flexWrap="wrap">
          <SoftInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <SoftButton color="info" variant="outlined" onClick={load} disabled={loading}>
            <Icon>refresh</Icon>&nbsp;Làm mới
          </SoftButton>
          <SoftButton
            color="warning"
            variant="gradient"
            onClick={reconcileInvoices}
            disabled={loading || reconciling || book.isFinalized}
          >
            <Icon>sync</Icon>&nbsp;{reconciling ? "Đang kiểm tra..." : "Cập nhật / Đối chiếu"}
          </SoftButton>
          <SoftButton color="success" variant="outlined" onClick={exportExcel}>
            <Icon>table_view</Icon>&nbsp;Xuất Excel
          </SoftButton>
          <SoftButton
            color="info"
            variant="outlined"
            onClick={() =>
              downloadInvoiceFollowUpImage({
                rows: visibleRows,
                date,
                summary: currentSummary,
                book,
              })
            }
          >
            <Icon>image</Icon>&nbsp;Xuất ảnh A4 ngang
          </SoftButton>
          {dirtyIds.length > 0 && (
            <SoftButton color="success" variant="gradient" onClick={saveAll}>
              <Icon>save</Icon>&nbsp;Lưu {dirtyIds.length} dòng
            </SoftButton>
          )}
          <SoftButton
            color="success"
            variant="gradient"
            onClick={finalizeBook}
            disabled={loading || book.isFinalized}
          >
            <Icon>{book.isFinalized ? "lock" : "task_alt"}</Icon>&nbsp;
            {book.isFinalized ? "Đã chốt sổ" : "Chốt sổ theo dõi"}
          </SoftButton>
        </SoftBox>
      </SoftBox>

      <SoftBox
        mb={2}
        p={1.25}
        borderRadius={2}
        sx={{
          bgcolor: book.isFinalized ? "#e8f5e9" : "#eef6ff",
          border: `1px solid ${book.isFinalized ? "#a5d6a7" : "#bbdefb"}`,
        }}
      >
        <SoftTypography variant="button" fontWeight="bold">
          {book.isFinalized
            ? `Sổ đã chốt lúc ${timeText(book.finalizedAt)}. Dữ liệu đang ở chế độ chỉ xem.`
            : "Đang là sổ nháp: chưa cập nhật vào lịch sử tương tác khách hàng và không thay đổi hóa đơn."}
        </SoftTypography>
        <SoftTypography variant="caption" display="block" color="text">
          Đối chiếu: {summary.sourceInvoiceCount || 0} hóa đơn bán hàng ·{" "}
          {summary.debtPaymentCount || 0} phiếu thu công nợ · {summary.customerReturnCount || 0}
          phiếu hoàn hàng · {summary.trackedInvoiceCount || 0} chứng từ trong sổ ·{" "}
          {summary.manualCount || 0} dòng tạm
        </SoftTypography>
      </SoftBox>

      <SoftBox
        display="grid"
        gap={1}
        mb={2}
        sx={{ gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5,1fr)" } }}
      >
        {[
          ["Tổng hóa đơn", currentSummary.total, "#eef6ff", "#1565c0"],
          ["Đã gửi", currentSummary.sent, "#e8f5e9", "#2e7d32"],
          ["Chưa gửi", currentSummary.notSent, "#fff8e1", "#ed6c02"],
          ["Không gửi", currentSummary.doNotSend, "#f1f5f9", "#475569"],
          ["Quá 24 giờ", currentSummary.needsFollowUp, "#ffebee", "#c62828"],
        ].map(([label, value, background, color]) => (
          <SoftBox key={label} p={1.5} borderRadius={2} sx={{ bgcolor: background }}>
            <SoftTypography variant="caption" color="text">
              {label}
            </SoftTypography>
            <SoftTypography variant="h5" fontWeight="bold" sx={{ color }}>
              {value}
            </SoftTypography>
          </SoftBox>
        ))}
      </SoftBox>

      <SoftBox display="flex" gap={1} mb={1.5} flexWrap="wrap">
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm mã KH, tên, SĐT, mã hóa đơn..."
          sx={{ flex: 1, minWidth: 250 }}
        />
        <Select
          size="small"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="ALL">Tất cả tình trạng</MenuItem>
          <MenuItem value="NOT_SENT">Chưa gửi hóa đơn</MenuItem>
          <MenuItem value="DO_NOT_SEND">Không gửi hóa đơn</MenuItem>
          <MenuItem value="FOLLOW_UP">Cần cập nhật 24h</MenuItem>
          <MenuItem value="INTERACTED">Đã có tương tác</MenuItem>
        </Select>
        {(search || filter !== "ALL") && (
          <SoftButton
            color="dark"
            variant="text"
            onClick={() => {
              setSearch("");
              setFilter("ALL");
            }}
          >
            <Icon>filter_alt_off</Icon>&nbsp;Xóa lọc
          </SoftButton>
        )}
      </SoftBox>

      <SoftTypography variant="caption" color="text" display="block" mb={0.75}>
        Hiển thị {visibleRows.length}/{data.length} hóa đơn
      </SoftTypography>

      <TableContainer
        sx={{ border: "1px solid #cbd5e1", borderRadius: 2, maxHeight: "68vh", width: "100%" }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{
            width: { xs: 1180, lg: "100%" },
            minWidth: { xs: 1180, lg: "100%" },
            tableLayout: "fixed",
            borderCollapse: "separate",
          }}
        >
          <colgroup>
            {["10%", "17%", "14%", "17%", "10%", "15%", "8%", "9%"].map((width, index) => (
              <col key={`${width}-${index}`} style={{ width }} />
            ))}
          </colgroup>
          <TableHead
            sx={{
              display: "table-header-group !important",
              p: "0 !important",
              borderRadius: "0 !important",
            }}
          >
            <TableRow sx={{ display: "table-row" }}>
              {[
                "MÃ KH",
                "TÊN KHÁCH HÀNG",
                "GỬI ZALO / HĐ",
                "TƯƠNG TÁC",
                "SỐ ĐIỆN THOẠI",
                "NOTE",
                "CẬP NHẬT",
                "THAO TÁC",
              ].map((label) => (
                <TableCell
                  key={label}
                  sx={{
                    bgcolor: "#315f50 !important",
                    color: "#fff !important",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    py: 0.85,
                    px: 0.75,
                    boxSizing: "border-box",
                  }}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody sx={{ display: "table-row-group" }}>
            {visibleRows.map((row) => {
              const key = rowKey(row);
              const dirty = dirtyIds.includes(key);
              const saving = savingIds.includes(key);
              const selectedCustomer = row.customerId
                ? {
                    id: row.customerId,
                    code: row.customerCode,
                    name: row.customerName,
                    phone: row.phone,
                  }
                : null;
              return (
                <TableRow
                  key={key}
                  sx={{
                    bgcolor: row.needsFollowUp ? "#fff1f2" : dirty ? "#fffde7" : "#fff",
                    "& td": {
                      borderColor: "#cbd5e1",
                      verticalAlign: "middle",
                      boxSizing: "border-box",
                      px: 0.75,
                      py: 0.75,
                      fontSize: 12,
                    },
                  }}
                >
                  <TableCell>
                    {row.customerSelectable && !row.isTemporary ? (
                      <SoftBox display="flex" flexDirection="column" gap={0.5}>
                        <TextField
                          size="small"
                          value={row.customerCode || ""}
                          placeholder="Chưa có mã KH"
                          InputProps={{ readOnly: true }}
                        />
                        {row.isTemporary ? (
                          <TextField
                            size="small"
                            value={row.invoiceCode || ""}
                            onChange={(event) => edit(key, "invoiceCode", event.target.value)}
                            placeholder="Mã HĐ dự kiến"
                            disabled={book.isFinalized}
                          />
                        ) : (
                          <SoftTypography variant="caption" color="text">
                            {documentLabels[row.documentType] || "Chứng từ"} · {row.invoiceCode}
                          </SoftTypography>
                        )}
                      </SoftBox>
                    ) : (
                      <>
                        <b>{row.customerCode || "—"}</b>
                        <SoftTypography variant="caption" display="block" color="text">
                          {documentLabels[row.documentType] || "Dòng tạm"} · {row.invoiceCode}
                        </SoftTypography>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.customerSelectable && !row.isTemporary ? (
                      <>
                        <Autocomplete
                          size="small"
                          options={[
                            { id: "__NEW__", name: "Khách mới / chưa định danh" },
                            ...customerOptions,
                          ]}
                          value={selectedCustomer}
                          disabled={book.isFinalized}
                          filterOptions={(options) => options}
                          isOptionEqualToValue={(option, value) =>
                            String(option.id || option._id) === String(value.id || value._id)
                          }
                          getOptionLabel={(option) =>
                            option.id === "__NEW__"
                              ? option.name
                              : [option.code, option.name].filter(Boolean).join(" · ")
                          }
                          onOpen={() => lookupCustomers("")}
                          onInputChange={(_, value, reason) => {
                            if (reason === "input") lookupCustomers(value);
                          }}
                          onChange={(_, value) => selectCustomer(key, value)}
                          noOptionsText="Không tìm thấy khách hàng"
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Tìm mã hoặc tên KH"
                              helperText={
                                !row.customerId ? "Có thể chọn khách mới chưa định danh" : ""
                              }
                            />
                          )}
                        />
                        <Chip
                          size="small"
                          color="warning"
                          variant="outlined"
                          label={row.isTemporary ? "Dòng tạm" : "HĐ chưa gắn khách hàng"}
                          sx={{ mt: 0.5 }}
                        />
                      </>
                    ) : (
                      <>
                        <b>
                          {row.customerName ||
                            (row.isTemporary ? "Khách mới / chưa định danh" : "—")}
                        </b>
                        <SoftTypography variant="caption" display="block" color="text">
                          {row.isTemporary ? "Dòng theo dõi tạm" : row.salespersonName || "—"}
                        </SoftTypography>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <SoftBox display="grid" gap={0.5}>
                      <Select
                        value={row.zaloStatus}
                        onChange={(event) => edit(key, "zaloStatus", event.target.value, true)}
                        disabled={book.isFinalized}
                        inputProps={{ "aria-label": "Trạng thái kết bạn Zalo" }}
                        sx={statusSelectSx(selectTones[row.zaloStatus])}
                        renderValue={(value) =>
                          statusValue(
                            value === "CONNECTED" ? "Zalo: Đã KB" : "Zalo: Chưa KB",
                            selectTones[value]
                          )
                        }
                      >
                        <MenuItem
                          value="NOT_CONNECTED"
                          sx={statusMenuSx(selectTones.NOT_CONNECTED)}
                        >
                          {statusValue("Zalo: Chưa KB", selectTones.NOT_CONNECTED)}
                        </MenuItem>
                        <MenuItem value="CONNECTED" sx={statusMenuSx(selectTones.CONNECTED)}>
                          {statusValue("Zalo: Đã KB", selectTones.CONNECTED)}
                        </MenuItem>
                      </Select>
                      <Select
                        value={row.invoiceStatus}
                        onChange={(event) => edit(key, "invoiceStatus", event.target.value, true)}
                        disabled={book.isFinalized}
                        inputProps={{ "aria-label": "Trạng thái gửi hóa đơn" }}
                        sx={statusSelectSx(selectTones[row.invoiceStatus])}
                        renderValue={(value) =>
                          statusValue(
                            `HĐ: ${invoiceStatusLabels[value] || "Chưa gửi"}`,
                            selectTones[value]
                          )
                        }
                      >
                        {[
                          ["NOT_SENT", "HĐ: Chưa gửi"],
                          ["SENT", "HĐ: Đã gửi"],
                          ["DO_NOT_SEND", "HĐ: Không gửi"],
                        ].map(([value, label]) => (
                          <MenuItem key={value} value={value} sx={statusMenuSx(selectTones[value])}>
                            {statusValue(label, selectTones[value])}
                          </MenuItem>
                        ))}
                      </Select>
                    </SoftBox>
                  </TableCell>
                  <TableCell sx={{ p: "6px !important", cursor: "pointer" }}>
                    <SoftBox display="grid" gap={0.5}>
                      <Select
                        value={row.interactionChannel || "ZALO"}
                        onChange={(event) =>
                          edit(key, "interactionChannel", event.target.value, true)
                        }
                        disabled={book.isFinalized}
                        inputProps={{
                          "aria-label": `Loại tương tác của ${row.customerName || "khách hàng"}`,
                        }}
                        sx={statusSelectSx(selectTones[row.interactionChannel || "ZALO"])}
                        renderValue={(value) =>
                          statusValue(
                            `Kênh: ${interactionChannelLabels[value] || "Zalo"}`,
                            selectTones[value]
                          )
                        }
                      >
                        {[
                          ["ZALO", "Kênh: Zalo"],
                          ["PHONE", "Kênh: Gọi điện"],
                          ["SMS", "Kênh: SMS"],
                        ].map(([value, label]) => (
                          <MenuItem key={value} value={value} sx={statusMenuSx(selectTones[value])}>
                            {statusValue(label, selectTones[value])}
                          </MenuItem>
                        ))}
                      </Select>
                      <Select
                        value={row.interaction || ""}
                        onChange={(event) => edit(key, "interaction", event.target.value, true)}
                        disabled={book.isFinalized}
                        displayEmpty
                        inputProps={{
                          "aria-label": `Tương tác của ${row.customerName || "khách hàng"}`,
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              mt: 0.5,
                              "& .MuiMenuItem-root": {
                                minHeight: 40,
                                fontSize: 13,
                                lineHeight: 1.3,
                                whiteSpace: "normal",
                              },
                            },
                          },
                        }}
                        sx={statusSelectSx(interactionTone(row.interaction))}
                        renderValue={(value) =>
                          statusValue(value || "Chưa cập nhật", interactionTone(value))
                        }
                      >
                        {[
                          "",
                          "Có tương tác",
                          "Khách hủy kết bạn",
                          "Đã xem, chưa phản hồi",
                          "Cần liên hệ lại",
                        ].map((value) => (
                          <MenuItem
                            key={value || "NONE"}
                            value={value}
                            sx={statusMenuSx(interactionTone(value))}
                          >
                            {statusValue(value || "Chưa cập nhật", interactionTone(value))}
                          </MenuItem>
                        ))}
                      </Select>
                    </SoftBox>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={row.phone || ""}
                      onChange={(event) => edit(key, "phone", event.target.value)}
                      disabled={book.isFinalized}
                      sx={{ width: "100%" }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      multiline
                      maxRows={2}
                      value={row.note || ""}
                      onChange={(event) => edit(key, "note", event.target.value)}
                      disabled={book.isFinalized}
                      placeholder="Nhập ghi chú..."
                      sx={{ width: "100%" }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.needsFollowUp ? (
                      <SoftTypography variant="caption" fontWeight="bold" color="error">
                        Quá 24 giờ
                      </SoftTypography>
                    ) : (
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        sx={{ color: row.invoiceStatus === "SENT" ? "#2e7d32" : "#64748b" }}
                      >
                        {timeText(row.lastUpdatedAt)}
                      </SoftTypography>
                    )}
                    <SoftTypography variant="caption" display="block" color="text" mt={0.5}>
                      {row.historyCount || 0} lần lưu
                    </SoftTypography>
                  </TableCell>
                  <TableCell>
                    <SoftBox display="flex" gap={0.25} flexWrap="wrap" justifyContent="center">
                      <Tooltip title="Mở Zalo">
                        <IconButton size="small" color="success" onClick={() => openZalo(row)}>
                          <Icon>chat</Icon>
                        </IconButton>
                      </Tooltip>
                      {!row.isTemporary && (
                        <Tooltip title="Tải hóa đơn">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => downloadInvoice(row)}
                          >
                            <Icon>download</Icon>
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title={saving ? "Đang lưu" : "Lưu dòng"}>
                        <span>
                          <IconButton
                            size="small"
                            color={dirty ? "warning" : "default"}
                            onClick={() => save(row)}
                            disabled={saving || book.isFinalized}
                          >
                            <Icon>{saving ? "hourglass_top" : "save"}</Icon>
                          </IconButton>
                        </span>
                      </Tooltip>
                      {row.isTemporary ? (
                        <>
                          <Tooltip title="Sửa dòng tạm">
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => editTemporaryRow(row)}
                                disabled={book.isFinalized}
                              >
                                <Icon>edit</Icon>
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Xóa dòng tạm">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeTemporaryRow(row)}
                                disabled={book.isFinalized}
                              >
                                <Icon>delete</Icon>
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip title="Xem lịch sử">
                          <IconButton size="small" onClick={() => openHistory(row)}>
                            <Icon>history</Icon>
                          </IconButton>
                        </Tooltip>
                      )}
                    </SoftBox>
                  </TableCell>
                </TableRow>
              );
            })}
            {!visibleRows.length && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5, color: "#64748b" }}>
                  Không có hóa đơn phù hợp trong ngày đã chọn.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <SoftBox mt={1.5} display="flex" justifyContent="flex-start">
        <SoftButton
          color="warning"
          variant="outlined"
          onClick={addTemporaryRow}
          disabled={book.isFinalized}
        >
          <Icon>add</Icon>&nbsp;Thêm dòng tạm
        </SoftButton>
      </SoftBox>
      <Dialog
        open={Boolean(reconciliation)}
        onClose={() => setReconciliation(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <SoftTypography variant="h5" fontWeight="bold">
            Kết quả cập nhật và đối chiếu
          </SoftTypography>
          <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
            Kiểm tra sai sót giữa sổ đang hiển thị và chứng từ ngày {date}. Chưa có dữ liệu nào bị
            thay đổi.
          </SoftTypography>
        </DialogTitle>
        <DialogContent dividers>
          <SoftBox
            display="grid"
            gap={1}
            mb={2}
            sx={{ gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" } }}
          >
            {[
              ["Đang có trong sổ", reconciliation?.currentCount || 0, "#eef6ff", "#1565c0"],
              [
                "Chứng từ còn thiếu",
                reconciliation?.missingRows?.length || 0,
                "#fff8e1",
                "#ed6c02",
              ],
              [
                "KH chưa có chứng từ",
                reconciliation?.withoutInvoiceRows?.length || 0,
                "#ffebee",
                "#c62828",
              ],
            ].map(([label, value, background, color]) => (
              <SoftBox key={label} p={1.5} borderRadius={2} sx={{ bgcolor: background }}>
                <SoftTypography variant="caption" color="text">
                  {label}
                </SoftTypography>
                <SoftTypography variant="h5" fontWeight="bold" sx={{ color }}>
                  {value}
                </SoftTypography>
              </SoftBox>
            ))}
          </SoftBox>

          {reconciliation?.missingRows?.length > 0 ? (
            <SoftBox mb={2}>
              <SoftBox p={1.25} mb={1} borderRadius={2} bgcolor="#fff8e1">
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#b45309" }}>
                  Phát hiện chứng từ chưa có trong danh sách
                </SoftTypography>
                <SoftTypography variant="caption" color="text" display="block">
                  Xác nhận bên dưới để thêm các dòng này. Mọi dòng và nội dung đang có vẫn được giữ
                  nguyên.
                </SoftTypography>
              </SoftBox>
              <SoftBox sx={{ maxHeight: 220, overflowY: "auto" }}>
                {reconciliation.missingRows.map((row) => (
                  <SoftBox
                    key={documentKey(row) || documentCodeKey(row)}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={1}
                    p={1}
                    mb={0.75}
                    borderRadius={1.5}
                    sx={{ border: "1px solid #fde68a" }}
                  >
                    <SoftBox minWidth={0}>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {[row.customerCode, row.customerName].filter(Boolean).join(" · ") ||
                          "Khách chưa định danh"}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {documentLabels[row.documentType] || "Chứng từ"}
                      </SoftTypography>
                    </SoftBox>
                    <SoftTypography
                      variant="button"
                      fontWeight="bold"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {row.documentCode || row.invoiceCode || "Chưa có mã"}
                    </SoftTypography>
                  </SoftBox>
                ))}
              </SoftBox>
            </SoftBox>
          ) : (
            <SoftBox p={1.25} mb={2} borderRadius={2} bgcolor="#e8f5e9">
              <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#2e7d32" }}>
                Không phát hiện chứng từ mới bị thiếu trong danh sách.
              </SoftTypography>
            </SoftBox>
          )}

          {reconciliation?.withoutInvoiceRows?.length > 0 && (
            <SoftBox>
              <SoftBox p={1.25} mb={1} borderRadius={2} bgcolor="#ffebee">
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#c62828" }}>
                  Cần xác nhận: khách hàng chưa có chứng từ tương ứng
                </SoftTypography>
                <SoftTypography variant="caption" color="text" display="block">
                  Đây chỉ là cảnh báo kiểm tra. Các khách hàng này vẫn được giữ nguyên trong sổ và
                  không tự tạo hóa đơn.
                </SoftTypography>
              </SoftBox>
              <SoftBox sx={{ maxHeight: 220, overflowY: "auto" }}>
                {reconciliation.withoutInvoiceRows.map((row) => (
                  <SoftBox
                    key={customerKey(row)}
                    display="flex"
                    justifyContent="space-between"
                    gap={1}
                    p={1}
                    mb={0.75}
                    borderRadius={1.5}
                    sx={{ border: "1px solid #ffcdd2" }}
                  >
                    <SoftTypography variant="button" fontWeight="bold">
                      {[row.customerCode, row.customerName].filter(Boolean).join(" · ") ||
                        "Khách chưa định danh"}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="error" sx={{ whiteSpace: "nowrap" }}>
                      Chưa có chứng từ
                    </SoftTypography>
                  </SoftBox>
                ))}
              </SoftBox>
            </SoftBox>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <SoftButton color="dark" variant="text" onClick={() => setReconciliation(null)}>
            Đóng, không thay đổi
          </SoftButton>
          <SoftButton color="success" variant="gradient" onClick={applyReconciliation}>
            <Icon>task_alt</Icon>&nbsp;
            {reconciliation?.missingRows?.length
              ? `Xác nhận & thêm ${reconciliation.missingRows.length} dòng thiếu`
              : "Xác nhận đã kiểm tra"}
          </SoftButton>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(draftDialog)}
        onClose={() => !savingDraft && setDraftDialog(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            width: { xs: "calc(100% - 16px)", sm: "calc(100% - 48px)" },
            maxHeight: { xs: "calc(100% - 16px)", sm: "calc(100% - 48px)" },
            m: { xs: 1, sm: 3 },
          },
        }}
      >
        <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.75, sm: 2 } }}>
          <SoftTypography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: 20, sm: 24 } }}>
            {draftDialog?.mode === "EDIT" ? "Sửa dòng theo dõi tạm" : "Thêm dòng theo dõi tạm"}
          </SoftTypography>
          <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
            Dòng này chỉ thuộc sổ theo dõi, không tạo mới hoặc sửa hóa đơn trong hệ thống.
          </SoftTypography>
        </DialogTitle>
        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
            1. Chọn loại khách hàng
          </SoftTypography>
          <SoftBox
            display="grid"
            gap={1}
            sx={{ gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}
          >
            {[
              [
                "EXISTING",
                "person_search",
                "Khách hàng có sẵn",
                "Tìm theo mã hoặc tên để tránh nhập sai",
              ],
              [
                "NEW",
                "person_add",
                "Khách hàng mới",
                "Không có mã khách hàng; tên và số điện thoại không bắt buộc",
              ],
            ].map(([value, icon, title, description]) => {
              const selected = draftForm.customerMode === value;
              return (
                <SoftBox
                  key={value}
                  component="button"
                  type="button"
                  onClick={() =>
                    setDraftForm((current) => ({
                      ...current,
                      customerMode: value,
                      customerId: "",
                      customerCode: "",
                      customerName: "",
                    }))
                  }
                  p={1.5}
                  borderRadius={2}
                  textAlign="left"
                  sx={{
                    cursor: "pointer",
                    border: selected ? "2px solid #1976d2" : "1px solid #dbe3ec",
                    bgcolor: selected ? "#eef6ff" : "#fff",
                  }}
                >
                  <SoftBox display="flex" alignItems="center" gap={1}>
                    <Icon color={selected ? "info" : "inherit"}>{icon}</Icon>
                    <SoftBox>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {title}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {description}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                </SoftBox>
              );
            })}
          </SoftBox>

          <SoftBox mt={2.5}>
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
              2. Thông tin liên hệ và chứng từ
            </SoftTypography>
            <Grid container spacing={1.5}>
              {draftForm.customerMode === "EXISTING" && (
                <Grid item xs={12}>
                  <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                    Tìm mã hoặc tên khách hàng
                  </SoftTypography>
                  <Autocomplete
                    size="small"
                    options={customerOptions}
                    value={
                      draftForm.customerId
                        ? {
                            id: draftForm.customerId,
                            code: draftForm.customerCode,
                            name: draftForm.customerName,
                            phone: draftForm.phone,
                          }
                        : null
                    }
                    filterOptions={(options) => options}
                    isOptionEqualToValue={(option, value) =>
                      String(option.id || option._id) === String(value.id || value._id)
                    }
                    getOptionLabel={(option) =>
                      [option.code, option.name, option.phone].filter(Boolean).join(" · ")
                    }
                    onOpen={() => lookupCustomers("")}
                    onInputChange={(_, value, reason) => {
                      if (reason === "input") lookupCustomers(value);
                    }}
                    onChange={(_, customer) =>
                      setDraftForm((current) => ({
                        ...current,
                        customerId: customer?.id || customer?._id || "",
                        customerCode: customer?.code || "",
                        customerName: customer?.name || "",
                        phone: customer?.phone || customer?.phones?.[0] || current.phone,
                      }))
                    }
                    noOptionsText="Không tìm thấy khách hàng"
                    sx={draftAutocompleteSx}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Ví dụ: KH278 hoặc Hậu"
                        inputProps={{
                          ...params.inputProps,
                          "aria-label": "Tìm mã hoặc tên khách hàng",
                        }}
                      />
                    )}
                  />
                  {draftForm.customerId && (
                    <SoftBox mt={1} p={1.25} borderRadius={2} bgcolor="#e8f5e9">
                      <SoftTypography variant="button" fontWeight="bold">
                        {draftForm.customerCode || "Chưa có mã"} · {draftForm.customerName}
                      </SoftTypography>
                    </SoftBox>
                  )}
                </Grid>
              )}
              {draftForm.customerMode === "NEW" && (
                <>
                  <Grid item xs={12}>
                    <SoftBox p={1.25} borderRadius={2} bgcolor="#fff8e1">
                      <SoftTypography variant="button" fontWeight="bold">
                        Khách mới không có mã khách hàng
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text" display="block">
                        Tên và số điện thoại có thể để trống. Việc này không tự tạo hồ sơ khách hàng
                        mới.
                      </SoftTypography>
                    </SoftBox>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                      Tên khách hàng (không bắt buộc)
                    </SoftTypography>
                    <TextField
                      fullWidth
                      size="small"
                      value={draftForm.customerName}
                      onChange={(event) =>
                        setDraftForm((current) => ({
                          ...current,
                          customerName: event.target.value,
                        }))
                      }
                      placeholder="Nhập tên nếu đã biết"
                      inputProps={{ "aria-label": "Tên khách hàng" }}
                      sx={draftFieldSx}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} md={6}>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                  Số điện thoại (không bắt buộc)
                </SoftTypography>
                <TextField
                  fullWidth
                  size="small"
                  value={draftForm.phone}
                  onChange={(event) =>
                    setDraftForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="Nhập số dùng trên Zalo"
                  inputProps={{ "aria-label": "Số điện thoại" }}
                  sx={draftFieldSx}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                  Mã chứng từ ghi chú
                </SoftTypography>
                <TextField
                  fullWidth
                  size="small"
                  value={draftForm.invoiceCode}
                  onChange={(event) =>
                    setDraftForm((current) => ({ ...current, invoiceCode: event.target.value }))
                  }
                  placeholder="Ví dụ: HD-261006-000001"
                  helperText="Chỉ để theo dõi, không tạo hóa đơn mới"
                  inputProps={{ "aria-label": "Mã chứng từ ghi chú" }}
                  sx={draftFieldSx}
                />
              </Grid>
            </Grid>
          </SoftBox>

          <SoftBox mt={2.5}>
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
              3. Tình trạng gửi và tương tác
            </SoftTypography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={3}>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                  Kết bạn Zalo
                </SoftTypography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={draftForm.zaloStatus}
                  onChange={(event) =>
                    setDraftForm((current) => ({ ...current, zaloStatus: event.target.value }))
                  }
                  inputProps={{ "aria-label": "Kết bạn Zalo" }}
                  sx={draftFieldSx}
                >
                  <MenuItem value="NOT_CONNECTED">Chưa kết bạn</MenuItem>
                  <MenuItem value="CONNECTED">Đã kết bạn</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                  Gửi chứng từ
                </SoftTypography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={draftForm.invoiceStatus}
                  onChange={(event) =>
                    setDraftForm((current) => ({ ...current, invoiceStatus: event.target.value }))
                  }
                  inputProps={{ "aria-label": "Gửi chứng từ" }}
                  sx={draftFieldSx}
                >
                  <MenuItem value="NOT_SENT">Chưa gửi</MenuItem>
                  <MenuItem value="SENT">Đã gửi</MenuItem>
                  <MenuItem value="DO_NOT_SEND">Không gửi</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                  Loại tương tác
                </SoftTypography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={draftForm.interactionChannel}
                  onChange={(event) =>
                    setDraftForm((current) => ({
                      ...current,
                      interactionChannel: event.target.value,
                    }))
                  }
                  inputProps={{ "aria-label": "Loại tương tác" }}
                  sx={draftFieldSx}
                >
                  <MenuItem value="ZALO">Zalo</MenuItem>
                  <MenuItem value="PHONE">Gọi điện</MenuItem>
                  <MenuItem value="SMS">SMS</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                  Tương tác
                </SoftTypography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={draftForm.interaction}
                  onChange={(event) =>
                    setDraftForm((current) => ({ ...current, interaction: event.target.value }))
                  }
                  inputProps={{ "aria-label": "Tương tác" }}
                  sx={draftFieldSx}
                >
                  <MenuItem value="">Chưa cập nhật</MenuItem>
                  <MenuItem value="Có tương tác">Có tương tác</MenuItem>
                  <MenuItem value="Khách hủy kết bạn">Khách hủy kết bạn</MenuItem>
                  <MenuItem value="Đã xem, chưa phản hồi">Đã xem, chưa phản hồi</MenuItem>
                  <MenuItem value="Cần liên hệ lại">Cần liên hệ lại</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.6}>
                  Ghi chú
                </SoftTypography>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  value={draftForm.note}
                  onChange={(event) =>
                    setDraftForm((current) => ({ ...current, note: event.target.value }))
                  }
                  placeholder="Nội dung cần lưu lại để theo dõi ngày hôm sau..."
                  inputProps={{ "aria-label": "Ghi chú" }}
                  sx={draftMultilineSx}
                />
              </Grid>
            </Grid>
          </SoftBox>
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            gap: 1,
            flexDirection: { xs: "column-reverse", sm: "row" },
            "& .MuiButton-root": { width: { xs: "100%", sm: "auto" }, m: "0 !important" },
          }}
        >
          <SoftButton color="dark" variant="text" onClick={() => setDraftDialog(null)}>
            Hủy
          </SoftButton>
          <SoftButton
            color="success"
            variant="gradient"
            onClick={submitTemporaryRow}
            disabled={savingDraft}
          >
            <Icon>save</Icon>&nbsp;
            {savingDraft
              ? "Đang lưu..."
              : draftDialog?.mode === "EDIT"
              ? "Lưu thay đổi"
              : "Thêm vào sổ"}
          </SoftButton>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(history)} onClose={() => setHistory(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          Lịch sử · {history?.row?.customerName} · {history?.row?.invoiceCode}
        </DialogTitle>
        <DialogContent dividers>
          {history?.items?.length ? (
            history.items.map((item, index) => (
              <SoftBox
                key={item.id || item._id || index}
                p={1.25}
                mb={1}
                borderRadius={2}
                sx={{ border: "1px solid #dbe3ec", bgcolor: index === 0 ? "#f0f7ff" : "#fff" }}
              >
                <SoftBox display="flex" justifyContent="space-between" gap={1}>
                  <SoftTypography variant="button" fontWeight="bold">
                    {item.interaction || item.action || "Cập nhật trạng thái"}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {timeText(item.occurredAt || item.at)}
                  </SoftTypography>
                </SoftBox>
                <SoftTypography variant="caption" display="block" color="text" mt={0.5}>
                  Kênh: {interactionChannelLabels[item.channel] || item.channel || "Zalo"} · Zalo:{" "}
                  {item.zaloStatus === "CONNECTED" ? "Đã kết bạn" : "Chưa kết bạn"} · Hóa đơn:{" "}
                  {invoiceStatusLabels[item.invoiceStatus] || "Chưa gửi"}
                </SoftTypography>
                {item.note && (
                  <SoftTypography variant="body2" mt={0.75}>
                    {item.note}
                  </SoftTypography>
                )}
              </SoftBox>
            ))
          ) : (
            <SoftTypography variant="body2" color="text">
              Hóa đơn này chưa có lịch sử cập nhật.
            </SoftTypography>
          )}
        </DialogContent>
      </Dialog>
    </SoftBox>
  );
}
