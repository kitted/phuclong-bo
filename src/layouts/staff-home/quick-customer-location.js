import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { CustomerService } from "services/crmService";
import { toast } from "react-toastify";

const CustomerStoreProfile = lazy(() => import("layouts/khach-hang/store-profile"));

const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || value?.rows || [];
};
const customerId = (customer) => {
  const safeCustomer = customer || {};
  return safeCustomer.id || safeCustomer._id;
};
const customerCode = (customer) => {
  const safeCustomer = customer || {};
  return (
    safeCustomer.code ||
    safeCustomer.customerCode ||
    (safeCustomer.codeStatus === "UNASSIGNED" ? "Chưa có mã" : "")
  );
};
const coordinate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const storeFlags = (customer) => {
  const safeCustomer = customer || {};
  const location = safeCustomer.storeLocation || safeCustomer.location || {};
  const image = safeCustomer.storefrontImage || safeCustomer.storeImage || {};
  const latitude = coordinate(location.latitude ?? location.lat);
  const longitude = coordinate(location.longitude ?? location.lng ?? location.lon);
  return {
    hasLocation:
      latitude !== null &&
      longitude !== null &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180,
    hasImage: Boolean(
      image.secureUrl ||
        image.secure_url ||
        image.url ||
        safeCustomer.storefrontImageUrl ||
        safeCustomer.storeImageUrl
    ),
  };
};

function CustomerRow({ customer, onSelect }) {
  const code = customerCode(customer);
  const { hasLocation, hasImage } = storeFlags(customer);
  const phone = customer.phone || customer.phones?.[0] || "";

  return (
    <SoftBox
      component="button"
      type="button"
      onClick={() => onSelect(customer)}
      width="100%"
      display="flex"
      alignItems="center"
      gap={1.25}
      px={1.5}
      py={1.25}
      bgcolor="#fff"
      sx={{
        border: 0,
        borderBottom: "1px solid #edf0f5",
        textAlign: "left",
        font: "inherit",
        cursor: "pointer",
        "&:active": { bgcolor: "#eef6ff" },
      }}
    >
      <Avatar
        sx={{
          width: 44,
          height: 44,
          bgcolor: hasLocation ? "#e8f5e9" : "#e7f3ff",
          color: hasLocation ? "#2e7d32" : "#1877f2",
        }}
      >
        <Icon>{hasImage ? "storefront" : hasLocation ? "location_on" : "person_pin_circle"}</Icon>
      </Avatar>
      <SoftBox flex={1} minWidth={0}>
        <SoftTypography variant="button" fontWeight="bold" display="block" noWrap>
          {code ? `${code} · ` : ""}
          {customer.name || customer.fullName || "Khách hàng"}
        </SoftTypography>
        <SoftTypography variant="caption" color="text" display="block" noWrap>
          {phone || customer.address || "Chưa có số điện thoại"}
        </SoftTypography>
        {(hasLocation || hasImage) && (
          <SoftBox display="flex" gap={0.5} mt={0.5}>
            {hasLocation && (
              <SoftTypography
                variant="caption"
                fontWeight="bold"
                sx={{
                  color: "#2e7d32",
                  bgcolor: "#e8f5e9",
                  px: 0.7,
                  py: 0.2,
                  borderRadius: 5,
                }}
              >
                Vị trí
              </SoftTypography>
            )}
            {hasImage && (
              <SoftTypography
                variant="caption"
                fontWeight="bold"
                sx={{
                  color: "#7b1fa2",
                  bgcolor: "#f3e5f5",
                  px: 0.7,
                  py: 0.2,
                  borderRadius: 5,
                }}
              >
                Cửa tiệm
              </SoftTypography>
            )}
          </SoftBox>
        )}
      </SoftBox>
      <Icon sx={{ color: "#8a8d91", flexShrink: 0 }}>chevron_right</Icon>
    </SoftBox>
  );
}

