import axios from "axios";

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
    const access_token = localStorage.getItem("access_token");
    const isUnauthorized = error.response?.status === 401 || error.response?.data?.statusCode === 401;
    const isRefreshRequest = String(originalConfig?.url || "").includes("/auth/refresh-token");
    const clearSession = () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("reset_token");
      localStorage.removeItem("persist:root");
      localStorage.removeItem("persist:root:admin");
    };
    if (isUnauthorized && access_token && !originalConfig?._retry && !isRefreshRequest) {
      originalConfig._retry = true;
      try {
        const payload = {
          reset_token: localStorage.getItem("reset_token"),
        };
        const result = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/refresh-token`,
          payload
        );
        const { access_token, refresh_token } = result.data;
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("reset_token", refresh_token);
        originalConfig.headers["Authorization"] = `Bearer ${access_token}`;
        return AxiosInstance(originalConfig);
      } catch (refreshError) {
        clearSession();
        window.location.replace("/");
        return Promise.reject(refreshError);
      }
    } else if (isUnauthorized && (isRefreshRequest || !access_token)) {
      clearSession();
      if (window.location.pathname !== "/") window.location.replace("/");
    }
    return Promise.reject(error);
  }
);

export default AxiosInstance;
