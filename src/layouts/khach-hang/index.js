import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Pagination from "@mui/material/Pagination";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import { CustomerService, CUSTOMER_SEGMENTS } from "services/crmService";
import { toast } from "react-toastify";

const money = (value) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);
const EMPTY_FORM = { name: "", phone: "", email: "", address: "", source: "LEAD", segment: "THƯỜNG", zaloConnected: false, debtLimit: 0, note: "" };
const badge = (label, color, background) => <span style={{ padding: "4px 9px", borderRadius: 12, fontSize: 11, fontWeight: 600, color, background }}>{label}</span>;

function CustomerForm({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(customer ? { ...EMPTY_FORM, ...customer } : EMPTY_FORM), [customer, open]);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Tên và số điện thoại là bắt buộc");
    try {
      setSaving(true);
      const payload = { ...form, debtLimit: Number(form.debtLimit) || 0 };
      if (customer?.id) await CustomerService.update(customer.id, payload); else await CustomerService.create(payload);
      toast.success(customer ? "Đã cập nhật khách hàng" : "Đã thêm khách hàng");
      onSaved(); onClose();
    } catch (error) { toast.error(error.response?.data?.message || "Không thể lưu khách hàng"); } finally { setSaving(false); }
  };
  return <Modal open={open} onClose={onClose}><SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "92%", md: 650 }, maxHeight: "90vh", overflowY: "auto", bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4 }}>
    <SoftTypography variant="h5" fontWeight="bold" mb={3}>{customer ? "Cập nhật khách hàng" : "Thêm khách hàng"}</SoftTypography>
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}><SoftTypography variant="caption">Tên khách hàng *</SoftTypography><SoftInput value={form.name} onChange={(e) => set("name", e.target.value)} fullWidth /></Grid>
      <Grid item xs={12} md={6}><SoftTypography variant="caption">Số điện thoại *</SoftTypography><SoftInput value={form.phone} onChange={(e) => set("phone", e.target.value)} fullWidth /></Grid>
      <Grid item xs={12} md={6}><SoftTypography variant="caption">Email</SoftTypography><SoftInput value={form.email} onChange={(e) => set("email", e.target.value)} fullWidth /></Grid>
      <Grid item xs={12} md={6}><SoftTypography variant="caption">Địa chỉ</SoftTypography><SoftInput value={form.address} onChange={(e) => set("address", e.target.value)} fullWidth /></Grid>
      <Grid item xs={12} md={4}><SoftTypography variant="caption">Nguồn khách hàng</SoftTypography><FormControl fullWidth size="small"><Select value={form.source} onChange={(e) => set("source", e.target.value)}><MenuItem value="LEAD">Khách lead</MenuItem><MenuItem value="LEGACY">Hệ thống cũ</MenuItem><MenuItem value="NEW">Khách mới</MenuItem></Select></FormControl></Grid>
      <Grid item xs={12} md={4}><SoftTypography variant="caption">Phân loại</SoftTypography><FormControl fullWidth size="small"><Select value={form.segment} onChange={(e) => set("segment", e.target.value)}>{CUSTOMER_SEGMENTS.map((item) => <MenuItem value={item} key={item}>{item}</MenuItem>)}</Select></FormControl></Grid>
      <Grid item xs={12} md={4}><SoftTypography variant="caption">Kết bạn Zalo</SoftTypography><FormControl fullWidth size="small"><Select value={form.zaloConnected ? "yes" : "no"} onChange={(e) => set("zaloConnected", e.target.value === "yes")}><MenuItem value="yes">Đã kết bạn</MenuItem><MenuItem value="no">Chưa kết bạn</MenuItem></Select></FormControl></Grid>
      <Grid item xs={12} md={6}><SoftTypography variant="caption">Giới hạn công nợ</SoftTypography><SoftInput type="number" value={form.debtLimit} onChange={(e) => set("debtLimit", e.target.value)} fullWidth /></Grid>
      <Grid item xs={12}><SoftTypography variant="caption">Ghi chú</SoftTypography><SoftInput value={form.note} onChange={(e) => set("note", e.target.value)} fullWidth /></Grid>
    </Grid>
    <SoftBox display="flex" gap={2} mt={3}><SoftButton color="secondary" variant="outlined" fullWidth onClick={onClose}>Hủy</SoftButton><SoftButton color="info" variant="gradient" fullWidth disabled={saving} onClick={save}>{saving ? "Đang lưu..." : "Lưu khách hàng"}</SoftButton></SoftBox>
  </SoftBox></Modal>;
}

