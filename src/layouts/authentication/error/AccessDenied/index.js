// react-router-dom components
import { Link, useNavigate } from "react-router-dom";

// @mui material components
import Grid from "@mui/material/Grid";

// components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";

// example components
import DefaultNavbar from "examples/Navbars/DefaultNavbar";
import PageLayout from "examples/LayoutContainers/PageLayout";

// base styles
import typography from "assets/theme/base/typography";

// Authentication layout components
import Footer from "layouts/authentication/components/Footer";

// Images
import error404 from "assets/images/illustrations/error-404.png";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

function AccessDenied() {
  const { d1, d3, d4, d5 } = typography;
  const navigation = useNavigate();

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox my={24}>
        <Grid
          container
          spacing={3}
          justifyContent="center"
          alignItems="center"
          sx={{ height: "100%" }}
        >
          <Grid item xs={11} sm={9} container alignItems="center">
            <Grid item xs={12} lg={6}>
              <SoftBox
                fontSize={{ xs: d5.fontSize, sm: d4.fontSize, md: d3.fontSize, lg: d1.fontSize }}
                lineHeight={1.2}
              >
                <SoftTypography variant="inherit" color="error" textGradient fontWeight="bold">
                  Error 401
                </SoftTypography>
              </SoftBox>
              <SoftTypography variant="h4" color="dark" textGradient fontWeight="bold">
                Oopps! Bạn bị giới hạn hoặc không có quyền truy cập vào trang này
              </SoftTypography>
              {/* <SoftBox mt={4} mb={2}>
                <SoftButton
                  onClick={() => {
                    navigation("/manage-accounting-account/accounting-account");
                  }}
                  variant="gradient"
                  color="dark"
                >
                  Trở về
                </SoftButton>
              </SoftBox> */}
            </Grid>
            <Grid item xs={12} lg={6}>
              <SoftBox component="img" src={error404} alt="error-404" width="100%" />
            </Grid>
          </Grid>
        </Grid>
      </SoftBox>
    </DashboardLayout>
  );
}

export default AccessDenied;
