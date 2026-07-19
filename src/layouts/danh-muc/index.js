import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Modal from "@mui/material/Modal";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
// Lưu ý: Đảm bảo bạn đã export CategoryService từ file warehouseService
import { CategoryService } from "services/warehouseService"; 
import { toast } from "react-toastify";

const EMPTY_FORM = { name: "" };

function DanhMuc() {
  const [categories, setCategories] = useState([]);  
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);

  const load = async () => {
    try {
      const response = await CategoryService.getAll();
      const data = response?.data || response; 
      setCategories(Array.isArray(data) ? data : []); 
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu danh mục:", error);
      setCategories([]); 
    }
  }; 

  useEffect(() => { load(); }, [reload]);

  useEffect(() => {
    if (selected) setForm({ name: selected.name });
    else setForm(EMPTY_FORM);
  }, [selected, modalOpen]);

  const handleSave = async () => {
    if (!form.name.trim()) { 
      toast.error("Vui lòng nhập tên danh mục"); 
      return; 
    }
    
    setLoading(true);
    
    try {
      if (selected) {
        await CategoryService.update(selected.id || selected._id, form);
        toast.success("Cập nhật thành công");
      } else {
        await CategoryService.create(form);
        toast.success("Thêm danh mục thành công");
      }
      
      setModalOpen(false);
      setReload(prev => prev + 1); 
      
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi lưu!");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xác nhận xóa danh mục này?")) return;
    
    try {
      await CategoryService.delete(id);
      toast.success("Đã xóa danh mục");
      
      setReload(prev => prev + 1); 
      
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi xóa!");
    }
  };
 
  const filtered = (Array.isArray(categories) ? categories : []).filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={3}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <SoftTypography variant="h5" fontWeight="bold">Quản lý Danh mục</SoftTypography>
              <SoftButton variant="gradient" color="info" startIcon={<Icon>add</Icon>} onClick={() => { setSelected(null); setModalOpen(true); }}>
                Thêm Danh mục
              </SoftButton>
            </SoftBox>

            <SoftBox mb={3} sx={{ maxWidth: 400 }}>
              <SoftInput 
                placeholder="Tìm tên danh mục..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                icon={{ component: "search", direction: "left" }} 
              />
            </SoftBox>

            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Tên danh mục", "Thao tác"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}>
                        Không tìm thấy dữ liệu
                      </td>
                    </tr>
                  )}
                  {filtered.map((c, idx) => (
                    <tr key={c.id || c._id} style={{ borderBottom: "1px solid #F0F0F0", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                      <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600, color: "#344767" }}>{c.name}</td>
                      <td style={{ padding: "10px 12px", width: "100px" }}>
                        <SoftBox display="flex" gap={0.5}>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton size="small" onClick={() => { setSelected(c); setModalOpen(true); }}>
                              <Icon sx={{ fontSize: 18, color: "#3B82F6" }}>edit</Icon>
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton size="small" onClick={() => handleDelete(c.id || c._id)}>
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
        <SoftBox sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: { xs: "90%", md: 400 }, bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4 }}>
          <SoftTypography variant="h5" fontWeight="bold" mb={3}>
            {selected ? "Chỉnh sửa Danh mục" : "Thêm Danh mục"}
          </SoftTypography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <SoftTypography variant="caption" fontWeight="medium">Tên danh mục *</SoftTypography>
              <SoftInput 
                value={form.name} 
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                placeholder="Ví dụ: Thiết bị điện tử..." 
                fullWidth 
                autoFocus
              />
            </Grid>
          </Grid>
          
          <SoftBox display="flex" gap={2} mt={4}>
            <SoftButton variant="outlined" color="secondary" onClick={() => setModalOpen(false)} fullWidth>
              Hủy
            </SoftButton>
            <SoftButton variant="gradient" color="info" onClick={handleSave} disabled={loading} fullWidth>
              {loading ? "Đang lưu..." : "Lưu danh mục"}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>
    </DashboardLayout>
  );
}

export default DanhMuc;