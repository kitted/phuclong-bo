import { useEffect, useRef, useState } from "react";
import Icon from "@mui/material/Icon";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SalesLocationService from "services/salesLocationService";

const radians = (value) => (value * Math.PI) / 180;
const distanceMeters = (from, to) => {
  if (!from) return Number.POSITIVE_INFINITY;
  const latitude = radians(to.latitude - from.latitude);
  const longitude = radians(to.longitude - from.longitude);
  const value =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitude / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export default function SalesLocationTracker({ floating = false }) {
  const [status, setStatus] = useState("WAITING");
  const lastSent = useRef(null);
  const sending = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("UNAVAILABLE");
      return undefined;
    }
    const watcher = navigator.geolocation.watchPosition(
      async (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
          accuracy: position.coords.accuracy,
          speed:
            position.coords.speed === null || position.coords.speed < 0
              ? undefined
              : position.coords.speed,
          heading:
            position.coords.heading === null || position.coords.heading < 0
              ? undefined
              : position.coords.heading,
          source: "STAFF_HOME",
        };
        const previous = lastSent.current;
        const elapsed = previous ? Date.now() - previous.sentAt : Number.POSITIVE_INFINITY;
        if (sending.current || (elapsed < 120000 && distanceMeters(previous, next) < 25)) return;
        sending.current = true;
        try {
          await SalesLocationService.capture(next);
          lastSent.current = { ...next, sentAt: Date.now() };
          setStatus("ACTIVE");
        } catch (_) {
          setStatus("ERROR");
        } finally {
          sending.current = false;
        }
      },
      (error) => setStatus(error.code === 1 ? "DENIED" : "ERROR"),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  const content = {
    WAITING: ["my_location", "Đang lấy vị trí", "#607d8b"],
    ACTIVE: ["location_on", "Đang ghi nhận tuyến", "#2e7d32"],
    DENIED: ["location_off", "Chưa cấp quyền vị trí", "#ed6c02"],
    UNAVAILABLE: ["location_off", "Thiết bị không hỗ trợ GPS", "#c62828"],
    ERROR: ["location_searching", "Chưa gửi được vị trí", "#c62828"],
  }[status];

  return (
    <SoftBox
      display="flex"
      alignItems="center"
      gap={0.35}
      color={content[2]}
      px={floating ? 1 : 0}
      py={floating ? 0.35 : 0}
      borderRadius={floating ? 5 : 0}
      bgcolor={floating ? "#fff" : "transparent"}
      sx={
        floating
          ? {
              position: "absolute",
              right: 8,
              top: -28,
              boxShadow: "0 2px 8px #00000018",
              border: "1px solid #e4e6eb",
            }
          : undefined
      }
    >
      <Icon sx={{ fontSize: "14px !important" }}>{content[0]}</Icon>
      <SoftTypography variant="caption" sx={{ color: "inherit" }}>
        {content[1]}
      </SoftTypography>
    </SoftBox>
  );
}
