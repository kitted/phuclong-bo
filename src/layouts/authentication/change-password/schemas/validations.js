import * as Yup from "yup";
import checkout from "./form";

const {
  formField: { oldPassword, confirmPassword, password },
} = checkout;

const validations = Yup.object().shape({
  [oldPassword.name]: Yup.string().required("Vui lòng nhập mật khẩu cũ"),
  [password.name]: Yup.string()
    .min(6, "Mật khẩu ít nhất 6 ký tự")
    .max(25, "Mật khẩu tối đa 25 ký tự")
    .required("Vui lòng nhập mật khẩu mới"),
  [confirmPassword.name]: Yup.string()
    .oneOf([Yup.ref("password"), null], "Mật khẩu không trùng khớp")
    .required("Vui lòng xác nhận mật khẩu"),
});

export default validations;
