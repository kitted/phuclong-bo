import { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Modal from "@mui/material/Modal";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";

import { ProductService, CategoryService, SupplierService, MOCK_UNITS } from "services/warehouseService";
import { toast } from "react-toastify";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);

const EMPTY_FORM = {
  name: "", code: "", categoryId: "", unit: "", costPrice: "", sellPrice: "", minStock: "", supplierId: "",
};

// Hàm hỗ trợ bóc tách ID chuỗi (tránh lỗi khi backend trả về Object do populate)
const extractId = (field) => {
  if (!field) return "";
  if (typeof field === "object") return field.id || field._id || "";
  return field;
};

// ----------------------------------------------------------------------
// COMPONENT: MODAL THÊM / SỬA SẢN PHẨM
// ----------------------------------------------------------------------
function ProductModal({ open, onClose, product, onSaved, categories }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  // Đồng bộ dữ liệu vào form khi mở Modal
  useEffect(() => {
    if (product) {
      setForm({
        ...product,
        // Dùng hàm extractId để luôn lấy được chuỗi ID, giúp MUI Select hoạt động đúng
        categoryId: extractId(product.categoryId || product.category),
        supplierId: extractId(product.supplierId || product.supplier),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [product, open]);

  // Load danh sách nhà cung cấp
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await SupplierService.getAll();
        const data = response?.data || response;
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (error) {
        setSuppliers([]);
      }
    };
    if (open) fetchSuppliers();
  }, [open]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name || !form.unit) { 
      toast.error("Vui lòng điền tên và đơn vị tính!"); 
      return; 
    }
    
    try {
      setLoading(true);
      const payload = {
        ...form,
        categoryId: form.categoryId || null, 
        supplierId: form.supplierId || null, 
        costPrice: Number(form.costPrice) || 0,
        sellPrice: Number(form.sellPrice) || 0,
        minStock: Number(form.minStock) || 0,
      };
      
      const productId = product?.id || product?._id;
      if (productId) {
        await ProductService.update(productId, payload);
        toast.success("Cập nhật thành công");
      } else {
        await ProductService.create(payload);
        toast.success("Thêm sản phẩm thành công");
      }
      
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Có lỗi xảy ra khi lưu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", md: 560 }, maxHeight: "90vh", overflowY: "auto",
          bgcolor: "background.paper", borderRadius: 3, boxShadow: 24, p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold" mb={3}>
          {product?.id || product?._id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
        </SoftTypography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <SoftTypography variant="caption" fontWeight="medium">Tên sản phẩm *</SoftTypography>
            <SoftInput name="name" value={form.name} onChange={handleChange} placeholder="Nhập tên sản phẩm" fullWidth />
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" fontWeight="medium">Mã sản phẩm</SoftTypography>
            <SoftInput name="code" value={form.code} onChange={handleChange} placeholder="VD: PLT-001" fullWidth />
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" fontWeight="medium">Đơn vị tính *</SoftTypography>
            <FormControl fullWidth size="small">
              <Select name="unit" value={form.unit || ""} onChange={handleChange} displayEmpty sx={{ height: 40 }}>
                <MenuItem value=""><em>Chọn đơn vị</em></MenuItem>
                {MOCK_UNITS.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" fontWeight="medium">Danh mục</SoftTypography>
            <FormControl fullWidth size="small">
              <Select name="categoryId" value={form.categoryId || ""} onChange={handleChange} displayEmpty sx={{ height: 40 }}>
                <MenuItem value=""><em>Chọn danh mục</em></MenuItem>
                {categories.map(c => <MenuItem key={c.id || c._id} value={c.id || c._id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" fontWeight="medium">Nhà cung cấp</SoftTypography>
            <FormControl fullWidth size="small">
              <Select name="supplierId" value={form.supplierId || ""} onChange={handleChange} displayEmpty sx={{ height: 40 }}>
                <MenuItem value=""><em>Chọn NCC</em></MenuItem>
                {suppliers.map(s => <MenuItem key={s.id || s._id} value={s.id || s._id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" fontWeight="medium">Giá nhập (VNĐ)</SoftTypography>
            <SoftInput name="costPrice" type="number" value={form.costPrice} onChange={handleChange} placeholder="0" fullWidth />
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" fontWeight="medium">Giá bán (VNĐ)</SoftTypography>
            <SoftInput name="sellPrice" type="number" value={form.sellPrice} onChange={handleChange} placeholder="0" fullWidth />
          </Grid>
          <Grid item xs={12}>
            <SoftTypography variant="caption" fontWeight="medium">Tồn tối thiểu</SoftTypography>
            <SoftInput name="minStock" type="number" value={form.minStock} onChange={handleChange} placeholder="0" fullWidth />
          </Grid>
        </Grid>
        <SoftBox display="flex" gap={2} mt={4}>
          <SoftButton variant="outlined" color="secondary" onClick={onClose} fullWidth>Hủy</SoftButton>
          <SoftButton variant="gradient" color="info" onClick={handleSubmit} disabled={loading} fullWidth>
            {loading ? "Đang lưu..." : (product?.id || product?._id) ? "Cập nhật" : "Thêm mới"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

// ----------------------------------------------------------------------
// COMPONENT: TRANG CHÍNH (QUẢN LÝ HÀNG HÓA)
// ----------------------------------------------------------------------
function HangHoa() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        ProductService.getAll(),
        CategoryService.getAll()
      ]);
      setProducts(prodRes?.data || prodRes || []);
      setCategories(catRes?.data || catRes || []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Xác nhận xóa sản phẩm này?")) return;
    try {
      await ProductService.delete(id);
      toast.success("Đã xóa sản phẩm");
      load();
    } catch (error) {
      toast.error("Lỗi khi xóa sản phẩm");
    }
  };

  // Lọc sản phẩm
  const filtered = products.filter((p) => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || 
                        p.code?.toLowerCase().includes(search.toLowerCase());
    
    const pCatId = extractId(p.categoryId || p.category);
    const matchCat = filterCategory ? pCatId === filterCategory : true; 
    
    return matchSearch && matchCat;
  });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={3}>
            {/* Header */}
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
              <SoftTypography variant="h5" fontWeight="bold">Quản lý Hàng hóa</SoftTypography>
              <SoftButton
                variant="gradient" color="info"
                startIcon={<Icon>add</Icon>}
                onClick={() => { setSelected(null); setModalOpen(true); }}
              >
                Thêm sản phẩm
              </SoftButton>
            </SoftBox>

            {/* Filters */}
            <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
              <SoftBox sx={{ flex: 1, minWidth: 200 }}>
                <SoftInput
                  placeholder="Tìm tên hoặc mã sản phẩm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select
                  value={filterCategory || ""}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  displayEmpty
                  sx={{ height: 40 }}
                >
                  <MenuItem value="">Tất cả danh mục</MenuItem>
                  {categories.map((c) => <MenuItem key={c.id || c._id} value={c.id || c._id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </SoftBox>

            {/* Table */}
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Mã SP", "Tên sản phẩm", "Danh mục", "Đơn vị", "Giá nhập", "Giá bán", "Tồn kho", "Trạng thái", "Thao tác"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}>Đang tải dữ liệu...</td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}>Không tìm thấy sản phẩm</td></tr>
                  )}
                  {!loading && filtered.map((p, idx) => {
                    // Ưu tiên hiển thị tên danh mục trực tiếp từ backend (nếu có populate), ngược lại thì tìm trong state categories
                    let catName = "—";
                    if (p.categoryId && p.categoryId.name) {
                      catName = p.categoryId.name;
                    } else {
                      const pCatId = extractId(p.categoryId || p.category);
                      catName = categories.find(c => (c.id || c._id) === pCatId)?.name || "—";
                    }
                    
                    const pId = p.id || p._id;
                    const isLow = (p.stock || 0) <= (p.minStock || 0);
                    
                    return (
                      <tr key={pId} style={{ borderBottom: "1px solid #F0F0F0", background: idx % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "#3B82F6" }}>{p.code}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{p.name}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, color: "#6B7280" }}>{catName}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{p.unit}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13 }}>{fmtCurrency(p.costPrice)}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>{fmtCurrency(p.sellPrice)}</td>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: isLow ? "#E65100" : "#388E3C" }}>
                          {p.stock || 0} {p.unit}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: isLow ? "#FFF3E0" : "#E8F5E9",
                            color: isLow ? "#E65100" : "#388E3C"
                          }}>
                            {isLow ? "Sắp hết" : "Còn hàng"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <SoftBox display="flex" gap={0.5}>
                            <Tooltip title="Chỉnh sửa">
                              <IconButton size="small" onClick={() => { setSelected(p); setModalOpen(true); }}>
                                <Icon sx={{ fontSize: 18, color: "#3B82F6" }}>edit</Icon>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa">
                              <IconButton size="small" onClick={() => handleDelete(pId)}>
                                <Icon sx={{ fontSize: 18, color: "#EF4444" }}>delete</Icon>
                              </IconButton>
                            </Tooltip>
                          </SoftBox>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </SoftBox>

            <SoftBox mt={2} display="flex" justifyContent="flex-end">
              <SoftTypography variant="caption" color="text">
                Hiển thị {filtered.length} / {products.length} sản phẩm
              </SoftTypography>
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>

      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={selected}
        onSaved={load}
        categories={categories} 
      />
    </DashboardLayout>
  );
}

export default HangHoa;