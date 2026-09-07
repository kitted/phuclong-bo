import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import EntityThumbnail from "components/EntityThumbnail";
import { ProductService, TruckService } from "services/warehouseService";
import WarrantyReturnService from "services/warrantyReturnService";
import { toast } from "react-toastify";

const SOURCE = {
  WAREHOUSE: "Kho chính",
  TRUCK: "Xe bán hàng",
};
const STATUS = {
  RECEIVED: { label: "Đã tiếp nhận", color: "#1565c0", bg: "#e3f2fd" },
  PROCESSING: { label: "Đang bảo hành", color: "#ef6c00", bg: "#fff3e0" },
  COMPLETED: { label: "Đã hoàn tất", color: "#2e7d32", bg: "#e8f5e9" },
  CANCELLED: { label: "Đã hủy", color: "#616161", bg: "#eeeeee" },
};
const RESOLUTION = {
  RETURN_TO_SOURCE: "Trả lại đúng nguồn ban đầu",
  RETURN_TO_WAREHOUSE: "Nhập về kho chính",
  DISPOSED: "Loại bỏ, không nhập lại tồn",
};
const emptyForm = {
  sourceType: "WAREHOUSE",
  sourceTruckId: "",
  customerName: "",
  customerPhone: "",
  supplierName: "",
  reason: "",
  note: "",
};
const idOf = (value) => String(value?.id || value?._id || "");
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const data = unwrap(response);
  return Array.isArray(data) ? data : data?.items || data?.docs || data?.rows || [];
};
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

function StatusBadge({ status }) {
  const value = STATUS[status] || STATUS.RECEIVED;
  return (
    <SoftBox
      component="span"
      px={1}
      py={0.45}
      borderRadius={2}
      sx={{ bgcolor: value.bg, color: value.color, fontSize: 12, fontWeight: 700 }}
    >
      {value.label}
    </SoftBox>
  );
}

