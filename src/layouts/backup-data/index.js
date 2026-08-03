import { useEffect, useRef, useState } from "react";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Pagination from "@mui/material/Pagination";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import BackupService from "services/backupService";
import { toast } from "react-toastify";

const MAX_BACKUP_SIZE = 512 * 1024 * 1024;
const CONFIRMATION_TEXT = "KHOI PHUC DU LIEU";
const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const fileSize = (bytes = 0) => {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(2)} GB`;
};
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const errorMessage = (error, fallback) => {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "object") return message.message || fallback;
  return message || fallback;
};
const filenameFromResponse = (response) => {
  const disposition = response?.headers?.["content-disposition"] || "";
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  if (utf8Name) return decodeURIComponent(utf8Name);
  if (plainName) return plainName;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `phuclong-backup-${stamp}.plbackup`;
};
const makeIdempotencyKey = () => {
  const uuid = typeof window !== "undefined" ? window.crypto?.randomUUID?.() : "";
  return `system-restore-${uuid || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
};
const getId = (value) => value?.id || value?._id;
const snapshotSourceLabel = (source) =>
  source === "BEFORE_RESTORE" ? "An toàn trước khôi phục" : "Tạo thủ công";
const normalizedCollections = (inspection = {}) => {
  const safeInspection = inspection && typeof inspection === "object" ? inspection : {};
  const source =
    safeInspection.collections ||
    safeInspection.manifest?.collections ||
    safeInspection.summary?.collections ||
    [];
  if (Array.isArray(source)) {
    return source.map((item) =>
      typeof item === "string"
        ? { name: item, documents: 0 }
        : {
            name: item.name || item.collection || "Không xác định",
            documents: Number(item.documents ?? item.count ?? item.total ?? 0),
          }
    );
  }
  return Object.entries(source).map(([name, count]) => ({
    name,
    documents: Number(count?.documents ?? count?.count ?? count ?? 0),
  }));
};

