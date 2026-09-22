import { useCallback, useEffect, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import TextField from "@mui/material/TextField";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import EntityThumbnail from "components/EntityThumbnail";
import PrintPreviewDialog from "components/PrintPreviewDialog";
import { DailyReportService } from "services/dailyOperationsService";
import WarrantyReturnService from "services/warrantyReturnService";
import { TruckService } from "services/warehouseService";
import { buildDailyReportPdfHtml } from "utils/dailyOperationsPrint";
import { createTruckInventoryImages, downloadDataImage } from "utils/truckInventoryImage";
import QuickTruckOperations from "./QuickTruckOperations";
import { toast } from "react-toastify";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
const rows = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const idOf = (value) => value?.id || value?._id || "";
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const documentLabels = { SALE: "Bán hàng", DEBT_PAYMENT: "Thu nợ", CUSTOMER_RETURN: "Hoàn hàng" };
const emptyMeta = { area: "", performerName: "", vehicle: "", notes: "", issues: "" };
const emptyExpenses = { FUEL: "", MEAL: "", TOLL: "", OTHER: "" };
const warrantyStatus = {
  RECEIVED: { label: "Chờ bắt đầu", color: "#1565c0", background: "#e3f2fd" },
  PROCESSING: { label: "Đang bảo hành", color: "#ef6c00", background: "#fff3e0" },
};
const dailySections = [
  {
    title: "Điều chuyển hàng",
    shortTitle: "Điều chuyển",
    description: "Ứng lên xe, hoàn kho hoặc chuyển giữa các xe",
    icon: "swap_horiz",
    color: "#1565c0",
    background: "#e3f2fd",
  },
  {
    title: "Báo cáo cuối ngày",
    shortTitle: "Báo cáo ngày",
    description: "Tổng hợp doanh thu, chi phí và hàng đã bán",
    icon: "summarize",
    color: "#7b1fa2",
    background: "#f3e5f5",
  },
  {
    title: "Hàng bảo hành",
    shortTitle: "Bảo hành",
    description: "Tiếp nhận và theo dõi các phiếu đang xử lý",
    icon: "build_circle",
    color: "#ef6c00",
    background: "#fff3e0",
  },
  {
    title: "Ảnh hàng trên xe",
    shortTitle: "Ảnh hàng xe",
    description: "Chụp tồn hiện tại thành một ảnh để gửi nhanh",
    icon: "photo_camera",
    color: "#00897b",
    background: "#e0f2f1",
  },
];
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

function DailyReportTab() {
  const [date, setDate] = useState(today());
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [expenses, setExpenses] = useState(emptyExpenses);
  const [loading, setLoading] = useState(false);
  const [printPreview, setPrintPreview] = useState(null);

  const loadList = useCallback(
    () =>
      DailyReportService.list({ page: 1, limit: 100 })
        .then((response) => setSaved(rows(response)))
        .catch(() => setSaved([])),
    []
  );
  const loadPreview = useCallback(async () => {
    try {
      setLoading(true);
      setPreview(unwrap(await DailyReportService.preview(date)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tổng hợp báo cáo");
    } finally {
      setLoading(false);
    }
  }, [date]);
  useEffect(() => {
    loadPreview();
    loadList();
  }, [loadList, loadPreview]);

  const reportPayload = () => ({
    date,
    ...meta,
    area: meta.area || undefined,
    performerName: meta.performerName || undefined,
    vehicle: meta.vehicle || undefined,
    notes: meta.notes || undefined,
    issues: meta.issues || undefined,
    manualAdjustments: Object.entries(expenses)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([type, amount]) => ({
        type,
        label: { FUEL: "Dầu", MEAL: "Ăn", TOLL: "Trạm", OTHER: "Chi phí khác" }[type],
        amount: Number(amount),
      })),
  });

  const openSavePreview = () => {
    if (!preview) return toast.error("Chưa có dữ liệu tổng hợp để xem trước");
    const payload = reportPayload();
    const draft = {
      code: "BẢN XEM TRƯỚC",
      reportDate: date,
      ...meta,
      manualAdjustments: payload.manualAdjustments,
      snapshot: preview,
    };
    setPrintPreview({
      title: `Xem trước báo cáo ngày · ${date}`,
      html: buildDailyReportPdfHtml(draft),
      pending: payload,
    });
  };

  const create = async () => {
    const payload = printPreview?.pending;
    if (!payload) return;
    try {
      setLoading(true);
      const response = await DailyReportService.create(payload);
      const report = unwrap(response);
      toast.success("Đã chốt báo cáo ngày");
      await loadList();
      setPrintPreview({
        title: `Báo cáo ngày · ${report?.code || report?.reportDate || date}`,
        html: buildDailyReportPdfHtml(report),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể chốt báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const exportDoc = async (doc) => {
    try {
      setLoading(true);
      const response = await DailyReportService.detail(idOf(doc));
      const report = unwrap(response);
      setPrintPreview({
        title: `Báo cáo ngày · ${report?.code || report?.reportDate || ""}`,
        html: buildDailyReportPdfHtml(report),
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tạo file PDF");
    } finally {
      setLoading(false);
    }
  };

  const summary = preview?.summary || {};
  return (
    <SoftBox>
      <SoftBox display="flex" justifyContent="space-between" gap={1} flexWrap="wrap" mb={2}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold">
            Tổng hợp báo cáo ngày
          </SoftTypography>
          <SoftTypography variant="caption" color="text">
            Dữ liệu được tổng hợp tự động; thông tin bổ sung sẽ xuất đúng mẫu giấy A4.
          </SoftTypography>
        </SoftBox>
        <SoftBox display="flex" gap={1} flexWrap="wrap">
          <SoftInput
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            sx={{ width: 190 }}
          />
          <SoftButton color="info" variant="outlined" onClick={loadPreview} disabled={loading}>
            <Icon>refresh</Icon>&nbsp;Tổng hợp lại
          </SoftButton>
        </SoftBox>
      </SoftBox>
      {preview && (
        <>
          <Grid container spacing={1.25}>
            {[
              ["Chứng từ", summary.documentCount, "description", "#eef5ff"],
              ["Doanh thu bán", money(summary.salesRevenue), "payments", "#e8f5e9"],
              ["Tiền mặt", money(summary.cash), "account_balance_wallet", "#fff8e1"],
              ["Chuyển khoản", money(summary.bankTransfer), "account_balance", "#f3e5f5"],
              ["Doanh thu ròng", money(summary.netRevenue), "trending_up", "#e0f7fa"],
            ].map(([label, value, icon, background]) => (
              <Grid item xs={6} md key={label}>
                <SoftBox p={1.5} borderRadius={2} bgcolor={background} height="100%">
                  <Icon fontSize="small">{icon}</Icon>
                  <SoftTypography variant="caption" color="text" display="block">
                    {label}
                  </SoftTypography>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {value || 0}
                  </SoftTypography>
                </SoftBox>
              </Grid>
            ))}
          </Grid>
          <SoftBox mt={2} p={{ xs: 1.5, md: 2 }} borderRadius={2} bgcolor="#f7f9fc">
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
              Thông tin trên đầu phiếu
            </SoftTypography>
            <Grid container spacing={1.25}>
              {[
                ["area", "Địa bàn"],
                ["performerName", "Người thực hiện"],
                ["vehicle", "Phương tiện"],
              ].map(([key, label]) => (
                <Grid item xs={12} md={4} key={key}>
                  <SoftInput
                    value={meta[key]}
                    onChange={(event) => setMeta({ ...meta, [key]: event.target.value })}
                    placeholder={label}
                  />
                </Grid>
              ))}
            </Grid>
          </SoftBox>
          <Grid container spacing={2} mt={0.25}>
            <Grid item xs={12} lg={7}>
              <SoftTypography variant="button" fontWeight="bold">
                Chứng từ trong ngày
              </SoftTypography>
              {(preview.documents || []).map((doc) => (
                <SoftBox
                  key={`${doc.type}-${doc.id}`}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                  p={1}
                  mt={0.5}
                  borderRadius={1.5}
                  bgcolor="#fafafa"
                >
                  <SoftBox display="flex" alignItems="center" gap={1} minWidth={0}>
                    <EntityThumbnail entity={doc.customer || doc} type="customer" size={36} />
                    <SoftBox minWidth={0}>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {doc.customerName || "Khách lẻ"}
                      </SoftTypography>
                      <SoftTypography variant="caption" display="block" color="text">
                        {doc.code} · {documentLabels[doc.type] || doc.type} ·{" "}
                        {doc.paymentMethod || "—"}
                      </SoftTypography>
                    </SoftBox>
                  </SoftBox>
                  <SoftTypography variant="button" fontWeight="bold">
                    {money(doc.amount)}
                  </SoftTypography>
                </SoftBox>
              ))}
            </Grid>
            <Grid item xs={12} lg={5}>
              <SoftTypography variant="button" fontWeight="bold">
                Số hàng bán trong ngày
              </SoftTypography>
              {(preview.products || []).map((product) => (
                <SoftBox
                  key={product.productId}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={1}
                  mt={0.5}
                  bgcolor="#f3f8ff"
                  borderRadius={1.5}
                >
                  <SoftBox display="flex" alignItems="center" gap={1}>
                    <EntityThumbnail entity={product} size={36} />
                    <SoftTypography variant="button">{product.productName}</SoftTypography>
                  </SoftBox>
                  <SoftTypography variant="button" fontWeight="bold">
                    {product.quantity} {product.unit}
                  </SoftTypography>
                </SoftBox>
              ))}
            </Grid>
          </Grid>
          <SoftBox mt={2} p={{ xs: 1.5, md: 2 }} borderRadius={2} bgcolor="#fffaf0">
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
              Chi phí trong ngày
            </SoftTypography>
            <Grid container spacing={1.25}>
              {[
                ["FUEL", "Dầu"],
                ["MEAL", "Ăn"],
                ["TOLL", "Trạm"],
                ["OTHER", "Chi phí khác"],
              ].map(([key, label]) => (
                <Grid item xs={6} md={3} key={key}>
                  <SoftInput
                    type="number"
                    value={expenses[key]}
                    onChange={(event) => setExpenses({ ...expenses, [key]: event.target.value })}
                    placeholder={label}
                  />
                </Grid>
              ))}
            </Grid>
          </SoftBox>
          <Grid container spacing={1.25} mt={0.5}>
            <Grid item xs={12} md={6}>
              <SoftInput
                multiline
                rows={3}
                value={meta.notes}
                onChange={(event) => setMeta({ ...meta, notes: event.target.value })}
                placeholder="Ghi chú báo cáo"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <SoftInput
                multiline
                rows={3}
                value={meta.issues}
                onChange={(event) => setMeta({ ...meta, issues: event.target.value })}
                placeholder="Các vấn đề cần giải quyết ngay"
              />
            </Grid>
          </Grid>
          <SoftButton
            fullWidth
            color="success"
            variant="gradient"
            sx={{ mt: 1.5 }}
            disabled={loading}
            onClick={openSavePreview}
          >
            <Icon>visibility</Icon>&nbsp;Xem trước trước khi chốt báo cáo
          </SoftButton>
        </>
      )}
      <SoftTypography variant="h6" fontWeight="bold" mt={3} mb={1}>
        Báo cáo đã chốt
      </SoftTypography>
      {saved.map((doc) => (
        <SoftBox
          key={idOf(doc)}
          p={1.25}
          mb={1}
          borderRadius={2}
          sx={{ border: "1px solid #e1e6ee" }}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <SoftBox>
            <SoftTypography variant="button" fontWeight="bold">
              {doc.code}
            </SoftTypography>
            <SoftTypography variant="caption" display="block" color="text">
              {doc.reportDate} · {doc.performerName || "Chưa ghi người thực hiện"}
            </SoftTypography>
          </SoftBox>
          <SoftButton size="small" color="info" onClick={() => exportDoc(doc)} disabled={loading}>
            <Icon>visibility</Icon>&nbsp;Xem PDF
          </SoftButton>
        </SoftBox>
      ))}
      <PrintPreviewDialog
        open={Boolean(printPreview)}
        title={printPreview?.title || "Xem trước báo cáo PDF"}
        html={printPreview?.html || ""}
        onClose={() => setPrintPreview(null)}
        description={
          printPreview?.pending
            ? "Kiểm tra toàn bộ báo cáo trước khi xác nhận chốt và lưu dữ liệu."
            : "Báo cáo đã được chốt. Bạn có thể in hoặc lưu PDF."
        }
        onConfirm={printPreview?.pending ? create : undefined}
        confirmLabel="Xác nhận chốt báo cáo"
        confirming={loading}
      />
    </SoftBox>
  );
}

function DailyWarrantyTab() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({});
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryResponse, receivedResponse, processingResponse] = await Promise.all([
        WarrantyReturnService.getSummary(),
        WarrantyReturnService.getAll({ status: "RECEIVED", page: 1, limit: 50 }),
        WarrantyReturnService.getAll({ status: "PROCESSING", page: 1, limit: 50 }),
      ]);
      setSummary(unwrap(summaryResponse) || {});
      setDocuments(
        [...rows(receivedResponse), ...rows(processingResponse)].sort(
          (left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
        )
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải nghiệp vụ bảo hành");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startWarranty = async (document) => {
    try {
      setWorkingId(String(idOf(document)));
      await WarrantyReturnService.start(idOf(document));
      toast.success(`Đã bắt đầu xử lý ${document.code}`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể bắt đầu xử lý bảo hành");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <SoftBox>
      <SoftBox display="flex" justifyContent="space-between" gap={1} flexWrap="wrap" mb={2}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold">
            Công việc bảo hành trong ngày
          </SoftTypography>
          <SoftTypography variant="caption" color="text">
            Theo dõi phiếu chờ tiếp nhận và hàng đang được bảo hành.
          </SoftTypography>
        </SoftBox>
        <SoftBox display="flex" gap={1}>
          <SoftButton color="secondary" variant="outlined" onClick={load} disabled={loading}>
            <Icon>refresh</Icon>&nbsp;Làm mới
          </SoftButton>
          <SoftButton color="info" variant="gradient" onClick={() => navigate("/warranty-returns")}>
            <Icon>add</Icon>&nbsp;Tiếp nhận bảo hành
          </SoftButton>
        </SoftBox>
      </SoftBox>

      <Grid container spacing={1.25} mb={2}>
        {[
          ["Chờ bắt đầu", summary.receivedDocuments || 0, "inbox", "#e3f2fd", "#1565c0"],
          [
            "Đang bảo hành",
            summary.processingDocuments || 0,
            "build",
            "#fff3e0",
            "#ef6c00",
          ],
          ["Tồn quá 7 ngày", summary.staleDocuments || 0, "warning", "#ffebee", "#c62828"],
          [
            "Hoàn tất hôm nay",
            summary.completedToday || 0,
            "task_alt",
            "#e8f5e9",
            "#2e7d32",
          ],
        ].map(([label, value, icon, background, color]) => (
          <Grid item xs={6} md={3} key={label}>
            <SoftBox p={1.5} borderRadius={2} bgcolor={background} height="100%">
              <Icon sx={{ color }}>{icon}</Icon>
              <SoftTypography variant="caption" color="text" display="block">
                {label}
              </SoftTypography>
              <SoftTypography variant="h5" fontWeight="bold" sx={{ color }}>
                {value}
              </SoftTypography>
            </SoftBox>
          </Grid>
        ))}
      </Grid>

      {loading && (
        <SoftTypography variant="button" color="text" display="block" textAlign="center" py={4}>
          Đang tải công việc bảo hành...
        </SoftTypography>
      )}
      {!loading &&
        documents.map((document) => {
          const status = warrantyStatus[document.status] || warrantyStatus.RECEIVED;
          return (
            <SoftBox
              key={idOf(document)}
              p={1.5}
              mb={1}
              borderRadius={2}
              sx={{ border: "1px solid #e1e6ee" }}
            >
              <SoftBox display="flex" justifyContent="space-between" gap={1} alignItems="start">
                <SoftBox minWidth={0}>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {document.code}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text" display="block">
                    {dateTime(document.createdAt)} · {document.customerName || "Chưa ghi khách hàng"}
                  </SoftTypography>
                </SoftBox>
                <SoftBox
                  px={1}
                  py={0.4}
                  borderRadius={2}
                  sx={{ bgcolor: status.background, color: status.color, fontSize: 12, fontWeight: 700 }}
                >
                  {status.label}
                </SoftBox>
              </SoftBox>
              <SoftTypography variant="caption" display="block" mt={0.75}>
                {document.reason} · {document.totalQuantity || 0} sản phẩm
              </SoftTypography>
              <SoftBox display="flex" justifyContent="flex-end" gap={0.75} mt={1}>
                {document.status === "RECEIVED" && (
                  <SoftButton
                    size="small"
                    color="warning"
                    variant="gradient"
                    disabled={workingId === String(idOf(document))}
                    onClick={() => startWarranty(document)}
                  >
                    <Icon>play_arrow</Icon>&nbsp;Bắt đầu xử lý
                  </SoftButton>
                )}
                <SoftButton
                  size="small"
                  color="info"
                  variant="outlined"
                  onClick={() => navigate("/warranty-returns")}
                >
                  Mở chi tiết
                </SoftButton>
              </SoftBox>
            </SoftBox>
          );
        })}
      {!loading && !documents.length && (
        <SoftTypography variant="caption" color="text" display="block" textAlign="center" py={4}>
          Không có phiếu bảo hành đang chờ xử lý.
        </SoftTypography>
      )}
    </SoftBox>
  );
}

function TruckInventoryImageTab() {
  const [trucks, setTrucks] = useState([]);
  const [truck, setTruck] = useState(null);
  const [detail, setDetail] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    TruckService.getAll({ page: 1, limit: 100, status: "active", sortBy: "code", sortOrder: "asc" })
      .then((response) => active && setTrucks(rows(response)))
      .catch((error) =>
        active && toast.error(error.response?.data?.message || "Không thể tải danh sách xe")
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!truck) {
      setDetail(null);
      setImage(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setImage(null);
    TruckService.getById(idOf(truck))
      .then((response) => active && setDetail(unwrap(response) || truck))
      .catch((error) =>
        active && toast.error(error.response?.data?.message || "Không thể tải hàng hiện có trên xe")
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [truck]);

  const inventory = detail?.inventory || detail?.items || [];
  const totalQuantity = inventory.reduce(
    (sum, item) => sum + Number(item.quantity ?? item.qty ?? 0),
    0
  );
  const createImage = () => {
    if (!detail || !inventory.length) return toast.error("Xe hiện không có hàng để tạo ảnh");
    try {
      const pages = createTruckInventoryImages({
        truck: detail,
        driverName: detail.driver?.fullName || detail.driverName || "Chưa phân công",
        driverPhone: detail.driver?.phone || detail.driverPhone || "—",
        rows: inventory.map((item) => ({
          name: item.name || item.productName || item.product?.name || "Sản phẩm",
          unit: item.unit || item.product?.unit || "—",
          quantity: Number(item.quantity ?? item.qty ?? 0),
        })),
      });
      setImage(pages[0]);
    } catch (error) {
      toast.error(error?.message || "Không thể tạo ảnh hàng hóa trên xe");
    }
  };

  return (
    <SoftBox>
      <SoftBox mb={2}>
        <SoftTypography variant="h6" fontWeight="bold">
          Chụp ảnh hàng hóa hiện tại trên xe
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          Chọn xe, kiểm tra tồn hiện tại, xem trước rồi tải một ảnh PNG chia hai cột.
        </SoftTypography>
      </SoftBox>
      <Autocomplete
        options={trucks}
        value={truck}
        onChange={(_, value) => setTruck(value)}
        getOptionLabel={(item) => `${item.code || ""} · ${item.name || ""}`}
        renderInput={(params) => <TextField {...params} label="Chọn xe" placeholder="Tìm xe..." />}
      />

      {loading && (
        <SoftTypography variant="button" color="text" display="block" textAlign="center" py={5}>
          Đang tải tồn xe hiện tại...
        </SoftTypography>
      )}
      {!loading && detail && (
        <>
          <Grid container spacing={1.25} mt={0.5} mb={2}>
            {[
              ["Tên xe", detail.name || "—", "local_shipping", "#e3f2fd"],
              ["Loại hàng", inventory.length, "category", "#f3e5f5"],
              ["Tổng số lượng", totalQuantity, "inventory_2", "#e8f5e9"],
            ].map(([label, value, icon, background]) => (
              <Grid item xs={12} md={4} key={label}>
                <SoftBox p={1.5} borderRadius={2} bgcolor={background} height="100%">
                  <Icon>{icon}</Icon>
                  <SoftTypography variant="caption" color="text" display="block">
                    {label}
                  </SoftTypography>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {value}
                  </SoftTypography>
                </SoftBox>
              </Grid>
            ))}
          </Grid>
          <SoftButton
            fullWidth
            color="info"
            variant="gradient"
            disabled={!inventory.length}
            onClick={createImage}
          >
            <Icon>photo_camera</Icon>&nbsp;Tạo và xem trước ảnh
          </SoftButton>
        </>
      )}

      {image && (
        <SoftBox mt={2} borderRadius={2} overflow="hidden" bgcolor="#263238" p={{ xs: 1, md: 2 }}>
          <img
            src={image.url}
            alt={`Hàng hóa hiện tại trên xe ${detail?.name || ""}`}
            style={{ display: "block", width: "100%", maxWidth: 900, height: "auto", margin: "auto" }}
          />
          <SoftButton
            fullWidth
            color="success"
            variant="gradient"
            sx={{ mt: 1.5 }}
            onClick={() => downloadDataImage(image.url, image.fileName)}
          >
            <Icon>download</Icon>&nbsp;Tải ảnh PNG
          </SoftButton>
        </SoftBox>
      )}
    </SoftBox>
  );
}

export default function DailyOperationsV2() {
  const [tab, setTab] = useState(0);
  const activeSection = dailySections[tab];
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3} pb={{ xs: 10, md: 3 }}>
        <SoftBox
          mb={2}
          p={{ xs: 2, md: 3 }}
          borderRadius={3}
          sx={{
            color: "#fff",
            background: "linear-gradient(135deg, #0f4c81 0%, #1976d2 55%, #26a69a 100%)",
            boxShadow: "0 12px 32px rgba(21, 101, 192, 0.2)",
          }}
        >
          <SoftBox display="flex" alignItems="center" gap={1.5}>
            <SoftBox
              width={{ xs: 48, md: 58 }}
              height={{ xs: 48, md: 58 }}
              borderRadius={2.5}
              display="flex"
              alignItems="center"
              justifyContent="center"
              sx={{ bgcolor: "rgba(255,255,255,0.18)", flexShrink: 0 }}
            >
              <Icon sx={{ color: "#fff", fontSize: { xs: 28, md: 34 } }}>today</Icon>
            </SoftBox>
            <SoftBox>
              <SoftTypography variant="h4" fontWeight="bold" sx={{ color: "#fff" }}>
                Nghiệp vụ trong ngày
              </SoftTypography>
              <SoftTypography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
                Chọn công việc cần làm, kiểm tra bản xem trước rồi mới xác nhận lưu.
              </SoftTypography>
            </SoftBox>
          </SoftBox>
        </SoftBox>

        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} lg={3}>
            <SoftBox
              p={{ xs: 1.25, md: 1.5 }}
              borderRadius={3}
              bgcolor="#fff"
              sx={{
                border: "1px solid #e2e8f0",
                position: { lg: "sticky" },
                top: { lg: 96, xl: 24 },
                boxShadow: "0 8px 24px rgba(15, 45, 75, 0.06)",
              }}
            >
              <SoftTypography variant="button" fontWeight="bold" display="block" mb={1.25}>
                Chọn nghiệp vụ
              </SoftTypography>
              <SoftBox
                display="grid"
                gap={1}
                sx={{ gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "1fr" } }}
              >
                {dailySections.map((section, index) => {
                  const selected = tab === index;
                  return (
                    <SoftBox
                      key={section.title}
                      component="button"
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setTab(index)}
                      p={{ xs: 1.25, md: 1.5 }}
                      minHeight={{ xs: 112, lg: 96 }}
                      borderRadius={2.5}
                      textAlign="left"
                      display="flex"
                      flexDirection={{ xs: "column", lg: "row" }}
                      alignItems={{ xs: "flex-start", lg: "center" }}
                      gap={1.1}
                      sx={{
                        border: selected
                          ? `2px solid ${section.color}`
                          : "1px solid #dfe5ec",
                        bgcolor: selected ? section.background : "#fff",
                        color: section.color,
                        position: "relative",
                        cursor: "pointer",
                        transition: "transform 150ms ease, box-shadow 150ms ease",
                        boxShadow: selected ? `0 6px 18px ${section.color}22` : "none",
                        "&:hover": { transform: "translateY(-1px)", boxShadow: 2 },
                        "&:focus-visible": {
                          outline: `3px solid ${section.color}44`,
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <SoftBox
                        width={40}
                        height={40}
                        borderRadius={2}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        sx={{ bgcolor: selected ? "#fff" : section.background, flexShrink: 0 }}
                      >
                        <Icon sx={{ color: section.color }}>{section.icon}</Icon>
                      </SoftBox>
                      <SoftBox minWidth={0} flex={1}>
                        <SoftTypography
                          variant="button"
                          fontWeight="bold"
                          display="block"
                          sx={{ color: "#263238", lineHeight: 1.25 }}
                        >
                          <SoftBox component="span" display={{ xs: "none", sm: "inline" }}>
                            {section.title}
                          </SoftBox>
                          <SoftBox component="span" display={{ xs: "inline", sm: "none" }}>
                            {section.shortTitle}
                          </SoftBox>
                        </SoftTypography>
                        <SoftTypography
                          variant="caption"
                          color="text"
                          display={{ xs: "none", lg: "block" }}
                          sx={{ lineHeight: 1.35 }}
                        >
                          {section.description}
                        </SoftTypography>
                      </SoftBox>
                      {selected && (
                        <Icon
                          sx={{
                            color: section.color,
                            position: { xs: "absolute", lg: "static" },
                            top: { xs: 10 },
                            right: { xs: 10 },
                          }}
                        >
                          check_circle
                        </Icon>
                      )}
                    </SoftBox>
                  );
                })}
              </SoftBox>
            </SoftBox>
          </Grid>

          <Grid item xs={12} lg={9}>
            <SoftBox
              bgcolor="#fff"
              borderRadius={3}
              overflow="hidden"
              sx={{ border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15,45,75,0.06)" }}
            >
              <SoftBox
                px={{ xs: 1.5, md: 2.5 }}
                py={1.5}
                display="flex"
                alignItems="center"
                gap={1.25}
                sx={{ bgcolor: activeSection.background, borderBottom: `1px solid ${activeSection.color}22` }}
              >
                <SoftBox
                  width={42}
                  height={42}
                  borderRadius={2}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  sx={{ bgcolor: "#fff", color: activeSection.color, flexShrink: 0 }}
                >
                  <Icon>{activeSection.icon}</Icon>
                </SoftBox>
                <SoftBox minWidth={0}>
                  <SoftTypography variant="h6" fontWeight="bold">
                    {activeSection.title}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {activeSection.description}
                  </SoftTypography>
                </SoftBox>
              </SoftBox>
              <SoftBox p={{ xs: 1.5, md: 2.5 }}>
                {tab === 0 && <QuickTruckOperations />}
                {tab === 1 && <DailyReportTab />}
                {tab === 2 && <DailyWarrantyTab />}
                {tab === 3 && <TruckInventoryImageTab />}
              </SoftBox>
            </SoftBox>
          </Grid>
        </Grid>
      </SoftBox>
    </DashboardLayout>
  );
}
