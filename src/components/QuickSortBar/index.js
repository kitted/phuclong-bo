import PropTypes from "prop-types";
import Icon from "@mui/material/Icon";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

export default function QuickSortBar({
  label,
  options,
  value,
  onChange,
  color,
  mobileColumns,
  compact,
}) {
  return (
    <SoftBox minWidth={0}>
      {label && (
        <SoftTypography variant="caption" color="text" fontWeight="bold" display="block" mb={0.7}>
          {label}
        </SoftTypography>
      )}
      <SoftBox
        gap={0.75}
        role="group"
        aria-label={label || "Sắp xếp"}
        sx={{
          display: { xs: "grid", sm: "flex" },
          gridTemplateColumns: {
            xs: `repeat(${mobileColumns}, minmax(0, 1fr))`,
            sm: "none",
          },
          flexWrap: { sm: "wrap" },
          width: "100%",
        }}
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <SoftBox
              key={option.value}
              component="button"
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              display="flex"
              alignItems="center"
              justifyContent="center"
              gap={0.6}
              px={compact ? 0.85 : 1.25}
              py={compact ? 0.65 : 0.75}
              minHeight={compact ? 36 : 40}
              borderRadius={2}
              sx={{
                width: { xs: "100%", sm: "auto" },
                minWidth: { sm: compact ? 88 : 108 },
                border: `1px solid ${active ? color : "#dbe2ea"}`,
                bgcolor: active ? `${color}14` : "#fff",
                color: active ? color : "#526271",
                fontFamily: "inherit",
                fontSize: compact ? 11.5 : 12,
                fontWeight: active ? 800 : 600,
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                cursor: "pointer",
                boxShadow: active ? `0 3px 10px ${color}1f` : "none",
                transition: "border-color .16s ease, background .16s ease, color .16s ease",
                "&:focus-visible": {
                  outline: `3px solid ${color}30`,
                  outlineOffset: 2,
                },
              }}
            >
              {option.icon && (
                <Icon sx={{ fontSize: { xs: 15, sm: 17 }, flexShrink: 0 }}>{option.icon}</Icon>
              )}
              <SoftBox
                component="span"
                minWidth={0}
                sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {option.label}
              </SoftBox>
              {active && (
                <Icon sx={{ fontSize: 16, flexShrink: 0, display: { xs: "none", sm: "block" } }}>
                  check
                </Icon>
              )}
            </SoftBox>
          );
        })}
      </SoftBox>
    </SoftBox>
  );
}

QuickSortBar.defaultProps = {
  label: "Sắp xếp nhanh",
  color: "#1976d2",
  mobileColumns: 2,
  compact: false,
};

QuickSortBar.propTypes = {
  label: PropTypes.string,
  color: PropTypes.string,
  mobileColumns: PropTypes.number,
  compact: PropTypes.bool,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      icon: PropTypes.string,
    })
  ).isRequired,
};
