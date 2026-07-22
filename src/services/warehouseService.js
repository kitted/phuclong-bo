// ============================================================
// MOCK DATA SERVICE – Phúc Long Warehouse App
// Thay thế bằng AxiosInstance khi BE sẵn sàng
// ============================================================

import AxiosInstance from "./api";

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

export const MOCK_CATEGORIES = [
  { id: 1, name: "Trà & Cà phê" },
  { id: 2, name: "Nước uống đóng chai" },
  { id: 3, name: "Bánh & Snack" },
  { id: 4, name: "Nguyên liệu pha chế" },
];

export const MOCK_UNITS = ["Chai", "Lon", "Hộp", "Thùng", "Cái", "Lít", "Gói", "Bộ"];

export const MOCK_SUPPLIERS = [
  {
    id: 1,
    name: "Phúc Long Trading",
    phone: "028-1234-5678",
    address: "Tp.HCM",
    email: "supply@phuclong.vn",
  },
  {
    id: 2,
    name: "Đại lý Trà Bắc",
    phone: "024-9876-5432",
    address: "Hà Nội",
    email: "contact@trabac.vn",
  },
  {
    id: 3,
    name: "NCC Nguyên Liệu Xanh",
    phone: "0901-234-567",
    address: "Đà Nẵng",
    email: "info@nguyenlieuxanh.vn",
  },
];

export let MOCK_PRODUCTS = [
  {
    id: 1,
    code: "PLT-001",
    name: "Trà Oolong Phúc Long",
    categoryId: 1,
    unit: "Hộp",
    costPrice: 85000,
    sellPrice: 120000,
    minStock: 20,
    stock: 145,
    supplierId: 1,
  },
  {
    id: 2,
    code: "PLT-002",
    name: "Trà Xanh Đặc Biệt",
    categoryId: 1,
    unit: "Hộp",
    costPrice: 70000,
    sellPrice: 98000,
    minStock: 15,
    stock: 8,
    supplierId: 1,
  },
  {
    id: 3,
    code: "NUO-001",
    name: "Nước Khoáng Vĩnh Hảo 500ml",
    categoryId: 2,
    unit: "Thùng",
    costPrice: 65000,
    sellPrice: 85000,
    minStock: 30,
    stock: 62,
    supplierId: 2,
  },
  {
    id: 4,
    code: "BAK-001",
    name: "Bánh Quy Bơ Hộp",
    categoryId: 3,
    unit: "Hộp",
    costPrice: 45000,
    sellPrice: 65000,
    minStock: 10,
    stock: 5,
    supplierId: 2,
  },
  {
    id: 5,
    code: "NGL-001",
    name: "Đường Cát Trắng",
    categoryId: 4,
    unit: "Kg",
    costPrice: 22000,
    sellPrice: 28000,
    minStock: 50,
    stock: 120,
    supplierId: 3,
  },
  {
    id: 6,
    code: "NGL-002",
    name: "Sữa Tươi Vinamilk 1L",
    categoryId: 4,
    unit: "Thùng",
    costPrice: 290000,
    sellPrice: 360000,
    minStock: 20,
    stock: 34,
    supplierId: 3,
  },
  {
    id: 7,
    code: "PLT-003",
    name: "Trà Sữa Phúc Long Gói",
    categoryId: 1,
    unit: "Gói",
    costPrice: 35000,
    sellPrice: 50000,
    minStock: 25,
    stock: 3,
    supplierId: 1,
  },
];

export let MOCK_IMPORTS = [
  {
    id: 1,
    code: "NK-2407-001",
    date: "2024-07-10",
    supplierId: 1,
    status: "completed",
    note: "Nhập hàng tuần",
    totalAmount: 4250000,
    items: [
      { productId: 1, qty: 30, price: 85000 },
      { productId: 7, qty: 50, price: 35000 },
    ],
  },
  {
    id: 2,
    code: "NK-2407-002",
    date: "2024-07-12",
    supplierId: 2,
    status: "completed",
    note: "",
    totalAmount: 2080000,
    items: [
      { productId: 3, qty: 20, price: 65000 },
      { productId: 4, qty: 18, price: 45000 },
    ],
  },
  {
    id: 3,
    code: "NK-2407-003",
    date: "2024-07-15",
    supplierId: 3,
    status: "pending",
    note: "Chờ xác nhận",
    totalAmount: 1600000,
    items: [
      { productId: 5, qty: 50, price: 22000 },
      { productId: 6, qty: 3, price: 290000 },
    ],
  },
];

