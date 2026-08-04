import { useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import SwipeableDrawer from "@mui/material/SwipeableDrawer";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import NotificationCenter from "components/NotificationCenter";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import StaffAccountMenu from "components/StaffAccountMenu";

const primaryItems = [
  { path: "/dashboards", icon: "space_dashboard", label: "Tổng quan" },
  { path: "/hoa-don", icon: "receipt_long", label: "Hóa đơn" },
  { path: "/khach-hang", icon: "groups", label: "Khách hàng" },
  { path: "/ton-kho", icon: "inventory_2", label: "Tồn kho" },
];

const menuGroups = [
  {
    title: "Bán hàng & khách hàng",
    items: [
      { path: "/hoa-don?create=1", icon: "add_shopping_cart", label: "Tạo hóa đơn", color: "#1976d2" },
      { path: "/khach-hang", icon: "groups", label: "Khách hàng", color: "#00897b" },
      { path: "/khuyen-mai", icon: "redeem", label: "Khuyến mãi", color: "#8e24aa" },
    ],
  },
  {
    title: "Kho & vận hành",
    items: [
      { path: "/ton-kho", icon: "inventory_2", label: "Tồn kho", color: "#ef6c00" },
      { path: "/hang-hoa", icon: "category", label: "Hàng hóa", color: "#1565c0" },
      { path: "/nhap-kho", icon: "move_to_inbox", label: "Nhập kho", color: "#2e7d32" },
      { path: "/quan-ly-xe", icon: "local_shipping", label: "Xe hàng", color: "#455a64" },
      { path: "/danh-muc", icon: "format_list_bulleted", label: "Danh mục", color: "#5e35b1" },
      { path: "/nha-cung-cap", icon: "factory", label: "Nhà cung cấp", color: "#6d4c41" },
    ],
  },
  {
    title: "Quản trị & báo cáo",
    items: [
      { path: "/bao-cao", icon: "analytics", label: "Báo cáo", color: "#0277bd" },
      { path: "/nhan-vien", icon: "badge", label: "Nhân viên", color: "#00796b" },
      { path: "/audit-logs", icon: "history", label: "Nhật ký", color: "#546e7a" },
      { path: "/backup-data", icon: "cloud_sync", label: "Sao lưu", color: "#ad1457" },
    ],
  },
];

const pageTitles = [
  ["/dashboards", "Tổng quan quản trị"],
  ["/hoa-don", "Quản lý hóa đơn"],
  ["/khach-hang", "Quản lý khách hàng"],
  ["/ton-kho", "Tồn kho chính"],
  ["/hang-hoa", "Quản lý hàng hóa"],
  ["/nhap-kho", "Nhập kho"],
  ["/quan-ly-xe", "Quản lý xe hàng"],
  ["/khuyen-mai", "Chương trình khuyến mãi"],
  ["/nhan-vien", "Quản lý nhân viên"],
  ["/bao-cao", "Báo cáo"],
  ["/audit-logs", "Nhật ký hoạt động"],
  ["/backup-data", "Sao lưu dữ liệu"],
  ["/danh-muc", "Danh mục"],
  ["/nha-cung-cap", "Nhà cung cấp"],
];

const initials = (value = "AD") =>
  String(value)
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function AdminTouchNavigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down("sm"));
  const user = useSelector((state) => state.auth?.user || {});
  const name = user.fullName || user.name || user.username || "Quản trị viên";
  const title = useMemo(
    () => pageTitles.find(([path]) => pathname.startsWith(path))?.[1] || "Phúc Long Admin",
    [pathname]
  );

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      <SoftBox
        component="header"
        className="admin-touch-header"
        display={{ xs: "flex", xl: "none" }}
        position="fixed"
        top={0}
        left={0}
        right={0}
        zIndex={1250}
        height={{
          xs: "calc(68px + env(safe-area-inset-top))",
          sm: "calc(76px + env(safe-area-inset-top))",
        }}
        px={{ xs: 1.5, sm: 2.5 }}
        alignItems="center"
        gap={{ xs: 1, sm: 1.5 }}
        bgcolor="rgba(255,255,255,0.96)"
        sx={{
          borderBottom: "1px solid #e3e8ef",
          backdropFilter: "blur(14px)",
          paddingTop: "env(safe-area-inset-top)",
          boxSizing: "border-box",
        }}
      >
        <IconButton
          aria-label="Mở menu quản trị"
          onClick={() => setMenuOpen(true)}
          sx={{ width: 48, height: 48, bgcolor: "#eef5ff", color: "#1565c0" }}
        >
          <Icon>menu</Icon>
        </IconButton>
        <Avatar
          src={user.avatar || user.avatarUrl}
          sx={{ width: 44, height: 44, bgcolor: "#1976d2", fontSize: 14 }}
        >
          {initials(name)}
        </Avatar>
        <SoftBox flex={1} minWidth={0}>
          <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
            {title}
          </SoftTypography>
          <SoftTypography variant="caption" color="text" display="block" noWrap>
            {name} · Quản trị viên
          </SoftTypography>
        </SoftBox>
        <NotificationCenter />
        <StaffAccountMenu />
      </SoftBox>

      <SoftBox
        component="nav"
        className="admin-touch-bottom-nav"
        display={{ xs: "flex", xl: "none" }}
        position="fixed"
        left={0}
        right={0}
        bottom={0}
        zIndex={1250}
        minHeight={{
          xs: "calc(70px + env(safe-area-inset-bottom))",
          sm: "calc(76px + env(safe-area-inset-bottom))",
        }}
        bgcolor="rgba(255,255,255,0.97)"
        alignItems="flex-start"
        justifyContent="space-around"
        px={{ xs: 0.5, sm: 5 }}
        pt={0.75}
        sx={{
          borderTop: "1px solid #dfe5ec",
          boxShadow: "0 -8px 24px rgba(30, 55, 80, 0.07)",
          backdropFilter: "blur(14px)",
          paddingBottom: "max(6px, env(safe-area-inset-bottom))",
          boxSizing: "border-box",
        }}
      >
        {primaryItems.map((item) => {
          const active = pathname.startsWith(item.path);
          return (
            <SoftBox
              key={item.path}
              component="button"
              type="button"
              onClick={() => go(item.path)}
              aria-label={item.label}
              sx={{
                border: 0,
                bgcolor: "transparent",
                color: active ? "#1565c0" : "#687684",
                minWidth: { xs: 62, sm: 94 },
                minHeight: 56,
                borderRadius: 2,
                cursor: "pointer",
                "&:active": { bgcolor: "#e8f2ff" },
              }}
            >
              <Icon sx={{ fontSize: { xs: 24, sm: 27 } }}>{item.icon}</Icon>
              <SoftTypography
                variant="caption"
                display="block"
                sx={{ color: "inherit", fontSize: { xs: 10.5, sm: 12 }, fontWeight: active ? 800 : 600 }}
              >
                {item.label}
              </SoftTypography>
            </SoftBox>
          );
        })}
        <SoftBox
          component="button"
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Mở tất cả chức năng"
          sx={{
            border: 0,
            bgcolor: menuOpen ? "#e8f2ff" : "transparent",
            color: menuOpen ? "#1565c0" : "#687684",
            minWidth: { xs: 62, sm: 94 },
            minHeight: 56,
            borderRadius: 2,
            cursor: "pointer",
          }}
        >
          <Icon sx={{ fontSize: { xs: 24, sm: 27 } }}>apps</Icon>
          <SoftTypography
            variant="caption"
            display="block"
            sx={{ color: "inherit", fontSize: { xs: 10.5, sm: 12 }, fontWeight: 600 }}
          >
            Tất cả
          </SoftTypography>
        </SoftBox>
      </SoftBox>

      <SoftBox
        component="button"
        type="button"
        aria-label="Kéo mở menu quản trị"
        onClick={() => setMenuOpen(true)}
        display={{ xs: "flex", xl: "none" }}
        position="fixed"
        left={0}
        top="48%"
        zIndex={1240}
        width={32}
        height={72}
        alignItems="center"
        justifyContent="center"
        sx={{
          border: "1px solid #bbd6f5",
          borderLeft: 0,
          borderRadius: "0 14px 14px 0",
          bgcolor: "rgba(232, 242, 255, 0.96)",
          color: "#1565c0",
          boxShadow: "4px 0 14px rgba(21, 101, 192, 0.16)",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          transform: menuOpen ? "translateX(-110%)" : "translateX(0)",
          transition: theme.transitions.create(["transform", "box-shadow"], {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
          }),
          "&:active": { bgcolor: "#d6eaff", boxShadow: "2px 0 8px rgba(21, 101, 192, 0.2)" },
        }}
      >
        <Icon sx={{ fontSize: 22 }}>chevron_right</Icon>
      </SoftBox>

      <SwipeableDrawer
        // Theme gốc đang là RTL nên MUI đảo anchor. "right" tương ứng mép trái thực tế.
        anchor="right"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpen={() => setMenuOpen(true)}
        swipeAreaWidth={phone ? 28 : 36}
        hysteresis={0.28}
        minFlingVelocity={320}
        disableBackdropTransition={false}
        ModalProps={{
          keepMounted: true,
          disableScrollLock: true,
          sx: { zIndex: 1450 },
        }}
        PaperProps={{
          sx: {
            position: "fixed !important",
            top: "0 !important",
            right: "auto !important",
            bottom: "0 !important",
            left: "0 !important",
            width: phone ? "min(88vw, 380px)" : 440,
            maxWidth: "92vw",
            height: "100dvh !important",
            maxHeight: "100dvh !important",
            margin: "0 !important",
            borderRadius: "0 24px 24px 0 !important",
            p: { xs: 2, sm: 2.5 },
            pt: "calc(16px + env(safe-area-inset-top))",
            pb: "calc(16px + env(safe-area-inset-bottom))",
            overflowY: "auto",
            boxShadow: "14px 0 40px rgba(20, 42, 65, 0.2)",
            transition: theme.transitions.create("transform", {
              duration: theme.transitions.duration.standard,
              easing: theme.transitions.easing.easeInOut,
            }),
          },
        }}
      >
        <SoftBox display="flex" alignItems="center" gap={1.25} mb={1.5}>
          <SoftBox
            width={46}
            height={46}
            borderRadius={2}
            bgcolor="#e8f2ff"
            color="#1565c0"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon>admin_panel_settings</Icon>
          </SoftBox>
          <SoftBox flex={1}>
            <SoftTypography variant="h6" fontWeight="bold">
              Trung tâm quản trị
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Chọn nhanh chức năng bằng chạm hoặc bút cảm ứng
            </SoftTypography>
          </SoftBox>
          <IconButton
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng menu quản trị"
            sx={{ width: 46, height: 46, bgcolor: "#f0f2f5", color: "#455a64" }}
          >
            <Icon>arrow_back</Icon>
          </IconButton>
        </SoftBox>
        <Divider />
        {menuGroups.map((group) => (
          <SoftBox key={group.title} mt={2}>
            <SoftTypography
              variant="caption"
              fontWeight="bold"
              color="text"
              textTransform="uppercase"
              display="block"
              mb={1}
            >
              {group.title}
            </SoftTypography>
            <SoftBox
              display="grid"
              sx={{ gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}
            >
              {group.items.map((item) => {
                const active = pathname.startsWith(item.path.split("?")[0]);
                return (
                  <SoftBox
                    key={item.path}
                    component="button"
                    type="button"
                    onClick={() => go(item.path)}
                    sx={{
                      border: active ? `2px solid ${item.color}` : "1px solid #dfe5ec",
                      bgcolor: active ? `${item.color}10` : "#fff",
                      borderRadius: 2.5,
                      minHeight: 96,
                      p: 1.25,
                      textAlign: "left",
                      cursor: "pointer",
                      color: item.color,
                      "&:active": { transform: "scale(0.98)", bgcolor: `${item.color}18` },
                    }}
                  >
                    <Icon sx={{ fontSize: 27 }}>{item.icon}</Icon>
                    <SoftTypography
                      variant="button"
                      fontWeight="bold"
                      display="block"
                      mt={0.75}
                      sx={{ color: "#263238", lineHeight: 1.25 }}
                    >
                      {item.label}
                    </SoftTypography>
                  </SoftBox>
                );
              })}
            </SoftBox>
          </SoftBox>
        ))}
      </SwipeableDrawer>
    </>
  );
}
