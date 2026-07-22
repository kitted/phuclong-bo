import AxiosInstance from "./api";

export const CUSTOMER_SEGMENTS = ["VIP", "THÂN THIẾT", "TIỀM NĂNG", "ĐẠI LÝ", "THƯỜNG"];
export const PRODUCT_TYPES = ["Trà", "Cà phê", "Nước đóng chai", "Bánh & Snack", "Nguyên liệu"];

export const CustomerService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/customers", { params }),
  getSummary: () => AxiosInstance.get("/admin/customers/summary"),
  getById: (id) => AxiosInstance.get(`/admin/customers/${id}`),
  create: (payload) => AxiosInstance.post("/admin/customers", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/customers/${id}`, payload),
  addInteraction: (id, payload) =>
    AxiosInstance.post(`/admin/customers/${id}/interactions`, payload),
  importExcel: (rows) => AxiosInstance.post("/admin/customers/import", { rows }),
  exportExcel: () => AxiosInstance.get("/admin/customers/export", { responseType: "blob" }),
  getPromotionActivations: (id, params = {}) =>
    AxiosInstance.get(`/admin/customers/${id}/promotion-activations`, { params }),
};

export const PromotionActivationService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/promotion-activations", { params }),
  getById: (id) => AxiosInstance.get(`/admin/promotion-activations/${id}`),
  getByCode: (code) =>
    AxiosInstance.get(`/admin/promotion-activations/code/${encodeURIComponent(code)}`),
  changeStatus: (id, status, reason) =>
    AxiosInstance.patch(`/admin/promotion-activations/${id}/status`, { status, reason }),
};

export const PromotionService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/promotions", { params }),
  getOptions: (params = {}) => AxiosInstance.get("/admin/promotions/options", { params }),
  getSummary: () => AxiosInstance.get("/admin/promotions/summary"),
  getById: (id) => AxiosInstance.get(`/admin/promotions/${id}`),
  create: (payload) => AxiosInstance.post("/admin/promotions", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/promotions/${id}`, payload),
  changeStatus: (id, status) => AxiosInstance.patch(`/admin/promotions/${id}/status`, { status }),
  assignVoucher: (id, customerId) =>
    AxiosInstance.post(`/admin/promotions/${id}/vouchers`, { customerId }),
  useVoucher: (code, payload) =>
    AxiosInstance.post(`/admin/promotions/vouchers/${encodeURIComponent(code)}/use`, payload),
  getPerformance: (id) => AxiosInstance.get(`/admin/promotions/${id}/performance`),
  getInvoices: (id, params = {}) =>
    AxiosInstance.get(`/admin/promotions/${id}/invoices`, { params }),
};
