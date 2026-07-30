import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@mui/material/Badge";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import { useNavigate } from "react-router-dom";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftTypography from "components/SoftTypography";
import { consumeNotificationStream, NotificationService } from "services/notificationService";
import { toast } from "react-toastify";

const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || value?.rows || [];
};
const idOf = (value) => String(value?.id || value?._id || "");
const typeMeta = {
  INVOICE_CREATED: {
    icon: "receipt_long",
    color: "#1565c0",
    background: "#e3f2fd",
  },
  INVOICE_REVERSED: {
    icon: "undo",
    color: "#c62828",
    background: "#ffebee",
  },
  TRUCK_LOADED: {
    icon: "upload",
    color: "#2e7d32",
    background: "#e8f5e9",
  },
  TRUCK_RETURNED: {
    icon: "keyboard_return",
    color: "#ed6c02",
    background: "#fff3e0",
  },
  TRUCK_TO_TRUCK: {
    icon: "swap_horiz",
    color: "#7b1fa2",
    background: "#f3e5f5",
  },
  TRANSFER_REVERSED: {
    icon: "history",
    color: "#c62828",
    background: "#ffebee",
  },
};
const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

export default function NotificationCenter({ light = false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const reconnectTimerRef = useRef(null);

  const loadSummary = useCallback(() => {
    NotificationService.getSummary()
      .then((response) => setUnread(Number(unwrap(response)?.unread || 0)))
      .catch(() => undefined);
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await NotificationService.getAll({ page: 1, limit: 30 });
      setItems(listOf(response));
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    const interval = window.setInterval(loadSummary, 30000);
    return () => window.clearInterval(interval);
  }, [loadSummary]);

  useEffect(() => {
    let active = true;
    let controller = null;
    const connect = () => {
      if (!active) return;
      controller = new AbortController();
      consumeNotificationStream({
        signal: controller.signal,
        onMessage: (notification) => {
          if (!active || !notification) return;
          setItems((current) => {
            const notificationId = idOf(notification);
            if (notificationId && current.some((item) => idOf(item) === notificationId))
              return current;
            return [notification, ...current].slice(0, 30);
          });
          setUnread((current) => current + 1);
          toast.info(notification.message || notification.title || "Bạn có thông báo mới");
        },
      })
        .catch(() => undefined)
        .finally(() => {
          if (active) reconnectTimerRef.current = window.setTimeout(connect, 5000);
        });
    };
    connect();
    return () => {
      active = false;
      controller?.abort();
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (open) loadItems();
  }, [open, loadItems]);

  const markRead = async (notification) => {
    const id = idOf(notification);
    if (!notification.readAt && id) {
      try {
        await NotificationService.read(id);
        setItems((current) =>
          current.map((item) =>
            idOf(item) === id ? { ...item, readAt: new Date().toISOString() } : item
          )
        );
        setUnread((current) => Math.max(0, current - 1));
      } catch (_) {
        return;
      }
    }
    setOpen(false);
    if (notification.entityType === "INVOICE") {
      navigate(
        notification.entityId
          ? `/hoa-don?invoiceId=${encodeURIComponent(notification.entityId)}`
          : notification.entityCode
          ? `/hoa-don?search=${encodeURIComponent(notification.entityCode)}`
          : "/hoa-don"
      );
    } else if (
      ["TRUCK", "TRUCK_TRANSFER"].includes(notification.entityType) ||
      String(notification.type || "").includes("TRUCK") ||
      notification.type === "TRANSFER_REVERSED"
    ) {
      navigate("/quan-ly-xe");
    }
  };

  const markAll = async () => {
    try {
      setMarkingAll(true);
      await NotificationService.readAll();
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt })));
      setUnread(0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đánh dấu đã đọc");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ""}`}
        sx={{ bgcolor: light ? "transparent" : "#f0f2f5" }}
      >
        <Badge badgeContent={unread > 99 ? "99+" : unread} color="error">
          <Icon sx={{ color: light ? "#fff" : "inherit" }}>notifications</Icon>
        </Badge>
      </IconButton>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        sx={{ zIndex: 1700 }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 430 },
            maxWidth: "100%",
            bgcolor: "#f0f2f5",
          },
        }}
      >
        <SoftBox
          position="sticky"
          top={0}
          zIndex={2}
          bgcolor="#fff"
          px={2}
          py={1.5}
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ borderBottom: "1px solid #e4e6eb" }}
        >
          <IconButton onClick={() => setOpen(false)}>
            <Icon>arrow_back</Icon>
          </IconButton>
          <SoftBox flex={1}>
            <SoftTypography variant="h6" fontWeight="bold">
              Thông báo
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              {unread ? `${unread} thông báo chưa đọc` : "Đã đọc tất cả thông báo"}
            </SoftTypography>
          </SoftBox>
          <SoftButton
            size="small"
            variant="text"
            color="info"
            disabled={!unread || markingAll}
            onClick={markAll}
          >
            Đọc tất cả
          </SoftButton>
        </SoftBox>

        {loading && (
          <SoftBox py={5} display="flex" justifyContent="center">
            <CircularProgress size={28} />
          </SoftBox>
        )}
        {!loading && !items.length && (
          <SoftBox textAlign="center" px={3} py={8}>
            <Icon sx={{ fontSize: 58, color: "#bcc0c4" }}>notifications_none</Icon>
            <SoftTypography variant="button" fontWeight="bold" display="block">
              Chưa có thông báo
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Hóa đơn và biến động nguồn hàng mới sẽ xuất hiện tại đây.
            </SoftTypography>
          </SoftBox>
        )}
        {!loading &&
          items.map((notification, index) => {
            const meta = typeMeta[notification.type] || {
              icon: "notifications",
              color: "#455a64",
              background: "#eceff1",
            };
            return (
              <SoftBox key={idOf(notification) || index} bgcolor="#fff">
                <SoftBox
                  component="button"
                  type="button"
                  width="100%"
                  px={2}
                  py={1.5}
                  display="flex"
                  gap={1.25}
                  textAlign="left"
                  onClick={() => markRead(notification)}
                  sx={{
                    border: 0,
                    bgcolor: notification.readAt ? "#fff" : "#eef6ff",
                    cursor: "pointer",
                    font: "inherit",
                    "&:active": { bgcolor: "#e3f2fd" },
                  }}
                >
                  <SoftBox
                    width={44}
                    height={44}
                    borderRadius="50%"
                    bgcolor={meta.background}
                    color={meta.color}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexShrink={0}
                  >
                    <Icon>{meta.icon}</Icon>
                  </SoftBox>
                  <SoftBox flex={1} minWidth={0}>
                    <SoftBox display="flex" alignItems="center" gap={0.75}>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {notification.title || "Thông báo hệ thống"}
                      </SoftTypography>
                      {!notification.readAt && (
                        <SoftBox width={8} height={8} borderRadius="50%" bgcolor="#1877f2" />
                      )}
                    </SoftBox>
                    <SoftTypography
                      variant="caption"
                      display="block"
                      mt={0.25}
                      sx={{ color: "#344767", lineHeight: 1.4 }}
                    >
                      {notification.message}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
                      {formatDateTime(notification.createdAt)}
                      {notification.entityCode ? ` · ${notification.entityCode}` : ""}
                    </SoftTypography>
                  </SoftBox>
                  <Icon sx={{ color: "#8a8d91", mt: 1 }}>chevron_right</Icon>
                </SoftBox>
                <Divider />
              </SoftBox>
            );
          })}
      </Drawer>
    </>
  );
}
