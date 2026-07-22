import Avatar from "@mui/material/Avatar";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import { useSelector } from "react-redux";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import StaffAccountMenu from "components/StaffAccountMenu";

const initials = (name = "NV") => name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();

export default function StaffMobileHeader({ title, subtitle, onRefresh }) {
  const user = useSelector((state) => state.auth?.user || {});
  const name = user.fullName || user.name || user.username || "Nhân viên";
  return (
    <SoftBox display={{ xs: "flex", md: "none" }} position="sticky" top={0} zIndex={1200} bgcolor="#fff" px={2} py={1.25} alignItems="center" gap={1.2} sx={{ borderBottom: "1px solid #e4e6eb" }}>
      <Avatar src={user.avatar || user.avatarUrl} sx={{ width: 42, height: 42, bgcolor: "#1877f2", fontSize: 15 }}>{initials(name)}</Avatar>
      <SoftBox flex={1} minWidth={0}><SoftTypography variant="button" fontWeight="bold" display="block" noWrap>{title}</SoftTypography><SoftTypography variant="caption" color="text" display="block" noWrap>{subtitle || name}</SoftTypography></SoftBox>
      {onRefresh && <IconButton onClick={onRefresh} sx={{ bgcolor: "#f0f2f5" }}><Icon>refresh</Icon></IconButton>}
      <StaffAccountMenu />
    </SoftBox>
  );
}
