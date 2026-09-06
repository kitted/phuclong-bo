import { useCallback, useEffect, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import MobileLoadMore from "components/MobileLoadMore";
import EntityThumbnail from "components/EntityThumbnail";
import EmployeeService from "services/employeeService";
import { TruckService } from "services/warehouseService";
import {
  prepareWebsiteImportFile,
  WebsiteDataImportService,
  WebsiteOrderService,
} from "services/websiteAdminService";
import { mergeUniqueItems } from "utils/infiniteList";
import { downloadBlob } from "utils/excel";
import { toast } from "react-toastify";

const idOf = (value) => value?.id || value?._id || "";
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const modalSx = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: { xs: "95%", md: 760 },
  maxHeight: "92dvh",
  overflowY: "auto",
  bgcolor: "#fff",
  borderRadius: 3,
  boxShadow: 24,
  p: { xs: 2, md: 3 },
};
const statusLabel = {
  PENDING: "Mới",
  CONFIRMED: "Đã xác nhận",
  ASSIGNED: "Đã giao sale",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

function ConvertModal({ order, employees, trucks, onClose, onSaved }) {
  const [form, setForm] = useState({
    sourceType: "warehouse",
    truck: null,
    salesperson: null,
    cash: 0,
    bank: 0,
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (order)
      setForm({
        sourceType: "warehouse",
        truck: null,
        salesperson: employees.find((e) => idOf(e) === order.assignedSaleId) || null,
        cash: order.paymentStatus === "PAID_SIMULATED" ? 0 : order.totalAmount || 0,
        bank: order.paymentStatus === "PAID_SIMULATED" ? order.totalAmount || 0 : 0,
      });
  }, [order, employees]);
  if (!order) return null;
  const convert = async () => {
    if (!form.salesperson || (form.sourceType === "truck" && !form.truck))
      return toast.error("Chọn sale và nguồn xuất hàng");
    const payments =
      order.paymentStatus === "PAID_SIMULATED"
        ? [
            {
              method: "BANK_TRANSFER",
              amount: Number(order.totalAmount),
              referenceCode: `VNPAY-SIM-${order.code}`,
            },
          ]
        : [];
    if (order.paymentStatus !== "PAID_SIMULATED" && Number(form.cash) > 0)
      payments.push({ method: "CASH", amount: Number(form.cash) });
    if (order.paymentStatus !== "PAID_SIMULATED" && Number(form.bank) > 0)
      payments.push({ method: "BANK_TRANSFER", amount: Number(form.bank) });
    try {
      setSaving(true);
      await WebsiteOrderService.convert(idOf(order), {
        sourceType: form.sourceType,
        truckId: form.sourceType === "truck" ? idOf(form.truck) : undefined,
        salespersonId: idOf(form.salesperson),
        payments,
        idempotencyKey: window.crypto?.randomUUID?.() || `web-${idOf(order)}-${Date.now()}`,
      });
      toast.success("Đã chuyển đơn website thành hóa đơn");
      onSaved();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể chuyển thành hóa đơn");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={Boolean(order)} onClose={onClose}>
      <SoftBox sx={modalSx}>
        <SoftBox display="flex" justifyContent="space-between">
          <SoftBox display="flex" alignItems="center" gap={1}>
            <EntityThumbnail entity={order} type="customer" size={42} />
            <SoftBox>
              <SoftTypography variant="h5" fontWeight="bold">
                Tạo hóa đơn từ {order.code}
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                {order.customerName} · {money(order.totalAmount)}
              </SoftTypography>
            </SoftBox>
          </SoftBox>
          <IconButton onClick={onClose}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
        <Grid container spacing={1.5} mt={1}>
          <Grid item xs={12} sm={6}>
            <SoftTypography variant="caption">Nguồn xuất hàng</SoftTypography>
            <SoftInput
              select
              value={form.sourceType}
              onChange={(e) => setForm({ ...form, sourceType: e.target.value, truck: null })}
            >
              <MenuItem value="warehouse">Kho chính</MenuItem>
              <MenuItem value="truck">Xe tải</MenuItem>
            </SoftInput>
          </Grid>
          <Grid item xs={12} sm={6}>
            <SoftTypography variant="caption">Nhân viên phụ trách *</SoftTypography>
            <Autocomplete
              options={employees}
              value={form.salesperson}
              onChange={(_, value) => setForm({ ...form, salesperson: value })}
              getOptionLabel={(x) => `${x.employeeCode || ""} · ${x.fullName || x.username || ""}`}
              renderInput={(params) => <TextField {...params} />}
            />
          </Grid>
          {form.sourceType === "truck" && (
            <Grid item xs={12}>
              <SoftTypography variant="caption">Xe xuất hàng *</SoftTypography>
              <Autocomplete
                options={trucks}
                value={form.truck}
                onChange={(_, value) => setForm({ ...form, truck: value })}
                getOptionLabel={(x) =>
                  `${x.code || ""} · ${x.name || ""} · ${x.licensePlate || ""}`
                }
                renderInput={(params) => <TextField {...params} />}
              />
            </Grid>
          )}
          <Grid item xs={6}>
            <SoftTypography variant="caption">Tiền mặt</SoftTypography>
            <SoftInput
              disabled={order.paymentStatus === "PAID_SIMULATED"}
              type="number"
              value={form.cash}
              onChange={(e) => setForm({ ...form, cash: e.target.value })}
            />
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption">Chuyển khoản</SoftTypography>
            <SoftInput
              disabled={order.paymentStatus === "PAID_SIMULATED"}
              type="number"
              value={form.bank}
              onChange={(e) => setForm({ ...form, bank: e.target.value })}
            />
          </Grid>
        </Grid>
        <SoftBox mt={2} p={1.5} bgcolor="#fff8e1" borderRadius={2}>
          <SoftTypography variant="caption" sx={{ color: "#e65100" }}>
            Backend sẽ kiểm tra lại tồn, khách hàng, thanh toán và idempotency trong transaction.
            Không bấm lại khi đang xử lý.
          </SoftTypography>
        </SoftBox>
        <SoftButton
          fullWidth
          color="success"
          variant="gradient"
          sx={{ mt: 2 }}
          disabled={saving}
          onClick={convert}
        >
          {saving ? "Đang tạo hóa đơn..." : "Xác nhận chuyển thành hóa đơn"}
        </SoftButton>
      </SoftBox>
    </Modal>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [convertOrder, setConvertOrder] = useState(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setPage(1);
    setOrders([]);
  }, [debounced, status]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await WebsiteOrderService.getAll({
        search: debounced || undefined,
        status: status || undefined,
        page,
        limit: 20,
      });
      setOrders((current) => (page === 1 ? listOf(r) : mergeUniqueItems(current, listOf(r))));
      setMeta(r.data?.meta || { totalPages: 1 });
    } catch (e) {
      toast.error(e.response?.data?.message || "Không thể tải đơn website");
    } finally {
      setLoading(false);
    }
  }, [debounced, page, status]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    let active = true;
    Promise.allSettled([
      EmployeeService.getAll({ role: "staff", status: "ACTIVE", page: 1, limit: 100 }),
      TruckService.getAll({ status: "active", page: 1, limit: 100 }),
    ]).then(([employeeResult, truckResult]) => {
      if (!active) return;
      setEmployees(employeeResult.status === "fulfilled" ? listOf(employeeResult.value) : []);
      setTrucks(truckResult.status === "fulfilled" ? listOf(truckResult.value) : []);
      if (employeeResult.status === "rejected" || truckResult.status === "rejected")
        toast.error("Không thể tải danh sách nhân viên hoặc xe. Kiểm tra kết nối backend.");
    });
    return () => {
      active = false;
    };
  }, []);
  const assign = async (order, employee) => {
    if (!employee) return;
    try {
      await WebsiteOrderService.assign(idOf(order), idOf(employee));
      toast.success("Đã giao đơn cho sale");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Không thể giao đơn");
    }
  };
  return (
    <SoftBox>
      <SoftBox display="flex" gap={1} mb={2} flexWrap="wrap">
        <SoftBox flex={1} minWidth={220}>
          <SoftInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, tên hoặc số điện thoại..."
            icon={{ component: "search", direction: "left" }}
          />
        </SoftBox>
        <SoftInput
          select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">Mọi trạng thái</MenuItem>
          {Object.entries(statusLabel).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </SoftInput>
      </SoftBox>
      <Grid container spacing={1.5}>
        {orders.map((order) => (
          <Grid item xs={12} lg={6} key={idOf(order)}>
            <SoftBox p={1.75} borderRadius={2.5} sx={{ border: "1px solid #e0e6ef" }}>
              <SoftBox display="flex" justifyContent="space-between" gap={1}>
                <SoftBox display="flex" alignItems="center" gap={1} minWidth={0}>
                  <EntityThumbnail entity={order} type="customer" size={42} />
                  <SoftBox minWidth={0}>
                    <SoftTypography variant="button" fontWeight="bold">
                      {order.code} · {order.customerName}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text" display="block">
                      {order.customerPhone} · {statusLabel[order.status] || order.status}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
                <SoftTypography variant="button" fontWeight="bold" color="info">
                  {money(order.totalAmount)}
                </SoftTypography>
              </SoftBox>
              <SoftTypography variant="caption" display="block" mt={1}>
                {order.deliveryAddress}
              </SoftTypography>
              <SoftBox mt={1} p={1} bgcolor="#f7f9fc" borderRadius={1.5}>
                {(order.items || []).map((item) => (
                  <SoftBox
                    key={item.productId || item.websiteProductId}
                    display="flex"
                    alignItems="center"
                    gap={0.75}
                    py={0.35}
                  >
                    <EntityThumbnail entity={item} size={34} />
                    <SoftTypography variant="caption">
                      {item.productName} × {item.quantity} = {money(item.lineTotal)}
                    </SoftTypography>
                  </SoftBox>
                ))}
              </SoftBox>
              <SoftBox mt={1.25} display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <SoftBox minWidth={210} flex={1}>
                  <Autocomplete
                    size="small"
                    options={employees}
                    value={employees.find((e) => idOf(e) === order.assignedSaleId) || null}
                    onChange={(_, value) => assign(order, value)}
                    getOptionLabel={(x) =>
                      `${x.employeeCode || ""} · ${x.fullName || x.username || ""}`
                    }
                    renderInput={(params) => <TextField {...params} placeholder="Giao cho sale" />}
                  />
                </SoftBox>
                {!order.invoiceId && order.status !== "CANCELLED" && (
                  <SoftButton size="small" color="success" onClick={() => setConvertOrder(order)}>
                    Tạo hóa đơn
                  </SoftButton>
                )}
                {order.invoiceCode && (
                  <SoftTypography variant="caption" color="success" fontWeight="bold">
                    {order.invoiceCode}
                  </SoftTypography>
                )}
              </SoftBox>
            </SoftBox>
          </Grid>
        ))}
      </Grid>
      <MobileLoadMore
        loading={loading}
        hasMore={page < Number(meta.totalPages || 1)}
        onLoadMore={() => setPage((value) => value + 1)}
      />
      <ConvertModal
        order={convertOrder}
        employees={employees}
        trucks={trucks}
        onClose={() => setConvertOrder(null)}
        onSaved={() => {
          setConvertOrder(null);
          load();
        }}
      />
    </SoftBox>
  );
}

