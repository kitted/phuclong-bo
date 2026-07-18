import { useMemo } from "react";

// porp-types is a library for typechecking of props
import PropTypes from "prop-types";

// react-chartjs-2 components
import { Bar } from "react-chartjs-2";

// @mui material components
import Card from "@mui/material/Card";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";

// HorizontalBarChart configurations
import configs from "examples/Charts/BarCharts/HorizontalBarChartCustom/configs";

// Soft UI Dashboard PRO React base styles
import colors from "assets/theme/base/colors";

import "chartjs-plugin-datalabels";
// import Issues from "../components/Issues";
import ChartDataLabels from "chartjs-plugin-datalabels";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

function HorizontalBarChartCustom({ chart }) {
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

  const { data } = configs(chart.labels || [], chart.datasets || []);

  const options = {
    indexAxis: "y",
    elements: {
      bar: {
        borderRadius: 50,
      },
    },
    scales: {
      x: {
        ticks: {
          display: false,
        },
        grid: {
          display: false,
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },

      y: {
        grid: { drawBorder: false, display: false },
        border: {
          display: false,
        },
      },
    },
    responsive: true,
    plugins: {
      legend: false,
      datalabels: {
        display: true,
        color: "#000",
        clamp: true,
        align: "start",
        anchor: "end",
      },
      tooltip: false,
    },
  };

  // const sumDataLabel = {
  //   id: "sumDataLabel",
  //   afterDatasetDraw(chart, agrs, plugin) {
  //     const {
  //       ctx,
  //       scales: { x, y },
  //     } = chart;
  //     const datasetsM0 = chart.getDatasetMeta(0);
  //     datasetsM0.data.forEach((dataPoint, index) => {
  //       console.log(dataPoint);
  //       let y0 = datasetsM0.data[index].x;

  //       if (y0 > 0) {
  //         y0 = datasetsM0.hidden ? 300 : y0;
  //         const value = Math.abs(y0);

  //         ctx.save();
  //         ctx.font = "bold 12px";
  //         ctx.textAlign = "center";
  //         ctx.fillStyle = "black";
  //         ctx.fillText(x.getValueForPixel(dataPoint.x).toFixed(0), value, datasetsM0.data[index].y);

  //         ctx.restore();
  //       }
  //     });
  //   },
  // };

  const renderChart = (
    <SoftBox sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <Bar
        data={data}
        options={options}
        //  plugins={[sumDataLabel]}
        width={500}
      />
    </SoftBox>
  );

  return renderChart;
}

// Setting default values for the props of HorizontalBarChart
HorizontalBarChartCustom.defaultProps = {};

// Typechecking props for the HorizontalBarChart
HorizontalBarChartCustom.propTypes = {
  chart: PropTypes.objectOf(PropTypes.array).isRequired,
};

export default HorizontalBarChartCustom;
