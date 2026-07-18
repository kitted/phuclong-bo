import checkout from "./form";

const {
  formField: { oldPassword, confirmPassword, password },
} = checkout;

const initialValues = {
  [oldPassword.name]: "",
  [password.name]: "",
  [confirmPassword.name]: "",
};

export default initialValues;
