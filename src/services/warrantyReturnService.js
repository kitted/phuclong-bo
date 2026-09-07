import AxiosInstance from "./api";

const WarrantyReturnService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/warranty-returns", { params }),
  getSummary: () => AxiosInstance.get("/admin/warranty-returns/summary"),
  getById: (id) => AxiosInstance.get(`/admin/warranty-returns/${id}`),
  create: (payload) => AxiosInstance.post("/admin/warranty-returns", payload),
  start: (id) => AxiosInstance.post(`/admin/warranty-returns/${id}/start`),
  complete: (id, payload) =>
    AxiosInstance.post(`/admin/warranty-returns/${id}/complete`, payload),
  cancel: (id, reason) =>
    AxiosInstance.post(`/admin/warranty-returns/${id}/cancel`, { reason }),
};

export default WarrantyReturnService;