export default function BackupData() {
  const inputRef = useRef(null);
  const pollRef = useRef(null);
  const [backupMode, setBackupMode] = useState("SNAPSHOTS");
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotMeta, setSnapshotMeta] = useState({ page: 1, total: 0, totalPages: 1 });
  const [snapshotPage, setSnapshotPage] = useState(1);
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotNote, setSnapshotNote] = useState("");
  const [snapshotIncludeAudit, setSnapshotIncludeAudit] = useState(true);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [snapshotDetail, setSnapshotDetail] = useState(null);
  const [snapshotDetailLoading, setSnapshotDetailLoading] = useState(false);
  const [snapshotDownloading, setSnapshotDownloading] = useState("");
  const [snapshotDeleting, setSnapshotDeleting] = useState("");
  const [snapshotRestoreAction, setSnapshotRestoreAction] = useState(null);
  const [snapshotRestoreReason, setSnapshotRestoreReason] = useState("");
  const [snapshotRestorePassword, setSnapshotRestorePassword] = useState("");
  const [snapshotRestoreConfirmation, setSnapshotRestoreConfirmation] = useState("");
  const [snapshotRestoreAcknowledged, setSnapshotRestoreAcknowledged] = useState(false);
  const [snapshotRestoreLoading, setSnapshotRestoreLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inspecting, setInspecting] = useState(false);
  const [inspection, setInspection] = useState(null);
  const [restoreMode, setRestoreMode] = useState("REPLACE");
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [job, setJob] = useState(null);

  useEffect(
    () => () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    },
    []
  );

  useEffect(() => {
    if (backupMode !== "SNAPSHOTS") return undefined;
    let active = true;
    setSnapshotsLoading(true);
    BackupService.getSnapshots({ page: snapshotPage, limit: 10 })
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response?.data?.data) ? response.data.data : [];
        setSnapshots(rows);
        setSnapshotMeta({
          page: response?.data?.meta?.page || snapshotPage,
          total: response?.data?.meta?.total || 0,
          totalPages: response?.data?.meta?.totalPages || 1,
        });
      })
      .catch((error) => {
        if (!active) return;
        setSnapshots([]);
        toast.error(errorMessage(error, "Không thể tải danh sách bản sao hệ thống"));
      })
      .finally(() => active && setSnapshotsLoading(false));
    return () => {
      active = false;
    };
  }, [backupMode, snapshotPage, snapshotRefreshKey]);

  const resetFile = () => {
    if (pollRef.current) window.clearTimeout(pollRef.current);
    setFile(null);
    setInspection(null);
    setUploadProgress(0);
    setConfirmation("");
    setCurrentPassword("");
    setJob(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const acceptFile = (selected) => {
    if (!selected) return;
    const lowerName = selected.name.toLowerCase();
    if (!lowerName.endsWith(".plbackup")) {
      toast.error("Chỉ chấp nhận file .plbackup do hệ thống xuất ra");
      return;
    }
    if (selected.size > MAX_BACKUP_SIZE) {
      toast.error("File backup không được vượt quá 512 MB");
      return;
    }
    setFile(selected);
    setInspection(null);
    setJob(null);
    setUploadProgress(0);
    setConfirmation("");
    setCurrentPassword("");
  };

  const refreshSnapshots = () => setSnapshotRefreshKey((value) => value + 1);

  const createSnapshot = async () => {
    if (!snapshotName.trim()) {
      toast.error("Vui lòng nhập tên bản sao");
      return;
    }
    try {
      setCreatingSnapshot(true);
      await BackupService.createSnapshot({
        name: snapshotName.trim(),
        note: snapshotNote.trim() || undefined,
        includeAuditLogs: snapshotIncludeAudit,
      });
      setSnapshotName("");
      setSnapshotNote("");
      setSnapshotPage(1);
      refreshSnapshots();
      toast.success("Đã tạo bản sao toàn hệ thống và lưu lâu dài");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tạo bản sao hệ thống"));
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const viewSnapshot = async (snapshot) => {
    try {
      setSnapshotDetailLoading(true);
      const response = await BackupService.getSnapshot(getId(snapshot));
      setSnapshotDetail(unwrap(response));
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tải chi tiết bản sao"));
    } finally {
      setSnapshotDetailLoading(false);
    }
  };

  const downloadSnapshot = async (snapshot) => {
    const id = getId(snapshot);
    try {
      setSnapshotDownloading(String(id));
      const response = await BackupService.downloadSnapshot(id);
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFromResponse(response);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Đã tải bản sao về thiết bị");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tải bản sao"));
    } finally {
      setSnapshotDownloading("");
    }
  };

  const deleteSnapshot = async (snapshot) => {
    const accepted = window.confirm(
      `Xóa vĩnh viễn bản sao ${
        snapshot.code || snapshot.name
      }? File này sẽ không thể khôi phục lại.`
    );
    if (!accepted) return;
    try {
      setSnapshotDeleting(String(getId(snapshot)));
      await BackupService.deleteSnapshot(getId(snapshot));
      if (snapshots.length === 1 && snapshotPage > 1) setSnapshotPage((value) => value - 1);
      else refreshSnapshots();
      toast.success("Đã xóa bản sao hệ thống");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể xóa bản sao"));
    } finally {
      setSnapshotDeleting("");
    }
  };

  const resetSnapshotRestore = () => {
    if (snapshotRestoreLoading || restoring) return;
    setSnapshotRestoreAction(null);
    setSnapshotRestoreReason("");
    setSnapshotRestorePassword("");
    setSnapshotRestoreConfirmation("");
    setSnapshotRestoreAcknowledged(false);
  };

  const previewSnapshotRestore = async (snapshot) => {
    try {
      setSnapshotRestoreLoading(true);
      const response = await BackupService.previewSnapshotRestore(getId(snapshot));
      setSnapshotRestoreAction({
        snapshot,
        preview: unwrap(response),
        idempotencyKey: makeIdempotencyKey(),
      });
      setSnapshotRestoreReason("");
      setSnapshotRestorePassword("");
      setSnapshotRestoreConfirmation("");
      setSnapshotRestoreAcknowledged(false);
      setJob(null);
    } catch (error) {
      toast.error(errorMessage(error, "Không thể kiểm tra điều kiện khôi phục"));
    } finally {
      setSnapshotRestoreLoading(false);
    }
  };

  const restoreStoredSnapshot = async () => {
    if (!snapshotRestoreAction) return;
    if (!snapshotRestoreReason.trim()) return toast.error("Vui lòng nhập lý do khôi phục");
    if (!snapshotRestorePassword) return toast.error("Vui lòng nhập mật khẩu admin hiện tại");
    if (snapshotRestoreConfirmation.trim().toUpperCase() !== CONFIRMATION_TEXT)
      return toast.error(`Vui lòng nhập đúng “${CONFIRMATION_TEXT}”`);
    try {
      setSnapshotRestoreLoading(true);
      setRestoring(true);
      const response = await BackupService.restoreSnapshot(getId(snapshotRestoreAction.snapshot), {
        mode: "REPLACE",
        reason: snapshotRestoreReason.trim(),
        currentPassword: snapshotRestorePassword,
        confirmation: CONFIRMATION_TEXT,
        idempotencyKey: snapshotRestoreAction.idempotencyKey,
      });
      const data = unwrap(response);
      setJob(data);
      refreshSnapshots();
      if (data.jobId) pollJob(data.jobId);
      else {
        setRestoring(false);
        toast.success("Khôi phục dữ liệu thành công. Vui lòng đăng nhập lại.");
      }
    } catch (error) {
      setRestoring(false);
      toast.error(errorMessage(error, "Không thể khôi phục bản sao"));
    } finally {
      setSnapshotRestoreLoading(false);
    }
  };

  const downloadBackup = async () => {
    try {
      setCreatingBackup(true);
      const response = await BackupService.exportDatabase({
        includeAuditLogs: true,
        format: "EJSON_GZIP",
      });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filenameFromResponse(response);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Đã tạo và tải file backup xuống thiết bị");
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tạo file backup"));
    } finally {
      setCreatingBackup(false);
    }
  };

  const inspectFile = async () => {
    if (!file) return toast.error("Vui lòng chọn file backup");
    try {
      setInspecting(true);
      setUploadProgress(0);
      const response = await BackupService.inspect(file, (event) => {
        if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      });
      const data = unwrap(response);
      setInspection(data);
      setUploadProgress(100);
      toast.success("File backup hợp lệ và đã sẵn sàng để khôi phục");
    } catch (error) {
      setInspection(null);
      toast.error(errorMessage(error, "File backup không hợp lệ hoặc đã bị thay đổi"));
    } finally {
      setInspecting(false);
    }
  };

  const pollJob = async (jobId) => {
    try {
      const response = await BackupService.getJob(jobId);
      const nextJob = unwrap(response);
      setJob(nextJob);
      if (["COMPLETED", "FAILED"].includes(nextJob.status)) {
        setRestoring(false);
        refreshSnapshots();
        if (nextJob.status === "COMPLETED") {
          toast.success(
            "Khôi phục database thành công. Vui lòng đăng nhập lại để dùng dữ liệu mới."
          );
        } else {
          toast.error(nextJob.message || "Khôi phục database thất bại");
        }
        return;
      }
      pollRef.current = window.setTimeout(() => pollJob(jobId), 2000);
    } catch (error) {
      setRestoring(false);
      toast.error(errorMessage(error, "Không thể theo dõi tiến trình khôi phục"));
    }
  };

  const restore = async () => {
    const restoreToken =
      inspection?.restoreToken || inspection?.token || inspection?.uploadId || inspection?.id;
    if (!restoreToken) return toast.error("Phiên kiểm tra file đã hết hạn. Vui lòng kiểm tra lại.");
    if (confirmation.trim().toUpperCase() !== CONFIRMATION_TEXT)
      return toast.error(`Vui lòng nhập đúng “${CONFIRMATION_TEXT}”`);
    if (!currentPassword) return toast.error("Vui lòng nhập mật khẩu admin hiện tại");
    try {
      setRestoring(true);
      const response = await BackupService.restore(restoreToken, {
        mode: restoreMode,
        createSafetyBackup,
        currentPassword,
        confirmation: CONFIRMATION_TEXT,
      });
      const data = unwrap(response);
      const jobId = data.jobId || data.id;
      if (!jobId || data.status === "COMPLETED") {
        setJob({ ...data, status: data.status || "COMPLETED", progress: 100 });
        setRestoring(false);
        toast.success("Khôi phục database thành công. Vui lòng đăng nhập lại.");
        return;
      }
      setJob(data);
      pollJob(jobId);
    } catch (error) {
      setRestoring(false);
      toast.error(errorMessage(error, "Không thể khôi phục database"));
    }
  };

  const collections = normalizedCollections(inspection);
  const totalDocuments = collections.reduce((sum, item) => sum + item.documents, 0);
  const warnings = inspection?.warnings || inspection?.manifest?.warnings || [];
  const checksumValid =
    inspection?.checksumValid ?? inspection?.validChecksum ?? inspection?.integrityValid;
  const restoreReady = Boolean(inspection && checksumValid !== false);
  const progress = Number(job?.progress ?? job?.percent ?? 0);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox mb={3}>
          <SoftTypography variant="h4" fontWeight="bold">
            Sao lưu & khôi phục dữ liệu
          </SoftTypography>
          <SoftTypography variant="button" color="text">
            Tạo file backup toàn hệ thống và phục hồi database khi cần thiết
          </SoftTypography>
        </SoftBox>

        <SoftBox
          mb={3}
          p={2}
          borderRadius={2}
          bgcolor="#fff8e1"
          sx={{ border: "1px solid #ffe082" }}
        >
          <SoftBox display="flex" gap={1.25} alignItems="flex-start">
            <Icon sx={{ color: "#e65100", mt: 0.1 }}>warning</Icon>
            <SoftBox>
              <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#e65100" }}>
                Chỉ dành cho quản trị viên
              </SoftTypography>
              <SoftTypography variant="caption" color="text" display="block">
                Khôi phục có thể thay đổi toàn bộ dữ liệu đang vận hành. Không đóng trình duyệt hoặc
                tắt backend trong khi quá trình đang chạy.
              </SoftTypography>
            </SoftBox>
          </SoftBox>
        </SoftBox>

        <SoftBox
          display="grid"
          gap={1}
          mb={3}
          sx={{ gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" } }}
        >
          {[
            {
              value: "SNAPSHOTS",
              title: "Bản sao trên hệ thống",
              subtitle: "Chọn bản sao đã lưu để xem hoặc khôi phục",
              icon: "storage",
              color: "#1565c0",
              background: "#e7f3ff",
            },
            {
              value: "FILE",
              title: "File backup dự phòng",
              subtitle: "Tải file xuống hoặc khôi phục từ file .plbackup",
              icon: "upload_file",
              color: "#7b1fa2",
              background: "#f3e5f5",
            },
          ].map((option) => {
            const active = backupMode === option.value;
            return (
              <SoftBox
                component="button"
                type="button"
                key={option.value}
                p={{ xs: 1.4, md: 1.75 }}
                textAlign="left"
                onClick={() => setBackupMode(option.value)}
                sx={{
                  border: active ? `2px solid ${option.color}` : "1px solid #dce2e9",
                  borderRadius: 2.5,
                  bgcolor: active ? option.background : "#fff",
                  cursor: "pointer",
                  color: active ? option.color : "#52606d",
                }}
              >
                <SoftBox display="flex" gap={1} alignItems="center">
                  <Icon sx={{ fontSize: 25 }}>{option.icon}</Icon>
                  <SoftBox>
                    <SoftTypography variant="button" fontWeight="bold" sx={{ color: "inherit" }}>
                      {option.title}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text" display="block">
                      {option.subtitle}
                    </SoftTypography>
                  </SoftBox>
                  {active && <Icon sx={{ ml: "auto" }}>check_circle</Icon>}
                </SoftBox>
              </SoftBox>
            );
          })}
        </SoftBox>

        {backupMode === "SNAPSHOTS" && (
          <Grid container spacing={3}>
            <Grid item xs={12} lg={4}>
              <Card>
                <SoftBox p={{ xs: 2, md: 2.5 }}>
                  <SoftBox display="flex" alignItems="center" gap={1} mb={1.5}>
                    <SoftBox
                      width={44}
                      height={44}
                      borderRadius={2}
                      bgcolor="#e3f2fd"
                      color="#1565c0"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Icon>add_to_photos</Icon>
                    </SoftBox>
                    <SoftBox>
                      <SoftTypography variant="h6" fontWeight="bold">
                        Tạo bản sao mới
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        Lưu mã hóa trong kho backup riêng
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>

                  <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                    Tên bản sao *
                  </SoftTypography>
                  <SoftInput
                    value={snapshotName}
                    onChange={(event) => setSnapshotName(event.target.value)}
                    placeholder="Ví dụ: Trước cập nhật tháng 8"
                  />
                  <SoftTypography
                    variant="caption"
                    fontWeight="bold"
                    display="block"
                    mt={1.25}
                    mb={0.5}
                  >
                    Ghi chú
                  </SoftTypography>
                  <SoftBox
                    component="textarea"
                    value={snapshotNote}
                    onChange={(event) => setSnapshotNote(event.target.value)}
                    placeholder="Mô tả thời điểm và mục đích sao lưu..."
                    minHeight={92}
                    width="100%"
                    p={1.2}
                    sx={{
                      border: "1px solid #d2d6da",
                      borderRadius: 2,
                      font: "inherit",
                      fontSize: 14,
                      resize: "vertical",
                      outline: "none",
                      "&:focus": { borderColor: "#1976d2" },
                    }}
                  />
                  <SoftBox mt={1.25} p={1.1} borderRadius={2} bgcolor="#f8fafc">
                    <FormControlLabel
                      sx={{ m: 0, alignItems: "flex-start" }}
                      control={
                        <Checkbox
                          checked={snapshotIncludeAudit}
                          onChange={(event) => setSnapshotIncludeAudit(event.target.checked)}
                          color="success"
                          sx={{ pt: 0.25 }}
                        />
                      }
                      label={
                        <SoftBox>
                          <SoftTypography variant="button" fontWeight="bold" display="block">
                            Bao gồm nhật ký hoạt động
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            Khuyến nghị giữ bật để phục vụ truy xuất sau khôi phục.
                          </SoftTypography>
                        </SoftBox>
                      }
                    />
                  </SoftBox>
                  <SoftButton
                    fullWidth
                    color="info"
                    variant="gradient"
                    startIcon={<Icon>save</Icon>}
                    disabled={creatingSnapshot || restoring || !snapshotName.trim()}
                    onClick={createSnapshot}
                    sx={{ mt: 1.5, minHeight: 46 }}
                  >
                    {creatingSnapshot ? "Đang tạo bản sao..." : "Tạo và lưu bản sao"}
                  </SoftButton>
                  <SoftTypography variant="caption" color="text" display="block" mt={1}>
                    Hệ thống mã hóa, ký và kiểm tra checksum trước khi lưu vào GridFS.
                  </SoftTypography>
                </SoftBox>
              </Card>
            </Grid>

            <Grid item xs={12} lg={8}>
              <Card>
                <SoftBox p={{ xs: 1.5, md: 2.5 }}>
                  <SoftBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    gap={1}
                    mb={1.5}
                  >
                    <SoftBox>
                      <SoftTypography variant="h6" fontWeight="bold">
                        Danh sách bản sao
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {snapshotMeta.total || 0} bản sao đang được lưu lâu dài
                      </SoftTypography>
                    </SoftBox>
                    <IconButton onClick={refreshSnapshots} disabled={snapshotsLoading}>
                      <Icon>refresh</Icon>
                    </IconButton>
                  </SoftBox>

                  {snapshotsLoading && !snapshots.length ? (
                    <SoftBox py={6} textAlign="center">
                      <SoftTypography variant="button" color="text">
                        Đang tải danh sách bản sao...
                      </SoftTypography>
                    </SoftBox>
                  ) : (
                    snapshots.map((snapshot) => {
                      const isSafety = snapshot.sourceType === "BEFORE_RESTORE";
                      const isRestoring = snapshot.status === "RESTORING";
                      return (
                        <SoftBox
                          key={getId(snapshot)}
                          p={{ xs: 1.25, md: 1.5 }}
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
                                alignItems="center"
                                gap={0.65}
                                flexWrap="wrap"
                              >
                                <SoftTypography variant="button" fontWeight="bold">
                                  {snapshot.code}
                                </SoftTypography>
                                <SoftBox
                                  component="span"
                                  px={0.75}
                                  py={0.25}
                                  borderRadius={1.5}
                                  bgcolor={isSafety ? "#fff3e0" : "#e3f2fd"}
                                >
                                  <SoftTypography
                                    component="span"
                                    variant="caption"
                                    fontWeight="bold"
                                    sx={{ color: isSafety ? "#e65100" : "#1565c0" }}
                                  >
                                    {snapshotSourceLabel(snapshot.sourceType)}
                                  </SoftTypography>
                                </SoftBox>
                                {isRestoring && (
                                  <SoftBox
                                    component="span"
                                    px={0.75}
                                    py={0.25}
                                    borderRadius={1.5}
                                    bgcolor="#fff8e1"
                                  >
                                    <SoftTypography
                                      component="span"
                                      variant="caption"
                                      fontWeight="bold"
                                      color="warning"
                                    >
                                      Đang khôi phục
                                    </SoftTypography>
                                  </SoftBox>
                                )}
                                {snapshot.restoredAt && (
                                  <SoftBox
                                    component="span"
                                    px={0.75}
                                    py={0.25}
                                    borderRadius={1.5}
                                    bgcolor="#e8f5e9"
                                  >
                                    <SoftTypography
                                      component="span"
                                      variant="caption"
                                      fontWeight="bold"
                                      color="success"
                                    >
                                      Đã từng khôi phục
                                    </SoftTypography>
                                  </SoftBox>
                                )}
                              </SoftBox>
                              <SoftTypography
                                variant="button"
                                fontWeight="bold"
                                display="block"
                                mt={0.35}
                              >
                                {snapshot.name || "Bản sao hệ thống"}
                              </SoftTypography>
                              <SoftTypography variant="caption" color="text" display="block">
                                {dateTime(snapshot.createdAt)} ·{" "}
                                {snapshot.createdByName || "Hệ thống"}
                              </SoftTypography>
                              {snapshot.note && (
                                <SoftTypography
                                  variant="caption"
                                  color="text"
                                  display="block"
                                  mt={0.2}
                                >
                                  {snapshot.note}
                                </SoftTypography>
                              )}
                            </SoftBox>
                            <SoftBox
                              display="flex"
                              gap={0.55}
                              flexWrap="wrap"
                              width={{ xs: "100%", md: "auto" }}
                            >
                              <SoftButton
                                size="small"
                                variant="outlined"
                                color="info"
                                onClick={() => viewSnapshot(snapshot)}
                                disabled={snapshotDetailLoading}
                                sx={{ flex: { xs: 1, md: "none" } }}
                              >
                                Chi tiết
                              </SoftButton>
                              <SoftButton
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={() => downloadSnapshot(snapshot)}
                                disabled={snapshotDownloading === String(getId(snapshot))}
                                sx={{ flex: { xs: 1, md: "none" } }}
                              >
                                Tải file
                              </SoftButton>
                              <SoftButton
                                size="small"
                                variant="gradient"
                                color="warning"
                                startIcon={<Icon>restore</Icon>}
                                onClick={() => previewSnapshotRestore(snapshot)}
                                disabled={isRestoring || restoring || snapshotRestoreLoading}
                                sx={{ flex: { xs: "1 0 100%", md: "none" } }}
                              >
                                Khôi phục
                              </SoftButton>
                              <IconButton
                                color="error"
                                onClick={() => deleteSnapshot(snapshot)}
                                disabled={
                                  isRestoring ||
                                  restoring ||
                                  snapshotDeleting === String(getId(snapshot))
                                }
                                sx={{ border: "1px solid #ffcdd2", borderRadius: 1.5 }}
                              >
                                <Icon>delete</Icon>
                              </IconButton>
                            </SoftBox>
                          </SoftBox>
                          <SoftBox
                            mt={1}
                            display="grid"
                            gap={0.7}
                            sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                          >
                            {[
                              ["Collection", snapshot.collectionCount || 0],
                              [
                                "Document",
                                Number(snapshot.documentCount || 0).toLocaleString("vi-VN"),
                              ],
                              ["Dung lượng", fileSize(snapshot.sizeBytes)],
                            ].map(([label, value]) => (
                              <SoftBox key={label} p={0.75} borderRadius={1.5} bgcolor="#f5f7fa">
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
                      );
                    })
                  )}

                  {!snapshotsLoading && !snapshots.length && (
                    <SoftBox py={6} textAlign="center" bgcolor="#f8fafc" borderRadius={2.5}>
                      <Icon sx={{ fontSize: 48, color: "#b0bec5" }}>inventory_2</Icon>
                      <SoftTypography variant="button" fontWeight="bold" display="block" mt={0.75}>
                        Chưa có bản sao hệ thống
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        Nhập tên và tạo bản sao đầu tiên để bảo vệ dữ liệu hiện tại.
                      </SoftTypography>
                    </SoftBox>
                  )}

                  {(snapshotMeta.totalPages || 1) > 1 && (
                    <SoftBox display="flex" justifyContent="center" mt={1.5}>
                      <Pagination
                        page={snapshotPage}
                        count={snapshotMeta.totalPages || 1}
                        onChange={(_, value) => setSnapshotPage(value)}
                        color="primary"
                        size="small"
                      />
                    </SoftBox>
                  )}
                </SoftBox>
              </Card>
            </Grid>
          </Grid>
        )}

        {backupMode === "FILE" && (
          <Grid container spacing={3}>
            <Grid item xs={12} lg={5}>
              <Card sx={{ height: "100%" }}>
                <SoftBox p={3}>
                  <SoftBox
                    width={52}
                    height={52}
                    borderRadius={2}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bgcolor="#e3f2fd"
                    color="#1565c0"
                    mb={2}
                  >
                    <Icon sx={{ fontSize: 30 }}>cloud_download</Icon>
                  </SoftBox>
                  <SoftTypography variant="h5" fontWeight="bold">
                    Tạo file backup
                  </SoftTypography>
                  <SoftTypography variant="button" color="text" display="block" mt={0.5}>
                    Xuất dữ liệu database theo định dạng bảo toàn ObjectId, ngày giờ và quan hệ giữa
                    các collection.
                  </SoftTypography>
                  <SoftBox mt={2.5} p={1.5} borderRadius={2} bgcolor="#f8fafc">
                    {[
                      "Dữ liệu khách hàng, hóa đơn và công nợ",
                      "Kho hàng, xe tải và lịch sử điều chuyển",
                      "Nhân viên, KPI, khuyến mãi và nhật ký",
                      "Manifest, phiên bản schema và checksum kiểm tra",
                    ].map((label) => (
                      <SoftBox key={label} display="flex" gap={0.75} alignItems="center" mb={0.75}>
                        <Icon sx={{ color: "#2e7d32", fontSize: 18 }}>check_circle</Icon>
                        <SoftTypography variant="caption">{label}</SoftTypography>
                      </SoftBox>
                    ))}
                  </SoftBox>
                  <SoftButton
                    fullWidth
                    color="info"
                    variant="gradient"
                    startIcon={<Icon>download</Icon>}
                    disabled={creatingBackup || restoring}
                    onClick={downloadBackup}
                    sx={{ mt: 2.5 }}
                  >
                    {creatingBackup ? "Đang tạo file backup..." : "Tạo và tải file backup"}
                  </SoftButton>
                  <SoftTypography variant="caption" color="text" display="block" mt={1}>
                    Hãy lưu file ở ít nhất hai nơi an toàn và không chỉnh sửa nội dung file.
                  </SoftTypography>
                </SoftBox>
              </Card>
            </Grid>

            <Grid item xs={12} lg={7}>
              <Card>
                <SoftBox p={3}>
                  <SoftBox
                    display="flex"
                    justifyContent="space-between"
                    gap={2}
                    alignItems="center"
                  >
                    <SoftBox>
                      <SoftTypography variant="h5" fontWeight="bold">
                        Khôi phục từ file
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        File luôn được kiểm tra trước, chưa thay đổi database ở bước tải lên
                      </SoftTypography>
                    </SoftBox>
                    {file && (
                      <SoftButton color="secondary" variant="text" size="small" onClick={resetFile}>
                        Chọn lại
                      </SoftButton>
                    )}
                  </SoftBox>

                  <input
                    ref={inputRef}
                    type="file"
                    hidden
                    accept=".plbackup,application/octet-stream"
                    onChange={(event) => acceptFile(event.target.files?.[0])}
                  />
                  {!file ? (
                    <SoftBox
                      mt={2.5}
                      minHeight={190}
                      borderRadius={2}
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      textAlign="center"
                      p={2}
                      role="button"
                      tabIndex={0}
                      onClick={() => inputRef.current?.click()}
                      onKeyDown={(event) => {
                        if (["Enter", " "].includes(event.key)) inputRef.current?.click();
                      }}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDragging(true);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                        setDragging(true);
                      }}
                      onDragLeave={(event) => {
                        event.preventDefault();
                        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        setDragging(false);
                        acceptFile(event.dataTransfer.files?.[0]);
                      }}
                      sx={{
                        border: `2px dashed ${dragging ? "#1976d2" : "#b8c8dc"}`,
                        bgcolor: dragging ? "#e7f3ff" : "#f8fbff",
                        cursor: "pointer",
                        transition: "all .16s ease",
                        "&:hover": { borderColor: "#1976d2", bgcolor: "#eef6ff" },
                      }}
                    >
                      <Icon sx={{ fontSize: 52, color: "#1976d2" }}>upload_file</Icon>
                      <SoftTypography variant="button" fontWeight="bold" mt={1}>
                        Kéo file backup vào đây
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        hoặc bấm để chọn file .plbackup · tối đa 512 MB
                      </SoftTypography>
                    </SoftBox>
                  ) : (
                    <SoftBox
                      mt={2.5}
                      p={2}
                      borderRadius={2}
                      display="flex"
                      gap={1.5}
                      alignItems="center"
                      bgcolor="#f5f9ff"
                      sx={{ border: "1px solid #bbdefb" }}
                    >
                      <Icon sx={{ fontSize: 34, color: "#1565c0" }}>description</Icon>
                      <SoftBox flex={1} minWidth={0}>
                        <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                          {file.name}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text">
                          {fileSize(file.size)}
                        </SoftTypography>
                      </SoftBox>
                      {!inspection && (
                        <SoftButton
                          color="info"
                          variant="gradient"
                          disabled={inspecting}
                          onClick={inspectFile}
                        >
                          {inspecting ? `Đang kiểm tra ${uploadProgress}%` : "Kiểm tra file"}
                        </SoftButton>
                      )}
                    </SoftBox>
                  )}

                  {inspecting && (
                    <SoftBox mt={1.25}>
                      <SoftBox height={7} borderRadius={4} bgcolor="#e5e7eb" overflow="hidden">
                        <SoftBox
                          height="100%"
                          width={`${uploadProgress}%`}
                          bgcolor="#1976d2"
                          sx={{ transition: "width .2s ease" }}
                        />
                      </SoftBox>
                    </SoftBox>
                  )}

                  {inspection && (
                    <SoftBox mt={2.5}>
                      <SoftBox
                        p={1.75}
                        borderRadius={2}
                        bgcolor={restoreReady ? "#e8f5e9" : "#ffebee"}
                        sx={{ border: `1px solid ${restoreReady ? "#81c784" : "#ef9a9a"}` }}
                      >
                        <SoftBox display="flex" gap={1} alignItems="center">
                          <Icon sx={{ color: restoreReady ? "#2e7d32" : "#c62828" }}>
                            {restoreReady ? "verified" : "gpp_bad"}
                          </Icon>
                          <SoftTypography
                            variant="button"
                            fontWeight="bold"
                            sx={{ color: restoreReady ? "#1b5e20" : "#b71c1c" }}
                          >
                            {restoreReady
                              ? "File hợp lệ, checksum chính xác"
                              : "File không vượt qua kiểm tra toàn vẹn"}
                          </SoftTypography>
                        </SoftBox>
                        <Grid container spacing={1.5} mt={0.25}>
                          {[
                            [
                              "Ngày tạo",
                              dateTime(inspection.createdAt || inspection.manifest?.createdAt),
                            ],
                            [
                              "Phiên bản",
                              inspection.schemaVersion ||
                                inspection.manifest?.schemaVersion ||
                                inspection.appVersion ||
                                "—",
                            ],
                            ["Collection", collections.length],
                            ["Tổng document", totalDocuments.toLocaleString("vi-VN")],
                          ].map(([label, value]) => (
                            <Grid item xs={6} key={label}>
                              <SoftTypography variant="caption" color="text" display="block">
                                {label}
                              </SoftTypography>
                              <SoftTypography variant="button" fontWeight="bold">
                                {value}
                              </SoftTypography>
                            </Grid>
                          ))}
                        </Grid>
                      </SoftBox>

                      {collections.length > 0 && (
                        <SoftBox mt={1.5} maxHeight={180} overflow="auto">
                          {collections.map((item) => (
                            <SoftBox
                              key={item.name}
                              display="flex"
                              justifyContent="space-between"
                              py={0.7}
                              px={1}
                              sx={{ borderBottom: "1px solid #edf0f5" }}
                            >
                              <SoftTypography variant="caption" fontWeight="bold">
                                {item.name}
                              </SoftTypography>
                              <SoftTypography variant="caption" color="text">
                                {item.documents.toLocaleString("vi-VN")} document
                              </SoftTypography>
                            </SoftBox>
                          ))}
                        </SoftBox>
                      )}

                      {warnings.length > 0 && (
                        <SoftBox mt={1.5} p={1.5} borderRadius={2} bgcolor="#fff8e1">
                          {warnings.map((warning, index) => (
                            <SoftTypography
                              key={`${warning}-${index}`}
                              variant="caption"
                              color="warning"
                              display="block"
                            >
                              • {typeof warning === "string" ? warning : warning.message}
                            </SoftTypography>
                          ))}
                        </SoftBox>
                      )}

                      <SoftTypography variant="button" fontWeight="bold" display="block" mt={2}>
                        Chế độ khôi phục
                      </SoftTypography>
                      <Grid container spacing={1.25} mt={0}>
                        {[
                          {
                            value: "REPLACE",
                            title: "Khôi phục toàn bộ",
                            subtitle: "Database sau khôi phục giống chính xác file backup",
                            icon: "restore",
                            color: "#c62828",
                            background: "#fff5f5",
                          },
                          {
                            value: "MERGE",
                            title: "Bổ sung và cập nhật",
                            subtitle: "Upsert theo _id, không xóa dữ liệu mới đang có",
                            icon: "merge_type",
                            color: "#1565c0",
                            background: "#f3f8ff",
                          },
                        ].map((option) => {
                          const selected = restoreMode === option.value;
                          return (
                            <Grid item xs={12} sm={6} key={option.value}>
                              <SoftBox
                                component="button"
                                type="button"
                                width="100%"
                                height="100%"
                                p={1.5}
                                textAlign="left"
                                onClick={() => setRestoreMode(option.value)}
                                sx={{
                                  border: selected
                                    ? `2px solid ${option.color}`
                                    : "1px solid #dfe3e8",
                                  borderRadius: 2,
                                  bgcolor: selected ? option.background : "#fff",
                                  cursor: "pointer",
                                  position: "relative",
                                }}
                              >
                                {selected && (
                                  <Icon
                                    sx={{
                                      position: "absolute",
                                      top: 10,
                                      right: 10,
                                      color: option.color,
                                    }}
                                  >
                                    check_circle
                                  </Icon>
                                )}
                                <Icon sx={{ color: option.color }}>{option.icon}</Icon>
                                <SoftTypography variant="button" fontWeight="bold" display="block">
                                  {option.title}
                                </SoftTypography>
                                <SoftTypography variant="caption" color="text" display="block">
                                  {option.subtitle}
                                </SoftTypography>
                              </SoftBox>
                            </Grid>
                          );
                        })}
                      </Grid>

                      <SoftBox mt={2} p={1.5} borderRadius={2} bgcolor="#f8fafc">
                        <FormControlLabel
                          sx={{ m: 0, alignItems: "flex-start" }}
                          control={
                            <Checkbox
                              checked={createSafetyBackup}
                              onChange={(event) => setCreateSafetyBackup(event.target.checked)}
                              color="success"
                              sx={{ pt: 0.25 }}
                            />
                          }
                          label={
                            <SoftBox>
                              <SoftTypography variant="button" fontWeight="bold" display="block">
                                Tạo backup an toàn trước khi khôi phục
                              </SoftTypography>
                              <SoftTypography variant="caption" color="text" display="block">
                                Dùng để rollback nếu tiến trình lỗi và chỉ được lưu tạm trên
                                backend; không thay thế file backup đã tải về máy.
                              </SoftTypography>
                            </SoftBox>
                          }
                        />
                      </SoftBox>

                      <Grid container spacing={1.5} mt={0.5}>
                        <Grid item xs={12} md={6}>
                          <SoftTypography variant="caption" fontWeight="bold">
                            Mật khẩu admin hiện tại
                          </SoftTypography>
                          <SoftInput
                            type="password"
                            value={currentPassword}
                            onChange={(event) => setCurrentPassword(event.target.value)}
                            placeholder="Nhập mật khẩu để xác nhận"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <SoftTypography variant="caption" fontWeight="bold">
                            Nhập “{CONFIRMATION_TEXT}”
                          </SoftTypography>
                          <SoftInput
                            value={confirmation}
                            onChange={(event) => setConfirmation(event.target.value.toUpperCase())}
                            placeholder={CONFIRMATION_TEXT}
                          />
                        </Grid>
                      </Grid>

                      {job && (
                        <SoftBox mt={2} p={1.5} borderRadius={2} bgcolor="#eef6ff">
                          <SoftBox display="flex" justifyContent="space-between" gap={1} mb={0.75}>
                            <SoftTypography variant="caption" fontWeight="bold">
                              {job.message || "Đang khôi phục dữ liệu..."}
                            </SoftTypography>
                            <SoftTypography variant="caption" fontWeight="bold">
                              {progress}%
                            </SoftTypography>
                          </SoftBox>
                          <SoftBox height={8} borderRadius={4} bgcolor="#dbe7f5" overflow="hidden">
                            <SoftBox
                              height="100%"
                              width={`${Math.min(100, progress)}%`}
                              bgcolor={job.status === "FAILED" ? "#c62828" : "#1976d2"}
                              sx={{ transition: "width .25s ease" }}
                            />
                          </SoftBox>
                        </SoftBox>
                      )}

                      <SoftButton
                        fullWidth
                        color="error"
                        variant="gradient"
                        startIcon={<Icon>restore</Icon>}
                        disabled={
                          !restoreReady ||
                          restoring ||
                          !currentPassword ||
                          confirmation.trim().toUpperCase() !== CONFIRMATION_TEXT
                        }
                        onClick={restore}
                        sx={{ mt: 2 }}
                      >
                        {restoring
                          ? `Đang khôi phục${progress ? ` ${progress}%` : "..."}`
                          : restoreMode === "REPLACE"
                          ? "Xác nhận khôi phục toàn bộ database"
                          : "Xác nhận bổ sung và cập nhật dữ liệu"}
                      </SoftButton>
                    </SoftBox>
                  )}
                </SoftBox>
              </Card>
            </Grid>
          </Grid>
        )}

        <SoftBox mt={3} p={2} borderRadius={2} bgcolor="#f8fafc">
          <SoftTypography variant="caption" color="text">
            Lưu ý: file backup database lưu URL và metadata ảnh Cloudinary, không chứa file ảnh gốc
            trên Cloudinary. Không xóa tài nguyên Cloudinary nếu muốn ảnh tiếp tục hiển thị sau khi
            khôi phục.
          </SoftTypography>
        </SoftBox>
      </SoftBox>

      <Modal open={Boolean(snapshotDetail)} onClose={() => setSnapshotDetail(null)}>
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: 0, md: "50%" },
            left: { xs: 0, md: "50%" },
            transform: { xs: "none", md: "translate(-50%, -50%)" },
            width: { xs: "100%", md: "min(760px, 94vw)" },
            height: { xs: "100dvh", md: "auto" },
            maxHeight: { md: "92vh" },
            overflowY: "auto",
            bgcolor: "#fff",
            borderRadius: { xs: 0, md: 3 },
            boxShadow: 24,
            p: { xs: 2, md: 2.5 },
          }}
        >
          {snapshotDetail && (
            <>
              <SoftBox
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
                gap={1}
                mb={1.5}
              >
                <SoftBox>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {snapshotDetail.code} · {snapshotDetail.name}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {snapshotSourceLabel(snapshotDetail.sourceType)} ·{" "}
                    {dateTime(snapshotDetail.createdAt)}
                  </SoftTypography>
                </SoftBox>
                <IconButton onClick={() => setSnapshotDetail(null)}>
                  <Icon>close</Icon>
                </IconButton>
              </SoftBox>

              <Grid container spacing={1} mb={1.5}>
                {[
                  ["Collection", snapshotDetail.collectionCount || 0],
                  ["Document", Number(snapshotDetail.documentCount || 0).toLocaleString("vi-VN")],
                  ["Dung lượng", fileSize(snapshotDetail.sizeBytes)],
                  ["Schema", snapshotDetail.schemaVersion || "—"],
                ].map(([label, value]) => (
                  <Grid item xs={6} sm={3} key={label}>
                    <SoftBox p={1} height="100%" borderRadius={1.5} bgcolor="#f5f7fa">
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

              {snapshotDetail.note && (
                <SoftBox p={1.2} mb={1.5} borderRadius={2} bgcolor="#f8fafc">
                  <SoftTypography variant="caption" color="text" display="block">
                    Ghi chú
                  </SoftTypography>
                  <SoftTypography variant="button">{snapshotDetail.note}</SoftTypography>
                </SoftBox>
              )}

              <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.75}>
                Dữ liệu trong bản sao
              </SoftTypography>
              <SoftBox
                maxHeight={310}
                overflow="auto"
                borderRadius={2}
                sx={{ border: "1px solid #dfe5ec" }}
              >
                {(snapshotDetail.collections || []).map((item) => (
                  <SoftBox
                    key={item.name}
                    display="flex"
                    justifyContent="space-between"
                    px={1.2}
                    py={0.8}
                    sx={{ borderBottom: "1px solid #edf0f3" }}
                  >
                    <SoftTypography variant="caption" fontWeight="bold">
                      {item.name}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {Number(item.documents || 0).toLocaleString("vi-VN")} document
                    </SoftTypography>
                  </SoftBox>
                ))}
              </SoftBox>

              <SoftBox mt={1.25} p={1.1} borderRadius={2} bgcolor="#e8f5e9">
                <SoftTypography variant="caption" color="success" fontWeight="bold">
                  <Icon sx={{ fontSize: 17, verticalAlign: "middle", mr: 0.5 }}>verified</Icon>
                  Checksum SHA-256: {snapshotDetail.checksum || "Được backend xác minh khi tải"}
                </SoftTypography>
              </SoftBox>

              <SoftBox display="flex" gap={1} mt={1.5} flexDirection={{ xs: "column", sm: "row" }}>
                <SoftButton
                  fullWidth
                  variant="outlined"
                  color="info"
                  startIcon={<Icon>download</Icon>}
                  onClick={() => downloadSnapshot(snapshotDetail)}
                >
                  Tải file dự phòng
                </SoftButton>
                <SoftButton
                  fullWidth
                  variant="gradient"
                  color="warning"
                  startIcon={<Icon>restore</Icon>}
                  disabled={snapshotDetail.status === "RESTORING" || restoring}
                  onClick={() => {
                    const selected = snapshotDetail;
                    setSnapshotDetail(null);
                    previewSnapshotRestore(selected);
                  }}
                >
                  Khôi phục bản sao này
                </SoftButton>
              </SoftBox>
            </>
          )}
        </SoftBox>
      </Modal>

      <Modal open={Boolean(snapshotRestoreAction)} onClose={resetSnapshotRestore}>
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: 0, md: "50%" },
            left: { xs: 0, md: "50%" },
            transform: { xs: "none", md: "translate(-50%, -50%)" },
            width: { xs: "100%", md: "min(720px, 94vw)" },
            height: { xs: "100dvh", md: "auto" },
            maxHeight: { md: "94vh" },
            overflowY: "auto",
            bgcolor: "#fff",
            borderRadius: { xs: 0, md: 3 },
            boxShadow: 24,
            p: { xs: 2, md: 2.5 },
          }}
        >
          {snapshotRestoreAction &&
            (() => {
              const preview = snapshotRestoreAction.preview || {};
              const selected = preview.backup || snapshotRestoreAction.snapshot || {};
              const blockers = Array.isArray(preview.blockers) ? preview.blockers : [];
              const warnings = Array.isArray(preview.warnings) ? preview.warnings : [];
              const canRestore = preview.canRestore !== false && blockers.length === 0;
              const restoreDone = ["COMPLETED", "FAILED"].includes(job?.status);
              return (
                <>
                  <SoftBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    gap={1}
                    mb={1.5}
                  >
                    <SoftBox display="flex" alignItems="center" gap={1}>
                      <SoftBox
                        width={46}
                        height={46}
                        borderRadius={2}
                        bgcolor="#ffebee"
                        color="#c62828"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon>restore</Icon>
                      </SoftBox>
                      <SoftBox>
                        <SoftTypography variant="h6" fontWeight="bold">
                          Khôi phục toàn bộ hệ thống
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text">
                          {selected.code} · {selected.name}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                    <IconButton
                      onClick={resetSnapshotRestore}
                      disabled={restoring || snapshotRestoreLoading}
                    >
                      <Icon>close</Icon>
                    </IconButton>
                  </SoftBox>

                  <SoftBox
                    p={1.35}
                    mb={1.25}
                    borderRadius={2}
                    bgcolor={canRestore ? "#fff3e0" : "#ffebee"}
                    sx={{ border: `1px solid ${canRestore ? "#ffb74d" : "#ef9a9a"}` }}
                  >
                    <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#b71c1c" }}>
                      <Icon sx={{ verticalAlign: "middle", mr: 0.5 }}>warning</Icon>
                      Dữ liệu nghiệp vụ hiện tại sẽ được thay thế bằng dữ liệu trong bản sao này.
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text" display="block" mt={0.4}>
                      Backend luôn tạo một bản sao an toàn mới trong database backup trước khi bắt
                      đầu.
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
                      <SoftTypography variant="caption" color="error" fontWeight="bold">
                        {blocker.message || blocker.code}
                      </SoftTypography>
                    </SoftBox>
                  ))}
                  {warnings.map((warning, index) => (
                    <SoftTypography
                      key={`${index}-${warning}`}
                      variant="caption"
                      color="warning"
                      display="block"
                      mb={0.4}
                    >
                      • {typeof warning === "string" ? warning : warning.message}
                    </SoftTypography>
                  ))}

                  <SoftBox
                    display="grid"
                    gap={0.75}
                    my={1.5}
                    sx={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
                  >
                    {[
                      ["Collection", preview.summary?.collectionCount || 0],
                      [
                        "Document",
                        Number(preview.summary?.documentCount || 0).toLocaleString("vi-VN"),
                      ],
                      ["Dung lượng", fileSize(preview.summary?.sizeBytes)],
                    ].map(([label, value]) => (
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

                  {canRestore && !job && (
                    <>
                      <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                        Lý do khôi phục *
                      </SoftTypography>
                      <SoftBox
                        component="textarea"
                        value={snapshotRestoreReason}
                        onChange={(event) => setSnapshotRestoreReason(event.target.value)}
                        minHeight={76}
                        width="100%"
                        p={1.1}
                        placeholder="Mô tả sự cố hoặc lý do cần đưa dữ liệu về bản sao này..."
                        sx={{
                          border: "1px solid #d2d6da",
                          borderRadius: 2,
                          font: "inherit",
                          fontSize: 14,
                          resize: "vertical",
                          outline: "none",
                          "&:focus": { borderColor: "#1976d2" },
                        }}
                      />
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        display="block"
                        mt={1.2}
                        mb={0.5}
                      >
                        Mật khẩu admin hiện tại *
                      </SoftTypography>
                      <SoftInput
                        type="password"
                        value={snapshotRestorePassword}
                        onChange={(event) => setSnapshotRestorePassword(event.target.value)}
                        placeholder="Nhập mật khẩu để xác thực"
                      />
                      <SoftBox
                        component="label"
                        display="flex"
                        alignItems="flex-start"
                        gap={1}
                        p={1.1}
                        my={1.25}
                        borderRadius={2}
                        bgcolor={snapshotRestoreAcknowledged ? "#e8f5e9" : "#f8fafc"}
                        sx={{
                          border: snapshotRestoreAcknowledged
                            ? "2px solid #43a047"
                            : "1px solid #dce2e9",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={snapshotRestoreAcknowledged}
                          onChange={(event) => setSnapshotRestoreAcknowledged(event.target.checked)}
                          style={{ width: 22, height: 22, flexShrink: 0 }}
                        />
                        <SoftTypography variant="caption" fontWeight="bold">
                          Tôi đã kiểm tra đúng bản sao và hiểu dữ liệu hiện tại sẽ bị thay thế.
                        </SoftTypography>
                      </SoftBox>
                      <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                        Nhập “{CONFIRMATION_TEXT}” để xác nhận *
                      </SoftTypography>
                      <SoftInput
                        value={snapshotRestoreConfirmation}
                        onChange={(event) =>
                          setSnapshotRestoreConfirmation(event.target.value.toUpperCase())
                        }
                        placeholder={CONFIRMATION_TEXT}
                      />
                    </>
                  )}

                  {job && (
                    <SoftBox
                      mt={1.5}
                      p={1.5}
                      borderRadius={2}
                      bgcolor={job.status === "FAILED" ? "#ffebee" : "#eef6ff"}
                    >
                      <SoftBox display="flex" justifyContent="space-between" gap={1} mb={0.75}>
                        <SoftTypography variant="caption" fontWeight="bold">
                          {job.message || "Đang khôi phục dữ liệu..."}
                        </SoftTypography>
                        <SoftTypography variant="caption" fontWeight="bold">
                          {Number(job.progress || 0)}%
                        </SoftTypography>
                      </SoftBox>
                      <SoftBox height={8} borderRadius={4} bgcolor="#dbe7f5" overflow="hidden">
                        <SoftBox
                          height="100%"
                          width={`${Math.min(100, Number(job.progress || 0))}%`}
                          bgcolor={job.status === "FAILED" ? "#c62828" : "#1976d2"}
                          sx={{ transition: "width .25s ease" }}
                        />
                      </SoftBox>
                      {job.status === "COMPLETED" && (
                        <SoftTypography
                          variant="caption"
                          color="success"
                          fontWeight="bold"
                          display="block"
                          mt={1}
                        >
                          Khôi phục hoàn tất. Hãy đăng nhập lại để sử dụng dữ liệu mới.
                        </SoftTypography>
                      )}
                    </SoftBox>
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
                      onClick={resetSnapshotRestore}
                      disabled={restoring || snapshotRestoreLoading}
                    >
                      {restoreDone ? "Đóng" : "Hủy"}
                    </SoftButton>
                    {canRestore && !job && (
                      <SoftButton
                        fullWidth
                        variant="gradient"
                        color="error"
                        startIcon={<Icon>restore</Icon>}
                        onClick={restoreStoredSnapshot}
                        disabled={
                          snapshotRestoreLoading ||
                          restoring ||
                          !snapshotRestoreAcknowledged ||
                          !snapshotRestoreReason.trim() ||
                          !snapshotRestorePassword ||
                          snapshotRestoreConfirmation.trim().toUpperCase() !== CONFIRMATION_TEXT
                        }
                      >
                        {snapshotRestoreLoading || restoring
                          ? "Đang khôi phục..."
                          : "Xác nhận khôi phục toàn bộ"}
                      </SoftButton>
                    )}
                  </SoftBox>
                </>
              );
            })()}
        </SoftBox>
      </Modal>
    </DashboardLayout>
  );
}
