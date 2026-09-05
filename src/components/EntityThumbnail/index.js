import Icon from "@mui/material/Icon";
import SoftBox from "components/SoftBox";

export const productImageUrl = (value = {}) => {
  const product =
    value.product || (typeof value.productId === "object" ? value.productId : null) || value;
  const image = product?.image || value.image || {};
  return (
    product?.imageUrl ||
    product?.productImageUrl ||
    value.imageUrl ||
    value.productImageUrl ||
    image.url ||
    image.secureUrl ||
    image.secure_url ||
    ""
  );
};

export const customerImageUrl = (customer = {}) => {
  const image = customer.storefrontImage || customer.storeImage || {};
  return (
    image.url ||
    image.secureUrl ||
    image.secure_url ||
    customer.storefrontImageUrl ||
    customer.storeImageUrl ||
    ""
  );
};

function EntityThumbnail({ entity, type = "product", size = 42, radius, sx = {} }) {
  const isCustomer = type === "customer";
  const imageUrl = isCustomer ? customerImageUrl(entity) : productImageUrl(entity);
  const borderRadius = radius ?? (isCustomer ? "50%" : 8);

  if (imageUrl) {
    return (
      <SoftBox
        component="img"
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        flexShrink={0}
        sx={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius,
          bgcolor: isCustomer ? "#e7f3ff" : "#f1f5f9",
          border: "1px solid #e6ebf1",
          ...sx,
        }}
      />
    );
  }

  return (
    <SoftBox
      width={size}
      height={size}
      borderRadius={borderRadius}
      bgcolor={isCustomer ? "#e7f3ff" : "#eef5ff"}
      color={isCustomer ? "#1877f2" : "#1976d2"}
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      sx={{ border: "1px solid #e6ebf1", ...sx }}
    >
      <Icon sx={{ fontSize: `${Math.max(18, size * 0.5)}px !important` }}>
        {isCustomer ? "storefront" : "inventory_2"}
      </Icon>
    </SoftBox>
  );
}

export default EntityThumbnail;
