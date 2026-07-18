/* eslint-disable react/prop-types */
import "./style.css";
import Switch from "@mui/material/Switch";
import SoftTypography from "components/SoftTypography";

const label = { inputProps: { "aria-label": "Switch demo" } };
function BasicSwitches(props) {
  const { title, value, onChange, ...rest } = props;
  return (
    <div>
      <div className="ml-2">
        <SoftTypography
          component="label"
          variant="caption"
          fontWeight="bold"
          textTransform="capitalize"
        >
          {title}
        </SoftTypography>
      </div>
      <div className="switches_box">
        <Switch {...label} onChange={onChange} checked={value} />
      </div>
    </div>
  );
}

export default BasicSwitches;
