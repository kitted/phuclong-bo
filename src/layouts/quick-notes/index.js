import { useCallback, useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import MobileLoadMore from "components/MobileLoadMore";
import EmployeeService from "services/employeeService";
import QuickNoteService from "services/quickNoteService";
import { mergeUniqueItems } from "utils/infiniteList";
import { toast } from "react-toastify";

const idOf = (value) => value?.id || value?._id || "";
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const emptyForm = { title: "", content: "", targets: [], isActive: true, isPinned: false };

function NoteModal({ open, note, employees, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    const targetIds = new Set(note?.targetUserIds || []);
    setForm(note ? {
      title: note.title || "", content: note.content || "",
      targets: employees.filter((employee) => targetIds.has(idOf(employee))),
      isActive: note.isActive !== false, isPinned: Boolean(note.isPinned),
    } : emptyForm);
  }, [open, note, employees]);
  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return toast.error("Nhập tiêu đề và nội dung note");
    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(), content: form.content.trim(),
        targetUserIds: form.targets.map(idOf), isActive: form.isActive, isPinned: form.isPinned,
      };
      if (note) await QuickNoteService.update(idOf(note), payload);
      else await QuickNoteService.create(payload);
      toast.success(note ? "Đã cập nhật note" : "Đã gửi note cho sale");
      onSaved();
    } catch (error) { toast.error(error.response?.data?.message || "Không thể lưu note"); }
    finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose}><SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "94%", md: 680 }, maxHeight: "92dvh", overflowY: "auto", bgcolor: "#fff", borderRadius: 3, boxShadow: 24, p: { xs: 2, md: 3 } }}>
    <SoftBox display="flex" justifyContent="space-between" alignItems="center"><SoftTypography variant="h5" fontWeight="bold">{note ? "Cập nhật note" : "Tạo note nhanh cho sale"}</SoftTypography><IconButton onClick={onClose}><Icon>close</Icon></IconButton></SoftBox>
    <SoftBox mt={2}><SoftTypography variant="caption" fontWeight="bold">Tiêu đề *</SoftTypography><SoftInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Lưu ý giao hàng hôm nay" /></SoftBox>
    <SoftBox mt={1.5}><SoftTypography variant="caption" fontWeight="bold">Nội dung *</SoftTypography><TextField fullWidth multiline minRows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Nhập nội dung cần sale chú ý..." /></SoftBox>
    <SoftBox mt={1.5}><SoftTypography variant="caption" fontWeight="bold">Người nhận</SoftTypography><Autocomplete multiple options={employees} value={form.targets} onChange={(_, value) => setForm({ ...form, targets: value })} getOptionLabel={(employee) => `${employee.employeeCode || ""} · ${employee.fullName || employee.username || ""}`} isOptionEqualToValue={(a, b) => idOf(a) === idOf(b)} renderInput={(params) => <TextField {...params} placeholder={form.targets.length ? "" : "Để trống để gửi tất cả sale"} />} /></SoftBox>
    <SoftBox display="flex" gap={2} mt={1}><FormControlLabel control={<Checkbox checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />} label="Ghim lên bảng tin" /><FormControlLabel control={<Checkbox checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />} label="Đang hiển thị" /></SoftBox>
    <SoftBox display="flex" gap={1} mt={2}><SoftButton fullWidth variant="outlined" color="secondary" onClick={onClose}>Hủy</SoftButton><SoftButton fullWidth variant="gradient" color="info" disabled={saving} onClick={save}>{saving ? "Đang lưu..." : "Lưu và gửi"}</SoftButton></SoftBox>
  </SoftBox></Modal>;
}

