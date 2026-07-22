import { useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import Pagination from "@mui/material/Pagination";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import AuditLogService from "services/auditLogService";
import EmployeeService from "services/employeeService";
import { toast } from "react-toastify";

const getId = (value) => value?.id || value?._id;
const rowsOf = (response) => {
  const value = response?.data?.data;
  return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
};
const actorName = (log) =>
  log.actor?.fullName ||
  log.actorFullName ||
  log.fullName ||
  log.actor?.username ||
  log.username ||
  "Hệ thống / Ẩn danh";
const statusCode = (log) => Number(log.statusCode ?? log.httpStatus ?? log.status ?? 0);
const pretty = (value) => (value == null ? "Không có dữ liệu" : JSON.stringify(value, null, 2));
const dateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "—");
const actionLabel = {
  READ: "Đọc",
  CREATE: "Tạo",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  LOGIN: "Đăng nhập",
  EXPORT: "Export",
};

function JsonBlock({ title, value }) {
  return (
    <SoftBox mt={2}>
      <SoftTypography variant="button" fontWeight="bold">
        {title}
      </SoftTypography>
      <SoftBox
        component="pre"
        mt={0.5}
        p={2}
        sx={{
          bgcolor: "#111827",
          color: "#E5E7EB",
          borderRadius: 2,
          fontSize: 12,
          overflow: "auto",
          maxHeight: 280,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {pretty(value)}
      </SoftBox>
    </SoftBox>
  );
}

function AuditDetail({ id, onClose }) {
  const [log, setLog] = useState(null);
  useEffect(() => {
    if (!id) return;
    setLog(null);
    AuditLogService.getById(id)
      .then((response) => setLog(response.data?.data || response.data))
      .catch((error) =>
        toast.error(error.response?.data?.message || "Không thể tải chi tiết audit")
      );
  }, [id]);
  return (
    <Modal open={Boolean(id)} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "96%", lg: 980 },
          maxHeight: "92vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        {!log ? (
          <SoftTypography variant="button">Đang tải chi tiết...</SoftTypography>
        ) : (
          <>
            <SoftBox display="flex" justifyContent="space-between" gap={2}>
              <SoftBox>
                <SoftTypography variant="h5" fontWeight="bold">
                  Chi tiết nhật ký hoạt động
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {dateTime(log.createdAt || log.timestamp)} · {log.method}{" "}
                  {log.routeTemplate || log.url}
                </SoftTypography>
              </SoftBox>
              <IconButton onClick={onClose}>
                <Icon>close</Icon>
              </IconButton>
            </SoftBox>
            <Grid container spacing={2} mt={1}>
              {[
                [
                  "Người thực hiện",
                  `${actorName(log)}${
                    log.actor?.employeeCode || log.employeeCode
                      ? ` · ${log.actor?.employeeCode || log.employeeCode}`
                      : ""
                  }`,
                ],
                ["Hành động", actionLabel[log.action] || log.action],
                [
                  "Resource",
                  `${log.resource || "—"}${log.entityCode ? ` · ${log.entityCode}` : ""}`,
                ],
                ["HTTP", `${log.method || ""} · ${statusCode(log) || "—"}`],
                ["Thời gian xử lý", `${log.durationMs ?? log.duration ?? 0} ms`],
                ["Correlation ID", log.correlationId || "—"],
              ].map(([label, value]) => (
                <Grid item xs={12} md={6} key={label}>
                  <SoftTypography variant="caption" color="text">
                    {label}
                  </SoftTypography>
                  <SoftTypography
                    variant="button"
                    fontWeight="medium"
                    display="block"
                    sx={{ wordBreak: "break-all" }}
                  >
                    {value}
                  </SoftTypography>
                </Grid>
              ))}
            </Grid>
            <JsonBlock title="Query & Params" value={{ query: log.query, params: log.params }} />
            <JsonBlock title="Request body" value={log.requestBody ?? log.body} />
            <JsonBlock
              title="Response / Error"
              value={log.error || log.responseBody || log.response}
            />
            <JsonBlock title="Các trường thay đổi" value={log.changedFields} />
            <JsonBlock
              title="Thông tin request"
              value={{
                ip: log.ip,
                userAgent: log.userAgent,
                origin: log.origin,
                referer: log.referer,
                host: log.host,
              }}
            />
          </>
        )}
      </SoftBox>
    </Modal>
  );
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: "",
    actorId: "",
    action: "",
    status: "",
    resource: "",
    method: "",
    from: "",
    to: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search.trim()), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);
  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      actorId: filters.actorId || undefined,
      action: filters.action || undefined,
      status: filters.status || undefined,
      resource: filters.resource.trim() || undefined,
      method: filters.method || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }),
    [debouncedSearch, filters]
  );
  useEffect(() => setPage(1), [query]);
  useEffect(() => {
    EmployeeService.getAll({ page: 1, limit: 100 })
      .then((response) => setEmployees(rowsOf(response)))
      .catch(() => setEmployees([]));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      AuditLogService.getAll({ ...query, page, limit: 20 }),
      AuditLogService.getSummary(query),
    ])
      .then(([listResponse, summaryResponse]) => {
        if (!active) return;
        setLogs(rowsOf(listResponse));
        setMeta(listResponse.data?.meta || { totalPages: 1, total: 0 });
        setSummary(summaryResponse.data?.data || {});
      })
      .catch(
        (error) =>
          active && toast.error(error.response?.data?.message || "Không thể tải nhật ký hoạt động")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query, page]);
  const set = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const cards = [
    ["Tổng request", summary.totalLogs ?? summary.total ?? 0, "receipt_long", "#1565C0"],
    [
      "Thành công",
      summary.successful ?? summary.success ?? summary.successCount ?? 0,
      "check_circle",
      "#2E7D32",
    ],
    ["Thất bại", summary.failed ?? summary.failedCount ?? summary.errors ?? 0, "error", "#C62828"],
    ["Người thực hiện", summary.actorCount ?? summary.uniqueActors ?? 0, "groups", "#7B1FA2"],
    [
      "Thời gian TB",
      `${summary.averageDurationMs ?? summary.avgDurationMs ?? 0} ms`,
      "speed",
      "#E65100",
    ],
  ];
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Grid container spacing={2} mb={3}>
          {cards.map(([label, value, icon, color]) => (
            <Grid item xs={12} sm={6} lg key={label}>
              <Card>
                <SoftBox p={2} display="flex" gap={1.5} alignItems="center">
                  <Icon sx={{ color }}>{icon}</Icon>
                  <SoftBox>
                    <SoftTypography variant="caption" color="text">
                      {label}
                    </SoftTypography>
                    <SoftTypography variant="h6" fontWeight="bold" sx={{ color }}>
                      {value}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Card>
          <SoftBox p={3}>
            <SoftTypography variant="h5" fontWeight="bold">
              Nhật ký hoạt động
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Chỉ đọc · Truy vết request bằng correlation ID
            </SoftTypography>
            <SoftBox display="flex" gap={2} flexWrap="wrap" mt={3} mb={2}>
              <SoftBox sx={{ flex: 1, minWidth: 250 }}>
                <SoftInput
                  value={filters.search}
                  onChange={(event) => set("search", event.target.value)}
                  placeholder="Tìm người dùng, URL, entity hoặc correlation ID..."
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <Select
                  displayEmpty
                  value={filters.actorId}
                  onChange={(event) => set("actorId", event.target.value)}
                >
                  <MenuItem value="">Mọi người thực hiện</MenuItem>
                  {employees.map((employee) => (
                    <MenuItem key={getId(employee)} value={getId(employee)}>
                      {employee.employeeCode || "—"} - {employee.fullName || employee.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  displayEmpty
                  value={filters.action}
                  onChange={(event) => set("action", event.target.value)}
                >
                  <MenuItem value="">Mọi hành động</MenuItem>
                  {Object.entries(actionLabel).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select
                  displayEmpty
                  value={filters.method}
                  onChange={(event) => set("method", event.target.value)}
                >
                  <MenuItem value="">Mọi method</MenuItem>
                  {["GET", "POST", "PATCH", "PUT", "DELETE"].map((method) => (
                    <MenuItem key={method} value={method}>
                      {method}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <SoftBox width={130}>
                <SoftInput
                  value={filters.status}
                  onChange={(event) =>
                    set("status", event.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  placeholder="HTTP status"
                />
              </SoftBox>
              <SoftBox width={170}>
                <SoftInput
                  value={filters.resource}
                  onChange={(event) => set("resource", event.target.value)}
                  placeholder="Resource"
                />
              </SoftBox>
              <SoftBox width={160}>
                <SoftInput
                  type="date"
                  value={filters.from}
                  onChange={(event) => set("from", event.target.value)}
                />
              </SoftBox>
              <SoftBox width={160}>
                <SoftInput
                  type="date"
                  value={filters.to}
                  onChange={(event) => set("to", event.target.value)}
                />
              </SoftBox>
            </SoftBox>
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {[
                      "Thời gian",
                      "Người thực hiện",
                      "Hành động",
                      "Request",
                      "Resource",
                      "HTTP",
                      "Thời gian",
                      "Correlation ID",
                      "",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: 11,
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
                      <td colSpan={9} style={{ padding: 35, textAlign: "center" }}>
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loading && !logs.length && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ padding: 35, textAlign: "center", color: "#9E9E9E" }}
                      >
                        Không có nhật ký phù hợp
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    logs.map((log) => {
                      const code = statusCode(log);
                      return (
                        <tr key={getId(log)} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: 11, fontSize: 12, whiteSpace: "nowrap" }}>
                            {dateTime(log.createdAt || log.timestamp)}
                          </td>
                          <td style={{ padding: 11, fontSize: 13 }}>
                            {actorName(log)}
                            <br />
                            <span style={{ color: "#6B7280" }}>
                              {log.actor?.employeeCode ||
                                log.employeeCode ||
                                log.actor?.role ||
                                log.role ||
                                ""}
                            </span>
                          </td>
                          <td style={{ padding: 11, fontSize: 12 }}>
                            {actionLabel[log.action] || log.action || "—"}
                          </td>
                          <td style={{ padding: 11, fontSize: 12 }}>
                            <b>{log.method}</b> {log.routeTemplate || log.url}
                          </td>
                          <td style={{ padding: 11, fontSize: 12 }}>
                            {log.resource || "—"}
                            <br />
                            <span style={{ color: "#6B7280" }}>
                              {log.entityCode || log.entityId || ""}
                            </span>
                          </td>
                          <td style={{ padding: 11 }}>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 10,
                                fontSize: 11,
                                color: code >= 400 ? "#C62828" : "#2E7D32",
                                background: code >= 400 ? "#FFEBEE" : "#E8F5E9",
                              }}
                            >
                              {code || "—"}
                            </span>
                          </td>
                          <td style={{ padding: 11, fontSize: 12 }}>
                            {log.durationMs ?? log.duration ?? 0} ms
                          </td>
                          <td
                            style={{
                              padding: 11,
                              fontSize: 11,
                              maxWidth: 150,
                              wordBreak: "break-all",
                            }}
                          >
                            {log.correlationId || "—"}
                          </td>
                          <td style={{ padding: 11 }}>
                            <Tooltip title="Xem chi tiết">
                              <IconButton size="small" onClick={() => setDetailId(getId(log))}>
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
            {meta.totalPages > 1 && (
              <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
                <SoftTypography variant="caption">
                  Tổng {meta.total ?? meta.totalItems ?? 0} bản ghi
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
      <AuditDetail id={detailId} onClose={() => setDetailId(null)} />
    </DashboardLayout>
  );
}
