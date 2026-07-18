export function formatDate(timestamp, getTime) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  if (getTime)
    return `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  return `${day}/${month}/${year}`;
}

export function timeAgo(date) {
  const now = new Date();
  const timestamp = new Date(date);
  const difference = now - timestamp;
  const minutes = Math.floor(difference / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ngày trước`;
  } else if (hours > 0) {
    return `${hours} giờ trước`;
  } else if (minutes > 0) {
    return `${minutes} phút trước`;
  } else {
    return "Mới đây";
  }
}

export const formatCurrency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

export function formatNumber(number) {
  const format = number.toLocaleString("vi-VN");
  return format;
}

export function truncateText(text, maxLength) {
  if (!text) return "";
  if (text?.length <= maxLength) {
    return text;
  } else {
    const end = text?.slice(-maxLength / 2);
    return text?.slice(0, maxLength) + "...";
  }
}

export function time(timeString) {
  const createdAt = new Date(timeString); // ví dụ
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  return createdAt.toLocaleString("vi-VN", options);
}

export function isNumberString(value) {
  return /^-?\d+(\.\d+)?$/.test(value.toString().trim());
}
