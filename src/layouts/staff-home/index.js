import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftTypography from "components/SoftTypography";
import { DashboardAnalyticsService } from "services/analyticsService";
import EmployeeKpiService from "services/employeeKpiService";
import { InvoiceService } from "services/warehouseService";
import { CustomerService } from "services/crmService";
import { CreateInvoiceModal } from "layouts/hoa-don";
import { toast } from "react-toastify";
import StaffAccountMenu from "components/StaffAccountMenu";
import NotificationCenter from "components/NotificationCenter";
import QuickCustomerLocation from "./quick-customer-location";
import QuickNoteService from "services/quickNoteService";

const CustomerRouteMap = lazy(() => import("./customer-route-map"));

const money = (value) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
const number = (value) => new Intl.NumberFormat("vi-VN").format(Number(value) || 0);
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || value?.rows || [];
};
const metricValue = (value) =>
  typeof value === "object" && value !== null ? Number(value.value || 0) : Number(value || 0);
const initials = (name = "NV") =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("vi-VN") : "—");
const formatDateTime = (value) =>
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
const invoiceCustomer = (invoice = {}) => {
  const populatedCustomer =
    invoice.customerId && typeof invoice.customerId === "object" ? invoice.customerId : {};
  const legacyCustomer =
    invoice.customer && typeof invoice.customer === "object" ? invoice.customer : {};
  const snapshot = invoice.customerSnapshot || invoice.customerInfo || {};
  const code =
    populatedCustomer.code ||
    populatedCustomer.customerCode ||
    snapshot.code ||
    snapshot.customerCode ||
    legacyCustomer.code ||
    invoice.customerCode ||
    "";
  const name =
    populatedCustomer.name ||
    populatedCustomer.fullName ||
    populatedCustomer.customerName ||
    snapshot.name ||
    snapshot.customerName ||
    legacyCustomer.name ||
    invoice.customerName ||
    (typeof invoice.customer === "string" ? invoice.customer : "") ||
    "Khách lẻ";
  return { code, name, label: code ? `${code} · ${name}` : name };
};
const invoiceReceivedAmount = (invoice = {}) =>
  Number(invoice.receivedAmount ?? invoice.totalReceivedAmount ?? invoice.paidAmount ?? 0);
const coordinate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const mapCustomer = (customer = {}) => {
  const location = customer.storeLocation || customer.location || {};
  const latitude = coordinate(location.latitude ?? location.lat);
  const longitude = coordinate(location.longitude ?? location.lng ?? location.lon);
  if (latitude === null || longitude === null) return null;
  const image = customer.storefrontImage || customer.storeImage || {};
  return {
    ...customer,
    latitude,
    longitude,
    code: customer.code || customer.customerCode || "Chưa có mã",
    name: customer.name || customer.fullName || "Khách hàng",
    imageUrl: image.secureUrl || image.secure_url || image.url || customer.storefrontImageUrl || "",
  };
};
const distanceKm = (from, to) => {
  if (!from || !to) return null;
  const radians = (value) => (value * Math.PI) / 180;
  const latitude = radians(to.latitude - from.latitude);
  const longitude = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const escapeHtml = (value = "") =>
  String(value).replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])
  );
const customerMapColor = (customer = {}) =>
  String(customer.source || customer.customerSource || "").toUpperCase() === "LEGACY"
    ? "#22c55e"
    : "#ef4444";
const customerMapIcon = (customer) =>
  L.divIcon({
    className: "customer-live-map-marker",
    iconSize: [60, 74],
    iconAnchor: [30, 37],
    html: `<div class="customer-live-map-marker__dot" style="background:${customerMapColor(
      customer
    )}"></div><span class="customer-live-map-marker__name">${escapeHtml(customer.name)}</span>`,
  });
const currentLocationIcon = () =>
  L.divIcon({
    className: "customer-live-map-current",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: '<span class="customer-live-map-current__dot"></span>',
  });

function MiniMapViewport({ currentLocation }) {
  const map = useMap();
  useEffect(() => {
    if (currentLocation) {
      map.setView([currentLocation.latitude, currentLocation.longitude], 14, { animate: true });
    }
  }, [currentLocation, map]);
  return null;
}

const KPI_META = {
  PROMOTION_ACTIVATION_COUNT: { label: "Mã kích hoạt", icon: "confirmation_number", money: false },
  PRODUCT_REVENUE: { label: "Doanh thu sản phẩm", icon: "inventory_2", money: true },
  TOTAL_REVENUE: { label: "Tổng doanh thu", icon: "payments", money: true },
  INVOICE_COUNT: { label: "Số hóa đơn", icon: "receipt_long", money: false },
  PRODUCT_QUANTITY: { label: "Số lượng sản phẩm", icon: "inventory_2", money: false },
};

