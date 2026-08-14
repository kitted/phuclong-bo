import AxiosInstance from "./api";

const QuickNoteService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/quick-notes", { params }),
  getLatestPinned: () => AxiosInstance.get("/admin/quick-notes/latest-pinned"),
  getById: (id) => AxiosInstance.get(`/admin/quick-notes/${id}`),
  create: (payload) => AxiosInstance.post("/admin/quick-notes", payload),
  update: (id, payload) => AxiosInstance.patch(`/admin/quick-notes/${id}`, payload),
  remove: (id) => AxiosInstance.delete(`/admin/quick-notes/${id}`),
};

export default QuickNoteService;

