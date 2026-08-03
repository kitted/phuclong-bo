import { useEffect } from "react";

// react-router-dom components
import { useLocation } from "react-router-dom";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";

// Soft UI Dashboard PRO React context
import { useSoftUIController, setLayout } from "context";
import { useSelector } from "react-redux";

function DashboardLayout({ children, compactMobile = false }) {
  const [controller, dispatch] = useSoftUIController();
  const { miniSidenav } = controller;
  const { pathname } = useLocation();
  const isAdmin = useSelector(
    (state) => String(state.auth?.user?.role || "").toLowerCase() === "admin"
  );

  useEffect(() => {
    setLayout(dispatch, "dashboard");
  }, [pathname]);

  return (
    <SoftBox
      sx={({ breakpoints, transitions, functions: { pxToRem } }) => ({
        p: compactMobile ? { xs: 0, md: 3 } : isAdmin ? undefined : 3,
        px: isAdmin ? { xs: 1, sm: 1.5, md: 2, xl: 3 } : undefined,
        pt: isAdmin
          ? {
              xs: "calc(80px + env(safe-area-inset-top))",
              sm: "calc(90px + env(safe-area-inset-top))",
              xl: 3,
            }
          : undefined,
        pb: isAdmin
          ? {
              xs: "calc(86px + env(safe-area-inset-bottom))",
              sm: "calc(94px + env(safe-area-inset-bottom))",
              xl: 3,
            }
          : undefined,
        minHeight: "100vh",
        position: "relative",
        touchAction: "manipulation",

        [breakpoints.up("xl")]: {
          marginLeft: miniSidenav ? pxToRem(120) : pxToRem(274),
          transition: transitions.create(["margin-left", "margin-right"], {
            easing: transitions.easing.easeInOut,
            duration: transitions.duration.standard,
          }),
        },
      })}
    >
      {children}
    </SoftBox>
  );
}

// Typechecking props for the DashboardLayout
DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
  compactMobile: PropTypes.bool,
};

export default DashboardLayout;
