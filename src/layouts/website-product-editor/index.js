import { useEffect, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
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
import { WebsiteProductService } from "services/websiteAdminService";
import { ProductService } from "services/warehouseService";
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
  code: "",
  name: "",
  slug: "",
  categoryId: "",
  unit: "",
  sellPrice: "",
  shortDescription: "",
  descriptionHtml: "",
  imageUrls: [],
  isActive: true,
  inventoryProduct: null,
};

export default function WebsiteProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const uploadInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [originalInventoryId, setOriginalInventoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [inventoryProducts, setInventoryProducts] = useState([]);
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
        const requests = [
          WebsiteProductService.getCategories(),
          ProductService.getAll({ page: 1, limit: 100 }),
        ];
        if (id) requests.push(WebsiteProductService.getById(id));
        const [categoryResponse, firstInventoryResponse, productResponse] = await Promise.all(requests);
        const totalPages = Number(firstInventoryResponse.data?.meta?.totalPages || 1);
        const remainingResponses = totalPages > 1
          ? await Promise.all(
              Array.from({ length: totalPages - 1 }, (_, index) =>
                ProductService.getAll({ page: index + 2, limit: 100 })
              )
            )
          : [];
        if (!active) return;
        const allInventoryProducts = [
          ...listOf(firstInventoryResponse),
          ...remainingResponses.flatMap(listOf),
        ];
        setCategories(listOf(categoryResponse));
        setInventoryProducts(allInventoryProducts);
        if (productResponse) {
          const product = unwrap(productResponse);
          const linkedId = product.inventoryProductId ? String(product.inventoryProductId) : "";
          setOriginalInventoryId(linkedId);
          setForm({
            ...EMPTY_FORM,
            code: product.code || "",
            name: product.name || "",
            slug: product.slug || "",
            categoryId: product.categoryId ? String(product.categoryId) : "",
            unit: product.unit || "",
            sellPrice: product.sellPrice ?? "",
            shortDescription: product.shortDescription || "",
            descriptionHtml: product.descriptionHtml || "",
            imageUrls: Array.isArray(product.imageUrls) ? product.imageUrls : [],
            isActive: product.isActive !== false,
            inventoryProduct:
              allInventoryProducts.find((item) => String(idOf(item)) === linkedId) || null,
          });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Không thể tải trình biên tập sản phẩm website");
        navigate("/website-products", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id, navigate]);

  const change = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const addImage = (url, insertIntoContent = false) => {
    const normalized = String(url || "").trim();
    if (!/^https?:\/\//i.test(normalized)) {
      toast.error("URL ảnh phải bắt đầu bằng http:// hoặc https://");
      return false;
    }
    setForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.includes(normalized)
        ? current.imageUrls
        : [...current.imageUrls, normalized],
    }));
    if (insertIntoContent) editorRef.current?.insertImage(normalized, form.name);
    return true;
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh không được vượt quá 5 MB");
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      return toast.error("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP");
    try {
      setUploading(true);
      const uploaded = unwrap(await WebsiteProductService.uploadImage(file));
      addImage(uploaded.url);
      toast.success("Đã tải ảnh lên. Bạn có thể đặt làm ảnh chính hoặc chèn vào nội dung.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải ảnh lên");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) return toast.error("Mã và tên hiển thị là bắt buộc");
    const slug = slugify(form.slug || form.name);
    if (!slug) return toast.error("Slug đường dẫn không hợp lệ");
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      slug,
      categoryId: form.categoryId || null,
      unit: form.unit.trim(),
      sellPrice: Math.max(0, Number(form.sellPrice) || 0),
      shortDescription: form.shortDescription.trim(),
      descriptionHtml: sanitizeHtml(form.descriptionHtml).trim(),
      imageUrls: form.imageUrls,
      isActive: Boolean(form.isActive),
    };
    try {
      setSaving(true);
      const response = id
        ? await WebsiteProductService.update(id, payload)
        : await WebsiteProductService.create(payload);
      const savedId = idOf(unwrap(response)) || id;
      const nextInventoryId = idOf(form.inventoryProduct);
      let mappingFailed = false;
      if (savedId && nextInventoryId !== originalInventoryId) {
        try {
          await WebsiteProductService.mapInventory(savedId, nextInventoryId || null);
        } catch (error) {
          mappingFailed = true;
        }
      }
      if (mappingFailed) toast.warning("Đã lưu nội dung nhưng chưa thể cập nhật liên kết hàng hóa kho");
      else toast.success(id ? "Đã cập nhật sản phẩm website" : "Đã tạo sản phẩm website");
      navigate("/website-products");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu sản phẩm website");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout><DashboardNavbar /><SoftBox minHeight="60vh" display="flex" alignItems="center" justifyContent="center"><CircularProgress /></SoftBox></DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3} pb={12}>
        <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={2} flexWrap="wrap" mb={2}>
          <SoftBox display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => navigate("/website-products")}><Icon>arrow_back</Icon></IconButton>
            <SoftBox>
              <SoftTypography variant="h4" fontWeight="bold">{id ? "Biên tập sản phẩm website" : "Tạo sản phẩm website"}</SoftTypography>
              <SoftTypography variant="button" color="text">Không gian soạn thảo toàn trang — dữ liệu kho không bị thay đổi.</SoftTypography>
            </SoftBox>
          </SoftBox>
          <SoftBox display="flex" gap={1}>
            <SoftButton color="secondary" variant="outlined" onClick={() => navigate("/website-products")}>Hủy</SoftButton>
            <SoftButton color="info" variant="gradient" disabled={saving} onClick={save}><Icon>save</Icon>&nbsp;{saving ? "Đang lưu..." : "Lưu sản phẩm"}</SoftButton>
          </SoftBox>
        </SoftBox>

        <Grid container spacing={2} alignItems="flex-start">
          <Grid item xs={12} xl={8.5} sx={{ alignSelf: "flex-start" }}>
            <Card sx={{ height: "auto !important", alignSelf: "flex-start" }}>
              <SoftBox p={{ xs: 1.25, md: 2 }}>
                <SoftTypography variant="h6" fontWeight="bold">Thông tin hiển thị</SoftTypography>
                <Grid container spacing={1} mt={0.25}>
                  <Grid item xs={12} sm={4}><SoftTypography variant="caption">Mã sản phẩm *</SoftTypography><SoftInput name="code" value={form.code} onChange={change} /></Grid>
                  <Grid item xs={12} sm={8}><SoftTypography variant="caption">Tên hiển thị *</SoftTypography><SoftInput name="name" value={form.name} onChange={(event) => { const name = event.target.value; setForm((current) => ({ ...current, name, slug: current.slug === slugify(current.name) ? slugify(name) : current.slug })); }} /></Grid>
                  <Grid item xs={12} sm={8}><SoftTypography variant="caption">Slug đường dẫn *</SoftTypography><SoftInput name="slug" value={form.slug} onChange={change} placeholder="tu-tao-tu-ten-san-pham" /></Grid>
                  <Grid item xs={6} sm={2}><SoftTypography variant="caption">Đơn vị</SoftTypography><SoftInput name="unit" value={form.unit} onChange={change} /></Grid>
                  <Grid item xs={6} sm={2}><SoftTypography variant="caption">Giá website</SoftTypography><SoftInput name="sellPrice" type="number" value={form.sellPrice} onChange={change} /></Grid>
                  <Grid item xs={12}><SoftTypography variant="caption">Mô tả ngắn</SoftTypography><TextField fullWidth multiline minRows={3} name="shortDescription" value={form.shortDescription} onChange={change} placeholder={"Nhập mô tả ngắn...\nBạn có thể xuống dòng tự nhiên.\nÔ sẽ tự mở rộng khi nội dung dài hơn."} inputProps={{ maxLength: 1000 }} sx={{ "& textarea": { overflow: "hidden" } }} /><SoftTypography variant="caption" color="text">{form.shortDescription.length}/1000 ký tự</SoftTypography></Grid>
                </Grid>
              </SoftBox>
            </Card>

            <Card sx={{ mt: 2 }}>
              <SoftBox p={{ xs: 1.5, md: 3 }}>
                <SoftBox display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap" mb={1.5}>
                  <SoftBox><SoftTypography variant="h6" fontWeight="bold">Nội dung chi tiết</SoftTypography><SoftTypography variant="caption" color="text">Định dạng văn bản và chèn ảnh trực tiếp tại vị trí con trỏ.</SoftTypography></SoftBox>
                  <SoftBox display="flex" gap={0.5}><SoftButton size="small" color={!preview ? "info" : "secondary"} variant={!preview ? "gradient" : "outlined"} onClick={() => setPreview(false)}><Icon>edit</Icon>&nbsp;Soạn thảo</SoftButton><SoftButton size="small" color={preview ? "info" : "secondary"} variant={preview ? "gradient" : "outlined"} onClick={() => setPreview(true)}><Icon>visibility</Icon>&nbsp;Xem trước</SoftButton></SoftBox>
                </SoftBox>
                {preview ? (
                  <SoftBox minHeight={480} p={{ xs: 2, md: 3 }} borderRadius={2} sx={{ border: "1px solid #d8dee8", lineHeight: 1.75, "& img": { display: "block", maxWidth: "100%", height: "auto", mx: "auto", borderRadius: 2 }, "& figure": { m: "24px 0", textAlign: "center" } }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.descriptionHtml) }} />
                ) : (
                  <RichTextEditor ref={editorRef} value={form.descriptionHtml} onChange={(descriptionHtml) => setForm((current) => ({ ...current, descriptionHtml }))} minHeight={520} />
                )}
              </SoftBox>
            </Card>
          </Grid>

          <Grid item xs={12} xl={3.5} sx={{ alignSelf: "flex-start" }}>
            <Card>
              <SoftBox p={2}>
                <SoftTypography variant="h6" fontWeight="bold">Xuất bản</SoftTypography>
                <SoftButton fullWidth sx={{ mt: 1 }} color={form.isActive ? "success" : "secondary"} variant="outlined" onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}><Icon>{form.isActive ? "visibility" : "visibility_off"}</Icon>&nbsp;{form.isActive ? "Đang hiển thị" : "Đang ẩn"}</SoftButton>
                <SoftTypography variant="caption" color="text" display="block" mt={1}>{form.isActive ? "Khách hàng có thể thấy sản phẩm sau khi lưu." : "Sản phẩm được lưu nhưng không xuất hiện ngoài website."}</SoftTypography>
                <SoftTypography variant="caption" display="block" mt={2}>Danh mục website</SoftTypography>
                <FormControl fullWidth size="small"><Select name="categoryId" value={form.categoryId} onChange={change} displayEmpty sx={{ height: 40 }}><MenuItem value=""><em>Không thuộc danh mục</em></MenuItem>{categories.map((category) => <MenuItem key={idOf(category)} value={idOf(category)}>{category.name}</MenuItem>)}</Select></FormControl>
              </SoftBox>
            </Card>

            <Card sx={{ mt: 2 }}>
              <SoftBox p={2}>
                <SoftTypography variant="h6" fontWeight="bold">Hình ảnh</SoftTypography>
                <SoftTypography variant="caption" color="text">Ảnh đầu tiên là ảnh đại diện. Chèn bất kỳ ảnh nào vào đúng vị trí con trỏ trong bài.</SoftTypography>
                <input ref={uploadInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} />
                <SoftButton fullWidth color="info" variant="outlined" sx={{ mt: 1.5 }} disabled={uploading} onClick={() => uploadInputRef.current?.click()}><Icon>cloud_upload</Icon>&nbsp;{uploading ? "Đang tải ảnh..." : "Tải ảnh từ máy"}</SoftButton>
                <SoftBox display="flex" gap={0.75} mt={1} alignItems="stretch"><SoftBox flex={1}><SoftInput value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Hoặc dán URL ảnh..." /></SoftBox><SoftButton color="secondary" variant="outlined" onClick={() => { if (addImage(imageUrl)) setImageUrl(""); }}>Thêm</SoftButton></SoftBox>
                <SoftBox mt={1.5} display="flex" flexDirection="column" gap={1}>
                  {form.imageUrls.map((url, index) => (
                    <SoftBox key={url} p={1} borderRadius={2} sx={{ border: "1px solid #e0e5ec" }}>
                      <SoftBox component="img" src={url} alt={`Ảnh ${index + 1} của ${form.name || "sản phẩm"}`} width="100%" height={150} borderRadius={1.5} sx={{ display: "block", objectFit: "cover" }} />
                      <SoftBox mt={0.75} display="flex" gap={0.5} flexWrap="wrap">
                        {index === 0 ? <SoftTypography variant="caption" color="success" fontWeight="bold">Ảnh đại diện</SoftTypography> : <SoftButton size="small" variant="text" color="success" onClick={() => setForm((current) => ({ ...current, imageUrls: [url, ...current.imageUrls.filter((item) => item !== url)] }))}>Đặt làm ảnh chính</SoftButton>}
                        <SoftButton size="small" variant="text" color="info" disabled={preview} onClick={() => editorRef.current?.insertImage(url, form.name)}>Chèn vào bài</SoftButton>
                        <IconButton size="small" aria-label="Xóa ảnh" onClick={() => setForm((current) => ({ ...current, imageUrls: current.imageUrls.filter((item) => item !== url) }))}><Icon color="error">delete</Icon></IconButton>
                      </SoftBox>
                    </SoftBox>
                  ))}
                  {!form.imageUrls.length && <SoftBox py={3} textAlign="center" bgcolor="#f7f9fc" borderRadius={2}><Icon sx={{ color: "#aab2bf", fontSize: 38 }}>image</Icon><SoftTypography variant="caption" color="text" display="block">Chưa có hình ảnh</SoftTypography></SoftBox>}
                </SoftBox>
              </SoftBox>
            </Card>

            <Card sx={{ mt: 2 }}>
              <SoftBox p={2}>
                <SoftTypography variant="h6" fontWeight="bold">Liên kết bán hàng</SoftTypography>
                <SoftTypography variant="caption" color="text">Chỉ dùng khi chuyển đơn website thành hóa đơn, không đồng bộ tên, giá hoặc tồn kho.</SoftTypography>
                <Autocomplete sx={{ mt: 1.5 }} options={inventoryProducts} value={form.inventoryProduct} onChange={(_, value) => setForm((current) => ({ ...current, inventoryProduct: value }))} getOptionLabel={(item) => `${item.code || ""} · ${item.name || ""}`} isOptionEqualToValue={(option, value) => idOf(option) === idOf(value)} renderInput={(params) => <TextField {...params} placeholder="Không liên kết hàng hóa" />} />
              </SoftBox>
            </Card>
          </Grid>
        </Grid>
      </SoftBox>
    </DashboardLayout>
  );
}