function WebsiteImportTab() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const labels = {
    productCategories: "Danh mục sản phẩm",
    products: "Sản phẩm",
    contentCategories: "Danh mục nội dung",
    contents: "Nội dung",
    settings: "Cấu hình",
    errors: "Lỗi",
  };
  const choose = async (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    if (selected.reduce((total, item) => total + item.size, 0) > 15 * 1024 * 1024)
      return toast.error("Tổng dung lượng file không được vượt quá 15 MB");
    setFile(null);
    setSourceFiles(selected);
    setPreview(null);
    setPreviewing(true);
    try {
      const preparedFile = await prepareWebsiteImportFile(selected);
      if (preparedFile.size > 15 * 1024 * 1024) throw new Error("File sau khi ghép vượt quá 15 MB");
      setFile(preparedFile);
      setPreview(unwrap(await WebsiteDataImportService.preview(preparedFile)));
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Không thể kiểm tra file");
    } finally {
      setPreviewing(false);
    }
  };
  const template = async () => {
    try {
      const response = await WebsiteDataImportService.downloadTemplate();
      downloadBlob(response.data, "website-data-import.xlsx");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải file mẫu");
    }
  };
  const apply = async () => {
    if (!file || !preview?.canImport || !window.confirm("Import dữ liệu đã preview vào database?"))
      return;
    setImporting(true);
    try {
      const result = unwrap(await WebsiteDataImportService.apply(file));
      setPreview({
        canImport: true,
        summary: result?.summary || preview.summary,
        errors: [],
        imported: true,
      });
      toast.success("Đã import dữ liệu website");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể import dữ liệu");
    } finally {
      setImporting(false);
    }
  };
  return (
    <SoftBox>
      <input
        hidden
        multiple
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv,text/csv"
        onChange={choose}
      />
      <SoftBox
        p={{ xs: 1.5, md: 2.5 }}
        bgcolor="#f3f8ff"
        borderRadius={3}
        sx={{ border: "1px solid #bbdefb" }}
      >
        <SoftBox display="flex" justifyContent="space-between" gap={1} flexWrap="wrap">
          <SoftBox>
            <SoftTypography variant="h6" fontWeight="bold">
              Import dữ liệu website
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Hỗ trợ Excel tổng hợp, CSV tổng hợp có cột record_type hoặc bộ CSV tách riêng. Luôn
              preview trước khi ghi database.
            </SoftTypography>
          </SoftBox>
          <SoftButton variant="outlined" color="success" onClick={template}>
            <Icon>download</Icon>&nbsp;Tải file mẫu
          </SoftButton>
        </SoftBox>
        <SoftBox
          mt={2}
          p={3}
          textAlign="center"
          bgcolor="#fff"
          borderRadius={2.5}
          sx={{ border: "2px dashed #64b5f6" }}
        >
          <Icon sx={{ fontSize: 48, color: "#1976d2" }}>upload_file</Icon>
          <SoftTypography variant="button" fontWeight="bold" display="block">
            {sourceFiles.length
              ? `${sourceFiles.length} file đã chọn`
              : "Chọn .xlsx hoặc .csv, tối đa 15 MB"}
          </SoftTypography>
          {sourceFiles.map((item) => (
            <SoftTypography
              key={`${item.name}-${item.size}`}
              variant="caption"
              color="text"
              display="block"
            >
              {item.name} · {(item.size / 1024 / 1024).toFixed(2)} MB
            </SoftTypography>
          ))}
          <SoftButton
            color="info"
            variant="gradient"
            sx={{ mt: 1.5 }}
            disabled={previewing || importing}
            onClick={() => inputRef.current?.click()}
          >
            {previewing
              ? "Đang chuẩn bị và preview..."
              : sourceFiles.length
              ? "Chọn file khác"
              : "Chọn file Excel / CSV"}
          </SoftButton>
        </SoftBox>
        <SoftBox mt={1.5} p={1.25} bgcolor="#fff" borderRadius={2}>
          <SoftTypography variant="caption" color="text">
            <b>CSV tổng hợp:</b> chọn trực tiếp file có cột record_type như website-data-all.csv.{" "}
            <b>CSV tách riêng:</b> đặt tên Danh muc san pham, San pham, Danh muc noi dung, Noi dung
            hoặc Cau hinh và chọn cùng lúc.
          </SoftTypography>
        </SoftBox>
      </SoftBox>
      {preview && (
        <SoftBox mt={2}>
          <SoftBox
            p={1.5}
            display="flex"
            alignItems="center"
            gap={1}
            borderRadius={2}
            bgcolor={preview.canImport ? "#e8f5e9" : "#ffebee"}
          >
            <Icon sx={{ color: preview.canImport ? "#2e7d32" : "#c62828" }}>
              {preview.canImport ? "verified" : "error"}
            </Icon>
            <SoftTypography
              variant="button"
              fontWeight="bold"
              sx={{ color: preview.canImport ? "#2e7d32" : "#c62828" }}
            >
              {preview.imported
                ? "Đã import thành công"
                : preview.canImport
                ? "File hợp lệ, sẵn sàng import"
                : "File còn lỗi, chưa thể import"}
            </SoftTypography>
          </SoftBox>
          <Grid container spacing={1.25} mt={0.25}>
            {Object.entries(preview.summary || {}).map(([key, value]) => (
              <Grid item xs={6} md={4} lg={2} key={key}>
                <SoftBox p={1.5} bgcolor="#f7f9fc" borderRadius={2}>
                  <SoftTypography variant="caption" color="text">
                    {labels[key] || key}
                  </SoftTypography>
                  <SoftTypography
                    variant="h6"
                    fontWeight="bold"
                    color={key === "errors" && value ? "error" : "dark"}
                  >
                    {Number(value || 0).toLocaleString("vi-VN")}
                  </SoftTypography>
                </SoftBox>
              </Grid>
            ))}
          </Grid>
          {preview.errors?.map((error, index) => (
            <SoftBox
              key={`${error.sheet}-${error.row}-${index}`}
              mt={1}
              p={1.25}
              bgcolor="#fff5f5"
              borderRadius={1.5}
              sx={{ borderLeft: "4px solid #e53935" }}
            >
              <SoftTypography variant="button" fontWeight="bold">
                {error.sheet} · dòng {error.row}
                {error.field ? ` · ${error.field}` : ""}
              </SoftTypography>
              <SoftTypography variant="caption" color="error" display="block">
                {error.message}
              </SoftTypography>
            </SoftBox>
          ))}
          <SoftButton
            fullWidth
            color="success"
            variant="gradient"
            sx={{ mt: 2, minHeight: 52 }}
            disabled={!preview.canImport || importing || preview.imported}
            onClick={apply}
          >
            {importing ? "Đang import..." : preview.imported ? "Đã import" : "Import vào database"}
          </SoftButton>
        </SoftBox>
      )}
    </SoftBox>
  );
}

