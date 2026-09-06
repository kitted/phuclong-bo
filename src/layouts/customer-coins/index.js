import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Switch from "@mui/material/Switch";
import { useSelector } from "react-redux";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import EntityThumbnail from "components/EntityThumbnail";
import { CustomerCoinService } from "services/crmService";
import { toast } from "react-toastify";

const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || [];
};
const number = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const dateTime = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "—");
const idOf = (value) => value?.id || value?._id;
const periods = [
  ["WEEK", "Tuần"],
  ["MONTH", "Tháng"],
  ["QUARTER", "Quý"],
  ["YEAR", "Năm"],
];
const coinLabel = { INVOICE: "Coin hóa đơn", PLUSEX: "Coin PlusEx" };
const transactionLabel = {
  EARN: "Cộng từ hóa đơn",
  REVERSAL: "Trừ do đảo hóa đơn",
  REDEEM: "Đổi thưởng",
  ADJUSTMENT: "Điều chỉnh",
};

function SummaryCard({ title, value, color = "info", icon }) {
  return (
    <Card sx={{ height: "100%" }}>
      <SoftBox p={2} display="flex" alignItems="center" gap={1.5}>
        <SoftBox
          width={42}
          height={42}
          borderRadius={2}
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="#fff"
          bgColor={color}
        >
          <Icon>{icon}</Icon>
        </SoftBox>
        <SoftBox>
          <SoftTypography variant="caption" color="text">
            {title}
          </SoftTypography>
          <SoftTypography variant="h5" fontWeight="bold">
            {number(value)}
          </SoftTypography>
        </SoftBox>
      </SoftBox>
    </Card>
  );
}

