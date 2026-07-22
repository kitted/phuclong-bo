import AxiosInstance from "./api";

const get =
  (path) =>
  (params = {}) =>
    AxiosInstance.get(path, { params });

export const DashboardAnalyticsService = {
  overview: get("/admin/dashboard/overview"),
  salesTrend: get("/admin/dashboard/sales-trend"),
  debtSummary: get("/admin/dashboard/debt-summary"),
  inventoryAlerts: get("/admin/dashboard/inventory-alerts"),
  topProducts: get("/admin/dashboard/top-products"),
  trucks: get("/admin/dashboard/trucks"),
  customers: get("/admin/dashboard/customers"),
  promotions: get("/admin/dashboard/promotions"),
  employees: get("/admin/dashboard/employees"),
  systemHealth: get("/admin/dashboard/system-health"),
};

export const ReportsService = {
  overview: get("/admin/reports/overview"),
  salesTrend: get("/admin/reports/sales-trend"),
  sales: get("/admin/reports/sales"),
  payments: get("/admin/reports/payments"),
  debt: get("/admin/reports/debt"),
  debtCustomers: get("/admin/reports/debt/customers"),
  debtReceipts: get("/admin/reports/debt/receipts"),
  products: get("/admin/reports/products"),
  inventory: get("/admin/reports/inventory"),
  imports: get("/admin/reports/imports"),
  inventoryMovements: get("/admin/reports/inventory-movements"),
  trucks: get("/admin/reports/trucks"),
  customers: get("/admin/reports/customers"),
  promotions: get("/admin/reports/promotions"),
  employees: get("/admin/reports/employees"),
  export: (params = {}) =>
    AxiosInstance.get("/admin/reports/export", { params, responseType: "blob" }),
};
