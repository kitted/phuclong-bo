import { useEffect, useMemo, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftTypography from "components/SoftTypography";
import { CustomerService } from "services/crmService";
import { toast } from "react-toastify";

const DEFAULT_CENTER = [10.0452, 105.7469];
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
  };
};

function MapController({ currentLocation, customers, onZoom }) {
  const map = useMap();
  useEffect(() => {
    const points = [
      ...(currentLocation ? [[currentLocation.latitude, currentLocation.longitude]] : []),
      ...customers.map((customer) => [customer.latitude, customer.longitude]),
    ];
    if (points.length > 1) map.fitBounds(points, { padding: [35, 35], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 16);
  }, [currentLocation, customers, map]);
  useMapEvents({
    zoomend() {
      onZoom(map.getZoom());
    },
  });
  return null;
}

export default function CustomerRouteMap({ open, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    if (!open) {
      setCustomers([]);
      setCurrentLocation(null);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const firstResponse = await CustomerService.getAll({ page: 1, limit: 100 });
        const firstItems = listOf(firstResponse);
        const totalPages = Math.max(1, Number(firstResponse.data?.meta?.totalPages || 1));
        const remaining = [];
        for (let page = 2; page <= totalPages; page += 1) {
          remaining.push(CustomerService.getAll({ page, limit: 100 }));
        }
        const responses = await Promise.all(remaining);
        const allCustomers = [...firstItems, ...responses.flatMap((response) => listOf(response))];
        if (active) {
          setCustomers(
            Array.from(
              new Map(
                allCustomers
                  .map(mapCustomer)
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
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (open) getCurrentLocation();
  }, [open]);

  const center = useMemo(() => {
    if (currentLocation) return [currentLocation.latitude, currentLocation.longitude];
    if (customers[0]) return [customers[0].latitude, customers[0].longitude];
    return DEFAULT_CENTER;
  }, [currentLocation, customers]);

  return (
    <Dialog open={open} onClose={onClose} fullScreen sx={{ zIndex: 1550 }}>
      <SoftBox height="100dvh" display="flex" flexDirection="column" bgcolor="#f0f2f5">
        <SoftBox
          px={1.25}
          py={1}
          bgcolor="#fff"
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ borderBottom: "1px solid #e4e6eb" }}
        >
          <IconButton onClick={onClose}>
            <Icon>arrow_back</Icon>
          </IconButton>
          <SoftBox flex={1}>
            <SoftTypography variant="button" fontWeight="bold" display="block">
              Bản đồ khách hàng
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              {customers.length} điểm bán có vị trí
            </SoftTypography>
          </SoftBox>
          <SoftButton
            size="small"
            color="success"
            variant="outlined"
            disabled={locating}
            startIcon={<Icon>my_location</Icon>}
            onClick={getCurrentLocation}
          >
            {locating ? "Đang lấy..." : "Vị trí của tôi"}
          </SoftButton>
        </SoftBox>

        {loading && (
          <SoftBox
            position="absolute"
            top={78}
            left="50%"
            zIndex={1600}
            px={1.5}
            py={1}
            borderRadius={6}
            bgcolor="#fff"
            display="flex"
            alignItems="center"
            gap={1}
            sx={{ transform: "translateX(-50%)", boxShadow: "0 4px 16px #0002" }}
          >
            <CircularProgress size={18} />
            <SoftTypography variant="caption" fontWeight="bold">
              Đang tải điểm bán...
            </SoftTypography>
          </SoftBox>
        )}

        <SoftBox flex={1} minHeight={0} sx={{ "& .leaflet-container": { zIndex: 1 } }}>
          <MapContainer center={center} zoom={12} style={{ width: "100%", height: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController
              currentLocation={currentLocation}
              customers={customers}
              onZoom={setZoom}
            />
            {currentLocation && (
              <CircleMarker
                center={[currentLocation.latitude, currentLocation.longitude]}
                radius={10}
                pathOptions={{
                  color: "#fff",
                  weight: 4,
                  fillColor: "#1877f2",
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <strong>Vị trí của tôi</strong>
                  <br />
                  Sai số khoảng {currentLocation.accuracy || "—"} m
                </Popup>
                {zoom >= 15 && <Tooltip permanent>Vị trí của tôi</Tooltip>}
              </CircleMarker>
            )}
            {customers.map((customer) => {
              const routeUrl = currentLocation
                ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${currentLocation.latitude}%2C${currentLocation.longitude}%3B${customer.latitude}%2C${customer.longitude}`
                : "";
              return (
                <CircleMarker
                  key={idOf(customer)}
                  center={[customer.latitude, customer.longitude]}
                  radius={8}
                  pathOptions={{
                    color: "#fff",
                    weight: 3,
                    fillColor: "#2e7d32",
                    fillOpacity: 0.95,
                  }}
                >
                  <Popup minWidth={220}>
                    <strong>
                      {customer.code} · {customer.name}
                    </strong>
                    <br />
                    {customer.address || customer.phone || "Chưa có địa chỉ"}
                    <br />
                    {routeUrl ? (
                      <a href={routeUrl} target="_blank" rel="noreferrer">
                        Mở tuyến đường từ vị trí của tôi
                      </a>
                    ) : (
                      <span>Hãy bật vị trí của tôi để dẫn đường</span>
                    )}
                  </Popup>
                  {zoom >= 15 && (
                    <Tooltip permanent direction="top" offset={[0, -5]}>
                      {customer.code} · {customer.name}
                    </Tooltip>
                  )}
                </CircleMarker>
              );
            })}
          </MapContainer>
        </SoftBox>
      </SoftBox>
    </Dialog>
  );
}
