import { useEffect, useMemo, useState } from "react";

// porp-types is a library for typechecking of props
import PropTypes from "prop-types";

// react-chartjs-2 components
import { Pie } from "react-chartjs-2";

// @mui material components
import Card from "@mui/material/Card";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// PieChart configurations
import configs from "examples/Charts/PieChart/configs";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

function PieChart({ title, description, height, chart, totalHD }) {
  const { data } = configs(chart.labels || [], chart.datasets || {});

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
  }, []);

  const renderChart = (
    <SoftBox p={2}>
      {title || description ? (
        <SoftBox px={description ? 1 : 0} pt={description ? 1 : 0}>
          {title && (
            <SoftBox mb={1}>
              <SoftTypography variant="h6">{title}</SoftTypography>
            </SoftBox>
          )}
          <SoftBox mb={2}>
            <SoftTypography component="div" variant="button" fontWeight="regular" color="text">
              {description}
            </SoftTypography>
          </SoftBox>
        </SoftBox>
      ) : null}
      {/* {useMemo(
        () => ( */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-evenly",
          marginBottom: "20px",
          marginTop: "20px",
          height: windowDimensions.width > 850 ? "75%" : undefined,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "45%",
            height: windowDimensions.width > 850 ? "100%" : undefined,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pie
            data={data}
            options={{
              plugins: {
                legend: false,
                datalabels: {
                  display: false,
                },
              },
            }}
          />
          <p style={{ fontSize: "24px", color: "#89121A", fontWeight: 700 }}>
            {totalHD}{" "}
            <span style={{ fontSize: "16px", color: "#344767", fontWeight: 500 }}>Hoạt động</span>
          </p>
        </div>
      </div>
      {/* ),
        [chart, height]
      )} */}
    </SoftBox>
  );

  return title || description ? <Card>{renderChart}</Card> : renderChart;
}

// Setting default values for the props of PieChart
PieChart.defaultProps = {
  title: "",
  description: "",
  height: "19.125rem",
  totalHD: 0,
};

// Typechecking props for the PieChart
PieChart.propTypes = {
  title: PropTypes.string,
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chart: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.array, PropTypes.object])).isRequired,
  totalHD: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default PieChart;
