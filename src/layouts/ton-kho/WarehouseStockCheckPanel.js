import { useEffect, useMemo, useState } from "react";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import InventoryService from "services/inventoryService";
import { createExcelFile, downloadBlob } from "utils/excel";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import MobileLoadMore from "components/MobileLoadMore";
import { mergeUniqueItems } from "utils/infiniteList";

const STATUSES = {
  MATCHED: { label: "Khớp tồn", color: "#2e7d32", background: "#e8f5e9" },
  SHORTAGE: { label: "Thiếu hàng", color: "#c62828", background: "#ffebee" },
  SURPLUS: { label: "Thừa hàng", color: "#ef6c00", background: "#fff3e0" },
  NOT_COUNTED: { label: "Chưa kiểm", color: "#607d8b", background: "#eceff1" },
  UNKNOWN: { label: "Mã không tồn tại", color: "#8d6e00", background: "#fff8e1" },
  INVALID: { label: "Dữ liệu lỗi", color: "#ad1457", background: "#fce4ec" },
};

const DIRECT_RENDER_BATCH = 24;
const RESULT_RENDER_BATCH = 30;

const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const getId = (value) => value?.id || value?._id;
const apiError = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "object") return message.message || fallback;
  return message || fallback;
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
const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const makeKey = (prefix) => {
  const uuid = typeof window !== "undefined" ? window.crypto?.randomUUID?.() : "";
  return `${prefix}-${uuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
};
const sourceLabel = (source) =>
  source === "BEFORE_RESTORE" ? "Trước khi khôi phục" : "Trước khi đồng bộ";
const downloadResponse = (response, fallback) => {
  const disposition = response?.headers?.["content-disposition"] || "";
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  downloadBlob(response.data, utf8 ? decodeURIComponent(utf8) : plain || fallback);
};

function ActionModal({ action, loading, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    setReason("");
    setConfirmation("");
    setAcknowledged(false);
  }, [action]);

  if (!action) return null;
  const restore = action.type === "RESTORE";
  const preview = action.preview || {};
  const required = restore ? "KHOI PHUC TON KHO" : "DONG BO TON KHO";
  const allowed = restore ? preview.canRestore !== false : preview.canSync !== false;
  const blockers = Array.isArray(preview.blockers) ? preview.blockers : [];
  const summary = preview.summary || {};
  const changes = Array.isArray(preview.changes) ? preview.changes : [];

  return (
    <Modal open onClose={loading ? undefined : onClose}>
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
        <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <SoftBox display="flex" gap={1} alignItems="center">
            <SoftBox
              width={44}
              height={44}
              borderRadius={2}
              bgcolor={restore ? "#fff3e0" : "#e3f2fd"}
              color={restore ? "#ef6c00" : "#1565c0"}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon>{restore ? "restore" : "sync"}</Icon>
            </SoftBox>
            <SoftBox>
              <SoftTypography variant="h6" fontWeight="bold">
                {restore ? "Khôi phục tồn kho" : "Đồng bộ tồn kho thực tế"}
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                {restore ? action.backup?.code : "Kết quả kiểm hàng vừa đối chiếu"}
              </SoftTypography>
            </SoftBox>
          </SoftBox>
          <IconButton onClick={onClose} disabled={loading}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>

        <SoftBox
          p={1.25}
          my={1.4}
          borderRadius={2}
          bgcolor={allowed && !blockers.length ? "#fff8e1" : "#ffebee"}
          sx={{ border: `1px solid ${allowed && !blockers.length ? "#ffcc80" : "#ef9a9a"}` }}
        >
          <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#b71c1c" }}>
            <Icon sx={{ verticalAlign: "middle", mr: 0.5 }}>warning</Icon>
            {restore
              ? "Tồn kho hiện tại sẽ được thay bằng số lượng trong backup. Hệ thống tự tạo thêm bản sao an toàn trước khi khôi phục."
              : "Số lượng trên app sẽ được thay bằng kết quả kiểm thực tế. Hệ thống tự tạo backup trước khi đồng bộ."}
          </SoftTypography>
        </SoftBox>

        {blockers.slice(0, 20).map((blocker, index) => (
          <SoftBox
            key={`${blocker.code || blocker.productCode}-${index}`}
            p={0.9}
            mb={0.6}
            borderRadius={1.5}
            bgcolor="#ffebee"
          >
            <SoftTypography variant="caption" color="error" fontWeight="bold" display="block">
              {blocker.message || blocker.code}
            </SoftTypography>
            {Array.isArray(blocker.changedProducts) && (
              <SoftTypography variant="caption" color="text">
                {blocker.changedProducts.length} sản phẩm đã thay đổi sau khi đối chiếu.
              </SoftTypography>
            )}
          </SoftBox>
        ))}

        <SoftBox
          display="grid"
          gap={0.75}
          my={1.4}
          sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        >
          {(restore
            ? [
                ["Sản phẩm đổi", summary.changedProducts || 0],
                ["Tăng", `+${summary.gainQuantity || 0}`],
                ["Giảm", `−${summary.lossQuantity || 0}`],
              ]
            : [
                ["Đã kiểm", summary.countedProducts || 0],
                ["Thiếu", summary.totalShortageQuantity || 0],
                ["Thừa", summary.totalSurplusQuantity || 0],
              ]
          ).map(([label, value]) => (
            <SoftBox key={label} p={0.85} borderRadius={1.5} bgcolor="#f5f7fa">
              <SoftTypography variant="caption" color="text" display="block">
                {label}
              </SoftTypography>
              <SoftTypography variant="button" fontWeight="bold">
                {value}
              </SoftTypography>
            </SoftBox>
          ))}
        </SoftBox>

        {restore && changes.length > 0 && (
          <SoftBox
            maxHeight={150}
            overflow="auto"
            mb={1.25}
            borderRadius={2}
            sx={{ border: "1px solid #e0e5eb" }}
          >
            {changes.slice(0, 50).map((item, index) => (
              <SoftBox
                key={item.productId || index}
                display="flex"
                justifyContent="space-between"
                px={1.1}
                py={0.7}
                sx={{ borderBottom: "1px solid #edf0f3" }}
              >
                <SoftTypography variant="caption" fontWeight="bold">
                  {item.productCode || `Sản phẩm ${index + 1}`}
                </SoftTypography>
                <SoftTypography variant="caption">
                  {item.currentQuantity || 0} → {item.restoreQuantity || 0}
                </SoftTypography>
              </SoftBox>
            ))}
          </SoftBox>
        )}

        {allowed && !blockers.length && (
          <>
            <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.45}>
              Lý do thực hiện *
            </SoftTypography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Mô tả lý do điều chỉnh tồn kho..."
            />
            <SoftBox
              component="label"
              display="flex"
              alignItems="flex-start"
              gap={1}
              p={1.1}
              my={1.2}
              borderRadius={2}
              bgcolor={acknowledged ? "#e8f5e9" : "#f8fafc"}
              sx={{
                border: acknowledged ? "2px solid #43a047" : "1px solid #dce2e9",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                style={{ width: 22, height: 22, flexShrink: 0 }}
              />
              <SoftTypography variant="caption" fontWeight="bold">
                Tôi đã kiểm tra số liệu và hiểu thao tác này sẽ thay đổi tồn kho chính.
              </SoftTypography>
            </SoftBox>
            <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.45}>
              Nhập “{required}” để xác nhận *
            </SoftTypography>
            <SoftInput
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
              placeholder={required}
            />
          </>
        )}

        <SoftBox
          display="flex"
          gap={1}
          mt={1.7}
          flexDirection={{ xs: "column-reverse", sm: "row" }}
        >
          <SoftButton
            fullWidth
            variant="outlined"
            color="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Đóng
          </SoftButton>
          {allowed && !blockers.length && (
            <SoftButton
              fullWidth
              variant="gradient"
              color={restore ? "warning" : "success"}
              disabled={
                loading || !reason.trim() || !acknowledged || confirmation.trim() !== required
              }
              onClick={() => onSubmit({ reason: reason.trim(), confirmation: required })}
            >
              {loading ? "Đang xử lý..." : restore ? "Khôi phục tồn kho" : "Đồng bộ tồn kho"}
            </SoftButton>
          )}
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

export default function WarehouseStockCheckPanel({ onChanged }) {
  const isAdmin =
    String(useSelector((state) => state.auth?.user?.role) || "").toLowerCase() === "admin";
  const [mode, setMode] = useState("DIRECT");
  const [products, setProducts] = useState([]);
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [directFilter, setDirectFilter] = useState("ALL");
  const [directVisibleLimit, setDirectVisibleLimit] = useState(DIRECT_RENDER_BATCH);
  const [counts, setCounts] = useState({});
  const [notes, setNotes] = useState({});
  const [file, setFile] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState(null);
  const [resultFilter, setResultFilter] = useState("ALL");
  const [resultVisibleLimit, setResultVisibleLimit] = useState(RESULT_RENDER_BATCH);
  const [action, setAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backupMeta, setBackupMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [backupPage, setBackupPage] = useState(1);
  const [backupRefreshKey, setBackupRefreshKey] = useState(0);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupDetail, setBackupDetail] = useState(null);
  const [backupDetailLoading, setBackupDetailLoading] = useState(false);
  const [backupExporting, setBackupExporting] = useState("");

  useEffect(() => {
    if (mode !== "DIRECT") return undefined;
    let active = true;
    setProductsLoading(true);
    InventoryService.getList({ page: 1, limit: 100, sortBy: "productCode", sortOrder: "asc" })
      .then(async (firstResponse) => {
        if (!active) return [];
        const first = Array.isArray(firstResponse?.data?.data) ? firstResponse.data.data : [];
        const pages = Number(firstResponse?.data?.meta?.totalPages || 1);
        if (pages <= 1) return first;
        const remaining = await Promise.all(
          Array.from({ length: pages - 1 }, (_, index) =>
            InventoryService.getList({
              page: index + 2,
              limit: 100,
              sortBy: "productCode",
              sortOrder: "asc",
            })
          )
        );
        if (!active) return [];
        return first.concat(
          ...remaining.map((response) =>
            Array.isArray(response?.data?.data) ? response.data.data : []
          )
        );
      })
      .then((rows) => active && setProducts(rows))
      .catch((error) => active && toast.error(apiError(error, "Không thể tải hàng hóa trong kho")))
      .finally(() => active && setProductsLoading(false));
    try {
      const draft = JSON.parse(localStorage.getItem("warehouse-stock-check-draft") || "{}");
      setCounts(draft.counts && typeof draft.counts === "object" ? draft.counts : {});
      setNotes(draft.notes && typeof draft.notes === "object" ? draft.notes : {});
    } catch {
      setCounts({});
      setNotes({});
    }
    return () => {
      active = false;
    };
  }, [mode, productRefreshKey]);

  useEffect(() => {
    localStorage.setItem(
      "warehouse-stock-check-draft",
      JSON.stringify({ counts, notes, savedAt: new Date().toISOString() })
    );
  }, [counts, notes]);

  useEffect(() => {
    if (!isAdmin || mode !== "BACKUPS") return undefined;
    let active = true;
    setBackupsLoading(true);
    InventoryService.getBackups({ page: backupPage, limit: 10 })
      .then((response) => {
        if (!active) return;
        const nextBackups = Array.isArray(response?.data?.data) ? response.data.data : [];
        setBackups((current) =>
          backupPage > 1 ? mergeUniqueItems(current, nextBackups) : nextBackups
        );
        setBackupMeta({
          page: response?.data?.meta?.page || backupPage,
          total: response?.data?.meta?.total || 0,
          totalPages: response?.data?.meta?.totalPages || 1,
        });
      })
      .catch((error) => active && toast.error(apiError(error, "Không thể tải backup tồn kho")))
      .finally(() => active && setBackupsLoading(false));
    return () => {
      active = false;
    };
  }, [isAdmin, mode, backupPage, backupRefreshKey]);

  const rows = useMemo(
    () =>
      products.map((product, index) => {
        const code = String(product.productCode || product.code || "")
          .trim()
          .toUpperCase();
        const key = code || String(product.productId || index);
        const raw = Object.prototype.hasOwnProperty.call(counts, key) ? counts[key] : "";
        const actual = raw === "" ? null : Number(raw);
        const system = Number(product.warehouseQuantity ?? product.stock ?? 0);
        return {
          key,
          code,
          name: product.productName || product.name || "Sản phẩm",
          unit: product.unit || "—",
          system,
          raw,
          actual,
          difference: actual === null || Number.isNaN(actual) ? null : actual - system,
          note: notes[key] || "",
        };
      }),
    [products, counts, notes]
  );
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("vi");
    return rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.code.toLocaleLowerCase("vi").includes(normalizedSearch) ||
        row.name.toLocaleLowerCase("vi").includes(normalizedSearch);
      const matchesFilter =
        directFilter === "ALL" ||
        (directFilter === "UNCOUNTED" && row.raw === "") ||
        (directFilter === "DIFFERENCE" && row.difference !== null && row.difference !== 0) ||
        (directFilter === "MATCHED" && row.difference === 0);
      return matchesSearch && matchesFilter;
    });
  }, [rows, search, directFilter]);
  const visibleRows = filteredRows.slice(0, directVisibleLimit);
  const counted = useMemo(
    () => rows.filter((row) => row.raw !== "" && Number.isInteger(row.actual)).length,
    [rows]
  );
  const resultItems = useMemo(
    () => (Array.isArray(result?.items) ? result.items : []),
    [result?.items]
  );
  const filteredResultItems = useMemo(
    () => resultItems.filter((item) => resultFilter === "ALL" || item.status === resultFilter),
    [resultItems, resultFilter]
  );
  const visibleResultItems = filteredResultItems.slice(0, resultVisibleLimit);

  useEffect(() => {
    setDirectVisibleLimit(DIRECT_RENDER_BATCH);
  }, [search, directFilter]);

  useEffect(() => {
    setResultVisibleLimit(RESULT_RENDER_BATCH);
  }, [result, resultFilter]);

  const runCompare = async (selectedFile) => {
    try {
      setComparing(true);
      const response = await InventoryService.compareStockCheck(selectedFile);
      const data = unwrap(response);
      setResult({
        ...data,
        summary: data.summary && typeof data.summary === "object" ? data.summary : {},
        items: Array.isArray(data.items) ? data.items : [],
      });
      setResultFilter("ALL");
      setResultVisibleLimit(RESULT_RENDER_BATCH);
      toast.success("Đã đối chiếu tồn kho thực tế với số lượng trên app");
    } catch (error) {
      toast.error(apiError(error, "Không thể đối chiếu tồn kho"));
    } finally {
      setComparing(false);
    }
  };

  const compareDirect = () => {
    if (!counted) return toast.error("Vui lòng nhập số lượng thực tế của ít nhất một sản phẩm");
    const excelRows = rows.map((row, index) => ({
      STT: index + 1,
      "MÃ SẢN PHẨM": row.code,
      "TÊN SẢN PHẨM": row.name,
      "ĐƠN VỊ": row.unit,
      "SỐ LƯỢNG TRÊN APP": row.system,
      "SỐ LƯỢNG THỰC TẾ": row.raw === "" ? "" : Number(row.raw),
      "GHI CHÚ": row.note,
    }));
    runCompare(createExcelFile(excelRows, "kiem-hang-kho-truc-tiep.xlsx", "Kiểm hàng kho"));
  };

  const clearDraft = () => {
    if (counted && !window.confirm("Xóa toàn bộ số lượng thực tế và ghi chú đang nhập?")) return;
    setCounts({});
    setNotes({});
    setResult(null);
    localStorage.removeItem("warehouse-stock-check-draft");
  };

  const selectFile = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!String(selected.name).toLowerCase().endsWith(".xlsx"))
      return toast.error("Chỉ hỗ trợ file Excel .xlsx");
    if (selected.size > 10 * 1024 * 1024) return toast.error("File Excel không được vượt quá 10MB");
    setFile(selected);
    setResult(null);
  };

  const downloadTemplate = async () => {
    try {
      setDownloading(true);
      const response = await InventoryService.downloadStockCheckTemplate();
      downloadResponse(response, "warehouse-stock-check.xlsx");
    } catch (error) {
      toast.error(apiError(error, "Không thể tải file mẫu"));
    } finally {
      setDownloading(false);
    }
  };

  const exportResult = async () => {
    if (!result?.comparisonId) return;
    try {
      setExporting(true);
      const response = await InventoryService.exportStockCheck(result.comparisonId);
      downloadResponse(response, `ket-qua-kiem-kho-${result.comparisonId}.xlsx`);
    } catch (error) {
      toast.error(apiError(error, "Không thể xuất kết quả kiểm hàng"));
    } finally {
      setExporting(false);
    }
  };

  const previewSync = async () => {
    try {
      setActionLoading(true);
      const response = await InventoryService.previewStockCheckSync(result.comparisonId);
      setAction({
        type: "SYNC",
        preview: unwrap(response),
        idempotencyKey: makeKey("warehouse-sync"),
      });
    } catch (error) {
      toast.error(apiError(error, "Không thể kiểm tra điều kiện đồng bộ"));
    } finally {
      setActionLoading(false);
    }
  };

  const viewBackup = async (backup) => {
    try {
      setBackupDetailLoading(true);
      const response = await InventoryService.getBackup(getId(backup));
      setBackupDetail(unwrap(response));
    } catch (error) {
      toast.error(apiError(error, "Không thể tải chi tiết backup"));
    } finally {
      setBackupDetailLoading(false);
    }
  };

  const exportBackup = async (backup) => {
    const id = getId(backup);
    try {
      setBackupExporting(String(id));
      const response = await InventoryService.exportBackup(id);
      downloadResponse(response, `${backup.code || "backup-ton-kho"}.xlsx`);
    } catch (error) {
      toast.error(apiError(error, "Không thể xuất backup tồn kho"));
    } finally {
      setBackupExporting("");
    }
  };

  const previewRestore = async (backup) => {
    try {
      setActionLoading(true);
      const response = await InventoryService.previewBackupRestore(getId(backup));
      setAction({
        type: "RESTORE",
        backup,
        preview: unwrap(response),
        idempotencyKey: makeKey("warehouse-restore"),
      });
      setBackupDetail(null);
    } catch (error) {
      toast.error(apiError(error, "Không thể kiểm tra điều kiện khôi phục"));
    } finally {
      setActionLoading(false);
    }
  };

  const submitAction = async ({ reason, confirmation }) => {
    const restore = action.type === "RESTORE";
    try {
      setActionLoading(true);
      const payload = { reason, confirmation, idempotencyKey: action.idempotencyKey };
      if (restore) await InventoryService.restoreBackup(getId(action.backup), payload);
      else await InventoryService.syncStockCheck(result.comparisonId, payload);
      setAction(null);
      setResult(null);
      setCounts({});
      setNotes({});
      localStorage.removeItem("warehouse-stock-check-draft");
      setMode("BACKUPS");
      setBackupPage(1);
      setBackupRefreshKey((value) => value + 1);
      setProductRefreshKey((value) => value + 1);
      onChanged?.();
      toast.success(restore ? "Đã khôi phục tồn kho từ backup" : "Đã đồng bộ tồn kho thực tế");
    } catch (error) {
      const changed = error?.response?.data?.changedProducts;
      if (Array.isArray(changed) && changed.length)
        toast.error(`Tồn kho đã thay đổi ở ${changed.length} sản phẩm. Vui lòng kiểm lại.`);
      else
        toast.error(
          apiError(error, restore ? "Không thể khôi phục tồn kho" : "Không thể đồng bộ tồn kho")
        );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SoftBox>
      <SoftBox
        display="flex"
        gap={1}
        mb={{ xs: 1.25, md: 2 }}
        pb={0.35}
        sx={{
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {[
          ["DIRECT", "Nhập trực tiếp", "touch_app", "Đếm và nhập ngay trên thiết bị"],
          ["EXCEL", "Dùng file Excel", "table_view", "Tải mẫu và đối chiếu bằng file"],
          ...(isAdmin
            ? [["BACKUPS", "Bản sao tồn kho", "restore", "Xem và khôi phục backup"]]
            : []),
        ].map(([value, label, icon, description]) => {
          const active = mode === value;
          return (
            <SoftBox
              component="button"
              type="button"
              key={value}
              onClick={() => {
                setMode(value);
                setResult(null);
                if (value === "BACKUPS") setBackupPage(1);
              }}
              p={{ xs: 1.15, md: 1.45 }}
              minWidth={{ xs: 190, sm: 0 }}
              flex={{ xs: "0 0 auto", sm: 1 }}
              textAlign="left"
              sx={{
                border: active ? "2px solid #1976d2" : "1px solid #dce2e9",
                borderRadius: 2.25,
                bgcolor: active ? "#e7f3ff" : "#fff",
                color: active ? "#0d47a1" : "#52606d",
                cursor: "pointer",
                scrollSnapAlign: "start",
                boxShadow: active ? "0 6px 18px rgba(25,118,210,.12)" : "none",
              }}
            >
              <SoftBox display="flex" alignItems="center" gap={0.8}>
                <Icon>{icon}</Icon>
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: "inherit" }}>
                  {label}
                </SoftTypography>
              </SoftBox>
              <SoftTypography
                variant="caption"
                color="text"
                display={{ xs: "none", md: "block" }}
                mt={0.3}
              >
                {description}
              </SoftTypography>
            </SoftBox>
          );
        })}
      </SoftBox>

      {mode === "DIRECT" && !result && (
        <SoftBox>
          <SoftBox
            p={{ xs: 1.4, md: 1.8 }}
            mb={1.3}
            borderRadius={2.5}
            color="#fff"
            sx={{
              background: "linear-gradient(135deg, #1565c0 0%, #0288d1 100%)",
              boxShadow: "0 10px 24px rgba(21,101,192,.2)",
            }}
          >
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={1}>
              <SoftBox>
                <SoftTypography variant="caption" sx={{ color: "rgba(255,255,255,.8)" }}>
                  TIẾN ĐỘ KIỂM KHO
                </SoftTypography>
                <SoftTypography variant="h5" fontWeight="bold" sx={{ color: "#fff" }}>
                  {counted}/{rows.length} sản phẩm
                </SoftTypography>
                <SoftTypography variant="caption" sx={{ color: "rgba(255,255,255,.84)" }}>
                  Tự động lưu bản nháp trên thiết bị
                </SoftTypography>
              </SoftBox>
              <SoftBox
                width={62}
                height={62}
                borderRadius="50%"
                bgcolor="rgba(255,255,255,.16)"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#fff" }}>
                  {rows.length ? Math.round((counted / rows.length) * 100) : 0}%
                </SoftTypography>
              </SoftBox>
            </SoftBox>
            <SoftBox
              height={7}
              borderRadius={4}
              bgcolor="rgba(255,255,255,.2)"
              overflow="hidden"
              mt={1.15}
            >
              <SoftBox
                height="100%"
                width={`${rows.length ? Math.round((counted / rows.length) * 100) : 0}%`}
                bgcolor="#fff"
                borderRadius={4}
                sx={{ transition: "width .2s ease" }}
              />
            </SoftBox>
          </SoftBox>

          <SoftBox
            position="sticky"
            top={0}
            zIndex={3}
            mb={1.25}
            p={{ xs: 1, md: 1.2 }}
            bgcolor="rgba(255,255,255,.97)"
            borderRadius={2.25}
            sx={{ border: "1px solid #e3e8ef", backdropFilter: "blur(8px)" }}
          >
            <SoftBox display="flex" gap={0.75} alignItems="center">
              <SoftBox flex={1}>
                <SoftInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm nhanh sản phẩm..."
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <IconButton
                onClick={clearDraft}
                title="Xóa bản nháp"
                sx={{ border: "1px solid #ffcdd2", color: "#c62828", flexShrink: 0 }}
              >
                <Icon>delete_sweep</Icon>
              </IconButton>
            </SoftBox>
            <SoftBox
              display="flex"
              gap={0.55}
              mt={0.8}
              sx={{ overflowX: "auto", scrollbarWidth: "none" }}
            >
              {[
                ["ALL", "Tất cả", rows.length],
                ["UNCOUNTED", "Chưa kiểm", rows.filter((row) => row.raw === "").length],
                [
                  "DIFFERENCE",
                  "Có lệch",
                  rows.filter((row) => row.difference !== null && row.difference !== 0).length,
                ],
                ["MATCHED", "Đã khớp", rows.filter((row) => row.difference === 0).length],
              ].map(([value, label, total]) => {
                const active = directFilter === value;
                return (
                  <SoftBox
                    component="button"
                    type="button"
                    key={value}
                    onClick={() => setDirectFilter(value)}
                    px={1}
                    py={0.6}
                    minWidth="max-content"
                    sx={{
                      border: active ? "1px solid #1976d2" : "1px solid #dce2e9",
                      borderRadius: 5,
                      bgcolor: active ? "#e3f2fd" : "#fff",
                      color: active ? "#1565c0" : "#607080",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {label} · {total}
                  </SoftBox>
                );
              })}
            </SoftBox>
          </SoftBox>

          <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={1} mb={1}>
            <SoftTypography variant="button" fontWeight="bold">
              {filteredRows.length} sản phẩm
            </SoftTypography>
            <SoftButton
              size="small"
              variant="text"
              color="info"
              startIcon={<Icon>content_copy</Icon>}
              onClick={() => {
                const next = {};
                rows.forEach((row) => {
                  next[row.key] = row.system;
                });
                setCounts(next);
              }}
            >
              Điền tất cả theo app
            </SoftButton>
          </SoftBox>

          {productsLoading ? (
            <SoftBox py={5} textAlign="center">
              <SoftTypography variant="button" color="text">
                Đang tải hàng hóa...
              </SoftTypography>
            </SoftBox>
          ) : (
            <SoftBox
              display="grid"
              gap={{ xs: 1.15, md: 1.4 }}
              sx={{
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                  xl: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {visibleRows.map((row) => (
                <SoftBox
                  key={row.key}
                  position="relative"
                  p={{ xs: 1.35, md: 1.5 }}
                  pt={{ xs: 1.6, md: 1.7 }}
                  borderRadius={2.5}
                  bgcolor="#fff"
                  sx={{
                    border:
                      row.raw === ""
                        ? "1px solid #d9e1ea"
                        : row.difference === 0
                        ? "2px solid #43a047"
                        : "2px solid #f9a825",
                    boxShadow:
                      row.raw === ""
                        ? "0 3px 12px rgba(31,50,73,.05)"
                        : "0 6px 18px rgba(31,50,73,.09)",
                    transition: "border-color .16s ease, box-shadow .16s ease",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 5,
                      bgcolor:
                        row.raw === "" ? "#cfd8e3" : row.difference === 0 ? "#43a047" : "#f9a825",
                    },
                  }}
                >
                  <SoftBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={1}
                  >
                    <SoftBox minWidth={0} flex={1}>
                      <SoftTypography
                        variant="button"
                        fontWeight="bold"
                        display="block"
                        sx={{ fontSize: { xs: 15, md: 16 }, lineHeight: 1.35 }}
                      >
                        {row.name}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text" display="block" mt={0.2}>
                        {row.code} · {row.unit}
                      </SoftTypography>
                    </SoftBox>
                    <SoftBox
                      px={1}
                      py={0.55}
                      minWidth={72}
                      textAlign="center"
                      borderRadius={2}
                      bgcolor="#e8f2ff"
                      flexShrink={0}
                    >
                      <SoftTypography variant="caption" color="text" display="block" lineHeight={1}>
                        Trên app
                      </SoftTypography>
                      <SoftTypography variant="h6" fontWeight="bold" sx={{ color: "#1565c0" }}>
                        {row.system}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>

                  <SoftBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={1.15}
                    mb={0.6}
                  >
                    <SoftTypography variant="caption" fontWeight="bold" color="text">
                      SỐ LƯỢNG THỰC TẾ
                    </SoftTypography>
                    {row.difference !== null && (
                      <SoftBox
                        px={0.9}
                        py={0.38}
                        borderRadius={4}
                        bgcolor={
                          row.difference === 0
                            ? "#e8f5e9"
                            : row.difference < 0
                            ? "#ffebee"
                            : "#fff3e0"
                        }
                      >
                        <SoftTypography
                          variant="caption"
                          fontWeight="bold"
                          sx={{
                            color:
                              row.difference === 0
                                ? "#2e7d32"
                                : row.difference < 0
                                ? "#c62828"
                                : "#ef6c00",
                          }}
                        >
                          {row.difference === 0
                            ? "Đã khớp"
                            : `${row.difference > 0 ? "Thừa +" : "Thiếu "}${row.difference}`}
                        </SoftTypography>
                      </SoftBox>
                    )}
                  </SoftBox>
                  <SoftBox display="flex" alignItems="center" gap={0.8}>
                    <IconButton
                      onClick={() =>
                        setCounts((current) => ({
                          ...current,
                          [row.key]: Math.max(0, Number(row.raw || 0) - 1),
                        }))
                      }
                      sx={{
                        width: 52,
                        height: 52,
                        border: "1px solid #b8c6d8",
                        bgcolor: "#f5f8fc",
                        color: "#344767",
                        flexShrink: 0,
                      }}
                    >
                      <Icon>remove</Icon>
                    </IconButton>
                    <TextField
                      type="number"
                      value={row.raw}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value === "" || (/^\d+$/.test(value) && Number(value) >= 0))
                          setCounts((current) => ({ ...current, [row.key]: value }));
                      }}
                      inputProps={{
                        min: 0,
                        step: 1,
                        inputMode: "numeric",
                        style: { textAlign: "center", fontWeight: 800, fontSize: 20 },
                      }}
                      placeholder="Nhập số đếm"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        "& .MuiOutlinedInput-root": {
                          height: 54,
                          bgcolor: "#fff",
                          borderRadius: 2,
                        },
                      }}
                    />
                    <IconButton
                      onClick={() =>
                        setCounts((current) => ({
                          ...current,
                          [row.key]: Number(row.raw || 0) + 1,
                        }))
                      }
                      sx={{
                        width: 52,
                        height: 52,
                        border: "1px solid #1976d2",
                        bgcolor: "#1976d2",
                        color: "#fff",
                        flexShrink: 0,
                        "&:hover": { bgcolor: "#1565c0" },
                      }}
                    >
                      <Icon>add</Icon>
                    </IconButton>
                  </SoftBox>
                  <SoftBox display="flex" gap={0.65} mt={0.85} alignItems="center">
                    <SoftButton
                      size="small"
                      variant="text"
                      color="info"
                      startIcon={<Icon>done_all</Icon>}
                      onClick={() =>
                        setCounts((current) => ({ ...current, [row.key]: row.system }))
                      }
                      sx={{ minWidth: "max-content", px: 0.8 }}
                    >
                      Bằng app
                    </SoftButton>
                    <SoftBox flex={1} minWidth={0}>
                      <SoftInput
                        value={row.note}
                        onChange={(event) =>
                          setNotes((current) => ({ ...current, [row.key]: event.target.value }))
                        }
                        placeholder="Ghi chú (nếu có)"
                        size="small"
                      />
                    </SoftBox>
                    {row.raw !== "" && (
                      <IconButton
                        size="small"
                        title="Xóa số đã nhập"
                        onClick={() => setCounts((current) => ({ ...current, [row.key]: "" }))}
                        sx={{ color: "#90a0b5", flexShrink: 0 }}
                      >
                        <Icon>backspace</Icon>
                      </IconButton>
                    )}
                  </SoftBox>
                </SoftBox>
              ))}
            </SoftBox>
          )}

          {!productsLoading && visibleRows.length < filteredRows.length && (
            <MobileLoadMore
              loading={false}
              hasMore={visibleRows.length < filteredRows.length}
              onLoadMore={() => setDirectVisibleLimit((current) => current + DIRECT_RENDER_BATCH)}
            />
          )}

          {!productsLoading && !visibleRows.length && (
            <SoftBox py={5} px={2} textAlign="center" borderRadius={2.5} bgcolor="#f7f9fc">
              <Icon sx={{ fontSize: 44, color: "#aab7c4" }}>search_off</Icon>
              <SoftTypography variant="button" fontWeight="bold" display="block">
                Không có sản phẩm phù hợp
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                Thử đổi từ khóa hoặc chọn một bộ lọc khác.
              </SoftTypography>
            </SoftBox>
          )}

          <SoftBox
            position="sticky"
            bottom={0}
            mt={1.5}
            p={{ xs: 1, md: 1.2 }}
            bgcolor="rgba(255,255,255,.97)"
            zIndex={2}
            borderRadius={{ xs: "18px 18px 0 0", md: 2 }}
            sx={{
              border: "1px solid #dfe5ec",
              boxShadow: "0 -8px 24px rgba(31,50,73,.12)",
              backdropFilter: "blur(8px)",
            }}
          >
            <SoftBox display="flex" justifyContent="space-between" mb={0.7} px={0.25}>
              <SoftTypography variant="caption" color="text">
                Còn {Math.max(0, rows.length - counted)} sản phẩm chưa kiểm
              </SoftTypography>
              <SoftTypography variant="caption" fontWeight="bold" color="info">
                {counted}/{rows.length}
              </SoftTypography>
            </SoftBox>
            <SoftButton
              fullWidth
              variant="gradient"
              color="success"
              startIcon={<Icon>fact_check</Icon>}
              disabled={!counted || comparing}
              onClick={compareDirect}
              sx={{ minHeight: 54, fontSize: 14 }}
            >
              {comparing ? "Đang đối chiếu..." : "Hoàn tất và xem kết quả"}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      )}

      {mode === "EXCEL" && !result && (
        <SoftBox>
          <SoftBox
            p={{ xs: 1.5, md: 2 }}
            mb={1.4}
            borderRadius={2.5}
            sx={{
              color: "#fff",
              background: "linear-gradient(135deg, #37474f 0%, #1565c0 100%)",
              boxShadow: "0 8px 22px rgba(31,50,73,.15)",
            }}
          >
            <SoftBox display="flex" gap={1.1} alignItems="center">
              <SoftBox
                width={48}
                height={48}
                borderRadius={2}
                bgcolor="rgba(255,255,255,.14)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <Icon>table_view</Icon>
              </SoftBox>
              <SoftBox>
                <SoftTypography variant="h6" fontWeight="bold" sx={{ color: "#fff" }}>
                  Kiểm kho bằng file Excel
                </SoftTypography>
                <SoftTypography variant="caption" sx={{ color: "rgba(255,255,255,.82)" }}>
                  Phù hợp khi đã kiểm đếm trên file. Đối chiếu không làm thay đổi tồn kho.
                </SoftTypography>
              </SoftBox>
            </SoftBox>
          </SoftBox>
          <SoftBox
            display="grid"
            gap={1}
            sx={{ gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" } }}
          >
            <SoftBox
              component="button"
              type="button"
              onClick={downloadTemplate}
              disabled={downloading}
              p={{ xs: 1.3, md: 1.5 }}
              textAlign="left"
              sx={{
                border: "1px solid #bbdefb",
                borderRadius: 2.5,
                bgcolor: "#f5faff",
                cursor: downloading ? "wait" : "pointer",
                minHeight: { xs: 92, sm: 150 },
              }}
            >
              <SoftBox display="flex" alignItems="center" gap={1} mb={{ xs: 0.45, sm: 1 }}>
                <SoftBox
                  width={40}
                  height={40}
                  borderRadius={2}
                  bgcolor="#e3f2fd"
                  color="#1565c0"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon>download</Icon>
                </SoftBox>
                <SoftTypography variant="button" fontWeight="bold">
                  1. Tải file mẫu
                </SoftTypography>
              </SoftBox>
              <SoftTypography variant="caption" color="text">
                {downloading ? "Đang tạo file..." : "Danh sách hàng và tồn hiện tại được điền sẵn."}
              </SoftTypography>
            </SoftBox>

            <SoftBox
              component="label"
              p={{ xs: 1.3, md: 1.5 }}
              textAlign="left"
              sx={{
                border: file ? "2px solid #43a047" : "1px dashed #90a4ae",
                borderRadius: 2.5,
                bgcolor: file ? "#f1f8f2" : "#fff",
                cursor: "pointer",
                minHeight: { xs: 92, sm: 150 },
              }}
            >
              <SoftBox display="flex" alignItems="center" gap={1} mb={{ xs: 0.45, sm: 1 }}>
                <SoftBox
                  width={40}
                  height={40}
                  borderRadius={2}
                  bgcolor={file ? "#e8f5e9" : "#eceff1"}
                  color={file ? "#2e7d32" : "#546e7a"}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon>{file ? "task_alt" : "upload_file"}</Icon>
                </SoftBox>
                <SoftTypography variant="button" fontWeight="bold">
                  2. Chọn file đã đếm
                </SoftTypography>
              </SoftBox>
              <SoftTypography
                variant="caption"
                color="text"
                display="block"
                sx={{ wordBreak: "break-word" }}
              >
                {file ? file.name : "Chạm để chọn file .xlsx từ thiết bị."}
              </SoftTypography>
              <input type="file" hidden accept=".xlsx" onChange={selectFile} />
            </SoftBox>

            <SoftBox
              component="button"
              type="button"
              onClick={() => runCompare(file)}
              disabled={!file || comparing}
              p={{ xs: 1.3, md: 1.5 }}
              textAlign="left"
              sx={{
                border: file ? "1px solid #a5d6a7" : "1px solid #e0e5eb",
                borderRadius: 2.5,
                bgcolor: file ? "#e8f5e9" : "#f7f8fa",
                color: file ? "#1b5e20" : "#9aa6b2",
                cursor: file ? "pointer" : "not-allowed",
                minHeight: { xs: 92, sm: 150 },
              }}
            >
              <SoftBox display="flex" alignItems="center" gap={1} mb={{ xs: 0.45, sm: 1 }}>
                <SoftBox
                  width={40}
                  height={40}
                  borderRadius={2}
                  bgcolor={file ? "#c8e6c9" : "#eceff1"}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon>rule</Icon>
                </SoftBox>
                <SoftTypography variant="button" fontWeight="bold" sx={{ color: "inherit" }}>
                  3. Đối chiếu
                </SoftTypography>
              </SoftBox>
              <SoftTypography variant="caption" sx={{ color: "inherit" }}>
                {comparing
                  ? "Đang đọc và kiểm tra file..."
                  : "Xem ngay sản phẩm khớp, thiếu hoặc thừa."}
              </SoftTypography>
            </SoftBox>
          </SoftBox>
          <SoftBox mt={1.25} p={1.1} borderRadius={2} bgcolor="#fff8e1">
            <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "#8d6e00" }}>
              <Icon sx={{ verticalAlign: "middle", fontSize: 17, mr: 0.45 }}>info</Icon>
              Sau khi đối chiếu, admin vẫn phải xem lại và xác nhận riêng nếu muốn đồng bộ tồn kho.
            </SoftTypography>
          </SoftBox>
        </SoftBox>
      )}

      {result && (
        <SoftBox>
          <SoftBox
            display="flex"
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            flexDirection={{ xs: "column", md: "row" }}
            gap={1}
            mb={1.25}
            p={{ xs: 1.4, md: 1.7 }}
            borderRadius={2.5}
            bgcolor="#f5faff"
            sx={{ border: "1px solid #cfe4f7" }}
          >
            <SoftBox display="flex" gap={1} alignItems="center">
              <SoftBox
                width={46}
                height={46}
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
                <SoftTypography variant="h6" fontWeight="bold">
                  Kết quả kiểm hàng
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {dateTime(result.comparedAt)} · {resultItems.length} sản phẩm
                </SoftTypography>
              </SoftBox>
            </SoftBox>
            <SoftBox display="flex" gap={0.7} flexWrap="wrap" width={{ xs: "100%", md: "auto" }}>
              <SoftButton
                size="small"
                variant="outlined"
                color="info"
                onClick={() => setResult(null)}
                sx={{ flex: { xs: 1, md: "none" }, minHeight: 42 }}
              >
                Kiểm lại
              </SoftButton>
              <SoftButton
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={<Icon>download</Icon>}
                disabled={exporting}
                onClick={exportResult}
                sx={{ flex: { xs: 1, md: "none" }, minHeight: 42 }}
              >
                Xuất Excel
              </SoftButton>
            </SoftBox>
          </SoftBox>
          <Grid container spacing={1} mb={1.25}>
            {[
              [
                "Đã kiểm",
                `${result.summary?.countedProducts || 0}/${result.summary?.totalProducts || 0}`,
                "#1565c0",
                "#e3f2fd",
              ],
              ["Khớp", result.summary?.matchedProducts || 0, "#2e7d32", "#e8f5e9"],
              [
                "Thiếu",
                `${result.summary?.shortageProducts || 0} SP · −${
                  result.summary?.totalShortageQuantity || 0
                }`,
                "#c62828",
                "#ffebee",
              ],
              [
                "Thừa",
                `${result.summary?.surplusProducts || 0} SP · +${
                  result.summary?.totalSurplusQuantity || 0
                }`,
                "#ef6c00",
                "#fff3e0",
              ],
            ].map(([label, value, color, background]) => (
              <Grid item xs={6} md={3} key={label}>
                <SoftBox p={1} borderRadius={2} bgcolor={background}>
                  <SoftTypography variant="caption" color="text" display="block">
                    {label}
                  </SoftTypography>
                  <SoftTypography variant="h6" fontWeight="bold" sx={{ color }}>
                    {value}
                  </SoftTypography>
                </SoftBox>
              </Grid>
            ))}
          </Grid>
          <SoftBox display="flex" gap={0.6} mb={1.2} sx={{ overflowX: "auto" }}>
            {["ALL", ...Object.keys(STATUSES)].map((value) => {
              const active = resultFilter === value;
              const count =
                value === "ALL"
                  ? resultItems.length
                  : resultItems.filter((item) => item.status === value).length;
              return (
                <SoftBox
                  component="button"
                  type="button"
                  key={value}
                  onClick={() => setResultFilter(value)}
                  px={1.1}
                  py={0.7}
                  minWidth="max-content"
                  sx={{
                    border: active ? "2px solid #1976d2" : "1px solid #dce2e9",
                    borderRadius: 2,
                    bgcolor: active ? "#e3f2fd" : "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {value === "ALL" ? "Tất cả" : STATUSES[value].label} ({count})
                </SoftBox>
              );
            })}
          </SoftBox>
          <SoftBox
            display="grid"
            gap={0.8}
            sx={{
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                xl: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
            {visibleResultItems.map((item, index) => {
              const status = STATUSES[item.status] || STATUSES.INVALID;
              return (
                <SoftBox
                  key={`${item.productCode}-${index}`}
                  p={1.25}
                  borderRadius={2.25}
                  bgcolor="#fff"
                  sx={{
                    border: `1px solid ${status.color}45`,
                    borderLeft: `5px solid ${status.color}`,
                    boxShadow: "0 3px 12px rgba(31,50,73,.05)",
                  }}
                >
                  <SoftBox display="flex" justifyContent="space-between" gap={1}>
                    <SoftBox>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {item.productName || "Sản phẩm chưa xác định"}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {item.productCode} · {item.unit}
                      </SoftTypography>
                    </SoftBox>
                    <SoftBox
                      px={0.75}
                      py={0.3}
                      height="fit-content"
                      borderRadius={1.5}
                      bgcolor={status.background}
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
                    mt={0.8}
                    display="grid"
                    gap={0.6}
                    sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                  >
                    {[
                      ["Trên app", item.systemQuantity],
                      ["Thực tế", item.actualQuantity],
                      ["Chênh lệch", item.differenceQuantity],
                    ].map(([label, value]) => (
                      <SoftBox key={label} p={0.7} borderRadius={1.3} bgcolor="#f5f7fa">
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
                    <SoftTypography variant="caption" color="text" display="block" mt={0.7}>
                      Ghi chú: {item.note}
                    </SoftTypography>
                  )}
                </SoftBox>
              );
            })}
          </SoftBox>
          {visibleResultItems.length < filteredResultItems.length && (
            <MobileLoadMore
              loading={false}
              hasMore={visibleResultItems.length < filteredResultItems.length}
              onLoadMore={() => setResultVisibleLimit((current) => current + RESULT_RENDER_BATCH)}
            />
          )}
          {isAdmin && (
            <SoftBox
              position="sticky"
              bottom={0}
              zIndex={3}
              mt={1.4}
              p={1}
              bgcolor="rgba(255,255,255,.97)"
              borderRadius={{ xs: "18px 18px 0 0", md: 2 }}
              sx={{
                border: "1px solid #e0e5eb",
                boxShadow: "0 -8px 24px rgba(31,50,73,.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <SoftButton
                fullWidth
                variant="gradient"
                color="warning"
                startIcon={<Icon>sync</Icon>}
                disabled={actionLoading}
                onClick={previewSync}
                sx={{ minHeight: 52 }}
              >
                Xem cảnh báo và đồng bộ tồn kho
              </SoftButton>
            </SoftBox>
          )}
        </SoftBox>
      )}

      {mode === "BACKUPS" && isAdmin && (
        <SoftBox>
          <SoftBox
            p={1.3}
            mb={1.3}
            borderRadius={2}
            bgcolor="#fff8e1"
            sx={{ border: "1px solid #ffe0a3" }}
          >
            <SoftTypography variant="button" fontWeight="bold" display="block">
              Backup tồn kho được lưu tự động
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Mỗi lần đồng bộ hoặc khôi phục, backend lưu toàn bộ tồn kho trước khi thay đổi.
            </SoftTypography>
          </SoftBox>
          {backupsLoading && !backups.length ? (
            <SoftBox py={5} textAlign="center">
              <SoftTypography variant="button" color="text">
                Đang tải backup...
              </SoftTypography>
            </SoftBox>
          ) : (
            <SoftBox
              display="grid"
              gap={1}
              sx={{ gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}
            >
              {backups.map((backup) => (
                <SoftBox
                  key={getId(backup)}
                  p={1.35}
                  borderRadius={2.5}
                  bgcolor="#fff"
                  sx={{
                    border: "1px solid #dfe5ec",
                    borderTop: `5px solid ${
                      backup.sourceType === "BEFORE_RESTORE" ? "#ef6c00" : "#1976d2"
                    }`,
                    boxShadow: "0 4px 14px rgba(31,50,73,.06)",
                  }}
                >
                  <SoftBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                    flexDirection="column"
                    gap={1}
                  >
                    <SoftBox>
                      <SoftBox display="flex" gap={0.6} alignItems="center" flexWrap="wrap">
                        <SoftTypography variant="button" fontWeight="bold">
                          {backup.code}
                        </SoftTypography>
                        <SoftBox
                          component="span"
                          px={0.7}
                          py={0.25}
                          borderRadius={1.5}
                          bgcolor={backup.sourceType === "BEFORE_RESTORE" ? "#fce4ec" : "#e3f2fd"}
                        >
                          <SoftTypography component="span" variant="caption" fontWeight="bold">
                            {sourceLabel(backup.sourceType)}
                          </SoftTypography>
                        </SoftBox>
                        {backup.restoredAt && (
                          <SoftTypography variant="caption" color="success" fontWeight="bold">
                            Đã khôi phục
                          </SoftTypography>
                        )}
                      </SoftBox>
                      <SoftTypography variant="caption" color="text" display="block">
                        {dateTime(backup.createdAt)} · {backup.createdByName || "—"}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {backup.reason || "Không có ghi chú"}
                      </SoftTypography>
                    </SoftBox>
                    <SoftBox display="flex" gap={0.55} flexWrap="wrap" width="100%">
                      <SoftButton
                        size="small"
                        variant="outlined"
                        color="info"
                        disabled={backupDetailLoading}
                        onClick={() => viewBackup(backup)}
                        sx={{ flex: 1 }}
                      >
                        Chi tiết
                      </SoftButton>
                      <SoftButton
                        size="small"
                        variant="outlined"
                        color="secondary"
                        disabled={backupExporting === String(getId(backup))}
                        onClick={() => exportBackup(backup)}
                        sx={{ flex: 1 }}
                      >
                        Excel
                      </SoftButton>
                      <SoftButton
                        size="small"
                        variant="gradient"
                        color="warning"
                        startIcon={<Icon>restore</Icon>}
                        disabled={Boolean(backup.restoredAt) || actionLoading}
                        onClick={() => previewRestore(backup)}
                        sx={{ flex: "1 0 100%", minHeight: 42 }}
                      >
                        {backup.restoredAt ? "Đã khôi phục" : "Khôi phục"}
                      </SoftButton>
                    </SoftBox>
                  </SoftBox>
                  <SoftBox
                    mt={0.9}
                    display="grid"
                    gap={0.6}
                    sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                  >
                    {[
                      ["Loại hàng", backup.totalProducts || 0],
                      ["Số lượng", backup.totalQuantity || 0],
                      ["Giá trị bán", money(backup.totalSellValue || 0)],
                    ].map(([label, value]) => (
                      <SoftBox key={label} p={0.7} borderRadius={1.3} bgcolor="#f5f7fa">
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
              ))}
            </SoftBox>
          )}
          {!backupsLoading && !backups.length && (
            <SoftBox py={5} textAlign="center">
              <Icon sx={{ fontSize: 46, color: "#b0bec5" }}>restore_page</Icon>
              <SoftTypography variant="button" fontWeight="bold" display="block">
                Chưa có backup tồn kho
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                Backup đầu tiên sẽ được tạo khi đồng bộ kiểm hàng.
              </SoftTypography>
            </SoftBox>
          )}
          <MobileLoadMore
            loading={backupsLoading}
            hasMore={backupPage < (backupMeta.totalPages || 1)}
            onLoadMore={() => setBackupPage((value) => value + 1)}
          />
        </SoftBox>
      )}

      <ActionModal
        action={action}
        loading={actionLoading}
        onClose={() => setAction(null)}
        onSubmit={submitAction}
      />

      <Modal open={Boolean(backupDetail)} onClose={() => setBackupDetail(null)}>
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
          {backupDetail && (
            <>
              <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1.2}>
                <SoftBox>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {backupDetail.code}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {sourceLabel(backupDetail.sourceType)} · {dateTime(backupDetail.createdAt)}
                  </SoftTypography>
                </SoftBox>
                <IconButton onClick={() => setBackupDetail(null)}>
                  <Icon>close</Icon>
                </IconButton>
              </SoftBox>
              <Grid container spacing={1} mb={1.2}>
                {[
                  ["Loại hàng", backupDetail.totalProducts || 0],
                  ["Số lượng", backupDetail.totalQuantity || 0],
                  ["Giá trị bán", money(backupDetail.totalSellValue || 0)],
                ].map(([label, value]) => (
                  <Grid item xs={4} key={label}>
                    <SoftBox p={0.8} borderRadius={1.5} bgcolor="#f5f7fa">
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
              <SoftBox
                maxHeight={430}
                overflow="auto"
                borderRadius={2}
                sx={{ border: "1px solid #dfe5ec" }}
              >
                {(backupDetail.items || []).map((item, index) => (
                  <SoftBox
                    key={`${item.productId}-${index}`}
                    display="flex"
                    justifyContent="space-between"
                    gap={1}
                    px={1.1}
                    py={0.8}
                    sx={{ borderBottom: "1px solid #edf0f3" }}
                  >
                    <SoftBox>
                      <SoftTypography variant="caption" fontWeight="bold" display="block">
                        {index + 1}. {item.productName}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {item.productCode} · {item.unit}
                      </SoftTypography>
                    </SoftBox>
                    <SoftBox textAlign="right">
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {item.quantity || 0}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {money(item.sellPrice || 0)}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                ))}
              </SoftBox>
              <SoftBox display="flex" gap={1} mt={1.3} flexDirection={{ xs: "column", sm: "row" }}>
                <SoftButton
                  fullWidth
                  variant="outlined"
                  color="info"
                  startIcon={<Icon>download</Icon>}
                  onClick={() => exportBackup(backupDetail)}
                >
                  Xuất Excel
                </SoftButton>
                <SoftButton
                  fullWidth
                  variant="gradient"
                  color="warning"
                  startIcon={<Icon>restore</Icon>}
                  disabled={Boolean(backupDetail.restoredAt)}
                  onClick={() => previewRestore(backupDetail)}
                >
                  {backupDetail.restoredAt ? "Đã khôi phục" : "Khôi phục backup"}
                </SoftButton>
              </SoftBox>
            </>
          )}
        </SoftBox>
      </Modal>
    </SoftBox>
  );
}