function CreateWarrantyDialog({ open, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [products, setProducts] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [truck, setTruck] = useState(null);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm(emptyForm);
    setItems([]);
    setSearch("");
    setTruck(null);
    Promise.all([
      ProductService.getAll({ page: 1, limit: 100 }),
      TruckService.getAll({ page: 1, limit: 100 }),
    ])
      .then(([productResult, truckResult]) => {
        setProducts(listOf(productResult));
        setTrucks(listOf(truckResult));
      })
      .catch(() => toast.error("Không thể tải nguồn hàng"));
  }, [open]);

  useEffect(() => {
    if (!form.sourceTruckId) {
      setTruck(null);
      return;
    }
    TruckService.getById(form.sourceTruckId)
      .then((response) => setTruck(unwrap(response)))
      .catch(() => toast.error("Không thể tải tồn xe"));
  }, [form.sourceTruckId]);

  const available = useMemo(() => {
    if (form.sourceType === "WAREHOUSE") {
      return products.map((product) => ({
        ...product,
        availableQuantity: Number(product.stock || 0),
      }));
    }
    const inventory = truck?.inventory || truck?.items || [];
    return inventory.map((row) => {
      const product = row.product || row.productId || {};
      const productId =
        typeof row.productId === "object" ? idOf(row.productId) : String(row.productId || "");
      const fallback = products.find((item) => idOf(item) === productId) || {};
      return {
        ...fallback,
        ...(typeof product === "object" ? product : {}),
        id: productId,
        _id: productId,
        availableQuantity: Number(row.qty ?? row.quantity ?? 0),
      };
    });
  }, [form.sourceType, products, truck]);

  const choices = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return available
      .filter((product) => !items.some((item) => item.productId === idOf(product)))
      .filter(
        (product) =>
          !keyword ||
          `${product.code || ""} ${product.name || ""} ${product.barcode || ""}`
            .toLocaleLowerCase("vi")
            .includes(keyword)
      )
      .slice(0, 30);
  }, [available, items, search]);

  const changeSource = (sourceType) => {
    setForm((value) => ({ ...value, sourceType, sourceTruckId: "" }));
    setItems([]);
  };

  const addItem = (product) => {
    if (!product) return;
    if (Number(product.availableQuantity || 0) <= 0)
      return toast.error("Nguồn đã chọn không còn hàng này");
    setItems((value) => [
      ...value,
      {
        productId: idOf(product),
        product,
        quantity: 1,
        issue: "",
        serialNumber: "",
        note: "",
        availableQuantity: Number(product.availableQuantity || 0),
      },
    ]);
  };

  const updateItem = (index, key, value) =>
    setItems((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    );

  const validateItems = () => {
    if (!items.length) {
      toast.error("Hãy chọn ít nhất một mặt hàng bảo hành");
      return false;
    }
    for (const item of items) {
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.availableQuantity) {
        toast.error(`Kiểm tra lại số lượng ${item.product.name}`);
        return false;
      }
      if (!item.issue.trim()) {
        toast.error(`Hãy nhập tình trạng của ${item.product.name}`);
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && form.sourceType === "TRUCK" && !form.sourceTruckId)
      return toast.error("Hãy chọn xe đang giữ hàng bảo hành");
    if (step === 2 && !validateItems()) return;
    setStep((value) => Math.min(3, value + 1));
  };

  const save = async () => {
    if (form.sourceType === "TRUCK" && !form.sourceTruckId)
      return toast.error("Vui lòng chọn xe trả hàng bảo hành");
    if (!validateItems()) return;
    if (!form.reason.trim()) return toast.error("Vui lòng nhập lý do gửi bảo hành");
    setSaving(true);
    try {
      await WarrantyReturnService.create({
        ...form,
        sourceTruckId: form.sourceType === "TRUCK" ? form.sourceTruckId : undefined,
        customerName: form.customerName.trim() || undefined,
        customerPhone: form.customerPhone.trim() || undefined,
        supplierName: form.supplierName.trim() || undefined,
        reason: form.reason.trim(),
        note: form.note.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          issue: item.issue.trim(),
          serialNumber: item.serialNumber.trim() || undefined,
          note: item.note.trim() || undefined,
        })),
        idempotencyKey: window.crypto?.randomUUID?.() || `warranty-${Date.now()}-${Math.random()}`,
      });
      toast.success("Đã tạo phiếu hàng bảo hành và cập nhật tồn nguồn");
      onSaved();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tạo phiếu hàng bảo hành");
    } finally {
      setSaving(false);
    }
  };

  const stepMeta = [
    [1, "Chọn nguồn", "warehouse"],
    [2, "Chọn hàng", "inventory_2"],
    [3, "Xác nhận", "task_alt"],
  ];
  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          m: { xs: 0, sm: 2 },
          width: { xs: "100%", sm: "calc(100% - 32px)" },
          height: { xs: "100dvh", sm: "auto" },
          maxHeight: { xs: "100dvh", sm: "92dvh" },
          borderRadius: { xs: 0, sm: 3 },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <SoftBox display="flex" justifyContent="space-between" alignItems="center">
          <SoftBox>
            <SoftTypography variant="h5" fontWeight="bold">
              Tạo phiếu bảo hành
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Bước {step}/3 · {stepMeta[step - 1][1]}
            </SoftTypography>
          </SoftBox>
          <IconButton onClick={onClose} disabled={saving}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
        <SoftBox display="flex" gap={0.75} mt={1.25}>
          {stepMeta.map(([number, label, icon]) => (
            <SoftBox
              key={number}
              flex={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={0.5}
              py={0.8}
              borderRadius={2}
              sx={{
                bgcolor: step === number ? "#e3f2fd" : number < step ? "#e8f5e9" : "#f3f5f8",
                color: step === number ? "#1565c0" : number < step ? "#2e7d32" : "#8a94a6",
              }}
            >
              <Icon sx={{ fontSize: "17px !important" }}>
                {number < step ? "check_circle" : icon}
              </Icon>
              <SoftTypography
                variant="caption"
                fontWeight="bold"
                sx={{ display: { xs: step === number ? "block" : "none", sm: "block" } }}
              >
                {label}
              </SoftTypography>
            </SoftBox>
          ))}
        </SoftBox>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: "#f7f9fc", p: { xs: 1.5, sm: 2.5 } }}>
        {step === 1 && (
          <SoftBox>
            <SoftTypography variant="h6" fontWeight="bold">
              Hàng đang nằm ở đâu?
            </SoftTypography>
            <SoftTypography variant="body2" color="text" mb={2}>
              Chọn đúng nguồn để hệ thống kiểm tra số lượng và trừ tồn an toàn.
            </SoftTypography>
            <Grid container spacing={1.25}>
              {Object.entries(SOURCE).map(([value, label]) => {
                const selected = form.sourceType === value;
                return (
                  <Grid item xs={12} sm={6} key={value}>
                    <SoftBox
                      component="button"
                      type="button"
                      onClick={() => changeSource(value)}
                      width="100%"
                      p={2}
                      borderRadius={2.5}
                      textAlign="left"
                      sx={{
                        border: selected ? "2px solid #1976d2" : "1px solid #dfe5ed",
                        bgcolor: selected ? "#eef7ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <SoftBox display="flex" gap={1.25} alignItems="center">
                        <SoftBox
                          width={48}
                          height={48}
                          borderRadius={2}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          sx={{
                            bgcolor: selected ? "#1976d2" : "#eef2f7",
                            color: selected ? "#fff" : "#52606d",
                          }}
                        >
                          <Icon>{value === "WAREHOUSE" ? "warehouse" : "local_shipping"}</Icon>
                        </SoftBox>
                        <SoftBox flex={1}>
                          <SoftTypography variant="button" fontWeight="bold" display="block">
                            {label}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text">
                            {value === "WAREHOUSE"
                              ? "Lấy từ tồn kho chính"
                              : "Lấy từ hàng đang có trên xe"}
                          </SoftTypography>
                        </SoftBox>
                        {selected && <Icon color="info">check_circle</Icon>}
                      </SoftBox>
                    </SoftBox>
                  </Grid>
                );
              })}
            </Grid>
            {form.sourceType === "TRUCK" && (
              <SoftBox
                mt={2}
                p={1.5}
                borderRadius={2}
                sx={{ bgcolor: "#fff", border: "1px solid #dfe5ed" }}
              >
                <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.75}>
                  Chọn xe đang giữ hàng
                </SoftTypography>
                <Select
                  fullWidth
                  size="small"
                  value={form.sourceTruckId}
                  displayEmpty
                  onChange={(event) => {
                    setForm((value) => ({ ...value, sourceTruckId: event.target.value }));
                    setItems([]);
                  }}
                >
                  <MenuItem value="">Bấm để chọn xe</MenuItem>
                  {trucks.map((item) => (
                    <MenuItem key={idOf(item)} value={idOf(item)}>
                      {item.code} · {item.name} · {item.licensePlate}
                    </MenuItem>
                  ))}
                </Select>
              </SoftBox>
            )}
            <SoftBox mt={2} p={1.5} borderRadius={2} sx={{ bgcolor: "#fff8e1", color: "#7a4d00" }}>
              <SoftTypography variant="caption">
                <b>Lưu ý:</b> Hệ thống chỉ thay đổi tồn khi bạn hoàn tất bước xác nhận cuối cùng.
              </SoftTypography>
            </SoftBox>
          </SoftBox>
        )}

        {step === 2 && (
          <SoftBox>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
              <SoftBox>
                <SoftTypography variant="h6" fontWeight="bold">
                  Chọn hàng cần bảo hành
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Nguồn: {SOURCE[form.sourceType]}
                  {truck?.code ? ` · ${truck.code} · ${truck.name}` : ""}
                </SoftTypography>
              </SoftBox>
              <SoftBox
                px={1}
                py={0.5}
                borderRadius={2}
                sx={{ bgcolor: "#e3f2fd", color: "#1565c0", fontSize: 12, fontWeight: 700 }}
              >
                Đã chọn {items.length}
              </SoftBox>
            </SoftBox>
            <SoftInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm nhanh theo tên, mã hoặc barcode..."
              icon={{ component: "search", direction: "left" }}
            />
            <SoftBox
              mt={1}
              maxHeight={240}
              overflow="auto"
              display="flex"
              flexDirection="column"
              gap={0.75}
            >
              {choices.map((product) => (
                <SoftBox
                  key={idOf(product)}
                  display="flex"
                  alignItems="center"
                  gap={1}
                  p={1}
                  borderRadius={2}
                  sx={{ bgcolor: "#fff", border: "1px solid #e1e6ed" }}
                >
                  <EntityThumbnail entity={product} size={46} />
                  <SoftBox flex={1} minWidth={0}>
                    <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                      {product.name}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {product.code} · Còn {product.availableQuantity} {product.unit}
                    </SoftTypography>
                  </SoftBox>
                  <SoftButton
                    size="small"
                    color="info"
                    variant="outlined"
                    disabled={product.availableQuantity <= 0}
                    onClick={() => addItem(product)}
                  >
                    <Icon>add</Icon>&nbsp;Thêm
                  </SoftButton>
                </SoftBox>
              ))}
              {!choices.length && (
                <SoftTypography variant="caption" color="text" textAlign="center" py={2}>
                  {items.length
                    ? "Không còn sản phẩm phù hợp để chọn."
                    : "Nguồn này chưa có hàng phù hợp."}
                </SoftTypography>
              )}
            </SoftBox>
            {!!items.length && (
              <SoftBox mt={2}>
                <SoftTypography variant="button" fontWeight="bold">
                  Hàng đã chọn
                </SoftTypography>
                <SoftBox mt={0.75} display="flex" flexDirection="column" gap={1}>
                  {items.map((item, index) => (
                    <Card
                      key={item.productId}
                      sx={{ p: 1.25, boxShadow: "none", border: "2px solid #bbdefb" }}
                    >
                      <SoftBox display="flex" gap={1} alignItems="center">
                        <EntityThumbnail entity={item.product} size={44} />
                        <SoftBox flex={1} minWidth={0}>
                          <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                            {item.product.name}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text">
                            Tối đa {item.availableQuantity} {item.product.unit}
                          </SoftTypography>
                        </SoftBox>
                        <IconButton
                          color="error"
                          onClick={() =>
                            setItems((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
                          }
                        >
                          <Icon>delete</Icon>
                        </IconButton>
                      </SoftBox>
                      <Grid container spacing={1} mt={0.1}>
                        <Grid item xs={4} sm={3}>
                          <SoftTypography variant="caption" fontWeight="bold">
                            Số lượng *
                          </SoftTypography>
                          <SoftInput
                            type="number"
                            value={item.quantity}
                            inputProps={{ min: 1, max: item.availableQuantity, step: 1 }}
                            onChange={(event) => updateItem(index, "quantity", event.target.value)}
                          />
                        </Grid>
                        <Grid item xs={8} sm={5}>
                          <SoftTypography variant="caption" fontWeight="bold">
                            Hàng bị gì? *
                          </SoftTypography>
                          <SoftInput
                            value={item.issue}
                            onChange={(event) => updateItem(index, "issue", event.target.value)}
                            placeholder="VD: Không lên nguồn"
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <SoftTypography variant="caption">Serial nếu có</SoftTypography>
                          <SoftInput
                            value={item.serialNumber}
                            onChange={(event) =>
                              updateItem(index, "serialNumber", event.target.value)
                            }
                            placeholder="Không bắt buộc"
                          />
                        </Grid>
                      </Grid>
                    </Card>
                  ))}
                </SoftBox>
              </SoftBox>
            )}
          </SoftBox>
        )}

        {step === 3 && (
          <SoftBox>
            <SoftTypography variant="h6" fontWeight="bold">
              Thông tin phiếu
            </SoftTypography>
            <SoftTypography variant="body2" color="text" mb={1.5}>
              Chỉ “Lý do gửi bảo hành” là bắt buộc. Các thông tin còn lại có thể bổ sung sau.
            </SoftTypography>
            <SoftBox p={1.5} mb={1.5} borderRadius={2} sx={{ bgcolor: "#e3f2fd" }}>
              <SoftTypography variant="button" fontWeight="bold" display="block">
                {SOURCE[form.sourceType]}
                {truck?.code ? ` · ${truck.code}` : ""}
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                {items.length} mặt hàng ·{" "}
                {items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} sản phẩm
              </SoftTypography>
              <SoftBox mt={0.75} display="flex" flexWrap="wrap" gap={0.75}>
                {items.map((item) => (
                  <SoftBox
                    key={item.productId}
                    display="flex"
                    alignItems="center"
                    gap={0.5}
                    px={0.75}
                    py={0.45}
                    borderRadius={2}
                    sx={{ bgcolor: "#fff" }}
                  >
                    <EntityThumbnail entity={item.product} size={28} />
                    <SoftTypography variant="caption" fontWeight="bold">
                      {item.product.name} × {item.quantity}
                    </SoftTypography>
                  </SoftBox>
                ))}
              </SoftBox>
            </SoftBox>
            <Grid container spacing={1.25}>
              <Grid item xs={12}>
                <SoftTypography variant="caption" fontWeight="bold">
                  Lý do gửi bảo hành *
                </SoftTypography>
                <SoftInput
                  multiline
                  rows={3}
                  value={form.reason}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, reason: event.target.value }))
                  }
                  placeholder="VD: Hàng lỗi kỹ thuật, cần gửi nhà cung cấp kiểm tra..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <SoftTypography variant="caption">Khách hàng / điểm bán</SoftTypography>
                <SoftInput
                  value={form.customerName}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, customerName: event.target.value }))
                  }
                  placeholder="Không bắt buộc"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <SoftTypography variant="caption">Số điện thoại</SoftTypography>
                <SoftInput
                  value={form.customerPhone}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, customerPhone: event.target.value }))
                  }
                  placeholder="Không bắt buộc"
                />
              </Grid>
              <Grid item xs={12}>
                <SoftTypography variant="caption">Đơn vị nhận bảo hành</SoftTypography>
                <SoftInput
                  value={form.supplierName}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, supplierName: event.target.value }))
                  }
                  placeholder="Nhà cung cấp hoặc trung tâm bảo hành"
                />
              </Grid>
              <Grid item xs={12}>
                <SoftTypography variant="caption">Ghi chú thêm</SoftTypography>
                <SoftInput
                  multiline
                  rows={3}
                  value={form.note}
                  onChange={(event) => setForm((value) => ({ ...value, note: event.target.value }))}
                  placeholder="Thông tin cần nhớ, ngày hẹn trả..."
                />
              </Grid>
            </Grid>
            <SoftBox
              mt={1.5}
              p={1.25}
              borderRadius={2}
              sx={{ bgcolor: "#fff8e1", color: "#7a4d00" }}
            >
              <SoftTypography variant="caption">
                Khi bấm tạo phiếu, hàng sẽ được trừ khỏi {SOURCE[form.sourceType].toLowerCase()} và
                đưa vào danh sách đang bảo hành.
              </SoftTypography>
            </SoftBox>
          </SoftBox>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 1.5, gap: 0.75 }}>
        <SoftButton
          color="secondary"
          variant="outlined"
          disabled={saving}
          onClick={() => (step === 1 ? onClose() : setStep((value) => value - 1))}
        >
          {step === 1 ? "Hủy" : "Quay lại"}
        </SoftButton>
        <SoftButton
          color="info"
          variant="gradient"
          fullWidth
          disabled={saving}
          onClick={step === 3 ? save : nextStep}
        >
          {saving ? "Đang tạo phiếu..." : step === 3 ? "Xác nhận tạo phiếu" : "Tiếp tục"}
        </SoftButton>
      </DialogActions>
    </Dialog>
  );
}

