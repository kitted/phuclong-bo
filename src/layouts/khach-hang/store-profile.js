import { useEffect, useRef, useState } from "react";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftInput from "components/SoftInput";
import SoftTypography from "components/SoftTypography";
import { CustomerService } from "services/crmService";
import { toast } from "react-toastify";

const DEFAULT_LOCATION = { latitude: 10.0452, longitude: 105.7469 };
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const numberOrNull = (value) => {
  if (value === "" || value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const storeData = (customer = {}) => {
  const location = customer.storeLocation || customer.location || {};
  const image = customer.storefrontImage || customer.storeImage || {};
  const latitude = numberOrNull(
    location.latitude ?? location.lat ?? customer.storeLatitude ?? customer.latitude
  );
  const longitude = numberOrNull(
    location.longitude ??
      location.lng ??
      location.lon ??
      customer.storeLongitude ??
      customer.longitude
  );
  return {
    latitude,
    longitude,
    accuracy: numberOrNull(location.accuracy ?? customer.storeLocationAccuracy),
    source: location.source || (location.accuracy ? "GPS" : "MAP"),
    note: location.note || customer.storeLocationNote || "",
    imageUrl:
      image.secureUrl ||
      image.secure_url ||
      image.url ||
      customer.storefrontImageUrl ||
      customer.storeImageUrl ||
      "",
    imagePublicId: image.publicId || image.public_id || customer.storefrontImagePublicId || "",
    capturedAt: location.capturedAt || location.updatedAt,
    uploadedAt: image.uploadedAt || image.createdAt,
  };
};

function MapViewport({ latitude, longitude }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), { animate: true });
  }, [latitude, longitude, map]);
  return null;
}