export default function WebsiteAdmin() {
  const [tab, setTab] = useState(0);
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox bgcolor="#fff" borderRadius={3} p={{ xs: 1.5, md: 3 }}>
          <SoftTypography variant="h4" fontWeight="bold">
            Đơn hàng & dữ liệu website
          </SoftTypography>
          <SoftTypography variant="button" color="text">
            Theo dõi đơn đặt hàng và import dữ liệu. Sản phẩm, bài viết được quản lý ở menu riêng.
          </SoftTypography>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            sx={{
              mb: 2,
              maxWidth: "100%",
              "& .MuiTabs-scroller": {
                overflowX: "auto !important",
                scrollbarWidth: "none",
                "&::-webkit-scrollbar": { display: "none" },
              },
              "& .MuiTabs-flexContainer": { width: "max-content", minWidth: "100%" },
              "& .MuiTab-root": {
                flex: { xs: "0 0 auto", md: "1 1 0" },
                minWidth: { xs: 150, md: 0 },
              },
            }}
          >
            <Tab label="Đơn đặt hàng" />
            <Tab label="Import Excel" />
          </Tabs>
          {tab === 0 ? <OrdersTab /> : <WebsiteImportTab />}
        </SoftBox>
      </SoftBox>
    </DashboardLayout>
  );
}
