import AxiosInstance from "./api";

export const EmployeeKpiService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/employee-kpis", { params }),
  getById: (id) => AxiosInstance.get(`/admin/employee-kpis/${id}`),
  getProgress: (id) => AxiosInstance.get(`/admin/employee-kpis/${id}/progress`),
  getEvidence: (id, params = {}) =>
    AxiosInstance.get(`/admin/employee-kpis/${id}/evidence`, { params }),
  create: (payload) => AxiosInstance.post("/admin/employee-kpis", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/employee-kpis/${id}`, payload),
  changeStatus: (id, status, note) =>
    AxiosInstance.patch(`/admin/employee-kpis/${id}/status`, { status, note }),
  remove: (id) => AxiosInstance.delete(`/admin/employee-kpis/${id}`),
  leaderboard: (params) => AxiosInstance.get("/admin/employee-kpis/leaderboard", { params }),
  getForEmployee: (id, params = {}) => AxiosInstance.get(`/admin/users/${id}/kpis`, { params }),
};

export default EmployeeKpiService;
