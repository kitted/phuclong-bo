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

function VerticalBarChart({ title, description, height, chart, chartTwo }) {
  const chartDatasets = chart.datasets
    ? chart.datasets.map((dataset) => ({
        ...dataset,
        weight: 5,
        borderWidth: 0,
        borderRadius: 4,
        backgroundColor: colors[dataset.color]
          ? colors[dataset.color || "dark"].main
          : colors.dark.main,
        fill: false,
        maxBarThickness: 35,
      }))
    : [];

  const { data, options } = configs(chart.labels || [], chartDatasets);

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

  const sumDataLabel = {
    id: "sumDataLabel",
    afterDatasetDraw(chart, agrs, plugin) {
      const {
        ctx,
        scales: { y },
      } = chart;
      const datasetsM0 = chart.getDatasetMeta(0);
      datasetsM0.data.forEach((dataPoint, index) => {
        let y0 = datasetsM0.data[index].y;

        if (y0 > 0 || y > 0) {
          y0 = datasetsM0.hidden ? 300 : y0;
          const value = Math.abs(y0);

          ctx.save();
          ctx.font = "bold 12px";
          ctx.textAlign = "center";
          ctx.fillStyle = "black";
          ctx.fillText(
            `${
              chartTwo
                ? y.getValueForPixel(value).toLocaleString()
                : y.getValueForPixel(value).toLocaleString("vi", {
                    style: "currency",
                    currency: "VND",
                  })
            }`,
            dataPoint.x,
            value - 1
          );

          ctx.restore();
        }
      });
    },
  };

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
      {/* <SoftBox height={height}> */}
      <SoftBox sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
        <SoftBox sx={{ width: windowDimensions.width >= 1600 ? "70%" : "100%" }}>
          <Bar
            data={data}
            options={{
              plugins: {
                legend: false,
                datalabels: {
                  display: false,
                  //   color: "#000",
                  //   align: "start",
                  //   anchor: "end",
                },
              },
            }}
            plugins={[sumDataLabel]}
          />
        </SoftBox>
      </SoftBox>
      {/* </SoftBox> */}
      {/* ),
        [chart, height]
      )} */}
    </SoftBox>
  );

  return title || description ? <Card>{renderChart}</Card> : renderChart;
}

// Setting default values for the props of VerticalBarChart
VerticalBarChart.defaultProps = {
  title: "",
  description: "",
  height: "19.125rem",
  chartTwo: false,
};

// Typechecking props for the VerticalBarChart
VerticalBarChart.propTypes = {
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  chart: PropTypes.objectOf(PropTypes.array).isRequired,
  chartTwo: PropTypes.bool,
};

export default VerticalBarChart;
