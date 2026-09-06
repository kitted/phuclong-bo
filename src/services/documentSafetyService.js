import AxiosInstance from "./api";

export const DocumentSafetyService = {
  preview: (date) => AxiosInstance.get("/admin/document-safety/preview", { params: { date } }),
  export: (date) =>
    AxiosInstance.get("/admin/document-safety/export", {
      params: { date },
      responseType: "blob",
    }),
  history: (params = {}) => AxiosInstance.get("/admin/document-safety/operations", { params }),
  reverseDay: (payload) => AxiosInstance.post("/admin/document-safety/reverse-day", payload),
};

export default DocumentSafetyService;
