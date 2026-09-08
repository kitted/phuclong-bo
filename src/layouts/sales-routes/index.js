import { useEffect, useMemo, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import { CircleMarker, MapContainer, Polyline, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import SalesLocationService from "services/salesLocationService";
import { toast } from "react-toastify";
import { vietnamToday } from "utils/businessDate";

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";
const duration = (minutes = 0) => {
  const value = Number(minutes) || 0;
  return value < 60 ? `${value} phút` : `${Math.floor(value / 60)} giờ ${value % 60} phút`;
};

function RouteViewport({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView([points[0].latitude, points[0].longitude], 16);
    else
      map.fitBounds(
        points.map((point) => [point.latitude, point.longitude]),
        { padding: [32, 32], maxZoom: 17 }
      );
  }, [map, points]);
  return null;
}

function RouteMap({ route }) {
  const points = useMemo(() => route?.points || [], [route?.points]);
  const segments = useMemo(() => {
    const result = new Map();
    points.forEach((point) => {
      const key = Number(point.segment) || 0;
      result.set(key, [...(result.get(key) || []), [point.latitude, point.longitude]]);
    });
    return [...result.values()];
  }, [points]);
  const center = points.length ? [points[0].latitude, points[0].longitude] : [10.0452, 105.7469];
  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#eef3f8",
        backgroundImage:
          "linear-gradient(#dbe4ec 1px, transparent 1px), linear-gradient(90deg, #dbe4ec 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      <RouteViewport points={points} />
      {segments.map((segment, index) =>
        segment.length > 1 ? (
          <Polyline key={index} positions={segment} pathOptions={{ color: "#1976d2", weight: 5 }} />
        ) : null
      )}
      {points.map((point, index) => (
        <CircleMarker
          key={point.id || point._id || `${point.capturedAt}-${index}`}
          center={[point.latitude, point.longitude]}
          radius={index === 0 || index === points.length - 1 ? 8 : 4}
          pathOptions={{
            color: index === 0 ? "#2e7d32" : index === points.length - 1 ? "#d32f2f" : "#1976d2",
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <strong>
              {index === 0
                ? "Điểm bắt đầu"
                : index === points.length - 1
                ? "Điểm cuối"
                : `Điểm ${index + 1}`}
            </strong>
            <br />
            {dateTime(point.capturedAt)}
            <br />
            Độ chính xác: {Math.round(Number(point.accuracy) || 0)} m
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <Card sx={{ height: "100%", boxShadow: "none", border: "1px solid #e3e8ef" }}>
      <SoftBox p={1.5} display="flex" gap={1.25} alignItems="center">
        <SoftBox
          width={40}
          height={40}
          borderRadius={2}
          bgcolor={`${color}16`}
          color={color}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <Icon>{icon}</Icon>
        </SoftBox>
        <SoftBox minWidth={0}>
          <SoftTypography variant="caption" color="text" display="block">
            {label}
          </SoftTypography>
          <SoftTypography variant="h6" fontWeight="bold" noWrap>
            {value}
          </SoftTypography>
        </SoftBox>
      </SoftBox>
    </Card>
  );
}

export default function SalesRoutes() {
  const [date, setDate] = useState(vietnamToday());
  const [selectedId, setSelectedId] = useState("");
  const [data, setData] = useState({ summaries: [], route: null, vehicleRoutes: {} });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("SALES");

  useEffect(() => {
    let active = true;
    setLoading(true);
    SalesLocationService.getDaily({ date, salespersonId: selectedId || undefined })
      .then((response) => {
        if (!active) return;
        const value = response.data?.data || response.data || {};
        setData(value);
        if (!selectedId && value.summaries?.length) setSelectedId(value.summaries[0].salespersonId);
      })
      .catch((error) => {
        if (active)
          toast.error(error.response?.data?.message || "Không thể tải dữ liệu tuyến đường");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [date, selectedId]);

  const route = data.route;
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox
          display="flex"
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
          flexDirection={{ xs: "column", md: "row" }}
          gap={1.5}
          mb={2}
        >
          <SoftBox>
            <SoftTypography variant="h4" fontWeight="bold">
              Quản trị vị trí & tuyến đường
            </SoftTypography>
            <SoftTypography variant="button" color="text">
              Xem thời gian lấy vị trí và tuyến sale đã di chuyển theo từng ngày
            </SoftTypography>
          </SoftBox>
          <SoftBox width={{ xs: "100%", md: 220 }}>
            <SoftTypography variant="caption" fontWeight="bold">
              Ngày cần xem
            </SoftTypography>
            <SoftInput
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setSelectedId("");
              }}
            />
          </SoftBox>
        </SoftBox>

        <SoftBox display="flex" gap={1} mb={2}>
          <SoftButton
            color="info"
            variant={tab === "SALES" ? "gradient" : "outlined"}
            onClick={() => setTab("SALES")}
          >
            <Icon>person_pin_circle</Icon>&nbsp;Tuyến sale
          </SoftButton>
          <SoftButton
            color="secondary"
            variant={tab === "VEHICLES" ? "gradient" : "outlined"}
            onClick={() => setTab("VEHICLES")}
          >
            <Icon>local_shipping</Icon>&nbsp;Tuyến xe
          </SoftButton>
        </SoftBox>

        {tab === "VEHICLES" ? (
          <Card sx={{ p: 4, textAlign: "center" }}>
            <Icon sx={{ fontSize: "52px !important", color: "#90a4ae" }}>route</Icon>
            <SoftTypography variant="h5" fontWeight="bold" mt={1}>
              Khu vực quản trị tuyến xe
            </SoftTypography>
            <SoftTypography variant="button" color="text" display="block" mt={0.5}>
              Đã dành sẵn cấu trúc dữ liệu. Chức năng tổng hợp GPS của xe sẽ phát triển sau.
            </SoftTypography>
          </Card>
        ) : (
          <>
            <Grid container spacing={1.5} mb={2}>
              <Grid item xs={6} lg={3}>
                <SummaryCard
                  icon="pin_drop"
                  label="Số điểm GPS"
                  value={route?.pointCount || 0}
                  color="#1976d2"
                />
              </Grid>
              <Grid item xs={6} lg={3}>
                <SummaryCard
                  icon="schedule"
                  label="Thời gian ghi nhận"
                  value={duration(route?.durationMinutes)}
                  color="#7b1fa2"
                />
              </Grid>
              <Grid item xs={6} lg={3}>
                <SummaryCard
                  icon="route"
                  label="Quãng đường ước tính"
                  value={`${Number(route?.distanceKm || 0).toLocaleString("vi-VN")} km`}
                  color="#2e7d32"
                />
              </Grid>
              <Grid item xs={6} lg={3}>
                <SummaryCard
                  icon="update"
                  label="Lần lấy gần nhất"
                  value={dateTime(route?.lastCapturedAt)}
                  color="#ed6c02"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} lg={4}>
                <Card sx={{ height: { lg: 560 }, overflow: "hidden" }}>
                  <SoftBox p={2} sx={{ borderBottom: "1px solid #e7ebf0" }}>
                    <SoftTypography variant="h6" fontWeight="bold">
                      Sale đã lấy vị trí
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {data.summaries?.length || 0} nhân viên trong ngày
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox sx={{ maxHeight: { xs: 360, lg: 485 }, overflowY: "auto" }}>
                    {(data.summaries || []).map((item) => (
                      <SoftBox
                        key={item.salespersonId}
                        component="button"
                        type="button"
                        onClick={() => setSelectedId(item.salespersonId)}
                        width="100%"
                        textAlign="left"
                        p={1.5}
                        sx={{
                          border: 0,
                          borderBottom: "1px solid #edf0f5",
                          background: selectedId === item.salespersonId ? "#eaf3ff" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <SoftTypography variant="button" fontWeight="bold" display="block">
                          {item.salespersonName || "Nhân viên"}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text" display="block">
                          {item.salespersonCode || "Chưa có mã"} · {item.pointCount} điểm ·{" "}
                          {item.distanceKm} km
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text">
                          {dateTime(item.firstCapturedAt)} → {dateTime(item.lastCapturedAt)}
                        </SoftTypography>
                      </SoftBox>
                    ))}
                    {!loading && !data.summaries?.length && (
                      <SoftBox p={3} textAlign="center">
                        <Icon color="disabled">location_off</Icon>
                        <SoftTypography variant="button" color="text" display="block">
                          Chưa có sale gửi vị trí trong ngày này
                        </SoftTypography>
                      </SoftBox>
                    )}
                  </SoftBox>
                </Card>
              </Grid>
              <Grid item xs={12} lg={8}>
                <Card sx={{ height: { xs: 460, lg: 560 }, overflow: "hidden" }}>
                  <SoftBox px={2} py={1.5} sx={{ borderBottom: "1px solid #e7ebf0" }}>
                    <SoftTypography variant="button" fontWeight="bold">
                      {route?.salespersonName
                        ? `Tuyến của ${route.salespersonName}`
                        : "Chưa chọn nhân viên"}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text" display="block">
                      Xanh lá: bắt đầu · Đỏ: kết thúc · Tự ngắt khi mất GPS quá 30 phút
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox height="calc(100% - 64px)">
                    <RouteMap route={route} />
                  </SoftBox>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </SoftBox>
    </DashboardLayout>
  );
}