function MapClickHandler({ disabled, onSelect }) {
  useMapEvents({
    click(event) {
      if (!disabled) onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function StoreMap({ latitude, longitude, readOnly, customerName, onSelect }) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={17}
      scrollWheelZoom={!readOnly}
      style={{ width: "100%", height: "100%", minHeight: 310 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport latitude={latitude} longitude={longitude} />
      <MapClickHandler disabled={readOnly} onSelect={onSelect} />
      <CircleMarker
        center={[latitude, longitude]}
        radius={11}
        pathOptions={{ color: "#fff", weight: 4, fillColor: "#1877f2", fillOpacity: 1 }}
      >
        <Popup>
          <strong>{customerName || "Cửa tiệm khách hàng"}</strong>
          <br />
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Popup>
      </CircleMarker>
    </MapContainer>
  );
}

export default function CustomerStoreProfile({ customer, readOnly = false, onSaved }) {
  const isMobile = useMediaQuery("(max-width:899.95px)");
  const canEdit = !readOnly || isMobile;
  const inputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [form, setForm] = useState({
    latitude: "",
    longitude: "",
    accuracy: null,
    source: "MAP",
    note: "",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [savedImageUrl, setSavedImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [reviewFile, setReviewFile] = useState(null);
  const [reviewUrl, setReviewUrl] = useState("");
  const [reviewSource, setReviewSource] = useState("");
  const [reviewZoomed, setReviewZoomed] = useState(false);
  const [viewerUrl, setViewerUrl] = useState("");
  const [viewerZoomed, setViewerZoomed] = useState(false);
  const [draggingImage, setDraggingImage] = useState(false);
  const [demoLocation, setDemoLocation] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [deletingLocation, setDeletingLocation] = useState(false);

  useEffect(() => {
    const data = storeData(customer);
    const hasLocation = data.latitude !== null && data.longitude !== null;
    setForm({
      latitude: hasLocation ? data.latitude : DEFAULT_LOCATION.latitude,
      longitude: hasLocation ? data.longitude : DEFAULT_LOCATION.longitude,
      accuracy: data.accuracy,
      source: data.source,
      note: data.note,
    });
    setImageUrl(data.imageUrl);
    setSavedImageUrl(data.imageUrl);
    setImageFile(null);
    setReviewFile(null);
    setReviewUrl("");
    setReviewSource("");
    setReviewZoomed(false);
    setViewerUrl("");
    setViewerZoomed(false);
    setDraggingImage(false);
    setDemoLocation(!hasLocation);
  }, [customer]);

  useEffect(
    () => () => {
      if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl]
  );

  useEffect(
    () => () => {
      if (reviewUrl?.startsWith("blob:")) URL.revokeObjectURL(reviewUrl);
    },
    [reviewUrl]
  );

  const latitude = numberOrNull(form.latitude);
  const longitude = numberOrNull(form.longitude);
  const validCoordinates =
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
  const mapLocation = validCoordinates ? { latitude, longitude } : DEFAULT_LOCATION;

  const selectLocation = (nextLatitude, nextLongitude, accuracy = null) => {
    setForm((current) => ({
      ...current,
      latitude: Number(nextLatitude.toFixed(7)),
      longitude: Number(nextLongitude.toFixed(7)),
      accuracy: accuracy === null ? null : Math.round(accuracy),
      source: accuracy === null ? "MAP" : "GPS",
    }));
    setDemoLocation(false);
  };

  const requestCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Thiết bị không hỗ trợ lấy vị trí"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      });
    });

  const getCurrentLocation = async () => {
    setLocating(true);
    try {
      const position = await requestCurrentLocation();
      selectLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      toast.success("Đã lấy vị trí hiện tại");
    } catch (error) {
      toast.error(
        error.code === 1
          ? "Bạn chưa cấp quyền truy cập vị trí cho trình duyệt"
          : error.message || "Không thể lấy vị trí hiện tại"
      );
    } finally {
      setLocating(false);
    }
  };

  const queueImageForReview = (file, source = "LIBRARY") => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Ảnh bảng hiệu không được vượt quá 5 MB");
      return;
    }
    setReviewFile(file);
    setReviewUrl(URL.createObjectURL(file));
    setReviewSource(source);
    setReviewZoomed(false);
  };

  const reviewImage = (event, source = "LIBRARY") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    queueImageForReview(file, source);
  };

  const dropImage = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingImage(false);
    const file = Array.from(event.dataTransfer?.files || []).find((item) =>
      item.type.startsWith("image/")
    );
    if (!file) {
      toast.error("Vui lòng thả một file ảnh JPG, PNG hoặc WebP");
      return;
    }
    queueImageForReview(file, "LIBRARY");
  };

  const cancelReview = () => {
    setReviewFile(null);
    setReviewUrl("");
    setReviewSource("");
    setReviewZoomed(false);
  };

  const useReviewedImage = async () => {
    if (!reviewFile) return;
    if (reviewSource === "CAMERA") {
      try {
        setUploadingImage(true);
        let position = null;
        let locationError = null;
        try {
          position = await requestCurrentLocation();
        } catch (error) {
          locationError = error;
        }

        const response = await CustomerService.uploadStorefrontImage(
          customer.id || customer._id,
          reviewFile
        );
        const uploadedCustomer = response.data?.data || response.data || {};
        const uploadedImage = uploadedCustomer.storefrontImage || {};
        const uploadedUrl =
          uploadedImage.url || uploadedImage.secureUrl || uploadedImage.secure_url || reviewUrl;
        setSavedImageUrl(uploadedUrl);
        setImageUrl(uploadedUrl);
        setImageFile(null);

        if (position) {
          const nextLatitude = Number(position.coords.latitude.toFixed(7));
          const nextLongitude = Number(position.coords.longitude.toFixed(7));
          const nextAccuracy = Math.round(position.coords.accuracy || 0);
          try {
            await CustomerService.updateStoreProfile(customer.id || customer._id, {
              latitude: nextLatitude,
              longitude: nextLongitude,
              accuracy: nextAccuracy || undefined,
              note: form.note.trim() || undefined,
              source: "GPS",
              capturedAt: new Date().toISOString(),
            });
            selectLocation(nextLatitude, nextLongitude, nextAccuracy);
            toast.success("Đã lưu ảnh và tự động cập nhật vị trí cửa tiệm");
          } catch (error) {
            toast.warning(
              error.response?.data?.message || "Đã lưu ảnh nhưng chưa cập nhật được vị trí cửa tiệm"
            );
          }
        } else {
          toast.warning(
            locationError?.code === 1
              ? "Đã lưu ảnh nhưng trình duyệt chưa được cấp quyền vị trí"
              : `Đã lưu ảnh nhưng chưa cập nhật được GPS${
                  locationError?.message ? `: ${locationError.message}` : ""
                }`
          );
        }
        cancelReview();
        await onSaved?.();
      } catch (error) {
        toast.error(error.response?.data?.message || "Không thể lưu ảnh và vị trí cửa tiệm");
      } finally {
        setUploadingImage(false);
      }
      return;
    }
    if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    setImageFile(reviewFile);
    setImageUrl(URL.createObjectURL(reviewFile));
    cancelReview();
  };

  const retakeImage = () => {
    cancelReview();
    window.setTimeout(() => cameraInputRef.current?.click(), 0);
  };

  const uploadSelectedImage = async () => {
    if (!imageFile) return;
    try {
      setUploadingImage(true);
      const response = await CustomerService.uploadStorefrontImage(
        customer.id || customer._id,
        imageFile
      );
      const uploadedCustomer = response.data?.data || response.data || {};
      const uploadedImage = uploadedCustomer.storefrontImage || {};
      const uploadedUrl =
        uploadedImage.url || uploadedImage.secureUrl || uploadedImage.secure_url || imageUrl;
      setSavedImageUrl(uploadedUrl);
      setImageUrl(uploadedUrl);
      setImageFile(null);
      toast.success("Đã tải ảnh bảng hiệu lên");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải ảnh bảng hiệu lên");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async () => {
    if (imageFile) {
      if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
      setImageFile(null);
      setImageUrl(savedImageUrl);
      toast.info("Đã bỏ ảnh vừa chọn");
      return;
    }
    if (!savedImageUrl) return;
    if (!window.confirm("Xóa ảnh bảng hiệu đang lưu của khách hàng?")) return;
    try {
      setDeletingImage(true);
      await CustomerService.deleteStorefrontImage(customer.id || customer._id);
      setSavedImageUrl("");
      setImageUrl("");
      toast.success("Đã xóa ảnh bảng hiệu");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa ảnh bảng hiệu");
    } finally {
      setDeletingImage(false);
    }
  };

  const removeLocation = async () => {
    if (demoLocation) return;
    if (!window.confirm("Xóa tọa độ cửa tiệm đang lưu của khách hàng?")) return;
    try {
      setDeletingLocation(true);
      await CustomerService.deleteStoreProfile(customer.id || customer._id);
      setForm({
        latitude: DEFAULT_LOCATION.latitude,
        longitude: DEFAULT_LOCATION.longitude,
        accuracy: null,
        source: "MAP",
        note: "",
      });
      setDemoLocation(true);
      toast.success("Đã xóa vị trí cửa tiệm");
      await onSaved?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xóa vị trí cửa tiệm");
    } finally {
      setDeletingLocation(false);
    }
  };

  const save = async () => {
    if (!validCoordinates || demoLocation) {
      toast.error("Vui lòng lấy GPS hoặc chọn đúng vị trí cửa tiệm trên bản đồ");
      return;
    }
    try {
      setSaving(true);
      if (imageFile) {
        await CustomerService.uploadStorefrontImage(customer.id || customer._id, imageFile);
      }
      await CustomerService.updateStoreProfile(customer.id || customer._id, {
        latitude,
        longitude,
        accuracy: form.accuracy || undefined,
        note: form.note.trim() || undefined,
        source: form.source,
        capturedAt: new Date().toISOString(),
      });
      toast.success("Đã lưu thông tin cửa tiệm");
      setImageFile(null);
      await onSaved?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu thông tin cửa tiệm");
    } finally {
      setSaving(false);
    }
  };

  const openMapUrl = `https://www.openstreetmap.org/?mlat=${mapLocation.latitude}&mlon=${mapLocation.longitude}#map=18/${mapLocation.latitude}/${mapLocation.longitude}`;

  return (
    <SoftBox>
      {demoLocation && (
        <SoftBox
          mb={2}
          p={1.5}
          borderRadius={2}
          bgcolor="#fff8e1"
          sx={{ border: "1px solid #ffe082" }}
        >
          <SoftTypography variant="button" fontWeight="bold" sx={{ color: "#e65100" }}>
            <Icon sx={{ verticalAlign: "middle", mr: 0.75 }}>info</Icon>
            Đang hiển thị vị trí demo tại Cần Thơ
          </SoftTypography>
          <SoftTypography variant="caption" display="block" color="text" mt={0.25}>
            Hồ sơ này chưa có tọa độ thật. Bạn có thể lấy GPS hoặc bấm trực tiếp lên bản đồ.
          </SoftTypography>
        </SoftBox>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%", boxShadow: "none", border: "1px solid #e4e6eb" }}>
            <SoftBox p={{ xs: 1.5, md: 2 }}>
              <SoftBox
                height={{ xs: 210, md: 270 }}
                borderRadius={2}
                overflow="hidden"
                bgcolor="#eef4fb"
                display="flex"
                alignItems="center"
                justifyContent="center"
                role={imageUrl ? "button" : undefined}
                tabIndex={imageUrl ? 0 : undefined}
                onClick={() => {
                  if (imageUrl) {
                    setViewerUrl(imageUrl);
                    setViewerZoomed(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (imageUrl && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    setViewerUrl(imageUrl);
                    setViewerZoomed(false);
                  }
                }}
                sx={{
                  border: "1px solid #dfe7f0",
                  position: "relative",
                  cursor: imageUrl ? "zoom-in" : "default",
                  "&:focus-visible": {
                    outline: "3px solid rgba(24, 119, 242, 0.3)",
                    outlineOffset: 2,
                  },
                  "&:hover .storefront-view-overlay": { opacity: 1 },
                }}
              >
                {imageUrl ? (
                  <>
                    <SoftBox
                      component="img"
                      src={imageUrl}
                      alt={`Bảng hiệu ${customer.name || "cửa tiệm"}`}
                      width="100%"
                      height="100%"
                      sx={{ objectFit: "contain", bgcolor: "#111827" }}
                    />
                    <SoftBox
                      className="storefront-view-overlay"
                      position="absolute"
                      left="50%"
                      bottom={12}
                      display="flex"
                      alignItems="center"
                      gap={0.5}
                      px={1.25}
                      py={0.6}
                      borderRadius={5}
                      color="#fff"
                      bgcolor="rgba(17, 24, 39, 0.78)"
                      sx={{
                        transform: "translateX(-50%)",
                        opacity: { xs: 1, md: 0 },
                        transition: "opacity 160ms ease",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                      }}
                    >
                      <Icon sx={{ fontSize: 18 }}>zoom_in</Icon>
                      <SoftTypography variant="caption" fontWeight="bold" color="white">
                        Xem ảnh lớn
                      </SoftTypography>
                    </SoftBox>
                  </>
                ) : (
                  <SoftBox textAlign="center" color="#78909c">
                    <Icon sx={{ fontSize: 64 }}>storefront</Icon>
                    <SoftTypography variant="button" color="text" display="block">
                      Chưa có ảnh bảng hiệu
                    </SoftTypography>
                  </SoftBox>
                )}
              </SoftBox>
              <SoftTypography variant="h6" fontWeight="bold" mt={1.5}>
                Ảnh bảng hiệu cửa tiệm
              </SoftTypography>
              <SoftTypography variant="caption" color="text" display="block">
                JPG, PNG hoặc WebP · tối đa 5 MB
              </SoftTypography>
              {canEdit && (
                <>
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(event) => reviewImage(event, "LIBRARY")}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    hidden
                    onChange={(event) => reviewImage(event, "CAMERA")}
                  />
                  <SoftBox
                    mt={1.5}
                    p={{ xs: 1.75, md: 2.25 }}
                    minHeight={132}
                    borderRadius={2}
                    display={{ xs: "none", md: "flex" }}
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    textAlign="center"
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        inputRef.current?.click();
                      }
                    }}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setDraggingImage(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = "copy";
                      setDraggingImage(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setDraggingImage(false);
                      }
                    }}
                    onDrop={dropImage}
                    sx={{
                      border: `2px dashed ${draggingImage ? "#1877f2" : "#b8c8dc"}`,
                      bgcolor: draggingImage ? "#e7f3ff" : "#f8fbff",
                      cursor: "pointer",
                      transition: "all 160ms ease",
                      transform: draggingImage ? "scale(1.01)" : "none",
                      "&:hover": {
                        borderColor: "#1877f2",
                        bgcolor: "#eef6ff",
                      },
                      "&:focus-visible": {
                        outline: "3px solid rgba(24, 119, 242, 0.25)",
                        outlineOffset: 2,
                      },
                    }}
                  >
                    <SoftBox
                      width={48}
                      height={48}
                      borderRadius="50%"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      mb={0.75}
                      bgcolor={draggingImage ? "#1877f2" : "#e7f3ff"}
                      color={draggingImage ? "#fff" : "#1877f2"}
                    >
                      <Icon sx={{ fontSize: 27 }}>
                        {draggingImage ? "add_photo_alternate" : "cloud_upload"}
                      </Icon>
                    </SoftBox>
                    <SoftTypography variant="button" fontWeight="bold" color="dark">
                      {draggingImage ? "Thả ảnh vào đây" : "Kéo thả ảnh bảng hiệu vào đây"}
                    </SoftTypography>
                    <SoftTypography variant="caption" color="text" display="block" mt={0.25}>
                      Hoặc chạm để chọn ảnh từ thiết bị
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox
                    display="flex"
                    gap={1}
                    mt={1.5}
                    flexDirection={{ xs: "column", sm: "row", md: "column", lg: "row" }}
                  >
                    <SoftButton
                      color="info"
                      variant="gradient"
                      fullWidth
                      startIcon={<Icon>photo_camera</Icon>}
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      Mở camera
                    </SoftButton>
                    <SoftButton
                      color="secondary"
                      variant="outlined"
                      fullWidth
                      startIcon={<Icon>photo_library</Icon>}
                      onClick={() => inputRef.current?.click()}
                    >
                      Chọn ảnh
                    </SoftButton>
                  </SoftBox>
                  {imageFile && (
                    <>
                      <SoftTypography
                        variant="caption"
                        fontWeight="bold"
                        display="block"
                        mt={1}
                        sx={{ color: "#2e7d32" }}
                      >
                        <Icon sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }}>
                          check_circle
                        </Icon>
                        Ảnh mới đã sẵn sàng để tải lên
                      </SoftTypography>
                      <SoftButton
                        color="success"
                        variant="gradient"
                        fullWidth
                        disabled={uploadingImage}
                        startIcon={<Icon>cloud_upload</Icon>}
                        sx={{ mt: 1 }}
                        onClick={uploadSelectedImage}
                      >
                        {uploadingImage ? "Đang tải ảnh..." : "Lưu ảnh bảng hiệu"}
                      </SoftButton>
                    </>
                  )}
                  {(imageFile || savedImageUrl) && (
                    <SoftButton
                      color="error"
                      variant="text"
                      fullWidth
                      disabled={deletingImage}
                      startIcon={<Icon>delete_outline</Icon>}
                      sx={{ mt: 0.75 }}
                      onClick={removeImage}
                    >
                      {deletingImage
                        ? "Đang xóa..."
                        : imageFile
                        ? "Bỏ ảnh vừa chọn"
                        : "Xóa ảnh bảng hiệu"}
                    </SoftButton>
                  )}
                </>
              )}
            </SoftBox>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ height: "100%", boxShadow: "none", border: "1px solid #e4e6eb" }}>
            <SoftBox
              height={{ xs: 320, md: 360 }}
              overflow="hidden"
              sx={{
                borderRadius: "12px 12px 0 0",
                "& .leaflet-container": { zIndex: 1, fontFamily: "inherit" },
              }}
            >
              <StoreMap
                latitude={mapLocation.latitude}
                longitude={mapLocation.longitude}
                readOnly={!canEdit}
                customerName={customer.name}
                onSelect={selectLocation}
              />
            </SoftBox>
            <SoftBox p={{ xs: 1.5, md: 2 }}>
              <SoftBox
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={1}
                mb={1.25}
              >
                <SoftBox>
                  <SoftTypography variant="h6" fontWeight="bold">
                    Vị trí cửa tiệm
                  </SoftTypography>
                  <SoftTypography variant="caption" color="text">
                    {canEdit ? "Bấm trên bản đồ để đặt ghim" : "Vị trí đã lưu trên hệ thống"}
                  </SoftTypography>
                </SoftBox>
                <SoftButton
                  component="a"
                  href={openMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  color="secondary"
                  variant="text"
                  size="small"
                  startIcon={<Icon>open_in_new</Icon>}
                >
                  Mở bản đồ
                </SoftButton>
              </SoftBox>
              <Grid container spacing={1.25}>
                <Grid item xs={6}>
                  <SoftTypography variant="caption">Vĩ độ (lat)</SoftTypography>
                  <SoftInput
                    value={form.latitude}
                    disabled={!canEdit}
                    inputProps={{ inputMode: "decimal" }}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        latitude: event.target.value,
                        accuracy: null,
                        source: "MAP",
                      }));
                      setDemoLocation(false);
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <SoftTypography variant="caption">Kinh độ (lon)</SoftTypography>
                  <SoftInput
                    value={form.longitude}
                    disabled={!canEdit}
                    inputProps={{ inputMode: "decimal" }}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        longitude: event.target.value,
                        accuracy: null,
                        source: "MAP",
                      }));
                      setDemoLocation(false);
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <SoftBox display="flex" justifyContent="space-between" alignItems="center">
                    <SoftTypography variant="caption">Ghi chú vị trí</SoftTypography>
                    <SoftTypography variant="caption" color="text">
                      {form.note.length}/500
                    </SoftTypography>
                  </SoftBox>
                  <SoftInput
                    value={form.note}
                    disabled={!canEdit}
                    multiline
                    minRows={3}
                    inputProps={{ maxLength: 500 }}
                    placeholder="VD: Cửa hàng nằm cạnh cây xăng, bảng hiệu màu xanh..."
                    onChange={(event) =>
                      setForm((current) => ({ ...current, note: event.target.value }))
                    }
                  />
                  {canEdit && (
                    <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
                      Ghi chú được lưu khi bấm “Lưu vị trí cửa tiệm”.
                    </SoftTypography>
                  )}
                </Grid>
              </Grid>
              {form.accuracy && (
                <SoftTypography variant="caption" color="text" display="block" mt={0.75}>
                  Độ chính xác GPS khoảng {Math.round(form.accuracy)} m
                </SoftTypography>
              )}
              {canEdit && (
                <>
                  <SoftBox
                    mt={1.25}
                    p={1.25}
                    borderRadius={1.5}
                    bgcolor="#e8f5e9"
                    display={{ xs: "block", md: "none" }}
                    sx={{ border: "1px solid #a5d6a7" }}
                  >
                    <SoftTypography variant="caption" fontWeight="bold" sx={{ color: "#1b5e20" }}>
                      <Icon sx={{ fontSize: 17, verticalAlign: "middle", mr: 0.5 }}>
                        phone_android
                      </Icon>
                      Trên điện thoại, hãy đứng gần cửa tiệm rồi bấm “Lấy vị trí hiện tại”.
                    </SoftTypography>
                  </SoftBox>
                  <SoftBox
                    display="flex"
                    gap={1}
                    mt={1.5}
                    flexDirection={{ xs: "column", sm: "row" }}
                  >
                    <SoftButton
                      color="success"
                      variant="gradient"
                      fullWidth
                      disabled={locating}
                      startIcon={<Icon>my_location</Icon>}
                      onClick={getCurrentLocation}
                    >
                      {locating ? "Đang lấy GPS..." : "Lấy vị trí hiện tại"}
                    </SoftButton>
                    <SoftButton
                      color="info"
                      variant="gradient"
                      fullWidth
                      disabled={saving}
                      startIcon={<Icon>save</Icon>}
                      onClick={save}
                    >
                      {saving ? "Đang lưu..." : "Lưu vị trí cửa tiệm"}
                    </SoftButton>
                  </SoftBox>
                  {!demoLocation && (
                    <SoftButton
                      color="error"
                      variant="text"
                      fullWidth
                      disabled={deletingLocation}
                      startIcon={<Icon>location_off</Icon>}
                      sx={{ mt: 0.75 }}
                      onClick={removeLocation}
                    >
                      {deletingLocation ? "Đang xóa..." : "Xóa vị trí cửa tiệm"}
                    </SoftButton>
                  )}
                </>
              )}
            </SoftBox>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={Boolean(viewerUrl)}
        onClose={() => {
          setViewerUrl("");
          setViewerZoomed(false);
        }}
        fullScreen={isMobile}
        fullWidth
        maxWidth="xl"
        sx={{ zIndex: 1750 }}
        PaperProps={{
          sx: {
            m: { xs: 0, sm: 2 },
            height: { xs: "100dvh", sm: "calc(100vh - 32px)" },
            maxHeight: "none",
            bgcolor: "#0b1220",
            borderRadius: { xs: 0, sm: 2 },
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle sx={{ p: 1.5, color: "#fff", bgcolor: "rgba(11, 18, 32, 0.96)" }}>
          <SoftBox display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <SoftBox minWidth={0}>
              <SoftTypography variant="h6" fontWeight="bold" color="white" noWrap>
                Ảnh bảng hiệu cửa tiệm
              </SoftTypography>
              <SoftTypography variant="caption" sx={{ color: "#cbd5e1" }}>
                Chạm vào ảnh để {viewerZoomed ? "thu nhỏ" : "phóng to"}
              </SoftTypography>
            </SoftBox>
            <SoftBox display="flex" gap={0.5}>
              <IconButton
                onClick={() => setViewerZoomed((current) => !current)}
                aria-label={viewerZoomed ? "Thu nhỏ ảnh" : "Phóng to ảnh"}
                sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
              >
                <Icon>{viewerZoomed ? "zoom_out" : "zoom_in"}</Icon>
              </IconButton>
              <IconButton
                onClick={() => {
                  setViewerUrl("");
                  setViewerZoomed(false);
                }}
                aria-label="Đóng ảnh"
                sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}
              >
                <Icon>close</Icon>
              </IconButton>
            </SoftBox>
          </SoftBox>
        </DialogTitle>
        <DialogContent
          onClick={() => setViewerZoomed((current) => !current)}
          sx={{
            p: "0 !important",
            overflow: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: viewerZoomed ? "zoom-out" : "zoom-in",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <SoftBox
            component="img"
            src={viewerUrl}
            alt={`Bảng hiệu ${customer.name || "cửa tiệm"}`}
            width={viewerZoomed ? "auto" : "100%"}
            height={viewerZoomed ? "auto" : "100%"}
            minWidth={viewerZoomed ? { xs: "180%", sm: "140%" } : 0}
            sx={{
              display: "block",
              objectFit: "contain",
              transition: "min-width 180ms ease",
              userSelect: "none",
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reviewFile && reviewUrl)}
        onClose={cancelReview}
        fullWidth
        maxWidth="lg"
        fullScreen={isMobile}
        sx={{ zIndex: 1700 }}
        PaperProps={{
          sx: {
            m: { xs: 1.25, sm: 3 },
            width: { xs: "calc(100% - 20px)", sm: "100%" },
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <SoftBox display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <SoftBox>
              Xem lại ảnh bảng hiệu
              <SoftTypography variant="caption" color="text" display="block">
                Chạm vào ảnh hoặc nút kính lúp để phóng to
              </SoftTypography>
            </SoftBox>
            <IconButton
              onClick={() => setReviewZoomed((current) => !current)}
              aria-label={reviewZoomed ? "Thu nhỏ ảnh" : "Phóng to ảnh"}
            >
              <Icon>{reviewZoomed ? "zoom_out" : "zoom_in"}</Icon>
            </IconButton>
          </SoftBox>
        </DialogTitle>
        <DialogContent>
          <SoftBox
            width="100%"
            height={{ xs: "calc(100dvh - 260px)", sm: 560 }}
            borderRadius={2}
            overflow="auto"
            bgcolor="#111827"
            display="flex"
            alignItems="center"
            justifyContent="center"
            onClick={() => setReviewZoomed((current) => !current)}
            sx={{ cursor: reviewZoomed ? "zoom-out" : "zoom-in" }}
          >
            <SoftBox
              component="img"
              src={reviewUrl}
              alt="Ảnh bảng hiệu đang xem trước"
              width={reviewZoomed ? "auto" : "100%"}
              height={reviewZoomed ? "auto" : "100%"}
              minWidth={reviewZoomed ? "160%" : 0}
              sx={{
                display: "block",
                objectFit: "contain",
                transition: "min-width 180ms ease",
              }}
            />
          </SoftBox>
          <SoftBox
            mt={1.25}
            p={1.25}
            borderRadius={1.5}
            bgcolor="#f5f7fa"
            display="flex"
            justifyContent="space-between"
            gap={1}
          >
            <SoftTypography
              variant="caption"
              fontWeight="bold"
              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {reviewFile?.name || "Ảnh vừa chụp"}
            </SoftTypography>
            <SoftTypography variant="caption" color="text" sx={{ flexShrink: 0 }}>
              {reviewFile ? `${(reviewFile.size / 1024 / 1024).toFixed(2)} MB` : ""}
            </SoftTypography>
          </SoftBox>
          <SoftTypography variant="caption" color="text" display="block" mt={1}>
            Hãy kiểm tra ảnh rõ bảng hiệu, không bị rung hoặc quá tối trước khi sử dụng.
          </SoftTypography>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
            gap: 1,
            flexDirection: { xs: "column-reverse", sm: "row" },
            "& > :not(style) ~ :not(style)": { ml: { xs: 0, sm: 1 } },
          }}
        >
          <SoftButton color="secondary" variant="outlined" fullWidth onClick={cancelReview}>
            Hủy
          </SoftButton>
          <SoftButton
            color="warning"
            variant="outlined"
            fullWidth
            startIcon={<Icon>photo_camera</Icon>}
            onClick={retakeImage}
          >
            Chụp lại
          </SoftButton>
          <SoftButton
            color="success"
            variant="gradient"
            fullWidth
            disabled={uploadingImage}
            startIcon={<Icon>check</Icon>}
            onClick={useReviewedImage}
          >
            {uploadingImage
              ? "Đang lưu ảnh và GPS..."
              : reviewSource === "CAMERA"
              ? "Dùng ảnh và lưu vị trí"
              : "Dùng ảnh này"}
          </SoftButton>
        </DialogActions>
      </Dialog>
    </SoftBox>
  );
}
