import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Modal from "@mui/material/Modal";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import { ImportService, MOCK_PRODUCTS, MOCK_SUPPLIERS } from "services/warehouseService";
import { toast } from "react-toastify";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function NhapKho() {
  const [imports, setImports] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({ supplierId: "", note: "", date: new Date().toISOString().split("T")[0] });
  const [items, setItems] = useState([{ productId: "", qty: 1, price: 0 }]);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    ImportService.getAll().then(({ data }) => { setImports([...data].reverse()); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const handleAddItem = () => setItems((prev) => [...prev, { productId: "", qty: 1, price: 0 }]);
  const handleRemoveItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const handleItemChange = (idx, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "productId") {
        const product = MOCK_PRODUCTS.find((p) => p.id === Number(value));
        if (product) updated[idx].price = product.costPrice;
      }
      return updated;
    });
  };

  const totalAmount = items.reduce((sum, i) => sum + Number(i.qty) * Number(i.price), 0);

  const handleSubmit = async () => {
    if (!form.supplierId) { toast.error("Vui lòng chọn nhà cung cấp"); return; }
    if (items.some((i) => !i.productId || !i.qty)) { toast.error("Vui lòng điền đầy đủ thông tin hàng hóa"); return; }
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        supplierId: Number(form.supplierId),
        totalAmount,
        items: items.map((i) => ({ productId: Number(i.productId), qty: Number(i.qty), price: Number(i.price) })),
      };
      await ImportService.create(payload);
      toast.success("Tạo phiếu nhập thành công!");
      setModalOpen(false);
      setForm({ supplierId: "", note: "", date: new Date().toISOString().split("T")[0] });
      setItems([{ productId: "", qty: 1, price: 0 }]);
      load();
    } catch (e) {
      toast.error("Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    const map = { completed: { label: "Hoàn thành", bg: "#E8F5E9", color: "#388E3C" }, pending: { label: "Chờ duyệt", bg: "#FFF3E0", color: "#E65100" } };
    const s = map[status] || { label: status, bg: "#F5F5F5", color: "#9E9E9E" };
    return <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={3}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <SoftTypography variant="h5" fontWeight="bold">Quản lý Nhập kho</SoftTypography>
              <SoftButton variant="gradient" color="info" startIcon={<Icon>add</Icon>} onClick={() => setModalOpen(true)}>
                Tạo phiếu nhập
              </SoftButton>
            </SoftBox>

            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Mã phiếu", "Ngày nhập", "Nhà cung cấp", "Tổng tiền", "Trạng thái", "Thao tác"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}>Đang tải...</td></tr>}
                  {!loading && imports.map((imp, idx) => {
                    const supplier = MOCK_SUPPLIERS.find((s) => s.id === imp.supplierId);
                    return (
                      <tr key={imp.id} style={{ borderBottom: "1px solid #F0F0F0", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#3B82F6" }}>{imp.code}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{imp.date}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{supplier?.name || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{fmtCurrency(imp.totalAmount)}</td>
                        <td style={{ padding: "10px 12px" }}>{statusBadge(imp.status)}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <Tooltip title="Xem chi tiết">
                            <IconButton size="small" onClick={() => setDetailModal(imp)}>
                              <Icon sx={{ fontSize: 18, color: "#3B82F6" }}>visibility</Icon>
                            </IconButton>
                          </Tooltip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>

      {/* Create Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <SoftBox sx={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: { xs: "95%", md: 700 }, maxHeight: "90vh", overflowY: "auto",
          bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4,
        }}>
          <SoftTypography variant="h5" fontWeight="bold" mb={3}>Tạo phiếu nhập kho</SoftTypography>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={6}>
              <SoftTypography variant="caption" fontWeight="medium">Nhà cung cấp *</SoftTypography>
              <FormControl fullWidth size="small">
                <Select value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} displayEmpty sx={{ height: 40 }}>
                  <MenuItem value=""><em>Chọn nhà cung cấp</em></MenuItem>
                  {MOCK_SUPPLIERS.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <SoftTypography variant="caption" fontWeight="medium">Ngày nhập</SoftTypography>
              <SoftInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <SoftTypography variant="caption" fontWeight="medium">Ghi chú</SoftTypography>
              <SoftInput value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Ghi chú..." fullWidth />
            </Grid>
          </Grid>

          {/* Items */}
          <SoftTypography variant="button" fontWeight="bold" mb={1} display="block">Danh sách hàng hóa</SoftTypography>
          {items.map((item, idx) => {
            const product = MOCK_PRODUCTS.find((p) => p.id === Number(item.productId));
            return (
              <SoftBox key={idx} display="flex" gap={1} alignItems="center" mb={1.5}>
                <FormControl size="small" sx={{ flex: 2 }}>
                  <Select value={item.productId} onChange={(e) => handleItemChange(idx, "productId", e.target.value)} displayEmpty sx={{ height: 40 }}>
                    <MenuItem value=""><em>Chọn sản phẩm</em></MenuItem>
                    {MOCK_PRODUCTS.map((p) => <MenuItem key={p.id} value={p.id}>{p.name} ({p.unit})</MenuItem>)}
                  </Select>
                </FormControl>
                <SoftBox sx={{ flex: 1 }}>
                  <SoftInput type="number" value={item.qty} onChange={(e) => handleItemChange(idx, "qty", e.target.value)} placeholder="SL" />
                </SoftBox>
                <SoftBox sx={{ flex: 1 }}>
                  <SoftInput type="number" value={item.price} onChange={(e) => handleItemChange(idx, "price", e.target.value)} placeholder="Giá" />
                </SoftBox>
                <SoftBox sx={{ width: 80, textAlign: "right" }}>
                  <SoftTypography variant="caption" fontWeight="bold">{fmtCurrency(item.qty * item.price)}</SoftTypography>
                </SoftBox>
                <IconButton size="small" onClick={() => handleRemoveItem(idx)} disabled={items.length === 1}>
                  <Icon sx={{ color: "#EF4444" }}>remove_circle</Icon>
                </IconButton>
              </SoftBox>
            );
          })}
          <SoftButton variant="text" color="info" startIcon={<Icon>add</Icon>} onClick={handleAddItem} sx={{ mb: 2 }}>
            Thêm dòng
          </SoftButton>

          <SoftBox display="flex" justifyContent="flex-end" mb={3}>
            <SoftTypography variant="h6" fontWeight="bold">Tổng cộng: {fmtCurrency(totalAmount)}</SoftTypography>
          </SoftBox>

          <SoftBox display="flex" gap={2}>
            <SoftButton variant="outlined" color="secondary" onClick={() => setModalOpen(false)} fullWidth>Hủy</SoftButton>
            <SoftButton variant="gradient" color="info" onClick={handleSubmit} disabled={submitting} fullWidth>
              {submitting ? "Đang lưu..." : "Xác nhận nhập kho"}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>

      {/* Detail Modal */}
      {detailModal && (
        <Modal open={!!detailModal} onClose={() => setDetailModal(null)}>
          <SoftBox sx={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: { xs: "90%", md: 560 }, bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4,
          }}>
            <SoftTypography variant="h5" fontWeight="bold" mb={1}>Chi tiết: {detailModal.code}</SoftTypography>
            <SoftTypography variant="body2" color="text" mb={2}>Ngày: {detailModal.date} · NCC: {MOCK_SUPPLIERS.find(s => s.id === detailModal.supplierId)?.name}</SoftTypography>
            {detailModal.items.map((item, i) => {
              const p = MOCK_PRODUCTS.find((pp) => pp.id === item.productId);
              return (
                <SoftBox key={i} display="flex" justifyContent="space-between" py={1} sx={{ borderBottom: "1px solid #f0f0f0" }}>
                  <SoftTypography variant="button">{p?.name || "—"}</SoftTypography>
                  <SoftTypography variant="caption">{item.qty} {p?.unit} × {fmtCurrency(item.price)}</SoftTypography>
                </SoftBox>
              );
            })}
            <SoftBox display="flex" justifyContent="flex-end" mt={2}>
              <SoftTypography variant="h6" fontWeight="bold">Tổng: {fmtCurrency(detailModal.totalAmount)}</SoftTypography>
            </SoftBox>
            <SoftBox mt={2}><SoftButton variant="outlined" color="secondary" fullWidth onClick={() => setDetailModal(null)}>Đóng</SoftButton></SoftBox>
          </SoftBox>
        </Modal>
      )}
    </DashboardLayout>
  );
}

export default NhapKho;