export default function QuickNotes() {
  const [notes, setNotes] = useState([]); const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1); const [meta, setMeta] = useState({ totalPages: 1 });
  const [search, setSearch] = useState(""); const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false); const [editing, setEditing] = useState(undefined); const [modalOpen, setModalOpen] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setDebounced(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  useEffect(() => { setPage(1); setNotes([]); }, [debounced]);
  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await QuickNoteService.getAll({ search: debounced || undefined, page, limit: 20 }); setNotes((current) => page === 1 ? listOf(response) : mergeUniqueItems(current, listOf(response))); setMeta(response.data?.meta || unwrap(response)?.meta || { totalPages: 1 }); }
    catch (error) { toast.error(error.response?.data?.message || "Không thể tải note"); }
    finally { setLoading(false); }
  }, [debounced, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { EmployeeService.getAll({ role: "staff", status: "ACTIVE", page: 1, limit: 100 }).then((r) => setEmployees(listOf(r))).catch(() => setEmployees([])); }, []);
  const openCreate = () => { setEditing(undefined); setModalOpen(true); };
  const refresh = () => { setModalOpen(false); setPage(1); if (page === 1) load(); else setPage(1); };
  const patch = async (note, payload) => { try { await QuickNoteService.update(idOf(note), payload); toast.success("Đã cập nhật note"); refresh(); } catch (error) { toast.error(error.response?.data?.message || "Không thể cập nhật note"); } };
  const remove = async (note) => { if (!window.confirm(`Xóa note “${note.title}”?`)) return; try { await QuickNoteService.remove(idOf(note)); toast.success("Đã xóa note"); refresh(); } catch (error) { toast.error(error.response?.data?.message || "Không thể xóa note"); } };
  return <DashboardLayout><DashboardNavbar /><SoftBox py={3}><SoftBox bgcolor="#fff" borderRadius={3} p={{ xs: 1.5, md: 3 }}>
    <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap"><SoftBox><SoftTypography variant="h4" fontWeight="bold">Note nhanh cho sale</SoftTypography><SoftTypography variant="caption" color="text">Ghim thông báo quan trọng lên bảng tin nhân viên</SoftTypography></SoftBox><SoftButton color="info" variant="gradient" onClick={openCreate}><Icon>add_comment</Icon>&nbsp;Tạo note</SoftButton></SoftBox>
    <SoftBox mt={2}><SoftInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tiêu đề hoặc nội dung note..." icon={{ component: "search", direction: "left" }} /></SoftBox>
    <Grid container spacing={1.5} mt={.25}>{notes.map((note) => <Grid item xs={12} md={6} xl={4} key={idOf(note)}><SoftBox p={1.75} height="100%" borderRadius={2.5} bgcolor={note.isPinned ? "#fff8e1" : "#fff"} sx={{ border: note.isPinned ? "2px solid #ffb300" : "1px solid #e1e6ee" }}>
      <SoftBox display="flex" justifyContent="space-between" gap={1}><SoftBox display="flex" gap={1} minWidth={0}>{note.isPinned && <Icon sx={{ color: "#f57c00" }}>push_pin</Icon>}<SoftTypography variant="button" fontWeight="bold">{note.title}</SoftTypography></SoftBox><SoftBox display="flex"><IconButton size="small" onClick={() => { setEditing(note); setModalOpen(true); }}><Icon>edit</Icon></IconButton><IconButton size="small" onClick={() => remove(note)}><Icon color="error">delete</Icon></IconButton></SoftBox></SoftBox>
      <SoftTypography variant="body2" color="text" mt={1} sx={{ whiteSpace: "pre-wrap" }}>{note.content}</SoftTypography>
      <SoftBox display="flex" justifyContent="space-between" alignItems="center" mt={1.5}><SoftTypography variant="caption" color="text">{note.targetUserIds?.length ? `${note.targetUserIds.length} sale được chọn` : "Tất cả sale"}</SoftTypography><SoftBox display="flex" gap={.5}><SoftButton size="small" color={note.isPinned ? "warning" : "info"} variant="outlined" onClick={() => patch(note, { isPinned: !note.isPinned })}>{note.isPinned ? "Bỏ ghim" : "Ghim"}</SoftButton><SoftButton size="small" color={note.isActive ? "success" : "secondary"} variant="outlined" onClick={() => patch(note, { isActive: !note.isActive })}>{note.isActive ? "Đang hiện" : "Đang ẩn"}</SoftButton></SoftBox></SoftBox>
    </SoftBox></Grid>)}</Grid>
    {!loading && !notes.length && <SoftBox py={6} textAlign="center"><Icon sx={{ fontSize: 44, color: "#b0bec5" }}>speaker_notes_off</Icon><SoftTypography variant="button" color="text" display="block">Chưa có note nào</SoftTypography></SoftBox>}
    <MobileLoadMore loading={loading} hasMore={page < Number(meta.totalPages || 1)} onLoadMore={() => setPage((value) => value + 1)} />
  </SoftBox></SoftBox><NoteModal open={modalOpen} note={editing} employees={employees} onClose={() => setModalOpen(false)} onSaved={refresh} /></DashboardLayout>;
}

