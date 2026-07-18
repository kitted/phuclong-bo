// prop-types is a library for typechecking of props
import PropTypes from "prop-types";
// react-flatpickr components
import Flatpickr from "react-flatpickr";

// react-flatpickr styles
import "flatpickr/dist/flatpickr.css";

// Soft UI Dashboard PRO React components
import SoftInput from "components/SoftInput";
import { Vietnamese } from "flatpickr/dist/l10n/vn.js";
function SoftDatePicker({ input, ...rest }) {
  return (
    <Flatpickr
      options={{
        locale: Vietnamese,
        dateFormat: "d-m-Y",
      }}
      {...rest}
      render={({ defaultValue }, ref) => (
        <SoftInput {...input} defaultValue={defaultValue} inputRef={ref} />
      )}
    />
  );
}

// Setting default values for the props of SoftDatePicker
SoftDatePicker.defaultProps = {
  input: {},
};

// Typechecking props for the SoftDatePicker
SoftDatePicker.propTypes = {
  input: PropTypes.objectOf(PropTypes.any),
};

export default SoftDatePicker;
