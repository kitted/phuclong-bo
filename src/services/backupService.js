import AxiosInstance from "./api";

export const BackupService = {
  exportDatabase: (payload = {}) =>
    AxiosInstance.post("/admin/backups/export", payload, {
      responseType: "blob",
      timeout: 10 * 60 * 1000,
    }),

  inspect: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    return AxiosInstance.post("/admin/backups/inspect", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 10 * 60 * 1000,
      onUploadProgress,
    });
  },

  restore: (restoreToken, payload) =>
    AxiosInstance.post(
      `/admin/backups/${encodeURIComponent(restoreToken)}/restore`,
      payload,
      { timeout: 10 * 60 * 1000 }
    ),

  getJob: (jobId) =>
    AxiosInstance.get(`/admin/backups/jobs/${encodeURIComponent(jobId)}`),
};

export default BackupService;
