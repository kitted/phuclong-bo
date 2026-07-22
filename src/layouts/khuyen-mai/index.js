import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Pagination from "@mui/material/Pagination";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import { CategoryService, ProductService } from "services/warehouseService";
import { CustomerService, PromotionService, PRODUCT_TYPES } from "services/crmService";
import { toast } from "react-toastify";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);
const EMPTY = {
  code: "",
  name: "",
  activationPrefix: "",
  type: "VOUCHER",
  discountType: "PERCENT",
  discountValue: 10,
  maxDiscount: 0,
  scope: "ALL",
  categoryIds: [],
  productType: "",
  productIds: [],
  voucherPrefix: "",
  quantity: 100,
  usageLimitPerCustomer: 1,
  minOrderValue: 0,
  startAt: "",
  endAt: "",
  status: "DRAFT",
  conditionGroups: [],
  giftGroups: [],
  contributionRules: [],
  repeatMode: "MULTIPLE",
  maxApplicationsPerInvoice: "",
};
const EMPTY_CONDITION = {
  metric: "QUANTITY",
  operator: "AT_LEAST",
  scope: "PRODUCTS",
  productIds: [],
  categoryIds: [],
  productType: "",
  brandIds: [],
  minimumQuantity: 1,
  minimumAmount: 0,
  minimumPoints: 0,
  allowMixedProducts: true,
  allowMixedBrands: true,
  groupKey: "",
};
const EMPTY_GIFT_GROUP = {
  code: "",
  name: "",
  selectionMode: "ALL",
  requiredSelectionCount: 1,
  giftQuantity: 1,
  productIds: [],
  sameAsPurchased: false,
  allowMixedProducts: true,
};
const EMPTY_CONTRIBUTION = {
  scope: "PRODUCTS",
  productIds: [],
  categoryIds: [],
  brandIds: [],
  quantityPerUnit: 1,
  contributionPoints: 1,
  maxQuantity: "",
};
const isGiftPromotion = (type) => ["BUY_X_GET_Y", "BUNDLE_GIFT"].includes(type);
const normalizeActivationPrefix = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 7);
const plain = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
const idOf = (value) => value?.id || value?._id;
const parseMoneyText = (text) => {
  const value = plain(text).replace(/\s/g, "");
  const million = value.match(/(\d+(?:[.,]\d+)?)tr(?:ieu)?/);
  const thousand = value.match(/(\d+)k/);
  if (million || thousand)
    return Math.round(
      Number((million?.[1] || "0").replace(",", ".")) * 1000000 + Number(thousand?.[1] || 0) * 1000
    );
  return 0;
};
const subjectOf = (text) =>
  plain(text)
    .replace(/\d+(?:[.,]\d+)?\s*(tr|trieu|k)?/g, " ")
    .replace(
      /\b(chai|lon|hop|bo|cai|san pham|sp|tu|tro len|cung hang|khac hang|khac ma|cung loai|khac loai|co the|nhieu hon)\b/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
const quickPromotionSetup = (description, products, categories) => {
  const normalized = plain(description).replace(/\s+/g, " ").trim();
  if (!normalized.includes("mua ") || !normalized.includes(" tang "))
    throw new Error("Mô tả cần có cấu trúc “Mua ... tặng ...”");
  const [buyText, giftText] = normalized.split(/\s+tang\s+/, 2);
  const buyBody = buyText.replace(/^.*?mua\s+/, "");
  const categoryFor = (subject) =>
    categories.find(
      (category) => plain(category.name).includes(subject) || subject.includes(plain(category.name))
    );
  const productsFor = (subject) =>
    products.filter(
      (product) =>
        plain(`${product.code} ${product.name}`).includes(subject) ||
        subject.includes(plain(product.name))
    );
  const baseSubject = subjectOf(buyBody.split(/\s+hoac\s+/)[0]);
  const baseCategory = categoryFor(baseSubject);
  const baseProducts = baseCategory ? [] : productsFor(baseSubject);
  const scopePatch = baseCategory
    ? { scope: "CATEGORY", categoryIds: [idOf(baseCategory)], productIds: [] }
    : baseProducts.length
    ? { scope: "PRODUCTS", productIds: baseProducts.map(idOf), categoryIds: [] }
    : { scope: "ALL", productIds: [], categoryIds: [] };
  const conditionParts = buyBody.split(/\s+hoac\s+/);
  let conditions = conditionParts.map((part) => {
    const amount = parseMoneyText(part);
    const quantity = Number(part.match(/\d+/)?.[0] || 0);
    return {
      ...EMPTY_CONDITION,
      ...scopePatch,
      metric: amount ? "AMOUNT" : "QUANTITY",
      minimumAmount: amount,
      minimumQuantity: amount ? 0 : quantity,
      allowMixedProducts: !normalized.includes("cung ma"),
      allowMixedBrands: !normalized.includes("cung hang"),
      groupKey: normalized.includes("cung hang") ? "brandId" : "",
    };
  });
  let contributionRules = [];
  const conversion = normalized.match(
    /quy doi\s+(\d+)\s+(.+?)\s+thanh\s+(\d+)\s+(.+?)(?:\s+trong|\s+tang|$)/
  );
  if (conversion) {
    const target = Number(buyBody.match(/\d+/)?.[0] || 0);
    const alternativeSubject = subjectOf(conversion[4]);
    const alternativeCategory = categoryFor(alternativeSubject);
    const alternativeProducts = alternativeCategory ? [] : productsFor(alternativeSubject);
    contributionRules = [
      { ...EMPTY_CONTRIBUTION, ...scopePatch, quantityPerUnit: 1, contributionPoints: 1 },
      {
        ...EMPTY_CONTRIBUTION,
        scope: alternativeCategory ? "CATEGORY" : "PRODUCTS",
        categoryIds: alternativeCategory ? [idOf(alternativeCategory)] : [],
        productIds: alternativeProducts.map(idOf),
        quantityPerUnit: 1,
        contributionPoints: 1,
        maxQuantity: Number(conversion[3]),
      },
    ];
    conditions = [
      { ...EMPTY_CONDITION, metric: "POINT", scope: "ALL", minimumPoints: target },
      ...conditions.filter((condition) => condition.metric === "AMOUNT"),
    ];
  }
  const giftClauses = giftText.split(/\s+va\s+(?=\d+)/);
  const giftGroups = giftClauses.map((clause, index) => {
    const qty = Number(clause.match(/\d+/)?.[0] || 1);
    const choices = clause.split(/\s+hoac\s+/);
    const choiceProducts = choices
      .flatMap((choice) => productsFor(subjectOf(choice)))
      .filter(
        (product, position, all) =>
          all.findIndex((item) => String(idOf(item)) === String(idOf(product))) === position
      );
    const sameAsPurchased = !choiceProducts.length || /cung loai|khac loai/.test(clause);
    return {
      ...EMPTY_GIFT_GROUP,
      code: `GIFT-${index + 1}`,
      name: clause,
      giftQuantity: qty,
      requiredSelectionCount: qty,
      selectionMode: sameAsPurchased
        ? "SAME_AS_PURCHASED"
        : choices.length > 1
        ? "CHOOSE_ONE"
        : choiceProducts.length > 1
        ? "CHOOSE_QUANTITY"
        : "ALL",
      sameAsPurchased,
      allowMixedProducts: /khac loai|co the/.test(clause),
      productIds: choiceProducts.map(idOf),
    };
  });
  const code = `KM-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${Date.now()
    .toString()
    .slice(-4)}`;
  return {
    code,
    name: description.trim(),
    type: giftGroups.length > 1 || conditions.length > 1 ? "BUNDLE_GIFT" : "BUY_X_GET_Y",
    conditionGroups: [{ combination: conditions.length > 1 ? "ANY" : "ALL", conditions }],
    giftGroups,
    contributionRules,
    repeatMode: "MULTIPLE",
    maxApplicationsPerInvoice: "",
  };
};
const statusStyle = {
  ACTIVE: ["Đang chạy", "#2E7D32", "#E8F5E9"],
  SCHEDULED: ["Sắp diễn ra", "#1565C0", "#E3F2FD"],
  PAUSED: ["Tạm dừng", "#E65100", "#FFF3E0"],
  ENDED: ["Đã kết thúc", "#6B7280", "#F3F4F6"],
  DRAFT: ["Bản nháp", "#6A1B9A", "#F3E5F5"],
};
const pill = (status) => {
  const value = statusStyle[status] || statusStyle.DRAFT;
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: value[1],
        background: value[2],
      }}
    >
      {value[0]}
    </span>
  );
};

