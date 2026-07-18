import { useEffect, useState } from "react";

// react-router components
import { Link, useLocation, useNavigate } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui core components
import ChangeCircleOutlinedIcon from "@mui/icons-material/ChangeCircleOutlined";
import AppBar from "@mui/material/AppBar";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import Toolbar from "@mui/material/Toolbar";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard PRO React example components
import NotificationItem from "examples/Items/NotificationItem";

// Custom styles for DashboardNavbar
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
} from "@mui/material";
import {
  navbar,
  navbarContainer,
  navbarDesktopMenu,
  navbarIconButton,
  navbarMobileMenu,
  navbarRow,
} from "examples/Navbars/DashboardNavbar/styles";
// Soft UI Dashboard PRO React context
import { styled } from "@mui/material/styles";
import {
  setMiniSidenav,
  setOpenConfigurator,
  setTransparentNavbar,
  useSoftUIController,
} from "context";
// Images
import { Badge, Tooltip } from "@mui/material";
import brand from "assets/images/logo-dhbk.png";

import { useDispatch, useSelector } from "react-redux";
// import { NotificationService } from "services/notificationService";
import { timeAgo } from "utils";
import { authSelector } from "./../../../redux/selector";
import { logout } from "./../../../redux/slice/authSlice";
import { formatDate } from "utils";

