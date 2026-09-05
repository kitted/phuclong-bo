/* eslint-disable no-console */

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// threejs components
// import * as THREE from "three";
// import { OrbitControls } from "@three-ts/orbit-controls";

import SoftBox from "components/SoftBox";

function Globe({ canvasStyle, ...rest }) {
  return (
    <SoftBox {...rest}>
      <canvas width="700" height="600" style={{ outline: "none", ...canvasStyle }} />
    </SoftBox>
  );
}

// Setting default values for the props for Globe
Globe.defaultProps = {
  canvasStyle: {},
};

// Typechecking props for the Globe
Globe.propTypes = {
  canvasStyle: PropTypes.objectOf(PropTypes.any),
};

export default Globe;
