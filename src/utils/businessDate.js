const TIME_ZONE = "Asia/Ho_Chi_Minh";

const partsInVietnam = (value = new Date()) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

export const vietnamToday = () => {
  const parts = partsInVietnam();
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const toBusinessDateTime = (selectedDate) => {
  const date = selectedDate || vietnamToday();
  if (date !== vietnamToday()) return `${date}T00:00:00+07:00`;
  const parts = partsInVietnam();
  return `${date}T${parts.hour}:${parts.minute}:${parts.second}+07:00`;
};

export const vietnamDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = partsInVietnam(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatBusinessDateTime = (value, fallback = "—") => {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const options = {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };
  if (vietnamDateKey(date) === vietnamToday()) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    options.hour12 = false;
  }
  return date.toLocaleString("vi-VN", options);
};
