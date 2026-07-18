const form = {
  formId: "change-password",
  formField: {
    oldPassword: {
      name: "oldPassword",
      label: "Mật khẩu cũ",
      type: "password",
      errorMsg: "Vui lòng nhập mật khẩu",
    },
    password: {
      name: "password",
      label: "Mật khẩu mới",
      type: "password",
      errorMsg: "Vui lòng nhập mật khẩu mới",
    },
    confirmPassword: {
      name: "confirmPassword",
      label: "Xác nhận mật khẩu",
      type: "password",
      errorMsg: "Vui lòng xác nhận mật khẩu",
    },
  },
};

export default form;
