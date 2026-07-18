import { useMemo } from "react";

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
import configs from "examples/Charts/PieChart2/configs";
import configs2 from "examples/Charts/PieChart2/configs/configs2";

import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

function PieChart2({ title, description, height, chart1, chart2 }) {
  const { data } = configs(chart1.labels || [], chart1.datasets || {});
  const { data2 } = configs2(chart2.labels || [], chart2.datasets || {});

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
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-evenly",
          marginBottom: "20px",
          marginTop: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "40%",
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
            20 <span style={{ fontSize: "16px", color: "#344767", fontWeight: 500 }}>Nhiệm vụ</span>
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "40%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pie
            data={data2}
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
            40{" "}
            <span style={{ fontSize: "16px", color: "#344767", fontWeight: 500 }}>Hoạt động</span>
          </p>
        </div>
      </div>
    </SoftBox>
  );

  return title || description ? <Card>{renderChart}</Card> : renderChart;
}

// Setting default values for the props of PieChart
PieChart2.defaultProps = {
  title: "",
  description: "",
  height: "19.125rem",
};

// Typechecking props for the PieChart
PieChart2.propTypes = {
  title: PropTypes.string,
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chart1: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.array, PropTypes.object])).isRequired,
  chart2: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.array, PropTypes.object])).isRequired,
};

export default PieChart2;
