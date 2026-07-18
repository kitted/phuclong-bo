import { useMemo } from "react";

// react-router-dom components
import { Link } from "react-router-dom";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// react-chartjs-2 components
import { Doughnut } from "react-chartjs-2";

// @mui material components
import Card from "@mui/material/Card";
import Tooltip from "@mui/material/Tooltip";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftButton from "components/SoftButton";

// Soft UI Dashboard PRO React example components
import ComplexReportsDoughnutChartItem from "examples/Charts/DoughnutCharts/ComplexReportsDoughnutChart/ComplexReportsDoughnutChartItem";

// ComplexReportsDoughnutChart configurations
import configs from "examples/Charts/DoughnutCharts/ComplexReportsDoughnutChart/configs";

function ComplexReportsDoughnutChart({ title, chart, tooltip, action }) {
  const { data, options } = configs(chart.labels || [], chart.datasets || {});

  const renderItems = chart.labels
    ? chart.labels.map((label, key) => (
        <ComplexReportsDoughnutChartItem
          image={chart.images && chart.images[key]}
          title={label}
          key={label}
          percentage={`${chart.datasets && chart.datasets.data ? chart.datasets.data[key] : 0}`}
          hasBorder={true}
        />
      ))
    : null;

  const renderButton = () => {
    let template;

    if (action) {
      template =
        action.type === "internal" ? (
          <SoftBox mt={3} mb={2}>
            <SoftButton
              component={Link}
              to={action.route}
              variant="gradient"
              color={action.color}
              size="small"
            >
              {action.label}
            </SoftButton>
          </SoftBox>
        ) : (
          <SoftBox mt={3} mb={2}>
            <SoftButton
              component="a"
              href={action.route}
              target="_blank"
              rel="noreferrer"
              variant="gradient"
              color={action.color}
              size="small"
            >
              {action.label}
            </SoftButton>
          </SoftBox>
        );
    }

    return template;
  };

  return (
    <Card sx={{ height: "100%", overflow: "hidden" }}>
      <SoftBox display="flex" pt={2} px={2}>
        <SoftTypography variant="h6">{title}</SoftTypography>
        {tooltip && (
          <Tooltip title={tooltip} placement="right">
            <SoftButton variant="outlined" color="secondary" size="small" circular iconOnly>
              <Icon>priority_high</Icon>
            </SoftButton>
          </Tooltip>
        )}
      </SoftBox>
      <SoftBox
        position="relative"
        p={2}
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <SoftBox display="flex" width="100%">
          {useMemo(() => renderItems, [chart])}
        </SoftBox>
        <SoftBox display="flex" alignItems="center" justifyContent="center" width="50%" mt={3}>
          {useMemo(
            () => (
              <Doughnut data={data} options={options} />
            ),
            [chart]
          )}
        </SoftBox>
        {renderButton()}
      </SoftBox>
    </Card>
  );
}

// Setting default values for the props of ComplexReportsDoughnutChart
ComplexReportsDoughnutChart.defaultProps = {
  tooltip: "",
  action: false,
};

// Typechecking props for the ComplexReportsDoughnutChart
ComplexReportsDoughnutChart.propTypes = {
  title: PropTypes.string.isRequired,
  chart: PropTypes.shape({
    images: PropTypes.arrayOf(PropTypes.string),
    labels: PropTypes.arrayOf(PropTypes.string).isRequired,
    datasets: PropTypes.objectOf(
      PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.string])
    ).isRequired,
  }).isRequired,
  tooltip: PropTypes.string,
  action: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.shape({
      type: PropTypes.oneOf(["external", "internal"]).isRequired,
      route: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      color: PropTypes.oneOf([
        "primary",
        "secondary",
        "info",
        "success",
        "warning",
        "error",
        "dark",
        "light",
      ]),
    }),
  ]),
};

export default ComplexReportsDoughnutChart;
