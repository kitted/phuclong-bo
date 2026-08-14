import { useEffect, useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { ProductService, TruckService } from "services/warehouseService";
import EmployeeService from "services/employeeService";
import { DailyReportService, GoodsAdvanceService } from "services/dailyOperationsService";
import { downloadBlob } from "utils/excel";
import { toast } from "react-toastify";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const rows = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const idOf = (value) => value?.id || value?._id || "";
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const occurredAt = (date) => {
  const now = new Date();
  return `${date}T${[now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":")}+07:00`;
};
const statusStyle = {
  DRAFT: ["Bản nháp", "#fff3e0", "#e65100"],
  CONFIRMED: ["Đã xác nhận", "#e8f5e9", "#2e7d32"],
  CANCELLED: ["Đã hủy", "#ffebee", "#c62828"],
};

function AdvanceTab() {
  const [data, setData] = useState([]);
  const [products, setProducts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ date: today(), employee: null, truck: null, note: "", issues: "" });
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const load = () => GoodsAdvanceService.list({ page: 1, limit: 100 })
    .then((r) => setData(rows(r)))
    .catch((error) => {
      setData([]);
      toast.error(error.response?.data?.message || "Không thể tải phiếu tạm ứng");
    });
  useEffect(() => {
    load();
    Promise.allSettled([
      ProductService.getAll({ page: 1, limit: 100 }),
      TruckService.getAll({ page: 1, limit: 100, status: "active" }),
      EmployeeService.getAll({ role: "staff", status: "ACTIVE", page: 1, limit: 100 }),
    ]).then(([p, t, e]) => {
      setProducts(p.status === "fulfilled" ? rows(p.value) : []);
      setTrucks(t.status === "fulfilled" ? rows(t.value) : []);
      setEmployees(e.status === "fulfilled" ? rows(e.value) : []);
      if ([p, t, e].some((result) => result.status === "rejected"))
        toast.error("Một số danh sách tùy chọn chưa tải được. Kiểm tra kết nối backend.");
    });
  }, []);
  const selectedIds = useMemo(() => new Set(items.map((item) => idOf(item.product))), [items]);
  const add = (product) => {
    if (!product || selectedIds.has(idOf(product))) return;
    setItems((current) => [...current, { product, quantity: 1, note: "" }]);
  };
  const patchItem = (index, patch) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const save = async (status) => {
    if (!form.employee || !form.truck || !items.length) return toast.error("Chọn nhân viên, xe và hàng tạm ứng");
    try {
      setSaving(true);
      await GoodsAdvanceService.create({
        date: occurredAt(form.date), employeeId: idOf(form.employee), truckId: idOf(form.truck),
        items: items.map((item) => ({ productId: idOf(item.product), quantity: Number(item.quantity), note: item.note || undefined })),
        note: form.note || undefined, issues: form.issues || undefined,
        warehouseIssuerName: "Thủ kho", advanceRecipientName: form.employee.fullName || form.employee.username,
        status,
      });
      toast.success(status === "CONFIRMED" ? "Đã xác nhận tạm ứng hàng" : "Đã lưu bản nháp");
      setItems([]); setForm({ date: today(), employee: null, truck: null, note: "", issues: "" }); load();
    } catch (error) { toast.error(error.response?.data?.message || "Không thể lưu phiếu tạm ứng"); }
    finally { setSaving(false); }
  };
  const changeStatus = async (doc, status) => {
    try { await GoodsAdvanceService.changeStatus(idOf(doc), status, status === "CANCELLED" ? "Admin hủy phiếu" : undefined); await load(); }
    catch (error) { toast.error(error.response?.data?.message || "Không thể đổi trạng thái"); }
  };
  const exportDoc = async (doc) => {
    const response = await GoodsAdvanceService.export(idOf(doc));
    downloadBlob(response.data, `${doc.code || "phieu-tam-ung"}.xlsx`);
  };
  return <SoftBox>
    <SoftBox p={{ xs: 1.5, md: 2.5 }} borderRadius={3} bgcolor="#f3f8ff" mb={2}>
      <SoftTypography variant="h6" fontWeight="bold">Lập phiếu tạm ứng hàng</SoftTypography>
      <Grid container spacing={1.5} mt={0.25}>
        <Grid item xs={12} md={4}><SoftInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Grid>
        <Grid item xs={12} md={4}><Autocomplete options={employees} value={form.employee} onChange={(_, value) => setForm({ ...form, employee: value })} getOptionLabel={(x) => `${x.employeeCode || ""} · ${x.fullName || x.username || ""}`} renderInput={(params) => <TextField {...params} placeholder="Nhân viên nhận hàng" />} /></Grid>
        <Grid item xs={12} md={4}><Autocomplete options={trucks} value={form.truck} onChange={(_, value) => setForm({ ...form, truck: value })} getOptionLabel={(x) => `${x.code || ""} · ${x.name || ""}`} renderInput={(params) => <TextField {...params} placeholder="Xe nhận hàng" />} /></Grid>
        <Grid item xs={12}><Autocomplete value={null} options={products.filter((p) => !selectedIds.has(idOf(p)))} onChange={(_, value) => add(value)} getOptionLabel={(x) => `${x.code || ""} · ${x.name || ""}`} renderInput={(params) => <TextField {...params} placeholder="Tìm và thêm hàng hóa..." />} /></Grid>
      </Grid>
      {items.map((item, index) => <SoftBox key={idOf(item.product)} mt={1} p={1.25} bgcolor="#fff" borderRadius={2} sx={{ border: "1px solid #d7e5f5" }}>
        <SoftBox display="flex" justifyContent="space-between"><SoftTypography variant="button" fontWeight="bold">{index + 1}. {item.product.name}</SoftTypography><IconButton size="small" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}><Icon color="error">delete</Icon></IconButton></SoftBox>
        <SoftBox display="flex" alignItems="center" gap={1} mt={1}><IconButton onClick={() => patchItem(index, { quantity: Math.max(1, item.quantity - 1) })}><Icon>remove</Icon></IconButton><SoftInput type="number" value={item.quantity} onChange={(e) => patchItem(index, { quantity: Math.max(1, Number(e.target.value)) })} sx={{ maxWidth: 100, "& input": { textAlign: "center" } }} /><IconButton onClick={() => patchItem(index, { quantity: item.quantity + 1 })}><Icon>add</Icon></IconButton><SoftInput value={item.note} onChange={(e) => patchItem(index, { note: e.target.value })} placeholder="Ghi chú hàng" /></SoftBox>
      </SoftBox>)}
      <Grid container spacing={1.5} mt={0.5}><Grid item xs={12} md={6}><SoftInput value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú phiếu" /></Grid><Grid item xs={12} md={6}><SoftInput value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} placeholder="Các vấn đề cần chú ý" /></Grid></Grid>
      <SoftBox display="flex" gap={1} mt={2}><SoftButton fullWidth variant="outlined" color="info" disabled={saving} onClick={() => save("DRAFT")}>Lưu nháp</SoftButton><SoftButton fullWidth variant="gradient" color="success" disabled={saving} onClick={() => save("CONFIRMED")}>Xác nhận & xuất hàng</SoftButton></SoftBox>
    </SoftBox>
    <SoftTypography variant="h6" fontWeight="bold" mb={1}>Phiếu đã lưu</SoftTypography>
    <Grid container spacing={1.5}>{data.map((doc) => { const badge = statusStyle[doc.status] || [doc.status, "#eee", "#555"]; return <Grid item xs={12} md={6} lg={4} key={idOf(doc)}><SoftBox p={1.5} borderRadius={2} sx={{ border: "1px solid #e1e6ee" }}><SoftBox display="flex" justifyContent="space-between"><SoftTypography variant="button" fontWeight="bold">{doc.code}</SoftTypography><span style={{ background: badge[1], color: badge[2], padding: "4px 8px", borderRadius: 12, fontSize: 11 }}>{badge[0]}</span></SoftBox><SoftTypography variant="caption" color="text" display="block">{new Date(doc.date).toLocaleString("vi-VN")} · {doc.employeeName}</SoftTypography><SoftTypography variant="caption">{doc.truckCode} · {doc.items?.length || 0} mặt hàng</SoftTypography><SoftBox display="flex" gap={.5} mt={1}><SoftButton size="small" color="info" onClick={() => exportDoc(doc)}>Xuất file</SoftButton>{doc.status === "DRAFT" && <><SoftButton size="small" color="success" onClick={() => changeStatus(doc, "CONFIRMED")}>Xác nhận</SoftButton><SoftButton size="small" color="error" onClick={() => changeStatus(doc, "CANCELLED")}>Hủy</SoftButton></>}</SoftBox></SoftBox></Grid>; })}</Grid>
  </SoftBox>;
}