function CustomerDetail({ customerId, open, onClose, onEdit }) {
  const [customer, setCustomer] = useState(null);
  const [tab, setTab] = useState(0);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [interaction, setInteraction] = useState({ channel: "Zalo", action: "", result: "" });
  const [savingInteraction, setSavingInteraction] = useState(false);
  const loadDetail = () => CustomerService.getById(customerId).then((response) => setCustomer(response.data));
  useEffect(() => {
    let active = true;
    if (open && customerId) {
      setCustomer(null);
      setTab(0);
      CustomerService.getById(customerId).then((response) => {
        if (active) setCustomer(response.data);
      }).catch((error) => active && toast.error(error.response?.data?.message || "Không thể tải hồ sơ khách hàng"));
    }
    return () => { active = false; };
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
      setTab(3);
    } catch (error) { toast.error(error.response?.data?.message || "Không thể ghi nhận tương tác"); }
    finally { setSavingInteraction(false); }
  };
  const debtRatio = customer?.debtLimit ? Math.round((customer.debt / customer.debtLimit) * 100) : 0;
  return <Modal open={open} onClose={onClose}><SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "95%", lg: 1000 }, height: "88vh", overflowY: "auto", bgcolor: "#F8F9FA", borderRadius: 3, boxShadow: 24, p: 3 }}>
    {!customer ? <SoftBox height="100%" display="flex" alignItems="center" justifyContent="center"><SoftTypography variant="button" color="text">Đang tải hồ sơ khách hàng...</SoftTypography></SoftBox> : <>
    <SoftBox display="flex" justifyContent="space-between" alignItems="start"><SoftBox><SoftTypography variant="h4" fontWeight="bold">{customer.name}</SoftTypography><SoftTypography variant="button" color="text">{customer.code} · {customer.phone} · {customer.email || "Chưa có email"}</SoftTypography></SoftBox><SoftBox display="flex" gap={1}><SoftButton size="small" color="success" variant="outlined" startIcon={<Icon>add_comment</Icon>} onClick={() => setInteractionOpen(true)}>Ghi nhận tương tác</SoftButton><SoftButton size="small" color="info" variant="outlined" startIcon={<Icon>edit</Icon>} onClick={() => onEdit(customer)}>Chỉnh sửa</SoftButton><IconButton onClick={onClose}><Icon>close</Icon></IconButton></SoftBox></SoftBox>
    {customer.debt > customer.debtLimit && <SoftBox mt={2} p={1.5} sx={{ background: "#FFEBEE", borderRadius: 2, border: "1px solid #FFCDD2" }}><SoftTypography variant="button" sx={{ color: "#C62828" }}><Icon sx={{ verticalAlign: "middle", mr: 1 }}>warning</Icon>Công nợ đã vượt hạn mức {money(customer.debt - customer.debtLimit)}. Cần duyệt trước khi tạo hóa đơn mới.</SoftTypography></SoftBox>}
    <Grid container spacing={2} mt={0}><Grid item xs={6} md={3}><Card><SoftBox p={2}><SoftTypography variant="caption">Tổng doanh số</SoftTypography><SoftTypography variant="h6" fontWeight="bold">{money(customer.totalSpent)}</SoftTypography></SoftBox></Card></Grid><Grid item xs={6} md={3}><Card><SoftBox p={2}><SoftTypography variant="caption">Số hóa đơn</SoftTypography><SoftTypography variant="h5" fontWeight="bold">{customer.orderCount}</SoftTypography></SoftBox></Card></Grid><Grid item xs={6} md={3}><Card><SoftBox p={2}><SoftTypography variant="caption">Công nợ hiện tại</SoftTypography><SoftTypography variant="h6" fontWeight="bold" color={debtRatio >= 100 ? "error" : "warning"}>{money(customer.debt)}</SoftTypography><SoftTypography variant="caption">{debtRatio}% hạn mức</SoftTypography></SoftBox></Card></Grid><Grid item xs={6} md={3}><Card><SoftBox p={2}><SoftTypography variant="caption">Zalo</SoftTypography><SoftTypography variant="button" fontWeight="bold" color={customer.zaloConnected ? "success" : "text"}>{customer.zaloConnected ? "Đã kết bạn" : "Chưa kết bạn"}</SoftTypography></SoftBox></Card></Grid></Grid>
    <Card sx={{ mt: 2 }}><Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ "& .MuiTabs-flexContainer": { flexWrap: { xs: "wrap", md: "nowrap" } }, "& .MuiTab-root": { minWidth: { xs: "50%", md: "auto" }, flex: { md: 1 } } }}><Tab label="Hồ sơ" /><Tab label={`Hóa đơn (${customer.invoices.length})`} /><Tab label={`Mã khuyến mãi (${customer.vouchers.length})`} /><Tab label={`Lịch sử tương tác (${customer.interactions.length})`} /></Tabs><SoftBox p={3}>
      {tab === 0 && <Grid container spacing={2}><Grid item xs={12} md={6}>{[["Phân loại", customer.segment], ["Nguồn", customer.source === "LEGACY" ? "Hệ thống cũ" : customer.source === "LEAD" ? "Khách lead" : "Khách mới"], ["Địa chỉ", customer.address], ["Đơn gần nhất", customer.lastOrderAt || "—"]].map(([key, value]) => <SoftBox key={key} mb={1}><SoftTypography variant="caption" color="text">{key}</SoftTypography><SoftTypography variant="button" display="block">{value}</SoftTypography></SoftBox>)}</Grid><Grid item xs={12} md={6}><SoftTypography variant="caption" color="text">Hạn mức công nợ</SoftTypography><SoftTypography variant="h6">{money(customer.debtLimit)}</SoftTypography><SoftTypography variant="caption" color="text">Ghi chú</SoftTypography><SoftTypography variant="button" display="block">{customer.note || "Không có ghi chú"}</SoftTypography></Grid></Grid>}
      {tab === 1 && <DataTable headers={["Mã hóa đơn", "Ngày", "Tổng tiền", "Đã thanh toán", "Trạng thái"]} rows={customer.invoices.map((item) => [item.code, item.date, money(item.total), money(item.paid), item.status === "PAID" ? badge("Đã thanh toán", "#388E3C", "#E8F5E9") : item.status === "PARTIAL" ? badge("Một phần", "#E65100", "#FFF3E0") : badge("Chưa thanh toán", "#C62828", "#FFEBEE")])} />}
      {tab === 2 && <DataTable headers={["Mã voucher", "Chương trình", "Ưu đãi", "Hết hạn", "Trạng thái"]} rows={customer.vouchers.map((item) => [item.code, item.campaign, item.benefit, item.expiresAt, item.status === "ACTIVE" ? badge("Có thể dùng", "#388E3C", "#E8F5E9") : badge("Đã sử dụng", "#6B7280", "#F3F4F6")])} />}
      {tab === 3 && <DataTable headers={["Thời gian", "Kênh", "Tương tác", "Kết quả"]} rows={customer.interactions.map((item) => [item.at, item.channel, item.action, item.result])} />}
    </SoftBox></Card>
    <Modal open={interactionOpen} onClose={() => setInteractionOpen(false)}><SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "90%", md: 480 }, bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 3 }}><SoftTypography variant="h6" fontWeight="bold" mb={2}>Ghi nhận tương tác</SoftTypography><SoftTypography variant="caption">Kênh tương tác</SoftTypography><FormControl fullWidth size="small"><Select value={interaction.channel} onChange={(e) => setInteraction((value) => ({ ...value, channel: e.target.value }))}><MenuItem value="Zalo">Zalo</MenuItem><MenuItem value="Điện thoại">Điện thoại</MenuItem><MenuItem value="Email">Email</MenuItem><MenuItem value="SMS">SMS</MenuItem><MenuItem value="Trực tiếp">Trực tiếp</MenuItem></Select></FormControl><SoftBox mt={2}><SoftTypography variant="caption">Nội dung *</SoftTypography><SoftInput value={interaction.action} onChange={(e) => setInteraction((value) => ({ ...value, action: e.target.value }))} fullWidth /></SoftBox><SoftBox mt={2}><SoftTypography variant="caption">Kết quả</SoftTypography><SoftInput value={interaction.result} onChange={(e) => setInteraction((value) => ({ ...value, result: e.target.value }))} fullWidth /></SoftBox><SoftBox display="flex" gap={1} mt={3}><SoftButton variant="outlined" color="secondary" fullWidth onClick={() => setInteractionOpen(false)}>Hủy</SoftButton><SoftButton variant="gradient" color="info" fullWidth disabled={savingInteraction} onClick={saveInteraction}>{savingInteraction ? "Đang lưu..." : "Lưu tương tác"}</SoftButton></SoftBox></SoftBox></Modal></>}
  </SoftBox></Modal>;
}

