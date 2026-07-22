import Icon from "@mui/material/Icon";
import { useLocation, useNavigate } from "react-router-dom";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

const items = [
  ["/staff-home", "home", "Bảng tin"],
  ["/hoa-don", "add_shopping_cart", "Bán hàng"],
  ["/thu-cong-no", "payments", "Thu nợ"],
  ["/khach-hang", "people", "Khách hàng"],
  ["/quan-ly-xe", "local_shipping", "Xe hàng"],
];

export default function StaffMobileNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <SoftBox display={{ xs: "flex", md: "none" }} position="fixed" left={0} right={0} bottom={0} height={66} zIndex={1300} bgcolor="#fff" alignItems="center" sx={{ borderTop: "1px solid #d8dadf", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map(([path, icon, label]) => {
        const active = pathname === path;
        return <SoftBox key={path} onClick={() => navigate(path)} width="20%" textAlign="center" sx={{ color: active ? "#1877f2" : "#65676b", cursor: "pointer" }}><Icon>{icon}</Icon><SoftTypography variant="caption" display="block" sx={{ color: "inherit", fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</SoftTypography></SoftBox>;
      })}
    </SoftBox>
  );
}