function DailyReportTab() {
  const [date, setDate] = useState(today()); const [preview, setPreview] = useState(null); const [saved, setSaved] = useState([]); const [notes, setNotes] = useState(""); const [issues, setIssues] = useState("");
  const loadList = () => DailyReportService.list({ page: 1, limit: 100 }).then((r) => setSaved(rows(r)));
  const loadPreview = () => DailyReportService.preview(date).then((r) => setPreview(unwrap(r))).catch((e) => toast.error(e.response?.data?.message || "Không thể tổng hợp báo cáo"));
  // Chỉ tải ngày mặc định một lần khi mở tab; các lần sau do người dùng chủ động chọn.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadPreview(); loadList(); }, []);
  const summary = preview?.summary || {};
  const create = async () => { try { await DailyReportService.create({ date, notes: notes || undefined, issues: issues || undefined, manualAdjustments: [] }); toast.success("Đã chốt báo cáo ngày"); loadList(); } catch (e) { toast.error(e.response?.data?.message || "Không thể chốt báo cáo"); } };
  const exportDoc = async (doc) => { const r = await DailyReportService.export(idOf(doc)); downloadBlob(r.data, `${doc.code}.xlsx`); };
  return <SoftBox><SoftBox display="flex" gap={1} flexWrap="wrap" mb={2}><SoftInput type="date" value={date} onChange={(e) => setDate(e.target.value)} sx={{ maxWidth: 220 }} /><SoftButton color="info" onClick={loadPreview}><Icon>refresh</Icon>&nbsp;Tổng hợp lại</SoftButton><SoftButton color="success" onClick={create}><Icon>lock</Icon>&nbsp;Chốt báo cáo</SoftButton></SoftBox>
    {preview && <><Grid container spacing={1.25}>{[["Chứng từ", summary.documentCount], ["Doanh thu bán", money(summary.salesRevenue)], ["Tiền mặt", money(summary.cash)], ["Chuyển khoản", money(summary.bankTransfer)], ["Doanh thu ròng", money(summary.netRevenue)]].map(([label, value]) => <Grid item xs={6} md key={label}><SoftBox p={1.5} borderRadius={2} bgcolor="#f7f9fc"><SoftTypography variant="caption" color="text">{label}</SoftTypography><SoftTypography variant="h6" fontWeight="bold">{value || 0}</SoftTypography></SoftBox></Grid>)}</Grid>
    <Grid container spacing={2} mt={.5}><Grid item xs={12} lg={7}><SoftTypography variant="button" fontWeight="bold">Chứng từ trong ngày</SoftTypography>{(preview.documents || []).map((doc) => <SoftBox key={`${doc.type}-${doc.id}`} display="flex" justifyContent="space-between" p={1} mt={.5} borderRadius={1.5} bgcolor="#fafafa"><SoftBox><SoftTypography variant="button" fontWeight="bold">{doc.code} · {doc.customerName || "Khách lẻ"}</SoftTypography><SoftTypography variant="caption" display="block" color="text">{doc.employeeName} · {doc.type}</SoftTypography></SoftBox><SoftTypography variant="button" fontWeight="bold">{money(doc.amount)}</SoftTypography></SoftBox>)}</Grid><Grid item xs={12} lg={5}><SoftTypography variant="button" fontWeight="bold">Hàng bán trong ngày</SoftTypography>{(preview.products || []).map((p) => <SoftBox key={p.productId} display="flex" justifyContent="space-between" p={1} mt={.5} bgcolor="#f3f8ff" borderRadius={1.5}><SoftTypography variant="button">{p.productName}</SoftTypography><SoftTypography variant="button" fontWeight="bold">{p.quantity} {p.unit}</SoftTypography></SoftBox>)}</Grid></Grid>
    <Grid container spacing={1.5} mt={1}><Grid item xs={12} md={6}><SoftInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú báo cáo" /></Grid><Grid item xs={12} md={6}><SoftInput value={issues} onChange={(e) => setIssues(e.target.value)} placeholder="Vấn đề cần giải quyết ngay" /></Grid></Grid></>}
    <SoftTypography variant="h6" fontWeight="bold" mt={3} mb={1}>Báo cáo đã chốt</SoftTypography>{saved.map((doc) => <SoftBox key={idOf(doc)} p={1.25} mb={1} borderRadius={2} sx={{ border: "1px solid #e1e6ee" }} display="flex" justifyContent="space-between" alignItems="center"><SoftBox><SoftTypography variant="button" fontWeight="bold">{doc.code}</SoftTypography><SoftTypography variant="caption" display="block">{doc.reportDate}</SoftTypography></SoftBox><SoftButton size="small" color="info" onClick={() => exportDoc(doc)}>Xuất Excel</SoftButton></SoftBox>)}
  </SoftBox>;
}

export default function DailyOperations() {
  const [tab, setTab] = useState(0);
  return <DashboardLayout><DashboardNavbar /><SoftBox py={3}><SoftBox bgcolor="#fff" borderRadius={3} p={{ xs: 1.5, md: 3 }}><SoftTypography variant="h4" fontWeight="bold">Nghiệp vụ trong ngày</SoftTypography><Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}><Tab label="Phiếu tạm ứng hàng" /><Tab label="Báo cáo tổng hợp ngày" /></Tabs>{tab === 0 ? <AdvanceTab /> : <DailyReportTab />}</SoftBox></SoftBox></DashboardLayout>;
}
