import { useCallback, useEffect, useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import { useSelector } from "react-redux";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { InvoiceService, ProductService, TruckService } from "services/warehouseService";
import { CustomerService } from "services/crmService";
import EmployeeService from "services/employeeService";
import { toast } from "react-toastify";

const money = (value = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const getId = (value) => value?.id || value?._id;
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const errorMessage = (error, fallback) => {
  const value = error?.response?.data?.message;
  return typeof value === "object"
    ? value.message || fallback
    : Array.isArray(value)
    ? value.join(", ")
    : value || fallback;
};
const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
};
const numberText = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const moneyValue = (value) => Number(String(value || "").replace(/[^0-9]/g, "")) || 0;

function Field({ label, children, xs = 12, md = 6 }) {
  return (
    <Grid item xs={xs} md={md}>
      <SoftTypography variant="caption" fontWeight="medium">
        {label}
      </SoftTypography>
      {children}
    </Grid>
  );
}

function SearchSelect({
  value,
  onChange,
  options,
  loading,
  inputValue,
  onInputChange,
  placeholder,
  label,
}) {
  return (
    <Autocomplete
      value={value}
      onChange={(_, selected) => onChange(selected)}
      options={options}
      openOnFocus
      autoHighlight
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_, next, reason) => {
        onInputChange(next);
      }}
      getOptionLabel={label}
      isOptionEqualToValue={(option, selected) => getId(option) === getId(selected)}
      noOptionsText="Không tìm thấy dữ liệu"
      loadingText="Đang tìm kiếm..."
      renderInput={(params) => <TextField {...params} size="small" placeholder={placeholder} />}
    />
  );
}

