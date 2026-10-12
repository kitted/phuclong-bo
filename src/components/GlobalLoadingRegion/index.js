import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@emotion/react";
import { getActiveRequestCount, subscribeGlobalLoading } from "services/globalLoading";

const sweep = keyframes`
  0% { transform: translateX(-110%) scaleX(.28); }
  55% { transform: translateX(8%) scaleX(.72); }
  100% { transform: translateX(110%) scaleX(.28); }
`;
const pulse = keyframes`
  0%, 100% { opacity: .38; transform: scale(.78); }
  50% { opacity: 1; transform: scale(1); }
`;

const SHOW_DELAY = 180;
const MIN_VISIBLE_TIME = 360;

export default function GlobalLoadingRegion() {
  const [busy, setBusy] = useState(() => getActiveRequestCount() > 0);
  const [visible, setVisible] = useState(false);
  const visibleSince = useRef(0);
  const showTimer = useRef();
  const hideTimer = useRef();

  useEffect(() => subscribeGlobalLoading((count) => setBusy(count > 0)), []);

  useEffect(() => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);
    if (busy && !visible) {
      showTimer.current = window.setTimeout(() => {
        visibleSince.current = Date.now();
        setVisible(true);
      }, SHOW_DELAY);
    } else if (!busy && visible) {
      const elapsed = Date.now() - visibleSince.current;
      hideTimer.current = window.setTimeout(
        () => setVisible(false),
        Math.max(0, MIN_VISIBLE_TIME - elapsed)
      );
    }
    return () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
    };
  }, [busy, visible]);

  if (!visible) return null;

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-label="Vùng nội dung đang tải dữ liệu"
      sx={{
        position: "absolute",
        zIndex: 30,
        top: 0,
        left: 0,
        right: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          overflow: "hidden",
          borderRadius: 2,
          bgcolor: "rgba(15, 76, 129, .1)",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            transformOrigin: "left center",
            background: "linear-gradient(90deg, #0f4c81, #1f8b73, #f4511e)",
            animation: `${sweep} 1.15s ease-in-out infinite`,
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          py: 0.65,
          borderRadius: 5,
          border: "1px solid rgba(15,76,129,.14)",
          bgcolor: "rgba(255,255,255,.96)",
          boxShadow: "0 5px 18px rgba(15,42,68,.12)",
        }}
      >
        <Box display="flex" gap="3px">
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: index === 2 ? "#f4511e" : index === 1 ? "#1f8b73" : "#0f4c81",
                animation: `${pulse} .85s ease-in-out ${index * 0.14}s infinite`,
              }}
            />
          ))}
        </Box>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "#31506d" }}>
          Đang cập nhật dữ liệu
        </Typography>
      </Box>
    </Box>
  );
}
