// prop-types is a library for typechecking of props
import PropTypes from "prop-types";
// react-flatpickr components
import Flatpickr from "react-flatpickr";
// react-flatpickr styles
import "flatpickr/dist/flatpickr.css";

import "flatpickr/dist/plugins/monthSelect/style.css";

import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect/index.js";

// Soft UI Dashboard PRO React components
import SoftInput from "components/SoftInput";
import { Vietnamese } from "flatpickr/dist/l10n/vn.js";

function SoftMonthPicker({ input, ...rest }) {
  return (
    <Flatpickr
      options={{
        locale: Vietnamese,
        plugins: [
          new monthSelectPlugin({
            shorthand: true, //defaults to false
            dateFormat: "m/y", //defaults to "F Y"
            altFormat: "F Y", //defaults to "F Y"
            altInput: true,
            allowInput: true,
          }),
        ],
      }}
      {...rest}
      render={({ defaultValue }, ref) => (
        <SoftInput {...input} defaultValue={defaultValue} inputRef={ref} />
      )}
    />
  );
}

// Setting default values for the props of SoftMonthPicker
SoftMonthPicker.defaultProps = {
  input: {},
};

// Typechecking props for the SoftMonthPicker
SoftMonthPicker.propTypes = {
  input: PropTypes.objectOf(PropTypes.any),
};

export default SoftMonthPicker;