function CreateInvoiceModal({ open, onClose, onCreated }) {
  const role = useSelector((state) => state.auth?.user?.role);
  const isAdmin = String(role || "").toLowerCase() === "admin";
  const [form, setForm] = useState({
    code: "",
    date: today(),
    sourceType: "warehouse",
    note: "",
    voucherCode: "",
    cashAmount: 0,
    bankAmount: 0,
    referenceCode: "",
    allowDebtLimitOverride: false,
    debtOverrideReason: "",
  });
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [salesperson, setSalesperson] = useState(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [staff, setStaff] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [truck, setTruck] = useState(null);
  const [truckSearch, setTruckSearch] = useState("");
  const [trucks, setTrucks] = useState([]);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [items, setItems] = useState([{ product: null, qty: 1, search: "" }]);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState("");
  const [giftPromotions, setGiftPromotions] = useState({
    eligiblePromotions: [],
    nearlyEligiblePromotions: [],
  });
  const [selectedGiftPromotion, setSelectedGiftPromotion] = useState(null);
  const [giftSelections, setGiftSelections] = useState({});
  const [appliedGiftPromotion, setAppliedGiftPromotion] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!open) return;
    setForm({
      code: "",
      date: today(),
      sourceType: "warehouse",
      note: "",
      voucherCode: "",
      cashAmount: 0,
      bankAmount: 0,
      referenceCode: "",
      allowDebtLimitOverride: false,
      debtOverrideReason: "",
    });
    setCustomer(null);
    setSalesperson(null);
    setTruck(null);
    setItems([{ product: null, qty: 1, search: "" }]);
    setPreview(null);
    setAppliedVoucher("");
    setGiftPromotions({ eligiblePromotions: [], nearlyEligiblePromotions: [] });
    setSelectedGiftPromotion(null);
    setGiftSelections({});
    setAppliedGiftPromotion(null);
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setCustomersLoading(true);
      CustomerService.getAll({ search: customerSearch || undefined, page: 1, limit: 20 })
        .then((response) => setCustomers(listOf(response)))
        .catch(() => setCustomers([]))
        .finally(() => setCustomersLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, customerSearch]);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setStaffLoading(true);
      EmployeeService.getAll({
        role: "staff",
        status: "ACTIVE",
        search: staffSearch || undefined,
        page: 1,
        limit: 20,
      })
        .then((response) => setStaff(listOf(response)))
        .catch(() => setStaff([]))
        .finally(() => setStaffLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, staffSearch]);
  useEffect(() => {
    if (!open || form.sourceType !== "truck") return undefined;
    const timer = setTimeout(() => {
      setTrucksLoading(true);
      TruckService.getAll({
        status: "active",
        hasInventory: "true",
        search: truckSearch || undefined,
        page: 1,
        limit: 20,
      })
        .then((response) => setTrucks(listOf(response)))
        .catch(() => setTrucks([]))
        .finally(() => setTrucksLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, form.sourceType, truckSearch]);
  useEffect(() => {
    if (!open || (form.sourceType === "truck" && !truck)) {
      setProductOptions([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      setProductsLoading(true);
      const request =
        form.sourceType === "truck"
          ? TruckService.getTruckAvailableProducts(getId(truck), {
              search: productSearch || undefined,
              page: 1,
              limit: 20,
            })
          : ProductService.getAll({ search: productSearch || undefined, page: 1, limit: 20 });
      request
        .then((response) => setProductOptions(listOf(response)))
        .catch(() => setProductOptions([]))
        .finally(() => setProductsLoading(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [open, form.sourceType, truck, productSearch]);
  const previewItems = useMemo(
    () =>
      items
        .filter((item) => item.product && Number(item.qty) > 0)
        .map((item) => ({
          productId: getId(item.product) || item.product.productId,
          qty: Number(item.qty),
        })),
    [items]
  );
  const loadPreview = useCallback(
    async (voucher = appliedVoucher, silent = true) => {
      if (!previewItems.length) {
        setPreview(null);
        return null;
      }
      try {
        const response = await InvoiceService.preview({
          customerId: getId(customer) || undefined,
          voucherCode: voucher || undefined,
          items: previewItems,
        });
        const data = unwrap(response);
        setPreview(data);
        setPreviewError("");
        return data;
      } catch (error) {
        const message = errorMessage(error, "Không thể tính hóa đơn");
        setPreview(null);
        setPreviewError(message);
        if (!silent) toast.error(message);
        return null;
      }
    },
    [appliedVoucher, customer, previewItems]
  );
  useEffect(() => {
    if (!open || !previewItems.length) {
      setPreview(null);
      return undefined;
    }
    const timer = setTimeout(() => loadPreview(appliedVoucher, true), 350);
    return () => clearTimeout(timer);
  }, [open, loadPreview, previewItems.length, appliedVoucher]);
  useEffect(() => {
    if (!open || !previewItems.length) {
      setGiftPromotions({ eligiblePromotions: [], nearlyEligiblePromotions: [] });
      return undefined;
    }
    const timer = setTimeout(() => {
      InvoiceService.previewGiftPromotions({
        customerId: getId(customer) || undefined,
        items: previewItems,
      })
        .then((response) => {
          const data = unwrap(response) || {};
          setGiftPromotions({
            eligiblePromotions: data.eligiblePromotions || [],
            nearlyEligiblePromotions: data.nearlyEligiblePromotions || [],
          });
          setSelectedGiftPromotion(
            (current) =>
              (data.eligiblePromotions || []).find(
                (item) => item.promotionId === current?.promotionId
              ) || null
          );
        })
        .catch(() => setGiftPromotions({ eligiblePromotions: [], nearlyEligiblePromotions: [] }));
      setAppliedGiftPromotion(null);
    }, 350);
    return () => clearTimeout(timer);
  }, [open, customer, previewItems]);
  const applyVoucher = async () => {
    const code = form.voucherCode.trim().toUpperCase();
    if (!code) {
      setAppliedVoucher("");
      return;
    }
    const result = await loadPreview(code, false);
    if (result) {
      setAppliedVoucher(code);
      toast.success(`Đã áp dụng ${result.promotion?.name || code}`);
    }
  };
  const chooseGiftPromotion = (promotion) => {
    setSelectedGiftPromotion(promotion);
    setGiftSelections({});
    setAppliedGiftPromotion(null);
  };
  const changeGiftQty = (groupCode, productId, qty) =>
    setGiftSelections((current) => ({
      ...current,
      [groupCode]: { ...(current[groupCode] || {}), [productId]: Number(qty) || 0 },
    }));
  const giftSelectionPayload = () =>
    selectedGiftPromotion
      ? selectedGiftPromotion.giftGroups
          .filter((group) => group.selectionMode !== "ALL")
          .map((group) => ({
            groupCode: group.groupCode,
            items: Object.entries(giftSelections[group.groupCode] || {})
              .filter(([, qty]) => qty > 0)
              .map(([productId, qty]) => ({ productId, qty })),
          }))
      : [];
  const applyGift = async () => {
    if (!selectedGiftPromotion) return;
    try {
      const selections = giftSelectionPayload();
      const response = await InvoiceService.applyGiftPromotion({
        customerId: getId(customer) || undefined,
        promotionId: selectedGiftPromotion.promotionId,
        items: previewItems,
        giftSelections: selections,
      });
      setAppliedGiftPromotion({
        ...(unwrap(response)?.promotionApplication || {}),
        promotionId: selectedGiftPromotion.promotionId,
        giftSelections: selections,
      });
      toast.success("Đã xác nhận quà tặng");
    } catch (error) {
      toast.error(errorMessage(error, "Lựa chọn quà không hợp lệ"));
    }
  };
  const paidAmount = Number(form.cashAmount || 0) + Number(form.bankAmount || 0);
  const grandTotal = preview?.grandTotal || 0;
  const invoiceDebt = Math.max(0, grandTotal - paidAmount);
  const currentDebt = Number(customer?.debt || 0);
  const debtLimit = Number(customer?.debtLimit || 0);
  const projectedDebt = currentDebt + invoiceDebt;
  const overLimit = Boolean(customer && debtLimit > 0 && projectedDebt > debtLimit);
  const updateItem = (index, patch) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const submit = async () => {
    if (!salesperson) return toast.error("Vui lòng chọn nhân viên xuất hóa đơn");
    if (!previewItems.length || previewItems.length !== items.length)
      return toast.error("Vui lòng chọn đầy đủ sản phẩm và số lượng");
    if (form.sourceType === "truck" && !truck) return toast.error("Vui lòng chọn xe xuất hàng");
    if (!preview) return toast.error(previewError || "Chưa tính được giá trị hóa đơn");
    if (selectedGiftPromotion && !appliedGiftPromotion)
      return toast.error("Vui lòng xác nhận lựa chọn quà tặng");
    if (paidAmount > grandTotal)
      return toast.error("Tổng tiền thanh toán không được vượt giá trị hóa đơn");
    if (!customer && paidAmount !== grandTotal) return toast.error("Khách lẻ phải thanh toán đủ");
    if (overLimit && !form.allowDebtLimitOverride)
      return toast.error("Hóa đơn vượt hạn mức công nợ của khách hàng");
    if (form.allowDebtLimitOverride && !form.debtOverrideReason.trim())
      return toast.error("Vui lòng nhập lý do vượt hạn mức");
    try {
      setSubmitting(true);
      const payments = [];
      if (Number(form.cashAmount) > 0)
        payments.push({ method: "CASH", amount: Number(form.cashAmount) });
      if (Number(form.bankAmount) > 0)
        payments.push({
          method: "BANK_TRANSFER",
          amount: Number(form.bankAmount),
          referenceCode: form.referenceCode.trim() || undefined,
        });
      const response = await InvoiceService.create({
        code: form.code.trim() || undefined,
        date: `${form.date}T00:00:00+07:00`,
        customerId: getId(customer) || undefined,
        sourceType: form.sourceType,
        truckId: getId(truck) || undefined,
        salespersonId: getId(salesperson),
        voucherCode: appliedVoucher || undefined,
        promotionApplications: appliedGiftPromotion
          ? [
              {
                promotionId: appliedGiftPromotion.promotionId,
                giftSelections: appliedGiftPromotion.giftSelections,
              },
            ]
          : undefined,
        payments,
        items: previewItems,
        note: form.note.trim() || undefined,
        allowDebtLimitOverride: Boolean(form.allowDebtLimitOverride),
        debtOverrideReason: form.allowDebtLimitOverride
          ? form.debtOverrideReason.trim()
          : undefined,
      });
      toast.success(`Đã tạo hóa đơn ${unwrap(response)?.code || ""}`);
      onCreated();
      onClose();
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tạo hóa đơn"));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "96%", md: 900 },
          maxHeight: "94vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: { xs: 2, md: 4 },
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          Tạo hóa đơn bán hàng
        </SoftTypography>
        <Grid container spacing={2} mt={0.5}>
          <Field label="Mã hóa đơn">
            <SoftInput
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              placeholder="Để trống để tự sinh"
            />
          </Field>
          <Field label="Ngày hóa đơn *">
            <SoftInput
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </Field>
          <Field label="Khách hàng" md={7}>
            <SearchSelect
              value={customer}
              onChange={setCustomer}
              options={customers}
              loading={customersLoading}
              inputValue={customerSearch}
              onInputChange={setCustomerSearch}
              placeholder="Tìm mã, tên hoặc số điện thoại..."
              label={(item) => `${item.code || ""} · ${item.name || ""} · ${item.phone || ""}`}
            />
          </Field>
          <Field label="Nhân viên xuất hóa đơn *" md={5}>
            <SearchSelect
              value={salesperson}
              onChange={setSalesperson}
              options={staff}
              loading={staffLoading}
              inputValue={staffSearch}
              onInputChange={setStaffSearch}
              placeholder="Tìm mã, tên hoặc số điện thoại..."
              label={(item) =>
                `${item.employeeCode || ""} · ${item.fullName || item.username || ""} · ${
                  item.phone || ""
                }`
              }
            />
          </Field>
        </Grid>
        {customer && (
          <SoftBox mt={2} p={2} borderRadius={2} bgcolor={overLimit ? "#FFF3E0" : "#F3F8FF"}>
            <Grid container spacing={1}>
              {[
                ["Công nợ cũ", currentDebt],
                ["Hạn mức", debtLimit],
                [
                  "Hạn mức còn lại",
                  customer.availableDebtLimit ?? Math.max(0, debtLimit - currentDebt),
                ],
                ["Công nợ sau hóa đơn", projectedDebt],
              ].map(([label, value]) => (
                <Grid item xs={6} md={3} key={label}>
                  <SoftTypography variant="caption" color="text">
                    {label}
                  </SoftTypography>
                  <SoftTypography
                    variant="button"
                    fontWeight="bold"
                    display="block"
                    color={label === "Công nợ sau hóa đơn" && overLimit ? "error" : "dark"}
                  >
                    {money(value)}
                  </SoftTypography>
                </Grid>
              ))}
            </Grid>
          </SoftBox>
        )}
        <SoftBox mt={2} p={2} border="1px solid #E5E7EB" borderRadius={2}>
          <SoftTypography variant="button" fontWeight="bold">
            Nguồn xuất hàng
          </SoftTypography>
          <RadioGroup
            row
            value={form.sourceType}
            onChange={(e) => {
              set("sourceType", e.target.value);
              setTruck(null);
              setItems([{ product: null, qty: 1, search: "" }]);
            }}
          >
            <FormControlLabel
              value="warehouse"
              control={<Radio size="small" />}
              label="Kho chính"
            />
            <FormControlLabel value="truck" control={<Radio size="small" />} label="Xe tải" />
          </RadioGroup>
          {form.sourceType === "truck" && (
            <SearchSelect
              value={truck}
              onChange={(selected) => {
                setTruck(selected);
                setItems([{ product: null, qty: 1, search: "" }]);
              }}
              options={trucks}
              loading={trucksLoading}
              inputValue={truckSearch}
              onInputChange={setTruckSearch}
              placeholder="Tìm mã xe, tên xe, biển số hoặc tài xế..."
              label={(item) =>
                `${item.code || ""} · ${item.name || ""} · ${item.licensePlate || ""}`
              }
            />
          )}
        </SoftBox>
        <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
          Hàng hóa
        </SoftTypography>
        {items.map((item, index) => (
          <SoftBox key={index} display="flex" gap={1} alignItems="center" mb={1.5}>
            <SoftBox sx={{ flex: 3 }}>
              <SearchSelect
                value={item.product}
                onChange={(product) => updateItem(index, { product })}
                options={productOptions}
                loading={productsLoading}
                inputValue={item.search || ""}
                onInputChange={(search) => {
                  updateItem(index, { search });
                  setProductSearch(search);
                }}
                placeholder="Tìm mã, tên hoặc barcode..."
                label={(product) =>
                  `${product.code || ""} · ${product.name || ""} · còn ${
                    product.stock ?? product.quantity ?? product.warehouseQuantity ?? 0
                  } ${product.unit || ""}`
                }
              />
            </SoftBox>
            <SoftBox sx={{ width: 110 }}>
              <SoftInput
                type="number"
                inputProps={{ min: 1, step: 1 }}
                value={item.qty}
                onChange={(e) => updateItem(index, { qty: e.target.value })}
              />
            </SoftBox>
            <IconButton
              disabled={items.length === 1}
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
            >
              <Icon color="error">remove_circle</Icon>
            </IconButton>
          </SoftBox>
        ))}
        <SoftButton
          variant="text"
          color="info"
          startIcon={<Icon>add</Icon>}
          onClick={() => setItems((current) => [...current, { product: null, qty: 1, search: "" }])}
        >
          Thêm sản phẩm
        </SoftButton>
        {(giftPromotions.eligiblePromotions.length > 0 ||
          giftPromotions.nearlyEligiblePromotions.length > 0) && (
          <SoftBox mt={2} p={2} border="1px solid #D1E7DD" borderRadius={2}>
            <SoftTypography variant="button" fontWeight="bold" color="success">
              Chương trình quà tặng
            </SoftTypography>
            {giftPromotions.eligiblePromotions.map((promotion) => (
              <SoftBox
                key={promotion.promotionId}
                mt={1}
                p={1.5}
                bgcolor={
                  selectedGiftPromotion?.promotionId === promotion.promotionId
                    ? "#E8F5E9"
                    : "#F8F9FA"
                }
                borderRadius={2}
              >
                <FormControlLabel
                  control={
                    <Radio
                      checked={selectedGiftPromotion?.promotionId === promotion.promotionId}
                      onChange={() => chooseGiftPromotion(promotion)}
                    />
                  }
                  label={`${promotion.code} · ${promotion.name} · áp dụng ${promotion.applicationCount} lần`}
                />
                {selectedGiftPromotion?.promotionId === promotion.promotionId && (
                  <SoftBox pl={1}>
                    {promotion.giftGroups.map((group) => (
                      <SoftBox key={group.groupCode} mt={1}>
                        <SoftTypography variant="caption" fontWeight="bold" display="block">
                          {group.name || group.groupCode} — cần {group.requiredQuantity} sản phẩm{" "}
                          {group.selectionMode === "ALL" ? "(tự động nhận tất cả)" : ""}
                        </SoftTypography>
                        {group.selectionMode !== "ALL" && (
                          <Grid container spacing={1} mt={0}>
                            {group.options.map((option) => (
                              <Grid item xs={12} sm={6} key={option.productId}>
                                <SoftBox
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="space-between"
                                  gap={1}
                                  p={1}
                                  border="1px solid #E5E7EB"
                                  borderRadius={1}
                                >
                                  <SoftTypography variant="caption">
                                    {option.code} · {option.name}
                                    <br />
                                    Còn {option.availableStock}
                                  </SoftTypography>
                                  <SoftBox sx={{ width: 80 }}>
                                    <SoftInput
                                      type="number"
                                      inputProps={{ min: 0, max: group.requiredQuantity }}
                                      value={
                                        giftSelections[group.groupCode]?.[option.productId] || 0
                                      }
                                      onChange={(event) =>
                                        changeGiftQty(
                                          group.groupCode,
                                          option.productId,
                                          event.target.value
                                        )
                                      }
                                    />
                                  </SoftBox>
                                </SoftBox>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </SoftBox>
                    ))}
                    <SoftButton
                      variant="outlined"
                      color="success"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={applyGift}
                    >
                      {appliedGiftPromotion ? "Đã xác nhận quà" : "Xác nhận quà tặng"}
                    </SoftButton>
                    {appliedGiftPromotion && (
                      <SoftBox mt={1}>
                        {(appliedGiftPromotion.gifts || []).map((gift, index) => (
                          <SoftTypography
                            key={`${gift.productId}-${index}`}
                            variant="caption"
                            display="block"
                            color="success"
                          >
                            🎁 {gift.productName}: {gift.qty} {gift.unit}
                          </SoftTypography>
                        ))}
                      </SoftBox>
                    )}
                  </SoftBox>
                )}
              </SoftBox>
            ))}
            {giftPromotions.nearlyEligiblePromotions.slice(0, 3).map((promotion) => (
              <SoftTypography
                key={promotion.promotionId}
                variant="caption"
                color="warning"
                display="block"
                mt={1}
              >
                Gợi ý: {promotion.name} — {promotion.message}
              </SoftTypography>
            ))}
          </SoftBox>
        )}
        <Grid container spacing={2} mt={1}>
          <Field label="Mã khuyến mãi" md={8}>
            <SoftBox display="flex" gap={1}>
              <SoftInput
                value={form.voucherCode}
                onChange={(e) => set("voucherCode", e.target.value.toUpperCase())}
                placeholder="Nhập mã voucher"
              />
              <SoftButton variant="outlined" color="info" onClick={applyVoucher}>
                {appliedVoucher ? "Kiểm tra lại" : "Áp dụng"}
              </SoftButton>
              {appliedVoucher && (
                <SoftButton
                  variant="text"
                  color="secondary"
                  onClick={() => {
                    setAppliedVoucher("");
                    set("voucherCode", "");
                  }}
                >
                  Bỏ mã
                </SoftButton>
              )}
            </SoftBox>
          </Field>
          <Field label="Ghi chú" md={4}>
            <SoftInput value={form.note} onChange={(e) => set("note", e.target.value)} />
          </Field>
        </Grid>
        {previewError && (
          <SoftTypography variant="caption" color="error" display="block" mt={1}>
            {previewError}
          </SoftTypography>
        )}
        <SoftBox mt={2} p={2} bgcolor="#F8F9FA" borderRadius={2}>
          <SoftBox display="flex" justifyContent="space-between">
            <SoftTypography variant="button">Tạm tính</SoftTypography>
            <SoftTypography variant="button">{money(preview?.subtotal)}</SoftTypography>
          </SoftBox>
          <SoftBox display="flex" justifyContent="space-between">
            <SoftTypography variant="button" color="success">
              Khuyến mãi {preview?.promotion?.name ? `(${preview.promotion.name})` : ""}
            </SoftTypography>
            <SoftTypography variant="button" color="success">
              -{money(preview?.discountAmount)}
            </SoftTypography>
          </SoftBox>
          <SoftBox display="flex" justifyContent="space-between" mt={1}>
            <SoftTypography variant="h6" fontWeight="bold">
              Thành tiền
            </SoftTypography>
            <SoftTypography variant="h6" fontWeight="bold">
              {money(grandTotal)}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
        <Grid container spacing={2} mt={1}>
          <Field label="Tiền mặt">
            <SoftInput
              value={numberText(form.cashAmount)}
              onChange={(e) => set("cashAmount", moneyValue(e.target.value))}
              inputProps={{ inputMode: "numeric" }}
            />
          </Field>
          <Field label="Chuyển khoản">
            <SoftInput
              value={numberText(form.bankAmount)}
              onChange={(e) => set("bankAmount", moneyValue(e.target.value))}
              inputProps={{ inputMode: "numeric" }}
            />
          </Field>
          {Number(form.bankAmount) > 0 && (
            <Field label="Mã giao dịch" md={12}>
              <SoftInput
                value={form.referenceCode}
                onChange={(e) => set("referenceCode", e.target.value)}
              />
            </Field>
          )}
        </Grid>
        <SoftBox display="flex" justifyContent="space-between" mt={2}>
          <SoftTypography variant="button">
            Đã thanh toán: <b>{money(paidAmount)}</b>
          </SoftTypography>
          <SoftTypography variant="button" color={invoiceDebt > 0 ? "error" : "success"}>
            Còn nợ: <b>{money(invoiceDebt)}</b>
          </SoftTypography>
        </SoftBox>
        {overLimit && (
          <SoftBox mt={2} p={2} bgcolor="#FFF3E0" borderRadius={2}>
            <SoftTypography variant="button" color="error" fontWeight="bold">
              Hóa đơn vượt hạn mức công nợ {money(projectedDebt - debtLimit)}
            </SoftTypography>
            {isAdmin && (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.allowDebtLimitOverride}
                      onChange={(e) => set("allowDebtLimitOverride", e.target.checked)}
                    />
                  }
                  label="Admin cho phép vượt hạn mức"
                />
                {form.allowDebtLimitOverride && (
                  <SoftInput
                    value={form.debtOverrideReason}
                    onChange={(e) => set("debtOverrideReason", e.target.value)}
                    placeholder="Lý do phê duyệt bắt buộc"
                  />
                )}
              </>
            )}
          </SoftBox>
        )}
        <SoftBox display="flex" gap={2} mt={3}>
          <SoftButton variant="outlined" color="secondary" fullWidth onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton
            variant="gradient"
            color="success"
            fullWidth
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? "Đang tạo..." : "Tạo hóa đơn"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function InvoiceDetail({ id, onClose }) {
  const [invoice, setInvoice] = useState(null);
  useEffect(() => {
    if (id)
      InvoiceService.getById(id)
        .then((response) => setInvoice(unwrap(response)))
        .catch((error) => toast.error(errorMessage(error, "Không thể tải hóa đơn")));
  }, [id]);
  return (
    <Modal open={Boolean(id)} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "94%", md: 650 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        {!invoice ? (
          <SoftTypography>Đang tải...</SoftTypography>
        ) : (
          <>
            <SoftTypography variant="h5" fontWeight="bold">
              {invoice.code}
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              {new Date(invoice.date).toLocaleString("vi-VN")} · {invoice.customer}
            </SoftTypography>
            <SoftBox mt={2}>
              {(invoice.items || []).map((item) => (
                <SoftBox
                  key={item.productId?._id || item.productId}
                  display="flex"
                  justifyContent="space-between"
                  py={1}
                  borderBottom="1px solid #eee"
                >
                  <SoftBox>
                    <SoftTypography variant="button" fontWeight="bold">
                      {item.productName || item.productId?.name}
                    </SoftTypography>
                    <SoftTypography variant="caption" display="block" color="text">
                      {item.productCode}
                    </SoftTypography>
                  </SoftBox>
                  <SoftTypography variant="button">
                    {item.qty} × {money(item.price)} = {money(item.lineTotal)}
                  </SoftTypography>
                </SoftBox>
              ))}
            </SoftBox>
            <SoftBox mt={2}>
              <SoftTypography variant="button" display="block">
                Tạm tính: {money(invoice.subtotal)}
              </SoftTypography>
              <SoftTypography variant="button" color="success" display="block">
                Khuyến mãi {invoice.voucherCode ? `(${invoice.voucherCode})` : ""}: -
                {money(invoice.discountAmount)}
              </SoftTypography>
              <SoftTypography variant="h6" fontWeight="bold">
                Thành tiền: {money(invoice.grandTotal ?? invoice.totalAmount)}
              </SoftTypography>
              <SoftTypography variant="button" display="block">
                Nhân viên: {invoice.salespersonName || invoice.salespersonId?.fullName || "—"}
              </SoftTypography>
              <SoftTypography variant="button" display="block">
                Thanh toán:{" "}
                {(invoice.payments || [])
                  .map(
                    (p) => `${p.method === "CASH" ? "Tiền mặt" : "Chuyển khoản"} ${money(p.amount)}`
                  )
                  .join(" · ") || "Chưa thanh toán"}
              </SoftTypography>
              <SoftTypography variant="button" color={invoice.debtAmount > 0 ? "error" : "success"}>
                Công nợ: {money(invoice.debtAmount)}
              </SoftTypography>
            </SoftBox>
            <SoftButton
              variant="outlined"
              color="secondary"
              fullWidth
              sx={{ mt: 3 }}
              onClick={onClose}
            >
              Đóng
            </SoftButton>
          </>
        )}
      </SoftBox>
    </Modal>
  );
}

export default function HoaDon() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const load = () => {
    setLoading(true);
    InvoiceService.getAll()
      .then((response) => setInvoices(listOf(response)))
      .catch((error) => toast.error(errorMessage(error, "Không thể tải hóa đơn")))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={3}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <SoftBox>
                <SoftTypography variant="h5" fontWeight="bold">
                  Hóa đơn bán hàng
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Doanh thu, thanh toán, khuyến mãi và công nợ
                </SoftTypography>
              </SoftBox>
              <SoftButton
                variant="gradient"
                color="success"
                startIcon={<Icon>add</Icon>}
                onClick={() => setCreateOpen(true)}
              >
                Tạo hóa đơn
              </SoftButton>
            </SoftBox>
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {[
                      "Mã HĐ",
                      "Ngày",
                      "Khách hàng",
                      "Nhân viên",
                      "Tổng tiền",
                      "Đã trả",
                      "Công nợ",
                      "Trạng thái",
                      "",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: 12,
                          textAlign: "left",
                          fontSize: 12,
                          color: "#6B7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 40 }}>
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loading && !invoices.length && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ textAlign: "center", padding: 40, color: "#9E9E9E" }}
                      >
                        Chưa có hóa đơn
                      </td>
                    </tr>
                  )}
                  {invoices.map((invoice) => (
                    <tr key={getId(invoice)} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 12, fontSize: 13, fontWeight: 600, color: "#1565C0" }}>
                        {invoice.code}
                        {invoice.voucherCode && (
                          <>
                            <br />
                            <span style={{ color: "#7B1FA2", fontSize: 11 }}>
                              🎟 {invoice.voucherCode}
                            </span>
                          </>
                        )}
                      </td>
                      <td style={{ padding: 12, fontSize: 13 }}>
                        {new Date(invoice.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td style={{ padding: 12, fontSize: 13 }}>
                        {invoice.customerId?.name || invoice.customer || "Khách lẻ"}
                        <br />
                        <span style={{ color: "#6B7280" }}>{invoice.customerId?.phone || ""}</span>
                      </td>
                      <td style={{ padding: 12, fontSize: 13 }}>
                        {invoice.salespersonName || invoice.salespersonId?.fullName || "—"}
                      </td>
                      <td style={{ padding: 12, fontSize: 13, fontWeight: 600 }}>
                        {money(invoice.grandTotal ?? invoice.totalAmount)}
                      </td>
                      <td style={{ padding: 12, fontSize: 13, color: "#2E7D32" }}>
                        {money(invoice.paidAmount)}
                      </td>
                      <td
                        style={{
                          padding: 12,
                          fontSize: 13,
                          color: invoice.debtAmount > 0 ? "#C62828" : "#6B7280",
                        }}
                      >
                        {money(invoice.debtAmount)}
                      </td>
                      <td style={{ padding: 12 }}>
                        <span
                          style={{
                            padding: "4px 9px",
                            borderRadius: 10,
                            fontSize: 11,
                            background:
                              invoice.paymentStatus === "PAID"
                                ? "#E8F5E9"
                                : invoice.paymentStatus === "PARTIAL"
                                ? "#FFF3E0"
                                : "#FFEBEE",
                            color:
                              invoice.paymentStatus === "PAID"
                                ? "#2E7D32"
                                : invoice.paymentStatus === "PARTIAL"
                                ? "#E65100"
                                : "#C62828",
                          }}
                        >
                          {invoice.paymentStatus === "PAID"
                            ? "Đã thanh toán"
                            : invoice.paymentStatus === "PARTIAL"
                            ? "Thanh toán một phần"
                            : "Chưa thanh toán"}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <Tooltip title="Xem chi tiết">
                          <IconButton size="small" onClick={() => setDetailId(getId(invoice))}>
                            <Icon color="info">visibility</Icon>
                          </IconButton>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SoftBox>
          </SoftBox>
        </Card>
      </SoftBox>
      <CreateInvoiceModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <InvoiceDetail id={detailId} onClose={() => setDetailId(null)} />
    </DashboardLayout>
  );
}
