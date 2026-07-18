import axios from "axios";
import { AuthService } from "./authService";

const AxiosInstance = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL}`,
});

AxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

AxiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalConfig = error.config;
    // console.log("Access token expired");
    const access_token = localStorage.getItem("access_token");
    if (error.response && error?.response?.data?.statusCode === 401 && access_token) {
      try {
        // console.log("Call refresh token api");
        const payload = {
          reset_token: localStorage.getItem("reset_token"),
        };
        const result = await AuthService.refreshToken(payload);
        const { access_token, refresh_token } = result.data;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("reset_token", refresh_token);
        originalConfig.headers["Authorization"] = `Bearer ${access_token}`;
        return AxiosInstance(originalConfig);
      } catch (error) {
        if (error.response) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("reset_token");
          localStorage.removeItem("persist:root:admin");
          window.location.href = "/dashboards/sign-in";
          // window.location.reload();
        }
        return Promise.reject(error);
      }
    } else if (error.response && error?.response?.data?.statusCode === 401 && !access_token) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("reset_token");
      localStorage.removeItem("persist:root:admin");
      window.location.href = "/dashboards/sign-in";
      // window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default AxiosInstance;
