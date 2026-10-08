import { useCallback, useEffect, useMemo, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Modal from "@mui/material/Modal";
import Select from "@mui/material/Select";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import PrintPreviewDialog from "components/PrintPreviewDialog";
import { DashboardAnalyticsService } from "services/analyticsService";
import { CustomerService } from "services/crmService";
import { buildNewCustomersDocument, createNewCustomersCanvasImage } from "utils/newCustomersExport";
import { downloadBlob } from "utils/excel";
import { toast } from "react-toastify";

const idOf = (item) => String(item?.id || item?._id || "");
const number = (value) => Number(value || 0).toLocaleString("vi-VN");
const date = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour12: false,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const qualificationLabels = {
  CREATED: "Mới thêm vào hệ thống",
  CODE_ASSIGNED: "Mới được cấp mã",
  CODE_CHANGED: "Được gán/đổi từ mã cũ",
};
const carePurposes = [
  ["WELCOME", "Chào hỏi & làm quen"],
  ["AFTER_SALE", "Hỏi thăm sau mua hàng"],
  ["NEEDS", "Tìm hiểu nhu cầu"],
  ["COMPLAINT", "Tiếp nhận vấn đề"],
  ["OTHER", "Nội dung khác"],
];
const careOutcomes = [
  ["POSITIVE", "Phản hồi tốt", "#e8f5e9", "#2e7d32"],
  ["NEUTRAL", "Đã trao đổi", "#e3f2fd", "#1565c0"],
  ["NEEDS_SUPPORT", "Cần hỗ trợ", "#fff3e0", "#ef6c00"],
  ["CALL_BACK", "Hẹn gọi lại", "#f3e5f5", "#7b1fa2"],
  ["NO_ANSWER", "Không nghe máy", "#f5f5f5", "#616161"],
  ["WRONG_NUMBER", "Sai số", "#ffebee", "#c62828"],
  ["NOT_INTERESTED", "Chưa quan tâm", "#fff8e1", "#9e6c00"],
];
const outcomeLabel = (value) => careOutcomes.find(([key]) => key === value)?.[1] || value || "—";
const newCareForm = () => ({
  purpose: "AFTER_SALE",
  outcome: "NEUTRAL",
  action: "",
  note: "",
  followUpRequired: false,
  nextFollowUpAt: "",
});

export default function NewCustomersTab() {
  const days = 45;
  const [invoiceCount, setInvoiceCount] = useState("ALL");
  const [careStatus, setCareStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [candidateCount, setCandidateCount] = useState(0);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [careDialog, setCareDialog] = useState(null);
  const [careForm, setCareForm] = useState(newCareForm);
  const [careHistory, setCareHistory] = useState([]);
  const [careHistoryLoading, setCareHistoryLoading] = useState(false);
  const [savingCare, setSavingCare] = useState(false);
  const [exportingCare, setExportingCare] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await DashboardAnalyticsService.newCustomers({
        days,
        invoiceCount,
        limit: 500,
      });
      const rows = response?.data?.data || [];
      setItems(Array.isArray(rows) ? rows : []);
      setCandidateCount(Number(response?.data?.meta?.candidateCount || 0));
      setSelected((Array.isArray(rows) ? rows : []).map(idOf).filter(Boolean));
    } catch (error) {
      setItems([]);
      setCandidateCount(0);
      setSelected([]);
      toast.error(error.response?.data?.message || "Không thể tải khách hàng mới");
    } finally {
      setLoading(false);
    }
  }, [invoiceCount]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    return items.filter((item) => {
      const matchesSearch = keyword
        ? `${item.customerCode || ""} ${item.customerName || ""} ${item.phone || ""}`
            .toLocaleLowerCase("vi")
            .includes(keyword)
        : true;
      const matchesCare =
        careStatus === "NOT_CONTACTED"
          ? !item.careInteractionCount
          : careStatus === "CONTACTED"
          ? Boolean(item.careInteractionCount)
          : careStatus === "FOLLOW_UP"
          ? Boolean(item.latestCareInteraction?.followUpRequired)
          : true;
      return matchesSearch && matchesCare;
    });
  }, [items, search, careStatus]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedRows = useMemo(
    () => filtered.filter((item) => selectedSet.has(idOf(item))),
    [filtered, selectedSet]
  );
  const visibleIds = filtered.map(idOf).filter(Boolean);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const toggleAll = () =>
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    );
  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  const reportRows = selectedRows;
  const ensureRows = () => {
    if (reportRows.length) return true;
    toast.warning("Hãy chọn ít nhất một khách hàng để xuất báo cáo");
    return false;
  };
  const openPreview = () => {
    if (!ensureRows()) return;
    setPreview(buildNewCustomersDocument({ rows: reportRows, days }));
  };
  const downloadImage = () => {
    if (!ensureRows()) return;
    createNewCustomersCanvasImage({ rows: reportRows, days });
    toast.success(`Đã tải ảnh báo cáo ${reportRows.length} khách hàng`);
  };
  const totalInvoices = reportRows.reduce((sum, item) => sum + Number(item.invoiceCount || 0), 0);
  const revenue = reportRows.reduce((sum, item) => sum + Number(item.totalRevenue || 0), 0);
  const caredCount = items.filter((item) => item.careInteractionCount > 0).length;
  const openCareDialog = async (item) => {
    setCareDialog(item);
    setCareForm(newCareForm());
    setCareHistory([]);
    setCareHistoryLoading(true);
    try {
      const response = await CustomerService.getById(idOf(item));
      const customer = response?.data?.data || response?.data || {};
      setCareHistory(
        (customer.interactions || []).filter(
          (interaction) => interaction.context === "NEW_CUSTOMER_CARE"
        )
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải lịch sử chăm sóc");
    } finally {
      setCareHistoryLoading(false);
    }
  };
  const selectOutcome = (outcome) =>
    setCareForm((current) => ({
      ...current,
      outcome,
      followUpRequired: outcome === "CALL_BACK" || outcome === "NO_ANSWER",
      nextFollowUpAt:
        outcome === "CALL_BACK" || outcome === "NO_ANSWER" ? current.nextFollowUpAt : "",
    }));
  const saveCareInteraction = async () => {
    if (!careDialog) return;
    if (careForm.followUpRequired && !careForm.nextFollowUpAt)
      return toast.warning("Hãy chọn thời gian cần gọi lại");
    try {
      setSavingCare(true);
      await CustomerService.addInteraction(idOf(careDialog), {
        channel: "PHONE",
        context: "NEW_CUSTOMER_CARE",
        purpose: careForm.purpose,
        outcome: careForm.outcome,
        action: careForm.action.trim() || outcomeLabel(careForm.outcome),
        result: outcomeLabel(careForm.outcome),
        note: careForm.note.trim() || undefined,
        phone: careDialog.phone || undefined,
        occurredAt: new Date().toISOString(),
        followUpRequired: careForm.followUpRequired,
        nextFollowUpAt:
          careForm.followUpRequired && careForm.nextFollowUpAt
            ? new Date(careForm.nextFollowUpAt).toISOString()
            : undefined,
      });
      toast.success("Đã lưu nội dung chăm sóc khách hàng");
      setCareDialog(null);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu nội dung chăm sóc");
    } finally {
      setSavingCare(false);
    }
  };
  const exportCareReport = async () => {
    if (!ensureRows()) return;
    try {
      setExportingCare(true);
      const response = await DashboardAnalyticsService.exportNewCustomerCare({
        days,
        invoiceCount,
        limit: 500,
        customerIds: reportRows.map(idOf).filter(Boolean),
      });
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      downloadBlob(response.data, `${today}_BAOCAO_TUONGTAC_KHM.xlsx`);
      toast.success(`Đã xuất báo cáo tương tác của ${reportRows.length} khách hàng`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xuất báo cáo tương tác");
    } finally {
      setExportingCare(false);
    }
  };

  return (
    <SoftBox>
      <SoftBox display="flex" justifyContent="space-between" gap={1} flexWrap="wrap" mb={2}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold">
            Khách hàng mới trong 45 ngày
          </SoftTypography>
          <SoftTypography variant="caption" color="text">
            Khách được tạo mới hoặc cấp/đổi mã trong 45 ngày, sau đó phát sinh 1–2 đơn để tiếp tục
            chăm sóc.
          </SoftTypography>
        </SoftBox>
        <SoftButton color="info" variant="outlined" onClick={load} disabled={loading}>
          <Icon>refresh</Icon>&nbsp;{loading ? "Đang tải..." : "Cập nhật"}
        </SoftButton>
      </SoftBox>

      <SoftBox display="flex" gap={1} flexWrap="wrap" mb={1.5}>
        {[
          ["ALL", "Tất cả 1–2 đơn"],
          ["1", "Đúng 1 đơn"],
          ["2", "Đúng 2 đơn"],
        ].map(([value, label]) => (
          <SoftButton
            key={value}
            size="small"
            color={invoiceCount === value ? "info" : "secondary"}
            variant={invoiceCount === value ? "gradient" : "outlined"}
            onClick={() => setInvoiceCount(value)}
          >
            {label}
          </SoftButton>
        ))}
      </SoftBox>

      <SoftBox display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1.5}>
        <SoftTypography variant="caption" fontWeight="bold" color="text">
          Trạng thái CSKH:
        </SoftTypography>
        {[
          ["ALL", "Tất cả"],
          ["NOT_CONTACTED", "Chưa gọi"],
          ["CONTACTED", "Đã chăm sóc"],
          ["FOLLOW_UP", "Cần gọi lại"],
        ].map(([value, label]) => (
          <SoftButton
            key={value}
            size="small"
            color={careStatus === value ? "success" : "secondary"}
            variant={careStatus === value ? "gradient" : "outlined"}
            onClick={() => setCareStatus(value)}
          >
            {label}
          </SoftButton>
        ))}
      </SoftBox>

      <SoftBox
        display="grid"
        gap={1}
        mb={2}
        sx={{ gridTemplateColumns: { xs: "1fr", md: "minmax(220px,1fr) repeat(5,135px)" } }}
      >
        <SoftInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm mã, tên hoặc số điện thoại..."
          icon={{ component: "search", direction: "left" }}
        />
        {[
          ["Khách mới đã quét", number(candidateCount)],
          ["Đã chăm sóc", number(caredCount)],
          ["Đã chọn", number(reportRows.length)],
          ["Tổng hóa đơn", number(totalInvoices)],
          ["Doanh thu", `${number(revenue)} đ`],
        ].map(([label, value]) => (
          <SoftBox
            key={label}
            p={1.25}
            borderRadius={2}
            sx={{ bgcolor: "#eef6ff", border: "1px solid #cfe3fa" }}
          >
            <SoftTypography variant="caption" color="text">
              {label}
            </SoftTypography>
            <SoftTypography variant="h6" fontWeight="bold" color="info">
              {value}
            </SoftTypography>
          </SoftBox>
        ))}
      </SoftBox>

      <SoftBox
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        gap={1}
        flexWrap="wrap"
        p={1.25}
        mb={1}
        borderRadius={2}
        sx={{ bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <SoftBox display="flex" alignItems="center">
          <Checkbox checked={allVisibleSelected} onChange={toggleAll} />
          <SoftTypography variant="button" fontWeight="bold">
            Chọn tất cả {filtered.length} khách hàng đang hiển thị
          </SoftTypography>
        </SoftBox>
        <SoftBox display="flex" gap={1} flexWrap="wrap">
          <SoftButton
            color="success"
            variant="gradient"
            disabled={!reportRows.length || exportingCare}
            onClick={exportCareReport}
          >
            <Icon>table_view</Icon>&nbsp;
            {exportingCare ? "Đang xuất..." : "Báo cáo tương tác Excel"}
          </SoftButton>
          <SoftButton
            color="info"
            variant="gradient"
            disabled={!reportRows.length}
            onClick={openPreview}
          >
            <Icon>picture_as_pdf</Icon>&nbsp;Xem trước / Lưu PDF
          </SoftButton>
          <SoftButton
            color="dark"
            variant="gradient"
            disabled={!reportRows.length}
            onClick={downloadImage}
          >
            <Icon>image</Icon>&nbsp;Tải ảnh PNG
          </SoftButton>
        </SoftBox>
      </SoftBox>

      <SoftBox display="grid" gap={1}>
        {!loading && !filtered.length && (
          <SoftBox p={4} textAlign="center" borderRadius={2} sx={{ border: "1px dashed #cbd5e1" }}>
            <SoftTypography variant="button" color="text">
              Không có khách hàng phù hợp với bộ lọc.
            </SoftTypography>
          </SoftBox>
        )}
        {filtered.map((item) => {
          const id = idOf(item);
          const checked = selectedSet.has(id);
          return (
            <SoftBox
              key={id}
              display="grid"
              alignItems="center"
              gap={1.25}
              p={1.25}
              borderRadius={2}
              sx={{
                gridTemplateColumns: { xs: "auto minmax(0,1fr)", md: "auto minmax(0,1fr) auto" },
                border: checked ? "2px solid #1976d2" : "1px solid #e2e8f0",
                bgcolor: checked ? "#f2f8ff" : "#fff",
              }}
            >
              <Checkbox
                checked={checked}
                onChange={() => toggle(id)}
                inputProps={{ "aria-label": "Chọn khách hàng để xuất báo cáo" }}
              />
              <SoftBox minWidth={0}>
                <SoftTypography variant="button" fontWeight="bold" display="block">
                  {[item.customerCode, item.customerName].filter(Boolean).join(" · ")}
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {item.phone || "Chưa có SĐT"} · {item.address || "Chưa có địa chỉ"}
                </SoftTypography>
                <SoftTypography variant="caption" color="info" display="block" fontWeight="bold">
                  {qualificationLabels[item.qualificationReason] || "Khách mới"} · Từ ngày{" "}
                  {date(item.customerQualifiedAt)}
                </SoftTypography>
                {item.latestCareInteraction ? (
                  <SoftTypography
                    variant="caption"
                    color={item.latestCareInteraction.followUpRequired ? "warning" : "success"}
                    display="block"
                    fontWeight="bold"
                  >
                    {outcomeLabel(item.latestCareInteraction.outcome)} · Lần gần nhất{" "}
                    {date(item.latestCareInteraction.occurredAt)}
                    {item.latestCareInteraction.followUpRequired
                      ? ` · Gọi lại ${dateTime(item.latestCareInteraction.nextFollowUpAt)}`
                      : ""}
                  </SoftTypography>
                ) : (
                  <SoftTypography variant="caption" color="error" display="block" fontWeight="bold">
                    Chưa gọi chăm sóc
                  </SoftTypography>
                )}
              </SoftBox>
              <SoftBox
                textAlign={{ xs: "left", md: "right" }}
                sx={{ gridColumn: { xs: "2", md: "auto" } }}
              >
                <SoftTypography variant="button" fontWeight="bold" color="info" display="block">
                  {item.invoiceCount} đơn · {number(item.totalRevenue)} đ
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  {date(item.firstInvoiceAt)} → {date(item.latestInvoiceAt)}
                </SoftTypography>
                <SoftBox mt={0.75}>
                  <SoftButton
                    size="small"
                    color={item.latestCareInteraction?.followUpRequired ? "warning" : "success"}
                    variant="gradient"
                    onClick={() => openCareDialog(item)}
                  >
                    <Icon>phone_in_talk</Icon>&nbsp;
                    {item.careInteractionCount ? "Gọi / cập nhật" : "Gọi chăm sóc"}
                  </SoftButton>
                </SoftBox>
              </SoftBox>
            </SoftBox>
          );
        })}
      </SoftBox>

      <Modal open={Boolean(careDialog)} onClose={() => !savingCare && setCareDialog(null)}>
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: 0, sm: "50%" },
            left: { xs: 0, sm: "50%" },
            transform: { xs: "none", sm: "translate(-50%, -50%)" },
            width: { xs: "100%", sm: "calc(100% - 32px)" },
            maxWidth: 820,
            maxHeight: { xs: "100dvh", sm: "calc(100dvh - 32px)" },
            overflowY: "auto",
            bgcolor: "#fff",
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: 24,
            p: { xs: 2, sm: 3 },
          }}
        >
          <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
            <SoftBox>
              <SoftTypography variant="h5" fontWeight="bold">
                Gọi điện chăm sóc khách hàng
              </SoftTypography>
              <SoftTypography variant="button" color="text">
                {[careDialog?.customerCode, careDialog?.customerName].filter(Boolean).join(" · ")}
              </SoftTypography>
            </SoftBox>
            <SoftButton
              size="small"
              color="secondary"
              variant="outlined"
              onClick={() => setCareDialog(null)}
            >
              Đóng
            </SoftButton>
          </SoftBox>

          <SoftBox
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={1}
            flexWrap="wrap"
            p={1.5}
            my={2}
            borderRadius={2}
            sx={{ bgcolor: "#eef7ff", border: "1px solid #cfe3fa" }}
          >
            <SoftBox>
              <SoftTypography variant="caption" color="text">
                Số điện thoại
              </SoftTypography>
              <SoftTypography variant="h6" fontWeight="bold" color="info">
                {careDialog?.phone || "Chưa có số điện thoại"}
              </SoftTypography>
            </SoftBox>
            <SoftButton
              component="a"
              href={careDialog?.phone ? `tel:${careDialog.phone}` : undefined}
              disabled={!careDialog?.phone}
              color="success"
              variant="gradient"
            >
              <Icon>call</Icon>&nbsp;Bắt đầu gọi
            </SoftButton>
          </SoftBox>

          <SoftBox
            display="grid"
            gap={2}
            sx={{ gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}
          >
            <SoftBox>
              <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.5}>
                Mục đích cuộc gọi
              </SoftTypography>
              <FormControl fullWidth size="small">
                <Select
                  value={careForm.purpose}
                  onChange={(event) =>
                    setCareForm((current) => ({ ...current, purpose: event.target.value }))
                  }
                >
                  {carePurposes.map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </SoftBox>
            <SoftBox>
              <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.5}>
                Kết quả cuộc gọi
              </SoftTypography>
              <SoftBox display="flex" gap={0.75} flexWrap="wrap">
                {careOutcomes.map(([value, label, background, color]) => (
                  <SoftBox
                    key={value}
                    component="button"
                    type="button"
                    onClick={() => selectOutcome(value)}
                    px={1.25}
                    py={0.75}
                    borderRadius={2}
                    sx={{
                      border:
                        careForm.outcome === value ? `2px solid ${color}` : "1px solid #d8dee8",
                      bgcolor: careForm.outcome === value ? background : "#fff",
                      color,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </SoftBox>
                ))}
              </SoftBox>
            </SoftBox>
          </SoftBox>

          <SoftBox mt={2}>
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.5}>
              Nội dung trao đổi
            </SoftTypography>
            <SoftInput
              multiline
              minRows={3}
              value={careForm.action}
              onChange={(event) =>
                setCareForm((current) => ({ ...current, action: event.target.value }))
              }
              placeholder="Khách đang quan tâm sản phẩm nào, phản hồi về hàng hóa/dịch vụ ra sao..."
            />
          </SoftBox>
          <SoftBox mt={1.5}>
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.5}>
              Ghi chú cho lần chăm sóc tiếp theo
            </SoftTypography>
            <SoftInput
              multiline
              minRows={2}
              value={careForm.note}
              onChange={(event) =>
                setCareForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Ví dụ: quan tâm dầu máy, gọi lại sau khi kiểm tra tồn kho..."
            />
          </SoftBox>

          <SoftBox
            mt={2}
            p={1.5}
            borderRadius={2}
            sx={{
              bgcolor: careForm.followUpRequired ? "#fff8e1" : "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <SoftBox display="flex" alignItems="center">
              <Checkbox
                checked={careForm.followUpRequired}
                onChange={(event) =>
                  setCareForm((current) => ({
                    ...current,
                    followUpRequired: event.target.checked,
                    nextFollowUpAt: event.target.checked ? current.nextFollowUpAt : "",
                  }))
                }
              />
              <SoftTypography variant="button" fontWeight="bold">
                Cần liên hệ lại khách hàng
              </SoftTypography>
            </SoftBox>
            {careForm.followUpRequired && (
              <SoftBox mt={1} maxWidth={360}>
                <SoftTypography variant="caption" color="text" display="block" mb={0.5}>
                  Thời gian gọi lại *
                </SoftTypography>
                <SoftInput
                  type="datetime-local"
                  value={careForm.nextFollowUpAt}
                  onChange={(event) =>
                    setCareForm((current) => ({
                      ...current,
                      nextFollowUpAt: event.target.value,
                    }))
                  }
                />
              </SoftBox>
            )}
          </SoftBox>

          <SoftBox mt={2} p={1.5} borderRadius={2} sx={{ border: "1px solid #e2e8f0" }}>
            <SoftTypography variant="button" fontWeight="bold" display="block" mb={1}>
              Lịch sử chăm sóc ({careHistory.length})
            </SoftTypography>
            {careHistoryLoading ? (
              <SoftTypography variant="caption" color="text">
                Đang tải lịch sử...
              </SoftTypography>
            ) : careHistory.length ? (
              <SoftBox display="grid" gap={1} sx={{ maxHeight: 210, overflowY: "auto" }}>
                {careHistory.map((interaction, index) => (
                  <SoftBox
                    key={interaction.id || interaction._id || index}
                    p={1.25}
                    borderRadius={2}
                    sx={{ bgcolor: "#f8fafc" }}
                  >
                    <SoftBox display="flex" justifyContent="space-between" gap={1} flexWrap="wrap">
                      <SoftTypography variant="button" fontWeight="bold" color="info">
                        {outcomeLabel(interaction.outcome)}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {dateTime(interaction.occurredAt || interaction.at)}
                      </SoftTypography>
                    </SoftBox>
                    <SoftTypography variant="caption" display="block">
                      {interaction.action || "Không có nội dung"}
                    </SoftTypography>
                    {interaction.actor?.name && (
                      <SoftTypography variant="caption" color="text" display="block">
                        Người thực hiện: {interaction.actor.name}
                      </SoftTypography>
                    )}
                    {interaction.note && (
                      <SoftTypography variant="caption" color="text" display="block">
                        Ghi chú: {interaction.note}
                      </SoftTypography>
                    )}
                    {interaction.followUpRequired && (
                      <SoftTypography variant="caption" color="warning" fontWeight="bold">
                        Cần gọi lại: {dateTime(interaction.nextFollowUpAt)}
                      </SoftTypography>
                    )}
                  </SoftBox>
                ))}
              </SoftBox>
            ) : (
              <SoftTypography variant="caption" color="text">
                Chưa có lần chăm sóc nào được ghi nhận.
              </SoftTypography>
            )}
          </SoftBox>

          <SoftBox display="flex" justifyContent="flex-end" gap={1} mt={2}>
            <SoftButton variant="outlined" color="secondary" onClick={() => setCareDialog(null)}>
              Hủy
            </SoftButton>
            <SoftButton
              variant="gradient"
              color="success"
              disabled={savingCare}
              onClick={saveCareInteraction}
            >
              <Icon>save</Icon>&nbsp;{savingCare ? "Đang lưu..." : "Lưu tương tác"}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>

      <PrintPreviewDialog
        open={Boolean(preview)}
        title="Báo cáo khách hàng mới 45 ngày"
        html={preview?.html || ""}
        description={`${reportRows.length} khách hàng đã chọn. Kiểm tra trước khi lưu PDF hoặc ảnh.`}
        onDownloadImage={() => createNewCustomersCanvasImage({ rows: reportRows, days })}
        onClose={() => setPreview(null)}
      />
    </SoftBox>
  );
}