function CustomerCoinDialog({ customer, periodParams, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [coinType, setCoinType] = useState("INVOICE");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    if (!customer) return;
    try {
      setData(unwrap(await CustomerCoinService.getCustomer(idOf(customer), periodParams)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải lịch sử điểm");
    }
  }, [customer, periodParams]);
  useEffect(() => {
    load();
  }, [load]);
  const redeem = async () => {
    if (!Number.isInteger(Number(amount)) || Number(amount) <= 0)
      return toast.error("Điểm đổi phải là số nguyên dương");
    if (!reason.trim()) return toast.error("Vui lòng nhập nội dung đổi thưởng");
    try {
      setSaving(true);
      const result = unwrap(
        await CustomerCoinService.redeem(idOf(customer), {
          coinType,
          amount: Number(amount),
          reason: reason.trim(),
          idempotencyKey:
            window.crypto?.randomUUID?.() ||
            `coin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        })
      );
      toast.success(`Đổi điểm thành công · Mã ${result.redemptionCode}`);
      setRedeemOpen(false);
      setAmount("");
      setReason("");
      await load();
      onChanged();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đổi điểm");
    } finally {
      setSaving(false);
    }
  };
  const detailCustomer = data?.customer || customer || {};
  return (
    <Dialog open={Boolean(customer)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between">
          <SoftBox display="flex" gap={1} alignItems="center">
            <EntityThumbnail entity={detailCustomer} type="customer" size={42} />
            <SoftBox>
              <SoftTypography variant="h6" fontWeight="bold">
                {detailCustomer.name}
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                {detailCustomer.code || "Chưa có mã"} · {detailCustomer.phone || "Chưa có SĐT"}
              </SoftTypography>
            </SoftBox>
          </SoftBox>
          <IconButton onClick={onClose}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <SummaryCard
              title="Số dư Coin hóa đơn"
              value={detailCustomer.invoiceCoinBalance}
              color="info"
              icon="receipt_long"
            />
          </Grid>
          <Grid item xs={6}>
            <SummaryCard
              title="Số dư Coin PlusEx"
              value={detailCustomer.plusExCoinBalance}
              color="success"
              icon="stars"
            />
          </Grid>
          <Grid item xs={6}>
            <SummaryCard
              title="Coin hóa đơn tích trong kỳ"
              value={data?.earned?.INVOICE?.earned}
              color="info"
              icon="date_range"
            />
          </Grid>
          <Grid item xs={6}>
            <SummaryCard
              title="Coin PlusEx tích trong kỳ"
              value={data?.earned?.PLUSEX?.earned}
              color="success"
              icon="date_range"
            />
          </Grid>
        </Grid>
        <SoftButton
          color="warning"
          variant="outlined"
          sx={{ mt: 1.5 }}
          onClick={() => setRedeemOpen(true)}
        >
          <Icon>redeem</Icon>&nbsp;Đổi điểm
        </SoftButton>
        <SoftTypography variant="button" fontWeight="bold" display="block" mt={2}>
          Lịch sử trong kỳ
        </SoftTypography>
        <SoftBox
          mt={0.75}
          sx={{ border: "1px solid #e8ebf0", borderRadius: 2, overflow: "hidden" }}
        >
          {(data?.ledger || []).map((item) => (
            <SoftBox
              key={idOf(item)}
              p={1.25}
              display="flex"
              gap={1}
              sx={{ borderBottom: "1px solid #edf0f5" }}
            >
              <SoftBox flex={1} minWidth={0}>
                <SoftTypography variant="button" fontWeight="bold" display="block">
                  {coinLabel[item.coinType]} ·{" "}
                  {transactionLabel[item.transactionType] || item.transactionType}
                </SoftTypography>
                <SoftTypography variant="caption" color="text" display="block">
                  {item.invoiceCode || item.redemptionCode || item.reason || "Giao dịch điểm"} ·{" "}
                  {dateTime(item.occurredAt)}
                </SoftTypography>
              </SoftBox>
              <SoftTypography
                variant="button"
                fontWeight="bold"
                color={item.change >= 0 ? "success" : "error"}
              >
                {item.change > 0 ? "+" : ""}
                {number(item.change)}
              </SoftTypography>
            </SoftBox>
          ))}
          {!data?.ledger?.length && (
            <SoftTypography variant="caption" color="text" display="block" p={2} textAlign="center">
              Chưa có giao dịch điểm trong kỳ.
            </SoftTypography>
          )}
        </SoftBox>
      </DialogContent>
      <Dialog
        open={redeemOpen}
        onClose={() => !saving && setRedeemOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Đổi điểm khách hàng</DialogTitle>
        <DialogContent>
          <SoftBox display="flex" gap={1} mb={1.25}>
            {["INVOICE", "PLUSEX"].map((type) => (
              <SoftButton
                key={type}
                fullWidth
                color={coinType === type ? "info" : "secondary"}
                variant={coinType === type ? "gradient" : "outlined"}
                onClick={() => setCoinType(type)}
              >
                {coinLabel[type]}
              </SoftButton>
            ))}
          </SoftBox>
          <SoftInput
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Số điểm muốn đổi"
          />
          <SoftBox mt={1}>
            <SoftInput
              multiline
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Phần thưởng hoặc lý do đổi điểm"
            />
          </SoftBox>
          <SoftButton
            fullWidth
            color="warning"
            variant="gradient"
            sx={{ mt: 1.5 }}
            disabled={saving}
            onClick={redeem}
          >
            {saving ? "Đang xử lý..." : "Xác nhận đổi điểm"}
          </SoftButton>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default function CustomerCoins() {
  const user = useSelector((state) => state.auth?.user || {});
  const isAdmin = String(user.role || "").toLowerCase() === "admin";
  const [period, setPeriod] = useState("MONTH");
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState("CUSTOMERS");
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState({});
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const periodParams = useMemo(
    () => ({ period, anchor, timezone: "Asia/Ho_Chi_Minh" }),
    [period, anchor]
  );
  const timelineRows = useMemo(() => {
    const rows = new Map();
    (summary.timeline || []).forEach((item) => {
      const row = rows.get(item.date) || { date: item.date, INVOICE: 0, PLUSEX: 0 };
      row[item.coinType] = Number(item.earned || 0);
      rows.set(item.date, row);
    });
    return [...rows.values()].slice(-14).reverse();
  }, [summary.timeline]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResponse, listResponse] = await Promise.all([
        CustomerCoinService.getSummary(periodParams),
        tab === "PRODUCTS"
          ? CustomerCoinService.getProducts({
              search: search.trim() || undefined,
              page: 1,
              limit: 100,
            })
          : CustomerCoinService.getCustomers({
              search: search.trim() || undefined,
              page: 1,
              limit: 100,
            }),
      ]);
      setSummary(unwrap(summaryResponse));
      if (tab === "PRODUCTS") setProducts(listOf(listResponse));
      else setCustomers(listOf(listResponse));
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải quản lý điểm");
    } finally {
      setLoading(false);
    }
  }, [periodParams, search, tab]);
  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);
  const toggleProduct = async (product) => {
    try {
      await CustomerCoinService.updateProduct(idOf(product), !product.plusExCoinEnabled);
      setProducts((items) =>
        items.map((item) =>
          idOf(item) === idOf(product)
            ? { ...item, plusExCoinEnabled: !item.plusExCoinEnabled }
            : item
        )
      );
      toast.success(
        !product.plusExCoinEnabled ? "Đã bật tích Coin PlusEx" : "Đã tắt tích Coin PlusEx"
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cập nhật sản phẩm");
    }
  };
  const backfill = async () => {
    if (
      !window.confirm(
        "Tính điểm cho tối đa 500 hóa đơn cũ chưa được xử lý? Hãy cấu hình mặt hàng Coin PlusEx trước khi tiếp tục."
      )
    )
      return;
    try {
      setBackfilling(true);
      const result = unwrap(await CustomerCoinService.backfill(500));
      toast.success(
        `Đã xử lý ${number(result.processed)} hóa đơn; còn ${number(result.remaining)} hóa đơn.`
      );
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tính điểm hóa đơn cũ");
    } finally {
      setBackfilling(false);
    }
  };
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3} pb={{ xs: 10, md: 3 }}>
        <SoftBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
          mb={2}
        >
          <SoftBox>
            <SoftTypography variant="h4" fontWeight="bold">
              Điểm khách hàng
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              1 đồng tiền hàng = 1 coin; Coin PlusEx tính trên dòng sản phẩm được bật tích điểm.
            </SoftTypography>
          </SoftBox>
          <SoftBox display="flex" gap={1} alignItems="center" flexWrap="wrap">
            {isAdmin && (
              <SoftButton
                color="warning"
                variant="outlined"
                disabled={backfilling}
                onClick={backfill}
              >
                <Icon>history</Icon>&nbsp;
                {backfilling ? "Đang tính điểm..." : "Tính điểm hóa đơn cũ"}
              </SoftButton>
            )}
            <SoftInput
              type="date"
              value={anchor}
              onChange={(event) => setAnchor(event.target.value)}
              sx={{ width: 180 }}
            />
          </SoftBox>
        </SoftBox>
        <SoftBox display="flex" gap={0.75} mb={2} sx={{ overflowX: "auto" }}>
          {periods.map(([value, label]) => (
            <SoftButton
              key={value}
              size="small"
              color={period === value ? "info" : "secondary"}
              variant={period === value ? "gradient" : "outlined"}
              onClick={() => setPeriod(value)}
            >
              {label}
            </SoftButton>
          ))}
        </SoftBox>
        <Grid container spacing={1.5} mb={2}>
          <Grid item xs={6} md={3}>
            <SummaryCard
              title="Điểm cộng trong kỳ"
              value={summary.summary?.earned}
              icon="add_circle"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <SummaryCard
              title="Điểm đã đổi"
              value={summary.summary?.redeemed}
              color="warning"
              icon="redeem"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <SummaryCard
              title="Tổng Coin hóa đơn"
              value={summary.balances?.invoiceCoin}
              color="info"
              icon="receipt_long"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <SummaryCard
              title="Tổng Coin PlusEx"
              value={summary.balances?.plusExCoin}
              color="success"
              icon="stars"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <SummaryCard
              title="Coin hóa đơn trong kỳ"
              value={summary.byType?.INVOICE?.earned}
              color="info"
              icon="calendar_month"
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <SummaryCard
              title="Coin PlusEx trong kỳ"
              value={summary.byType?.PLUSEX?.earned}
              color="success"
              icon="calendar_month"
            />
          </Grid>
        </Grid>
        <Card sx={{ mb: 2 }}>
          <SoftBox p={2}>
            <SoftTypography variant="button" fontWeight="bold">
              Phân tích phát sinh theo ngày
            </SoftTypography>
            <SoftTypography variant="caption" color="text" display="block" mb={1}>
              Hiển thị tối đa 14 ngày gần nhất trong kỳ đang chọn.
            </SoftTypography>
            <SoftBox sx={{ overflowX: "auto" }}>
              {timelineRows.map((row) => (
                <SoftBox
                  key={row.date}
                  display="grid"
                  gap={1}
                  py={0.8}
                  sx={{
                    gridTemplateColumns: "minmax(100px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr)",
                    borderBottom: "1px solid #edf0f5",
                  }}
                >
                  <SoftTypography variant="caption" fontWeight="bold">
                    {new Date(`${row.date}T12:00:00+07:00`).toLocaleDateString("vi-VN")}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="info">
                    Hóa đơn: {number(row.INVOICE)}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="success">
                    PlusEx: {number(row.PLUSEX)}
                  </SoftTypography>
                </SoftBox>
              ))}
              {!timelineRows.length && (
                <SoftTypography variant="caption" color="text">
                  Chưa có điểm phát sinh trong kỳ này.
                </SoftTypography>
              )}
            </SoftBox>
          </SoftBox>
        </Card>
        <Card>
          <SoftBox p={2} display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <SoftButton
              color={tab === "CUSTOMERS" ? "info" : "secondary"}
              variant={tab === "CUSTOMERS" ? "gradient" : "outlined"}
              onClick={() => setTab("CUSTOMERS")}
            >
              Khách hàng
            </SoftButton>
            {isAdmin && (
              <SoftButton
                color={tab === "PRODUCTS" ? "info" : "secondary"}
                variant={tab === "PRODUCTS" ? "gradient" : "outlined"}
                onClick={() => setTab("PRODUCTS")}
              >
                Mặt hàng Coin PlusEx
              </SoftButton>
            )}
            <SoftBox flex={1} minWidth={220}>
              <SoftInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  tab === "PRODUCTS"
                    ? "Tìm mã hoặc tên sản phẩm..."
                    : "Tìm mã, tên hoặc SĐT khách..."
                }
                icon={{ component: "search", direction: "left" }}
              />
            </SoftBox>
          </SoftBox>
          <SoftBox p={2} pt={0}>
            {loading && (
              <SoftTypography variant="caption" color="text">
                Đang tải...
              </SoftTypography>
            )}
            {!loading &&
              tab === "CUSTOMERS" &&
              customers.map((customer) => (
                <SoftBox
                  key={idOf(customer)}
                  component="button"
                  type="button"
                  onClick={() => setSelectedCustomer(customer)}
                  width="100%"
                  display="flex"
                  alignItems="center"
                  gap={1.25}
                  p={1.25}
                  sx={{
                    border: 0,
                    borderBottom: "1px solid #edf0f5",
                    bgcolor: "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <EntityThumbnail entity={customer} type="customer" size={42} />
                  <SoftBox flex={1} minWidth={0}>
                    <SoftTypography variant="button" fontWeight="bold" display="block">
                      {customer.name}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {customer.code || "Chưa có mã"} · {customer.phone || "Chưa có SĐT"}
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox textAlign="right">
                    <SoftTypography variant="caption" color="info" display="block">
                      HĐ: {number(customer.invoiceCoinBalance)}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="success" display="block">
                      PlusEx: {number(customer.plusExCoinBalance)}
                    </SoftTypography>
                  </SoftBox>
                  <Icon>chevron_right</Icon>
                </SoftBox>
              ))}
            {!loading &&
              tab === "PRODUCTS" &&
              products.map((product) => (
                <SoftBox
                  key={idOf(product)}
                  display="flex"
                  alignItems="center"
                  gap={1.25}
                  p={1.25}
                  sx={{ borderBottom: "1px solid #edf0f5" }}
                >
                  <Avatar variant="rounded" src={product.imageUrl} sx={{ width: 42, height: 42 }}>
                    <Icon>inventory_2</Icon>
                  </Avatar>
                  <SoftBox flex={1} minWidth={0}>
                    <SoftTypography variant="button" fontWeight="bold" display="block">
                      {product.name}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {product.code} · {product.unit || "—"}
                    </SoftTypography>
                  </SoftBox>
                  <SoftTypography
                    variant="caption"
                    fontWeight="bold"
                    color={product.plusExCoinEnabled ? "success" : "text"}
                  >
                    {product.plusExCoinEnabled ? "Đang tích điểm" : "Không tích điểm"}
                  </SoftTypography>
                  <Switch
                    checked={Boolean(product.plusExCoinEnabled)}
                    onChange={() => toggleProduct(product)}
                  />
                </SoftBox>
              ))}
          </SoftBox>
        </Card>
      </SoftBox>
      <CustomerCoinDialog
        customer={selectedCustomer}
        periodParams={periodParams}
        onClose={() => setSelectedCustomer(null)}
        onChanged={load}
      />
    </DashboardLayout>
  );
}