function PinnedQuickNote({ note }) {
  if (!note) return null;
  return (
    <Card sx={{ borderRadius: 0, boxShadow: "none", mb: 1, overflow: "hidden" }}>
      <SoftBox p={1.75} sx={{ background: "linear-gradient(135deg, #fff8e1, #fff3cd)", borderLeft: "5px solid #ffb300" }}>
        <SoftBox display="flex" gap={1.25} alignItems="flex-start">
          <SoftBox width={42} height={42} borderRadius={2} bgcolor="#ffb300" color="#fff" display="flex" alignItems="center" justifyContent="center" flexShrink={0}><Icon>push_pin</Icon></SoftBox>
          <SoftBox minWidth={0} flex={1}>
            <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "#e65100", textTransform: "uppercase" }}>Lưu ý từ quản lý</SoftTypography>
            <SoftTypography variant="button" fontWeight="bold" display="block">{note.title}</SoftTypography>
            <SoftTypography variant="body2" mt={.5} sx={{ color: "#5d4037", whiteSpace: "pre-wrap" }}>{note.content}</SoftTypography>
            {note.updatedAt || note.createdAt ? <SoftTypography variant="caption" color="text" display="block" mt={.75}>Cập nhật {formatDateTime(note.updatedAt || note.createdAt)}</SoftTypography> : null}
          </SoftBox>
        </SoftBox>
      </SoftBox>
    </Card>
  );
}

function FeedHeader({ user, subtitle }) {
  const name = user?.fullName || user?.name || user?.username || "Nhân viên";
  return (
    <SoftBox display="flex" alignItems="center" gap={1.25} px={2} pt={1.75} pb={1}>
      <Avatar
        src={user?.avatar || user?.avatarUrl}
        sx={{ width: 42, height: 42, bgcolor: "#1877f2" }}
      >
        {initials(name)}
      </Avatar>
      <SoftBox flex={1} minWidth={0}>
        <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
          {name}
        </SoftTypography>
        <SoftTypography variant="caption" color="text" display="block">
          {subtitle}
        </SoftTypography>
      </SoftBox>
      <IconButton size="small">
        <Icon>more_horiz</Icon>
      </IconButton>
    </SoftBox>
  );
}

function Stat({ label, value, color = "#1c1e21" }) {
  return (
    <SoftBox flex={1} minWidth={0}>
      <SoftTypography variant="caption" color="text" display="block">
        {label}
      </SoftTypography>
      <SoftTypography variant="button" fontWeight="bold" sx={{ color }} noWrap display="block">
        {value}
      </SoftTypography>
    </SoftBox>
  );
}