export let MOCK_EXPORTS = [
  {
    id: 1,
    code: "XK-2407-001",
    date: "2024-07-11",
    type: "sale",
    source: "warehouse",
    note: "Bán lẻ",
    totalAmount: 360000,
    items: [{ productId: 1, qty: 3, price: 120000 }],
  },
  {
    id: 2,
    code: "XK-2407-002",
    date: "2024-07-13",
    type: "load_truck",
    source: "warehouse",
    truckId: 1,
    note: "Xuất lên xe T01",
    totalAmount: 0,
    items: [
      { productId: 2, qty: 10, price: 0 },
      { productId: 3, qty: 5, price: 0 },
    ],
  },
];

export let MOCK_TRUCKS = [
  {
    id: 1,
    code: "T01",
    name: "Xe tải 1",
    licensePlate: "51C-12345",
    driver: "Nguyễn Văn A",
    phone: "0901-111-222",
    status: "active",
    inventory: [
      { productId: 1, qty: 20 },
      { productId: 3, qty: 5 },
    ],
  },
  {
    id: 2,
    code: "T02",
    name: "Xe tải 2",
    licensePlate: "51C-67890",
    driver: "Trần Thị B",
    phone: "0902-333-444",
    status: "active",
    inventory: [{ productId: 5, qty: 15 }],
  },
  {
    id: 3,
    code: "T03",
    name: "Xe dự phòng",
    licensePlate: "51D-11111",
    driver: "Lê Văn C",
    phone: "0903-555-666",
    status: "inactive",
    inventory: [],
  },
];

export let MOCK_INVOICES = [
  {
    id: 1,
    code: "HD-2407-001",
    date: "2024-07-14",
    customer: "Khách lẻ",
    sourceType: "warehouse",
    truckId: null,
    totalAmount: 246000,
    items: [
      { productId: 3, qty: 2, price: 85000 },
      { productId: 4, qty: 1, price: 65000 },
    ],
    note: "",
  },
  {
    id: 2,
    code: "HD-2407-002",
    date: "2024-07-14",
    customer: "Siêu thị Mini",
    sourceType: "truck",
    truckId: 1,
    totalAmount: 600000,
    items: [{ productId: 1, qty: 5, price: 120000 }],
    note: "Giao tại cửa hàng",
  },
  {
    id: 3,
    code: "HD-2407-003",
    date: "2024-07-15",
    customer: "Quán Ăn Bình Dân",
    sourceType: "truck",
    truckId: 2,
    totalAmount: 140000,
    items: [{ productId: 5, qty: 5, price: 28000 }],
    note: "",
  },
];

export let MOCK_TRUCK_RETURNS = [
  {
    id: 1,
    code: "HK-2407-001",
    date: "2024-07-13",
    truckId: 1,
    note: "Hoàn hàng cuối ngày",
    items: [{ productId: 2, qty: 2 }],
  },
];

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export const ProductService = {
  getAll: (params = {}) => AxiosInstance.get(`/admin/products`, { params }),
  getById: async (id) => {
    return await AxiosInstance.get(`/admin/products/${id}`);
  },
  create: async (payload) => {
    return await AxiosInstance.post(`/admin/products`, payload);
  },
  update: async (id, payload) => {
    return await AxiosInstance.put(`/admin/products/${id}`, payload);
  },
  delete: async (id) => {
    return await AxiosInstance.delete(`/admin/products/${id}`);
  },
  importExcel: async (rows) => {
    return await AxiosInstance.post(`/admin/products/import`, { rows });
  },
  exportExcel: async () => {
    return await AxiosInstance.get(`/admin/products/export`, { responseType: "blob" });
  },
};

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────

export const SupplierService = {
  getAll: async () => {
    return await AxiosInstance.get(`/admin/suppliers`);
  },
  create: async (payload) => {
    return await AxiosInstance.post(`/admin/suppliers`, payload);
  },
  update: async (id, payload) => {
    return await AxiosInstance.put(`/admin/suppliers/${id}`, payload);
  },
  delete: async (id) => {
    return await AxiosInstance.delete(`/admin/suppliers/${id}`);
  },
};

// ─── CATEGORIES ────────────────────────────────────────────────────────────────

export const CategoryService = {
  getAll: async () => {
    return await AxiosInstance.get(`/admin/categories`);
  },
  create: async (payload) => {
    return await AxiosInstance.post(`/admin/categories`, payload);
  },
  update: async (id, payload) => {
    return await AxiosInstance.put(`/admin/categories/${id}`, payload);
  },
  delete: async (id) => {
    return await AxiosInstance.delete(`/admin/categories/${id}`);
  },
};

// ─── IMPORTS ──────────────────────────────────────────────────────────────────

export const ImportService = {
  getAll: async () => {
    return await AxiosInstance.get(`/admin/imports`);
  },
  getById: async (id) => {
    return await AxiosInstance.get(`/admin/imports/${id}`);
  },
  create: async (payload) => {
    return await AxiosInstance.post(`/admin/imports`, payload);
  },
  update: async (id, payload) => {
    return await AxiosInstance.put(`/admin/imports/${id}`, payload);
  },
  delete: async (id) => {
    return await AxiosInstance.delete(`/admin/imports/${id}`);
  },
};

