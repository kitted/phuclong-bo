import { useEffect, useMemo, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftTypography from "components/SoftTypography";
import { CustomerService, LeadService } from "services/crmService";
import { toast } from "react-toastify";

const DEFAULT_CENTER = [10.0452, 105.7469];
const NAVIGATION_RADIUS_KM = 5;
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || value?.rows || [];
};
const idOf = (value) => value?.id || value?._id;
const coordinate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const imageOf = (customer = {}) => {
  const image = customer.storefrontImage || customer.storeImage || {};
  return image.secureUrl || image.secure_url || image.url || customer.storefrontImageUrl || "";
};
const distanceKm = (from, to) => {
  if (!from || !to) return null;
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const latitude = toRadians(to.latitude - from.latitude);
  const longitude = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const mapCustomer = (customer = {}) => {
  const location = customer.storeLocation || customer.location || {};
  const latitude = coordinate(location.latitude ?? location.lat);
  const longitude = coordinate(location.longitude ?? location.lng ?? location.lon);
  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    return null;
  return {
    ...customer,
    latitude,
    longitude,
    code: customer.code || customer.customerCode || "Chưa có mã",
    name: customer.name || customer.fullName || "Khách hàng",
    imageUrl: imageOf(customer),
  };
};
const mapLead = (lead = {}) => {
  const latitude = coordinate(lead.location?.latitude);
  const longitude = coordinate(lead.location?.longitude);
  if (latitude === null || longitude === null) return null;
  return {
    ...lead,
    latitude,
    longitude,
    code: "Lead",
    name: lead.name || "Tiềm năng",
    imageUrl: lead.imageUrl || "",
    pointType: "LEAD",
  };
};
const routeUrlOf = (from, customer) =>
  from
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${from.latitude}%2C${from.longitude}%3B${customer.latitude}%2C${customer.longitude}`
    : "";
const customerMarkerColor = (customer = {}) =>
  customer.pointType === "LEAD"
    ? customer.color || "#7c3aed"
    : String(customer.source || customer.customerSource || "").toUpperCase() === "LEGACY"
    ? "#22c55e"
    : "#ef4444";
const customerMarkerIcon = (customer, selected) =>
  L.divIcon({
    className: "customer-navigation-marker",
    iconSize: [82, 100],
    iconAnchor: [41, 50],
    html: `
      <div class="customer-navigation-marker__pin ${
        selected ? "is-selected" : ""
      }" style="background:${customerMarkerColor(customer)}"></div>
      <span class="customer-navigation-marker__name">${customer.code} · ${customer.name}</span>
    `,
  });
const currentLocationMarkerIcon = () =>
  L.divIcon({
    className: "customer-navigation-current",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    html: '<span class="customer-navigation-current__dot"></span>',
  });

function MapController({ currentLocation, selectedCustomer, showCustomers, fitAll }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCustomer && currentLocation) {
      map.fitBounds(
        [
          [currentLocation.latitude, currentLocation.longitude],
          [selectedCustomer.latitude, selectedCustomer.longitude],
        ],
        { padding: [70, 70], maxZoom: 15, animate: true }
      );
      return;
    }
    if (fitAll && showCustomers.length > 1) {
      map.fitBounds(
        showCustomers.map((customer) => [customer.latitude, customer.longitude]),
        { padding: [38, 38], maxZoom: 13, animate: true }
      );
      return;
    }
    if (currentLocation) {
      map.setView([currentLocation.latitude, currentLocation.longitude], 13, { animate: true });
      return;
    }
    if (showCustomers[0]) {
      map.setView([showCustomers[0].latitude, showCustomers[0].longitude], 13, { animate: true });
    }
  }, [currentLocation, selectedCustomer, showCustomers, fitAll, map]);
  return null;
}

function NavigationMap({ currentLocation, customers, selectedCustomer, onSelectCustomer, fitAll }) {
  const center = useMemo(() => {
    if (currentLocation) return [currentLocation.latitude, currentLocation.longitude];
    if (customers[0]) return [customers[0].latitude, customers[0].longitude];
    return DEFAULT_CENTER;
  }, [currentLocation, customers]);
  const routePoints = selectedCustomer && currentLocation ? selectedCustomer.routePoints : [];

  return (
    <SoftBox
      flex={1}
      minHeight={0}
      sx={{
        position: "relative",
        bgcolor: "#17243d",
        "& .leaflet-container": { zIndex: 1, fontFamily: "inherit", background: "#182a45" },
        "& .leaflet-tile-pane": { filter: "saturate(.72) contrast(1.08) brightness(.85)" },
        "& .leaflet-control-attribution": { opacity: 0.55, fontSize: "8px" },
        "& .customer-navigation-marker": { background: "transparent", border: 0 },
        "& .customer-navigation-marker__pin": {
          position: "relative",
          width: 18,
          height: 18,
          mx: "auto",
          borderRadius: "50%",
          boxShadow: "0 8px 18px #08152980",
          border: "3px solid #fff",
        },
        "& .customer-navigation-marker__pin.is-selected": {
          borderColor: "#17d6e9",
          transform: "scale(1.3)",
        },
        "& .customer-navigation-marker__name": {
          display: "block",
          mt: 0.4,
          px: 0.55,
          py: 0.2,
          borderRadius: 1,
          bgcolor: "#ffffffec",
          color: "#17243d",
          fontSize: "10px",
          fontWeight: 700,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: 104,
          boxShadow: "0 3px 10px #08152950",
        },
        "& .customer-navigation-current": { background: "transparent", border: 0 },
        "& .customer-navigation-current__dot": {
          display: "block",
          width: 22,
          height: 22,
          borderRadius: "50%",
          bgcolor: "#ef4444",
          border: "4px solid #fff",
          boxShadow: "0 4px 12px #08152980",
        },
      }}
    >
      <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController
          currentLocation={currentLocation}
          selectedCustomer={selectedCustomer}
          showCustomers={customers}
          fitAll={fitAll}
        />
        {routePoints?.length > 1 && (
          <Polyline
            positions={routePoints}
            pathOptions={{ color: "#17d6e9", weight: 7, opacity: 0.95, lineCap: "round" }}
          />
        )}
        {currentLocation && (
          <Marker
            position={[currentLocation.latitude, currentLocation.longitude]}
            icon={currentLocationMarkerIcon()}
          />
        )}
        {customers.map((customer) => (
          <Marker
            key={idOf(customer)}
            position={[customer.latitude, customer.longitude]}
            icon={customerMarkerIcon(customer, idOf(customer) === idOf(selectedCustomer))}
            eventHandlers={{ click: () => onSelectCustomer(customer) }}
          ></Marker>
        ))}
      </MapContainer>
    </SoftBox>
  );
}

export default function CustomerRouteMap({ open, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [routing, setRouting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAllCustomers, setShowAllCustomers] = useState(true);
  const [landscape, setLandscape] = useState(false);

  useEffect(() => {
    if (!open) {
      setCustomers([]);
      setCurrentLocation(null);
      setSelectedCustomer(null);
      setShowAllCustomers(true);
      return undefined;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [firstResponse, leadsResponse] = await Promise.all([
          CustomerService.getAll({ page: 1, limit: 100 }),
          LeadService.getAll({ status: "OPEN", page: 1, limit: 100 }),
        ]);
        const firstItems = listOf(firstResponse);
        const totalPages = Math.max(1, Number(firstResponse.data?.meta?.totalPages || 1));
        const responses = await Promise.all(
          Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
            CustomerService.getAll({ page: index + 2, limit: 100 })
          )
        );
        const allCustomers = [
          ...firstItems,
          ...responses.flatMap((response) => listOf(response)),
          ...listOf(leadsResponse),
        ];
        if (active) {
          setCustomers(
            Array.from(
              new Map(
                allCustomers
                  .map((item) =>
                    item.location && !item.storeLocation ? mapLead(item) : mapCustomer(item)
                  )
                  .filter(Boolean)
                  .map((customer) => [String(idOf(customer)), customer])
              ).values()
            )
          );
        }
      } catch (error) {
        if (active)
          toast.error(error.response?.data?.message || "Không thể tải các vị trí khách hàng");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    const updateOrientation = () => {
      setLandscape(window.matchMedia("(orientation: landscape) and (max-height: 600px)").matches);
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Thiết bị không hỗ trợ lấy GPS");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCurrentLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Math.round(coords.accuracy || 0),
        });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        toast.error(
          error.code === 1
            ? "Bạn chưa cấp quyền vị trí cho trình duyệt"
            : "Không thể lấy vị trí hiện tại"
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 }
    );
  };

  useEffect(() => {
    if (open) getCurrentLocation();
  }, [open]);

  const visibleCustomers = useMemo(() => {
    if (!currentLocation || showAllCustomers) return customers;
    return customers.filter(
      (customer) => distanceKm(currentLocation, customer) <= NAVIGATION_RADIUS_KM
    );
  }, [currentLocation, customers, showAllCustomers]);

  const chooseCustomer = async (customer) => {
    const selected = { ...customer, routePoints: [] };
    setSelectedCustomer(selected);
    if (!currentLocation) return;
    setRouting(true);
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${customer.longitude},${customer.latitude}?overview=full&geometries=geojson`,
        { signal: AbortSignal.timeout ? AbortSignal.timeout(9000) : undefined }
      );
      if (!response.ok) throw new Error("Không thể lấy tuyến đường");
      const data = await response.json();
      const route = data?.routes?.[0];
      const routePoints = (route?.geometry?.coordinates || []).map(([longitude, latitude]) => [
        latitude,
        longitude,
      ]);
      setSelectedCustomer({
        ...selected,
        routePoints,
        routeDistance: Number(route?.distance || 0) / 1000,
        routeDuration: Number(route?.duration || 0) / 60,
      });
    } catch (_) {
      // Selecting the customer still works; the external OSM link remains a reliable fallback.
      setSelectedCustomer(selected);
      toast.info("Chưa lấy được tuyến đường trực tiếp, bạn vẫn có thể mở chỉ đường bên ngoài.");
    } finally {
      setRouting(false);
    }
  };

  const selectedDistance =
    selectedCustomer && currentLocation ? distanceKm(currentLocation, selectedCustomer) : null;
  const routeUrl = selectedCustomer ? routeUrlOf(currentLocation, selectedCustomer) : "";

  return (
    <Dialog open={open} onClose={onClose} fullScreen sx={{ zIndex: 1550 }}>
      <SoftBox height="100dvh" display="flex" flexDirection="column" bgcolor="#0b1830">
        {!landscape && (
          <SoftBox
            px={1.25}
            py={1}
            bgcolor="#fff"
            display="flex"
            alignItems="center"
            gap={1}
            sx={{ borderBottom: "1px solid #e4e6eb" }}
          >
            <IconButton onClick={onClose} aria-label="Quay lại">
              <Icon>arrow_back</Icon>
            </IconButton>
            <SoftBox flex={1} minWidth={0}>
              <SoftTypography variant="button" fontWeight="bold" display="block">
                Dẫn đường điểm bán
              </SoftTypography>
              <SoftTypography variant="caption" color="text" display="block" noWrap>
                {currentLocation
                  ? showAllCustomers
                    ? `${customers.length} điểm bán đã lưu vị trí`
                    : `${visibleCustomers.length} điểm trong bán kính ${NAVIGATION_RADIUS_KM} km`
                  : `${customers.length} điểm bán đã lưu vị trí`}
              </SoftTypography>
            </SoftBox>
            <IconButton
              onClick={getCurrentLocation}
              disabled={locating}
              aria-label="Lấy vị trí của tôi"
            >
              <Icon color={locating ? "disabled" : "primary"}>my_location</Icon>
            </IconButton>
          </SoftBox>
        )}

        <NavigationMap
          currentLocation={currentLocation}
          customers={visibleCustomers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={chooseCustomer}
          fitAll={showAllCustomers && !selectedCustomer}
        />

        {loading && (
          <SoftBox
            position="absolute"
            top={landscape ? 16 : 78}
            left="50%"
            zIndex={1600}
            px={1.5}
            py={1}
            borderRadius={6}
            bgcolor="#fff"
            display="flex"
            alignItems="center"
            gap={1}
            sx={{ transform: "translateX(-50%)", boxShadow: "0 4px 16px #0005" }}
          >
            <CircularProgress size={18} />
            <SoftTypography variant="caption" fontWeight="bold">
              Đang tải điểm bán...
            </SoftTypography>
          </SoftBox>
        )}

        {landscape && (
          <SoftBox position="absolute" zIndex={1501} top={14} right={14}>
            <SoftBox display="flex" gap={0.75}>
              <IconButton onClick={onClose} sx={{ bgcolor: "#fff", boxShadow: "0 5px 16px #0004" }}>
                <Icon>close</Icon>
              </IconButton>
              <IconButton
                onClick={getCurrentLocation}
                disabled={locating}
                sx={{ bgcolor: "#fff", boxShadow: "0 5px 16px #0004" }}
              >
                <Icon color={locating ? "disabled" : "primary"}>my_location</Icon>
              </IconButton>
            </SoftBox>
          </SoftBox>
        )}

        {!landscape && currentLocation && !showAllCustomers && visibleCustomers.length === 0 && (
          <SoftBox
            position="absolute"
            top={136}
            left={12}
            right={12}
            zIndex={1501}
            p={1.25}
            borderRadius={2}
            bgcolor="#fff"
            shadow="lg"
          >
            <SoftTypography variant="caption" fontWeight="bold" display="block">
              Chưa có khách trong bán kính {NAVIGATION_RADIUS_KM} km
            </SoftTypography>
            <SoftButton
              size="small"
              variant="text"
              color="info"
              onClick={() => setShowAllCustomers(true)}
            >
              Xem tất cả điểm bán
            </SoftButton>
          </SoftBox>
        )}

        {!landscape && currentLocation && (
          <SoftButton
            size="small"
            color="dark"
            variant="contained"
            onClick={() => setShowAllCustomers((value) => !value)}
            sx={{
              position: "absolute",
              zIndex: 1501,
              top: 136,
              left: 12,
              bgcolor: "#ffffffed",
              color: "#344767",
              boxShadow: "0 5px 16px #0004",
              "&:hover": { bgcolor: "#fff" },
            }}
          >
            <Icon sx={{ mr: 0.5 }}>{showAllCustomers ? "public" : "near_me"}</Icon>
            {showAllCustomers ? `Tất cả ${customers.length}` : `Gần tôi ${NAVIGATION_RADIUS_KM} km`}
          </SoftButton>
        )}

        {!selectedCustomer && !landscape && (
          <SoftBox
            position="absolute"
            zIndex={1501}
            left={10}
            right={10}
            bottom={12}
            display="flex"
            gap={1}
            pb={0.25}
            sx={{
              overflowX: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {customers.map((customer) => (
              <SoftBox
                key={`gallery-${idOf(customer)}`}
                component="button"
                type="button"
                onClick={() => chooseCustomer(customer)}
                minWidth={118}
                maxWidth={118}
                p={0.7}
                borderRadius={2}
                bgcolor="#ffffffef"
                sx={{
                  border: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  boxShadow: "0 8px 22px #0611266a",
                  backdropFilter: "blur(12px)",
                }}
              >
                <SoftBox
                  height={64}
                  borderRadius={1.5}
                  bgcolor="#edf2f8"
                  overflow="hidden"
                  display="grid"
                  sx={{ placeItems: "center" }}
                >
                  {customer.imageUrl ? (
                    <img
                      src={customer.imageUrl}
                      alt={`Cửa tiệm ${customer.name}`}
                      width="100%"
                      height="100%"
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <Icon color="info">storefront</Icon>
                  )}
                </SoftBox>
                <SoftTypography variant="caption" fontWeight="bold" display="block" noWrap mt={0.5}>
                  {customer.name}
                </SoftTypography>
                <SoftTypography variant="caption" color="text" display="block" noWrap>
                  {customer.code}
                </SoftTypography>
              </SoftBox>
            ))}
          </SoftBox>
        )}

        {selectedCustomer && (
          <SoftBox
            position="absolute"
            zIndex={1501}
            left={{ xs: 10, sm: 18 }}
            right={{ xs: 10, sm: 18 }}
            bottom={{ xs: 12, sm: 18 }}
            p={1.25}
            borderRadius={3}
            bgcolor="#ffffffef"
            sx={{ boxShadow: "0 12px 34px #06112670", backdropFilter: "blur(12px)" }}
          >
            {selectedCustomer ? (
              <SoftBox display="flex" alignItems="center" gap={1.25}>
                <SoftBox
                  width={48}
                  height={48}
                  borderRadius={2}
                  overflow="hidden"
                  bgcolor="#e7f3ff"
                  display="grid"
                  sx={{ placeItems: "center", flexShrink: 0 }}
                >
                  {selectedCustomer.imageUrl ? (
                    <img
                      src={selectedCustomer.imageUrl}
                      alt="Cửa tiệm"
                      width="100%"
                      height="100%"
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <Icon color="info">storefront</Icon>
                  )}
                </SoftBox>
                <SoftBox flex={1} minWidth={0}>
                  <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
                    {selectedCustomer.code} · {selectedCustomer.name}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text" display="block" noWrap>
                    {routing
                      ? "Đang vẽ tuyến đường..."
                      : selectedCustomer.routeDistance
                      ? `${selectedCustomer.routeDistance.toFixed(1)} km · khoảng ${Math.ceil(
                          selectedCustomer.routeDuration
                        )} phút`
                      : selectedDistance
                      ? `${selectedDistance.toFixed(1)} km đường chim bay`
                      : "Bật GPS để dẫn đường"}
                  </SoftTypography>
                </SoftBox>
                {routeUrl && (
                  <SoftButton
                    component="a"
                    href={routeUrl}
                    target="_blank"
                    rel="noreferrer"
                    color="info"
                    variant="gradient"
                    size="small"
                    sx={{ minWidth: { xs: 42, sm: 122 }, px: { xs: 1, sm: 1.5 } }}
                  >
                    <Icon sx={{ mr: { xs: 0, sm: 0.5 } }}>navigation</Icon>
                    <SoftBox component="span" display={{ xs: "none", sm: "inline" }}>
                      Dẫn đường
                    </SoftBox>
                  </SoftButton>
                )}
              </SoftBox>
            ) : (
              <SoftBox display="flex" alignItems="center" gap={1}>
                <SoftBox
                  width={36}
                  height={36}
                  borderRadius="50%"
                  bgcolor="#e7f3ff"
                  color="#1877f2"
                  display="grid"
                  sx={{ placeItems: "center" }}
                >
                  <Icon>touch_app</Icon>
                </SoftBox>
                <SoftTypography variant="caption" fontWeight="bold">
                  Chạm vào điểm bán để xem ảnh cửa tiệm và tuyến đường.
                </SoftTypography>
              </SoftBox>
            )}
          </SoftBox>
        )}
      </SoftBox>
    </Dialog>
  );
}
