import { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Modal from "@mui/material/Modal";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import { InvoiceService, MOCK_PRODUCTS, MOCK_TRUCKS } from "services/warehouseService";
import { toast } from "react-toastify";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

function HoaDon() {
  const [invoices, setInvoices] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [form, setForm] = useState({
    customer: "",
    sourceType: "warehouse", // "warehouse" | "truck"
    truckId: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [items, setItems] = useState([{ productId: "", qty: 1, price: 0 }]);

  const load = () => {
    setLoading(true);
    InvoiceService.getAll().then(({ data }) => { setInvoices([...data].reverse()); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const activeTrucks = MOCK_TRUCKS.filter((t) => t.status === "active");

  const getAvailableProducts = () => {
    if (form.sourceType === "warehouse") return MOCK_PRODUCTS;
    if (form.sourceType === "truck" && form.truckId) {
      const truck = MOCK_TRUCKS.find((t) => t.id === Number(form.truckId));
      if (!truck) return [];
      return truck.inventory.map((inv) => {
        const product = MOCK_PRODUCTS.find((p) => p.id === inv.productId);
        return product ? { ...product, stock: inv.qty } : null;
      }).filter(Boolean);
    }
    return [];
  };

  const handleAddItem = () => setItems((prev) => [...prev, { productId: "", qty: 1, price: 0 }]);
  const handleRemoveItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const handleItemChange = (idx, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      if (field === "productId") {
        const product = MOCK_PRODUCTS.find((p) => p.id === Number(value));
        if (product) updated[idx].price = product.sellPrice;
      }
      return updated;
    });
  };

  const totalAmount = items.reduce((sum, i) => sum + Number(i.qty) * Number(i.price), 0);

  const handleSubmit = async () => {
    if (!form.customer) { toast.error("Vui lòng nhập tên khách hàng"); return; }
    if (form.sourceType === "truck" && !form.truckId) { toast.error("Vui lòng chọn xe"); return; }
    if (items.some((i) => !i.productId || !i.qty)) { toast.error("Vui lòng điền đầy đủ thông tin"); return; }
    try {
      setSubmitting(true);
      await InvoiceService.create({
        ...form,
        truckId: form.truckId ? Number(form.truckId) : null,
        totalAmount,
        items: items.map((i) => ({ productId: Number(i.productId), qty: Number(i.qty), price: Number(i.price) })),
      });
      toast.success("Tạo hóa đơn thành công!");
      setModalOpen(false);
      setForm({ customer: "", sourceType: "warehouse", truckId: "", note: "", date: new Date().toISOString().split("T")[0] });
      setItems([{ productId: "", qty: 1, price: 0 }]);
      load();
    } catch (e) {
      toast.error("Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={3}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <SoftTypography variant="h5" fontWeight="bold">Hóa đơn bán hàng</SoftTypography>
              <SoftButton variant="gradient" color="success" startIcon={<Icon>add</Icon>} onClick={() => setModalOpen(true)}>
                Tạo hóa đơn
              </SoftButton>
            </SoftBox>

            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Mã HĐ", "Ngày", "Khách hàng", "Xuất từ", "Tổng tiền", "Ghi chú", "Chi tiết"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}>Đang tải...</td></tr>}
                  {!loading && invoices.map((inv, idx) => {
                    const truck = MOCK_TRUCKS.find((t) => t.id === inv.truckId);
                    return (
                      <tr key={inv.id} style={{ borderBottom: "1px solid #F0F0F0", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#3B82F6" }}>{inv.code}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{inv.date}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{inv.customer}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: inv.sourceType === "truck" ? "#E3F2FD" : "#E8F5E9",
                            color: inv.sourceType === "truck" ? "#1565C0" : "#2E7D32"
                          }}>
                            {inv.sourceType === "truck" ? `🚛 ${truck?.code || "Xe"}` : "🏭 Kho"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#388E3C" }}>{fmtCurrency(inv.totalAmount)}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B7280" }}>{inv.note || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <Tooltip title="Xem chi tiết">
                            <IconButton size="small" onClick={() => setDetailModal(inv)}>
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
          <SoftTypography variant="h5" fontWeight="bold" mb={3}>Tạo hóa đơn bán hàng</SoftTypography>

          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} md={6}>
              <SoftTypography variant="caption" fontWeight="medium">Khách hàng *</SoftTypography>
              <SoftInput value={form.customer} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} placeholder="Tên khách hàng..." fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <SoftTypography variant="caption" fontWeight="medium">Ngày</SoftTypography>
              <SoftInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} fullWidth />
            </Grid>

            {/* Source Type Selector */}
            <Grid item xs={12}>
              <SoftBox p={2} sx={{ background: "#F8F9FA", borderRadius: 2, border: "1px solid #E5E7EB" }}>
                <SoftTypography variant="caption" fontWeight="bold" display="block" mb={1}>
                  Xuất hàng từ *
                </SoftTypography>
                <RadioGroup row value={form.sourceType} onChange={(e) => setForm((f) => ({ ...f, sourceType: e.target.value, truckId: "" }))}>
                  <FormControlLabel value="warehouse" control={<Radio size="small" />} label={<SoftTypography variant="button">🏭 Kho hàng</SoftTypography>} />
                  <FormControlLabel value="truck" control={<Radio size="small" />} label={<SoftTypography variant="button">🚛 Xe tải</SoftTypography>} />
                </RadioGroup>
                {form.sourceType === "truck" && (
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <Select value={form.truckId} onChange={(e) => setForm((f) => ({ ...f, truckId: e.target.value }))} displayEmpty sx={{ height: 40 }}>
                      <MenuItem value=""><em>Chọn xe tải</em></MenuItem>
                      {activeTrucks.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name} – {t.licensePlate} ({t.driver})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </SoftBox>
            </Grid>

            <Grid item xs={12}>
              <SoftTypography variant="caption" fontWeight="medium">Ghi chú</SoftTypography>
              <SoftInput value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Ghi chú..." fullWidth />
            </Grid>
          </Grid>

          {/* Items */}
          <SoftTypography variant="button" fontWeight="bold" mb={1} display="block">Danh sách hàng hóa</SoftTypography>
          {(form.sourceType === "truck" && !form.truckId) && (
            <SoftTypography variant="caption" color="warning" mb={1} display="block">
              ⚠️ Vui lòng chọn xe để xem hàng có trên xe
            </SoftTypography>
          )}
          {items.map((item, idx) => {
            const availableProducts = getAvailableProducts();
            const selectedProduct = availableProducts.find((p) => p.id === Number(item.productId));
            return (
              <SoftBox key={idx} display="flex" gap={1} alignItems="center" mb={1.5}>
                <FormControl size="small" sx={{ flex: 2 }}>
                  <Select value={item.productId} onChange={(e) => handleItemChange(idx, "productId", e.target.value)} displayEmpty sx={{ height: 40 }}>
                    <MenuItem value=""><em>Chọn sản phẩm</em></MenuItem>
                    {availableProducts.map((p) => (
                      <MenuItem key={p.id} value={p.id}>{p.name} (còn: {p.stock} {p.unit})</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <SoftBox sx={{ flex: 1 }}>
                  <SoftInput type="number" value={item.qty} onChange={(e) => handleItemChange(idx, "qty", e.target.value)} placeholder="SL" />
                </SoftBox>
                <SoftBox sx={{ flex: 1 }}>
                  <SoftInput type="number" value={item.price} onChange={(e) => handleItemChange(idx, "price", e.target.value)} placeholder="Giá bán" />
                </SoftBox>
                <SoftBox sx={{ width: 90, textAlign: "right" }}>
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
            <SoftTypography variant="h6" fontWeight="bold">Tổng: {fmtCurrency(totalAmount)}</SoftTypography>
          </SoftBox>

          <SoftBox display="flex" gap={2}>
            <SoftButton variant="outlined" color="secondary" onClick={() => setModalOpen(false)} fullWidth>Hủy</SoftButton>
            <SoftButton variant="gradient" color="success" onClick={handleSubmit} disabled={submitting} fullWidth>
              {submitting ? "Đang lưu..." : "Xác nhận bán hàng"}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>

      {/* Detail Modal */}
      {detailModal && (
        <Modal open={!!detailModal} onClose={() => setDetailModal(null)}>
          <SoftBox sx={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: { xs: "90%", md: 520 }, bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4,
          }}>
            <SoftTypography variant="h5" fontWeight="bold" mb={1}>{detailModal.code}</SoftTypography>
            <SoftTypography variant="body2" color="text" mb={2}>
              {detailModal.date} · {detailModal.customer} · {detailModal.sourceType === "truck" ? `Xe ${MOCK_TRUCKS.find(t => t.id === detailModal.truckId)?.code}` : "Kho hàng"}
            </SoftTypography>
            {detailModal.items.map((item, i) => {
              const p = MOCK_PRODUCTS.find((pp) => pp.id === item.productId);
              return (
                <SoftBox key={i} display="flex" justifyContent="space-between" py={1} sx={{ borderBottom: "1px solid #f0f0f0" }}>
                  <SoftTypography variant="button">{p?.name || "—"}</SoftTypography>
                  <SoftTypography variant="caption">{item.qty} × {fmtCurrency(item.price)} = {fmtCurrency(item.qty * item.price)}</SoftTypography>
                </SoftBox>
              );
            })}
            <SoftBox display="flex" justifyContent="flex-end" mt={2} mb={3}>
              <SoftTypography variant="h6" fontWeight="bold">Tổng: {fmtCurrency(detailModal.totalAmount)}</SoftTypography>
            </SoftBox>
            <SoftButton variant="outlined" color="secondary" fullWidth onClick={() => setDetailModal(null)}>Đóng</SoftButton>
          </SoftBox>
        </Modal>
      )}
    </DashboardLayout>
  );
}

export default HoaDon;
