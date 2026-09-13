import { useCallback, useEffect, useMemo, useState } from "react";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { WebsiteAnalyticsService } from "services/websiteAdminService";
import { toast } from "react-toastify";

const unwrap = (response) => response?.data?.data ?? response?.data ?? {};
const dateValue = (date) => date.toISOString().slice(0, 10);
const metricCards = [
  ["visits", "Lượt truy cập", "visibility", "#2563eb"],
  ["uniqueSessions", "Phiên duy nhất", "groups", "#7c3aed"],
  ["qrVisits", "Lượt quét QR", "qr_code_2", "#dc2626"],
  ["leads", "Lead nhận giá", "contact_phone", "#ea580c"],
  ["conversionRate", "Tỷ lệ chuyển đổi", "trending_up", "#059669"],
];

export default function WebsiteAnalyticsTab() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState({ summary: {}, funnel: [], sources: [], campaigns: [], devices: [], daily: [], recentLeads: [] });
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - (days - 1) * 86400000);
    return { from: dateValue(from), to: dateValue(to), landingKey: "plusex_bo_dum_dream_wave" };
  }, [days]);
  const load = useCallback(async () => {
    setLoading(true);
    try { setReport(unwrap(await WebsiteAnalyticsService.report(range))); }
    catch (error) { toast.error(error.response?.data?.message || "Không thể tải thống kê landing page"); }
    finally { setLoading(false); }
  }, [range]);
  useEffect(() => { load(); }, [load]);
  const maxDaily = Math.max(1, ...(report.daily || []).map((item) => Number(item.visits || 0)));
  const maxFunnel = Math.max(1, Number(report.funnel?.[0]?.value || 0));
  return <SoftBox>
    <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={1.5} flexWrap="wrap" mb={2}>
      <SoftBox><SoftTypography variant="h5" fontWeight="bold">Hiệu quả Landing Page PlusEx</SoftTypography><SoftTypography variant="caption" color="text">Đo lượt truy cập, nguồn, hành vi và lead của trang bố thắng Dream/Wave.</SoftTypography></SoftBox>
      <SoftBox display="flex" gap={1}><SoftInput select value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ minWidth: 150 }}><MenuItem value={7}>7 ngày</MenuItem><MenuItem value={30}>30 ngày</MenuItem><MenuItem value={90}>90 ngày</MenuItem></SoftInput><SoftButton color="info" variant="outlined" onClick={load} disabled={loading}>{loading ? "Đang tải" : "Làm mới"}</SoftButton></SoftBox>
    </SoftBox>

    <Grid container spacing={1.5}>{metricCards.map(([key, label, icon, color]) => <Grid item xs={6} md={4} lg key={key}><SoftBox height="100%" p={1.75} borderRadius={2.5} bgcolor="#fff" sx={{ border: "1px solid #e6eaf0" }}><SoftBox display="flex" alignItems="center" justifyContent="space-between"><SoftTypography variant="caption" color="text">{label}</SoftTypography><Icon sx={{ color }}>{icon}</Icon></SoftBox><SoftTypography variant="h4" fontWeight="bold" mt={0.75}>{key === "conversionRate" ? `${Number(report.summary?.[key] || 0).toLocaleString("vi-VN")}%` : Number(report.summary?.[key] || 0).toLocaleString("vi-VN")}</SoftTypography></SoftBox></Grid>)}</Grid>

    <Grid container spacing={2} mt={0.25}>
      <Grid item xs={12} lg={7}><SoftBox p={2} borderRadius={2.5} bgcolor="#fff" sx={{ border: "1px solid #e6eaf0" }}><SoftTypography variant="button" fontWeight="bold">Lượt truy cập theo ngày</SoftTypography><SoftBox mt={2} height={220} display="flex" alignItems="flex-end" gap={0.75} sx={{ overflowX: "auto" }}>{(report.daily || []).length ? report.daily.map((item) => <SoftBox key={item.date} minWidth={26} flex={1} height="100%" display="flex" flexDirection="column" justifyContent="flex-end" alignItems="center"><SoftTypography variant="caption" fontWeight="bold">{item.visits}</SoftTypography><SoftBox width="100%" minHeight={4} borderRadius="5px 5px 0 0" bgcolor="#2563eb" sx={{ height: `${Math.max(3, item.visits / maxDaily * 82)}%` }} /><SoftTypography variant="caption" color="text" sx={{ fontSize: 9, mt: 0.5, whiteSpace: "nowrap" }}>{item.date.slice(5)}</SoftTypography></SoftBox>) : <SoftTypography variant="caption" color="text">Chưa có dữ liệu trong kỳ.</SoftTypography>}</SoftBox></SoftBox></Grid>
      <Grid item xs={12} lg={5}><SoftBox p={2} borderRadius={2.5} bgcolor="#fff" sx={{ border: "1px solid #e6eaf0" }}><SoftTypography variant="button" fontWeight="bold">Funnel chuyển đổi</SoftTypography><SoftBox mt={2}>{(report.funnel || []).map((item) => <SoftBox key={item.event} mb={1.5}><SoftBox display="flex" justifyContent="space-between"><SoftTypography variant="caption">{item.label}</SoftTypography><SoftTypography variant="caption" fontWeight="bold">{Number(item.value || 0).toLocaleString("vi-VN")}</SoftTypography></SoftBox><SoftBox mt={0.5} height={8} borderRadius={8} bgcolor="#eef2f7"><SoftBox height="100%" borderRadius={8} bgcolor={item.event === "form_submit" ? "#dc2626" : "#2563eb"} sx={{ width: `${Math.max(item.value ? 2 : 0, item.value / maxFunnel * 100)}%` }} /></SoftBox></SoftBox>)}</SoftBox></SoftBox></Grid>
    </Grid>

    <Grid container spacing={2} mt={0.25}>
      <Grid item xs={12} md={6}><SoftBox p={2} borderRadius={2.5} bgcolor="#fff" sx={{ border: "1px solid #e6eaf0" }}><SoftTypography variant="button" fontWeight="bold">Nguồn truy cập</SoftTypography><SoftBox mt={1.25}>{(report.sources || []).map((item) => <SoftBox key={`${item.source}-${item.medium}`} display="flex" justifyContent="space-between" py={1} sx={{ borderBottom: "1px solid #f0f2f5" }}><SoftBox><SoftTypography variant="button" fontWeight="bold">{item.source}</SoftTypography><SoftTypography variant="caption" color="text" display="block">{item.medium || "Không xác định"}</SoftTypography></SoftBox><SoftTypography variant="button" fontWeight="bold" color="info">{item.visits} lượt · {item.uniqueSessions} phiên</SoftTypography></SoftBox>)}{!report.sources?.length && <SoftTypography variant="caption" color="text">Chưa có dữ liệu nguồn.</SoftTypography>}</SoftBox></SoftBox></Grid>
      <Grid item xs={12} md={6}><SoftBox p={2} borderRadius={2.5} bgcolor="#fff" sx={{ border: "1px solid #e6eaf0" }}><SoftTypography variant="button" fontWeight="bold">Thiết bị & chiến dịch</SoftTypography><SoftBox display="flex" gap={1} flexWrap="wrap" mt={1.25}>{(report.devices || []).map((item) => <SoftBox key={item.name} px={1.25} py={0.75} borderRadius={1.5} bgcolor="#eef4ff"><SoftTypography variant="caption" fontWeight="bold">{item.name}: {item.value}</SoftTypography></SoftBox>)}</SoftBox><SoftBox mt={1.5}>{(report.campaigns || []).slice(0, 6).map((item) => <SoftBox key={item.campaign} display="flex" justifyContent="space-between" py={0.75}><SoftTypography variant="caption">{item.campaign}</SoftTypography><SoftTypography variant="caption" fontWeight="bold">{item.visits} lượt</SoftTypography></SoftBox>)}</SoftBox></SoftBox></Grid>
    </Grid>

    <SoftBox mt={2} p={2} borderRadius={2.5} bgcolor="#fff" sx={{ border: "1px solid #e6eaf0" }}><SoftTypography variant="button" fontWeight="bold">Lead nhận giá mới nhất</SoftTypography><Grid container spacing={1.25} mt={0.25}>{(report.recentLeads || []).map((lead) => <Grid item xs={12} md={6} lg={4} key={lead.id || lead._id}><SoftBox p={1.5} borderRadius={2} bgcolor="#f8fafc"><SoftTypography variant="button" fontWeight="bold">{lead.name}</SoftTypography><SoftTypography variant="caption" display="block" color="text">{lead.phone} · {lead.province || "Chưa nhập khu vực"}</SoftTypography><SoftTypography variant="caption" display="block" color="info">{lead.role || "Khách quan tâm"} · nguồn {lead.source || "direct"}</SoftTypography></SoftBox></Grid>)}{!report.recentLeads?.length && <Grid item xs={12}><SoftTypography variant="caption" color="text">Chưa có lead trong kỳ.</SoftTypography></Grid>}</Grid></SoftBox>
  </SoftBox>;
}
