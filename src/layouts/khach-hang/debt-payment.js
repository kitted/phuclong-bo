import { useEffect, useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Modal from "@mui/material/Modal";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { DebtPaymentService } from "services/crmService";
import { toast } from "react-toastify";
import { debtPaymentToInvoice, printInvoice } from "utils/invoicePrint";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
const numberValue = (value) => Number(String(value || "").replace(/\D/g, "")) || 0;
const idOf = (value) => value?.id || value?._id;
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

export function DebtPaymentModal({ open, customer, onClose, onCreated, mobile = false }) {
  const [form, setForm] = useState({
    cash: "",
    bank: "",
    referenceCode: "",
    note: "",
    fifo: true,
    invoiceIds: [],
  });
  const [saving, setSaving] = useState(false);
  const [createdPayment, setCreatedPayment] = useState(null);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    if (open) {
      setForm({ cash: "", bank: "", referenceCode: "", note: "", fifo: true, invoiceIds: [] });
      setCreatedPayment(null);
    }
  }, [open]);
  const invoices = (customer?.invoices || []).filter(
    (invoice) =>
      invoice.status !== "PAID" &&
      Number(invoice.debtAmount ?? (invoice.total || 0) - (invoice.paid || 0)) > 0
  );
  const total = numberValue(form.cash) + numberValue(form.bank);
  const toggleInvoice = (id) =>
    setForm((current) => ({
      ...current,
      invoiceIds: current.invoiceIds.includes(id)
        ? current.invoiceIds.filter((value) => value !== id)
        : [...current.invoiceIds, id],
    }));
  const submit = async () => {
    if (total <= 0) return toast.error("Vui lòng nhập số tiền thu công nợ");
    if (total > Number(customer?.debt || 0))
      return toast.error("Số tiền thu vượt công nợ hiện tại");
    if (!form.fifo && !form.invoiceIds.length)
      return toast.error("Vui lòng chọn ít nhất một hóa đơn còn nợ");
    try {
      setSaving(true);
      const payments = [];
      if (numberValue(form.cash)) payments.push({ method: "CASH", amount: numberValue(form.cash) });
      if (numberValue(form.bank))
        payments.push({
          method: "BANK_TRANSFER",
          amount: numberValue(form.bank),
          referenceCode: form.referenceCode.trim() || undefined,
        });
      const response = await DebtPaymentService.create(idOf(customer), {
        date: new Date().toISOString(),
        payments,
        invoiceIds: form.fifo ? [] : form.invoiceIds,
        note: form.note.trim() || undefined,
      });
      const payment = response.data?.data || response.data || {};
      toast.success("Đã lập phiếu thu công nợ");
      setCreatedPayment(payment);
      onCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lập phiếu thu công nợ");
    } finally {
      setSaving(false);
    }
  };
  const exportCreatedPayment = async () => {
    try {
      setExporting(true);
      const result = await printInvoice(debtPaymentToInvoice(createdPayment, customer));
      if (result?.downloaded) toast.success("Đã tải ảnh phiếu thu xuống thiết bị");
    } catch (error) {
      toast.error(error.message || "Không thể xuất phiếu thu công nợ");
    } finally {
      setExporting(false);
    }
  };
  if (createdPayment)
    return (
      <Modal open={open} onClose={onClose}>
        <SoftBox
          sx={{
            position: "absolute",
            top: { xs: mobile ? 0 : "50%", md: "50%" },
            left: { xs: mobile ? 0 : "50%", md: "50%" },
            transform: {
              xs: mobile ? "none" : "translate(-50%, -50%)",
              md: "translate(-50%, -50%)",
            },
            width: { xs: mobile ? "100%" : "94%", md: 560 },
            height: { xs: mobile ? "100%" : "auto", md: "auto" },
            bgcolor: "background.paper",
            borderRadius: { xs: mobile ? 0 : 3, md: 3 },
            boxShadow: 24,
            p: { xs: 3, md: 4 },
          }}
        >
          <SoftBox textAlign="center">
            <SoftTypography variant="h5" fontWeight="bold" color="success">
              Thanh toán công nợ thành công
            </SoftTypography>
            <SoftTypography variant="h6" color="info" mt={1}>
              {createdPayment.code}
            </SoftTypography>
          </SoftBox>
          <SoftBox mt={3} p={2} bgcolor="#e8f5e9" borderRadius={2}>
            <Grid container spacing={1}>
              {[
                ["Nợ trước khi thu", createdPayment.customerDebtBefore],
                ["Đã thanh toán", createdPayment.amount],
                ["Công nợ còn lại", createdPayment.customerDebtAfter],
              ].map(([label, value]) => (
                <Grid item xs={12} sm={4} key={label}>
                  <SoftTypography variant="caption" color="text" display="block">
                    {label}
                  </SoftTypography>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {money(value)}
                  </SoftTypography>
                </Grid>
              ))}
            </Grid>
          </SoftBox>
          <SoftTypography variant="caption" color="text" display="block" mt={2}>
            Hóa đơn xuất ra sẽ có dòng hàng hóa “THANH TOÁN CÔNG NỢ”.
          </SoftTypography>
          <SoftBox display="flex" gap={1.5} mt={3}>
            <SoftButton fullWidth variant="outlined" color="secondary" onClick={onClose}>
              Đóng
            </SoftButton>
            <SoftButton
              fullWidth
              variant="gradient"
              color="info"
              disabled={exporting}
              onClick={exportCreatedPayment}
            >
              {exporting ? "Đang tạo..." : mobile ? "Lưu ảnh hóa đơn" : "Xuất hóa đơn"}
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>
    );
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: { xs: mobile ? 0 : "50%", md: "50%" },
          left: { xs: mobile ? 0 : "50%", md: "50%" },
          transform: { xs: mobile ? "none" : "translate(-50%, -50%)", md: "translate(-50%, -50%)" },
          width: { xs: mobile ? "100%" : "94%", md: 720 },
          height: { xs: mobile ? "100%" : "auto", md: "auto" },
          maxHeight: { xs: mobile ? "100%" : "90vh", md: "90vh" },
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: { xs: mobile ? 0 : 3, md: 3 },
          boxShadow: 24,
          p: { xs: mobile ? 2 : 4, md: 4 },
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          Thu công nợ khách hàng
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {customer?.code} · {customer?.name} · Công nợ {money(customer?.debt)}
        </SoftTypography>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption">Tiền mặt</SoftTypography>
            <SoftInput
              value={form.cash}
              onChange={(event) =>
                setForm({ ...form, cash: numberValue(event.target.value).toLocaleString("vi-VN") })
              }
              inputProps={{ inputMode: "numeric" }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption">Chuyển khoản</SoftTypography>
            <SoftInput
              value={form.bank}
              onChange={(event) =>
                setForm({ ...form, bank: numberValue(event.target.value).toLocaleString("vi-VN") })
              }
              inputProps={{ inputMode: "numeric" }}
            />
          </Grid>
          {numberValue(form.bank) > 0 && (
            <Grid item xs={12}>
              <SoftTypography variant="caption">Mã giao dịch</SoftTypography>
              <SoftInput
                value={form.referenceCode}
                onChange={(event) => setForm({ ...form, referenceCode: event.target.value })}
              />
            </Grid>
          )}
        </Grid>
        <SoftBox mt={2} p={2} bgcolor="#F3F8FF" borderRadius={2}>
          <SoftTypography variant="button">Tổng tiền thu: </SoftTypography>
          <SoftTypography variant="h6" fontWeight="bold">
            {money(total)}
          </SoftTypography>
          <SoftTypography variant="caption">
            Công nợ sau thu dự kiến: {money(Math.max(0, Number(customer?.debt || 0) - total))}
          </SoftTypography>
        </SoftBox>
        <FormControlLabel
          control={
            <Checkbox
              checked={form.fifo}
              onChange={(event) => setForm({ ...form, fifo: event.target.checked, invoiceIds: [] })}
            />
          }
          label="Tự phân bổ vào hóa đơn cũ nhất (FIFO)"
        />
        {!form.fifo && (
          <SoftBox
            mt={1}
            sx={{ border: "1px solid #e5e7eb", borderRadius: 2, maxHeight: 220, overflowY: "auto" }}
          >
            {invoices.map((invoice) => {
              const id = idOf(invoice);
              const debt = Number(invoice.debtAmount ?? (invoice.total || 0) - (invoice.paid || 0));
              return (
                <SoftBox
                  key={id}
                  px={2}
                  py={1}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ borderBottom: "1px solid #eee" }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.invoiceIds.includes(id)}
                        onChange={() => toggleInvoice(id)}
                      />
                    }
                    label={`${invoice.code} · ${dateTime(invoice.createdAt || invoice.date)}`}
                  />
                  <SoftTypography variant="button" color="error">
                    Còn nợ {money(debt)}
                  </SoftTypography>
                </SoftBox>
              );
            })}
            {!invoices.length && (
              <SoftTypography variant="caption" display="block" p={2}>
                Không có hóa đơn còn nợ.
              </SoftTypography>
            )}
          </SoftBox>
        )}
        <SoftTypography variant="caption" display="block" mt={2}>
          Ghi chú
        </SoftTypography>
        <SoftInput
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
        />
        <SoftBox display="flex" gap={2} mt={3}>
          <SoftButton fullWidth variant="outlined" color="secondary" onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton
            fullWidth
            variant="gradient"
            color="success"
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Đang lập phiếu..." : "Xác nhận thu công nợ"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

