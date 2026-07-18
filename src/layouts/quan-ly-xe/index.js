import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Modal from "@mui/material/Modal";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import { TruckService, MOCK_PRODUCTS, MOCK_TRUCKS, MOCK_TRUCK_RETURNS } from "services/warehouseService";
import { toast } from "react-toastify";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

// ─── ADD/EDIT TRUCK MODAL ───────────────────────────────────────────────────────
function TruckModal({ open, onClose, truck, onSaved }) {
  const [form, setForm] = useState({ code: "", name: "", licensePlate: "", driver: "", phone: "", status: "active" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (truck) setForm({ code: truck.code, name: truck.name, licensePlate: truck.licensePlate, driver: truck.driver, phone: truck.phone, status: truck.status });
    else setForm({ code: "", name: "", licensePlate: "", driver: "", phone: "", status: "active" });
  }, [truck, open]);

  const handleSubmit = async () => {
    if (!form.name || !form.licensePlate) { toast.error("Điền đủ thông tin xe"); return; }
    try {
      setLoading(true);
      if (truck?.id) await TruckService.update(truck.id, form);
      else await TruckService.create(form);
      toast.success(truck?.id ? "Cập nhật xe thành công" : "Thêm xe thành công");
      onSaved(); onClose();
    } catch { toast.error("Lỗi xảy ra"); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "90%", md: 480 }, bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4 }}>
        <SoftTypography variant="h5" fontWeight="bold" mb={3}>{truck?.id ? "Chỉnh sửa xe" : "Thêm xe tải mới"}</SoftTypography>
        <Grid container spacing={2}>
          <Grid item xs={6}><SoftTypography variant="caption" fontWeight="medium">Tên xe *</SoftTypography><SoftInput value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Xe tải 1" fullWidth /></Grid>
          <Grid item xs={6}><SoftTypography variant="caption" fontWeight="medium">Mã xe</SoftTypography><SoftInput value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="T01" fullWidth /></Grid>
          <Grid item xs={6}><SoftTypography variant="caption" fontWeight="medium">Biển số *</SoftTypography><SoftInput value={form.licensePlate} onChange={(e) => setForm(f => ({ ...f, licensePlate: e.target.value }))} placeholder="51C-12345" fullWidth /></Grid>
          <Grid item xs={6}><SoftTypography variant="caption" fontWeight="medium">Trạng thái</SoftTypography>
            <FormControl fullWidth size="small"><Select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))} sx={{ height: 40 }}>
              <MenuItem value="active">Hoạt động</MenuItem><MenuItem value="inactive">Ngừng hoạt động</MenuItem>
            </Select></FormControl>
          </Grid>
          <Grid item xs={6}><SoftTypography variant="caption" fontWeight="medium">Tài xế</SoftTypography><SoftInput value={form.driver} onChange={(e) => setForm(f => ({ ...f, driver: e.target.value }))} placeholder="Nguyễn Văn A" fullWidth /></Grid>
          <Grid item xs={6}><SoftTypography variant="caption" fontWeight="medium">Số điện thoại</SoftTypography><SoftInput value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901-..." fullWidth /></Grid>
        </Grid>
        <SoftBox display="flex" gap={2} mt={3}>
          <SoftButton variant="outlined" color="secondary" onClick={onClose} fullWidth>Hủy</SoftButton>
          <SoftButton variant="gradient" color="info" onClick={handleSubmit} disabled={loading} fullWidth>{loading ? "Đang lưu..." : "Lưu"}</SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