function WarrantyDetailDialog({ document, onClose, onChanged }) {
  const [resolution, setResolution] = useState("RETURN_TO_SOURCE");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  if (!document) return null;
  const id = idOf(document);
  const active = ["RECEIVED", "PROCESSING"].includes(document.status);
  const perform = async (action) => {
    setWorking(true);
    try {
      if (action === "start") await WarrantyReturnService.start(id);
      if (action === "complete") {
        if (!note.trim()) throw new Error("Vui lòng nhập kết quả xử lý");
        await WarrantyReturnService.complete(id, { resolution, note: note.trim() });
      }
      if (action === "cancel") {
        if (!note.trim()) throw new Error("Vui lòng nhập lý do hủy");
        await WarrantyReturnService.cancel(id, note.trim());
      }
      toast.success(
        action === "start"
          ? "Đã chuyển sang đang bảo hành"
          : action === "cancel"
          ? "Đã hủy và hoàn hàng về nguồn"
          : "Đã hoàn tất xử lý bảo hành"
      );
      onChanged();
    } catch (error) {
      toast.error(error?.response?.data?.message || error.message || "Không thể xử lý phiếu");
    } finally {
      setWorking(false);
    }
  };
  return (
    <Dialog open fullWidth maxWidth="md" onClose={() => !working && onClose()}>
      <DialogTitle>
        <SoftBox display="flex" justifyContent="space-between" alignItems="center">
          <SoftBox>
            <SoftTypography variant="h5" fontWeight="bold">
              {document.code}
            </SoftTypography>
            <StatusBadge status={document.status} />
          </SoftBox>
          <IconButton onClick={onClose}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <SoftTypography variant="caption" color="text">
              Nguồn hàng
            </SoftTypography>
            <SoftTypography variant="button" display="block" fontWeight="bold">
              {SOURCE[document.sourceType]}
              {document.sourceTruckCode ? ` · ${document.sourceTruckCode}` : ""}
            </SoftTypography>
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" color="text">
              Ngày tiếp nhận
            </SoftTypography>
            <SoftTypography variant="button" display="block">
              {dateTime(document.createdAt)}
            </SoftTypography>
          </Grid>
          <Grid item xs={12}>
            <SoftTypography variant="caption" color="text">
              Lý do
            </SoftTypography>
            <SoftTypography variant="body2">{document.reason}</SoftTypography>
          </Grid>
        </Grid>
        <SoftBox mt={2} display="flex" flexDirection="column" gap={1}>
          {document.items?.map((item) => (
            <SoftBox
              key={String(item.productId)}
              display="flex"
              gap={1}
              alignItems="center"
              p={1.25}
              borderRadius={2}
              sx={{ bgcolor: "#f7f9fc" }}
            >
              <EntityThumbnail entity={item} size={46} />
              <SoftBox flex={1}>
                <SoftTypography variant="button" fontWeight="bold" display="block">
                  {item.productName}
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {item.productCode} · {item.issue}
                  {item.serialNumber ? ` · Serial: ${item.serialNumber}` : ""}
                </SoftTypography>
              </SoftBox>
              <SoftTypography variant="button" fontWeight="bold">
                {item.quantity} {item.unit}
              </SoftTypography>
            </SoftBox>
          ))}
        </SoftBox>
        {document.resolution && (
          <SoftBox mt={2} p={1.5} borderRadius={2} sx={{ bgcolor: "#e8f5e9" }}>
            <SoftTypography variant="button" fontWeight="bold">
              {RESOLUTION[document.resolution]}
            </SoftTypography>
            <SoftTypography variant="body2" display="block">
              {document.resolutionNote}
            </SoftTypography>
          </SoftBox>
        )}
        {active && (
          <SoftBox mt={2} p={1.5} borderRadius={2} sx={{ border: "1px solid #dbe3ed" }}>
            <SoftTypography variant="button" fontWeight="bold">
              Kết quả xử lý
            </SoftTypography>
            <Select
              fullWidth
              size="small"
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              sx={{ mt: 1 }}
            >
              {Object.entries(RESOLUTION).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
            <SoftBox mt={1}>
              <SoftInput
                multiline
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Bắt buộc nhập kết quả bảo hành hoặc lý do hủy..."
              />
            </SoftBox>
          </SoftBox>
        )}
      </DialogContent>
      {active && (
        <DialogActions sx={{ p: 2, flexWrap: "wrap" }}>
          <SoftButton
            color="error"
            variant="outlined"
            disabled={working}
            onClick={() => perform("cancel")}
          >
            Hủy phiếu & hoàn nguồn
          </SoftButton>
          {document.status === "RECEIVED" && (
            <SoftButton
              color="warning"
              variant="outlined"
              disabled={working}
              onClick={() => perform("start")}
            >
              Bắt đầu xử lý
            </SoftButton>
          )}
          <SoftButton
            color="success"
            variant="gradient"
            disabled={working}
            onClick={() => perform("complete")}
          >
            Hoàn tất bảo hành
          </SoftButton>
        </DialogActions>
      )}
    </Dialog>
  );
}

export default function WarrantyReturns() {
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: "",
    sourceType: "",
    status: "",
    page: 1,
    limit: 20,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listResult, summaryResult] = await Promise.all([
        WarrantyReturnService.getAll({
          ...filters,
          search: filters.search.trim() || undefined,
          sourceType: filters.sourceType || undefined,
          status: filters.status || undefined,
        }),
        WarrantyReturnService.getSummary(),
      ]);
      setDocuments(listOf(listResult));
      setMeta(listResult.data?.meta || { page: 1, totalPages: 1, total: 0 });
      setSummary(unwrap(summaryResult) || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tải hàng bảo hành");
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  const reloadAndClose = () => {
    setCreateOpen(false);
    setDetail(null);
    load();
  };
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          gap={1}
          flexWrap="wrap"
          mb={2}
        >
          <SoftBox>
            <SoftTypography variant="h4" fontWeight="bold">
              Quản lý hàng bảo hành
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Theo dõi hàng lỗi tách từ tồn kho chính hoặc tồn xe và xử lý nhập trả an toàn.
            </SoftTypography>
          </SoftBox>
          <SoftButton color="info" variant="gradient" onClick={() => setCreateOpen(true)}>
            <Icon>add</Icon>&nbsp;Nhận hàng bảo hành
          </SoftButton>
        </SoftBox>
        <Grid container spacing={1.25} mb={2}>
          {[
            ["Phiếu đang xử lý", summary.activeDocuments || 0, "build", "#1565c0"],
            ["Số lượng đang giữ", summary.activeQuantity || 0, "inventory_2", "#ef6c00"],
            ["Từ kho chính", summary.warehouseDocuments || 0, "warehouse", "#2e7d32"],
            ["Từ xe", summary.truckDocuments || 0, "local_shipping", "#7b1fa2"],
          ].map(([label, value, icon, color]) => (
            <Grid item xs={6} md={3} key={label}>
              <Card sx={{ p: 1.5, boxShadow: "none", border: "1px solid #e4e9f0" }}>
                <SoftBox display="flex" gap={1} alignItems="center">
                  <Icon sx={{ color }}>{icon}</Icon>
                  <SoftBox>
                    <SoftTypography variant="caption" color="text">
                      {label}
                    </SoftTypography>
                    <SoftTypography variant="h5" fontWeight="bold">
                      {value}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Card sx={{ p: { xs: 1.25, md: 2 }, boxShadow: "none" }}>
          <Grid container spacing={1}>
            <Grid item xs={12} md={6}>
              <SoftInput
                value={filters.search}
                onChange={(event) =>
                  setFilters((value) => ({ ...value, search: event.target.value, page: 1 }))
                }
                placeholder="Tìm mã phiếu, khách hàng, sản phẩm..."
                icon={{ component: "search", direction: "left" }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <Select
                fullWidth
                size="small"
                value={filters.sourceType}
                displayEmpty
                onChange={(event) =>
                  setFilters((value) => ({ ...value, sourceType: event.target.value, page: 1 }))
                }
              >
                <MenuItem value="">Mọi nguồn</MenuItem>
                <MenuItem value="WAREHOUSE">Kho chính</MenuItem>
                <MenuItem value="TRUCK">Xe bán hàng</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={6} md={3}>
              <Select
                fullWidth
                size="small"
                value={filters.status}
                displayEmpty
                onChange={(event) =>
                  setFilters((value) => ({ ...value, status: event.target.value, page: 1 }))
                }
              >
                <MenuItem value="">Mọi trạng thái</MenuItem>
                {Object.entries(STATUS).map(([value, item]) => (
                  <MenuItem key={value} value={value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>
          <SoftBox mt={1.5} display="flex" flexDirection="column" gap={1}>
            {documents.map((document) => (
              <SoftBox
                key={idOf(document)}
                component="button"
                type="button"
                onClick={() => setDetail(document)}
                p={1.5}
                borderRadius={2}
                textAlign="left"
                sx={{
                  border: "1px solid #e2e7ee",
                  bgcolor: "#fff",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <SoftBox
                  display="flex"
                  justifyContent="space-between"
                  gap={1}
                  alignItems="flex-start"
                >
                  <SoftBox>
                    <SoftTypography variant="button" fontWeight="bold" display="block">
                      {document.code}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {SOURCE[document.sourceType]}
                      {document.sourceTruckCode
                        ? ` · ${document.sourceTruckCode} · ${document.sourceTruckName}`
                        : ""}{" "}
                      · {dateTime(document.createdAt)}
                    </SoftTypography>
                  </SoftBox>
                  <StatusBadge status={document.status} />
                </SoftBox>
                <SoftBox display="flex" gap={0.75} mt={1} sx={{ overflowX: "auto" }}>
                  {document.items?.slice(0, 5).map((item) => (
                    <SoftBox
                      key={String(item.productId)}
                      display="flex"
                      gap={0.5}
                      alignItems="center"
                      minWidth={150}
                    >
                      <EntityThumbnail entity={item} size={34} />
                      <SoftBox minWidth={0}>
                        <SoftTypography variant="caption" fontWeight="bold" noWrap display="block">
                          {item.productName}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text">
                          {item.quantity} {item.unit}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  ))}
                </SoftBox>
                <SoftTypography variant="caption" color="text" display="block" mt={0.75}>
                  {document.reason}
                </SoftTypography>
              </SoftBox>
            ))}
            {!loading && !documents.length && (
              <SoftBox py={5} textAlign="center">
                <Icon color="disabled">build_circle</Icon>
                <SoftTypography display="block" variant="button" color="text">
                  Chưa có phiếu hàng bảo hành phù hợp.
                </SoftTypography>
              </SoftBox>
            )}
          </SoftBox>
          {meta.totalPages > 1 && (
            <SoftBox display="flex" justifyContent="center" gap={1} mt={2}>
              <SoftButton
                size="small"
                variant="outlined"
                color="secondary"
                disabled={filters.page <= 1}
                onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))}
              >
                Trước
              </SoftButton>
              <SoftTypography variant="caption" alignSelf="center">
                Trang {meta.page}/{meta.totalPages} · {meta.total} phiếu
              </SoftTypography>
              <SoftButton
                size="small"
                variant="outlined"
                color="secondary"
                disabled={filters.page >= meta.totalPages}
                onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))}
              >
                Sau
              </SoftButton>
            </SoftBox>
          )}
        </Card>
      </SoftBox>
      <CreateWarrantyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={reloadAndClose}
      />
      <WarrantyDetailDialog
        document={detail}
        onClose={() => setDetail(null)}
        onChanged={reloadAndClose}
      />
    </DashboardLayout>
  );
}
