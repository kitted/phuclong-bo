import { useEffect, useRef, useState } from "react";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import RichTextEditor from "components/RichTextEditor";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { WebsiteContentService } from "services/websiteAdminService";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";

const idOf = (value) => value?.id || value?._id || "";
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const value = unwrap(response);
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const sanitizeHtml = (value) =>
  String(value || "")
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");

const EMPTY_FORM = {
  title: "",
  slug: "",
  type: "ARTICLE",
  categoryId: "",
  excerpt: "",
  contentHtml: "",
  coverImageUrl: "",
  hashtagsText: "",
  status: "DRAFT",
  requiresCustomerVerification: false,
};

const typeLabels = {
  ARTICLE: "Bài viết",
  TECHNICAL: "Nội dung kỹ thuật",
  NEWS: "Tin tức",
  PAGE: "Trang nội dung",
};

const statusLabels = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Xuất bản",
  ARCHIVED: "Lưu trữ",
};

export default function WebsiteContentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const uploadInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [categories, setCategories] = useState([]);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const requests = [WebsiteContentService.getCategories()];
        if (id) requests.push(WebsiteContentService.getById(id));
        const [categoryResponse, contentResponse] = await Promise.all(requests);
        if (!active) return;
        setCategories(listOf(categoryResponse));
        if (contentResponse) {
          const content = unwrap(contentResponse);
          setForm({
            ...EMPTY_FORM,
            title: content.title || "",
            slug: content.slug || "",
            type: content.type || "ARTICLE",
            categoryId: content.categoryId ? String(content.categoryId) : "",
            excerpt: content.excerpt || "",
            contentHtml: content.contentHtml || "",
            coverImageUrl: content.coverImageUrl || "",
            hashtagsText: (content.hashtags || []).join(", "),
            status: content.status || "DRAFT",
            requiresCustomerVerification: Boolean(content.requiresCustomerVerification),
          });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Không thể tải trình biên tập bài viết");
        navigate("/website-contents", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const change = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const acceptImageUrl = (url, action) => {
    const normalized = String(url || "").trim();
    if (!/^https?:\/\//i.test(normalized)) {
      toast.error("URL ảnh phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    if (action === "cover") {
      setForm((current) => ({ ...current, coverImageUrl: normalized }));
      toast.success("Đã đặt ảnh bìa");
    } else {
      editorRef.current?.insertImage(normalized, form.title);
      toast.success("Đã chèn ảnh vào nội dung");
    }
    setImageUrl("");
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh không được vượt quá 5 MB");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return toast.error("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP");
    try {
      setUploading(true);
      const uploaded = unwrap(await WebsiteContentService.uploadImage(file));
      const url = uploaded?.url;
      if (!url) throw new Error("Upload response does not contain URL");
      if (!form.coverImageUrl) {
        setForm((current) => ({ ...current, coverImageUrl: url }));
        toast.success("Đã tải lên và đặt làm ảnh bìa");
      } else {
        editorRef.current?.insertImage(url, form.title);
        toast.success("Đã tải lên và chèn ảnh vào nội dung");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải ảnh lên");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Vui lòng nhập tiêu đề");
    if (!form.slug.trim()) return toast.error("Vui lòng nhập slug đường dẫn");
    if (!form.contentHtml.trim()) return toast.error("Vui lòng nhập nội dung bài viết");
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug),
      type: form.type,
      categoryId: form.categoryId || undefined,
      excerpt: form.excerpt.trim() || undefined,
      contentHtml: sanitizeHtml(form.contentHtml),
      coverImageUrl: form.coverImageUrl.trim() || undefined,
      hashtags: form.hashtagsText
        .split(",")
        .map((item) => item.trim().replace(/^#/, ""))
        .filter(Boolean),
      status: form.status,
      requiresCustomerVerification: form.requiresCustomerVerification,
    };
    try {
      setSaving(true);
      if (id) await WebsiteContentService.update(id, payload);
      else await WebsiteContentService.create(payload);
      toast.success(id ? "Đã cập nhật bài viết" : "Đã tạo bài viết");
      navigate("/website-contents");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu bài viết");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <SoftBox minHeight="60vh" display="flex" alignItems="center" justifyContent="center">
          <CircularProgress />
        </SoftBox>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3} pb={12}>
        <SoftBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
          flexWrap="wrap"
          mb={2}
        >
          <SoftBox display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => navigate("/website-contents")}>
              <Icon>arrow_back</Icon>
            </IconButton>
            <SoftBox>
              <SoftTypography variant="h4" fontWeight="bold">
                {id ? "Biên tập bài viết" : "Tạo bài viết website"}
              </SoftTypography>
              <SoftTypography variant="button" color="text">
                Không gian soạn thảo toàn trang, tương tự trình biên tập sản phẩm website.
              </SoftTypography>
            </SoftBox>
          </SoftBox>
          <SoftBox display="flex" gap={1}>
            <SoftButton
              color="secondary"
              variant="outlined"
              onClick={() => navigate("/website-contents")}
            >
              Hủy
            </SoftButton>
            <SoftButton color="info" variant="gradient" disabled={saving} onClick={save}>
              <Icon>save</Icon>&nbsp;{saving ? "Đang lưu..." : "Lưu bài viết"}
            </SoftButton>
          </SoftBox>
        </SoftBox>

        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} xl={8.5}>
            <Card>
              <SoftBox p={{ xs: 1.5, md: 2.5 }}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Thông tin bài viết
                </SoftTypography>
                <Grid container spacing={1.25} mt={0.25}>
                  <Grid item xs={12}>
                    <SoftTypography variant="caption">Tiêu đề *</SoftTypography>
                    <SoftInput
                      name="title"
                      value={form.title}
                      onChange={(event) => {
                        const title = event.target.value;
                        setForm((current) => ({
                          ...current,
                          title,
                          slug:
                            !current.slug || current.slug === slugify(current.title)
                              ? slugify(title)
                              : current.slug,
                        }));
                      }}
                      placeholder="Nhập tiêu đề bài viết"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <SoftTypography variant="caption">Slug đường dẫn *</SoftTypography>
                    <SoftInput
                      name="slug"
                      value={form.slug}
                      onChange={change}
                      placeholder="duong-dan-bai-viet"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <SoftTypography variant="caption">Mô tả ngắn</SoftTypography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      name="excerpt"
                      value={form.excerpt}
                      onChange={change}
                      placeholder={
                        "Tóm tắt nội dung bài viết...\nĐoạn này được hiển thị trên danh sách bài viết.\nÔ sẽ tự mở rộng khi nhập thêm."
                      }
                      inputProps={{ maxLength: 1000 }}
                      sx={{ "& textarea": { overflow: "hidden" } }}
                    />
                    <SoftTypography variant="caption" color="text">
                      {form.excerpt.length}/1000 ký tự
                    </SoftTypography>
                  </Grid>
                </Grid>
              </SoftBox>
            </Card>

            <Card sx={{ mt: 2 }}>
              <SoftBox p={{ xs: 1.5, md: 3 }}>
                <SoftBox
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                  flexWrap="wrap"
                  mb={1.5}
                >
                  <SoftBox>
                    <SoftTypography variant="h6" fontWeight="bold">
                      Nội dung chi tiết *
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      Soạn chữ đậm, nghiêng, danh sách, liên kết và chèn ảnh ngay giữa nội dung.
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox display="flex" gap={0.5}>
                    <SoftButton
                      size="small"
                      color={!preview ? "info" : "secondary"}
                      variant={!preview ? "gradient" : "outlined"}
                      onClick={() => setPreview(false)}
                    >
                      <Icon>edit</Icon>&nbsp;Soạn thảo
                    </SoftButton>
                    <SoftButton
                      size="small"
                      color={preview ? "info" : "secondary"}
                      variant={preview ? "gradient" : "outlined"}
                      onClick={() => setPreview(true)}
                    >
                      <Icon>visibility</Icon>&nbsp;Xem trước
                    </SoftButton>
                  </SoftBox>
                </SoftBox>
                {preview ? (
                  <SoftBox
                    minHeight={480}
                    p={{ xs: 2, md: 3 }}
                    borderRadius={2}
                    sx={{
                      border: "1px solid #d8dee8",
                      lineHeight: 1.75,
                      "& img": {
                        display: "block",
                        maxWidth: "100%",
                        height: "auto",
                        mx: "auto",
                        borderRadius: 2,
                      },
                      "& figure": { m: "24px 0", textAlign: "center" },
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.contentHtml) }}
                  />
                ) : (
                  <RichTextEditor
                    ref={editorRef}
                    value={form.contentHtml}
                    onChange={(contentHtml) => setForm((current) => ({ ...current, contentHtml }))}
                    minHeight={520}
                  />
                )}
              </SoftBox>
            </Card>
          </Grid>

          <Grid item xs={12} xl={3.5}>
            <Card>
              <SoftBox p={2}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Xuất bản
                </SoftTypography>
                <SoftTypography variant="caption" display="block" mt={1}>
                  Trạng thái
                </SoftTypography>
                <FormControl fullWidth size="small">
                  <Select name="status" value={form.status} onChange={change} sx={{ height: 40 }}>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <SoftTypography variant="caption" display="block" mt={2}>
                  Loại nội dung
                </SoftTypography>
                <FormControl fullWidth size="small">
                  <Select name="type" value={form.type} onChange={change} sx={{ height: 40 }}>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <SoftTypography variant="caption" display="block" mt={2}>
                  Danh mục bài viết
                </SoftTypography>
                <FormControl fullWidth size="small">
                  <Select
                    name="categoryId"
                    value={form.categoryId}
                    onChange={change}
                    displayEmpty
                    sx={{ height: 40 }}
                  >
                    <MenuItem value="">
                      <em>Không thuộc danh mục</em>
                    </MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={idOf(category)} value={idOf(category)}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  sx={{ mt: 1.5, alignItems: "flex-start" }}
                  control={
                    <Checkbox
                      checked={form.requiresCustomerVerification}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          requiresCustomerVerification: event.target.checked,
                        }))
                      }
                    />
                  }
                  label="Yêu cầu khách hàng xác minh trước khi xem"
                />
              </SoftBox>
            </Card>

            <Card sx={{ mt: 2 }}>
              <SoftBox p={2}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Ảnh bìa và ảnh nội dung
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Ảnh tải đầu tiên được đặt làm ảnh bìa. Khi đã có ảnh bìa, ảnh tiếp theo sẽ được
                  chèn tại vị trí con trỏ.
                </SoftTypography>
                <input
                  ref={uploadInputRef}
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadImage}
                />
                <SoftButton
                  fullWidth
                  color="info"
                  variant="outlined"
                  sx={{ mt: 1.5 }}
                  disabled={uploading || preview}
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <Icon>cloud_upload</Icon>&nbsp;
                  {uploading ? "Đang tải ảnh..." : "Tải ảnh từ máy"}
                </SoftButton>
                <SoftBox display="flex" gap={0.75} mt={1} alignItems="stretch">
                  <SoftBox flex={1}>
                    <SoftInput
                      value={imageUrl}
                      onChange={(event) => setImageUrl(event.target.value)}
                      placeholder="Hoặc dán URL ảnh..."
                    />
                  </SoftBox>
                </SoftBox>
                <SoftBox display="flex" gap={0.75} mt={0.75}>
                  <SoftButton
                    size="small"
                    fullWidth
                    color="secondary"
                    variant="outlined"
                    onClick={() => acceptImageUrl(imageUrl, "cover")}
                  >
                    Đặt ảnh bìa
                  </SoftButton>
                  <SoftButton
                    size="small"
                    fullWidth
                    color="info"
                    variant="outlined"
                    disabled={preview}
                    onClick={() => acceptImageUrl(imageUrl, "content")}
                  >
                    Chèn vào bài
                  </SoftButton>
                </SoftBox>
                {form.coverImageUrl ? (
                  <SoftBox mt={1.5}>
                    <SoftBox
                      component="img"
                      src={form.coverImageUrl}
                      alt={form.title || "Ảnh bìa bài viết"}
                      width="100%"
                      height={180}
                      borderRadius={2}
                      sx={{ display: "block", objectFit: "cover" }}
                    />
                    <SoftBox mt={0.75} display="flex" justifyContent="space-between">
                      <SoftTypography variant="caption" color="success" fontWeight="bold">
                        Ảnh bìa hiện tại
                      </SoftTypography>
                      <IconButton
                        size="small"
                        aria-label="Xóa ảnh bìa"
                        onClick={() => setForm((current) => ({ ...current, coverImageUrl: "" }))}
                      >
                        <Icon color="error">delete</Icon>
                      </IconButton>
                    </SoftBox>
                  </SoftBox>
                ) : (
                  <SoftBox py={3} mt={1.5} textAlign="center" bgcolor="#f7f9fc" borderRadius={2}>
                    <Icon sx={{ color: "#aab2bf", fontSize: 38 }}>image</Icon>
                    <SoftTypography variant="caption" color="text" display="block">
                      Chưa có ảnh bìa
                    </SoftTypography>
                  </SoftBox>
                )}
              </SoftBox>
            </Card>

            <Card sx={{ mt: 2 }}>
              <SoftBox p={2}>
                <SoftTypography variant="h6" fontWeight="bold">
                  Hashtag
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Phân cách bằng dấu phẩy, ví dụ: tin mới, kỹ thuật, khuyến mãi
                </SoftTypography>
                <SoftInput
                  name="hashtagsText"
                  value={form.hashtagsText}
                  onChange={change}
                  placeholder="tin mới, kỹ thuật"
                  sx={{ mt: 1 }}
                />
              </SoftBox>
            </Card>
          </Grid>
        </Grid>
      </SoftBox>
    </DashboardLayout>
  );
}