export function DebtPaymentHistory({ customerId, refreshKey, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportingId, setExportingId] = useState("");
  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    DebtPaymentService.getForCustomer(customerId, { page: 1, limit: 100 })
      .then((response) => {
        const data = response.data?.data;
        setItems(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [customerId, refreshKey]);
  const cancel = async (payment) => {
    const reason = window.prompt("Nhập lý do hủy phiếu thu:");
    if (!reason?.trim()) return;
    try {
      await DebtPaymentService.cancel(idOf(payment), reason.trim());
      toast.success("Đã hủy phiếu thu và hoàn nguyên công nợ");
      onChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể hủy phiếu thu");
    }
  };
  const exportPayment = async (payment) => {
    const id = idOf(payment);
    try {
      setExportingId(String(id));
      const response = id ? await DebtPaymentService.getById(id) : null;
      const detail = response?.data?.data || response?.data || payment;
      const result = await printInvoice(debtPaymentToInvoice(detail));
      if (result?.downloaded) toast.success("Đã tải ảnh phiếu thu xuống thiết bị");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Không thể xuất phiếu thu");
    } finally {
      setExportingId("");
    }
  };
  if (loading) return <SoftTypography variant="button">Đang tải phiếu thu...</SoftTypography>;
  return (
    <SoftBox sx={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#F8F9FA" }}>
            {[
              "Mã phiếu",
              "Ngày",
              "Số tiền",
              "Công nợ trước / sau",
              "Phân bổ",
              "Trạng thái",
              "",
            ].map((heading) => (
              <th key={heading} style={{ padding: 10, textAlign: "left", fontSize: 12 }}>
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!items.length && (
            <tr>
              <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#9E9E9E" }}>
                Chưa có phiếu thu công nợ
              </td>
            </tr>
          )}
          {items.map((payment) => (
            <tr key={idOf(payment)} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 10, fontWeight: 600 }}>{payment.code}</td>
              <td style={{ padding: 10 }}>{dateTime(payment.createdAt || payment.date)}</td>
              <td style={{ padding: 10 }}>{money(payment.amount)}</td>
              <td style={{ padding: 10 }}>
                {money(payment.customerDebtBefore)} → {money(payment.customerDebtAfter)}
              </td>
              <td style={{ padding: 10 }}>
                {(payment.allocations || []).map((allocation) => (
                  <div key={allocation.invoiceId || allocation.invoiceCode}>
                    {allocation.invoiceCode}: {money(allocation.amount)}
                  </div>
                ))}
                {Number(payment.unallocatedAmount || 0) > 0 && (
                  <div>Công nợ đầu kỳ/import: {money(payment.unallocatedAmount)}</div>
                )}
              </td>
              <td style={{ padding: 10 }}>{payment.status === "ACTIVE" ? "Đã thu" : "Đã hủy"}</td>
              <td style={{ padding: 10 }}>
                <SoftBox display="flex" gap={0.5} flexWrap="wrap">
                  <SoftButton
                    size="small"
                    variant="text"
                    color="info"
                    disabled={exportingId === String(idOf(payment))}
                    onClick={() => exportPayment(payment)}
                  >
                    {exportingId === String(idOf(payment)) ? "Đang xuất..." : "Xuất hóa đơn"}
                  </SoftButton>
                  {payment.status === "ACTIVE" && (
                    <SoftButton
                      size="small"
                      variant="text"
                      color="error"
                      onClick={() => cancel(payment)}
                    >
                      Hủy phiếu
                    </SoftButton>
                  )}
                </SoftBox>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SoftBox>
  );
}
