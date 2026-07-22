import React, { useState, useEffect, useMemo } from "react";
import "react-toastify/dist/ReactToastify.css";
// react-router components
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";

// Soft UI Dashboard PRO React example components
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";

// Soft UI Dashboard PRO React themes
import themeRTL from "assets/theme/theme-rtl";

// Phuc Long Warehouse App routes
import routes from "routes";
import ForgotPassword from "layouts/authentication/reset-password/illustration";
import ChangePassword from "layouts/authentication/change-password";
import AccessDenied from "layouts/authentication/error/AccessDenied";

// Soft UI Dashboard PRO React contexts
import { useSoftUIController, setMiniSidenav, setOpenConfigurator } from "context";
// import axios from "axios";

// Images
import "./assets/style/custom.css";
import { useSelector } from "react-redux";
import { authSelector } from "redux/selector";
import Illustration from "layouts/authentication/sign-in/illustration";
import { ToastContainer } from "react-toastify";
import StaffMobileNav from "components/StaffMobileNav";
export default function App() {
  const [controller, dispatch] = useSoftUIController();
  const { miniSidenav, direction, layout, openConfigurator, sidenavColor } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const { pathname } = useLocation();
  const { user } = useSelector(authSelector);

  // Open sidenav when mouse enter on mini sidenav
  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };

  // Close sidenav when mouse leave mini sidenav
  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };

  // Change the openConfigurator state
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      let isPermission = Object?.entries(route?.permission)?.map(([key, value]) => ({
        value,
      }));
      if (route.collapse && isPermission.some((value) => value.value === user.role)) {
        return getRoutes(route.collapse);
      }

      if (route.route && isPermission.some((value) => value.value === user.role)) {
        return <Route exact path={route.route} element={route.component} key={route.key} />;
      }

      return null;
    });

  const configsButton = (
    <SoftBox
      display="flex"
      justifyContent="center"
      alignItems="center"
      width="3.5rem"
      height="3.5rem"
      bgColor="white"
      shadow="sm"
      borderRadius="50%"
      position="fixed"
      right="2rem"
      bottom="2rem"
      zIndex={99}
      color="dark"
      sx={{ cursor: "pointer" }}
      onClick={handleConfiguratorOpen}
    >
      <Icon fontSize="default" color="inherit">
        settings
      </Icon>
    </SoftBox>
  );

  // const sendRequest = async () => {
  //   try {
  //     await axios.get(`${process.env.REACT_APP_API_URL}/auth/me`);
  //   } catch (error) {
  //     console.error("Error sending request:", error);
  //   }
  // };

  // UseEffect để gửi request mỗi 14 phút
  // useEffect(() => {
  //   if (!user) return; // Nếu chưa đăng nhập thì không gửi request

  //   const interval = setInterval(() => {
  //     sendRequest(); // Gửi request mỗi 14 phút
  //   }, 840000); // 14 phút = 14 * 60 * 1000 ms

  //   // Gửi ngay khi lần đầu tiên render (nếu cần)
  //   sendRequest();

  //   // Cleanup khi component unmount
  //   return () => {
  //     clearInterval(interval); // Dọn dẹp interval khi component unmount
  //   };
  // }, [user]); // Gửi request khi user thay đổi (login/logout)

  return (
    <ThemeProvider theme={themeRTL}>
      <CssBaseline />
      {layout === "dashboard" && pathname !== "/staff-home" && (
        <>
          <Sidenav
            color={sidenavColor}
            brandName="Phúc Long"
            subTitle="Quản lý Kho"
            routes={routes}
            user={user}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
        </>
      )}
      <Routes>
        {!user || Object.keys(user).length <= 0 ? (
          <>
            <Route exact path="*" element={<Illustration />} key="sign-in" />
            <Route
              exact
              path="/dashboards/forgot-password"
              element={<ForgotPassword />}
              key="forgot-password"
            />
            <Route path="*" element={<Navigate to="" />} />
          </>
        ) : (
          <>
            {getRoutes(routes)}
            <Route exact path="/access-denied" element={<AccessDenied />} />
            <Route exact path="/user/change-password" element={<ChangePassword />} />
            <Route
              path="*"
              element={<Navigate to={user?.role === "staff" ? "/staff-home" : "/dashboards"} />}
            />
          </>
        )}
      </Routes>
      {user?.role === "staff" && <StaffMobileNav />}
      <ToastContainer autoClose={5000} />
    </ThemeProvider>
  );
}