// ─── LOAD GOODS TO TRUCK MODAL ─────────────────────────────────────────────────
function LoadGoodsModal({ open, onClose, truck, onSaved }) {
  const [items, setItems] = useState([{ productId: "", qty: 1 }]);
  const [loading, setLoading] = useState(false);

  const handleItemChange = (idx, field, value) => setItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  const handleSubmit = async () => {
    if (items.some(i => !i.productId || !i.qty)) { toast.error("Điền đủ thông tin"); return; }
    try {
      setLoading(true);
      await TruckService.loadGoods(truck.id, items.map(i => ({ productId: Number(i.productId), qty: Number(i.qty) })));
      toast.success(`Xuất hàng lên ${truck.name} thành công!`);
      onSaved(); onClose(); setItems([{ productId: "", qty: 1 }]);
    } catch (e) { toast.error(e.message || "Lỗi"); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "90%", md: 580 }, maxHeight: "90vh", overflowY: "auto", bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4 }}>
        <SoftBox display="flex" alignItems="center" gap={1} mb={3}>
          <Icon sx={{ color: "#1565C0" }}>local_shipping</Icon>
          <SoftTypography variant="h5" fontWeight="bold">Xuất hàng lên {truck?.name}</SoftTypography>
        </SoftBox>
        <SoftTypography variant="caption" color="text" mb={2} display="block">Hàng sẽ được trừ khỏi kho và thêm vào xe</SoftTypography>
        {items.map((item, idx) => {
          const product = MOCK_PRODUCTS.find(p => p.id === Number(item.productId));
          return (
            <SoftBox key={idx} display="flex" gap={1} alignItems="center" mb={1.5}>
              <FormControl size="small" sx={{ flex: 2 }}>
                <Select value={item.productId} onChange={(e) => handleItemChange(idx, "productId", e.target.value)} displayEmpty sx={{ height: 40 }}>
                  <MenuItem value=""><em>Chọn sản phẩm</em></MenuItem>
                  {MOCK_PRODUCTS.filter(p => p.stock > 0).map(p => <MenuItem key={p.id} value={p.id}>{p.name} (kho: {p.stock} {p.unit})</MenuItem>)}
                </Select>
              </FormControl>
              <SoftBox sx={{ flex: 1 }}><SoftInput type="number" value={item.qty} onChange={(e) => handleItemChange(idx, "qty", e.target.value)} placeholder="Số lượng" /></SoftBox>
              <IconButton size="small" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}><Icon sx={{ color: "#EF4444" }}>remove_circle</Icon></IconButton>
            </SoftBox>
          );
        })}
        <SoftButton variant="text" color="info" startIcon={<Icon>add</Icon>} onClick={() => setItems(p => [...p, { productId: "", qty: 1 }])} sx={{ mb: 3 }}>Thêm dòng</SoftButton>
        <SoftBox display="flex" gap={2}>
          <SoftButton variant="outlined" color="secondary" onClick={onClose} fullWidth>Hủy</SoftButton>
          <SoftButton variant="gradient" color="info" onClick={handleSubmit} disabled={loading} fullWidth>{loading ? "Đang xử lý..." : "Xuất hàng lên xe"}</SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

