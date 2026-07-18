import { forwardRef } from "react";

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// react-select components
import Select, { components } from "react-select";

// Soft UI Dashboard PRO React base styles
import colors from "assets/theme/base/colors";

// Custom styles for SoftSelect
import styles from "components/SoftSelect/styles";
import { Height } from "@mui/icons-material";

const SoftSelect = forwardRef(({ size, error, success, placeholder, ...rest }, ref) => {
  const { light } = colors;
  const { style } = rest;


  return (
    <Select
      {...rest}
      ref={ref}
      placeholder={placeholder || "Chọn..."}
      // components={{ NoOptionsMessage }}
      styles={
        rest?.className
          ? {
              option: styles(size, error, success)?.option,
              menu: styles(size, error, success)?.menu,
            }
          : styles(size, error, success)
      }
      theme={(theme) => ({
        ...theme,
        colors: {
          ...theme.colors,
          primary25: light.main,
          primary: light.main,
        },
      })}
      // menuShouldScrollIntoView={false}
      // closeMenuOnSelect={false}
    />
  );
});

const NoOptionsMessage = (props) => {
  return (
    <components.NoOptionsMessage {...props}>
      <span>Không có kết quả nào</span>
    </components.NoOptionsMessage>
  );
};

// Setting default values for the props of SoftSelect
SoftSelect.defaultProps = {
  size: "medium",
  error: false,
  success: false,
  placeholder: undefined,
};

// Typechecking props for the SoftSelect
SoftSelect.propTypes = {
  size: PropTypes.oneOf(["small", "medium", "large"]),
  error: PropTypes.bool,
  success: PropTypes.bool,
  placeholder: PropTypes.string,
};

export default SoftSelect;
