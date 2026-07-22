import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import Pagination from "@mui/material/Pagination";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Tooltip from "@mui/material/Tooltip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import EmployeeService from "services/employeeService";
import { toast } from "react-toastify";

const EMPTY_FORM = { employeeCode: "", username: "", password: "", fullName: "", phone: "", email: "", note: "" };
const getId = (employee) => employee?.id || employee?._id;

function FormGridField({ label, children, xs = 12, md = 6 }) {
  return <Grid item xs={xs} md={md}><SoftTypography variant="caption" fontWeight="medium">{label}</SoftTypography>{children}</Grid>;
}

function EmployeeForm({ open, employeeId, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  useEffect(() => {
    let active = true;
    if (!open) return undefined;
    if (!employeeId) { setForm(EMPTY_FORM); return undefined; }
    setLoadingDetail(true);
    EmployeeService.getById(employeeId)
      .then((response) => { if (active) setForm({ ...EMPTY_FORM, ...(response.data?.data || {}) }); })
      .catch((error) => active && toast.error(error.response?.data?.message || "Không thể tải thông tin nhân viên"))
      .finally(() => active && setLoadingDetail(false));
    return () => { active = false; };
  }, [open, employeeId]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!form.username.trim()) return toast.error("Vui lòng nhập tên đăng nhập");
    if (!employeeId && form.password.length < 6) return toast.error("Mật khẩu phải có ít nhất 6 ký tự");
    if (employeeId && form.password && form.password.length < 6) return toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
    try {
      setLoading(true);
      const payload = { username: form.username.trim(), fullName: form.fullName.trim() || undefined, phone: form.phone.trim() || undefined, email: form.email.trim() || undefined, employeeCode: form.employeeCode.trim() || undefined, note: form.note.trim() || undefined, role: "staff" };
      if (form.password) payload.password = form.password;
      if (employeeId) await EmployeeService.update(employeeId, payload); else await EmployeeService.create(payload);
      toast.success(employeeId ? "Đã cập nhật nhân viên" : "Đã tạo tài khoản nhân viên");
      onSaved(!employeeId); onClose();
    } catch (error) { toast.error(error.response?.data?.message || "Không thể lưu nhân viên"); }
    finally { setLoading(false); }
  };
  return <Modal open={open} onClose={onClose}><SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "92%", md: 680 }, maxHeight: "90vh", overflowY: "auto", bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4 }}><SoftTypography variant="h5" fontWeight="bold">{employeeId ? "Cập nhật nhân viên" : "Thêm nhân viên"}</SoftTypography><SoftTypography variant="caption" color="text">Tài khoản được cấp quyền Staff</SoftTypography>{loadingDetail ? <SoftTypography variant="button" display="block" mt={3}>Đang tải...</SoftTypography> : <Grid container spacing={2} mt={1}><FormGridField label="Mã nhân viên"><SoftInput value={form.employeeCode || ""} onChange={(e) => set("employeeCode", e.target.value.toUpperCase())} placeholder="Để trống để tự sinh" fullWidth /></FormGridField><FormGridField label="Họ và tên"><SoftInput value={form.fullName || ""} onChange={(e) => set("fullName", e.target.value)} fullWidth /></FormGridField><FormGridField label="Tên đăng nhập *"><SoftInput value={form.username || ""} onChange={(e) => set("username", e.target.value)} fullWidth /></FormGridField><FormGridField label={employeeId ? "Mật khẩu mới" : "Mật khẩu *"}><SoftInput type="password" value={form.password || ""} onChange={(e) => set("password", e.target.value)} placeholder={employeeId ? "Để trống nếu không đổi" : "Tối thiểu 6 ký tự"} fullWidth /></FormGridField><FormGridField label="Số điện thoại"><SoftInput value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} fullWidth /></FormGridField><FormGridField label="Email"><SoftInput type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} fullWidth /></FormGridField><FormGridField label="Ghi chú" md={12}><SoftInput value={form.note || ""} onChange={(e) => set("note", e.target.value)} fullWidth /></FormGridField></Grid>}<SoftBox display="flex" gap={2} mt={3}><SoftButton variant="outlined" color="secondary" fullWidth onClick={onClose}>Hủy</SoftButton><SoftButton variant="gradient" color="info" fullWidth disabled={loading || loadingDetail} onClick={save}>{loading ? "Đang lưu..." : "Lưu nhân viên"}</SoftButton></SoftBox></SoftBox></Modal>;
}

