import AxiosInstance from "./api";

export const EmployeeService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/users", { params }),
  getSummary: () => AxiosInstance.get("/admin/users/summary"),
  getById: (id) => AxiosInstance.get(`/admin/users/${id}`),
  create: (payload) => AxiosInstance.post("/admin/users", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/users/${id}`, payload),
  changeStatus: (id, status) => AxiosInstance.patch(`/admin/users/${id}/status`, { status }),
  remove: (id) => AxiosInstance.delete(`/admin/users/${id}`),
};

export default EmployeeService;
