import { useCallback, useEffect, useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import EntityThumbnail from "components/EntityThumbnail";
import PrintPreviewDialog from "components/PrintPreviewDialog";
import { ProductService, TruckService } from "services/warehouseService";
import { buildTruckOperationPdfHtml } from "utils/dailyOperationsPrint";
import { toast } from "react-toastify";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const idOf = (value) => value?.id || value?._id || value?.productId || "";
const quantityOf = (value) =>
  Number(value?.stock ?? value?.quantity ?? value?.qty ?? value?.warehouseQuantity ?? 0);
const operationOptions = [
  {
    value: "LOAD",
    title: "Ứng hàng lên xe",
    description: "Trừ kho chính và cộng tồn xe",
    icon: "local_shipping",
    color: "#1976d2",
    background: "#e3f2fd",
  },
  {
    value: "RETURN",
    title: "Hoàn hàng về kho",
    description: "Trừ tồn xe và cộng lại kho chính",
    icon: "assignment_return",
    color: "#ef6c00",
    background: "#fff3e0",
  },
  {
    value: "TRUCK_TO_TRUCK",
    title: "Chuyển nhanh sang xe khác",
    description: "Chuyển tồn trực tiếp giữa hai xe",
    icon: "swap_horiz",
    color: "#2e7d32",
    background: "#e8f5e9",
  },
];

const operationName = Object.fromEntries(operationOptions.map((item) => [item.value, item.title]));

export default function QuickTruckOperations() {
  const [operationType, setOperationType] = useState("LOAD");
  const [date, setDate] = useState(today());
  const [sourceTruck, setSourceTruck] = useState(null);
  const [destinationTruck, setDestinationTruck] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState([]);
  const [printPreview, setPrintPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const selectedIds = useMemo(() => new Set(items.map((item) => item.productId)), [items]);
  const currentOperation = operationOptions.find((item) => item.value === operationType);

  const loadHistory = useCallback(
    () =>
      TruckService.getTransfers({ from: date, to: date, page: 1, limit: 30 })
        .then((response) => setHistory(listOf(response)))
        .catch(() => setHistory([])),
    [date]
  );

  useEffect(() => {
    TruckService.getAll({ page: 1, limit: 100, status: "active", sortBy: "code", sortOrder: "asc" })
      .then((response) => setTrucks(listOf(response)))
      .catch((error) => toast.error(error.response?.data?.message || "Không thể tải danh sách xe"));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      if (operationType !== "LOAD" && !sourceTruck) {
        setProducts([]);
        return;
      }
      try {
        setLoadingProducts(true);
        const params = { page: 1, limit: 100, search: productSearch.trim() || undefined };
        const response =
          operationType === "LOAD"
            ? await ProductService.getAll(params)
            : await TruckService.getTruckAvailableProducts(idOf(sourceTruck), params);
        if (!active) return;
        setProducts(listOf(response).filter((product) => quantityOf(product) > 0));
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || "Không thể tải hàng khả dụng");
      } finally {
        if (active) setLoadingProducts(false);
      }
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [operationType, productSearch, sourceTruck]);

  const resetItems = () => {
    setItems([]);
    setProducts([]);
    setProductSearch("");
  };
  const changeOperation = (value) => {
    setOperationType(value);
    setSourceTruck(null);
    setDestinationTruck(null);
    resetItems();
  };
  const addProduct = (product) => {
    const productId = idOf(product);
    if (!productId || selectedIds.has(productId)) return;
    setItems((current) => [...current, { productId, product, qty: 1 }]);
    setProductSearch("");
  };
  const patchQuantity = (index, value) =>
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const maximum = quantityOf(item.product);
        const quantity = Math.max(1, Math.floor(Number(value) || 1));
        return { ...item, qty: maximum > 0 ? Math.min(maximum, quantity) : quantity };
      })
    );

  const submit = async () => {
    if (!sourceTruck)
      return toast.error(operationType === "LOAD" ? "Chọn xe nhận hàng" : "Chọn xe nguồn");
    if (operationType === "TRUCK_TO_TRUCK" && !destinationTruck)
      return toast.error("Chọn xe nhận hàng");
    if (!items.length) return toast.error("Chọn ít nhất một mặt hàng");
    if (items.some((item) => !Number.isInteger(Number(item.qty)) || Number(item.qty) < 1))
      return toast.error("Số lượng phải là số nguyên dương");
    const payload = {
      date: `${date}T00:00:00+07:00`,
      note: note.trim() || undefined,
      items: items.map((item) => ({ productId: item.productId, qty: Number(item.qty) })),
    };
    try {
      setSaving(true);
      let response;
      if (operationType === "LOAD")
        response = await TruckService.loadGoods(idOf(sourceTruck), payload);
      else if (operationType === "RETURN")
        response = await TruckService.returnGoods(idOf(sourceTruck), payload);
      else {
        const transferPayload = { ...payload, destinationTruckId: idOf(destinationTruck) };
        await TruckService.previewTruckTransfer(idOf(sourceTruck), transferPayload);
        response = await TruckService.transferToTruck(idOf(sourceTruck), transferPayload);
      }
      const result = unwrap(response);
      const transfer = result?.transfer || result;
      toast.success(`Đã hoàn tất ${operationName[operationType].toLowerCase()}`);
      setItems([]);
      setNote("");
      await loadHistory();
      setPrintPreview({
        title: `${operationName[transfer?.type] || "Phiếu nghiệp vụ"} · ${transfer?.code || ""}`,
        html: buildTruckOperationPdfHtml(transfer),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xử lý nghiệp vụ xe");
    } finally {
      setSaving(false);
    }
  };

  const printTransfer = async (transfer) => {
    try {
      const response = await TruckService.getTransferById(idOf(transfer));
      const detail = unwrap(response);
      setPrintPreview({
        title: `${operationName[detail?.type] || "Phiếu nghiệp vụ"} · ${detail?.code || ""}`,
        html: buildTruckOperationPdfHtml(detail),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tạo file PDF");
    }
  };

  return (
    <SoftBox>
      <SoftTypography variant="h6" fontWeight="bold" mb={0.5}>
        Mẫu thao tác nhanh tồn xe
      </SoftTypography>
      <SoftTypography variant="caption" color="text" display="block" mb={1.5}>
        Đây là giao diện mở rộng của Quản lý xe tải. Mọi thao tác dùng chung API, transaction, kiểm
        tra tồn và lịch sử điều chuyển.
      </SoftTypography>
      <Grid container spacing={1.25} mb={2}>
        {operationOptions.map((option) => {
          const selected = option.value === operationType;
          return (
            <Grid item xs={12} md={4} key={option.value}>
              <SoftBox
                component="button"
                type="button"
                onClick={() => changeOperation(option.value)}
                width="100%"
                p={1.5}
                display="flex"
                alignItems="center"
                gap={1.25}
                borderRadius={2}
                textAlign="left"
                sx={{
                  cursor: "pointer",
                  border: selected ? `2px solid ${option.color}` : "1px solid #dfe4ea",
                  background: selected ? option.background : "#fff",
                }}
              >
                <Icon sx={{ color: option.color }}>{option.icon}</Icon>
                <SoftBox>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {option.title}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {option.description}
                  </SoftTypography>
                </SoftBox>
              </SoftBox>
            </Grid>
          );
        })}
      </Grid>
      <SoftBox p={{ xs: 1.5, md: 2.25 }} borderRadius={3} bgcolor="#f7f9fc">
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
              Ngày chứng từ
            </SoftTypography>
            <SoftInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Grid>
          <Grid item xs={12} md={operationType === "TRUCK_TO_TRUCK" ? 4 : 8}>
            <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
              {operationType === "LOAD" ? "Xe nhận hàng" : "Xe nguồn"}
            </SoftTypography>
            <Autocomplete
              options={trucks}
              value={sourceTruck}
              onChange={(_, value) => {
                setSourceTruck(value);
                resetItems();
              }}
              getOptionLabel={(truck) => `${truck.code || ""} · ${truck.name || ""}`}
              renderInput={(params) => <TextField {...params} placeholder="Chọn xe" />}
            />
          </Grid>
          {operationType === "TRUCK_TO_TRUCK" && (
            <Grid item xs={12} md={4}>
              <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
                Xe nhận hàng
              </SoftTypography>
              <Autocomplete
                options={trucks.filter((truck) => idOf(truck) !== idOf(sourceTruck))}
                value={destinationTruck}
                onChange={(_, value) => setDestinationTruck(value)}
                getOptionLabel={(truck) => `${truck.code || ""} · ${truck.name || ""}`}
                renderInput={(params) => <TextField {...params} placeholder="Chọn xe nhận" />}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <SoftTypography variant="caption" fontWeight="bold" display="block" mb={0.5}>
              Hàng hoá
            </SoftTypography>
            <Autocomplete
              value={null}
              inputValue={productSearch}
              onInputChange={(_, value) => setProductSearch(value)}
              loading={loadingProducts}
              options={products.filter((product) => !selectedIds.has(idOf(product)))}
              onChange={(_, value) => addProduct(value)}
              filterOptions={(options) => options}
              getOptionLabel={(product) => `${product.code || ""} · ${product.name || ""}`}
              renderOption={(props, product) => (
                <li {...props} key={idOf(product)}>
                  <SoftBox display="flex" alignItems="center" gap={1} width="100%">
                    <EntityThumbnail entity={product} size={40} />
                    <SoftBox flex={1}>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {product.name}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {product.code} · Còn {quantityOf(product)} {product.unit || ""}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={
                    operationType === "LOAD"
                      ? "Tìm hàng đang có trong kho chính..."
                      : sourceTruck
                      ? "Tìm hàng đang có trên xe nguồn..."
                      : "Chọn xe nguồn trước"
                  }
                />
              )}
            />
          </Grid>
        </Grid>
        {items.map((item, index) => (
          <SoftBox
            key={item.productId}
            mt={1}
            p={1.25}
            bgcolor="#fff"
            borderRadius={2}
            display="flex"
            alignItems="center"
            gap={1}
            flexWrap={{ xs: "wrap", md: "nowrap" }}
            sx={{ border: "1px solid #dce3ec" }}
          >
            <EntityThumbnail entity={item.product} size={42} />
            <SoftBox flex={1} minWidth={180}>
              <SoftTypography variant="button" fontWeight="bold" display="block">
                {index + 1}. {item.product.name}
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                {item.product.code} · Còn {quantityOf(item.product)} {item.product.unit || ""}
              </SoftTypography>
            </SoftBox>
            <SoftBox display="flex" alignItems="center" gap={0.5}>
              <IconButton onClick={() => patchQuantity(index, item.qty - 1)}>
                <Icon>remove</Icon>
              </IconButton>
              <SoftInput
                type="number"
                value={item.qty}
                onChange={(event) => patchQuantity(index, event.target.value)}
                sx={{ width: 90, "& input": { textAlign: "center" } }}
              />
              <IconButton onClick={() => patchQuantity(index, item.qty + 1)}>
                <Icon>add</Icon>
              </IconButton>
              <IconButton
                onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              >
                <Icon color="error">delete</Icon>
              </IconButton>
            </SoftBox>
          </SoftBox>
        ))}
        <SoftBox mt={1.25}>
          <SoftInput
            multiline
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ghi chú trên phiếu"
          />
        </SoftBox>
        <SoftButton
          fullWidth
          color="info"
          variant="gradient"
          sx={{ mt: 1.5 }}
          disabled={saving}
          onClick={submit}
        >
          <Icon>picture_as_pdf</Icon>&nbsp;
          {saving
            ? "Đang xử lý..."
            : `Hoàn tất ${currentOperation.title.toLowerCase()} & xem phiếu`}
        </SoftButton>
      </SoftBox>
      <SoftTypography variant="h6" fontWeight="bold" mt={2.5} mb={1}>
        Phiếu điều chuyển trong ngày
      </SoftTypography>
      <Grid container spacing={1.25}>
        {history.map((transfer) => (
          <Grid item xs={12} md={6} lg={4} key={idOf(transfer)}>
            <SoftBox p={1.5} borderRadius={2} sx={{ border: "1px solid #e1e6ee" }}>
              <SoftBox display="flex" justifyContent="space-between" gap={1}>
                <SoftBox>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {transfer.code}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {operationName[transfer.type] || transfer.type} · {transfer.items?.length || 0}{" "}
                    mặt hàng
                  </SoftTypography>
                </SoftBox>
                <SoftButton size="small" color="info" onClick={() => printTransfer(transfer)}>
                  <Icon>visibility</Icon>&nbsp;Xem phiếu
                </SoftButton>
              </SoftBox>
            </SoftBox>
          </Grid>
        ))}
        {!history.length && (
          <Grid item xs={12}>
            <SoftTypography variant="caption" color="text">
              Chưa có phiếu điều chuyển trong ngày đã chọn.
            </SoftTypography>
          </Grid>
        )}
      </Grid>
      <PrintPreviewDialog
        open={Boolean(printPreview)}
        title={printPreview?.title || "Xem trước phiếu PDF"}
        html={printPreview?.html || ""}
        onClose={() => setPrintPreview(null)}
      />
    </SoftBox>
  );
}