// ─── RETURN GOODS FROM TRUCK MODAL ─────────────────────────────────────────────
function ReturnGoodsModal({ open, onClose, truck, onSaved }) {
  const [items, setItems] = useState([{ productId: "", qty: 1 }]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const truckInventory = truck?.inventory || [];

  const handleItemChange = (idx, field, value) => setItems(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  const handleSubmit = async () => {
    if (items.some(i => !i.productId || !i.qty)) { toast.error("Điền đủ thông tin"); return; }
    try {
      setLoading(true);
      await TruckService.returnGoods(truck.id, items.map(i => ({ productId: Number(i.productId), qty: Number(i.qty) })), note);
      toast.success(`Hoàn hàng từ ${truck.name} về kho thành công!`);
      onSaved(); onClose(); setItems([{ productId: "", qty: 1 }]); setNote("");
    } catch (e) { toast.error(e.message || "Lỗi"); } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "90%", md: 580 }, maxHeight: "90vh", overflowY: "auto", bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4 }}>
        <SoftBox display="flex" alignItems="center" gap={1} mb={1}>
          <Icon sx={{ color: "#E65100" }}>keyboard_return</Icon>
          <SoftTypography variant="h5" fontWeight="bold">Hoàn hàng từ {truck?.name} về kho</SoftTypography>
        </SoftBox>
        <SoftTypography variant="caption" color="text" mb={2} display="block">Hàng sẽ được trừ khỏi xe và nhập lại vào kho</SoftTypography>
        {items.map((item, idx) => (
          <SoftBox key={idx} display="flex" gap={1} alignItems="center" mb={1.5}>
            <FormControl size="small" sx={{ flex: 2 }}>
              <Select value={item.productId} onChange={(e) => handleItemChange(idx, "productId", e.target.value)} displayEmpty sx={{ height: 40 }}>
                <MenuItem value=""><em>Chọn hàng trên xe</em></MenuItem>
                {truckInventory.map(inv => {
                  const p = MOCK_PRODUCTS.find(pp => pp.id === inv.productId);
                  return p ? <MenuItem key={p.id} value={p.id}>{p.name} (xe: {inv.qty} {p.unit})</MenuItem> : null;
                })}
              </Select>
            </FormControl>
            <SoftBox sx={{ flex: 1 }}><SoftInput type="number" value={item.qty} onChange={(e) => handleItemChange(idx, "qty", e.target.value)} placeholder="Số lượng" /></SoftBox>
            <IconButton size="small" onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}><Icon sx={{ color: "#EF4444" }}>remove_circle</Icon></IconButton>
          </SoftBox>
        ))}
        <SoftButton variant="text" color="warning" startIcon={<Icon>add</Icon>} onClick={() => setItems(p => [...p, { productId: "", qty: 1 }])} sx={{ mb: 2 }}>Thêm dòng</SoftButton>
        <SoftTypography variant="caption" fontWeight="medium">Ghi chú</SoftTypography>
        <SoftInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do hoàn hàng..." fullWidth sx={{ mb: 3 }} />
        <SoftBox display="flex" gap={2}>
          <SoftButton variant="outlined" color="secondary" onClick={onClose} fullWidth>Hủy</SoftButton>
          <SoftButton variant="gradient" color="warning" onClick={handleSubmit} disabled={loading} fullWidth>{loading ? "Đang xử lý..." : "Hoàn hàng về kho"}</SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
