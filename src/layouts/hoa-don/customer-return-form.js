import { useEffect, useMemo, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { CustomerService } from "services/crmService";
import CustomerReturnService from "services/customerReturnService";
import { ProductService, TruckService } from "services/warehouseService";

const getId = (value) => value?.id || value?._id;
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const money = (value = 0) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const numberText = (value = 0) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const numericValue = (value) => Number(String(value ?? "").replace(/[^0-9]/g, "")) || 0;
const makeIdempotencyKey = () =>
  window.crypto?.randomUUID?.() ||
  `return-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const errorMessage = (error, fallback) => {
  const value = error?.response?.data?.message;
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return value.message || fallback;
  return value || fallback;
};
const newLine = () => ({
  type: "CATALOG",
  product: null,
  qty: 1,
  previousUnitPrice: 0,
  returnUnitPrice: 0,
  manualCode: "",
  manualName: "",
  manualUnit: "Cái",
  condition: "GOOD",
  note: "",
});

export function InvoiceBusinessTypeSwitch({ value, onChange }) {
  const options = [
    {
      value: "SALE",
      icon: "shopping_cart_checkout",
      title: "Bán hàng",
      description: "Xuất hàng và ghi nhận thanh toán",
      color: "#1976d2",
      background: "#eaf3ff",
    },
    {
      value: "CUSTOMER_RETURN",
      icon: "assignment_return",
      title: "Hoàn hàng khách",
      description: "Nhận hàng về xe, trừ nợ hoặc hoàn tiền",
      color: "#ed6c02",
      background: "#fff4e5",
    },
  ];
  return (
    <SoftBox
      display="grid"
      sx={{ gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr" }, gap: 1 }}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <SoftBox
            key={option.value}
            component="button"
            type="button"
            onClick={() => onChange(option.value)}
            p={{ xs: 1.25, sm: 1.5 }}
            borderRadius={2}
            textAlign="left"
            sx={{
              cursor: "pointer",
              border: `2px solid ${active ? option.color : "#e1e5eb"}`,
              bgcolor: active ? option.background : "#fff",
              color: active ? option.color : "#344054",
              transition: "all .16s ease",
            }}
          >
            <SoftBox display="flex" alignItems="center" gap={1}>
              <Icon sx={{ fontSize: 25 }}>{option.icon}</Icon>
              <SoftBox minWidth={0}>
                <SoftTypography variant="button" fontWeight="bold" color="inherit" display="block">
                  {option.title}
                </SoftTypography>
                <SoftTypography
                  variant="caption"
                  color="text"
                  sx={{ display: { xs: "none", sm: "block" } }}
                >
                  {option.description}
                </SoftTypography>
              </SoftBox>
            </SoftBox>
          </SoftBox>
        );
      })}
    </SoftBox>
  );
}

function ProductSelector({ value, onChange }) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      ProductService.getAll({ search: search || undefined, page: 1, limit: 20 })
        .then((response) => setOptions(listOf(response)))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  return (
    <Autocomplete
      value={value}
      options={options}
      loading={loading}
      filterOptions={(items) => items}
      isOptionEqualToValue={(left, right) => String(getId(left)) === String(getId(right))}
      getOptionLabel={(option) => option?.name || ""}
      inputValue={search || value?.name || ""}
      onInputChange={(_, nextValue, reason) => {
        if (reason !== "reset") setSearch(nextValue);
      }}
      onChange={(_, selected) => {
        onChange(selected);
        setSearch(selected?.name || "");
        window.setTimeout(() => document.activeElement?.blur?.(), 50);
      }}
      renderOption={(props, option) => (
        <li {...props} key={getId(option)}>
          <SoftBox py={0.5} minWidth={0}>
            <SoftTypography variant="button" fontWeight="bold" display="block">
              {option.name}
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              {[option.code, option.unit, money(option.sellPrice ?? option.price)]
                .filter(Boolean)
                .join(" · ")}
            </SoftTypography>
          </SoftBox>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder="Tìm tên, mã hoặc barcode..."
          inputProps={{ ...params.inputProps, style: { paddingTop: 10, paddingBottom: 10 } }}
        />
      )}
    />
  );
}

function SummaryRow({ label, value, color = "dark", strong = false }) {
  return (
    <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={2} py={0.65}>
      <SoftTypography variant="button" fontWeight={strong ? "bold" : "regular"}>
        {label}
      </SoftTypography>
      <SoftTypography variant="button" color={color} fontWeight="bold">
        {money(value)}
      </SoftTypography>
    </SoftBox>
  );
}

export default function CustomerReturnModal({ open, onClose, onCreated, onSwitchToSale }) {
  const authUser = useSelector((state) => state.auth?.user);
  const isAdmin = String(authUser?.role || "").toLowerCase() === "admin";
  const initializedRef = useRef(false);
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [truck, setTruck] = useState(null);
  const [truckSearch, setTruckSearch] = useState("");
  const [trucks, setTrucks] = useState([]);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [items, setItems] = useState([newLine()]);
  const [settlementMode, setSettlementMode] = useState("AUTO");
  const [debtReductionAmount, setDebtReductionAmount] = useState(0);
  const [cashRefundAmount, setCashRefundAmount] = useState(0);
  const [bankRefundAmount, setBankRefundAmount] = useState(0);
  const [bankReferenceCode, setBankReferenceCode] = useState("");
  const [reason, setReason] = useState("");
  const [priceAdjustmentReason, setPriceAdjustmentReason] = useState("");
  const [note, setNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [serverPreview, setServerPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdReturn, setCreatedReturn] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;
    setCustomer(null);
    setTruck(null);
    setItems([newLine()]);
    setSettlementMode("AUTO");
    setDebtReductionAmount(0);
    setCashRefundAmount(0);
    setBankRefundAmount(0);
    setBankReferenceCode("");
    setReason("");
    setPriceAdjustmentReason("");
    setNote("");
    setReviewing(false);
    setPreviewing(false);
    setServerPreview(null);
    setCreatedReturn(null);
    setIdempotencyKey(makeIdempotencyKey());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setCustomersLoading(true);
      CustomerService.getAll({ search: customerSearch || undefined, page: 1, limit: 20 })
        .then((response) => setCustomers(listOf(response)))
        .catch(() => setCustomers([]))
        .finally(() => setCustomersLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [open, customerSearch]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      setTrucksLoading(true);
      TruckService.getAll({
        status: "active",
        search: truckSearch || undefined,
        page: 1,
        limit: 20,
      })
        .then((response) => {
          const values = listOf(response);
          setTrucks(values);
          if (!isAdmin && !truck) {
            const actorId = String(getId(authUser) || "");
            const assigned =
              values.find((item) => {
                const driverId = getId(item.driver) || getId(item.driverId) || item.driverId;
                return driverId && String(driverId) === actorId;
              }) || values[0];
            if (assigned) setTruck(assigned);
          }
        })
        .catch(() => setTrucks([]))
        .finally(() => setTrucksLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [open, truckSearch, isAdmin, authUser, truck]);

  const currentDebt = Number(customer?.debt || 0);
  const totalReturnAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.returnUnitPrice || 0),
        0
      ),
    [items]
  );
  const referenceAmount = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.qty || 0) * Number(item.previousUnitPrice || 0),
        0
      ),
    [items]
  );
  const priceChanged = items.some(
    (item) =>
      Number(item.previousUnitPrice || 0) > 0 &&
      Number(item.previousUnitPrice) !== Number(item.returnUnitPrice || 0)
  );
  const totalSettlement =
    Number(debtReductionAmount || 0) +
    Number(cashRefundAmount || 0) +
    Number(bankRefundAmount || 0);
  const customerDebtAfter = Math.max(0, currentDebt - Number(debtReductionAmount || 0));
  const confirmedReturnAmount = Number(serverPreview?.returnAmount ?? totalReturnAmount);

  useEffect(() => {
    if (settlementMode === "AUTO") {
      const debtAmount = Math.min(totalReturnAmount, currentDebt);
      setDebtReductionAmount(debtAmount);
      setCashRefundAmount(Math.max(0, totalReturnAmount - debtAmount));
      setBankRefundAmount(0);
    }
  }, [settlementMode, totalReturnAmount, currentDebt]);

  const updateItem = (index, patch) =>
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  const chooseProduct = (index, product) => {
    const price = Number(product?.sellPrice ?? product?.price ?? product?.salePrice ?? 0);
    updateItem(index, {
      product,
      previousUnitPrice: price,
      returnUnitPrice: price,
    });
  };
  const changeItemType = (index, type) =>
    updateItem(index, {
      ...newLine(),
      type,
    });

  const validationMessage = () => {
    if (!customer) return "Vui lòng chọn khách hàng trả hàng";
    if (!truck) return "Vui lòng chọn xe nhận lại hàng";
    if (!items.length) return "Vui lòng thêm ít nhất một sản phẩm hoàn";
    for (const item of items) {
      if (item.type === "CATALOG" && !item.product) return "Vui lòng chọn đầy đủ sản phẩm";
      if (item.type === "MANUAL" && !item.manualName.trim())
        return "Vui lòng nhập tên hàng ngoài danh mục";
      if (!Number.isInteger(Number(item.qty)) || Number(item.qty) <= 0)
        return "Số lượng hoàn phải là số nguyên dương";
      if (Number(item.returnUnitPrice || 0) < 0) return "Giá nhận hoàn không hợp lệ";
    }
    if (totalReturnAmount <= 0) return "Tổng giá trị hoàn phải lớn hơn 0";
    if (Number(debtReductionAmount || 0) > currentDebt)
      return "Số tiền trừ công nợ vượt công nợ hiện tại";
    if (totalSettlement !== totalReturnAmount)
      return "Tổng tiền trừ nợ và hoàn khách phải bằng giá trị hàng hoàn";
    if (priceChanged && !priceAdjustmentReason.trim())
      return "Vui lòng nhập lý do chênh lệch giá nhận hoàn";
    if (!reason.trim()) return "Vui lòng nhập lý do hoàn hàng";
    return "";
  };

  const buildPayload = () => ({
        customerId: getId(customer),
        destinationTruckId: getId(truck),
        items: items.map((item) => ({
          productId: item.type === "CATALOG" ? getId(item.product) : undefined,
          manualProduct:
            item.type === "MANUAL"
              ? {
                  code: item.manualCode.trim() || undefined,
                  name: item.manualName.trim(),
                  unit: item.manualUnit.trim() || "Cái",
                }
              : undefined,
          qty: Number(item.qty),
          previousUnitPrice: Number(item.previousUnitPrice || 0) || undefined,
          returnUnitPrice: Number(item.returnUnitPrice || 0),
          condition: item.condition,
          note: item.note.trim() || undefined,
        })),
        settlement: {
          debtReductionAmount: Number(debtReductionAmount || 0),
          refunds: [
            Number(cashRefundAmount || 0) > 0
              ? { method: "CASH", amount: Number(cashRefundAmount) }
              : null,
            Number(bankRefundAmount || 0) > 0
              ? {
                  method: "BANK_TRANSFER",
                  amount: Number(bankRefundAmount),
                  referenceCode: bankReferenceCode.trim() || undefined,
                }
              : null,
          ].filter(Boolean),
        },
        reason: reason.trim(),
        priceAdjustmentReason: priceChanged ? priceAdjustmentReason.trim() : undefined,
        note: note.trim() || undefined,
        idempotencyKey,
      });

  const openReview = async () => {
    const message = validationMessage();
    if (message) return toast.error(message);
    try {
      setPreviewing(true);
      const response = await CustomerReturnService.preview(buildPayload());
      setServerPreview(unwrap(response) || null);
      setReviewing(true);
    } catch (error) {
      toast.error(errorMessage(error, "Backend chưa thể xác nhận phiếu hoàn hàng"));
    } finally {
      setPreviewing(false);
    }
  };

  const createReturn = async () => {
    const message = validationMessage();
    if (message) return toast.error(message);
    try {
      setSubmitting(true);
      const response = await CustomerReturnService.create(buildPayload());
      const created = unwrap(response) || {};
      setCreatedReturn(created);
      setReviewing(false);
      toast.success(`Đã tạo phiếu hoàn hàng ${created.code || ""}`);
      onCreated?.();
    } catch (error) {
      toast.error(errorMessage(error, "Không thể tạo phiếu hoàn hàng"));
    } finally {
      setSubmitting(false);
    }
  };

  const automaticSettlementTitle =
    totalReturnAmount <= 0
      ? "Chờ nhập giá trị hàng hoàn"
      : currentDebt <= 0
      ? "Hoàn tiền mặt cho khách"
      : currentDebt >= totalReturnAmount
      ? "Trừ toàn bộ vào công nợ"
      : "Trừ hết công nợ và hoàn phần dư";
  const automaticSettlementDescription =
    totalReturnAmount <= 0
      ? "Hệ thống sẽ tự tính sau khi chọn hàng và nhập giá hoàn"
      : Number(debtReductionAmount || 0) > 0 && Number(cashRefundAmount || 0) > 0
      ? `Trừ nợ ${money(debtReductionAmount)} · Hoàn tiền ${money(cashRefundAmount)}`
      : Number(debtReductionAmount || 0) > 0
      ? `Cấn trừ công nợ ${money(debtReductionAmount)}`
      : `Hoàn tiền mặt ${money(cashRefundAmount)}`;
  const settlementOptions = [
    {
      value: "AUTO",
      icon: "auto_awesome",
      title: automaticSettlementTitle,
      subtitle: automaticSettlementDescription,
      color: "#00897b",
    },
    {
      value: "MIXED",
      icon: "tune",
      title: "Tùy chỉnh cách xử lý",
      subtitle: "Tự chia số tiền trừ nợ, tiền mặt và chuyển khoản",
      color: "#7b1fa2",
    },
  ];

  if (createdReturn)
    return (
      <Modal open={open} onClose={onClose}>
        <SoftBox
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "92%", sm: 520 },
            bgcolor: "background.paper",
            borderRadius: 3,
            boxShadow: 24,
            p: 3,
          }}
        >
          <SoftBox textAlign="center">
            <Icon sx={{ fontSize: 58, color: "#2e7d32" }}>check_circle</Icon>
            <SoftTypography variant="h5" fontWeight="bold">
              Hoàn hàng thành công
            </SoftTypography>
            <SoftTypography variant="h6" color="warning" mt={1}>
              {createdReturn.code || "Phiếu hoàn hàng"}
            </SoftTypography>
          </SoftBox>
          <SoftBox mt={2.5} p={2} borderRadius={2} bgcolor="#f7f9fc">
            <SummaryRow label="Giá trị hàng hoàn" value={createdReturn.returnAmount ?? totalReturnAmount} strong />
            <SummaryRow label="Đã trừ công nợ" value={createdReturn.debtReductionAmount ?? debtReductionAmount} />
            <SummaryRow label="Đã hoàn khách" value={createdReturn.refundAmount ?? cashRefundAmount + bankRefundAmount} />
          </SoftBox>
          <SoftButton variant="gradient" color="success" fullWidth sx={{ mt: 2.5 }} onClick={onClose}>
            Hoàn tất
          </SoftButton>
        </SoftBox>
      </Modal>
    );

  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: { xs: 0, md: "50%" },
          left: { xs: 0, md: "50%" },
          transform: { xs: "none", md: "translate(-50%, -50%)" },
          width: { xs: "100%", md: "94vw" },
          maxWidth: 1180,
          height: { xs: "100dvh", md: "auto" },
          maxHeight: { xs: "100dvh", md: "94vh" },
          bgcolor: "background.paper",
          borderRadius: { xs: 0, md: 3 },
          boxShadow: 24,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SoftBox
          px={{ xs: 2, md: 3 }}
          py={1.5}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          bgcolor="#fff"
          sx={{ borderBottom: "1px solid #e5e7eb" }}
        >
          <SoftBox>
            <SoftTypography variant="h5" fontWeight="bold">
              Hoàn hàng khách hàng
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Không cần tìm hóa đơn cũ · giá nhận hoàn được nhập linh hoạt
            </SoftTypography>
          </SoftBox>
          <IconButton onClick={onClose} disabled={submitting}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>

        <SoftBox px={{ xs: 2, md: 3 }} py={1.5} bgcolor="#fafbfc">
          <InvoiceBusinessTypeSwitch value="CUSTOMER_RETURN" onChange={onSwitchToSale} />
        </SoftBox>

        <SoftBox sx={{ overflowY: "auto", flex: 1 }} px={{ xs: 2, md: 3 }} py={2}>
          {!reviewing ? (
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={7.5}>
                <SoftBox mb={2.5}>
                  <SoftTypography variant="h6" fontWeight="bold" mb={1}>
                    1. Khách hàng trả hàng
                  </SoftTypography>
                  <Autocomplete
                    value={customer}
                    options={customers}
                    loading={customersLoading}
                    filterOptions={(values) => values}
                    isOptionEqualToValue={(left, right) =>
                      String(getId(left)) === String(getId(right))
                    }
                    getOptionLabel={(option) =>
                      [option.code, option.name].filter(Boolean).join(" · ")
                    }
                    onInputChange={(_, value, reasonType) => {
                      if (reasonType !== "reset") setCustomerSearch(value);
                    }}
                    onChange={(_, value) => setCustomer(value)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Tìm mã hoặc tên khách hàng..." />
                    )}
                  />
                  {customer && (
                    <SoftBox mt={1.25} p={1.5} borderRadius={1.5} bgcolor="#f1f7ff">
                      <SoftBox display="flex" justifyContent="space-between" gap={2}>
                        <SoftTypography variant="button" fontWeight="bold">
                          {[customer.code, customer.name].filter(Boolean).join(" · ")}
                        </SoftTypography>
                        <SoftTypography variant="button" color="error" fontWeight="bold">
                          Nợ: {money(currentDebt)}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  )}
                </SoftBox>

                <SoftBox mb={2.5}>
                  <SoftTypography variant="h6" fontWeight="bold" mb={1}>
                    2. Xe nhận lại hàng
                  </SoftTypography>
                  <Autocomplete
                    value={truck}
                    options={trucks}
                    loading={trucksLoading}
                    filterOptions={(values) => values}
                    isOptionEqualToValue={(left, right) => String(getId(left)) === String(getId(right))}
                    getOptionLabel={(option) =>
                      [option.name || option.code, option.licensePlate].filter(Boolean).join(" · ")
                    }
                    onInputChange={(_, value, reasonType) => {
                      if (reasonType !== "reset") setTruckSearch(value);
                    }}
                    onChange={(_, value) => setTruck(value)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Chọn xe nhận lại hàng..." />
                    )}
                  />
                </SoftBox>

                <SoftBox>
                  <SoftBox mb={1}>
                    <SoftTypography variant="h6" fontWeight="bold">
                      3. Hàng khách trả
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      Có thể chọn hàng công ty hoặc nhập hàng ngoài danh mục
                    </SoftTypography>
                  </SoftBox>
                  {items.map((item, index) => (
                    <SoftBox
                      key={index}
                      p={{ xs: 1.5, sm: 2 }}
                      mb={1.5}
                      borderRadius={2}
                      bgcolor="#fff"
                      sx={{ border: "2px solid #f0d6b5" }}
                    >
                      <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
                        <SoftTypography variant="button" color="warning" fontWeight="bold">
                          SẢN PHẨM HOÀN #{index + 1}
                        </SoftTypography>
                        {items.length > 1 && (
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          >
                            <Icon>remove_circle</Icon>
                          </IconButton>
                        )}
                      </SoftBox>
                      <SoftBox display="grid" sx={{ gridTemplateColumns: "1fr 1fr", gap: 1 }} mb={1.25}>
                        {[
                          ["CATALOG", "inventory_2", "Hàng công ty"],
                          ["MANUAL", "edit_note", "Ngoài danh mục"],
                        ].map(([type, icon, label]) => {
                          const active = item.type === type;
                          return (
                            <SoftButton
                              key={type}
                              variant={active ? "gradient" : "outlined"}
                              color={active ? "info" : "secondary"}
                              startIcon={<Icon>{icon}</Icon>}
                              onClick={() => changeItemType(index, type)}
                            >
                              {label}
                            </SoftButton>
                          );
                        })}
                      </SoftBox>
                      {item.type === "CATALOG" ? (
                        <ProductSelector value={item.product} onChange={(product) => chooseProduct(index, product)} />
                      ) : (
                        <Grid container spacing={1.25}>
                          <Grid item xs={12} sm={7}>
                            <SoftInput
                              value={item.manualName}
                              onChange={(event) => updateItem(index, { manualName: event.target.value })}
                              placeholder="Tên sản phẩm ngoài danh mục *"
                            />
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <SoftInput
                              value={item.manualCode}
                              onChange={(event) => updateItem(index, { manualCode: event.target.value })}
                              placeholder="Mã (nếu có)"
                            />
                          </Grid>
                          <Grid item xs={6} sm={2}>
                            <SoftInput
                              value={item.manualUnit}
                              onChange={(event) => updateItem(index, { manualUnit: event.target.value })}
                              placeholder="ĐVT"
                            />
                          </Grid>
                        </Grid>
                      )}
                      <Grid container spacing={1.25} mt={0.1}>
                        <Grid item xs={4} sm={2}>
                          <SoftTypography variant="caption" color="text">Số lượng *</SoftTypography>
                          <SoftInput
                            type="number"
                            inputProps={{ min: 1, step: 1 }}
                            value={item.qty}
                            onChange={(event) => updateItem(index, { qty: Number(event.target.value) })}
                          />
                        </Grid>
                        <Grid item xs={8} sm={3.5}>
                          <SoftTypography variant="caption" color="text">Giá bán trước (nếu biết)</SoftTypography>
                          <SoftInput
                            inputMode="numeric"
                            value={item.previousUnitPrice || ""}
                            onChange={(event) => updateItem(index, { previousUnitPrice: numericValue(event.target.value) })}
                            placeholder="0"
                          />
                        </Grid>
                        <Grid item xs={8} sm={3.5}>
                          <SoftTypography variant="caption" color="text">Giá nhận hoàn *</SoftTypography>
                          <SoftInput
                            inputMode="numeric"
                            value={item.returnUnitPrice || ""}
                            onChange={(event) => updateItem(index, { returnUnitPrice: numericValue(event.target.value) })}
                            placeholder="0"
                          />
                        </Grid>
                        <Grid item xs={4} sm={3}>
                          <SoftTypography variant="caption" color="text">Tình trạng</SoftTypography>
                          <TextField
                            select
                            fullWidth
                            value={item.condition}
                            onChange={(event) => updateItem(index, { condition: event.target.value })}
                          >
                            <MenuItem value="GOOD">Hàng tốt</MenuItem>
                            <MenuItem value="DAMAGED">Hư hỏng</MenuItem>
                            <MenuItem value="EXPIRED">Hết hạn</MenuItem>
                            <MenuItem value="UNKNOWN">Chưa rõ</MenuItem>
                          </TextField>
                        </Grid>
                      </Grid>
                      <SoftBox mt={1.25} display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                        <SoftInput
                          value={item.note}
                          onChange={(event) => updateItem(index, { note: event.target.value })}
                          placeholder="Ghi chú tình trạng sản phẩm..."
                        />
                        <SoftTypography variant="button" color="warning" fontWeight="bold" whiteSpace="nowrap">
                          {money(Number(item.qty || 0) * Number(item.returnUnitPrice || 0))}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  ))}
                  <SoftButton
                    variant="outlined"
                    color="warning"
                    startIcon={<Icon>add</Icon>}
                    fullWidth
                    sx={{
                      mt: 0.5,
                      border: "2px dashed #ed6c02",
                      bgcolor: "#fff8f0",
                      fontWeight: 700,
                      minHeight: 52,
                      "&:hover": {
                        border: "2px solid #ed6c02",
                        bgcolor: "#fff1df",
                      },
                    }}
                    onClick={() => setItems((current) => [...current, newLine()])}
                  >
                    Thêm hàng hoàn
                  </SoftButton>
                </SoftBox>
              </Grid>

              <Grid item xs={12} md={4.5}>
                <SoftBox
                  p={{ xs: 1.5, sm: 2 }}
                  borderRadius={2}
                  bgcolor="#fafbfc"
                  sx={{ border: "1px solid #e5e7eb", position: { md: "sticky" }, top: 0 }}
                >
                  <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={1.25}>
                    <SoftTypography variant="h6" fontWeight="bold">
                      4. Xử lý tiền hoàn
                    </SoftTypography>
                    {settlementMode === "AUTO" && (
                      <SoftBox
                        px={1}
                        py={0.35}
                        borderRadius={5}
                        bgcolor="#e0f2f1"
                        color="#00796b"
                      >
                        <SoftTypography variant="caption" color="inherit" fontWeight="bold">
                          TỰ ĐỘNG
                        </SoftTypography>
                      </SoftBox>
                    )}
                  </SoftBox>
                  <SoftBox display="grid" sx={{ gridTemplateColumns: "1fr", gap: 1 }}>
                    {settlementOptions.map((option) => {
                      const active = settlementMode === option.value;
                      return (
                        <SoftBox
                          key={option.value}
                          component="button"
                          type="button"
                          onClick={() => setSettlementMode(option.value)}
                          p={1.25}
                          borderRadius={1.5}
                          textAlign="left"
                          sx={{
                            border: `2px solid ${active ? option.color : "#e1e5eb"}`,
                            bgcolor: active ? `${option.color}12` : "#fff",
                            color: active ? option.color : "#475467",
                            cursor: "pointer",
                          }}
                        >
                          <SoftBox display="flex" gap={1.25} alignItems="center">
                            <Icon>{option.icon}</Icon>
                            <SoftBox>
                              <SoftTypography variant="button" color="inherit" fontWeight="bold" display="block">
                                {option.title}
                              </SoftTypography>
                              <SoftTypography variant="caption" color="text">{option.subtitle}</SoftTypography>
                            </SoftBox>
                          </SoftBox>
                        </SoftBox>
                      );
                    })}
                  </SoftBox>

                  <Grid container spacing={1.25} mt={0.5}>
                    <Grid item xs={12}>
                      <SoftTypography variant="caption" color="text">Trừ công nợ</SoftTypography>
                      <SoftInput
                        inputMode="numeric"
                        disabled={settlementMode !== "MIXED"}
                        value={debtReductionAmount || ""}
                        onChange={(event) => setDebtReductionAmount(numericValue(event.target.value))}
                        placeholder="0"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <SoftTypography variant="caption" color="text">Hoàn tiền mặt</SoftTypography>
                      <SoftInput
                        inputMode="numeric"
                        disabled={settlementMode !== "MIXED"}
                        value={cashRefundAmount || ""}
                        onChange={(event) => setCashRefundAmount(numericValue(event.target.value))}
                        placeholder="0"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <SoftTypography variant="caption" color="text">Hoàn chuyển khoản</SoftTypography>
                      <SoftInput
                        inputMode="numeric"
                        disabled={settlementMode !== "MIXED"}
                        value={bankRefundAmount || ""}
                        onChange={(event) => setBankRefundAmount(numericValue(event.target.value))}
                        placeholder="0"
                      />
                    </Grid>
                    {Number(bankRefundAmount || 0) > 0 && (
                      <Grid item xs={12}>
                        <SoftInput
                          value={bankReferenceCode}
                          onChange={(event) => setBankReferenceCode(event.target.value)}
                          placeholder="Mã giao dịch chuyển khoản"
                        />
                      </Grid>
                    )}
                  </Grid>

                  <SoftBox mt={2} p={1.5} borderRadius={1.5} bgcolor="#fff">
                    <SummaryRow label="Giá tham khảo trước" value={referenceAmount} />
                    <SummaryRow label="Giá trị nhận hoàn" value={totalReturnAmount} color="warning" strong />
                    <SummaryRow label="Trừ công nợ" value={debtReductionAmount} color="success" />
                    <SummaryRow label="Hoàn cho khách" value={cashRefundAmount + bankRefundAmount} color="info" />
                    <SummaryRow label="Công nợ sau hoàn" value={customerDebtAfter} color={customerDebtAfter > 0 ? "error" : "success"} />
                    {totalSettlement !== totalReturnAmount && (
                      <SoftTypography variant="caption" color="error" fontWeight="bold" display="block" mt={1}>
                        Còn lệch {money(totalReturnAmount - totalSettlement)} chưa được xử lý
                      </SoftTypography>
                    )}
                  </SoftBox>

                  <SoftBox mt={2}>
                    <SoftInput
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Lý do khách hoàn hàng *"
                    />
                  </SoftBox>
                  {priceChanged && (
                    <SoftBox mt={1.25}>
                      <SoftInput
                        value={priceAdjustmentReason}
                        onChange={(event) => setPriceAdjustmentReason(event.target.value)}
                        placeholder="Lý do chênh lệch giá nhận hoàn *"
                      />
                    </SoftBox>
                  )}
                  <SoftBox mt={1.25}>
                    <SoftInput
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Ghi chú phiếu hoàn (nếu có)..."
                      multiline
                      rows={3}
                    />
                  </SoftBox>
                </SoftBox>
              </Grid>
            </Grid>
          ) : (
            <SoftBox maxWidth={760} mx="auto">
              <SoftBox textAlign="center" mb={2.5}>
                <Icon sx={{ fontSize: 44, color: "#ed6c02" }}>fact_check</Icon>
                <SoftTypography variant="h5" fontWeight="bold">Kiểm tra phiếu hoàn hàng</SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Hàng và công nợ chỉ thay đổi sau khi xác nhận cuối
                </SoftTypography>
              </SoftBox>
              <SoftBox p={2} borderRadius={2} bgcolor="#f7f9fc" mb={2}>
                {[
                  ["Khách hàng", [customer?.code, customer?.name].filter(Boolean).join(" · ")],
                  ["Xe nhận hàng", [truck?.name || truck?.code, truck?.licensePlate].filter(Boolean).join(" · ")],
                  ["Lý do", reason],
                ].map(([label, value]) => (
                  <SoftBox key={label} display="flex" justifyContent="space-between" gap={2} py={0.5}>
                    <SoftTypography variant="caption" color="text">{label}</SoftTypography>
                    <SoftTypography variant="button" fontWeight="bold" textAlign="right">{value}</SoftTypography>
                  </SoftBox>
                ))}
              </SoftBox>
              {items.map((item, index) => (
                <SoftBox key={index} p={1.5} mb={1} borderRadius={1.5} sx={{ border: "1px solid #f0d6b5" }}>
                  <SoftBox display="flex" justifyContent="space-between" gap={2}>
                    <SoftBox>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {item.type === "CATALOG" ? item.product?.name : item.manualName}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {numberText(item.qty)} {item.type === "CATALOG" ? item.product?.unit : item.manualUnit} × {money(item.returnUnitPrice)} · {item.type === "MANUAL" ? "Chờ phân loại" : "Hàng công ty"}
                      </SoftTypography>
                    </SoftBox>
                    <SoftTypography variant="button" color="warning" fontWeight="bold">
                      {money(Number(item.qty) * Number(item.returnUnitPrice))}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              ))}
              <SoftBox mt={2} p={2} borderRadius={2} bgcolor="#fff4e5">
                <SummaryRow
                  label="Tổng giá trị hoàn"
                  value={confirmedReturnAmount}
                  color="warning"
                  strong
                />
                <SummaryRow label="Trừ công nợ" value={debtReductionAmount} color="success" />
                <SummaryRow label="Hoàn tiền mặt" value={cashRefundAmount} />
                <SummaryRow label="Hoàn chuyển khoản" value={bankRefundAmount} />
                <SummaryRow label="Công nợ sau hoàn" value={customerDebtAfter} color={customerDebtAfter > 0 ? "error" : "success"} />
              </SoftBox>
              {note.trim() && (
                <SoftBox mt={1.5} p={1.5} borderRadius={1.5} bgcolor="#fff8e1">
                  <SoftTypography variant="caption" color="text" display="block">Ghi chú</SoftTypography>
                  <SoftTypography variant="button" sx={{ whiteSpace: "pre-wrap" }}>{note}</SoftTypography>
                </SoftBox>
              )}
            </SoftBox>
          )}
        </SoftBox>

        <SoftBox
          px={{ xs: 2, md: 3 }}
          py={1.5}
          display="flex"
          gap={1.25}
          bgcolor="#fff"
          sx={{ borderTop: "1px solid #e5e7eb" }}
        >
          <SoftButton
            variant="outlined"
            color="secondary"
            fullWidth
            disabled={submitting}
            onClick={() => (reviewing ? setReviewing(false) : onClose())}
          >
            {reviewing ? "Quay lại chỉnh sửa" : "Hủy"}
          </SoftButton>
          <SoftButton
            variant="gradient"
            color={reviewing ? "success" : "warning"}
            fullWidth
            disabled={submitting || previewing}
            startIcon={<Icon>{reviewing ? "check_circle" : "fact_check"}</Icon>}
            onClick={reviewing ? createReturn : openReview}
          >
            {submitting
              ? "Đang xử lý..."
              : previewing
              ? "Đang kiểm tra..."
              : reviewing
              ? "Xác nhận hoàn hàng"
              : "Xem lại phiếu hoàn"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}
