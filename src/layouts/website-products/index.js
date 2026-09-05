import { useCallback, useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MobileLoadMore from "components/MobileLoadMore";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { WebsiteProductService } from "services/websiteAdminService";
import { mergeUniqueItems } from "utils/infiniteList";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const idOf = (value) => value?.id || value?._id || "";
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
export default function WebsiteProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibility, setVisibility] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setProducts([]);
    setPage(1);
  }, [debouncedSearch, visibility]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await WebsiteProductService.getAll({
        search: debouncedSearch || undefined,
        active: visibility || undefined,
        page,
        limit: 20,
      });
      const rows = listOf(response);
      setProducts((current) => (page === 1 ? rows : mergeUniqueItems(current, rows)));
      setMeta(response.data?.meta || { totalPages: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải sản phẩm website");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, visibility]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    WebsiteProductService.getCategories()
      .then((response) => setCategories(listOf(response)))
      .catch(() => toast.error("Không thể tải danh mục sản phẩm website"));
  }, []);

  const remove = async (product) => {
    if (!window.confirm(`Xóa sản phẩm website “${product.name}”? Tồn kho sẽ không bị ảnh hưởng.`)) return;
    try {
      await WebsiteProductService.remove(idOf(product));
      toast.success("Đã xóa sản phẩm khỏi website");
      setProducts((current) => current.filter((item) => idOf(item) !== idOf(product)));
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa sản phẩm website");
    }
  };

  const categoryName = (product) =>
    categories.find((category) => idOf(category) === String(product.categoryId || ""))?.name ||
    "Chưa phân loại";

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={{ xs: 1.5, md: 3 }}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap">
              <SoftBox>
                <SoftTypography variant="h4" fontWeight="bold">Sản phẩm website</SoftTypography>
                <SoftTypography variant="button" color="text">
                  Quản lý catalog, hình ảnh và nội dung website độc lập với hàng hóa kho và bán hàng.
                </SoftTypography>
              </SoftBox>
              <SoftButton color="info" variant="gradient" startIcon={<Icon>add</Icon>} onClick={() => navigate("/website-products/new")}>
                Thêm sản phẩm website
              </SoftButton>
            </SoftBox>

            <SoftBox mt={2.5} display="flex" gap={1.5} flexWrap="wrap">
              <SoftBox flex={1} minWidth={220}>
                <SoftInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã hoặc tên trên website..." icon={{ component: "search", direction: "left" }} />
              </SoftBox>
              <SoftInput select value={visibility} onChange={(event) => setVisibility(event.target.value)} sx={{ minWidth: 180 }}>
                <MenuItem value="">Tất cả trạng thái</MenuItem>
                <MenuItem value="true">Đang hiển thị</MenuItem>
                <MenuItem value="false">Đang ẩn</MenuItem>
              </SoftInput>
            </SoftBox>

            <Grid container spacing={1.5} mt={0.5}>
              {products.map((product) => (
                <Grid item xs={12} lg={6} key={idOf(product)}>
                  <SoftBox p={1.5} height="100%" borderRadius={2.5} sx={{ border: "1px solid #e1e6ee" }}>
                    <SoftBox display="flex" gap={1.5}>
                      {product.imageUrls?.[0] ? (
                        <SoftBox
                          component="img"
                          src={product.imageUrls[0]}
                          alt={product.name || "Sản phẩm website"}
                          width={88}
                          height={88}
                          borderRadius={2}
                          sx={{ objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <SoftBox
                          width={88}
                          height={88}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          bgcolor="#f2f5f9"
                          borderRadius={2}
                          sx={{ flexShrink: 0 }}
                        >
                          <Icon sx={{ color: "#a7b0bd" }}>image</Icon>
                        </SoftBox>
                      )}
                      <SoftBox flex={1} minWidth={0}>
                        <SoftBox display="flex" justifyContent="space-between" gap={1}>
                          <SoftBox minWidth={0}>
                            <SoftTypography variant="button" fontWeight="bold" display="block">{product.name}</SoftTypography>
                            <SoftTypography variant="caption" color="text" display="block">{product.code} · /{product.slug}</SoftTypography>
                          </SoftBox>
                          <SoftBox display="flex">
                            <IconButton size="small" aria-label="Sửa sản phẩm website" onClick={() => navigate(`/website-products/${idOf(product)}/edit`)}><Icon>edit</Icon></IconButton>
                            <IconButton size="small" aria-label="Xóa sản phẩm website" onClick={() => remove(product)}><Icon color="error">delete</Icon></IconButton>
                          </SoftBox>
                        </SoftBox>
                        <SoftTypography variant="caption" display="block" mt={0.75}>{categoryName(product)} · {product.unit || "Chưa có đơn vị"}</SoftTypography>
                        <SoftTypography variant="button" fontWeight="bold" color="info">{money(product.sellPrice)}</SoftTypography>
                        <SoftBox display="flex" gap={0.75} mt={0.75} flexWrap="wrap">
                          <SoftTypography variant="caption" fontWeight="bold" color={product.isActive ? "success" : "secondary"}>{product.isActive ? "Đang hiển thị" : "Đang ẩn"}</SoftTypography>
                          <SoftTypography variant="caption" color={product.inventoryProductId ? "success" : "warning"}>· {product.inventoryProductId ? "Đã liên kết hàng hóa" : "Chưa liên kết hàng hóa"}</SoftTypography>
                        </SoftBox>
                      </SoftBox>
                    </SoftBox>
                  </SoftBox>
                </Grid>
              ))}
            </Grid>
            {!loading && !products.length && (
              <SoftBox py={6} textAlign="center"><SoftTypography variant="button" color="text">Chưa có sản phẩm website phù hợp</SoftTypography></SoftBox>
            )}
            <MobileLoadMore loading={loading} hasMore={page < Number(meta.totalPages || 1)} onLoadMore={() => setPage((current) => current + 1)} />
          </SoftBox>
        </Card>
      </SoftBox>
    </DashboardLayout>
  );
}
