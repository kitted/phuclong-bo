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
import { SupplierService } from "services/warehouseService";
import { toast } from "react-toastify";


const EMPTY_FORM = { name: "", phone: "", address: "", email: "" };

function NhaCungCap() {
const [suppliers, setSuppliers] = useState([]);  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);

 
const load = async () => {
  try {
    const response = await SupplierService.getAll();
    
    // Tùy thuộc vào cấu trúc trả về của API, thường dữ liệu nằm trong response.data
    // Nếu API trả về mảng trực tiếp, response chính là mảng.
    const data = response?.data || response; 

    // Đảm bảo dữ liệu set vào state LUÔN LUÔN là một mảng
    setSuppliers(Array.isArray(data) ? data : []); 
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu nhà cung cấp:", error);
    setSuppliers([]); // Fallback về mảng rỗng nếu lỗi
  }
}; 
  useEffect(() => { load(); }, [reload]);

  useEffect(() => {
    if (selected) setForm({ name: selected.name, phone: selected.phone, address: selected.address, email: selected.email });
    else setForm(EMPTY_FORM);
  }, [selected, modalOpen]);

const handleSave = async () => {
    if (!form.name) { toast.error("Vui lòng nhập tên nhà cung cấp"); return; }
    
    setLoading(true);
    
    try {
      if (selected) {
        // Thêm await để đợi API update xong
        await SupplierService.update(selected.id, form);
        toast.success("Cập nhật thành công");
      } else {
        // Thêm await để đợi API create xong
        await SupplierService.create(form);
        toast.success("Thêm nhà cung cấp thành công");
      }
      
      setModalOpen(false);
      setReload(prev => prev + 1); // Trigger useEffect để gọi lại load()
      
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi lưu!");
    } finally {
      setLoading(false);
    }
  };

const handleDelete = async (id) => {
    if (!window.confirm("Xác nhận xóa nhà cung cấp này?")) return;
    
    try {
      // Thêm await để đợi API xóa xong
      await SupplierService.delete(id);
      toast.success("Đã xóa");
      
      setReload(prev => prev + 1); // Trigger useEffect để gọi lại load()
      
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi xóa!");
    }
  };
 
const filtered = (Array.isArray(suppliers) ? suppliers : []).filter(s =>
  s.name?.toLowerCase().includes(search.toLowerCase()) ||
  s.phone?.includes(search) ||
  s.email?.toLowerCase().includes(search.toLowerCase())
);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={3}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <SoftTypography variant="h5" fontWeight="bold">Nhà cung cấp</SoftTypography>
              <SoftButton variant="gradient" color="info" startIcon={<Icon>add</Icon>} onClick={() => { setSelected(null); setModalOpen(true); }}>
                Thêm NCC
              </SoftButton>
            </SoftBox>

            <SoftBox mb={3} sx={{ maxWidth: 400 }}>
              <SoftInput placeholder="Tìm nhà cung cấp..." value={search} onChange={(e) => setSearch(e.target.value)} icon={{ component: "search", direction: "left" }} />
            </SoftBox>

            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Tên nhà cung cấp", "Điện thoại", "Email", "Địa chỉ", "Thao tác"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}>Không tìm thấy</td></tr>}
                  {filtered.map((s, idx) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #F0F0F0", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13 }}>{s.phone}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#3B82F6" }}>{s.email}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B7280" }}>{s.address}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <SoftBox display="flex" gap={0.5}>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" onClick={() => { setSelected(s); setModalOpen(true); }}>
                              <Icon sx={{ fontSize: 18, color: "#3B82F6" }}>edit</Icon>
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton size="small" onClick={() => handleDelete(s.id)}>
                              <Icon sx={{ fontSize: 18, color: "#EF4444" }}>delete</Icon>
                            </IconButton>
                          </Tooltip>
                        </SoftBox>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "90%", md: 480 }, bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4 }}>
          <SoftTypography variant="h5" fontWeight="bold" mb={3}>{selected ? "Chỉnh sửa NCC" : "Thêm nhà cung cấp"}</SoftTypography>
          <Grid container spacing={2}>
            <Grid item xs={12}><SoftTypography variant="caption" fontWeight="medium">Tên *</SoftTypography><SoftInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên NCC" fullWidth /></Grid>
            <Grid item xs={6}><SoftTypography variant="caption" fontWeight="medium">Điện thoại</SoftTypography><SoftInput value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0901-..." fullWidth /></Grid>
            <Grid item xs={6}><SoftTypography variant="caption" fontWeight="medium">Email</SoftTypography><SoftInput value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@..." fullWidth /></Grid>
            <Grid item xs={12}><SoftTypography variant="caption" fontWeight="medium">Địa chỉ</SoftTypography><SoftInput value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Địa chỉ..." fullWidth /></Grid>
          </Grid>
          <SoftBox display="flex" gap={2} mt={3}>
            <SoftButton variant="outlined" color="secondary" onClick={() => setModalOpen(false)} fullWidth>Hủy</SoftButton>
            <SoftButton variant="gradient" color="info" onClick={handleSave} disabled={loading} fullWidth>{loading ? "Đang lưu..." : "Lưu"}</SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>
    </DashboardLayout>
  );
}

export default NhaCungCap;
