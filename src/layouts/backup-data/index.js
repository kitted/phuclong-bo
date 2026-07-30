import { useEffect, useRef, useState } from "react";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
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
        if (nextJob.status === "COMPLETED") {
          toast.success("Khôi phục database thành công. Vui lòng đăng nhập lại để dùng dữ liệu mới.");
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
                <SoftBox display="flex" justifyContent="space-between" gap={2} alignItems="center">
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
                          ["Ngày tạo", dateTime(inspection.createdAt || inspection.manifest?.createdAt)],
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
                              Dùng để rollback nếu tiến trình lỗi và chỉ được lưu tạm trên backend;
                              không thay thế file backup đã tải về máy.
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

        <SoftBox mt={3} p={2} borderRadius={2} bgcolor="#f8fafc">
          <SoftTypography variant="caption" color="text">
            Lưu ý: file backup database lưu URL và metadata ảnh Cloudinary, không chứa file ảnh gốc
            trên Cloudinary. Không xóa tài nguyên Cloudinary nếu muốn ảnh tiếp tục hiển thị sau khi
            khôi phục.
          </SoftTypography>
        </SoftBox>
      </SoftBox>
    </DashboardLayout>
  );
}
