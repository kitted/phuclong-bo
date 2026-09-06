import AxiosInstance from "./api";
import * as XLSX from "xlsx";

export const WebsiteOrderService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/website-orders", { params }),
  getById: (id) => AxiosInstance.get(`/admin/website-orders/${id}`),
  assign: (id, saleId, note) =>
    AxiosInstance.patch(`/admin/website-orders/${id}/assign`, { saleId, note }),
  changeStatus: (id, status, note) =>
    AxiosInstance.patch(`/admin/website-orders/${id}/status`, { status, note }),
  convert: (id, payload) =>
    AxiosInstance.patch(`/admin/website-orders/${id}/convert-to-invoice`, payload),
};

export const WebsiteContentService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/website-contents", { params }),
  getById: (id) => AxiosInstance.get(`/admin/website-contents/${id}`),
  getCategories: () => AxiosInstance.get("/admin/website-content-categories"),
  create: (payload) => AxiosInstance.post("/admin/website-contents", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/website-contents/${id}`, payload),
  remove: (id) => AxiosInstance.delete(`/admin/website-contents/${id}`),
  uploadImage: (file) =>
    AxiosInstance.post("/admin/website-products/images/upload", fileForm(file)),
};

export const WebsiteProductService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/website-products", { params }),
  getById: (id) => AxiosInstance.get(`/admin/website-products/${id}`),
  getCategories: () => AxiosInstance.get("/admin/website-products/categories"),
  create: (payload) => AxiosInstance.post("/admin/website-products", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/website-products/${id}`, payload),
  remove: (id) => AxiosInstance.delete(`/admin/website-products/${id}`),
  uploadImage: (file) =>
    AxiosInstance.post("/admin/website-products/images/upload", fileForm(file)),
  mapInventory: (id, inventoryProductId) =>
    AxiosInstance.patch(`/admin/website-products/${id}/map-inventory`, { inventoryProductId }),
};

const fileForm = (file) => {
  const data = new FormData();
  data.append("file", file);
  return data;
};

const WEBSITE_IMPORT_SHEETS = [
  ["danhmucsanpham", "Danh muc san pham"],
  ["sanpham", "San pham"],
  ["danhmucnoidung", "Danh muc noi dung"],
  ["noidung", "Noi dung"],
  ["cauhinh", "Cau hinh"],
];

const normalizeFileName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\.csv$/i, "")
    .replace(/[^a-z0-9]/g, "");

const sheetNameFromCsv = (fileName) => {
  const normalized = normalizeFileName(fileName);
  // Danh mục phải được kiểm tra trước tên sheet ngắn hơn như `sanpham`, `noidung`.
  return WEBSITE_IMPORT_SHEETS.find(([key]) => normalized.includes(key))?.[1] || "";
};

export const prepareWebsiteImportFile = async (files) => {
  const selected = Array.from(files || []);
  if (!selected.length) throw new Error("Chưa chọn file dữ liệu");

  const xlsxFiles = selected.filter((file) => file.name.toLowerCase().endsWith(".xlsx"));
  const csvFiles = selected.filter((file) => file.name.toLowerCase().endsWith(".csv"));
  if (xlsxFiles.length === 1 && selected.length === 1) return xlsxFiles[0];
  if (xlsxFiles.length || csvFiles.length !== selected.length)
    throw new Error("Chỉ chọn một file .xlsx hoặc một bộ file .csv");

  // Backend mới nhận trực tiếp CSV tổng hợp. Dạng file này có cột record_type
  // để phân biệt CATEGORY, PRODUCT, CONTENT... nên không được chuyển thành một sheet Excel.
  if (csvFiles.length === 1) {
    const csvText = (await csvFiles[0].text()).replace(/^\uFEFF/, "");
    const firstLine = csvText.split(/\r?\n/, 1)[0].toLowerCase();
    if (firstLine.includes("record_type")) return csvFiles[0];
  }

  const workbook = XLSX.utils.book_new();
  const usedSheets = new Set();
  for (const csvFile of csvFiles) {
    const sheetName = sheetNameFromCsv(csvFile.name);
    if (!sheetName)
      throw new Error(
        `Không nhận diện được “${csvFile.name}”. Hãy đặt tên theo: Danh muc san pham, San pham, Danh muc noi dung, Noi dung hoặc Cau hinh.`
      );
    if (usedSheets.has(sheetName)) throw new Error(`Có nhiều file CSV cùng loại “${sheetName}”`);
    const csvText = (await csvFile.text()).replace(/^\uFEFF/, "");
    const csvWorkbook = XLSX.read(csvText, { type: "string", raw: true });
    const sourceSheet = csvWorkbook.Sheets[csvWorkbook.SheetNames[0]];
    if (!sourceSheet || !sourceSheet["!ref"])
      throw new Error(`File “${csvFile.name}” không có dữ liệu`);
    XLSX.utils.book_append_sheet(workbook, sourceSheet, sheetName);
    usedSheets.add(sheetName);
  }

  const content = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new File([content], `website-data-${Date.now()}.xlsx`, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

export const WebsiteDataImportService = {
  downloadTemplate: () =>
    AxiosInstance.get("/admin/website-data/import-template", { responseType: "blob" }),
  // Không đặt Content-Type thủ công. Trình duyệt phải tự thêm multipart boundary;
  // nếu thiếu boundary, backend sẽ không đọc được field `file`.
  preview: (file) => AxiosInstance.post("/admin/website-data/import/preview", fileForm(file)),
  apply: (file) => AxiosInstance.post("/admin/website-data/import", fileForm(file)),
};