function DashboardNavbar({ absolute, light, isMini }) {
  const [navbarType, setNavbarType] = useState();
  const [controller, dispatch] = useSoftUIController();
  const { miniSidenav, transparentNavbar, fixedNavbar, openConfigurator } = controller;
  const [openMenu, setOpenMenu] = useState(false);
  const route = useLocation().pathname.split("/").slice(1);
  const { user } = useSelector(authSelector);
  const dispatchRedux = useDispatch();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedNoti, setSelectedNoti] = useState({});
  const navigation = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const openUser = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseUser = () => {
    setAnchorEl(null);
  };

  const handleClickOpen = (item) => {
    setOpen(true);
    setSelectedNoti(item);
    handleCloseMenu();
  };

  const goToActivity = async () => {
    try {
      // await NotificationService.read(selectedNoti._id);
      // navigation(`/user-quan-ly-hoat-dong/hoat-dong/${selectedNoti.activity._id}`);
      setSelectedNoti({});
      setOpen(false);
      getNotification();
    } catch (error) {
      console.log(error);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    getNotification();
  }, []);

  useEffect(() => {
    // console.log(user);

    const id = setInterval(() => {
      (async () => {
        getNotification();
      })();
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const getNotification = async () => {
    try {
      if (user?.role === "user") {
        // const {
        //   data: { items },
        // } = await NotificationService.getForUser({ type: "Chưa đọc" });
        // setNotifications(items);
      }
    } catch (error) {
      console.log({ error });
    }
  };

  useEffect(() => {
    // Setting the navbar type
    if (fixedNavbar) {
      setNavbarType("sticky");
    } else {
      setNavbarType("static");
    }

    function handleTransparentNavbar() {
      setTransparentNavbar(dispatch, (fixedNavbar && window.scrollY === 0) || !fixedNavbar);
    }

    window.addEventListener("scroll", handleTransparentNavbar);

    // Call the handleTransparentNavbar function to set the state with the initial value.
    handleTransparentNavbar();

    // Remove event listener on cleanup
    return () => window.removeEventListener("scroll", handleTransparentNavbar);
  }, [dispatch, fixedNavbar]);

  const handleMiniSidenav = () => setMiniSidenav(dispatch, !miniSidenav);
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);
  const handleOpenMenu = (event) => setOpenMenu(event.currentTarget);
  const handleCloseMenu = () => setOpenMenu(false);

  const handleLogout = () => {
    dispatchRedux(logout());
  };

  // Render the notifications menu
  const renderMenu = () => (
    <Menu
      anchorEl={openMenu}
      anchorReference={null}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      open={Boolean(openMenu)}
      onClose={handleCloseMenu}
    >
      {notifications &&
        notifications.length > 0 &&
        notifications.map((noti) => (
          <NotificationItem
            key={noti._id}
            image={<img src={brand} alt="logo" />}
            title={noti?.type}
            content={noti?.activity?.name}
            date={timeAgo(noti.createdAt)}
            onClick={() => handleClickOpen(noti)}
            startTime={noti?.activity?.startTime}
            endTime={noti?.activity?.endTime}
          />
        ))}
    </Menu>
  );

  const StyledBadge = styled(Badge)(({ theme }) => ({
    "& .MuiBadge-badge": {
      right: -3,
      top: 0,
      border: `2px solid ${theme.palette.background.paper}`,
      padding: "0 4px",
    },
  }));

  return (
    <AppBar
      position={absolute ? "absolute" : navbarType}
      color="inherit"
      sx={(theme) => navbar(theme, { transparentNavbar, absolute, light })}
    >
      <Toolbar sx={(theme) => navbarContainer(theme)}>
        <SoftBox color="inherit" mb={{ xs: 1, md: 0 }} sx={(theme) => navbarRow(theme, { isMini })}>
          {/* <Breadcrumbs icon="home" title={route[route.length - 1]} route={route} light={light} /> */}
          <Icon fontSize="medium" sx={navbarDesktopMenu} onClick={handleMiniSidenav}>
            {miniSidenav ? "menu_open" : "menu"}
          </Icon>
        </SoftBox>
        {isMini ? null : (
          <SoftBox sx={(theme) => navbarRow(theme, { isMini })}>
            <SoftBox color={light ? "white" : "inherit"}>
              <IconButton
                onClick={handleClick}
                aria-controls={openUser ? "basic-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={openUser ? "true" : undefined}
                sx={navbarIconButton}
                size="small"
              >
                <Icon
                  sx={({ palette: { dark, white } }) => ({
                    color: light ? white.main : dark.main,
                  })}
                >
                  account_circle
                </Icon>
                <SoftTypography
                  variant="button"
                  fontWeight="medium"
                  color={light ? "white" : "dark"}
                >
                  {user && Object.keys(user).length > 0
                    ? `Xin chào, ${
                        user?.personalInformation?.fullName ||
                        user?.personalInformation?.email ||
                        user?.personalInformation?.phone ||
                        user?.username
                      }`
                    : " Đăng nhập"}
                </SoftTypography>
              </IconButton>
              <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={openUser}
                onClose={handleCloseUser}
                MenuListProps={{
                  "aria-labelledby": "basic-button",
                }}
              >
                <Link to="/user/change-password">
                  <MenuItem sx={{ padding: "0px" }}>
                    <Box display="flex" alignItems="center">
                      <IconButton>
                        <SoftTypography
                          variant="body1"
                          color="text"
                          sx={{ cursor: "pointer", lineHeight: 0 }}
                        >
                          <Tooltip title="Đăng xuất" placement="top">
                            {/* <Icon>password</Icon> */}
                            <ChangeCircleOutlinedIcon />
                          </Tooltip>
                        </SoftTypography>
                      </IconButton>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <p>Đổi mật khẩu</p>
                      </div>
                    </Box>
                  </MenuItem>
                </Link>
                <MenuItem sx={{ padding: "2px" }} onClick={handleLogout}>
                  <Box display="flex" alignItems="center">
                    <IconButton>
                      <SoftTypography
                        variant="body1"
                        color="text"
                        sx={{ cursor: "pointer", lineHeight: 0 }}
                      >
                        <Tooltip title="Đăng xuất" placement="top">
                          <Icon>logout</Icon>
                        </Tooltip>
                      </SoftTypography>
                    </IconButton>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <p>Đăng xuất</p>
                    </div>
                  </Box>
                </MenuItem>
              </Menu>
              <IconButton
                size="small"
                color="inherit"
                sx={navbarMobileMenu}
                onClick={handleMiniSidenav}
              >
                <Icon className={light ? "text-white" : "text-dark"}>
                  {miniSidenav ? "menu_open" : "menu"}
                </Icon>
              </IconButton>
              {/* <IconButton
                size="small"
                color="inherit"
                sx={navbarIconButton}
                onClick={handleConfiguratorOpen}
              >
                <Icon>settings</Icon>
              </IconButton> */}

              {user?.role === "user" && (
                <IconButton
                  size="medium"
                  color="inherit"
                  sx={navbarIconButton}
                  aria-controls="notification-menu"
                  aria-haspopup="true"
                  variant="contained"
                  onClick={handleOpenMenu}
                >
                  <StyledBadge
                    badgeContent={
                      notifications.length
                        ? notifications.length > 99
                          ? "+99"
                          : notifications.length
                        : 0
                    }
                    color="info"
                  >
                    <Icon className={light ? "text-white" : "text-dark"}>notifications</Icon>
                  </StyledBadge>
                </IconButton>
              )}

              {renderMenu()}
            </SoftBox>
          </SoftBox>
        )}
      </Toolbar>
      <Dialog
        open={open}
        // onClose={handleRead}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          <p>{selectedNoti.type}</p>
          <SoftTypography
            variant="caption"
            sx={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <SoftTypography variant="button">
              <Icon
                sx={{
                  lineHeight: 1.2,
                  mr: 0.5,
                }}
              >
                watch_later
              </Icon>
            </SoftTypography>
            <p style={{ fontSize: 14 }}>{timeAgo(selectedNoti.createdAt)}</p>
          </SoftTypography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            <SoftBox display="flex" alignItems="flex-start" gap={2}>
              <SoftBox display="flex" flexDirection="column">
                <SoftTypography
                  variant="button"
                  fontWeight="regular"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  fontSize={16}
                >
                  {selectedNoti?.activity?.name}
                </SoftTypography>
              </SoftBox>
            </SoftBox>
            <div className="flex w-full text-sm mt-2 justify-start">
              <span className="text-left">
                Từ: {formatDate(selectedNoti?.activity?.startTime)} -{" "}
                {formatDate(selectedNoti?.activity?.endTime)}
              </span>
            </div>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} autoFocus>
            Bỏ qua
          </Button>
          <Button onClick={goToActivity} autoFocus>
            Đi đến hoạt động
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
}

// Setting default values for the props of DashboardNavbar
DashboardNavbar.defaultProps = {
  absolute: false,
  light: false,
  isMini: false,
};

// Typechecking props for the DashboardNavbar
DashboardNavbar.propTypes = {
  absolute: PropTypes.bool,
  light: PropTypes.bool,
  isMini: PropTypes.bool,
};

export default DashboardNavbar;
