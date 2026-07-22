import { useCallback, useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import StaffMobileHeader from "components/StaffMobileHeader";
import SoftBox from "components/SoftBox";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { CustomerService } from "services/crmService";
import { DebtPaymentModal } from "layouts/khach-hang/debt-payment";
import { toast } from "react-toastify";
import MobileLoadMore from "components/MobileLoadMore";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
const listOf = (response) => {
  const value = response?.data?.data;
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};

export default function ThuCongNo() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(1), [debouncedSearch]);

  const load = useCallback(() => {
    setLoading(true);
    CustomerService.getAll({
      search: debouncedSearch || undefined,
      hasDebt: true,
      page,
      limit: 20,
    })
      .then((response) => {
        const nextCustomers = listOf(response);
        setCustomers((current) => (page > 1 ? [...current, ...nextCustomers] : nextCustomers));
        setMeta(response.data?.meta || { totalPages: 1, totalItems: 0 });
      })
      .catch((error) => {
        setCustomers([]);
        toast.error(error.response?.data?.message || "Không thể tải khách hàng công nợ");
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);
  useEffect(load, [load]);

  return (
    <DashboardLayout compactMobile>
      <StaffMobileHeader title="Thu công nợ" subtitle="Lập phiếu thu cho khách hàng" onRefresh={load} />
      <SoftBox minHeight="100vh" bgcolor="#f0f2f5" pb={10} pt={1}>
        <Card sx={{ borderRadius: 0, boxShadow: "none" }}>
          <SoftBox p={2}>
            <SoftTypography variant="h6" fontWeight="bold">Khách hàng còn công nợ</SoftTypography>
            <SoftTypography variant="caption" color="text" display="block" mb={1.5}>Tìm khách rồi chạm để lập phiếu thu</SoftTypography>
            <SoftInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã, tên hoặc số điện thoại..." icon={{ component: "search", direction: "left" }} />
            {loading && <SoftTypography variant="button" display="block" textAlign="center" py={4}>Đang tải...</SoftTypography>}
            {!loading && !customers.length && <SoftTypography variant="button" color="text" display="block" textAlign="center" py={4}>Không tìm thấy khách hàng còn công nợ</SoftTypography>}
            {customers.map((customer) => {
              const warning = Number(customer.debtLimit || 0) > 0 && Number(customer.debt || 0) >= Number(customer.debtLimit || 0);
              return <SoftBox key={customer.id || customer._id} display="flex" alignItems="center" gap={1.25} py={1.6} onClick={() => setSelected(customer)} sx={{ borderBottom: "1px solid #edf0f5", cursor: "pointer" }}>
                <SoftBox width={46} height={46} borderRadius="50%" bgcolor={warning ? "#ffebee" : "#e8f5e9"} color={warning ? "#c62828" : "#2e7d32"} display="flex" alignItems="center" justifyContent="center" flexShrink={0}><Icon>payments</Icon></SoftBox>
                <SoftBox flex={1} minWidth={0}><SoftBox display="flex" alignItems="center" gap={0.75}><SoftTypography variant="button" fontWeight="bold" noWrap>{customer.name}</SoftTypography>{customer.zaloConnected && <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "#0068ff" }}>Zalo</SoftTypography>}</SoftBox><SoftTypography variant="caption" color="text" display="block">{customer.code} · {customer.phone}</SoftTypography><SoftTypography variant="button" fontWeight="bold" sx={{ color: warning ? "#c62828" : "#e65100" }}>Còn nợ {money(customer.debt)}</SoftTypography></SoftBox>
                <Icon sx={{ color: "#65676b" }}>chevron_right</Icon>
              </SoftBox>;
            })}
            <MobileLoadMore loading={loading} hasMore={page < (meta.totalPages || 1)} onLoadMore={() => setPage((value) => value + 1)} />
          </SoftBox>
        </Card>
      </SoftBox>
      <DebtPaymentModal open={Boolean(selected)} customer={selected} onClose={() => setSelected(null)} onCreated={load} mobile />
    </DashboardLayout>
  );
}
