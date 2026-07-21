import AxiosInstance from "./api";

const INVENTORY_PATH = "/admin/inventory";

export const InventoryService = {
  getList: (params = {}) => AxiosInstance.get(INVENTORY_PATH, { params }),

  getSummary: (params = {}) =>
    AxiosInstance.get(`${INVENTORY_PATH}/summary`, { params }),

  exportReport: (params = {}) =>
    AxiosInstance.get(`${INVENTORY_PATH}/export`, {
      params,
      responseType: "blob",
    }),

  getProductDetail: (productId) =>
    AxiosInstance.get(`${INVENTORY_PATH}/products/${productId}`),

  getProductMovements: (productId, params = {}) =>
    AxiosInstance.get(`${INVENTORY_PATH}/products/${productId}/movements`, {
      params,
    }),
};

export default InventoryService;
