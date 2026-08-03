import { useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import SoftBox from "components/SoftBox";
import MobileLoadMore from "components/MobileLoadMore";
import { mergeUniqueItems } from "utils/infiniteList";
import SoftTypography from "components/SoftTypography";
import { CustomerService } from "services/crmService";
import { toast } from "react-toastify";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);

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

const TYPE_LABELS = {
  OPENING_BALANCE: "Công nợ đầu kỳ",
  IMPORT_ADJUSTMENT: "Điều chỉnh từ import",
  MANUAL_ADJUSTMENT: "Điều chỉnh thủ công",
  INVOICE_DEBT: "Phát sinh từ hóa đơn",
  DEBT_PAYMENT: "Thu công nợ",
  DEBT_PAYMENT_CANCELLED: "Hủy phiếu thu",
  ADJUSTMENT: "Điều chỉnh",
};

function DebtTrend({ rows }) {
  const points = useMemo(() => {
    if (!rows.length) return "";
    const width = 600;
    const height = 150;
    const max = Math.max(...rows.map((item) => Number(item.debt) || 0), 1);
    return rows
      .map((item, index) => {
        const x = rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width;
        const y = height - ((Number(item.debt) || 0) / max) * (height - 18);
        return `${x},${y}`;
      })
      .join(" ");
  }, [rows]);

  if (!rows.length) {
    return (
      <SoftBox py={4} textAlign="center">
        <SoftTypography variant="caption" color="text">
          Chưa có dữ liệu biến động công nợ
        </SoftTypography>
      </SoftBox>
    );
  }

  return (
    <SoftBox>
      <svg viewBox="0 0 600 165" width="100%" role="img" aria-label="Biểu đồ công nợ">
        <line x1="0" y1="150" x2="600" y2="150" stroke="#e4e6eb" strokeWidth="2" />
        <polyline
          points={points}
          fill="none"
          stroke="#1877f2"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <SoftBox display="flex" justifyContent="space-between" mt={-1}>
        <SoftTypography variant="caption" color="text">
          {rows[0]?.date ? new Date(`${rows[0].date}T00:00:00`).toLocaleDateString("vi-VN") : ""}
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {rows[rows.length - 1]?.date
            ? new Date(`${rows[rows.length - 1].date}T00:00:00`).toLocaleDateString("vi-VN")
            : ""}
        </SoftTypography>
      </SoftBox>
    </SoftBox>
  );
}

export default function CustomerDebtHistory({ customerId, refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [chart, setChart] = useState([]);
  const [summary, setSummary] = useState({});
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRows([]);
    setPage(1);
  }, [customerId, refreshKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      CustomerService.getDebtHistory(customerId, { page, limit: 20 }),
      CustomerService.getDebtHistoryChart(customerId),
    ])
      .then(([historyResponse, chartResponse]) => {
        if (!active) return;
        const historyRows = Array.isArray(historyResponse.data?.data)
          ? historyResponse.data.data
          : [];
        setRows((current) => (page === 1 ? historyRows : mergeUniqueItems(current, historyRows)));
        setSummary(historyResponse.data?.summary || {});
        setMeta(historyResponse.data?.meta || { totalPages: 1 });
        setChart(Array.isArray(chartResponse.data?.data) ? chartResponse.data.data : []);
      })
      .catch((error) => {
        if (active) toast.error(error.response?.data?.message || "Không thể tải lịch sử công nợ");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [customerId, page, refreshKey]);

  return (
    <SoftBox>
      <SoftBox display="flex" gap={1.5} sx={{ overflowX: "auto" }} pb={1}>
        {[
          ["Công nợ hiện tại", summary.currentDebt, "#c62828"],
          ["Hạn mức hiện tại", summary.currentDebtLimit, "#ed6c02"],
          ["Công nợ cao nhất", summary.highestDebt, "#1877f2"],
        ].map(([label, value, color]) => (
          <Card
            key={label}
            sx={{ minWidth: 190, flex: 1, boxShadow: "none", border: "1px solid #e4e6eb" }}
          >
            <SoftBox p={1.5}>
              <SoftTypography variant="caption" color="text">
                {label}
              </SoftTypography>
              <SoftTypography variant="h6" fontWeight="bold" sx={{ color }}>
                {money(value)}
              </SoftTypography>
            </SoftBox>
          </Card>
        ))}
      </SoftBox>

      <Card sx={{ mt: 1.5, p: 2, boxShadow: "none", border: "1px solid #e4e6eb" }}>
        <SoftTypography variant="button" fontWeight="bold">
          Biến động công nợ
        </SoftTypography>
        <DebtTrend rows={chart} />
      </Card>

      <SoftBox mt={2}>
        {rows.map((item) => {
          const increase = Number(item.increaseAmount) || 0;
          const decrease = Number(item.decreaseAmount) || 0;
          const isIncrease = increase > 0;
          return (
            <SoftBox key={item.id} display="flex" gap={1.5} pb={2}>
              <SoftBox
                width={38}
                height={38}
                borderRadius="50%"
                bgcolor={isIncrease ? "#ffebee" : "#e8f5e9"}
                color={isIncrease ? "#c62828" : "#2e7d32"}
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <Icon>{isIncrease ? "north_east" : "south_east"}</Icon>
              </SoftBox>
              <SoftBox flex={1} minWidth={0} pb={1.5} sx={{ borderBottom: "1px solid #edf0f5" }}>
                <SoftBox display="flex" justifyContent="space-between" gap={1}>
                  <SoftTypography variant="button" fontWeight="bold">
                    {TYPE_LABELS[item.type] || item.type}
                  </SoftTypography>
                  <SoftTypography
                    variant="button"
                    fontWeight="bold"
                    sx={{ color: isIncrease ? "#c62828" : "#2e7d32", whiteSpace: "nowrap" }}
                  >
                    {isIncrease ? "+" : "-"}
                    {money(isIncrease ? increase : decrease)}
                  </SoftTypography>
                </SoftBox>
                <SoftTypography variant="caption" color="text" display="block">
                  {dateTime(item.effectiveAt || item.occurredAt)}
                  {item.actor?.name ? ` · ${item.actor.name}` : ""}
                </SoftTypography>
                <SoftTypography variant="caption" display="block">
                  {money(item.previousDebt)} → <strong>{money(item.balanceAfter)}</strong>
                </SoftTypography>
                {(item.referenceCode || item.referenceId || item.note) && (
                  <SoftTypography variant="caption" color="text" display="block">
                    {[item.referenceCode || item.referenceId, item.note]
                      .filter(Boolean)
                      .join(" · ")}
                  </SoftTypography>
                )}
              </SoftBox>
            </SoftBox>
          );
        })}
        {!loading && rows.length === 0 && (
          <SoftTypography variant="caption" color="text" display="block" textAlign="center" py={3}>
            Chưa có lịch sử công nợ
          </SoftTypography>
        )}
        <MobileLoadMore
          loading={loading}
          hasMore={page < (meta.totalPages || 1)}
          onLoadMore={() => setPage((value) => value + 1)}
        />
      </SoftBox>
    </SoftBox>
  );
}
