import AxiosInstance from "./api";

const CustomerReturnService = {
  preview: (payload) => AxiosInstance.post("/admin/customer-returns/preview", payload),
  create: (payload) => AxiosInstance.post("/admin/customer-returns", payload),
  getAll: (params = {}) => AxiosInstance.get("/admin/customer-returns", { params }),
  getSummary: (params = {}) =>
    AxiosInstance.get("/admin/customer-returns/summary", { params }),
  getById: (id) => AxiosInstance.get(`/admin/customer-returns/${id}`),
  reverse: (id, reason) =>
    AxiosInstance.post(`/admin/customer-returns/${id}/reverse`, { reason }),
  getUnclassifiedForTruck: (truckId, params = {}) =>
    AxiosInstance.get(`/admin/trucks/${truckId}/unclassified-return-stock`, { params }),
  updateUnclassified: (id, payload) =>
    AxiosInstance.patch(`/admin/unclassified-return-stock/${id}`, payload),
  mapUnclassifiedProduct: (id, payload) =>
    AxiosInstance.patch(`/admin/unclassified-return-stock/${id}/map-product`, payload),
};

export default CustomerReturnService;
