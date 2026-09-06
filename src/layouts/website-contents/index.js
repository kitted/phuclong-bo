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
import { WebsiteContentService } from "services/websiteAdminService";
import { mergeUniqueItems } from "utils/infiniteList";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const idOf = (value) => value?.id || value?._id || "";
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};

const typeLabels = {
  ARTICLE: "Bài viết",
  TECHNICAL: "Kỹ thuật",
  NEWS: "Tin tức",
  PAGE: "Trang nội dung",
};

const statusLabels = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Đã lưu trữ",
};

const statusColors = {
  DRAFT: "warning",
  PUBLISHED: "success",
  ARCHIVED: "secondary",
};

export default function WebsiteContents() {
  const navigate = useNavigate();
  const [contents, setContents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setContents([]);
    setPage(1);
  }, [debouncedSearch, status, type]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await WebsiteContentService.getAll({
        search: debouncedSearch || undefined,
        type: type || undefined,
        status: status || undefined,
        page,
        limit: 20,
      });
      const rows = listOf(response);
      setContents((current) => (page === 1 ? rows : mergeUniqueItems(current, rows)));
      setMeta(response.data?.meta || { totalPages: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải bài viết website");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, status, type]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    WebsiteContentService.getCategories()
      .then((response) => setCategories(listOf(response)))
      .catch(() => setCategories([]));
  }, []);

  const remove = async (content) => {
    if (!window.confirm(`Xóa bài viết “${content.title}”?`)) return;
    try {
      await WebsiteContentService.remove(idOf(content));
      setContents((current) => current.filter((item) => idOf(item) !== idOf(content)));
      toast.success("Đã xóa bài viết");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa bài viết");
    }
  };

  const categoryName = (content) =>
    categories.find((category) => idOf(category) === String(content.categoryId || ""))?.name ||
    "Chưa phân loại";

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <Card>
          <SoftBox p={{ xs: 1.5, md: 3 }}>
            <SoftBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
              flexWrap="wrap"
            >
              <SoftBox>
                <SoftTypography variant="h4" fontWeight="bold">
                  Bài viết website
                </SoftTypography>
                <SoftTypography variant="button" color="text">
                  Quản lý bài viết theo cùng cách với sản phẩm: tìm kiếm, lọc và mở trang biên tập
                  riêng.
                </SoftTypography>
              </SoftBox>
              <SoftButton
                color="info"
                variant="gradient"
                startIcon={<Icon>post_add</Icon>}
                onClick={() => navigate("/website-contents/new")}
              >
                Thêm bài viết
              </SoftButton>
            </SoftBox>

            <SoftBox mt={2.5} display="flex" gap={1.5} flexWrap="wrap">
              <SoftBox flex={1} minWidth={240}>
                <SoftInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm tiêu đề, mô tả hoặc hashtag..."
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <SoftInput
                select
                value={type}
                onChange={(event) => setType(event.target.value)}
                sx={{ minWidth: 170 }}
              >
                <MenuItem value="">Tất cả loại</MenuItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </SoftInput>
              <SoftInput
                select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Tất cả trạng thái</MenuItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </SoftInput>
            </SoftBox>

            <Grid container spacing={1.5} mt={0.5}>
              {contents.map((content) => (
                <Grid item xs={12} lg={6} key={idOf(content)}>
                  <SoftBox
                    p={1.5}
                    height="100%"
                    borderRadius={2.5}
                    sx={{ border: "1px solid #e1e6ee" }}
                  >
                    <SoftBox display="flex" gap={1.5}>
                      {content.coverImageUrl ? (
                        <SoftBox
                          component="img"
                          src={content.coverImageUrl}
                          alt={content.title || "Bài viết website"}
                          width={112}
                          height={88}
                          borderRadius={2}
                          sx={{ objectFit: "cover", flexShrink: 0 }}
                        />
                      ) : (
                        <SoftBox
                          width={112}
                          height={88}
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          bgcolor="#f2f5f9"
                          borderRadius={2}
                          sx={{ flexShrink: 0 }}
                        >
                          <Icon sx={{ color: "#a7b0bd", fontSize: 34 }}>article</Icon>
                        </SoftBox>
                      )}
                      <SoftBox flex={1} minWidth={0}>
                        <SoftBox display="flex" justifyContent="space-between" gap={1}>
                          <SoftBox minWidth={0}>
                            <SoftTypography variant="button" fontWeight="bold" display="block">
                              {content.title}
                            </SoftTypography>
                            <SoftTypography variant="caption" color="text" display="block">
                              /{content.slug}
                            </SoftTypography>
                          </SoftBox>
                          <SoftBox display="flex">
                            <IconButton
                              size="small"
                              aria-label="Sửa bài viết"
                              onClick={() => navigate(`/website-contents/${idOf(content)}/edit`)}
                            >
                              <Icon>edit</Icon>
                            </IconButton>
                            <IconButton
                              size="small"
                              aria-label="Xóa bài viết"
                              onClick={() => remove(content)}
                            >
                              <Icon color="error">delete</Icon>
                            </IconButton>
                          </SoftBox>
                        </SoftBox>
                        <SoftTypography variant="caption" display="block" mt={0.75}>
                          {typeLabels[content.type] || content.type} · {categoryName(content)}
                        </SoftTypography>
                        <SoftTypography
                          variant="caption"
                          fontWeight="bold"
                          color={statusColors[content.status] || "secondary"}
                        >
                          {statusLabels[content.status] || content.status}
                        </SoftTypography>
                        {content.requiresCustomerVerification && (
                          <SoftTypography variant="caption" color="warning">
                            {" "}
                            · Yêu cầu xác minh khách hàng
                          </SoftTypography>
                        )}
                        {content.excerpt && (
                          <SoftTypography
                            variant="caption"
                            color="text"
                            display="block"
                            mt={0.75}
                            sx={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {content.excerpt}
                          </SoftTypography>
                        )}
                      </SoftBox>
                    </SoftBox>
                  </SoftBox>
                </Grid>
              ))}
            </Grid>

            {!loading && !contents.length && (
              <SoftBox py={6} textAlign="center">
                <Icon sx={{ color: "#aab2bf", fontSize: 44 }}>article</Icon>
                <SoftTypography variant="button" color="text" display="block">
                  Chưa có bài viết phù hợp
                </SoftTypography>
              </SoftBox>
            )}
            <MobileLoadMore
              loading={loading}
              hasMore={page < Number(meta.totalPages || 1)}
              onLoadMore={() => setPage((current) => current + 1)}
            />
          </SoftBox>
        </Card>
      </SoftBox>
    </DashboardLayout>
  );
}