export default function NhanVien() {
  const [employees, setEmployees] = useState([]); const [summary, setSummary] = useState({}); const [search, setSearch] = useState(""); const [debouncedSearch, setDebouncedSearch] = useState(""); const [status, setStatus] = useState(""); const [page, setPage] = useState(1); const [refreshKey, setRefreshKey] = useState(0); const [meta, setMeta] = useState({ totalPages: 1, totalItems: 0 }); const [loading, setLoading] = useState(false); const [formOpen, setFormOpen] = useState(false); const [selectedId, setSelectedId] = useState(null);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400); return () => clearTimeout(timer); }, [search]);
  useEffect(() => setPage(1), [debouncedSearch, status]);
  const load = () => {
    setLoading(true);
    Promise.all([EmployeeService.getAll({ role: "staff", status: status || undefined, search: debouncedSearch || undefined, page, limit: 20 }), EmployeeService.getSummary()])
      .then(([listResponse, summaryResponse]) => { setEmployees(Array.isArray(listResponse.data?.data) ? listResponse.data.data : []); setMeta(listResponse.data?.meta || { totalPages: 1, totalItems: 0 }); setSummary(summaryResponse.data?.data || {}); })
      .catch((error) => { setEmployees([]); toast.error(error.response?.data?.message || "Không thể tải danh sách nhân viên"); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, debouncedSearch, status, refreshKey]);
  const refresh = (firstPage = false) => { if (firstPage) setPage(1); setRefreshKey((value) => value + 1); };
  const changeStatus = async (employee) => { const next = employee.status === "INACTIVE" ? "ACTIVE" : "INACTIVE"; try { await EmployeeService.changeStatus(getId(employee), next); toast.success(next === "ACTIVE" ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản"); refresh(); } catch (error) { toast.error(error.response?.data?.message || "Không thể đổi trạng thái tài khoản"); } };
  const remove = async (employee) => { if (!window.confirm(`Xóa nhân viên ${employee.fullName || employee.username}?`)) return; try { await EmployeeService.remove(getId(employee)); toast.success("Đã xóa nhân viên"); if (employees.length === 1 && page > 1) setPage((value) => value - 1); else refresh(); } catch (error) { toast.error(error.response?.data?.message || "Không thể xóa nhân viên"); } };
  const statusBadge = (value) => <span style={{ padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, color: value === "ACTIVE" ? "#2E7D32" : "#C62828", background: value === "ACTIVE" ? "#E8F5E9" : "#FFEBEE" }}>{value === "ACTIVE" ? "Hoạt động" : "Đã khóa"}</span>;
  return <DashboardLayout><DashboardNavbar /><SoftBox py={3}><SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">{[["Nhân viên Staff", summary.staff || 0, "badge", "#1565C0"], ["Tài khoản hoạt động", summary.active || 0, "verified_user", "#2E7D32"], ["Tài khoản đã khóa", summary.inactive || 0, "lock", "#C62828"], ["Đã từng đăng nhập", summary.loggedIn || 0, "login", "#7B1FA2"]].map(([label, value, icon, color]) => <Card key={label} sx={{ flex: 1, minWidth: 190 }}><SoftBox p={2.5} display="flex" gap={2} alignItems="center"><Icon sx={{ color }}>{icon}</Icon><SoftBox><SoftTypography variant="caption">{label}</SoftTypography><SoftTypography variant="h5" fontWeight="bold" sx={{ color }}>{value}</SoftTypography></SoftBox></SoftBox></Card>)}</SoftBox><Card><SoftBox p={3}><SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}><SoftBox><SoftTypography variant="h5" fontWeight="bold">Quản lý nhân viên</SoftTypography><SoftTypography variant="caption" color="text">Tài khoản và quyền truy cập dành cho Staff</SoftTypography></SoftBox><SoftButton variant="gradient" color="info" startIcon={<Icon>person_add</Icon>} onClick={() => { setSelectedId(null); setFormOpen(true); }}>Thêm nhân viên</SoftButton></SoftBox><SoftBox display="flex" gap={2} mb={3} flexWrap="wrap"><SoftBox sx={{ flex: 1, minWidth: 240 }}><SoftInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã, username, họ tên, điện thoại..." icon={{ component: "search", direction: "left" }} /></SoftBox><FormControl size="small" sx={{ minWidth: 170 }}><Select displayEmpty value={status} onChange={(e) => setStatus(e.target.value)}><MenuItem value="">Mọi trạng thái</MenuItem><MenuItem value="ACTIVE">Đang hoạt động</MenuItem><MenuItem value="INACTIVE">Đã khóa</MenuItem></Select></FormControl></SoftBox><SoftBox sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#F8F9FA" }}>{["Nhân viên", "Tài khoản", "Liên hệ", "Trạng thái", "Đăng nhập gần nhất", "Ngày tạo", ""].map((heading, index) => <th key={`${heading}-${index}`} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>{heading}</th>)}</tr></thead><tbody>{loading && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32 }}>Đang tải...</td></tr>}{!loading && employees.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}>Không tìm thấy nhân viên</td></tr>}{!loading && employees.map((employee) => <tr key={getId(employee)} style={{ borderBottom: "1px solid #eee" }}><td style={{ padding: "10px 12px" }}><SoftTypography variant="button" fontWeight="bold">{employee.fullName || "Chưa cập nhật"}</SoftTypography><SoftTypography variant="caption" display="block" color="text">{employee.employeeCode || "—"}</SoftTypography></td><td style={{ padding: "10px 12px", fontSize: 13 }}>{employee.username}<br /><span style={{ color: "#6B7280" }}>Staff</span></td><td style={{ padding: "10px 12px", fontSize: 13 }}>{employee.phone || "—"}<br /><span style={{ color: "#6B7280" }}>{employee.email || "—"}</span></td><td style={{ padding: "10px 12px" }}>{statusBadge(employee.status)}</td><td style={{ padding: "10px 12px", fontSize: 13 }}>{employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString("vi-VN") : "Chưa đăng nhập"}</td><td style={{ padding: "10px 12px", fontSize: 13 }}>{employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("vi-VN") : "—"}</td><td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}><Tooltip title="Chỉnh sửa"><IconButton size="small" onClick={() => { setSelectedId(getId(employee)); setFormOpen(true); }}><Icon color="info">edit</Icon></IconButton></Tooltip><Tooltip title={employee.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}><IconButton size="small" onClick={() => changeStatus(employee)}><Icon sx={{ color: employee.status === "ACTIVE" ? "#E65100" : "#2E7D32" }}>{employee.status === "ACTIVE" ? "lock" : "lock_open"}</Icon></IconButton></Tooltip><Tooltip title="Xóa nhân viên"><IconButton size="small" onClick={() => remove(employee)}><Icon sx={{ color: "#EF4444" }}>delete</Icon></IconButton></Tooltip></td></tr>)}</tbody></table></SoftBox>{meta.totalPages > 1 && <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center"><SoftTypography variant="caption" color="text">Tổng {meta.totalItems} nhân viên</SoftTypography><Pagination page={page} count={meta.totalPages} color="primary" onChange={(_, value) => setPage(value)} /></SoftBox>}</SoftBox></Card></SoftBox><EmployeeForm open={formOpen} employeeId={selectedId} onClose={() => setFormOpen(false)} onSaved={(created) => refresh(created)} /></DashboardLayout>;
}
