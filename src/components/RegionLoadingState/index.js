import PropTypes from "prop-types";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { keyframes } from "@emotion/react";

const shimmer = keyframes`
  0% { background-position: 180% 0; }
  100% { background-position: -180% 0; }
`;

export default function RegionLoadingState({ label, minHeight, rows }) {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: "relative",
        minHeight,
        width: "100%",
        overflow: "hidden",
        px: { xs: 1.5, sm: 2.5 },
        py: 2.5,
        bgcolor: "rgba(248,250,252,.8)",
      }}
    >
      <Box display="grid" gap={1.25} aria-hidden="true">
        {Array.from({ length: rows }).map((_, index) => (
          <Box
            key={index}
            sx={{
              height: index === 0 ? 38 : 48,
              width: index === 0 ? "68%" : "100%",
              borderRadius: 1.5,
              background:
                "linear-gradient(100deg, #edf1f5 25%, #f8fafc 42%, #e6edf3 58%, #edf1f5 75%)",
              backgroundSize: "220% 100%",
              animation: `${shimmer} 1.35s linear infinite`,
            }}
          />
        ))}
      </Box>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            px: 1.75,
            py: 1,
            borderRadius: 4,
            bgcolor: "rgba(255,255,255,.94)",
            border: "1px solid #dbe5ee",
            boxShadow: "0 6px 20px rgba(15,42,68,.1)",
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "#31506d" }}>
            {label}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

RegionLoadingState.defaultProps = {
  label: "Đang tải dữ liệu...",
  minHeight: 240,
  rows: 4,
};

RegionLoadingState.propTypes = {
  label: PropTypes.string,
  minHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  rows: PropTypes.number,
};