// ─── EXPORTS ──────────────────────────────────────────────────────────────────

export const ExportService = {
  getAll: async () => {
    await delay();
    return { data: MOCK_EXPORTS };
  },
  getById: async (id) => {
    await delay();
    return { data: MOCK_EXPORTS.find((e) => e.id === id) };
  },
  create: async (payload) => {
    await delay();
    const newExport = { ...payload, id: Date.now(), code: `XK-${Date.now()}` };
    // Update stock
    if (payload.source === "warehouse") {
      newExport.items.forEach((item) => {
        const product = MOCK_PRODUCTS.find((p) => p.id === item.productId);
        if (product) product.stock -= item.qty;
      });
    }
    MOCK_EXPORTS.push(newExport);
    return { data: newExport };
  },
};

// ─── TRUCKS ───────────────────────────────────────────────────────────────────

export const TruckService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/trucks", { params }),
  getSummary: () => AxiosInstance.get("/admin/trucks/summary"),
  getAvailableProducts: (params = {}) =>
    AxiosInstance.get("/admin/trucks/available-products", { params }),
  getTruckAvailableProducts: (id, params = {}) =>
    AxiosInstance.get(`/admin/trucks/${id}/available-products`, { params }),
  getAvailableDrivers: (params = {}) =>
    AxiosInstance.get("/admin/trucks/available-drivers", { params }),
  getById: (id) => AxiosInstance.get(`/admin/trucks/${id}`),
  create: (payload) => AxiosInstance.post("/admin/trucks", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/trucks/${id}`, payload),
  changeStatus: (id, status) => AxiosInstance.patch(`/admin/trucks/${id}/status`, { status }),
  delete: (id) => AxiosInstance.delete(`/admin/trucks/${id}`),
  loadGoods: (id, payload) => AxiosInstance.post(`/admin/trucks/${id}/load`, payload),
  returnGoods: (id, payload) => AxiosInstance.post(`/admin/trucks/${id}/return`, payload),
  getTransfers: (params = {}) => AxiosInstance.get("/admin/truck-transfers", { params }),
  getTransferSummary: (params = {}) =>
    AxiosInstance.get("/admin/truck-transfers/summary", { params }),
  exportTransfers: (params = {}) =>
    AxiosInstance.get("/admin/truck-transfers/export", { params, responseType: "blob" }),
  getTransferById: (id) => AxiosInstance.get(`/admin/truck-transfers/${id}`),
};

// ─── INVOICES ─────────────────────────────────────────────────────────────────

export const InvoiceService = {
  getAll: async () => {
    return await AxiosInstance.get(`/admin/invoices`);
  },
  getById: async (id) => {
    return await AxiosInstance.get(`/admin/invoices/${id}`);
  },
  create: async (payload) => {
    return await AxiosInstance.post(`/admin/invoices`, payload);
  },
  preview: (payload) => AxiosInstance.post(`/admin/invoices/preview`, payload),
  previewGiftPromotions: (payload) =>
    AxiosInstance.post(`/admin/invoices/promotions/preview`, payload),
  applyGiftPromotion: (payload) => AxiosInstance.post(`/admin/invoices/promotions/apply`, payload),
};

// ─── DASHBOARD KPIs ───────────────────────────────────────────────────────────

export const DashboardService = {
  getStats: async () => {
    await delay();
    const today = new Date().toISOString().split("T")[0];
    const todayImports = MOCK_IMPORTS.filter((i) => i.date === today);
    const todayExports = MOCK_EXPORTS.filter((e) => e.date === today);
    const lowStock = MOCK_PRODUCTS.filter((p) => p.stock <= p.minStock);
    const totalStockValue = MOCK_PRODUCTS.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
    return {
      data: {
        totalProducts: MOCK_PRODUCTS.length,
        totalStockValue,
        todayImportsCount: todayImports.length,
        todayExportsCount: todayExports.length,
        lowStockCount: lowStock.length,
        activeTrucks: MOCK_TRUCKS.filter((t) => t.status === "active").length,
        recentImports: MOCK_IMPORTS.slice(-5).reverse(),
        recentInvoices: MOCK_INVOICES.slice(-5).reverse(),
        weeklyChart: [
          { day: "T2", imports: 2, exports: 3 },
          { day: "T3", imports: 1, exports: 2 },
          { day: "T4", imports: 3, exports: 1 },
          { day: "T5", imports: 0, exports: 4 },
          { day: "T6", imports: 2, exports: 2 },
          { day: "T7", imports: 1, exports: 3 },
          { day: "CN", imports: 0, exports: 1 },
        ],
      },
    };
  },
};
