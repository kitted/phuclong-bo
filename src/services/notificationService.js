import AxiosInstance from "./api";

export const NotificationService = {
  getAll: (params = {}) => AxiosInstance.get("/admin/notifications", { params }),
  getSummary: () => AxiosInstance.get("/admin/notifications/summary"),
  read: (id) => AxiosInstance.patch(`/admin/notifications/${id}/read`),
  readAll: () => AxiosInstance.patch("/admin/notifications/read-all"),
};

const streamUrl = () =>
  `${String(process.env.REACT_APP_API_URL || "").replace(/\/$/, "")}/admin/notifications/stream`;

export async function consumeNotificationStream({ signal, onMessage }) {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("Không có access token");
  const response = await fetch(streamUrl(), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    },
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`Không thể kết nối thông báo (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    events.forEach((event) => {
      const data = event
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) return;
      try {
        onMessage(JSON.parse(data));
      } catch (_) {
        // Bỏ qua heartbeat hoặc event không phải JSON.
      }
    });
  }
}
