/* eslint-disable react/prop-types */
import { forwardRef } from "react";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// custom styles for the NotificationItem
import { menuItem, menuImage } from "examples/Items/NotificationItem/styles";
import { formatDate } from "utils";
import { timeAgo } from "utils";

const NotificationItem = forwardRef(
  ({ color, image, title, date, content, startTime, endTime, ...rest }, ref) => (
    <MenuItem
      {...rest}
      ref={ref}
      sx={(theme) => menuItem(theme)}
      className="flex flex-col !items-start"
    >
      <SoftBox
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        width="100%"
        gap={2}
      >
        <SoftBox display="flex" flexDirection="column">
          <SoftTypography variant="button" textTransform="capitalize" fontWeight="regular">
            <strong>{title}</strong>
          </SoftTypography>
          <SoftTypography
            variant="button"
            fontWeight="regular"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {content}
          </SoftTypography>
        </SoftBox>
        <SoftTypography
          variant="caption"
          color="secondary"
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <SoftTypography variant="button" color="secondary">
            <Icon
              sx={{
                lineHeight: 1.2,
                mr: 0.5,
              }}
            >
              watch_later
            </Icon>
          </SoftTypography>
          {timeAgo(date)}
        </SoftTypography>
      </SoftBox>
      <div className="flex w-full text-xs mt-2 justify-start">
        <span className="text-left">
          Từ: {formatDate(startTime)} - {formatDate(endTime)}
        </span>
      </div>
    </MenuItem>
  )
);

// Setting default values for the props of NotificationItem
NotificationItem.defaultProps = {
  color: "dark",
};

// Typechecking props for the NotificationItem
NotificationItem.propTypes = {
  color: PropTypes.oneOf([
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "light",
    "dark",
  ]),
  image: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
};

export default NotificationItem;