function FormGridField({ label, children, xs = 12, md = 6 }) {
  return (
    <Grid item xs={xs} md={md}>
      <SoftTypography variant="caption" fontWeight="medium">
        {label}
      </SoftTypography>
      {children}
    </Grid>
  );
}

function MultiSelectField({ value, onChange, options, placeholder }) {
  const safeValue = Array.isArray(value) ? value : [];
  const safeOptions = Array.isArray(options) ? options : [];
  return (
    <FormControl fullWidth size="small">
      <Select
        multiple
        value={safeValue}
        onChange={(event) => onChange(event.target.value)}
        displayEmpty
        renderValue={(selected) =>
          Array.isArray(selected) && selected.length
            ? selected
                .map(
                  (id) =>
                    safeOptions.find((item) => String(item.id || item._id) === String(id))?.name
                )
                .filter(Boolean)
                .join(", ")
            : placeholder
        }
      >
        {safeOptions.map((item) => (
          <MenuItem key={item.id || item._id} value={item.id || item._id}>
            {item.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function GiftRuleFields({ form, set, products, categories }) {
  const groups = Array.isArray(form.conditionGroups) ? form.conditionGroups : [];
  const gifts = Array.isArray(form.giftGroups) ? form.giftGroups : [];
  const contributions = Array.isArray(form.contributionRules) ? form.contributionRules : [];
  const updateConditionGroup = (groupIndex, patch) =>
    set(
      "conditionGroups",
      groups.map((group, index) => (index === groupIndex ? { ...group, ...patch } : group))
    );
  const updateCondition = (groupIndex, conditionIndex, patch) =>
    updateConditionGroup(groupIndex, {
      conditions: groups[groupIndex].conditions.map((condition, index) =>
        index === conditionIndex ? { ...condition, ...patch } : condition
      ),
    });
  const updateGift = (giftIndex, patch) =>
    set(
      "giftGroups",
      gifts.map((gift, index) => (index === giftIndex ? { ...gift, ...patch } : gift))
    );
  return (
    <>
      <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
        <SoftTypography variant="button" fontWeight="bold">
          2. Điều kiện mua hàng
        </SoftTypography>
        <SoftButton
          variant="text"
          color="info"
          startIcon={<Icon>add</Icon>}
          onClick={() =>
            set("conditionGroups", [
              ...groups,
              { combination: "ALL", conditions: [{ ...EMPTY_CONDITION }] },
            ])
          }
        >
          Thêm nhóm điều kiện
        </SoftButton>
      </SoftBox>
      {groups.map((group, groupIndex) => (
        <SoftBox key={groupIndex} p={2} mt={1} border="1px solid #E5E7EB" borderRadius={2}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="center">
            <FormControl size="small" sx={{ minWidth: 210 }}>
              <Select
                value={group.combination || "ALL"}
                onChange={(event) =>
                  updateConditionGroup(groupIndex, { combination: event.target.value })
                }
              >
                <MenuItem value="ALL">Tất cả điều kiện (AND)</MenuItem>
                <MenuItem value="ANY">Một trong điều kiện (OR)</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              color="error"
              onClick={() =>
                set(
                  "conditionGroups",
                  groups.filter((_, index) => index !== groupIndex)
                )
              }
            >
              <Icon>delete</Icon>
            </IconButton>
          </SoftBox>
          {(group.conditions || []).map((condition, conditionIndex) => (
            <Grid container spacing={1.5} mt={0.5} key={conditionIndex}>
              <FormGridField label="Chỉ số" md={2}>
                <FormControl fullWidth size="small">
                  <Select
                    value={condition.metric}
                    onChange={(event) =>
                      updateCondition(groupIndex, conditionIndex, { metric: event.target.value })
                    }
                  >
                    <MenuItem value="QUANTITY">Số lượng</MenuItem>
                    <MenuItem value="AMOUNT">Giá trị</MenuItem>
                    <MenuItem value="POINT">Điểm</MenuItem>
                  </Select>
                </FormControl>
              </FormGridField>
              <FormGridField label="Toán tử" md={2}>
                <FormControl fullWidth size="small">
                  <Select
                    value={condition.operator || "AT_LEAST"}
                    onChange={(event) =>
                      updateCondition(groupIndex, conditionIndex, { operator: event.target.value })
                    }
                  >
                    <MenuItem value="AT_LEAST">Tối thiểu</MenuItem>
                    <MenuItem value="EXACT">Chính xác</MenuItem>
                  </Select>
                </FormControl>
              </FormGridField>
              <FormGridField label="Phạm vi" md={2}>
                <FormControl fullWidth size="small">
                  <Select
                    value={condition.scope}
                    onChange={(event) =>
                      updateCondition(groupIndex, conditionIndex, { scope: event.target.value })
                    }
                  >
                    <MenuItem value="ALL">Tất cả</MenuItem>
                    <MenuItem value="PRODUCTS">Sản phẩm</MenuItem>
                    <MenuItem value="CATEGORY">Danh mục</MenuItem>
                    <MenuItem value="PRODUCT_TYPE">Loại</MenuItem>
                    <MenuItem value="BRAND">Hãng</MenuItem>
                  </Select>
                </FormControl>
              </FormGridField>
              <FormGridField
                label={
                  condition.metric === "QUANTITY"
                    ? "Số lượng"
                    : condition.metric === "AMOUNT"
                    ? "Giá trị"
                    : "Số điểm"
                }
                md={2}
              >
                <SoftInput
                  type="number"
                  value={
                    condition.metric === "QUANTITY"
                      ? condition.minimumQuantity
                      : condition.metric === "AMOUNT"
                      ? condition.minimumAmount
                      : condition.minimumPoints
                  }
                  onChange={(event) =>
                    updateCondition(groupIndex, conditionIndex, {
                      [condition.metric === "QUANTITY"
                        ? "minimumQuantity"
                        : condition.metric === "AMOUNT"
                        ? "minimumAmount"
                        : "minimumPoints"]: event.target.value,
                    })
                  }
                />
              </FormGridField>
              <FormGridField label="Trộn mã" md={1}>
                <FormControl fullWidth size="small">
                  <Select
                    value={condition.allowMixedProducts === false ? "false" : "true"}
                    onChange={(event) =>
                      updateCondition(groupIndex, conditionIndex, {
                        allowMixedProducts: event.target.value === "true",
                      })
                    }
                  >
                    <MenuItem value="true">Có</MenuItem>
                    <MenuItem value="false">Không</MenuItem>
                  </Select>
                </FormControl>
              </FormGridField>
              <FormGridField label="Trộn hãng" md={1}>
                <FormControl fullWidth size="small">
                  <Select
                    value={condition.allowMixedBrands === false ? "false" : "true"}
                    onChange={(event) =>
                      updateCondition(groupIndex, conditionIndex, {
                        allowMixedBrands: event.target.value === "true",
                        groupKey: event.target.value === "false" ? "brandId" : "",
                      })
                    }
                  >
                    <MenuItem value="true">Có</MenuItem>
                    <MenuItem value="false">Không</MenuItem>
                  </Select>
                </FormControl>
              </FormGridField>
              <Grid item xs={12} md={2} display="flex" alignItems="flex-end">
                <IconButton
                  color="error"
                  onClick={() =>
                    updateConditionGroup(groupIndex, {
                      conditions: group.conditions.filter((_, index) => index !== conditionIndex),
                    })
                  }
                >
                  <Icon>remove_circle</Icon>
                </IconButton>
              </Grid>
              {condition.scope === "PRODUCTS" && (
                <FormGridField label="Sản phẩm áp dụng" md={12}>
                  <MultiSelectField
                    value={condition.productIds}
                    onChange={(value) =>
                      updateCondition(groupIndex, conditionIndex, { productIds: value })
                    }
                    options={products}
                    placeholder="Chọn sản phẩm"
                  />
                </FormGridField>
              )}
              {condition.scope === "CATEGORY" && (
                <FormGridField label="Danh mục áp dụng" md={12}>
                  <MultiSelectField
                    value={condition.categoryIds}
                    onChange={(value) =>
                      updateCondition(groupIndex, conditionIndex, { categoryIds: value })
                    }
                    options={categories}
                    placeholder="Chọn danh mục"
                  />
                </FormGridField>
              )}
              {condition.scope === "PRODUCT_TYPE" && (
                <FormGridField label="Loại sản phẩm" md={12}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={condition.productType || ""}
                      onChange={(event) =>
                        updateCondition(groupIndex, conditionIndex, {
                          productType: event.target.value,
                        })
                      }
                    >
                      {PRODUCT_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormGridField>
              )}
              {condition.scope === "BRAND" && (
                <FormGridField label="Mã hãng (phân cách bằng dấu phẩy)" md={12}>
                  <SoftInput
                    value={(condition.brandIds || []).join(", ")}
                    onChange={(event) =>
                      updateCondition(groupIndex, conditionIndex, {
                        brandIds: event.target.value
                          .split(",")
                          .map((value) => value.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </FormGridField>
              )}
            </Grid>
          ))}
          <SoftButton
            variant="text"
            color="info"
            startIcon={<Icon>add</Icon>}
            onClick={() =>
              updateConditionGroup(groupIndex, {
                conditions: [...(group.conditions || []), { ...EMPTY_CONDITION }],
              })
            }
          >
            Thêm điều kiện
          </SoftButton>
        </SoftBox>
      ))}
      {groups.some((group) =>
        (group.conditions || []).some((condition) => condition.metric === "POINT")
      ) && (
        <SoftBox mt={3}>
          <SoftBox display="flex" justifyContent="space-between" alignItems="center">
            <SoftTypography variant="button" fontWeight="bold">
              Quy tắc quy đổi điểm
            </SoftTypography>
            <SoftButton
              variant="text"
              color="info"
              startIcon={<Icon>add</Icon>}
              onClick={() =>
                set("contributionRules", [...contributions, { ...EMPTY_CONTRIBUTION }])
              }
            >
              Thêm quy tắc
            </SoftButton>
          </SoftBox>
          {contributions.map((rule, ruleIndex) => {
            const update = (patch) =>
              set(
                "contributionRules",
                contributions.map((item, index) =>
                  index === ruleIndex ? { ...item, ...patch } : item
                )
              );
            return (
              <SoftBox key={ruleIndex} p={2} mt={1} border="1px solid #E5E7EB" borderRadius={2}>
                <Grid container spacing={2}>
                  <FormGridField label="Phạm vi" md={2}>
                    <FormControl fullWidth size="small">
                      <Select
                        value={rule.scope}
                        onChange={(event) => update({ scope: event.target.value })}
                      >
                        <MenuItem value="PRODUCTS">Sản phẩm</MenuItem>
                        <MenuItem value="CATEGORY">Danh mục</MenuItem>
                        <MenuItem value="BRAND">Hãng</MenuItem>
                        <MenuItem value="ALL">Tất cả</MenuItem>
                      </Select>
                    </FormControl>
                  </FormGridField>
                  <FormGridField label="Số lượng / đơn vị" md={2}>
                    <SoftInput
                      type="number"
                      value={rule.quantityPerUnit}
                      onChange={(event) => update({ quantityPerUnit: event.target.value })}
                    />
                  </FormGridField>
                  <FormGridField label="Điểm đóng góp" md={2}>
                    <SoftInput
                      type="number"
                      value={rule.contributionPoints}
                      onChange={(event) => update({ contributionPoints: event.target.value })}
                    />
                  </FormGridField>
                  <FormGridField label="SL tối đa" md={2}>
                    <SoftInput
                      type="number"
                      value={rule.maxQuantity || ""}
                      onChange={(event) => update({ maxQuantity: event.target.value })}
                      placeholder="Không giới hạn"
                    />
                  </FormGridField>
                  <Grid item xs={12} md={1} display="flex" alignItems="flex-end">
                    <IconButton
                      color="error"
                      onClick={() =>
                        set(
                          "contributionRules",
                          contributions.filter((_, index) => index !== ruleIndex)
                        )
                      }
                    >
                      <Icon>delete</Icon>
                    </IconButton>
                  </Grid>
                  {rule.scope === "PRODUCTS" && (
                    <FormGridField label="Sản phẩm quy đổi" md={12}>
                      <MultiSelectField
                        value={rule.productIds}
                        onChange={(value) => update({ productIds: value })}
                        options={products}
                        placeholder="Chọn sản phẩm"
                      />
                    </FormGridField>
                  )}
                  {rule.scope === "CATEGORY" && (
                    <FormGridField label="Danh mục quy đổi" md={12}>
                      <MultiSelectField
                        value={rule.categoryIds}
                        onChange={(value) => update({ categoryIds: value })}
                        options={categories}
                        placeholder="Chọn danh mục"
                      />
                    </FormGridField>
                  )}
                  {rule.scope === "BRAND" && (
                    <FormGridField label="Mã hãng" md={12}>
                      <SoftInput
                        value={(rule.brandIds || []).join(", ")}
                        onChange={(event) =>
                          update({
                            brandIds: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </FormGridField>
                  )}
                </Grid>
              </SoftBox>
            );
          })}
        </SoftBox>
      )}
      <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
        <SoftTypography variant="button" fontWeight="bold">
          3. Nhóm quà tặng
        </SoftTypography>
        <SoftButton
          variant="text"
          color="info"
          startIcon={<Icon>add</Icon>}
          onClick={() =>
            set("giftGroups", [...gifts, { ...EMPTY_GIFT_GROUP, code: `GIFT-${gifts.length + 1}` }])
          }
        >
          Thêm nhóm quà
        </SoftButton>
      </SoftBox>
      {gifts.map((gift, giftIndex) => (
        <SoftBox key={giftIndex} p={2} mt={1} border="1px solid #E5E7EB" borderRadius={2}>
          <Grid container spacing={2}>
            <FormGridField label="Mã nhóm" md={2}>
              <SoftInput
                value={gift.code || ""}
                onChange={(event) =>
                  updateGift(giftIndex, { code: event.target.value.toUpperCase() })
                }
              />
            </FormGridField>
            <FormGridField label="Tên nhóm" md={3}>
              <SoftInput
                value={gift.name || ""}
                onChange={(event) => updateGift(giftIndex, { name: event.target.value })}
              />
            </FormGridField>
            <FormGridField label="Cách chọn" md={3}>
              <FormControl fullWidth size="small">
                <Select
                  value={gift.selectionMode}
                  onChange={(event) => updateGift(giftIndex, { selectionMode: event.target.value })}
                >
                  <MenuItem value="ALL">Nhận tất cả</MenuItem>
                  <MenuItem value="CHOOSE_ONE">Chọn một</MenuItem>
                  <MenuItem value="CHOOSE_QUANTITY">Chọn đủ số lượng</MenuItem>
                  <MenuItem value="SAME_AS_PURCHASED">Cùng hàng đã mua</MenuItem>
                </Select>
              </FormControl>
            </FormGridField>
            <FormGridField label="Số quà" md={2}>
              <SoftInput
                type="number"
                value={gift.giftQuantity}
                onChange={(event) => updateGift(giftIndex, { giftQuantity: event.target.value })}
              />
            </FormGridField>
            <Grid item xs={12} md={2} display="flex" alignItems="flex-end">
              <IconButton
                color="error"
                onClick={() =>
                  set(
                    "giftGroups",
                    gifts.filter((_, index) => index !== giftIndex)
                  )
                }
              >
                <Icon>delete</Icon>
              </IconButton>
            </Grid>
            <FormGridField label="Sản phẩm quà" md={12}>
              <MultiSelectField
                value={gift.productIds}
                onChange={(value) => updateGift(giftIndex, { productIds: value })}
                options={products}
                placeholder="Chọn các quà khả dụng"
              />
            </FormGridField>
          </Grid>
        </SoftBox>
      ))}
      <Grid container spacing={2} mt={1}>
        <FormGridField label="Cơ chế lặp">
          <FormControl fullWidth size="small">
            <Select
              value={form.repeatMode || "MULTIPLE"}
              onChange={(event) => set("repeatMode", event.target.value)}
            >
              <MenuItem value="MULTIPLE">Lặp theo bội số</MenuItem>
              <MenuItem value="ONCE">Chỉ một lần</MenuItem>
            </Select>
          </FormControl>
        </FormGridField>
        <FormGridField label="Số lần tối đa / hóa đơn">
          <SoftInput
            type="number"
            value={form.maxApplicationsPerInvoice || ""}
            onChange={(event) => set("maxApplicationsPerInvoice", event.target.value)}
            placeholder="Không giới hạn"
          />
        </FormGridField>
      </Grid>
    </>
  );
}

function PromotionForm({ open, promotion, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [quickDescription, setQuickDescription] = useState("");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setQuickDescription("");
    setForm(
      promotion
        ? {
            ...EMPTY,
            ...promotion,
            categoryIds: (promotion.categoryIds || []).map((item) => item?.id || item?._id || item),
            productIds: (promotion.productIds || []).map((item) => item?.id || item?._id || item),
            conditionGroups: (promotion.conditionGroups || []).map((group) => ({
              ...group,
              conditions: (group.conditions || []).map((condition) => ({
                ...condition,
                productIds: (condition.productIds || []).map(
                  (item) => item?.id || item?._id || item
                ),
                categoryIds: (condition.categoryIds || []).map(
                  (item) => item?.id || item?._id || item
                ),
              })),
            })),
            giftGroups: (promotion.giftGroups || []).map((gift) => ({
              ...gift,
              productIds: (gift.productIds || []).map((item) => item?.id || item?._id || item),
            })),
            contributionRules: (promotion.contributionRules || []).map((rule) => ({
              ...rule,
              productIds: (rule.productIds || []).map((item) => item?.id || item?._id || item),
              categoryIds: (rule.categoryIds || []).map((item) => item?.id || item?._id || item),
            })),
            startAt: promotion.startAt
              ? new Date(promotion.startAt).toISOString().slice(0, 16)
              : "",
            endAt: promotion.endAt ? new Date(promotion.endAt).toISOString().slice(0, 16) : "",
          }
        : EMPTY
    );
    if (open)
      Promise.all([CategoryService.getAll(), ProductService.getAll({ page: 1, limit: 100 })])
        .then(([categoryResponse, productResponse]) => {
          const categoryData = categoryResponse?.data?.data || categoryResponse?.data || [];
          const productData = productResponse?.data?.data || productResponse?.data || [];
          setCategories(Array.isArray(categoryData) ? categoryData : []);
          setProducts(Array.isArray(productData) ? productData : []);
        })
        .catch(() => toast.error("Không thể tải danh mục sản phẩm"));
  }, [open, promotion]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const analyzeDescription = () => {
    if (!quickDescription.trim()) return toast.error("Vui lòng nhập mô tả chương trình");
    try {
      const setup = quickPromotionSetup(quickDescription, products, categories);
      setForm((current) => ({
        ...current,
        ...setup,
        activationPrefix:
          current.activationPrefix || normalizeActivationPrefix(setup.name || setup.code),
      }));
      toast.success("Đã tự thiết lập điều kiện và quà tặng");
    } catch (error) {
      toast.error(error.message || "Không thể phân tích mô tả");
    }
  };
  const save = async (status = form.status) => {
    if (!form.code.trim() || !form.name.trim())
      return toast.error("Vui lòng nhập mã và tên chương trình");
    if (!form.startAt || !form.endAt || new Date(form.endAt) <= new Date(form.startAt))
      return toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
    if (form.scope === "CATEGORY" && !(form.categoryIds || []).length)
      return toast.error("Vui lòng chọn ít nhất một danh mục");
    if (form.scope === "PRODUCT_TYPE" && !form.productType)
      return toast.error("Vui lòng chọn loại sản phẩm");
    if (form.scope === "PRODUCTS" && !(form.productIds || []).length)
      return toast.error("Vui lòng chọn ít nhất một sản phẩm");
    if (form.type === "VOUCHER" && (!form.voucherPrefix.trim() || Number(form.quantity) <= 0))
      return toast.error("Voucher cần tiền tố mã và số lượng phát hành");
    if (isGiftPromotion(form.type) && !(form.conditionGroups || []).length)
      return toast.error("Chương trình tặng quà cần ít nhất một nhóm điều kiện");
    if (isGiftPromotion(form.type) && !(form.giftGroups || []).length)
      return toast.error("Chương trình tặng quà cần ít nhất một nhóm quà");
    if (isGiftPromotion(form.type) && !form.activationPrefix.trim())
      return toast.error("Vui lòng nhập tiền tố mã kích hoạt");
    try {
      setSaving(true);
      const payload = {
        ...form,
        status,
        discountValue: Number(form.discountValue),
        maxDiscount: Number(form.maxDiscount),
        quantity: Number(form.quantity),
        usageLimitPerCustomer: Number(form.usageLimitPerCustomer),
        minOrderValue: Number(form.minOrderValue),
        maxApplicationsPerInvoice: form.maxApplicationsPerInvoice
          ? Number(form.maxApplicationsPerInvoice)
          : undefined,
        conditionGroups: (form.conditionGroups || []).map((group) => ({
          ...group,
          conditions: (group.conditions || []).map((condition) => ({
            ...condition,
            minimumQuantity: Number(condition.minimumQuantity) || 0,
            minimumAmount: Number(condition.minimumAmount) || 0,
            minimumPoints: Number(condition.minimumPoints) || 0,
          })),
        })),
        giftGroups: (form.giftGroups || []).map((gift) => ({
          ...gift,
          code: gift.code.trim().toUpperCase(),
          giftQuantity: Number(gift.giftQuantity) || 1,
          requiredSelectionCount: Number(gift.requiredSelectionCount) || undefined,
        })),
        contributionRules: (form.contributionRules || []).map((rule) => ({
          ...rule,
          quantityPerUnit: Number(rule.quantityPerUnit) || 1,
          contributionPoints: Number(rule.contributionPoints) || 0,
          maxQuantity: rule.maxQuantity ? Number(rule.maxQuantity) : undefined,
        })),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      };
      if (promotion?.id) await PromotionService.update(promotion.id, payload);
      else await PromotionService.create(payload);
      toast.success(status === "DRAFT" ? "Đã lưu bản nháp" : "Đã lưu chương trình khuyến mãi");
      onSaved(!promotion);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu chương trình");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "95%", lg: 920 },
          maxHeight: "92vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          {promotion ? "Cập nhật chương trình" : "Thiết lập chương trình khuyến mãi"}
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          Cấu hình ưu đãi, phạm vi sản phẩm, voucher và thời gian áp dụng
        </SoftTypography>
        {!promotion && (
          <SoftBox mt={2} p={2} bgcolor="#F3F8FF" borderRadius={2} border="1px solid #D6E4FF">
            <SoftTypography variant="button" fontWeight="bold" display="block">
              Thiết lập nhanh bằng mô tả
            </SoftTypography>
            <SoftTypography variant="caption" color="text" display="block" mb={1}>
              Ví dụ: “Mua 24 lon nhớt, tặng 6 chai và 1 hộp bố đĩa”
            </SoftTypography>
            <TextField
              multiline
              minRows={2}
              fullWidth
              size="small"
              value={quickDescription}
              onChange={(event) => setQuickDescription(event.target.value)}
              placeholder="Nhập nội dung chương trình theo cách bạn thường nói..."
            />
            <SoftBox display="flex" justifyContent="flex-end" mt={1}>
              <SoftButton
                variant="gradient"
                color="info"
                startIcon={<Icon>auto_fix_high</Icon>}
                onClick={analyzeDescription}
              >
                Tự phân tích & thiết lập
              </SoftButton>
            </SoftBox>
          </SoftBox>
        )}
        <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
          1. Thông tin chương trình
        </SoftTypography>
        <Grid container spacing={2}>
          <FormGridField label="Mã chương trình *" md={4}>
            <SoftInput
              value={form.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Tên chương trình *" md={8}>
            <SoftInput
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((current) => ({
                  ...current,
                  name,
                  activationPrefix: current.activationPrefix || normalizeActivationPrefix(name),
                }));
              }}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Cơ chế áp dụng">
            <FormControl fullWidth size="small">
              <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
                <MenuItem value="VOUCHER">Phát hành voucher</MenuItem>
                <MenuItem value="AUTO_DISCOUNT">Tự động giảm giá</MenuItem>
                <MenuItem value="BUY_X_GET_Y">Mua X tặng Y</MenuItem>
                <MenuItem value="BUNDLE_GIFT">Gói điều kiện tặng quà</MenuItem>
              </Select>
            </FormControl>
          </FormGridField>
          {isGiftPromotion(form.type) && (
            <FormGridField label="Tiền tố mã kích hoạt *">
              <SoftInput
                value={form.activationPrefix || ""}
                onChange={(e) => set("activationPrefix", normalizeActivationPrefix(e.target.value))}
                placeholder="VD: QUATGIO"
                fullWidth
              />
              <SoftTypography variant="caption" color="text">
                Tối đa 7 ký tự. Mã dự kiến: {form.activationPrefix || "PREFIX"}2207399001
              </SoftTypography>
            </FormGridField>
          )}
          <FormGridField label="Loại ưu đãi">
            <FormControl fullWidth size="small">
              <Select
                value={form.discountType}
                onChange={(e) => set("discountType", e.target.value)}
              >
                <MenuItem value="PERCENT">Giảm theo phần trăm</MenuItem>
                <MenuItem value="FIXED">Giảm số tiền cố định</MenuItem>
              </Select>
            </FormControl>
          </FormGridField>
          <FormGridField
            label={form.discountType === "PERCENT" ? "Mức giảm (%)" : "Số tiền giảm"}
            md={4}
          >
            <SoftInput
              type="number"
              value={form.discountValue}
              onChange={(e) => set("discountValue", e.target.value)}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Giảm tối đa" md={4}>
            <SoftInput
              type="number"
              value={form.maxDiscount}
              onChange={(e) => set("maxDiscount", e.target.value)}
              disabled={form.discountType === "FIXED"}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Giá trị đơn tối thiểu" md={4}>
            <SoftInput
              type="number"
              value={form.minOrderValue}
              onChange={(e) => set("minOrderValue", e.target.value)}
              fullWidth
            />
          </FormGridField>
        </Grid>
        <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
          2. Phạm vi sản phẩm
        </SoftTypography>
        <Grid container spacing={2}>
          <FormGridField label="Áp dụng cho" md={4}>
            <FormControl fullWidth size="small">
              <Select value={form.scope} onChange={(e) => set("scope", e.target.value)}>
                <MenuItem value="ALL">Tất cả sản phẩm</MenuItem>
                <MenuItem value="CATEGORY">Theo danh mục</MenuItem>
                <MenuItem value="PRODUCT_TYPE">Theo loại sản phẩm</MenuItem>
                <MenuItem value="PRODUCTS">Nhiều sản phẩm chỉ định</MenuItem>
              </Select>
            </FormControl>
          </FormGridField>
          {form.scope === "CATEGORY" && (
            <FormGridField label="Danh mục áp dụng" md={8}>
              <MultiSelectField
                value={form.categoryIds}
                onChange={(value) => set("categoryIds", value)}
                options={categories}
                placeholder="Chọn danh mục"
              />
            </FormGridField>
          )}
          {form.scope === "PRODUCT_TYPE" && (
            <FormGridField label="Loại sản phẩm" md={8}>
              <FormControl fullWidth size="small">
                <Select
                  value={form.productType}
                  onChange={(e) => set("productType", e.target.value)}
                >
                  {PRODUCT_TYPES.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormGridField>
          )}
          {form.scope === "PRODUCTS" && (
            <FormGridField label="Sản phẩm áp dụng" md={8}>
              <MultiSelectField
                value={form.productIds}
                onChange={(value) => set("productIds", value)}
                options={products}
                placeholder="Chọn nhiều sản phẩm"
              />
            </FormGridField>
          )}
        </Grid>
        {isGiftPromotion(form.type) && (
          <SoftBox mt={2} p={2} bgcolor="#E8F5E9" borderRadius={2}>
            <SoftTypography variant="button" fontWeight="bold" color="success">
              Hệ thống đã hiểu:
            </SoftTypography>
            <SoftTypography variant="caption" display="block">
              • {(form.conditionGroups || []).length} nhóm điều kiện mua hàng · kết hợp{" "}
              {(form.conditionGroups || [])[0]?.combination === "ANY"
                ? "chỉ cần một điều kiện"
                : "tất cả điều kiện"}
            </SoftTypography>
            <SoftTypography variant="caption" display="block">
              •{" "}
              {(form.giftGroups || [])
                .map((gift) => `${gift.giftQuantity || 0} ${gift.name || gift.code}`)
                .join(" và ") || "Chưa có quà"}
            </SoftTypography>
            <SoftTypography variant="caption" display="block">
              • Áp dụng:{" "}
              {form.repeatMode === "MULTIPLE" ? "lặp theo bội số mua" : "một lần mỗi hóa đơn"}
            </SoftTypography>
          </SoftBox>
        )}
        {isGiftPromotion(form.type) && (
          <GiftRuleFields form={form} set={set} products={products} categories={categories} />
        )}
        {form.type === "VOUCHER" && (
          <>
            <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
              3. Thiết lập voucher
            </SoftTypography>
            <Grid container spacing={2}>
              <FormGridField label="Tiền tố mã voucher" md={4}>
                <SoftInput
                  value={form.voucherPrefix}
                  onChange={(e) => set("voucherPrefix", e.target.value.toUpperCase())}
                  placeholder="VD: SUMMER"
                  fullWidth
                />
              </FormGridField>
              <FormGridField label="Số lượng phát hành" md={4}>
                <SoftInput
                  type="number"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  fullWidth
                />
              </FormGridField>
              <FormGridField label="Lượt dùng / khách" md={4}>
                <SoftInput
                  type="number"
                  value={form.usageLimitPerCustomer}
                  onChange={(e) => set("usageLimitPerCustomer", e.target.value)}
                  fullWidth
                />
              </FormGridField>
            </Grid>
          </>
        )}
        <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
          {form.type === "VOUCHER" ? "4" : "3"}. Thời gian hiệu lực
        </SoftTypography>
        <Grid container spacing={2}>
          <FormGridField label="Bắt đầu">
            <SoftInput
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => set("startAt", e.target.value)}
              fullWidth
            />
          </FormGridField>
          <FormGridField label="Kết thúc">
            <SoftInput
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => set("endAt", e.target.value)}
              fullWidth
            />
          </FormGridField>
        </Grid>
        <SoftBox display="flex" justifyContent="flex-end" gap={1.5} mt={4}>
          <SoftButton variant="outlined" color="secondary" onClick={onClose}>
            Hủy
          </SoftButton>
          {!promotion && (
            <SoftButton
              variant="outlined"
              color="info"
              disabled={saving}
              onClick={() => save("DRAFT")}
            >
              Lưu nháp
            </SoftButton>
          )}
          <SoftButton
            variant="gradient"
            color="info"
            disabled={saving}
            onClick={() =>
              save(
                promotion
                  ? form.status
                  : new Date(form.startAt) > new Date()
                  ? "SCHEDULED"
                  : "ACTIVE"
              )
            }
          >
            {saving ? "Đang lưu..." : promotion ? "Lưu thay đổi" : "Lưu & kích hoạt"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function AssignVoucherModal({ promotion, open, onClose, onAssigned }) {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => {
      CustomerService.getAll({ search: search || undefined, page: 1, limit: 20 })
        .then((response) => setCustomers(response.data?.data || []))
        .catch(() => setCustomers([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [open, search]);
  const assign = async () => {
    if (!customerId) return toast.error("Vui lòng chọn khách hàng");
    try {
      setSaving(true);
      const response = await PromotionService.assignVoucher(promotion.id, customerId);
      toast.success(`Đã cấp voucher ${response.data?.data?.code || ""}`);
      setCustomerId("");
      onAssigned();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể cấp voucher");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "92%", md: 520 },
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 3,
        }}
      >
        <SoftTypography variant="h6" fontWeight="bold">
          Cấp voucher cho khách hàng
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {promotion?.name} · Còn{" "}
          {Math.max(0, Number(promotion?.quantity || 0) - Number(promotion?.activated || 0))}{" "}
          voucher
        </SoftTypography>
        <SoftBox mt={2}>
          <SoftInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã, tên hoặc số điện thoại..."
            icon={{ component: "search", direction: "left" }}
          />
        </SoftBox>
        <SoftBox mt={2}>
          <FormControl fullWidth size="small">
            <Select displayEmpty value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <MenuItem value="">Chọn khách hàng</MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.code} · {customer.name} · {customer.phone}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </SoftBox>
        <SoftBox display="flex" gap={1} mt={3}>
          <SoftButton fullWidth variant="outlined" color="secondary" onClick={onClose}>
            Hủy
          </SoftButton>
          <SoftButton fullWidth variant="gradient" color="info" disabled={saving} onClick={assign}>
            {saving ? "Đang cấp..." : "Cấp voucher"}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </Modal>
  );
}

function PromotionPerformance({ promotion, onClose }) {
  const [performance, setPerformance] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!promotion?.id) return;
    setLoading(true);
    Promise.all([
      PromotionService.getPerformance(promotion.id),
      PromotionService.getInvoices(promotion.id, { page: 1, limit: 20 }),
    ])
      .then(([performanceResponse, invoicesResponse]) => {
        setPerformance(performanceResponse.data?.data || {});
        const data = invoicesResponse.data?.data || [];
        setInvoices(Array.isArray(data) ? data : data.items || data.docs || []);
      })
      .catch((error) =>
        toast.error(error.response?.data?.message || "Không thể tải hiệu quả chương trình")
      )
      .finally(() => setLoading(false));
  }, [promotion]);
  return (
    <Modal open={Boolean(promotion)} onClose={onClose}>
      <SoftBox
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "95%", md: 780 },
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
        }}
      >
        <SoftTypography variant="h5" fontWeight="bold">
          Hiệu quả chương trình
        </SoftTypography>
        <SoftTypography variant="caption" color="text">
          {promotion?.code} · {promotion?.name}
        </SoftTypography>
        {loading ? (
          <SoftTypography display="block" mt={3}>
            Đang tải...
          </SoftTypography>
        ) : (
          <>
            <Grid container spacing={2} mt={1}>
              {[
                ["Số hóa đơn", performance.invoiceCount || 0],
                ["Doanh thu gộp", money(performance.grossRevenue)],
                ["Tổng tiền giảm", money(performance.discountAmount)],
                ["Doanh thu thuần", money(performance.netRevenue)],
                ["Khách hàng", performance.uniqueCustomers || 0],
              ].map(([label, value]) => (
                <Grid item xs={6} md key={label}>
                  <SoftBox p={2} bgcolor="#F8F9FA" borderRadius={2}>
                    <SoftTypography variant="caption" color="text">
                      {label}
                    </SoftTypography>
                    <SoftTypography variant="h6" fontWeight="bold">
                      {value}
                    </SoftTypography>
                  </SoftBox>
                </Grid>
              ))}
            </Grid>
            <SoftTypography variant="button" fontWeight="bold" display="block" mt={3} mb={1}>
              Hóa đơn đã áp dụng
            </SoftTypography>
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {["Mã HĐ", "Ngày", "Khách hàng", "Mã voucher", "Tổng tiền", "Đã giảm"].map(
                      (heading) => (
                        <th
                          key={heading}
                          style={{ padding: 10, textAlign: "left", fontSize: 12, color: "#6B7280" }}
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {!invoices.length && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{ padding: 30, textAlign: "center", color: "#9E9E9E" }}
                      >
                        Chưa có hóa đơn áp dụng
                      </td>
                    </tr>
                  )}
                  {invoices.map((invoice) => (
                    <tr key={invoice.id || invoice._id} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={{ padding: 10, fontSize: 13, fontWeight: 600 }}>{invoice.code}</td>
                      <td style={{ padding: 10, fontSize: 13 }}>
                        {new Date(invoice.date).toLocaleDateString("vi-VN")}
                      </td>
                      <td style={{ padding: 10, fontSize: 13 }}>
                        {invoice.customerId?.name || invoice.customer || "Khách lẻ"}
                      </td>
                      <td style={{ padding: 10, fontSize: 13 }}>{invoice.voucherCode || "—"}</td>
                      <td style={{ padding: 10, fontSize: 13 }}>
                        {money(invoice.grandTotal ?? invoice.totalAmount)}
                      </td>
                      <td style={{ padding: 10, fontSize: 13, color: "#2E7D32" }}>
                        {money(invoice.discountAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SoftBox>
          </>
        )}
        <SoftButton variant="outlined" color="secondary" fullWidth sx={{ mt: 3 }} onClick={onClose}>
          Đóng
        </SoftButton>
      </SoftBox>
    </Modal>
  );
}

export default function KhuyenMai() {
  const [promotions, setPromotions] = useState([]);
  const [summary, setSummary] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [meta, setMeta] = useState({ totalPages: 1, totalItems: 0 });
  const [selected, setSelected] = useState(null);
  const [voucherPromotion, setVoucherPromotion] = useState(null);
  const [performancePromotion, setPerformancePromotion] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPage(1), [debouncedSearch, status, type]);
  const load = () => {
    setLoading(true);
    Promise.all([
      PromotionService.getAll({
        search: debouncedSearch || undefined,
        status: status || undefined,
        type: type || undefined,
        page,
        limit: 20,
      }),
      PromotionService.getSummary(),
    ])
      .then(([listResponse, summaryResponse]) => {
        setPromotions(listResponse.data?.data || []);
        setMeta(listResponse.data?.meta || { totalPages: 1, totalItems: 0 });
        setSummary(summaryResponse.data?.data || {});
      })
      .catch((error) => {
        setPromotions([]);
        toast.error(error.response?.data?.message || "Không thể tải chương trình khuyến mãi");
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, debouncedSearch, status, type, refreshKey]);
  const refresh = (firstPage = false) => {
    if (firstPage) setPage(1);
    setRefreshKey((value) => value + 1);
  };
  const scopeLabel = (item) =>
    isGiftPromotion(item.type)
      ? `${(item.conditionGroups || []).length} nhóm điều kiện · ${
          (item.giftGroups || []).length
        } nhóm quà`
      : item.scope === "ALL"
      ? "Tất cả sản phẩm"
      : item.scope === "CATEGORY"
      ? `${(item.categoryIds || []).length} danh mục`
      : item.scope === "PRODUCT_TYPE"
      ? `Loại: ${item.productType || "—"}`
      : `${(item.productIds || []).length} sản phẩm`;
  const editPromotion = async (item) => {
    try {
      const response = await PromotionService.getById(item.id);
      setSelected(response.data?.data);
      setOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải chi tiết chương trình");
    }
  };
  const nextStatus = (item) => {
    const now = new Date();
    const started = now >= new Date(item.startAt);
    const notEnded = now <= new Date(item.endAt);
    if (item.status === "ACTIVE") return "PAUSED";
    if (item.status === "PAUSED") return started && notEnded ? "ACTIVE" : null;
    if (item.status === "DRAFT")
      return started && notEnded ? "ACTIVE" : !started ? "SCHEDULED" : null;
    if (item.status === "SCHEDULED") return started && notEnded ? "ACTIVE" : "PAUSED";
    return null;
  };
  const changeStatus = async (item) => {
    const next = nextStatus(item);
    if (!next) return;
    try {
      await PromotionService.changeStatus(item.id, next);
      toast.success(
        next === "ACTIVE"
          ? "Đã kích hoạt chương trình"
          : next === "SCHEDULED"
          ? "Đã lên lịch chương trình"
          : "Đã tạm dừng chương trình"
      );
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể đổi trạng thái chương trình");
    }
  };
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
          {[
            ["Tổng chương trình", summary.totalPrograms || 0, "local_offer", "#1565C0"],
            ["Đang chạy", summary.active || 0, "play_circle", "#2E7D32"],
            ["Sắp diễn ra", summary.scheduled || 0, "schedule", "#7B1FA2"],
            ["Voucher đã dùng", summary.usedVouchers || 0, "confirmation_number", "#E65100"],
          ].map(([label, value, icon, color]) => (
            <Card key={label} sx={{ flex: 1, minWidth: 180 }}>
              <SoftBox p={2.5} display="flex" gap={2} alignItems="center">
                <Icon sx={{ color }}>{icon}</Icon>
                <SoftBox>
                  <SoftTypography variant="caption">{label}</SoftTypography>
                  <SoftTypography variant="h5" fontWeight="bold" sx={{ color }}>
                    {value}
                  </SoftTypography>
                </SoftBox>
              </SoftBox>
            </Card>
          ))}
        </SoftBox>
        <Card>
          <SoftBox p={3}>
            <SoftBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <SoftBox>
                <SoftTypography variant="h5" fontWeight="bold">
                  Chương trình khuyến mãi
                </SoftTypography>
                <SoftTypography variant="caption" color="text">
                  Gói ưu đãi theo danh mục, loại và sản phẩm
                </SoftTypography>
              </SoftBox>
              <SoftButton
                color="info"
                variant="gradient"
                startIcon={<Icon>add</Icon>}
                onClick={() => {
                  setSelected(null);
                  setOpen(true);
                }}
              >
                Tạo chương trình
              </SoftButton>
            </SoftBox>
            <SoftBox display="flex" gap={2} mb={3} flexWrap="wrap">
              <SoftBox sx={{ flex: 1, minWidth: 230 }}>
                <SoftInput
                  placeholder="Tìm mã hoặc tên chương trình..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  icon={{ component: "search", direction: "left" }}
                />
              </SoftBox>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select displayEmpty value={status} onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="">Mọi trạng thái</MenuItem>
                  {Object.entries(statusStyle).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value[0]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 170 }}>
                <Select displayEmpty value={type} onChange={(e) => setType(e.target.value)}>
                  <MenuItem value="">Mọi cơ chế</MenuItem>
                  <MenuItem value="VOUCHER">Voucher</MenuItem>
                  <MenuItem value="AUTO_DISCOUNT">Tự động giảm giá</MenuItem>
                </Select>
              </FormControl>
            </SoftBox>
            <SoftBox sx={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F8F9FA" }}>
                    {[
                      "Chương trình",
                      "Ưu đãi",
                      "Phạm vi",
                      "Thời gian",
                      "Đã cấp / Đã dùng",
                      "Trạng thái",
                      "",
                    ].map((item, index) => (
                      <th
                        key={`${item}-${index}`}
                        style={{ padding: 10, textAlign: "left", fontSize: 12, color: "#6B7280" }}
                      >
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 30 }}>
                        Đang tải...
                      </td>
                    </tr>
                  )}
                  {!loading && promotions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{ textAlign: "center", padding: 30, color: "#9E9E9E" }}
                      >
                        Không tìm thấy chương trình
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    promotions.map((item) => {
                      const next = nextStatus(item);
                      const canAssign =
                        item.type === "VOUCHER" &&
                        ["ACTIVE", "SCHEDULED"].includes(item.status) &&
                        Number(item.activated) < Number(item.quantity);
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: 10 }}>
                            <SoftTypography variant="button" fontWeight="bold">
                              {item.name}
                            </SoftTypography>
                            <SoftTypography variant="caption" color="text" display="block">
                              {item.code} ·{" "}
                              {item.type === "VOUCHER"
                                ? "Voucher"
                                : item.type === "AUTO_DISCOUNT"
                                ? "Tự động giảm giá"
                                : item.type === "BUY_X_GET_Y"
                                ? "Mua X tặng Y"
                                : "Gói tặng quà"}
                            </SoftTypography>
                          </td>
                          <td style={{ padding: 10, fontSize: 13, fontWeight: 600 }}>
                            {isGiftPromotion(item.type)
                              ? `Tặng ${(item.giftGroups || []).length} nhóm quà`
                              : item.discountType === "PERCENT"
                              ? `${item.discountValue}%${
                                  item.maxDiscount ? ` · tối đa ${money(item.maxDiscount)}` : ""
                                }`
                              : money(item.discountValue)}
                            {!isGiftPromotion(item.type) && (
                              <>
                                <br />
                                <span style={{ fontSize: 11, color: "#6B7280" }}>
                                  Đơn từ {money(item.minOrderValue)}
                                </span>
                              </>
                            )}
                          </td>
                          <td style={{ padding: 10, fontSize: 13 }}>{scopeLabel(item)}</td>
                          <td style={{ padding: 10, fontSize: 12 }}>
                            {new Date(item.startAt).toLocaleString("vi-VN")}
                            <br />→ {new Date(item.endAt).toLocaleString("vi-VN")}
                          </td>
                          <td style={{ padding: 10, fontSize: 13 }}>
                            {item.activated || 0} / <b>{item.used || 0}</b>
                            {item.type === "VOUCHER" && (
                              <span style={{ fontSize: 11, color: "#6B7280" }}>
                                {" "}
                                / {item.quantity}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: 10 }}>{pill(item.status)}</td>
                          <td style={{ padding: 10, whiteSpace: "nowrap" }}>
                            <Tooltip title="Hiệu quả và hóa đơn áp dụng">
                              <IconButton onClick={() => setPerformancePromotion(item)}>
                                <Icon sx={{ color: "#2E7D32" }}>analytics</Icon>
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Chỉnh sửa">
                              <IconButton onClick={() => editPromotion(item)}>
                                <Icon color="info">edit</Icon>
                              </IconButton>
                            </Tooltip>
                            {item.type === "VOUCHER" && (
                              <Tooltip
                                title={
                                  canAssign
                                    ? "Cấp voucher cho khách"
                                    : "Không thể cấp voucher lúc này"
                                }
                              >
                                <span>
                                  <IconButton
                                    disabled={!canAssign}
                                    onClick={() => setVoucherPromotion(item)}
                                  >
                                    <Icon sx={{ color: canAssign ? "#7B1FA2" : "#BDBDBD" }}>
                                      confirmation_number
                                    </Icon>
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            <Tooltip
                              title={
                                next
                                  ? next === "ACTIVE"
                                    ? "Kích hoạt"
                                    : next === "SCHEDULED"
                                    ? "Lên lịch"
                                    : "Tạm dừng"
                                  : "Không thể đổi trạng thái"
                              }
                            >
                              <span>
                                <IconButton disabled={!next} onClick={() => changeStatus(item)}>
                                  <Icon
                                    sx={{
                                      color: !next
                                        ? "#BDBDBD"
                                        : item.status === "ACTIVE" ||
                                          (item.status === "SCHEDULED" && next === "PAUSED")
                                        ? "#E65100"
                                        : "#2E7D32",
                                    }}
                                  >
                                    {next === "PAUSED"
                                      ? "pause_circle"
                                      : next === "SCHEDULED"
                                      ? "schedule"
                                      : "play_circle"}
                                  </Icon>
                                </IconButton>
                              </span>
                            </Tooltip>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </SoftBox>
            {meta.totalPages > 1 && (
              <SoftBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
                <SoftTypography variant="caption" color="text">
                  Tổng {meta.totalItems} chương trình
                </SoftTypography>
                <Pagination
                  page={page}
                  count={meta.totalPages}
                  color="primary"
                  onChange={(_, value) => setPage(value)}
                />
              </SoftBox>
            )}
          </SoftBox>
        </Card>
      </SoftBox>
      <PromotionForm
        open={open}
        promotion={selected}
        onClose={() => setOpen(false)}
        onSaved={(created) => refresh(created)}
      />
      <AssignVoucherModal
        promotion={voucherPromotion}
        open={Boolean(voucherPromotion)}
        onClose={() => setVoucherPromotion(null)}
        onAssigned={() => refresh()}
      />
      <PromotionPerformance
        promotion={performancePromotion}
        onClose={() => setPerformancePromotion(null)}
      />
    </DashboardLayout>
  );
}
