import AxiosInstance from "./api";

export const GoodsAdvanceService = {
  list: (params = {}) => AxiosInstance.get("/admin/goods-advances", { params }),
  detail: (id) => AxiosInstance.get(`/admin/goods-advances/${id}`),
  create: (payload) => AxiosInstance.post("/admin/goods-advances", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/goods-advances/${id}`, payload),
  changeStatus: (id, status, reason) =>
    AxiosInstance.patch(`/admin/goods-advances/${id}/status`, { status, reason }),
  export: (id) =>
    AxiosInstance.get(`/admin/goods-advances/${id}/export`, { responseType: "blob" }),
};

export const DailyReportService = {
  salespeople: (date) =>
    AxiosInstance.get("/admin/daily-reports/salespeople", { params: { date } }),
  preview: (date, salespersonId) =>
    AxiosInstance.get("/admin/daily-reports/preview", { params: { date, salespersonId } }),
  list: (params = {}) => AxiosInstance.get("/admin/daily-reports", { params }),
  detail: (id) => AxiosInstance.get(`/admin/daily-reports/${id}`),
  create: (payload) => AxiosInstance.post("/admin/daily-reports", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/daily-reports/${id}`, payload),
  remove: (id) => AxiosInstance.delete(`/admin/daily-reports/${id}`),
  export: (id) =>
    AxiosInstance.get(`/admin/daily-reports/${id}/export`, { responseType: "blob" }),
};