function QuanLyXe() {
  const [trucks, setTrucks] = useState([]);
  const [tab, setTab] = useState(0);
  const [truckModal, setTruckModal] = useState(false);
  const [editTruck, setEditTruck] = useState(null);
  const [loadModal, setLoadModal] = useState(null);
  const [returnModal, setReturnModal] = useState(null);

  const load = () => TruckService.getAll().then(({ data }) => setTrucks(data));
  useEffect(() => { load(); }, []);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
          <SoftTypography variant="h5" fontWeight="bold">Quản lý Xe tải</SoftTypography>
          <SoftButton variant="gradient" color="info" startIcon={<Icon>add</Icon>} onClick={() => { setEditTruck(null); setTruckModal(true); }}>
            Thêm xe
          </SoftButton>
        </SoftBox>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="Danh sách xe" />
          <Tab label="Lịch sử hoàn hàng" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={3}>
            {trucks.map((truck) => {
              const totalItems = truck.inventory.reduce((s, i) => s + i.qty, 0);
              const totalValue = truck.inventory.reduce((s, i) => {
                const p = MOCK_PRODUCTS.find(pp => pp.id === i.productId);
                return s + (p ? p.costPrice * i.qty : 0);
              }, 0);
              return (
                <Grid item xs={12} md={6} lg={4} key={truck.id}>
                  <Card>
                    <SoftBox p={3}>
                      {/* Header */}
                      <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                        <SoftBox display="flex" alignItems="center" gap={1.5}>
                          <SoftBox sx={{ width: 48, height: 48, borderRadius: 2, background: truck.status === "active" ? "#E3F2FD" : "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon sx={{ color: truck.status === "active" ? "#1565C0" : "#9E9E9E", fontSize: 28 }}>local_shipping</Icon>
                          </SoftBox>
                          <SoftBox>
                            <SoftTypography variant="h6" fontWeight="bold">{truck.name}</SoftTypography>
                            <SoftTypography variant="caption" color="text">{truck.licensePlate}</SoftTypography>
                          </SoftBox>
                        </SoftBox>
                        <SoftBox>
                          <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: truck.status === "active" ? "#E8F5E9" : "#F5F5F5", color: truck.status === "active" ? "#388E3C" : "#9E9E9E" }}>
                            {truck.status === "active" ? "Hoạt động" : "Ngừng"}
                          </span>
                        </SoftBox>
                      </SoftBox>

                      {/* Info */}
                      <SoftBox sx={{ background: "#F8F9FA", borderRadius: 2, p: 1.5, mb: 2 }}>
                        <SoftTypography variant="caption" color="text" display="block">👤 {truck.driver} · 📞 {truck.phone}</SoftTypography>
                        <SoftBox display="flex" justifyContent="space-between" mt={1}>
                          <SoftTypography variant="caption" fontWeight="bold">{totalItems} sp trên xe</SoftTypography>
                          <SoftTypography variant="caption" fontWeight="bold" color="info">{fmtCurrency(totalValue)}</SoftTypography>
                        </SoftBox>
                      </SoftBox>

                      {/* Inventory preview */}
                      {truck.inventory.length > 0 && (
                        <SoftBox mb={2}>
                          {truck.inventory.slice(0, 3).map((inv) => {
                            const p = MOCK_PRODUCTS.find(pp => pp.id === inv.productId);
                            return p ? (
                              <SoftBox key={inv.productId} display="flex" justifyContent="space-between" py={0.5} sx={{ borderBottom: "1px solid #F0F0F0" }}>
                                <SoftTypography variant="caption">{p.name}</SoftTypography>
                                <SoftTypography variant="caption" fontWeight="bold">{inv.qty} {p.unit}</SoftTypography>
                              </SoftBox>
                            ) : null;
                          })}
                          {truck.inventory.length > 3 && <SoftTypography variant="caption" color="text">+{truck.inventory.length - 3} loại khác...</SoftTypography>}
                        </SoftBox>
                      )}

                      {/* Actions */}
                      <SoftBox display="flex" gap={1} flexWrap="wrap">
                        <Tooltip title="Xuất hàng lên xe">
                          <span>
                            <SoftButton size="small" variant="outlined" color="info" disabled={truck.status !== "active"} onClick={() => setLoadModal(truck)} startIcon={<Icon>upload</Icon>}>
                              Xuất lên xe
                            </SoftButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Hoàn hàng về kho">
                          <span>
                            <SoftButton size="small" variant="outlined" color="warning" disabled={truck.inventory.length === 0} onClick={() => setReturnModal(truck)} startIcon={<Icon>keyboard_return</Icon>}>
                              Hoàn về kho
                            </SoftButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Chỉnh sửa">
                          <IconButton size="small" onClick={() => { setEditTruck(truck); setTruckModal(true); }}>
                            <Icon sx={{ fontSize: 18, color: "#6B7280" }}>edit</Icon>
                          </IconButton>
                        </Tooltip>
                      </SoftBox>
                    </SoftBox>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {tab === 1 && (
          <Card>
            <SoftBox p={3}>
              <SoftTypography variant="h6" fontWeight="medium" mb={2}>Lịch sử hoàn hàng từ xe về kho</SoftTypography>
              <SoftBox sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8F9FA" }}>
                      {["Mã phiếu", "Ngày", "Xe", "Hàng hóa", "Ghi chú"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_TRUCK_RETURNS.map((r, idx) => {
                      const truck = trucks.find(t => t.id === r.truckId);
                      return (
                        <tr key={r.id} style={{ borderBottom: "1px solid #F0F0F0", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#E65100" }}>{r.code}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13 }}>{r.date}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13 }}>{truck?.name || "—"}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13 }}>
                            {r.items.map(item => {
                              const p = MOCK_PRODUCTS.find(pp => pp.id === item.productId);
                              return p ? `${p.name}: ${item.qty} ${p.unit}` : "—";
                            }).join(", ")}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B7280" }}>{r.note || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </SoftBox>
            </SoftBox>
          </Card>
        )}
      </SoftBox>

      <TruckModal open={truckModal} onClose={() => setTruckModal(false)} truck={editTruck} onSaved={load} />
      {loadModal && <LoadGoodsModal open={!!loadModal} onClose={() => setLoadModal(null)} truck={loadModal} onSaved={load} />}
      {returnModal && <ReturnGoodsModal open={!!returnModal} onClose={() => setReturnModal(null)} truck={returnModal} onSaved={load} />}
    </DashboardLayout>
  );
}

export default QuanLyXe;
