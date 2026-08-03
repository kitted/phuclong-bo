import AxiosInstance from "./api";

const INVENTORY_PATH = "/admin/inventory";

export const InventoryService = {
  getList: (params = {}) => AxiosInstance.get(INVENTORY_PATH, { params }),

  getSummary: (params = {}) => AxiosInstance.get(`${INVENTORY_PATH}/summary`, { params }),

  exportReport: (params = {}) =>
    AxiosInstance.get(`${INVENTORY_PATH}/export`, {
      params,
      responseType: "blob",
    }),

  getProductDetail: (productId) => AxiosInstance.get(`${INVENTORY_PATH}/products/${productId}`),

  getProductMovements: (productId, params = {}) =>
    AxiosInstance.get(`${INVENTORY_PATH}/products/${productId}/movements`, {
      params,
    }),

  downloadStockCheckTemplate: () =>
    AxiosInstance.get(`${INVENTORY_PATH}/stock-check/template`, { responseType: "blob" }),

  compareStockCheck: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return AxiosInstance.post(`${INVENTORY_PATH}/stock-check/compare`, formData);
  },

  exportStockCheck: (comparisonId) =>
    AxiosInstance.get(`/admin/inventory-stock-checks/${comparisonId}/export`, {
      responseType: "blob",
    }),

  previewStockCheckSync: (comparisonId) =>
    AxiosInstance.post(`/admin/inventory-stock-checks/${comparisonId}/sync/preview`),

  syncStockCheck: (comparisonId, payload) =>
    AxiosInstance.post(`/admin/inventory-stock-checks/${comparisonId}/sync`, payload),

  getBackups: (params = {}) => AxiosInstance.get(`${INVENTORY_PATH}/backups`, { params }),

  getBackup: (backupId) => AxiosInstance.get(`/admin/inventory-backups/${backupId}`),

  exportBackup: (backupId) =>
    AxiosInstance.get(`/admin/inventory-backups/${backupId}/export`, {
      responseType: "blob",
    }),

  previewBackupRestore: (backupId) =>
    AxiosInstance.post(`/admin/inventory-backups/${backupId}/restore/preview`),

  restoreBackup: (backupId, payload) =>
    AxiosInstance.post(`/admin/inventory-backups/${backupId}/restore`, payload),
};

export default InventoryService;
