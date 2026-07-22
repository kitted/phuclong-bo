import AxiosInstance from "./api";

const AuditLogService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/audit-logs", { params }),
  getSummary: (params = {}) => AxiosInstance.get("/admin/audit-logs/summary", { params }),
  getById: (id) => AxiosInstance.get(`/admin/audit-logs/${id}`),
};

export default AuditLogService;