function CustomerNavigationPreview({ onOpenNavigator, onOpenStoreProfile }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 899px)").matches) return undefined;
    let active = true;
    const loadCustomers = async () => {
      try {
        const firstResponse = await CustomerService.getAll({ page: 1, limit: 100 });
        const firstItems = listOf(firstResponse);
        const totalPages = Math.max(1, Number(firstResponse.data?.meta?.totalPages || 1));
        const remaining = await Promise.all(
          Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
            CustomerService.getAll({ page: index + 2, limit: 100 })
          )
        );
        if (active) {
          setCustomers(
            [...firstItems, ...remaining.flatMap((response) => listOf(response))]
              .map(mapCustomer)
              .filter(Boolean)
          );
        }
      } catch (_) {
        if (active) setCustomers([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadCustomers();
    if (!navigator.geolocation) {
      return () => {
        active = false;
      };
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (active) setCurrentLocation({ latitude: coords.latitude, longitude: coords.longitude });
      },
      () => {
        // The preview remains usable when the user does not grant GPS permission.
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 }
    );
    return () => {
      active = false;
    };
  }, []);

  const nearbyCustomers = useMemo(() => {
    if (!currentLocation) return customers.slice(0, 3);
    return customers
      .map((customer) => ({ ...customer, distance: distanceKm(currentLocation, customer) }))
      .filter((customer) => customer.distance !== null && customer.distance <= 2)
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 3);
  }, [currentLocation, customers]);

  return (
    <Card
      sx={{
        display: { xs: "block", md: "none" },
        borderRadius: 0,
        boxShadow: "none",
        mb: 1,
        overflow: "hidden",
      }}
    >
      <SoftBox p={1.5}>
        <SoftBox mb={1.25}>
          <SoftBox>
            <SoftTypography variant="button" fontWeight="bold" display="block">
              Điểm bán gần bạn
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Bản đồ khách hàng trong bán kính 2 km
            </SoftTypography>
          </SoftBox>
        </SoftBox>
        <SoftButton
          fullWidth
          color="success"
          variant="outlined"
          startIcon={<Icon>add_location_alt</Icon>}
          onClick={onOpenStoreProfile}
          sx={{ minHeight: 48, mb: 1.25, fontSize: "13px" }}
        >
          Thêm vị trí khách hàng
        </SoftButton>

        <SoftBox
          component="button"
          type="button"
          width="100%"
          height={220}
          p={0}
          onClick={onOpenNavigator}
          sx={{
            position: "relative",
            overflow: "hidden",
            border: 0,
            borderRadius: 3,
            cursor: "pointer",
            textAlign: "left",
            bgcolor: "#dce7ef",
            boxShadow: "inset 0 0 0 1px #ffffff80, 0 8px 22px #15263a35",
            "&:active": { transform: "scale(.985)" },
            "& .leaflet-container": {
              height: "100%",
              width: "100%",
              zIndex: 1,
              fontFamily: "inherit",
            },
            "& .leaflet-control-attribution": { display: "none" },
            "& .leaflet-tile-pane": { filter: "saturate(.82) contrast(1.05)" },
            "& .customer-live-map-marker": { background: "transparent", border: 0 },
            "& .customer-live-map-marker__dot": {
              width: 16,
              height: 16,
              mx: "auto",
              borderRadius: "50%",
              border: "3px solid #fff",
              boxShadow: "0 3px 10px #17243d55",
            },
            "& .customer-live-map-marker__name": {
              display: "block",
              maxWidth: 76,
              mt: 0.3,
              px: 0.4,
              py: 0.15,
              overflow: "hidden",
              borderRadius: 0.75,
              bgcolor: "#ffffffeb",
              color: "#17243d",
              fontSize: "9px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              boxShadow: "0 2px 8px #17243d35",
            },
            "& .customer-live-map-current": { background: "transparent", border: 0 },
            "& .customer-live-map-current__dot": {
              display: "block",
              width: 20,
              height: 20,
              borderRadius: "50%",
              bgcolor: "#ef4444",
              border: "4px solid #fff",
              boxShadow: "0 2px 9px #17243d80",
            },
          }}
        >
          <MapContainer
            center={
              currentLocation
                ? [currentLocation.latitude, currentLocation.longitude]
                : [10.0452, 105.7469]
            }
            zoom={14}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MiniMapViewport currentLocation={currentLocation} />
            {currentLocation && (
              <Marker
                position={[currentLocation.latitude, currentLocation.longitude]}
                icon={currentLocationIcon()}
              />
            )}
            {nearbyCustomers.map((customer) => (
              <Marker
                key={customer.id || customer._id}
                position={[customer.latitude, customer.longitude]}
                icon={customerMapIcon(customer)}
              />
            ))}
          </MapContainer>
          <SoftBox position="absolute" zIndex={3} right={14} bottom={14} textAlign="right">
            <SoftTypography
              variant="caption"
              color="dark"
              fontWeight="bold"
              display="block"
              sx={{ bgcolor: "#ffffffed", px: 0.8, py: 0.35, borderRadius: 1 }}
            >
              {loading ? "Đang tải điểm bán..." : `${nearbyCustomers.length} cửa tiệm gần bạn`}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
      </SoftBox>
    </Card>
  );
}

