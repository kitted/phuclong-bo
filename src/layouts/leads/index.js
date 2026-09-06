import { useCallback, useEffect, useRef, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { LeadService } from "services/crmService";
import { toast } from "react-toastify";

const empty = {
  name: "",
  phone: "",
  contactName: "",
  businessType: "",
  note: "",
  imageUrl: "",
  color: "#5e72e4",
  latitude: "",
  longitude: "",
  address: "",
};
const LEAD_COLORS = [
  { value: "#5e72e4", label: "Tím" },
  { value: "#2dce89", label: "Xanh lá" },
  { value: "#11cdef", label: "Xanh dương" },
  { value: "#fb6340", label: "Cam" },
  { value: "#f5365c", label: "Đỏ" },
  { value: "#8965e0", label: "Tím đậm" },
];
const idOf = (item) => item?.id || item?._id;
const unwrap = (response) => response?.data?.data ?? response?.data;
const listOf = (response) => {
  const data = unwrap(response);
  return Array.isArray(data) ? data : data?.items || data?.docs || [];
};
function MapCenter({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  return null;
}
function MapPicker({ lat, lon, onPick }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
  return (
    <>
      <MapCenter lat={lat} lon={lon} />
      <CircleMarker
        center={[lat, lon]}
        radius={11}
        pathOptions={{ color: "#fff", weight: 4, fillColor: "#1877f2", fillOpacity: 1 }}
      />
    </>
  );
}

export function LeadModal({ open, lead, onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const imageInput = useRef(null);
  useEffect(() => {
    if (open) {
      setForm(
        lead
          ? {
              name: lead.name || "",
              phone: lead.phone || "",
              contactName: lead.contactName || "",
              businessType: lead.businessType || "",
              note: lead.note || "",
              imageUrl: lead.imageUrl || "",
              color: lead.color || "#5e72e4",
              latitude: lead.location?.latitude ?? "",
              longitude: lead.location?.longitude ?? "",
              address: lead.location?.address || "",
            }
          : { ...empty, latitude: 10.0452, longitude: 105.7469 }
      );
      setImageFile(null);
    }
  }, [open, lead]);
  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));
  const save = async () => {
    if (!form.name.trim() || !form.phone.trim())
      return toast.error("Nhập tên và số điện thoại lead");
    if (form.latitude === "" || form.longitude === "")
      return toast.error("Chọn hoặc nhập vị trí của lead");
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      contactName: form.contactName.trim() || undefined,
      businessType: form.businessType.trim() || undefined,
      note: form.note.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      color: form.color,
      location: {
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        address: form.address.trim() || undefined,
      },
    };
    if (!Number.isFinite(payload.location.latitude) || !Number.isFinite(payload.location.longitude))
      return toast.error("Tọa độ không hợp lệ");
    try {
      setSaving(true);
      const response = lead
        ? await LeadService.update(idOf(lead), payload)
        : await LeadService.create(payload);
      const saved = unwrap(response);
      if (imageFile) await LeadService.uploadImage(idOf(saved), imageFile);
      toast.success(lead ? "Đã cập nhật lead" : "Đã thêm lead");
      onSaved(saved);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể lưu lead");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={() => !saving && onClose()}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "100%", md: 620 },
          height: { xs: "100dvh", md: "auto" },
          maxHeight: { xs: "100dvh", md: "92dvh" },
          overflowY: "auto",
          bgcolor: "#fff",
          borderRadius: { xs: 0, md: 3 },
          boxShadow: 24,
          p: { xs: 2, md: 3 },
        }}
      >
        <SoftBox display="flex" justifyContent="space-between" alignItems="center">
          <SoftTypography variant="h5" fontWeight="bold">
            {lead ? "Cập nhật lead" : "Thêm lead mới"}
          </SoftTypography>
          <IconButton onClick={onClose}>
            <Icon>close</Icon>
          </IconButton>
        </SoftBox>
        <Grid container spacing={1.5} mt={0.25}>
          <Grid item xs={12} md={7}>
            <SoftTypography variant="caption" fontWeight="bold">
              Tên lead *
            </SoftTypography>
            <SoftInput
              value={form.name}
              onChange={set("name")}
              placeholder="Tên cửa hàng hoặc người liên hệ"
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <SoftTypography variant="caption" fontWeight="bold">
              Số điện thoại *
            </SoftTypography>
            <SoftInput value={form.phone} onChange={set("phone")} placeholder="090..." />
          </Grid>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption" fontWeight="bold">
              Người liên hệ
            </SoftTypography>
            <SoftInput
              value={form.contactName}
              onChange={set("contactName")}
              placeholder="Tên người có thể liên hệ"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <SoftTypography variant="caption" fontWeight="bold">
              Loại hình / nhu cầu
            </SoftTypography>
            <SoftInput
              value={form.businessType}
              onChange={set("businessType")}
              placeholder="VD: Cửa hàng phụ tùng"
            />
          </Grid>
          <Grid item xs={12}>
            <SoftTypography variant="caption" fontWeight="bold">
              Ảnh điểm bán
            </SoftTypography>
            <SoftBox display="flex" alignItems="center" gap={1} mt={0.5}>
              {(imageFile || form.imageUrl) && (
                <Avatar
                  variant="rounded"
                  src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl}
                  sx={{ width: 54, height: 54 }}
                />
              )}
              <input
                ref={imageInput}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              />
              <SoftButton
                size="small"
                variant="outlined"
                color="info"
                onClick={() => imageInput.current?.click()}
              >
                <Icon>photo_camera</Icon>&nbsp;Chụp / chọn ảnh
              </SoftButton>
            </SoftBox>
          </Grid>
          <Grid item xs={12}>
            <SoftBox height={300} borderRadius={2} overflow="hidden">
              <MapContainer
                center={[Number(form.latitude) || 10.0452, Number(form.longitude) || 105.7469]}
                zoom={16}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapPicker
                  lat={Number(form.latitude) || 10.0452}
                  lon={Number(form.longitude) || 105.7469}
                  onPick={(latitude, longitude) =>
                    setForm((value) => ({
                      ...value,
                      latitude: latitude.toFixed(7),
                      longitude: longitude.toFixed(7),
                    }))
                  }
                />
              </MapContainer>
            </SoftBox>
            <SoftButton
              size="small"
              color="info"
              variant="text"
              onClick={() =>
                navigator.geolocation?.getCurrentPosition(
                  (position) =>
                    setForm((value) => ({
                      ...value,
                      latitude: position.coords.latitude.toFixed(7),
                      longitude: position.coords.longitude.toFixed(7),
                    })),
                  () => toast.error("Không thể lấy vị trí hiện tại"),
                  { enableHighAccuracy: true }
                )
              }
            >
              <Icon>my_location</Icon>&nbsp;Lấy vị trí hiện tại
            </SoftButton>
          </Grid>
          <Grid item xs={12}>
            <SoftTypography variant="caption" fontWeight="bold">
              Địa chỉ / ghi chú vị trí
            </SoftTypography>
            <SoftInput
              value={form.address}
              onChange={set("address")}
              placeholder="Số nhà, đường, phường..."
            />
          </Grid>
          <Grid item xs={12}>
            <SoftTypography variant="caption" fontWeight="bold">
              Ghi chú lead
            </SoftTypography>
            <SoftInput
              multiline
              rows={3}
              value={form.note}
              onChange={set("note")}
              placeholder="Nhu cầu, thời gian phù hợp để ghé, thông tin cần lưu ý..."
            />
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" fontWeight="bold">
              Vĩ độ *
            </SoftTypography>
            <SoftInput type="number" value={form.latitude} onChange={set("latitude")} />
          </Grid>
          <Grid item xs={6}>
            <SoftTypography variant="caption" fontWeight="bold">
              Kinh độ *
            </SoftTypography>
            <SoftInput type="number" value={form.longitude} onChange={set("longitude")} />
          </Grid>
          <Grid item xs={12}>
            <SoftTypography variant="caption" fontWeight="bold">
              Màu phân loại
            </SoftTypography>
            <SoftBox display="flex" flexWrap="wrap" gap={0.75} mt={0.75}>
              {LEAD_COLORS.map((item) => (
                <SoftBox
                  key={item.value}
                  component="button"
                  type="button"
                  onClick={() => setForm((value) => ({ ...value, color: item.value }))}
                  display="flex"
                  alignItems="center"
                  gap={0.5}
                  px={1}
                  py={0.65}
                  borderRadius={2}
                  sx={{
                    border:
                      form.color === item.value ? `2px solid ${item.value}` : "1px solid #e1e6ee",
                    bgcolor: form.color === item.value ? "#f6f8ff" : "#fff",
                    cursor: "pointer",
                  }}
                >
                  <SoftBox
                    width={18}
                    height={18}
                    borderRadius="50%"
                    sx={{
                      bgcolor: item.value,
                      border: "2px solid #fff",
                      boxShadow: "0 1px 4px #0005",
                    }}
                  />
                  <SoftTypography
                    variant="caption"
                    fontWeight={form.color === item.value ? "bold" : "regular"}
                  >
                    {item.label}
                  </SoftTypography>
                </SoftBox>
              ))}
            </SoftBox>
            <SoftBox
              mt={1}
              p={1}
              borderRadius={2}
              sx={{ bgcolor: `${form.color}18`, borderLeft: `5px solid ${form.color}` }}
            >
              <SoftTypography variant="caption" fontWeight="bold" sx={{ color: form.color }}>
                Xem trước: Lead sẽ hiển thị với màu này trên danh sách và bản đồ sale.
              </SoftTypography>
            </SoftBox>
          </Grid>
        </Grid>
        <SoftBox display="flex" gap={1} mt={2}>
          <SoftButton fullWidth color="secondary" variant="outlined" onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton fullWidth color="info" variant="gradient" disabled={saving} onClick={save}>
            {saving ? "Đang lưu..." : "Lưu lead"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailLead, setDetailLead] = useState(null);
  const load = useCallback(async () => {
    try {
      setLeads(
        listOf(
          await LeadService.getAll({ search: search.trim() || undefined, page: 1, limit: 100 })
        )
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tải lead");
    }
  }, [search]);
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);
  const remove = async (lead) => {
    if (!window.confirm(`Xóa lead “${lead.name}”?`)) return;
    try {
      await LeadService.remove(idOf(lead));
      toast.success("Đã xóa lead");
      load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể xóa lead");
    }
  };
  const saved = () => {
    setModalOpen(false);
    setEditing(null);
    load();
  };
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox bgcolor="#fff" borderRadius={3} p={{ xs: 1.5, md: 3 }}>
          <SoftBox
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={1}
            flexWrap="wrap"
          >
            <SoftBox>
              <SoftTypography variant="h4" fontWeight="bold">
                Quản lý Lead
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                Lead do admin hoặc nhân viên tạo; admin quản trị và sale cùng theo dõi, tương tác.
              </SoftTypography>
            </SoftBox>
            <SoftButton
              color="info"
              variant="gradient"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Icon>person_add</Icon>&nbsp;Thêm lead
            </SoftButton>
          </SoftBox>
          <SoftBox mt={2}>
            <SoftInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên, số điện thoại hoặc địa chỉ..."
              icon={{ component: "search", direction: "left" }}
            />
          </SoftBox>
          <Grid container spacing={1.5} mt={0.25}>
            {leads.map((lead) => (
              <Grid item xs={12} md={6} xl={4} key={idOf(lead)}>
                <SoftBox
                  p={1.75}
                  borderRadius={2.5}
                  sx={{
                    border: "1px solid #e1e6ee",
                    borderLeft: `6px solid ${lead.color || "#5e72e4"}`,
                  }}
                >
                  <SoftBox display="flex" gap={1} alignItems="center">
                    <Avatar src={lead.imageUrl} sx={{ bgcolor: lead.color || "#5e72e4" }}>
                      {String(lead.name || "L").slice(0, 1)}
                    </Avatar>
                    <SoftBox flex={1} minWidth={0}>
                      <SoftTypography variant="button" fontWeight="bold">
                        {lead.name}
                      </SoftTypography>
                      <SoftTypography display="block" variant="caption" color="text">
                        {lead.phone}
                      </SoftTypography>
                    </SoftBox>
                    <IconButton
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing(lead);
                        setModalOpen(true);
                      }}
                    >
                      <Icon>edit</Icon>
                    </IconButton>
                    <IconButton
                      onClick={(event) => {
                        event.stopPropagation();
                        remove(lead);
                      }}
                    >
                      <Icon color="error">delete</Icon>
                    </IconButton>
                  </SoftBox>
                  <SoftTypography display="block" variant="caption" color="text" mt={1}>
                    {lead.location?.address ||
                      `${lead.location?.latitude}, ${lead.location?.longitude}`}
                  </SoftTypography>
                  <SoftTypography display="block" variant="caption" color="text" mt={0.5}>
                    Tạo bởi: {lead.createdByName || "Admin"}
                    {lead.createdByCode ? ` · ${lead.createdByCode}` : ""}
                  </SoftTypography>
                  <SoftTypography
                    display="block"
                    variant="caption"
                    mt={0.5}
                    color={lead.converted ? "success" : "info"}
                  >
                    {lead.converted
                      ? "Đã chuyển thành khách hàng"
                      : `${lead.interactions?.length || 0} lần tương tác`}
                  </SoftTypography>
                  <SoftButton
                    size="small"
                    variant="text"
                    color="info"
                    onClick={() => setDetailLead(lead)}
                  >
                    Xem hồ sơ & lịch sử
                  </SoftButton>
                </SoftBox>
              </Grid>
            ))}
          </Grid>
          {!leads.length && (
            <SoftBox py={5} textAlign="center">
              <SoftTypography color="text">Chưa có lead. Hãy thêm lead đầu tiên.</SoftTypography>
            </SoftBox>
          )}
        </SoftBox>
      </SoftBox>
      <LeadModal
        open={modalOpen}
        lead={editing}
        onClose={() => setModalOpen(false)}
        onSaved={saved}
      />
      <Modal open={Boolean(detailLead)} onClose={() => setDetailLead(null)}>
        <SoftBox
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "94%", md: 560 },
            maxHeight: "85dvh",
            overflowY: "auto",
            bgcolor: "#fff",
            borderRadius: 3,
            p: 3,
          }}
        >
          <SoftBox display="flex" justifyContent="space-between">
            <SoftTypography variant="h5" fontWeight="bold">
              {detailLead?.name}
            </SoftTypography>
            <IconButton onClick={() => setDetailLead(null)}>
              <Icon>close</Icon>
            </IconButton>
          </SoftBox>
          <SoftTypography variant="button">{detailLead?.phone}</SoftTypography>
          <SoftTypography display="block" variant="caption" color="text">
            {detailLead?.location?.address || "Chưa có địa chỉ"}
          </SoftTypography>
          <SoftTypography display="block" variant="caption" color="text" mt={0.75}>
            Tạo bởi: {detailLead?.createdByName || "Admin"}
            {detailLead?.createdByCode ? ` · ${detailLead.createdByCode}` : ""}
          </SoftTypography>
          {detailLead?.contactName && (
            <SoftTypography display="block" variant="caption" color="text">
              Người liên hệ: {detailLead.contactName}
            </SoftTypography>
          )}
          {detailLead?.businessType && (
            <SoftTypography display="block" variant="caption" color="text">
              Loại hình / nhu cầu: {detailLead.businessType}
            </SoftTypography>
          )}
          {detailLead?.note && (
            <SoftTypography display="block" variant="body2" mt={1}>
              {detailLead.note}
            </SoftTypography>
          )}
          <SoftTypography display="block" variant="button" fontWeight="bold" mt={2}>
            Lịch sử tương tác
          </SoftTypography>
          {detailLead?.interactions?.length ? (
            detailLead.interactions
              .slice()
              .reverse()
              .map((item, index) => (
                <SoftBox key={item._id || index} py={1} sx={{ borderBottom: "1px solid #edf0f5" }}>
                  <SoftTypography variant="caption" fontWeight="bold">
                    Người tương tác: {item.salespersonName || "Nhân viên"}
                    {item.salespersonCode ? ` · ${item.salespersonCode}` : ""}
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text" display="block">
                    {new Date(item.interactedAt).toLocaleString("vi-VN")}
                  </SoftTypography>
                  <SoftTypography variant="body2" display="block">
                    {item.note}
                  </SoftTypography>
                </SoftBox>
              ))
          ) : (
            <SoftTypography variant="caption" color="text">
              Chưa có tương tác.
            </SoftTypography>
          )}
          <SoftBox display="flex" gap={1} mt={2}>
            <SoftButton
              fullWidth
              color="info"
              variant="outlined"
              onClick={() => {
                setEditing(detailLead);
                setDetailLead(null);
                setModalOpen(true);
              }}
            >
              Sửa thông tin
            </SoftButton>
            <SoftButton
              fullWidth
              color="error"
              variant="outlined"
              onClick={() => {
                remove(detailLead);
                setDetailLead(null);
              }}
            >
              Xóa lead
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </Modal>
    </DashboardLayout>
  );
}
