import { useState } from "react";

// react-router-dom components
import { Link, useRoutes, useNavigate } from "react-router-dom";

// @mui material components
import Switch from "@mui/material/Switch";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import brand from "assets/images/astraeaLogo.png";

// Authentication layout components
import IllustrationLayout from "layouts/authentication/components/IllustrationLayout";

// Image
import chat from "assets/images/illustrations/chat.png";
import { AuthService } from "services/authService";
import { useDispatch } from "react-redux";
import { updateUser } from "redux/slice/authSlice";
function Illustration() {
  const [rememberMe, setRememberMe] = useState(false);
  const [data, setData] = useState({
    username: "",
    password: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  const handleChangValue = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!data.username) {
      setErr("Vui lòng nhập số điện thoại hoặc email");
      setTimeout(() => {
        setErr("");
      }, 3000);
      return;
    }
    if (!data.password) {
      setErr("Vui lòng nhập mật khẩu");
      setTimeout(() => {
        setErr("");
      }, 3000);
      return;
    }
    // try {
    //   setLoading(true);
    //   const { data: result } = await AuthService.login(data);
    //   if (result && Object.keys(result).length > 0) {
    //     localStorage.setItem("access_token", result.access_token);
    //     localStorage.setItem("reset_token", result.refresh_token);

    //     const { data: user } = await AuthService.getMe();
    //     dispatch(updateUser(user));

    //     // Thiết lập interval tự gọi getMe mỗi 10 phút
    //     setInterval(async () => {
    //       try {
    //         const { data: refreshedUser } = await AuthService.getMe();
    //         dispatch(updateUser(refreshedUser));
    //       } catch (e) {
    //         console.error("Failed to refresh user info:", e);
    //       }
    //     }, 10 * 60 * 1000); // 10 phút

    //     if (result.role === "admin" || result.role === "staff") {
    //       navigate("/dashboards");
    //     } else {
    //       navigate("/dashboards");
    //     }
    //   }

    //   setLoading(false);
    // } catch (error) {
    //   setLoading(false);
    //   setErr(error?.response?.data?.message);
    //   setTimeout(() => {
    //     setErr("");
    //   }, 3000);
    // }
    navigate("/dashboards");
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute z-10  bg-red w-full h-20 p-6">
        <div className=" flex items-center justify-start gap-4">
          {/* <img src={brand} className="w-52" /> */}
          {/* <h5 className="text-[14px] font-bold text-center text-text ">
            Đại Học Bách Khoa <br /> TPHCM
          </h5> */}
        </div>
      </div>
      <div className="absolute z-1 w-full h-full">
        <IllustrationLayout
          title="Đăng nhập"
          description={
            err ? <p style={{ color: "red" }}>{err}</p> : "Nhập tài khoản và mật khẩu để tiếp tục"
          }
          illustration={{
            title: "Phúc Long",
            description: "Hệ thống Quản lý Kho",
          }}
        >
          <SoftBox component="form" role="form">
            <SoftBox mb={2}>
              <SoftInput
                type="text"
                name="username"
                placeholder="Số điện thoại hoặc email"
                size="large"
                onChange={handleChangValue}
              />
            </SoftBox>
            <SoftBox mb={2}>
              <SoftInput
                type="password"
                name="password"
                placeholder="Mật khẩu"
                size="large"
                onChange={handleChangValue}
              />
            </SoftBox>
            {/* <SoftBox display="flex" alignItems="center">
          <Switch checked={rememberMe} onChange={handleSetRememberMe} />
          <SoftTypography
            variant="button"
            fontWeight="regular"
            onClick={handleSetRememberMe}
            sx={{ cursor: "pointer", userSelect: "none" }}
          >
            &nbsp;&nbsp;Remember me
          </SoftTypography>
        </SoftBox> */}
            <SoftBox mt={4} mb={1}>
              <SoftButton
                onClick={handleSubmit}
                variant="gradient"
                color="info"
                size="large"
                fullWidth
              >
                {loading ? "Loading..." : "Đăng Nhập"}
              </SoftButton>
            </SoftBox>
            {/* <SoftBox mt={3} textAlign="center">
          <SoftTypography variant="button" color="text" fontWeight="regular">
            Don&apos;t have an account?{" "}
            <SoftTypography
              component={Link}
              to="/authentication/sign-up/illustration"
              variant="button"
              color="info"
              fontWeight="medium"
              textGradient
            >
              Đăng nhập
            </SoftTypography>
          </SoftTypography>
        </SoftBox> */}
          </SoftBox>
        </IllustrationLayout>
      </div>
    </div>
  );
}

export default Illustration;
