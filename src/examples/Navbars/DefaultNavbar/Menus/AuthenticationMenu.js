import { useState } from "react";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// react-router components
import { Link } from "react-router-dom";

// @mui material components
import MenuItem from "@mui/material/MenuItem";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// Soft UI Dashboard PRO React example components
import DefaultNavbarMenu from "examples/Navbars/DefaultNavbar/DefaultNavbarMenu";

// Images
import curved8 from "assets/images/curved-images/curved8.jpg";

function AuthenticationMenu({ routes, open, close, mobileMenu }) {
  const [menuStates, setMenuStates] = useState({});

  const handleOpenMenu = (key, event) => {
    setMenuStates((prev) => ({ ...prev, [key]: event.currentTarget }));
  };

  const handleCloseMenu = (key) => {
    setMenuStates((prev) => ({ ...prev, [key]: false }));
  };

  const renderAuthenticationMenuRoute = (routeName) =>
    routes.map(({ key, name, collapse }) => {
      let template;

      if (key === routeName && !mobileMenu) {
        template = (
          <MenuItem
            key={key}
            onMouseEnter={(e) => handleOpenMenu(key, e)}
            onMouseLeave={() => handleCloseMenu(key)}
          >
            {name}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            <Icon sx={{ fontWeight: "bold", ml: "auto" }}>chevron_right</Icon>
            <DefaultNavbarMenu
              placement="right-start"
              open={menuStates[key]}
              close={() => handleCloseMenu(key)}
              style={{ paddingLeft: "1.25rem" }}
            >
              {collapse.map(({ key: collapseKey, name: collapseName, route }) => (
                <MenuItem
                  component={Link}
                  to={route}
                  key={collapseKey}
                  onClick={mobileMenu ? undefined : close}
                >
                  {collapseName}
                </MenuItem>
              ))}
            </DefaultNavbarMenu>
          </MenuItem>
        );
      } else if (key === routeName && mobileMenu) {
        template = (
          <SoftBox key={key} pr={2} mt={0} mb={2}>
            <SoftTypography variant="h6" fontWeight="bold" gutterBottom>
              {name}
            </SoftTypography>
            {collapse.map(({ key: collapseKey, name: collapseName, route }) => (
              <MenuItem
                component={Link}
                to={route}
                key={collapseKey}
                onClick={mobileMenu ? undefined : close}
              >
                {collapseName}
              </MenuItem>
            ))}
          </SoftBox>
        );
      }

      return template;
    });
}
// Setting default values for the props of AuthenticationMenu
AuthenticationMenu.defaultProps = {
  mobileMenu: false,
  open: false,
  close: false,
};

// Typechecking props for the AuthenticationMenu
AuthenticationMenu.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
  open: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  close: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  mobileMenu: PropTypes.bool,
};

export default AuthenticationMenu;
