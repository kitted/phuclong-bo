import { useEffect, useMemo, useState } from "react";

// porp-types is a library for typechecking of props
import PropTypes from "prop-types";

// react-chartjs-2 components
import { Bar } from "react-chartjs-2";

// @mui material components
import Card from "@mui/material/Card";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// VerticalBarChart configurations
import configs from "examples/Charts/BarCharts/VerticalBarChart/configs";

// Soft UI Dashboard PRO React base styles
import colors from "assets/theme/base/colors";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function StackedVerticalBarChart({ title, description, height, chart }) {
  // const chartDatasets = chart.datasets
  //   ? chart.datasets.map((dataset) => ({
  //       ...dataset,
  //       weight: 5,
  //       borderWidth: 0,
  //       borderRadius: 4,
  //       backgroundColor: colors[dataset.color]
  //         ? colors[dataset.color || "dark"].main
  //         : colors.dark.main,
  //       fill: false,
  //       maxBarThickness: 35,
  //     }))
  //   : [];

  // const { data, options } = configs(chart.labels || [], chartDatasets);

  function getWindowDimensions() {
    const { innerWidth: width, innerHeight: height } = window;
    return {
      width,
      height,
    };
  }

  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getWindowDimensions()]);

  const renderChart = (
    <SoftBox p={2}>
      {title || description ? (
        <SoftBox px={description ? 1 : 0} pt={description ? 1 : 0}>
          {title}
          <SoftBox mb={2}>
            <SoftTypography component="div" variant="button" fontWeight="regular" color="text">
              {description}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
      ) : null}
      {/* {useMemo(
        () => ( */}
      <SoftBox sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <SoftBox sx={{ width: windowDimensions.width >= 1600 ? "70%" : "100%" }}>
          <Bar
            data={chart}
            options={{
              plugins: {
                legend: {
                  position: "right",
                },
              },
              responsive: true,
              scales: {
                x: {
                  stacked: true,
                },
                y: {
                  stacked: true,
                },
              },
            }}
          />
        </SoftBox>
      </SoftBox>
      {/* ),
        [chart, height]
      )} */}
    </SoftBox>
  );

  return title || description ? <Card>{renderChart}</Card> : renderChart;
}

// Setting default values for the props of StackedVerticalBarChart
StackedVerticalBarChart.defaultProps = {
  title: "",
  description: "",
  height: "19.125rem",
};

// Typechecking props for the StackedVerticalBarChart
StackedVerticalBarChart.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chart: PropTypes.objectOf(PropTypes.array).isRequired,
};

export default StackedVerticalBarChart;
