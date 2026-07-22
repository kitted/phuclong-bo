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
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";

import { ImportService, ProductService, SupplierService } from "services/warehouseService";
import { toast } from "react-toastify";

const fmtCurrency = (n) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n || 0);

const extractId = (field) => {
  if (!field) return "";
  if (typeof field === "object") return field.id || field._id || "";
  return String(field);
};
const listOf = (response) => {
  const value = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(value)) return value;
  return value?.items || value?.docs || [];
};
const numberText = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const moneyValue = (value) => Number(String(value || "").replace(/[^0-9]/g, "")) || 0;

function NhapKho() {
  const [imports, setImports] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // SỬA Ở ĐÂY: Thêm trường `code` vào state form mặc định
  const [form, setForm] = useState({
    code: "",
    supplierId: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [items, setItems] = useState([{ productId: "", qty: 1, price: 0 }]);

  const load = async () => {
    setLoading(true);
    try {
      const [impRes, prodRes, supRes] = await Promise.all([
        ImportService.getAll(),
        ProductService.getAll({ page: 1, limit: 100 }),
        SupplierService.getAll(),
      ]);

      const impData = listOf(impRes);
      setImports([...impData].reverse());

      setProducts(
        listOf(prodRes).sort((a, b) =>
          String(a.code || "").localeCompare(String(b.code || ""), "vi", { numeric: true })
        )
      );
      setSuppliers(listOf(supRes));
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAddItem = () => setItems((prev) => [...prev, { productId: "", qty: 1, price: 0 }]);

  const handleRemoveItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleItemChange = (idx, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };

      if (field === "productId") {
        const product = products.find((p) => (p.id || p._id) === value);
        if (product) updated[idx].price = product.costPrice || 0;
      }
      return updated;
    });
  };

  const totalAmount = items.reduce(
    (sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0),
    0
  );

  const handleSubmit = async () => {
    // SỬA Ở ĐÂY: Thêm điều kiện kiểm tra Mã phiếu
    if (!form.code.trim()) {
      toast.error("Vui lòng nhập mã phiếu");
      return;
    }
    if (!form.supplierId) {
      toast.error("Vui lòng chọn nhà cung cấp");
      return;
    }
    if (items.some((i) => !i.productId || !i.qty)) {
      toast.error("Vui lòng điền đầy đủ thông tin hàng hóa");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form, // Đã bao gồm form.code
        supplierId: form.supplierId,
        totalAmount,
        items: items.map((i) => ({
          productId: i.productId,
          qty: Number(i.qty) || 0,
          price: Number(i.price) || 0,
        })),
      };

      await ImportService.create(payload);
      toast.success("Tạo phiếu nhập thành công!");

      setModalOpen(false);
      // Reset form bao gồm cả `code`
      setForm({ code: "", supplierId: "", note: "", date: new Date().toISOString().split("T")[0] });
      setItems([{ productId: "", qty: 1, price: 0 }]);

      load();
    } catch (e) {
      console.error(e);
      // Nếu lỗi do trùng mã phiếu từ backend, hiện thông báo rõ ràng hơn
      toast.error(
        e.response?.data?.message ||
          "Có lỗi xảy ra khi tạo phiếu nhập (Kiểm tra lại mã phiếu có thể bị trùng)"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      completed: { label: "Hoàn thành", bg: "#E8F5E9", color: "#388E3C" },
      pending: { label: "Chờ duyệt", bg: "#FFF3E0", color: "#E65100" },
      cancelled: { label: "Đã hủy", bg: "#FFEBEE", color: "#D32F2F" },
    };
    const s = map[status] || { label: status || "Không rõ", bg: "#F5F5F5", color: "#9E9E9E" };
    return (
      <span
        style={{
          padding: "3px 10px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          background: s.bg,
          color: s.color,
        }}
      >
        {s.label}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={3}>
            <SoftBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={3}
              flexWrap="wrap"
              gap={2}
            >
              <SoftTypography variant="h5" fontWeight="bold">
                Quản lý Nhập kho
              </SoftTypography>
              <SoftButton
                variant="gradient"
                color="info"
                startIcon={<Icon>add</Icon>}
                onClick={() => setModalOpen(true)}
              >
                Tạo phiếu nhập
              </SoftButton>
            </SoftBox>

            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {[
                      "Mã phiếu",
                      "Ngày nhập",
                      "Nhà cung cấp",
                      "Tổng tiền",
                      "Trạng thái",
                      "Thao tác",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#6B7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}
                      >
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  )}
                  {!loading && imports.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ textAlign: "center", padding: 32, color: "#9E9E9E" }}
                      >
                        Chưa có phiếu nhập nào
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    imports.map((imp, idx) => {
                      let supplierName = "—";
                      if (imp.supplierId && imp.supplierId.name) {
                        supplierName = imp.supplierId.name;
                      } else {
                        const sId = extractId(imp.supplierId);
                        supplierName = suppliers.find((s) => (s.id || s._id) === sId)?.name || "—";
                      }

                      const impId = imp.id || imp._id;

                      return (
                        <tr
                          key={impId}
                          style={{
                            borderBottom: "1px solid #F0F0F0",
                            background: idx % 2 === 0 ? "#fff" : "#FAFAFA",
                          }}
                        >
                          <td
                            style={{
                              padding: "10px 12px",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#3B82F6",
                            }}
                          >
                            {imp.code}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: 13 }}>{imp.date}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13 }}>{supplierName}</td>
                          <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600 }}>
                            {fmtCurrency(imp.totalAmount)}
                          </td>
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

      {/* CREATE MODAL */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <SoftBox
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "95%", md: 700 },
            maxHeight: "90vh",
            overflowY: "auto",
            bgcolor: "background.paper",
            borderRadius: 3,
            boxShadow: 24,
            p: 4,
          }}
        >
          <SoftTypography variant="h5" fontWeight="bold" mb={3}>
            Tạo phiếu nhập kho
          </SoftTypography>

          <Grid container spacing={2} mb={2}>
            {/* SỬA Ở ĐÂY: Thêm ô nhập Mã Phiếu */}
            <Grid item xs={6} md={4}>
              <SoftTypography variant="caption" fontWeight="medium">
                Mã phiếu *
              </SoftTypography>
              <SoftInput
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="VD: PN001"
                fullWidth
                autoFocus
              />
            </Grid>

            <Grid item xs={6} md={4}>
              <SoftTypography variant="caption" fontWeight="medium">
                Nhà cung cấp *
              </SoftTypography>
              <FormControl fullWidth size="small">
                <Select
                  value={form.supplierId || ""}
                  onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))}
                  displayEmpty
                  sx={{ height: 40 }}
                >
                  <MenuItem value="">
                    <em>Chọn nhà cung cấp</em>
                  </MenuItem>
                  {suppliers.map((s) => (
                    <MenuItem key={s.id || s._id} value={s.id || s._id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={4}>
              <SoftTypography variant="caption" fontWeight="medium">
                Ngày nhập
              </SoftTypography>
              <SoftInput
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                fullWidth
              />
            </Grid>

            <Grid item xs={12}>
              <SoftTypography variant="caption" fontWeight="medium">
                Ghi chú
              </SoftTypography>
              <SoftInput
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Nhập lý do hoặc mã chứng từ gốc..."
                fullWidth
              />
            </Grid>
          </Grid>

          {/* Dòng Hàng Hóa */}
          <SoftTypography variant="button" fontWeight="bold" mb={1} display="block" mt={3}>
            Danh sách hàng hóa
          </SoftTypography>
          {items.map((item, idx) => {
            return (
              <SoftBox key={idx} display="flex" gap={1} alignItems="center" mb={1.5}>
                <SoftBox sx={{ flex: 2 }}>
                  <Autocomplete
                    options={products}
                    openOnFocus
                    autoHighlight
                    value={
                      products.find(
                        (product) => String(product.id || product._id) === String(item.productId)
                      ) || null
                    }
                    onChange={(_, product) =>
                      handleItemChange(idx, "productId", product?.id || product?._id || "")
                    }
                    getOptionLabel={(product) =>
                      `${product.code || ""} · ${product.name || ""} (${product.unit || ""})`
                    }
                    isOptionEqualToValue={(option, value) =>
                      String(option.id || option._id) === String(value.id || value._id)
                    }
                    noOptionsText="Không tìm thấy sản phẩm"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Tìm mã hoặc tên sản phẩm..."
                      />
                    )}
                  />
                </SoftBox>

                <SoftBox sx={{ flex: 1 }}>
                  <SoftInput
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                    placeholder="SL"
                  />
                </SoftBox>

                <SoftBox sx={{ flex: 1 }}>
                  <SoftInput
                    value={numberText(item.price)}
                    onChange={(e) => handleItemChange(idx, "price", moneyValue(e.target.value))}
                    inputProps={{ inputMode: "numeric" }}
                    placeholder="Giá nhập"
                  />
                </SoftBox>

                <SoftBox sx={{ width: 100, textAlign: "right" }}>
                  <SoftTypography variant="caption" fontWeight="bold">
                    {fmtCurrency((Number(item.qty) || 0) * (Number(item.price) || 0))}
                  </SoftTypography>
                </SoftBox>

                <IconButton
                  size="small"
                  onClick={() => handleRemoveItem(idx)}
                  disabled={items.length === 1}
                >
                  <Icon sx={{ color: items.length === 1 ? "#E0E0E0" : "#EF4444" }}>
                    remove_circle
                  </Icon>
                </IconButton>
              </SoftBox>
            );
          })}

          <SoftButton
            variant="text"
            color="info"
            startIcon={<Icon>add</Icon>}
            onClick={handleAddItem}
            sx={{ mb: 2 }}
          >
            Thêm dòng sản phẩm
          </SoftButton>

          <SoftBox
            display="flex"
            justifyContent="flex-end"
            mb={3}
            mt={2}
            pt={2}
            sx={{ borderTop: "1px dashed #E0E0E0" }}
          >
            <SoftTypography variant="h6" fontWeight="bold">
              Tổng cộng: {fmtCurrency(totalAmount)}
            </SoftTypography>
          </SoftBox>

          <SoftBox display="flex" gap={2}>
            <SoftButton
              variant="outlined"
              color="secondary"
              onClick={() => setModalOpen(false)}
              fullWidth
            >
              Hủy bỏ
            </SoftButton>
            <SoftButton
              variant="gradient"
              color="info"
              onClick={handleSubmit}
              disabled={submitting}
              fullWidth
            >
              {submitting ? "Đang lưu..." : "Xác nhận nhập kho"}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>

      {/* DETAILS MODAL */}
      {detailModal && (
        <Modal open={!!detailModal} onClose={() => setDetailModal(null)}>
          <SoftBox
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: { xs: "90%", md: 560 },
              bgcolor: "background.paper",
              borderRadius: 3,
              boxShadow: 24,
              p: 4,
            }}
          >
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <SoftTypography variant="h5" fontWeight="bold">
                Phiếu: {detailModal.code}
              </SoftTypography>
              {statusBadge(detailModal.status)}
            </SoftBox>

            <SoftBox mb={3} p={2} sx={{ background: "#F8F9FA", borderRadius: 2 }}>
              <SoftTypography variant="body2" color="text">
                <strong>Ngày nhập:</strong> {detailModal.date}
              </SoftTypography>
              <SoftTypography variant="body2" color="text">
                <strong>Nhà cung cấp:</strong>{" "}
                {detailModal.supplierId?.name ||
                  suppliers.find((s) => (s.id || s._id) === extractId(detailModal.supplierId))
                    ?.name ||
                  "—"}
              </SoftTypography>
              {detailModal.note && (
                <SoftTypography variant="body2" color="text">
                  <strong>Ghi chú:</strong> {detailModal.note}
                </SoftTypography>
              )}
            </SoftBox>

            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
              Chi tiết hàng hóa
            </SoftTypography>
            <SoftBox sx={{ maxHeight: 250, overflowY: "auto", pr: 1 }}>
              {(detailModal.items || []).map((item, i) => {
                let pName = "—";
                let pUnit = "";

                if (item.productId && item.productId.name) {
                  pName = item.productId.name;
                  pUnit = item.productId.unit || "";
                } else {
                  const pId = extractId(item.productId);
                  const pMatch = products.find((pp) => (pp.id || pp._id) === pId);
                  if (pMatch) {
                    pName = pMatch.name;
                    pUnit = pMatch.unit;
                  }
                }

                return (
                  <SoftBox
                    key={i}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={1.5}
                    sx={{ borderBottom: "1px solid #f0f0f0" }}
                  >
                    <SoftBox>
                      <SoftTypography variant="button" display="block">
                        {pName}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {item.qty} {pUnit} × {fmtCurrency(item.price)}
                      </SoftTypography>
                    </SoftBox>
                    <SoftTypography variant="button" fontWeight="bold">
                      {fmtCurrency(item.qty * item.price)}
                    </SoftTypography>
                  </SoftBox>
                );
              })}
            </SoftBox>

            <SoftBox display="flex" justifyContent="flex-end" mt={2} pt={2}>
              <SoftTypography variant="h5" fontWeight="bold" color="info">
                Tổng: {fmtCurrency(detailModal.totalAmount)}
              </SoftTypography>
            </SoftBox>

            <SoftBox mt={3}>
              <SoftButton
                variant="outlined"
                color="secondary"
                fullWidth
                onClick={() => setDetailModal(null)}
              >
                Đóng
              </SoftButton>
            </SoftBox>
          </SoftBox>
        </Modal>
      )}
    </DashboardLayout>
  );
}

export default NhapKho;