function KpiDetail({ item, open, onClose }) {
  const progress = item?.progress || {};
  const targets = progress.targets || item?.targets || [];
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={false}
      PaperProps={{
        sx: {
          borderRadius: { xs: "20px 20px 0 0", sm: 3 },
          m: { xs: 0, sm: 2 },
          position: { xs: "fixed", sm: "relative" },
          bottom: { xs: 0, sm: "auto" },
          width: { xs: "100%", sm: "calc(100% - 32px)" },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <SoftBox display="flex" alignItems="center" justifyContent="space-between">
          <SoftTypography variant="h6" fontWeight="bold">
            {item?.name || "Chi tiết KPI"}
          </SoftTypography>
          <IconButton onClick={onClose}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
      </DialogTitle>
      <DialogContent>
        <SoftTypography variant="caption" color="text">
          {formatDate(item?.from || item?.startDate)} – {formatDate(item?.to || item?.endDate)}
        </SoftTypography>
        {!targets.length && (
          <SoftTypography variant="button" display="block" py={3}>
            Chưa có chỉ tiêu chi tiết.
          </SoftTypography>
        )}
        {targets.map((target, index) => {
          const meta = KPI_META[target.metric] || {
            label: target.metric || "Chỉ tiêu",
            money: false,
          };
          const actual = Number(target.actualValue || 0);
          const goal = Number(target.targetValue || 0);
          const percent = Number(target.progressPercent ?? (goal ? (actual / goal) * 100 : 0));
          return (
            <SoftBox
              key={`${target.metric}-${index}`}
              py={2}
              sx={{ borderBottom: "1px solid #edf0f5" }}
            >
              <SoftBox display="flex" justifyContent="space-between" gap={2} mb={1}>
                <SoftTypography variant="button" fontWeight="bold">
                  {meta.label}
                </SoftTypography>
                <SoftTypography
                  variant="button"
                  fontWeight="bold"
                  color={percent >= 100 ? "success" : "info"}
                >
                  {number(percent)}%
                </SoftTypography>
              </SoftBox>
              <LinearProgress
                variant="determinate"
                value={Math.min(percent, 100)}
                sx={{ height: 9, borderRadius: 9, mb: 1 }}
              />
              <SoftTypography variant="caption" color="text">
                Đã đạt {meta.money ? money(actual) : number(actual)} /{" "}
                {meta.money ? money(goal) : number(goal)}
              </SoftTypography>
            </SoftBox>
          );
        })}
      </DialogContent>
    </Dialog>
  );
}

export default function StaffHome() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth?.user || {});
  const [loading, setLoading] = useState(true);
  const [saleOpen, setSaleOpen] = useState(false);
  const [customerLocationOpen, setCustomerLocationOpen] = useState(false);
  const [customerMapOpen, setCustomerMapOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState(null);
  const [kpis, setKpis] = useState([]);
  const [overview, setOverview] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [pinnedNote, setPinnedNote] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const params = useMemo(
    () => ({
      period: "MONTH",
      anchor: new Date().toISOString().slice(0, 10),
      compare: "PREVIOUS_PERIOD",
      timezone: "Asia/Ho_Chi_Minh",
    }),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        DashboardAnalyticsService.overview(params),
        InvoiceService.getAll({ page: 1, limit: 3, sortBy: "date", sortOrder: "desc" }),
        EmployeeKpiService.getAll({ status: "ACTIVE", page: 1, limit: 20 }),
        QuickNoteService.getLatestPinned(),
      ];
      const [overviewResult, invoiceResult, kpiResult, noteResult] = await Promise.allSettled(requests);
      if (overviewResult.status === "fulfilled") setOverview(unwrap(overviewResult.value) || {});
      if (invoiceResult.status === "fulfilled") setInvoices(listOf(invoiceResult.value));
      const baseKpis = kpiResult.status === "fulfilled" ? listOf(kpiResult.value) : [];
      setPinnedNote(noteResult.status === "fulfilled" ? unwrap(noteResult.value) || null : null);
      const detailed = await Promise.all(
        baseKpis.map(async (kpi) => {
          try {
            const response = await EmployeeKpiService.getProgress(kpi.id || kpi._id);
            return { ...kpi, progress: unwrap(response) || {} };
          } catch (_) {
            return kpi;
          }
        })
      );
      setKpis(detailed);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tải bảng tin bán hàng");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  const name = user?.fullName || user?.name || user?.username || "Nhân viên";
  const sales = overview?.sales || {};
  const netRevenue = metricValue(sales.netRevenue);
  const invoiceCount = metricValue(sales.invoiceCount);
  const collected = metricValue(sales.collectedAmount);
  const credit = metricValue(sales.creditSales);

  return (
    <SoftBox minHeight="100vh" sx={{ bgcolor: "#f0f2f5", pb: { xs: 10, md: 4 } }}>
      <SoftBox
        maxWidth={720}
        mx="auto"
        sx={{ bgcolor: { xs: "#f0f2f5", md: "transparent" }, minHeight: "100vh" }}
      >
        <SoftBox
          position="sticky"
          top={0}
          zIndex={20}
          bgcolor="#fff"
          px={2}
          py={1.25}
          sx={{ borderBottom: "1px solid #e4e6eb" }}
        >
          <SoftBox display="flex" alignItems="center" gap={1.25}>
            <Avatar
              src={user?.avatar || user?.avatarUrl}
              sx={{ width: 42, height: 42, bgcolor: "#1877f2" }}
            >
              {initials(name)}
            </Avatar>
            <SoftBox flex={1} minWidth={0}>
              <SoftTypography variant="h6" fontWeight="bold" noWrap>
                {name}
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                {user?.employeeCode || "Nhân viên kinh doanh"}
              </SoftTypography>
            </SoftBox>
            <IconButton
              onClick={() => setRefreshKey((value) => value + 1)}
              sx={{ bgcolor: "#f0f2f5" }}
            >
              <Icon>refresh</Icon>
            </IconButton>
            <IconButton onClick={() => setSaleOpen(true)} sx={{ bgcolor: "#f0f2f5" }}>
              <Icon>add</Icon>
            </IconButton>
            <NotificationCenter />
            <StaffAccountMenu />
          </SoftBox>
        </SoftBox>

        <CustomerNavigationPreview
          onOpenNavigator={() => setCustomerMapOpen(true)}
          onOpenStoreProfile={() => setCustomerLocationOpen(true)}
        />

        <PinnedQuickNote note={pinnedNote} />

        <Card
          sx={{
            borderRadius: 0,
            boxShadow: "none",
            mt: { xs: 0, md: 2 },
            mb: 1,
            overflow: "hidden",
          }}
        >
          <SoftBox
            px={2}
            pt={1.5}
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <SoftTypography variant="button" fontWeight="bold">
              KPI của tôi
            </SoftTypography>
            <SoftTypography variant="caption" color="info">
              Chạm để xem tiến độ
            </SoftTypography>
          </SoftBox>
          <SoftBox
            display="flex"
            gap={1.25}
            p={2}
            pt={1.25}
            sx={{
              overflowX: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {loading && (
              <SoftBox width="100%" display="flex" justifyContent="center" py={3}>
                <CircularProgress size={28} />
              </SoftBox>
            )}
            {!loading && !kpis.length && (
              <SoftBox width="100%" p={2} borderRadius={2} bgcolor="#f0f2f5">
                <SoftTypography variant="button">Bạn chưa có KPI đang hoạt động.</SoftTypography>
              </SoftBox>
            )}
            {kpis.map((kpi, index) => {
              const targets = kpi.progress?.targets || kpi.targets || [];
              const average = targets.length
                ? targets.reduce((sum, item) => sum + Number(item.progressPercent || 0), 0) /
                  targets.length
                : Number(kpi.progress?.progressPercent || 0);
              return (
                <SoftBox
                  key={kpi.id || kpi._id || index}
                  onClick={() => setSelectedKpi(kpi)}
                  minWidth={158}
                  height={205}
                  p={1.5}
                  borderRadius={3}
                  color="#fff"
                  display="flex"
                  flexDirection="column"
                  justifyContent="space-between"
                  sx={{
                    cursor: "pointer",
                    background:
                      index % 2
                        ? "linear-gradient(145deg,#7b2ff7,#f107a3)"
                        : "linear-gradient(145deg,#1877f2,#42b72a)",
                    boxShadow: "0 4px 14px #0002",
                  }}
                >
                  <SoftBox
                    width={45}
                    height={45}
                    borderRadius="50%"
                    bgcolor="#fff"
                    color="#1877f2"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon>flag</Icon>
                  </SoftBox>
                  <SoftBox>
                    <SoftTypography variant="h5" color="white" fontWeight="bold">
                      {number(average)}%
                    </SoftTypography>
                    <SoftTypography
                      variant="button"
                      color="white"
                      fontWeight="bold"
                      display="block"
                      sx={{ lineHeight: 1.25 }}
                    >
                      {kpi.name || `KPI ${index + 1}`}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="white">
                      Đến {formatDate(kpi.to || kpi.endDate)}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              );
            })}
          </SoftBox>
        </Card>

        <Card sx={{ borderRadius: 0, boxShadow: "none", mb: 1 }}>
          <FeedHeader user={user} subtitle="Tổng kết bán hàng tháng này" />
          <SoftBox px={2} pb={2}>
            <SoftTypography variant="h4" fontWeight="bold" color="info">
              {money(netRevenue)}
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Doanh thu cá nhân trong kỳ hiện tại
            </SoftTypography>
            <SoftBox
              display="flex"
              gap={1.5}
              mt={2}
              pt={1.5}
              sx={{ borderTop: "1px solid #e4e6eb" }}
            >
              <Stat label="Hóa đơn" value={number(invoiceCount)} />
              <Stat label="Đã thu" value={money(collected)} color="#2e7d32" />
              <Stat label="Ghi nợ" value={money(credit)} color="#d32f2f" />
            </SoftBox>
          </SoftBox>
          <SoftBox display="flex" borderTop="1px solid #e4e6eb">
            <SoftButton
              fullWidth
              variant="text"
              color="dark"
              onClick={() => navigate("/hoa-don")}
              startIcon={<Icon>receipt_long</Icon>}
            >
              Xem hóa đơn
            </SoftButton>
            <SoftButton
              fullWidth
              variant="text"
              color="info"
              onClick={() => setSaleOpen(true)}
              startIcon={<Icon>add_shopping_cart</Icon>}
            >
              Bán ngay
            </SoftButton>
          </SoftBox>
        </Card>

        <Card sx={{ borderRadius: 0, boxShadow: "none", mb: 1 }}>
          <FeedHeader user={user} subtitle="Hoạt động bán hàng gần đây" />
          <SoftBox px={2} pb={1}>
            <SoftTypography variant="h6" fontWeight="bold">
              Hóa đơn mới nhất
            </SoftTypography>
            {!invoices.length && (
              <SoftTypography variant="button" color="text" display="block" py={2}>
                Chưa có hóa đơn trong kỳ.
              </SoftTypography>
            )}
            {invoices.map((invoice, index) => {
              const customer = invoiceCustomer(invoice);
              return (
                <SoftBox
                  key={invoice.id || invoice._id || index}
                  py={1.5}
                  display="flex"
                  alignItems="center"
                  gap={1.25}
                  sx={{
                    borderBottom: index === invoices.length - 1 ? 0 : "1px solid #edf0f5",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    navigate(`/hoa-don?search=${encodeURIComponent(invoice.code || "")}`)
                  }
                >
                  <SoftBox
                    width={42}
                    height={42}
                    borderRadius="50%"
                    bgcolor="#e7f3ff"
                    color="#1877f2"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Icon>receipt</Icon>
                  </SoftBox>
                  <SoftBox flex={1} minWidth={0}>
                    <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                      {invoice.code || "Hóa đơn"} · {customer.label}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {formatDateTime(invoice.createdAt || invoice.date)} ·{" "}
                      {invoice.paymentStatus === "PAID"
                        ? "Đã thanh toán"
                        : invoice.paymentStatus === "PARTIAL"
                        ? "Thanh toán một phần"
                        : "Cộng công nợ"}
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox textAlign="right" flexShrink={0}>
                    <SoftTypography variant="caption" color="text" display="block">
                      Đã trả (3)
                    </SoftTypography>
                    <SoftTypography
                      variant="button"
                      fontWeight="bold"
                      sx={{ color: invoiceReceivedAmount(invoice) > 0 ? "#2e7d32" : "#6b7280" }}
                    >
                      {money(invoiceReceivedAmount(invoice))}
                    </SoftTypography>
                  </SoftBox>
                </SoftBox>
              );
            })}
          </SoftBox>
          <SoftButton variant="text" color="info" fullWidth onClick={() => navigate("/hoa-don")}>
            Xem tất cả hoạt động
          </SoftButton>
        </Card>
      </SoftBox>

      <SoftButton
        onClick={() => setSaleOpen(true)}
        variant="gradient"
        color="success"
        sx={{
          position: "fixed",
          right: { xs: 16, md: 30 },
          bottom: { xs: 78, md: 30 },
          zIndex: 35,
          minWidth: 0,
          width: 58,
          height: 58,
          borderRadius: "50%",
          p: 0,
          boxShadow: "0 6px 20px #2e7d3260",
        }}
      >
        <Icon sx={{ fontSize: "28px !important" }}>add_shopping_cart</Icon>
      </SoftButton>
      <CreateInvoiceModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        onCreated={() => {
          setSaleOpen(false);
          setRefreshKey((value) => value + 1);
        }}
      />
      <QuickCustomerLocation
        open={customerLocationOpen}
        onClose={() => setCustomerLocationOpen(false)}
      />
      {customerMapOpen && (
        <Suspense fallback={null}>
          <CustomerRouteMap open={customerMapOpen} onClose={() => setCustomerMapOpen(false)} />
        </Suspense>
      )}
      <KpiDetail
        item={selectedKpi}
        open={Boolean(selectedKpi)}
        onClose={() => setSelectedKpi(null)}
      />
    </SoftBox>
  );
}