function DataTable({ headers, rows }) { return <SoftBox sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#F8F9FA" }}>{headers.map((item) => <th key={item} style={{ padding: 10, textAlign: "left", fontSize: 12, color: "#6B7280" }}>{item}</th>)}</tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={headers.length} style={{ textAlign: "center", padding: 24, color: "#9E9E9E" }}>Chưa có dữ liệu</td></tr>}{rows.map((row, index) => <tr key={index} style={{ borderBottom: "1px solid #eee" }}>{row.map((cell, cellIndex) => <td key={cellIndex} style={{ padding: 10, fontSize: 13 }}>{cell}</td>)}</tr>)}</tbody></table></SoftBox>; }

export default function KhachHang() {
  const [customers, setCustomers] = useState([]); const [summary, setSummary] = useState({}); const [search, setSearch] = useState(""); const [debouncedSearch, setDebouncedSearch] = useState(""); const [segment, setSegment] = useState(""); const [source, setSource] = useState(""); const [zalo, setZalo] = useState(""); const [debtWarning, setDebtWarning] = useState(false); const [page, setPage] = useState(1); const [meta, setMeta] = useState({ totalPages: 1, totalItems: 0 }); const [loading, setLoading] = useState(true); const [formOpen, setFormOpen] = useState(false); const [selected, setSelected] = useState(null); const [detailId, setDetailId] = useState(null);
  useEffect(() => { const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400); return () => clearTimeout(timer); }, [search]);
  useEffect(() => setPage(1), [debouncedSearch, segment, source, zalo, debtWarning]);
  const load = () => {
    setLoading(true);
    Promise.all([CustomerService.getAll({ search: debouncedSearch || undefined, segment: segment || undefined, source: source || undefined, zaloConnected: zalo || undefined, debtWarning: debtWarning ? "true" : undefined, page, limit: 20 }), CustomerService.getSummary()])
      .then(([listResponse, summaryResponse]) => { setCustomers(Array.isArray(listResponse.data?.data) ? listResponse.data.data : []); setMeta(listResponse.data?.meta || { totalPages: 1, totalItems: 0 }); setSummary(summaryResponse.data?.data || {}); })
      .catch((error) => { setCustomers([]); toast.error(error.response?.data?.message || "Không thể tải danh sách khách hàng"); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, debouncedSearch, segment, source, zalo, debtWarning]);
  return <DashboardLayout><DashboardNavbar /><SoftBox py={3}>
    <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">{[["Tổng khách hàng", summary.totalCustomers || 0, "groups", "#1565C0"], ["Đã kết bạn Zalo", summary.zaloConnected || 0, "chat", "#2E7D32"], ["Khách lead", summary.leads || 0, "person_add", "#7B1FA2"], ["Cảnh báo công nợ", summary.debtWarnings || 0, "warning", "#C62828"]].map(([label, value, icon, color]) => <Card key={label} sx={{ flex: 1, minWidth: 180 }}><SoftBox p={2.5} display="flex" gap={2} alignItems="center"><Icon sx={{ color }}>{icon}</Icon><SoftBox><SoftTypography variant="caption">{label}</SoftTypography><SoftTypography variant="h5" fontWeight="bold" sx={{ color }}>{value}</SoftTypography></SoftBox></SoftBox></Card>)}</SoftBox>
    <Card><SoftBox p={3}><SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3}><SoftBox><SoftTypography variant="h5" fontWeight="bold">Quản lý khách hàng</SoftTypography><SoftTypography variant="caption" color="text">Hồ sơ 360°, công nợ, hóa đơn và tương tác</SoftTypography></SoftBox><SoftButton color="info" variant="gradient" startIcon={<Icon>person_add</Icon>} onClick={() => { setSelected(null); setFormOpen(true); }}>Thêm khách hàng</SoftButton></SoftBox>
      <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap"><SoftBox sx={{ flex: 1, minWidth: 230 }}><SoftInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã, tên, số điện thoại..." icon={{ component: "search", direction: "left" }} /></SoftBox><FormControl size="small" sx={{ minWidth: 150 }}><Select displayEmpty value={segment} onChange={(e) => setSegment(e.target.value)}><MenuItem value="">Mọi phân loại</MenuItem>{CUSTOMER_SEGMENTS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</Select></FormControl><FormControl size="small" sx={{ minWidth: 150 }}><Select displayEmpty value={source} onChange={(e) => setSource(e.target.value)}><MenuItem value="">Mọi nguồn</MenuItem><MenuItem value="LEAD">Khách lead</MenuItem><MenuItem value="LEGACY">Hệ thống cũ</MenuItem><MenuItem value="NEW">Khách mới</MenuItem></Select></FormControl><FormControl size="small" sx={{ minWidth: 150 }}><Select displayEmpty value={zalo} onChange={(e) => setZalo(e.target.value)}><MenuItem value="">Mọi trạng thái Zalo</MenuItem><MenuItem value="true">Đã kết bạn Zalo</MenuItem><MenuItem value="false">Chưa kết bạn</MenuItem></Select></FormControl><SoftButton size="small" variant={debtWarning ? "gradient" : "outlined"} color="error" onClick={() => setDebtWarning((value) => !value)}>Cảnh báo công nợ</SoftButton></SoftBox>
      <SoftBox sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ background: "#F8F9FA" }}>{["Khách hàng", "Liên hệ", "Nguồn", "Phân loại", "Zalo", "Công nợ / Hạn mức", "Ngày tạo", ""].map((item, index) => <th key={`${item}-${index}`} style={{ padding: 10, textAlign: "left", fontSize: 12, color: "#6B7280" }}>{item}</th>)}</tr></thead><tbody>{loading && <tr><td colSpan={8} style={{ padding: 30, textAlign: "center" }}>Đang tải...</td></tr>}{!loading && customers.length === 0 && <tr><td colSpan={8} style={{ padding: 30, textAlign: "center", color: "#9E9E9E" }}>Không tìm thấy khách hàng</td></tr>}{!loading && customers.map((item) => { const warning = item.debtLimit > 0 && item.debt >= item.debtLimit; return <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}><td style={{ padding: 10 }}><SoftTypography variant="button" fontWeight="bold">{item.name}</SoftTypography><SoftTypography variant="caption" display="block" color="text">{item.code}</SoftTypography></td><td style={{ padding: 10, fontSize: 13 }}>{item.phone}<br /><span style={{ color: "#6B7280" }}>{item.email || "—"}</span></td><td style={{ padding: 10 }}>{badge(item.source === "LEGACY" ? "Hệ thống cũ" : item.source === "LEAD" ? "Lead" : "Khách mới", "#1565C0", "#E3F2FD")}</td><td style={{ padding: 10 }}>{badge(item.segment, "#6A1B9A", "#F3E5F5")}</td><td style={{ padding: 10 }}>{item.zaloConnected ? badge("Đã kết bạn", "#2E7D32", "#E8F5E9") : badge("Chưa kết bạn", "#6B7280", "#F3F4F6")}</td><td style={{ padding: 10, fontSize: 13, color: warning ? "#C62828" : "inherit", fontWeight: warning ? 700 : 400 }}>{money(item.debt)}<br /><span style={{ fontSize: 11, color: "#6B7280" }}>/ {money(item.debtLimit)}</span>{warning && <Icon sx={{ fontSize: 16, ml: 0.5 }}>warning</Icon>}</td><td style={{ padding: 10, fontSize: 13 }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString("vi-VN") : "—"}</td><td style={{ padding: 10 }}><Tooltip title="Xem hồ sơ 360°"><IconButton onClick={() => setDetailId(item.id)}><Icon color="info">visibility</Icon></IconButton></Tooltip><Tooltip title="Chỉnh sửa"><IconButton onClick={() => { setSelected(item); setFormOpen(true); }}><Icon color="info">edit</Icon></IconButton></Tooltip></td></tr>; })}</tbody></table></SoftBox>
      {meta.totalPages > 1 && <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center"><SoftTypography variant="caption" color="text">Tổng {meta.totalItems} khách hàng</SoftTypography><Pagination page={page} count={meta.totalPages} color="primary" onChange={(_, value) => setPage(value)} /></SoftBox>}
    </SoftBox></Card>
  </SoftBox><CustomerForm open={formOpen} customer={selected} onClose={() => setFormOpen(false)} onSaved={load} /><CustomerDetail customerId={detailId} open={Boolean(detailId)} onClose={() => setDetailId(null)} onEdit={(customer) => { setDetailId(null); setSelected(customer); setFormOpen(true); }} /></DashboardLayout>;
}
