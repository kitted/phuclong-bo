import AxiosInstance from "./api";

const SalesLocationService = {
  capture: (payload) => AxiosInstance.post("/admin/sales-locations/pings", payload),
  getDaily: (params) => AxiosInstance.get("/admin/sales-locations/daily", { params }),
  getMine: (params) => AxiosInstance.get("/admin/sales-locations/me", { params }),
};

export default SalesLocationService;
