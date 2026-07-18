import AxiosInstance from "./api";

export const AuthService = {
  login: async (payload) => {
    return await AxiosInstance.post("/auth/login", payload);
  },
  getMe: async () => {
    return await AxiosInstance.get("/auth/me");
  },
  refreshToken: async (payload) => {
    return await AxiosInstance.post("/auth/refresh-token", payload);
  },
  forgotPassword: async (email) => {
    return await AxiosInstance.post("/auth/forgot-password", { username: email });
  },
  changePassword: async (payload) => {
    return await AxiosInstance.post("/auth/change-password", payload);
  },
  registerManager: async (payload) => {
    return await AxiosInstance.post("/auth/register-manager", payload);
  },
};