export default function QuickCustomerLocation({ open, onClose, onSaved }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open || selected) return undefined;
    let active = true;
    setLoading(true);
    CustomerService.getAll({
      search: debouncedSearch || undefined,
      page: 1,
      limit: 20,
    })
      .then((response) => {
        if (active) setCustomers(listOf(response));
      })
      .catch((error) => {
        if (active) {
          setCustomers([]);
          toast.error(error.response?.data?.message || "Không thể tải danh sách khách hàng");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, selected, debouncedSearch]);

  useEffect(() => {
    if (open) return;
    detailRequestRef.current += 1;
    setSearch("");
    setDebouncedSearch("");
    setCustomers([]);
    setSelected(null);
    setLoading(false);
    setDetailLoading(false);
  }, [open]);

  const loadCustomerDetail = async (customer, showLoading = true) => {
    const id = customerId(customer);
    if (!id) {
      toast.error("Khách hàng chưa có ID hợp lệ");
      return null;
    }
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    if (showLoading) setDetailLoading(true);
    try {
      const response = await CustomerService.getById(id);
      if (detailRequestRef.current !== requestId) return null;
      const detail = unwrap(response) || customer;
      setSelected(detail);
      return detail;
    } catch (error) {
      if (showLoading) {
        toast.error(error.response?.data?.message || "Không thể tải hồ sơ cửa tiệm");
      }
      return null;
    } finally {
      if (detailRequestRef.current === requestId && showLoading) setDetailLoading(false);
    }
  };

  const selectCustomer = (customer) => {
    document.activeElement?.blur?.();
    setSelected(customer);
    loadCustomerDetail(customer);
  };

  const changeCustomer = () => {
    detailRequestRef.current += 1;
    setSelected(null);
    setSearch("");
    setDebouncedSearch("");
    setDetailLoading(false);
  };

  const refreshSelected = async () => {
    if (!selected) return;
    const detail = await loadCustomerDetail(selected, false);
    await onSaved?.(detail || selected);
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen sx={{ zIndex: 1500 }}>
      <SoftBox minHeight="100dvh" bgcolor="#f0f2f5">
        <SoftBox
          position="sticky"
          top={0}
          zIndex={1200}
          bgcolor="#fff"
          px={1.25}
          py={1}
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ borderBottom: "1px solid #e4e6eb" }}
        >
          <IconButton onClick={onClose}>
            <Icon>arrow_back</Icon>
          </IconButton>
          <SoftBox flex={1} minWidth={0}>
            <SoftTypography variant="button" fontWeight="bold" display="block">
              Vị trí và ảnh cửa tiệm
            </SoftTypography>
            <SoftTypography variant="caption" color="text" display="block" noWrap>
              Ghi nhận hồ sơ điểm bán ngay tại cửa hàng
            </SoftTypography>
          </SoftBox>
          <SoftBox
            width={38}
            height={38}
            borderRadius="50%"
            bgcolor="#e8f5e9"
            color="#2e7d32"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon>storefront</Icon>
          </SoftBox>
        </SoftBox>

        {!selected ? (
          <SoftBox minHeight="calc(100dvh - 65px)" bgcolor="#fff">
            <SoftBox p={1.5} position="sticky" top={65} zIndex={1100} bgcolor="#fff">
              <SoftTypography variant="h6" fontWeight="bold">
                Chọn khách hàng
              </SoftTypography>
              <SoftTypography variant="caption" color="text" display="block" mb={1.25}>
                Tìm bằng mã, tên hoặc số điện thoại
              </SoftTypography>
              <SoftInput
                autoFocus
                value={search}
                size="large"
                placeholder="VD: KH111, Lọc Phát, 0939..."
                icon={{ component: <Icon>search</Icon>, direction: "left" }}
                onChange={(event) => setSearch(event.target.value)}
                inputProps={{ enterKeyHint: "search" }}
                sx={{
                  minHeight: 52,
                  fontSize: "16px !important",
                  "& input": { py: "13px !important" },
                }}
              />
            </SoftBox>
            {loading && (
              <SoftBox display="flex" justifyContent="center" alignItems="center" gap={1} py={4}>
                <CircularProgress size={24} />
                <SoftTypography variant="button" color="text">
                  Đang tìm khách hàng...
                </SoftTypography>
              </SoftBox>
            )}
            {!loading && !customers.length && (
              <SoftBox textAlign="center" px={3} py={6}>
                <Icon sx={{ fontSize: 54, color: "#bcc0c4" }}>person_search</Icon>
                <SoftTypography variant="button" fontWeight="bold" display="block">
                  Không tìm thấy khách hàng
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Thử tìm bằng mã hoặc một phần tên khách hàng.
                </SoftTypography>
              </SoftBox>
            )}
            {!loading &&
              customers.map((customer) => (
                <CustomerRow
                  key={customerId(customer)}
                  customer={customer}
                  onSelect={selectCustomer}
                />
              ))}
          </SoftBox>
        ) : (
          <SoftBox pb="calc(24px + env(safe-area-inset-bottom))">
            <SoftBox bgcolor="#fff" p={1.5} mb={1}>
              <SoftBox display="flex" alignItems="center" gap={1.25}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: "#e7f3ff", color: "#1877f2" }}>
                  <Icon>storefront</Icon>
                </Avatar>
                <SoftBox flex={1} minWidth={0}>
                  <SoftTypography variant="button" fontWeight="bold" display="block">
                    {customerCode(selected) ? `${customerCode(selected)} · ` : ""}
                    {selected.name || selected.fullName || "Khách hàng"}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text" display="block" noWrap>
                    {selected.phone ||
                      selected.phones?.[0] ||
                      selected.address ||
                      "Chưa có số điện thoại"}
                  </SoftTypography>
                </SoftBox>
                <SoftButton size="small" variant="text" color="info" onClick={changeCustomer}>
                  Đổi khách
                </SoftButton>
              </SoftBox>
            </SoftBox>

            {detailLoading ? (
              <SoftBox
                minHeight={300}
                bgcolor="#fff"
                display="flex"
                justifyContent="center"
                alignItems="center"
                gap={1}
              >
                <CircularProgress size={26} />
                <SoftTypography variant="button" color="text">
                  Đang mở hồ sơ cửa tiệm...
                </SoftTypography>
              </SoftBox>
            ) : (
              <SoftBox bgcolor="#fff" p={1.5}>
                <Suspense
                  fallback={
                    <SoftBox
                      minHeight={300}
                      display="flex"
                      justifyContent="center"
                      alignItems="center"
                      gap={1}
                    >
                      <CircularProgress size={26} />
                      <SoftTypography variant="button" color="text">
                        Đang tải bản đồ và camera...
                      </SoftTypography>
                    </SoftBox>
                  }
                >
                  <CustomerStoreProfile
                    customer={selected}
                    readOnly={false}
                    onSaved={refreshSelected}
                  />
                </Suspense>
              </SoftBox>
            )}
          </SoftBox>
        )}
      </SoftBox>
    </Dialog>
  );
}
