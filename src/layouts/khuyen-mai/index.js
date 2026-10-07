import { useCallback, useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import Tooltip from "@mui/material/Tooltip";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftInput from "components/SoftInput";
import SoftButton from "components/SoftButton";
import EntityThumbnail from "components/EntityThumbnail";
import MobileLoadMore from "components/MobileLoadMore";
import { CategoryService, ProductService, TruckService } from "services/warehouseService";
import {
  CustomerService,
  PromotionActivationService,
  PromotionService,
  PRODUCT_TYPES,
} from "services/crmService";
import EmployeeService from "services/employeeService";
import { downloadBlob } from "utils/excel";
import { toast } from "react-toastify";
import { mergeUniqueItems } from "utils/infiniteList";

const money = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value) || 0);
const copyText = async (value) => {
  const text = String(value || "");
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
};
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
const listData = (response) => {
  const value = response?.data?.data ?? response?.data;
  return Array.isArray(value) ? value : value?.items || value?.docs || [];
};
const loadAllOptions = async (request) => {
  const first = await request({ page: 1, limit: 100 });
  const totalPages = Number(first?.data?.meta?.totalPages || 1);
  if (totalPages <= 1) return listData(first);
  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => request({ page: index + 2, limit: 100 }))
  );
  return [...listData(first), ...remaining.flatMap(listData)];
};
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

const localDateTimeValue = (date) => {
  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const advancedVoucherDefaults = () => {
  const start = new Date();
  const end = new Date(start.getTime() + 30 * 86400000);
  return {
    code: "",
    name: "",
    voucherAudience: "SHARED",
    customer: null,
    discountType: "FIXED",
    discountValue: 50000,
    maxDiscount: 50000,
    minOrderValue: 500000,
    budgetLimit: 5000000,
    totalUsageLimit: 100,
    maxUsesPerVoucher: 1,
    usageLimitPerCustomer: 1,
    allowStacking: false,
    scope: "ALL",
    categoryIds: [],
    productIds: [],
    excludedCategoryIds: [],
    excludedProductIds: [],
    eligibleCustomerSegments: [],
    inactiveMonths: 0,
    conversionType: "NONE",
    conversionCost: 0,
    startAt: localDateTimeValue(start),
    endAt: localDateTimeValue(end),
    dynamicExpiryDays: 0,
    allowedWeekdays: [],
    dailyStartTime: "",
    dailyEndTime: "",
    customizeBudget: false,
    customizeUsage: false,
    useConversion: false,
    customizeScope: false,
    useExclusions: false,
    useTargeting: false,
    useWinBack: false,
    useValidity: false,
    useDynamicExpiry: false,
    useWeeklySchedule: false,
  };
};

function VoucherFieldTitle({ children, help, required = false }) {
  return (
    <SoftBox display="flex" alignItems="center" gap={0.35} mb={0.35}>
      <SoftTypography variant="caption" fontWeight="medium">
        {children}
        {required ? " *" : ""}
      </SoftTypography>
      {help && (
        <Tooltip title={help} arrow placement="top">
          <Icon
            titleAccess={help}
            sx={{ color: "#98a2b3", fontSize: "16px !important", cursor: "help" }}
          >
            help_outline
          </Icon>
        </Tooltip>
      )}
    </SoftBox>
  );
}

function VoucherOption({ checked, onChange, label, help }) {
  return (
    <SoftBox
      border="1px solid"
      borderColor={checked ? "#17a2b8" : "#e4e7ec"}
      bgcolor={checked ? "#f0fbfd" : "#fff"}
      borderRadius={2}
      px={1.25}
    >
      <FormControlLabel
        sx={{ m: 0, minHeight: 44 }}
        control={
          <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />
        }
        label={
          <SoftBox display="flex" alignItems="center" gap={0.5}>
            <SoftTypography variant="button" fontWeight="medium">
              {label}
            </SoftTypography>
            {help && (
              <Tooltip title={help} arrow placement="top">
                <Icon sx={{ color: "#98a2b3", fontSize: "16px !important", cursor: "help" }}>
                  help_outline
                </Icon>
              </Tooltip>
            )}
          </SoftBox>
        }
      />
    </SoftBox>
  );
}
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

function MultiSelectField({ value, onChange, options, placeholder, showImages = false }) {
  const safeValue = Array.isArray(value) ? value : [];
  const safeOptions = Array.isArray(options) ? options : [];
  return (
    <FormControl fullWidth size="small">
      <Select
        multiple
        value={safeValue}
        onChange={(event) => onChange(event.target.value)}
        displayEmpty
        renderValue={(selected) => {
          if (!Array.isArray(selected) || !selected.length) return placeholder;
          const selectedItems = selected
            .map((id) => safeOptions.find((item) => String(item.id || item._id) === String(id)))
            .filter(Boolean);
          return (
            <SoftBox display="flex" alignItems="center" gap={0.65} minWidth={0}>
              {showImages &&
                selectedItems
                  .slice(0, 3)
                  .map((item) => (
                    <EntityThumbnail key={item.id || item._id} entity={item} size={26} />
                  ))}
              <SoftTypography variant="caption" noWrap>
                {selectedItems.map((item) => item.name).join(", ")}
              </SoftTypography>
            </SoftBox>
          );
        }}
      >
        {safeOptions.map((item) => (
          <MenuItem key={item.id || item._id} value={item.id || item._id}>
            <SoftBox display="flex" alignItems="center" gap={1}>
              {showImages && <EntityThumbnail entity={item} size={36} />}
              <span>{item.name}</span>
            </SoftBox>
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
                    showImages
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
                        showImages
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
                showImages
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
                showImages
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
  const [issuedVoucher, setIssuedVoucher] = useState(null);
  useEffect(() => {
    if (!open) return undefined;
    setIssuedVoucher(null);
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
      const code = response.data?.data?.code || "";
      const customer = customers.find((item) => String(item.id || item._id) === String(customerId));
      setIssuedVoucher({ code, customerName: customer?.name || "Khách hàng" });
      toast.success(`Đã cấp voucher ${code}`);
      setCustomerId("");
      onAssigned();
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
        {issuedVoucher && (
          <SoftBox
            mt={2}
            p={2}
            borderRadius={2.5}
            bgcolor="#e8f5e9"
            sx={{ border: "2px solid #43a047" }}
          >
            <SoftTypography variant="caption" color="success" fontWeight="bold">
              MÃ VOUCHER ĐÃ CẤP
            </SoftTypography>
            <SoftTypography
              variant="h4"
              fontWeight="bold"
              sx={{ letterSpacing: 1.2, wordBreak: "break-all" }}
            >
              {issuedVoucher.code}
            </SoftTypography>
            <SoftTypography variant="caption" color="text" display="block" mb={1}>
              {issuedVoucher.customerName}
            </SoftTypography>
            <SoftButton
              fullWidth
              color="success"
              variant="gradient"
              onClick={async () => {
                await copyText(issuedVoucher.code);
                toast.success("Đã sao chép mã voucher");
              }}
            >
              <Icon>content_copy</Icon>&nbsp;Sao chép mã
            </SoftButton>
          </SoftBox>
        )}
        {!issuedVoucher && (
          <SoftBox mt={2}>
            <SoftInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã, tên hoặc số điện thoại..."
              icon={{ component: "search", direction: "left" }}
            />
          </SoftBox>
        )}
        {!issuedVoucher && (
          <SoftBox mt={2}>
            <FormControl fullWidth size="small">
              <Select
                displayEmpty
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <MenuItem value="">Chọn khách hàng</MenuItem>
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.code} · {customer.name} · {customer.phone}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </SoftBox>
        )}
        <SoftBox display="flex" gap={1} mt={3}>
          <SoftButton fullWidth variant="outlined" color="secondary" onClick={onClose}>
            {issuedVoucher ? "Đóng" : "Hủy"}
          </SoftButton>
          {!issuedVoucher && (
            <SoftButton
              fullWidth
              variant="gradient"
              color="info"
              disabled={saving}
              onClick={assign}
            >
              {saving ? "Đang cấp..." : "Cấp voucher"}
            </SoftButton>
          )}
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

function AdvancedVoucherCreator({ products, categories, customers, onCreated }) {
  const [form, setForm] = useState(advancedVoucherDefaults);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [createdVoucher, setCreatedVoucher] = useState(null);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const normalizeCode = (value) =>
    String(value || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/Đ/g, "D")
      .replace(/[^A-Z0-9_-]+/g, "");

  const stepOneComplete =
    normalizeCode(form.code).length >= 3 &&
    form.name.trim().length >= 3 &&
    (form.voucherAudience === "SHARED" || Boolean(form.customer));
  const stepTwoComplete =
    Number(form.discountValue) > 0 &&
    Number(form.minOrderValue) > 0 &&
    (form.discountType !== "PERCENT" || Number(form.maxDiscount) > 0);
  const goToStep = (nextStep) => {
    if (nextStep === 2 && !stepOneComplete)
      return toast.info("Điền đủ mã, tên và đối tượng nhận voucher trước khi tiếp tục");
    if (nextStep === 3 && !stepTwoComplete)
      return toast.info("Điền đủ mức giảm và đơn hàng tối thiểu trước khi tiếp tục");
    setStep(nextStep);
  };

  const save = async () => {
    const code = normalizeCode(form.code);
    if (!code || !form.name.trim()) return toast.error("Vui lòng nhập mã và tên voucher");
    if (form.voucherAudience === "CUSTOMER" && !form.customer)
      return toast.error("Vui lòng chọn khách hàng được cấp voucher");
    if (Number(form.minOrderValue) <= 0)
      return toast.error("Giá trị đơn hàng tối thiểu là bắt buộc");
    if (Number(form.discountValue) <= 0) return toast.error("Mức giảm phải lớn hơn 0");
    if (form.discountType === "PERCENT" && Number(form.maxDiscount) <= 0)
      return toast.error("Giảm theo phần trăm phải có số tiền giảm tối đa");
    if (form.customizeBudget && Number(form.budgetLimit) <= 0)
      return toast.error("Vui lòng nhập ngân sách chiến dịch lớn hơn 0");
    if (form.customizeUsage && Number(form.usageLimitPerCustomer) < 1)
      return toast.error("Lượt dùng mỗi khách phải từ 1 trở lên");
    if (form.useConversion && form.conversionType === "NONE")
      return toast.error("Vui lòng chọn nguồn điểm hoặc coin cần quy đổi");
    if (form.useConversion && Number(form.conversionCost) <= 0)
      return toast.error("Số điểm/coin cần quy đổi phải lớn hơn 0");
    if (form.customizeScope && form.scope === "CATEGORY" && !form.categoryIds.length)
      return toast.error("Vui lòng chọn ít nhất một danh mục áp dụng");
    if (form.customizeScope && form.scope === "PRODUCTS" && !form.productIds.length)
      return toast.error("Vui lòng chọn ít nhất một sản phẩm áp dụng");
    if (form.useTargeting && !form.eligibleCustomerSegments.length)
      return toast.error("Vui lòng chọn ít nhất một nhóm khách hàng");
    if (form.useWinBack && Number(form.inactiveMonths) <= 0)
      return toast.error("Số tháng khách chưa mua hàng phải lớn hơn 0");
    if (form.useValidity && form.useDynamicExpiry && Number(form.dynamicExpiryDays) <= 0)
      return toast.error("Hạn sử dụng kể từ ngày cấp phải lớn hơn 0");
    if (
      form.useValidity &&
      form.useWeeklySchedule &&
      Boolean(form.dailyStartTime) !== Boolean(form.dailyEndTime)
    )
      return toast.error("Vui lòng nhập đủ giờ bắt đầu và giờ kết thúc");
    if (
      form.useValidity &&
      form.useWeeklySchedule &&
      form.dailyStartTime &&
      form.dailyEndTime &&
      form.dailyEndTime <= form.dailyStartTime
    )
      return toast.error("Giờ kết thúc phải sau giờ bắt đầu");
    if (form.useValidity && new Date(form.endAt) <= new Date(form.startAt))
      return toast.error("Thời gian kết thúc phải sau thời gian bắt đầu");
    try {
      setSaving(true);
      const unlimitedStart = "2000-01-01T00:00:00.000Z";
      const unlimitedEnd = "2099-12-31T23:59:59.999Z";
      const effectiveStart = form.useValidity
        ? new Date(form.startAt).toISOString()
        : unlimitedStart;
      const effectiveEnd = form.useValidity ? new Date(form.endAt).toISOString() : unlimitedEnd;
      const startsLater = new Date(effectiveStart).getTime() > Date.now();
      const payload = {
        code,
        name: form.name.trim(),
        type: "VOUCHER",
        advancedVoucher: true,
        voucherAudience: form.voucherAudience,
        initialCustomerId: form.voucherAudience === "CUSTOMER" ? idOf(form.customer) : undefined,
        sharedCode: form.voucherAudience === "SHARED" ? code : undefined,
        voucherPrefix: `${code.replace(/[^A-Z0-9]/g, "").slice(0, 7)}-`,
        quantity: form.voucherAudience === "SHARED" ? 1 : Math.max(1, Number(form.totalUsageLimit)),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscount:
          form.discountType === "PERCENT"
            ? Number(form.maxDiscount)
            : Number(form.maxDiscount || 0),
        minOrderValue: Number(form.minOrderValue),
        budgetLimit: form.customizeBudget ? Number(form.budgetLimit || 0) : 0,
        totalUsageLimit: form.customizeUsage ? Number(form.totalUsageLimit || 0) : 0,
        maxUsesPerVoucher: form.customizeUsage ? Number(form.maxUsesPerVoucher || 0) : 0,
        usageLimitPerCustomer: form.customizeUsage ? Number(form.usageLimitPerCustomer || 1) : 1,
        allowStacking: Boolean(form.allowStacking),
        scope: form.customizeScope ? form.scope : "ALL",
        categoryIds:
          form.customizeScope && form.scope === "CATEGORY" ? form.categoryIds.map(idOf) : [],
        productIds:
          form.customizeScope && form.scope === "PRODUCTS" ? form.productIds.map(idOf) : [],
        excludedCategoryIds: form.useExclusions ? form.excludedCategoryIds.map(idOf) : [],
        excludedProductIds: form.useExclusions ? form.excludedProductIds.map(idOf) : [],
        eligibleCustomerSegments: form.useTargeting ? form.eligibleCustomerSegments : [],
        inactiveMonths: form.useWinBack ? Number(form.inactiveMonths || 0) : 0,
        conversionType: form.useConversion ? form.conversionType : "NONE",
        conversionCost:
          form.useConversion && form.conversionType !== "NONE"
            ? Number(form.conversionCost || 0)
            : 0,
        dynamicExpiryDays:
          form.useValidity && form.useDynamicExpiry ? Number(form.dynamicExpiryDays || 0) : 0,
        allowedWeekdays:
          form.useValidity && form.useWeeklySchedule ? form.allowedWeekdays.map(Number) : [],
        dailyStartTime:
          form.useValidity && form.useWeeklySchedule ? form.dailyStartTime || undefined : undefined,
        dailyEndTime:
          form.useValidity && form.useWeeklySchedule ? form.dailyEndTime || undefined : undefined,
        startAt: effectiveStart,
        endAt: effectiveEnd,
        status: startsLater ? "SCHEDULED" : "ACTIVE",
      };
      const response = await PromotionService.create(payload);
      const promotion = response.data?.data;
      const issuedCode =
        form.voucherAudience === "SHARED" ? code : promotion?.initialVoucherCode || code;
      setCreatedVoucher({
        code: issuedCode,
        name: form.name.trim(),
        customerName: form.voucherAudience === "CUSTOMER" ? form.customer?.name : "Mã dùng chung",
      });
      toast.success(
        form.voucherAudience === "SHARED"
          ? `Đã tạo voucher dùng chung ${code}`
          : `Đã tạo voucher ${promotion?.initialVoucherCode || ""} cho ${form.customer.name}`
      );
      setForm(advancedVoucherDefaults());
      setStep(1);
      onCreated?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tạo voucher giảm giá");
    } finally {
      setSaving(false);
    }
  };

  const segmentOptions = [
    ["NEW_CUSTOMER", "Khách hàng mới"],
    ["ACTIVE", "Khách đang hoạt động"],
    ["HIGHLY_ACTIVE", "Khách VIP / hoạt động cao"],
    ["TEMPORARILY_INACTIVE", "Tạm ngưng mua"],
    ["STOPPED_BUYING", "Đã ngừng mua"],
    ["CHURNED", "Khách ngủ đông"],
  ];
  const weekdayOptions = [
    [1, "T2"],
    [2, "T3"],
    [3, "T4"],
    [4, "T5"],
    [5, "T6"],
    [6, "T7"],
    [0, "CN"],
  ];

  return (
    <SoftBox mt={2}>
      {createdVoucher && (
        <SoftBox
          p={{ xs: 1.5, md: 2 }}
          mb={2}
          borderRadius={2.5}
          bgcolor="#e8f5e9"
          sx={{ border: "2px solid #43a047" }}
        >
          <SoftTypography variant="button" fontWeight="bold" color="success">
            VOUCHER ĐÃ CẤP THÀNH CÔNG
          </SoftTypography>
          <SoftBox
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap={1}
            flexWrap="wrap"
            mt={0.75}
          >
            <SoftBox>
              <SoftTypography
                variant="h4"
                fontWeight="bold"
                color="dark"
                sx={{ letterSpacing: 1.2, wordBreak: "break-all" }}
              >
                {createdVoucher.code}
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                {createdVoucher.name} · {createdVoucher.customerName}
              </SoftTypography>
            </SoftBox>
            <SoftButton
              color="success"
              variant="gradient"
              onClick={async () => {
                await copyText(createdVoucher.code);
                toast.success("Đã sao chép mã voucher");
              }}
            >
              <Icon>content_copy</Icon>&nbsp;Sao chép mã
            </SoftButton>
          </SoftBox>
        </SoftBox>
      )}
      <SoftBox p={1.5} mb={2} borderRadius={2} bgcolor="#eef6ff">
        <SoftTypography variant="button" fontWeight="bold" color="info">
          Voucher giảm giá nâng cao
        </SoftTypography>
        <SoftTypography variant="caption" color="text" display="block">
          Kiểm soát đơn tối thiểu, ngân sách, lượt dùng, đối tượng và phạm vi sản phẩm trước khi
          phát hành.
        </SoftTypography>
        <SoftBox display="flex" gap={0.75} mt={1.25} flexWrap="wrap">
          {["Thông tin", "Mức giảm", "Giới hạn", "Đối tượng", "Thời gian"].map((label, index) => (
            <SoftBox
              key={label}
              px={1.1}
              py={0.45}
              borderRadius={5}
              bgcolor={step === index + 1 ? "#1677ff" : step > index + 1 ? "#d9f7e8" : "#fff"}
              color={step === index + 1 ? "#fff" : step > index + 1 ? "#157347" : "#667085"}
              sx={{ fontSize: 12, fontWeight: 700 }}
            >
              {step > index + 1 ? "✓ " : `${index + 1}. `}
              {label}
            </SoftBox>
          ))}
        </SoftBox>
      </SoftBox>

      {step >= 1 && (
        <>
          <SoftTypography variant="button" fontWeight="bold">
            1. Mã và đối tượng sử dụng
          </SoftTypography>
          <SoftTypography variant="caption" color="text" display="block" mt={0.25}>
            Điền lần lượt các thông tin bắt buộc. Trường tiếp theo sẽ tự hiện khi dữ liệu trước đó
            hợp lệ.
          </SoftTypography>
          <Grid container spacing={1.25} mt={0.25}>
            <Grid item xs={12} md={3}>
              <VoucherFieldTitle
                required
                help="Mã khách hoặc nhân viên nhập khi áp dụng voucher. Tối thiểu 3 ký tự, không dấu và không có khoảng trắng."
              >
                Mã voucher
              </VoucherFieldTitle>
              <SoftInput
                value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="MOTUL50"
              />
            </Grid>
            {normalizeCode(form.code).length >= 3 && (
              <Grid item xs={12} md={5}>
                <VoucherFieldTitle
                  required
                  help="Tên nội bộ giúp nhân viên nhận biết mục đích của chương trình."
                >
                  Tên chiến dịch
                </VoucherFieldTitle>
                <SoftInput
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Giảm giá khách hàng thân thiết"
                />
              </Grid>
            )}
            {form.name.trim().length >= 3 && (
              <Grid item xs={12} md={4}>
                <VoucherFieldTitle
                  required
                  help="Mã dùng chung có thể áp dụng cho nhiều khách. Mã riêng chỉ cấp cho khách hàng được chọn."
                >
                  Cách phát hành
                </VoucherFieldTitle>
                <Select
                  fullWidth
                  size="small"
                  value={form.voucherAudience}
                  onChange={(e) => set("voucherAudience", e.target.value)}
                >
                  <MenuItem value="SHARED">Một mã dùng chung</MenuItem>
                  <MenuItem value="CUSTOMER">Mã riêng cho khách hàng</MenuItem>
                </Select>
              </Grid>
            )}
            {form.name.trim().length >= 3 && form.voucherAudience === "CUSTOMER" && (
              <Grid item xs={12}>
                <VoucherFieldTitle
                  required
                  help="Tìm bằng mã, tên hoặc số điện thoại để tránh cấp nhầm voucher."
                >
                  Khách hàng nhận voucher
                </VoucherFieldTitle>
                <Autocomplete
                  options={customers}
                  value={form.customer}
                  onChange={(_, value) => set("customer", value)}
                  getOptionLabel={(item) =>
                    [item.code, item.name, item.phone].filter(Boolean).join(" · ")
                  }
                  isOptionEqualToValue={(option, value) => idOf(option) === idOf(value)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Tìm mã, tên hoặc số điện thoại" />
                  )}
                />
                {form.customer && (
                  <SoftTypography variant="caption" color="text">
                    Điểm HĐ: {Number(form.customer.invoiceCoinBalance || 0).toLocaleString("vi-VN")}{" "}
                    · Coin PlusEx:{" "}
                    {Number(form.customer.plusExCoinBalance || 0).toLocaleString("vi-VN")}
                  </SoftTypography>
                )}
              </Grid>
            )}
          </Grid>

          {step === 1 && (
            <SoftBox mt={2} display="flex" justifyContent="flex-end">
              <SoftButton color="info" disabled={!stepOneComplete} onClick={() => goToStep(2)}>
                Tiếp tục: Mức giảm&nbsp;<Icon>arrow_forward</Icon>
              </SoftButton>
            </SoftBox>
          )}
        </>
      )}

      {step >= 2 && (
        <>
          <SoftBox mt={2}>
            <SoftTypography variant="button" fontWeight="bold">
              2. Mức giảm và bảo vệ lợi nhuận
            </SoftTypography>
          </SoftBox>
          <Grid container spacing={1.25} mt={0.25}>
            <Grid item xs={12} sm={6} md={3}>
              <VoucherFieldTitle
                required
                help="Chọn giảm một số tiền cố định hoặc giảm theo phần trăm giá trị hàng đủ điều kiện."
              >
                Loại giảm
              </VoucherFieldTitle>
              <Select
                fullWidth
                size="small"
                value={form.discountType}
                onChange={(e) => set("discountType", e.target.value)}
              >
                <MenuItem value="FIXED">Số tiền cụ thể</MenuItem>
                <MenuItem value="PERCENT">Phần trăm hóa đơn</MenuItem>
              </Select>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <VoucherFieldTitle
                required
                help="Mức tiền hoặc tỷ lệ phần trăm được trừ khỏi hóa đơn."
              >
                {form.discountType === "PERCENT" ? "% giảm" : "Số tiền giảm"}
              </VoucherFieldTitle>
              <SoftInput
                type="number"
                value={form.discountValue}
                onChange={(e) => set("discountValue", e.target.value)}
              />
            </Grid>
            {Number(form.discountValue) > 0 && (
              <Grid item xs={12} sm={6} md={3}>
                <VoucherFieldTitle
                  required
                  help="Hóa đơn phải đạt giá trị này mới được dùng voucher, giúp bảo vệ biên lợi nhuận."
                >
                  Đơn hàng tối thiểu
                </VoucherFieldTitle>
                <SoftInput
                  type="number"
                  value={form.minOrderValue}
                  onChange={(e) => set("minOrderValue", e.target.value)}
                />
              </Grid>
            )}
            {form.discountType === "PERCENT" && Number(form.minOrderValue) > 0 && (
              <Grid item xs={12} sm={6} md={3}>
                <VoucherFieldTitle
                  required
                  help="Số tiền giảm cao nhất trên một hóa đơn, kể cả khi tỷ lệ phần trăm tính ra cao hơn."
                >
                  Giảm tối đa
                </VoucherFieldTitle>
                <SoftInput
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => set("maxDiscount", e.target.value)}
                />
              </Grid>
            )}
            {stepTwoComplete && (
              <Grid item xs={12} md={6}>
                <VoucherOption
                  checked={form.customizeBudget}
                  onChange={(value) => set("customizeBudget", value)}
                  label="Cần giới hạn ngân sách chiến dịch"
                  help="Tự ngừng voucher khi lần giảm tiếp theo làm vượt tổng ngân sách đã đặt."
                />
              </Grid>
            )}
            {stepTwoComplete && (
              <Grid item xs={12} md={6}>
                <VoucherOption
                  checked={form.allowStacking}
                  onChange={(value) => set("allowStacking", value)}
                  label="Cho phép cộng dồn với ưu đãi khác"
                  help="Bật nếu voucher có thể dùng chung với chương trình hoặc quà tặng khác trên cùng hóa đơn."
                />
              </Grid>
            )}
            {stepTwoComplete && form.customizeBudget && (
              <Grid item xs={12} md={6}>
                <VoucherFieldTitle
                  required
                  help="Tổng số tiền tối đa doanh nghiệp chấp nhận giảm cho toàn chiến dịch."
                >
                  Ngân sách chiến dịch
                </VoucherFieldTitle>
                <SoftInput
                  type="number"
                  value={form.budgetLimit}
                  onChange={(e) => set("budgetLimit", e.target.value)}
                />
              </Grid>
            )}
          </Grid>

          {step === 2 && (
            <SoftBox mt={2} display="flex" justifyContent="space-between">
              <SoftButton variant="outlined" color="secondary" onClick={() => setStep(1)}>
                Quay lại
              </SoftButton>
              <SoftButton color="info" disabled={!stepTwoComplete} onClick={() => goToStep(3)}>
                Tiếp tục: Giới hạn&nbsp;<Icon>arrow_forward</Icon>
              </SoftButton>
            </SoftBox>
          )}
        </>
      )}

      {step >= 3 && (
        <>
          <SoftBox mt={2}>
            <SoftTypography variant="button" fontWeight="bold">
              3. Lượt dùng và quy đổi điểm
            </SoftTypography>
          </SoftBox>
          <Grid container spacing={1.25} mt={0.25}>
            <Grid item xs={12} md={6}>
              <VoucherOption
                checked={form.customizeUsage}
                onChange={(value) => set("customizeUsage", value)}
                label="Cần tùy chỉnh giới hạn lượt dùng"
                help="Nếu không bật, voucher mặc định dùng một lần cho mỗi khách; tổng chiến dịch và mỗi mã không giới hạn."
              />
            </Grid>
            {form.voucherAudience === "CUSTOMER" && (
              <Grid item xs={12} md={6}>
                <VoucherOption
                  checked={form.useConversion}
                  onChange={(value) => {
                    set("useConversion", value);
                    if (!value) set("conversionType", "NONE");
                  }}
                  label="Cần quy đổi điểm hoặc coin"
                  help="Điểm/coin bị trừ ngay khi phát hành voucher riêng cho khách, không phải khi dùng hóa đơn."
                />
              </Grid>
            )}
            {form.customizeUsage && (
              <Grid item xs={12} sm={6} md={4}>
                <VoucherFieldTitle help="Tổng lượt sử dụng của toàn chiến dịch; nhập 0 nếu không giới hạn.">
                  Tổng lượt dùng
                </VoucherFieldTitle>
                <SoftInput
                  type="number"
                  value={form.totalUsageLimit}
                  onChange={(e) => set("totalUsageLimit", e.target.value)}
                />
              </Grid>
            )}
            {form.customizeUsage && (
              <Grid item xs={12} sm={6} md={4}>
                <VoucherFieldTitle help="Số lần tối đa một khách hàng được dùng voucher này.">
                  Lượt dùng mỗi khách
                </VoucherFieldTitle>
                <SoftInput
                  type="number"
                  value={form.usageLimitPerCustomer}
                  onChange={(e) => set("usageLimitPerCustomer", e.target.value)}
                />
              </Grid>
            )}
            {form.customizeUsage && (
              <Grid item xs={12} sm={6} md={4}>
                <VoucherFieldTitle help="Giới hạn riêng trên từng mã; nhập 0 để một mã có thể dùng nhiều lần.">
                  Lượt dùng mỗi mã
                </VoucherFieldTitle>
                <SoftInput
                  type="number"
                  value={form.maxUsesPerVoucher}
                  onChange={(e) => set("maxUsesPerVoucher", e.target.value)}
                />
              </Grid>
            )}
            {form.voucherAudience === "CUSTOMER" && form.useConversion && (
              <Grid item xs={12} sm={6} md={4}>
                <VoucherFieldTitle
                  required
                  help="Chọn loại số dư của khách sẽ bị trừ khi phát hành voucher."
                >
                  Nguồn quy đổi
                </VoucherFieldTitle>
                <Select
                  fullWidth
                  size="small"
                  value={form.conversionType}
                  onChange={(e) => set("conversionType", e.target.value)}
                  disabled={form.voucherAudience === "SHARED"}
                >
                  <MenuItem value="NONE">Không quy đổi</MenuItem>
                  <MenuItem value="INVOICE_COIN">Điểm hóa đơn</MenuItem>
                  <MenuItem value="PLUSEX">Coin PlusEx</MenuItem>
                </Select>
              </Grid>
            )}
            {form.voucherAudience === "CUSTOMER" &&
              form.useConversion &&
              form.conversionType !== "NONE" && (
                <Grid item xs={12} md={4}>
                  <VoucherFieldTitle
                    required
                    help="Số điểm hoặc coin sẽ trừ khỏi số dư của khách ngay khi tạo voucher."
                  >
                    Số điểm/coin cần đổi
                  </VoucherFieldTitle>
                  <SoftInput
                    type="number"
                    value={form.conversionCost}
                    onChange={(e) => set("conversionCost", e.target.value)}
                  />
                </Grid>
              )}
          </Grid>

          {step === 3 && (
            <SoftBox mt={2} display="flex" justifyContent="space-between">
              <SoftButton variant="outlined" color="secondary" onClick={() => setStep(2)}>
                Quay lại
              </SoftButton>
              <SoftButton color="info" onClick={() => setStep(4)}>
                Tiếp tục: Đối tượng&nbsp;<Icon>arrow_forward</Icon>
              </SoftButton>
            </SoftBox>
          )}
        </>
      )}

      {step >= 4 && (
        <>
          <SoftBox mt={2}>
            <SoftTypography variant="button" fontWeight="bold">
              4. Phạm vi và khách mục tiêu
            </SoftTypography>
          </SoftBox>
          <Grid container spacing={1.25} mt={0.25}>
            <Grid item xs={12} sm={6} md={3}>
              <VoucherOption
                checked={form.customizeScope}
                onChange={(value) => set("customizeScope", value)}
                label="Chỉ áp dụng một số hàng"
                help="Bật để giới hạn voucher theo danh mục hoặc sản phẩm. Không bật nghĩa là áp dụng toàn bộ hàng hóa."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <VoucherOption
                checked={form.useExclusions}
                onChange={(value) => set("useExclusions", value)}
                label="Cần loại trừ hàng hóa"
                help="Loại bỏ các danh mục hoặc sản phẩm không được tính giảm giá."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <VoucherOption
                checked={form.useTargeting}
                onChange={(value) => set("useTargeting", value)}
                label="Chỉ áp dụng nhóm khách"
                help="Bật để giới hạn voucher theo trạng thái hoặc hạng hoạt động của khách hàng."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <VoucherOption
                checked={form.useWinBack}
                onChange={(value) => set("useWinBack", value)}
                label="Dùng để gọi khách cũ"
                help="Chỉ cho khách đã không phát sinh hóa đơn trong số tháng được chọn."
              />
            </Grid>
            {form.customizeScope && (
              <Grid item xs={12} md={3}>
                <VoucherFieldTitle
                  required
                  help="Chọn danh mục hoặc từng sản phẩm được tính vào giá trị giảm."
                >
                  Phạm vi áp dụng
                </VoucherFieldTitle>
                <Select
                  fullWidth
                  size="small"
                  value={form.scope}
                  onChange={(e) => set("scope", e.target.value)}
                >
                  <MenuItem value="ALL">Tất cả sản phẩm</MenuItem>
                  <MenuItem value="CATEGORY">Theo danh mục</MenuItem>
                  <MenuItem value="PRODUCTS">Theo sản phẩm</MenuItem>
                </Select>
              </Grid>
            )}
            {form.customizeScope && form.scope === "CATEGORY" && (
              <Grid item xs={12} md={9}>
                <VoucherFieldTitle
                  required
                  help="Chỉ sản phẩm thuộc các danh mục này được tính giảm giá."
                >
                  Danh mục áp dụng
                </VoucherFieldTitle>
                <Autocomplete
                  multiple
                  options={categories}
                  value={form.categoryIds}
                  onChange={(_, value) => set("categoryIds", value)}
                  getOptionLabel={(item) => item.name || ""}
                  isOptionEqualToValue={(a, b) => idOf(a) === idOf(b)}
                  renderInput={(params) => <TextField {...params} placeholder="Chọn danh mục" />}
                />
              </Grid>
            )}
            {form.customizeScope && form.scope === "PRODUCTS" && (
              <Grid item xs={12} md={9}>
                <VoucherFieldTitle
                  required
                  help="Chỉ các sản phẩm được chọn mới được tính giảm giá."
                >
                  Sản phẩm áp dụng
                </VoucherFieldTitle>
                <Autocomplete
                  multiple
                  options={products}
                  value={form.productIds}
                  onChange={(_, value) => set("productIds", value)}
                  getOptionLabel={(item) => [item.code, item.name].filter(Boolean).join(" · ")}
                  isOptionEqualToValue={(a, b) => idOf(a) === idOf(b)}
                  renderInput={(params) => <TextField {...params} placeholder="Chọn sản phẩm" />}
                />
              </Grid>
            )}
            {form.useExclusions && (
              <Grid item xs={12} md={6}>
                <VoucherFieldTitle help="Sản phẩm thuộc các danh mục này luôn bị loại trừ, kể cả khi nằm trong phạm vi áp dụng.">
                  Loại trừ danh mục
                </VoucherFieldTitle>
                <Autocomplete
                  multiple
                  options={categories}
                  value={form.excludedCategoryIds}
                  onChange={(_, value) => set("excludedCategoryIds", value)}
                  getOptionLabel={(item) => item.name || ""}
                  isOptionEqualToValue={(a, b) => idOf(a) === idOf(b)}
                  renderInput={(params) => <TextField {...params} placeholder="Không bắt buộc" />}
                />
              </Grid>
            )}
            {form.useExclusions && (
              <Grid item xs={12} md={6}>
                <VoucherFieldTitle help="Các sản phẩm này luôn không được tính giảm giá.">
                  Loại trừ sản phẩm
                </VoucherFieldTitle>
                <Autocomplete
                  multiple
                  options={products}
                  value={form.excludedProductIds}
                  onChange={(_, value) => set("excludedProductIds", value)}
                  getOptionLabel={(item) => [item.code, item.name].filter(Boolean).join(" · ")}
                  isOptionEqualToValue={(a, b) => idOf(a) === idOf(b)}
                  renderInput={(params) => <TextField {...params} placeholder="Không bắt buộc" />}
                />
              </Grid>
            )}
            {form.useTargeting && (
              <Grid item xs={12} md={8}>
                <VoucherFieldTitle
                  required
                  help="Chỉ khách có trạng thái thuộc danh sách được chọn mới dùng được voucher."
                >
                  Phân hạng khách được dùng
                </VoucherFieldTitle>
                <Select
                  multiple
                  fullWidth
                  size="small"
                  value={form.eligibleCustomerSegments}
                  onChange={(e) => set("eligibleCustomerSegments", e.target.value)}
                  renderValue={(values) =>
                    values
                      .map((value) => segmentOptions.find(([key]) => key === value)?.[1])
                      .join(", ")
                  }
                >
                  {segmentOptions.map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
            )}
            {form.useWinBack && (
              <Grid item xs={12} md={4}>
                <VoucherFieldTitle
                  required
                  help="Ví dụ nhập 5: khách phải không phát sinh đơn hàng trong ít nhất 5 tháng."
                >
                  Chưa mua hàng trong số tháng
                </VoucherFieldTitle>
                <SoftInput
                  type="number"
                  value={form.inactiveMonths}
                  onChange={(e) => set("inactiveMonths", e.target.value)}
                />
              </Grid>
            )}
          </Grid>

          {step === 4 && (
            <SoftBox mt={2} display="flex" justifyContent="space-between">
              <SoftButton variant="outlined" color="secondary" onClick={() => setStep(3)}>
                Quay lại
              </SoftButton>
              <SoftButton color="info" onClick={() => setStep(5)}>
                Tiếp tục: Thời gian&nbsp;<Icon>arrow_forward</Icon>
              </SoftButton>
            </SoftBox>
          )}
        </>
      )}

      {step === 5 && (
        <>
          <SoftBox mt={2}>
            <SoftTypography variant="button" fontWeight="bold">
              5. Thời gian hiệu lực
            </SoftTypography>
          </SoftBox>
          <Grid container spacing={1.25} mt={0.25}>
            <Grid item xs={12}>
              <VoucherOption
                checked={form.useValidity}
                onChange={(value) => set("useValidity", value)}
                label="Cần giới hạn thời gian hiệu lực"
                help="Không bật: voucher không giới hạn thời gian. Bật: chọn ngày bắt đầu, kết thúc và có thể giới hạn thêm theo ngày hoặc giờ."
              />
            </Grid>
            {form.useValidity && (
              <Grid item xs={12} md={6}>
                <VoucherFieldTitle
                  required
                  help="Thời điểm sớm nhất voucher bắt đầu được chấp nhận."
                >
                  Bắt đầu
                </VoucherFieldTitle>
                <SoftInput
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => set("startAt", e.target.value)}
                />
              </Grid>
            )}
            {form.useValidity && (
              <Grid item xs={12} md={6}>
                <VoucherFieldTitle
                  required
                  help="Sau thời điểm này, toàn bộ voucher của chiến dịch không còn sử dụng được."
                >
                  Kết thúc
                </VoucherFieldTitle>
                <SoftInput
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => set("endAt", e.target.value)}
                />
              </Grid>
            )}
            {form.useValidity && (
              <Grid item xs={12} md={6}>
                <VoucherOption
                  checked={form.useDynamicExpiry}
                  onChange={(value) => set("useDynamicExpiry", value)}
                  label="Cần hạn dùng tính từ ngày cấp"
                  help="Ví dụ 7 ngày: mỗi voucher hết hạn sau 7 ngày kể từ lúc phát hành, nhưng không vượt ngày kết thúc chiến dịch."
                />
              </Grid>
            )}
            {form.useValidity && (
              <Grid item xs={12} md={6}>
                <VoucherOption
                  checked={form.useWeeklySchedule}
                  onChange={(value) => set("useWeeklySchedule", value)}
                  label="Cần giới hạn theo thứ hoặc giờ"
                  help="Dùng cho mã khung giờ vàng, ví dụ chỉ từ 12:00 đến 14:00 vào thứ Sáu."
                />
              </Grid>
            )}
            {form.useValidity && form.useDynamicExpiry && (
              <Grid item xs={12} md={4}>
                <VoucherFieldTitle
                  required
                  help="Số ngày voucher còn hiệu lực tính từ lúc được cấp."
                >
                  Hạn sau khi cấp (ngày)
                </VoucherFieldTitle>
                <SoftInput
                  type="number"
                  value={form.dynamicExpiryDays}
                  onChange={(e) => set("dynamicExpiryDays", e.target.value)}
                />
              </Grid>
            )}
            {form.useValidity && form.useWeeklySchedule && (
              <Grid item xs={12} md={4}>
                <VoucherFieldTitle help="Để trống nếu không cần giới hạn giờ bắt đầu trong ngày.">
                  Từ giờ
                </VoucherFieldTitle>
                <SoftInput
                  type="time"
                  value={form.dailyStartTime}
                  onChange={(e) => set("dailyStartTime", e.target.value)}
                />
              </Grid>
            )}
            {form.useValidity && form.useWeeklySchedule && (
              <Grid item xs={12} md={4}>
                <VoucherFieldTitle help="Để trống nếu không cần giới hạn giờ kết thúc trong ngày.">
                  Đến giờ
                </VoucherFieldTitle>
                <SoftInput
                  type="time"
                  value={form.dailyEndTime}
                  onChange={(e) => set("dailyEndTime", e.target.value)}
                />
              </Grid>
            )}
            {form.useValidity && form.useWeeklySchedule && (
              <Grid item xs={12}>
                <VoucherFieldTitle help="Không chọn nghĩa là áp dụng mọi ngày trong khoảng hiệu lực.">
                  Ngày được áp dụng
                </VoucherFieldTitle>
                <Select
                  multiple
                  fullWidth
                  size="small"
                  value={form.allowedWeekdays}
                  onChange={(e) => set("allowedWeekdays", e.target.value)}
                  renderValue={(values) =>
                    values
                      .map((value) => weekdayOptions.find(([key]) => key === value)?.[1])
                      .join(", ")
                  }
                >
                  {weekdayOptions.map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
            )}
          </Grid>

          <SoftBox mt={2} display="flex" justifyContent="space-between">
            <SoftButton variant="outlined" color="secondary" onClick={() => setStep(4)}>
              Quay lại
            </SoftButton>
            <SoftButton color="success" variant="gradient" disabled={saving} onClick={save}>
              <Icon>confirmation_number</Icon>&nbsp;
              {saving ? "Đang tạo..." : "Tạo voucher giảm giá"}
            </SoftButton>
          </SoftBox>
        </>
      )}
    </SoftBox>
  );
}

function VoucherManagement({ refreshKey = 0 }) {
  const localDate = useCallback((date) => {
    const value = new Date(date);
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }, []);
  const monthStart = useCallback(() => {
    const now = new Date();
    return localDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [localDate]);
  const [period, setPeriod] = useState("MONTH");
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(() => localDate(new Date()));
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const periodParams = useCallback(() => {
    const today = localDate(new Date());
    if (period === "ALL") return {};
    if (period === "TODAY") return { from: today, to: today };
    if (period === "MONTH") return { from: monthStart(), to: today };
    return { from: from || undefined, to: to || undefined };
  }, [period, from, to, localDate, monthStart]);
  const params = useCallback(
    () => ({
      ...periodParams(),
      search: submittedSearch || undefined,
      status: status || undefined,
      page,
      limit: 20,
    }),
    [page, periodParams, status, submittedSearch]
  );
  const load = useCallback(() => {
    setLoading(true);
    PromotionService.getVoucherReport(params())
      .then((response) => {
        setRows(response.data?.data || []);
        setSummary(response.data?.summary || {});
        setMeta(response.data?.meta || { totalPages: 1, total: 0 });
      })
      .catch((error) =>
        toast.error(error.response?.data?.message || "Không thể tải danh sách voucher")
      )
      .finally(() => setLoading(false));
  }, [params]);
  useEffect(load, [load, refreshKey]);
  useEffect(() => setPage(1), [period, from, to, status, submittedSearch]);

  const changePeriod = (value) => {
    setPeriod(value);
    const today = localDate(new Date());
    if (value === "TODAY") {
      setFrom(today);
      setTo(today);
    } else if (value === "MONTH") {
      setFrom(monthStart());
      setTo(today);
    }
  };
  const exportExcel = async () => {
    try {
      setExporting(true);
      const response = await PromotionService.exportVoucherReport({
        ...periodParams(),
        search: submittedSearch || undefined,
        status: status || undefined,
      });
      downloadBlob(response.data, `voucher-${from || "tat-ca"}-${to || "tat-ca"}.xlsx`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xuất báo cáo voucher");
    } finally {
      setExporting(false);
    }
  };
  const copyVoucher = async (code) => {
    try {
      await copyText(code);
      toast.success(`Đã sao chép voucher ${code}`);
    } catch {
      toast.error("Không thể sao chép voucher");
    }
  };

  return (
    <Card sx={{ mt: 2 }}>
      <SoftBox p={{ xs: 1.5, md: 3 }}>
        <SoftBox
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          gap={1}
          flexWrap="wrap"
        >
          <SoftBox>
            <SoftTypography variant="h5" fontWeight="bold">
              Quản lý mã voucher
            </SoftTypography>
            <SoftTypography variant="caption" color="text">
              Theo dõi mã đã cấp, hóa đơn sử dụng, khách hàng và tổng tiền đã giảm.
            </SoftTypography>
          </SoftBox>
          <SoftButton color="success" variant="gradient" disabled={exporting} onClick={exportExcel}>
            <Icon>download</Icon>&nbsp;{exporting ? "Đang xuất..." : "Xuất Excel"}
          </SoftButton>
        </SoftBox>

        <Grid container spacing={1.25} mt={0.5}>
          <Grid item xs={12} md={4}>
            <SoftInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && setSubmittedSearch(search.trim())}
              placeholder="Tìm mã voucher, chương trình, khách hàng..."
              icon={{ component: "search", direction: "left" }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <Select
              fullWidth
              size="small"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              displayEmpty
            >
              <MenuItem value="">Mọi trạng thái</MenuItem>
              <MenuItem value="ACTIVE">Còn hiệu lực</MenuItem>
              <MenuItem value="USED">Đã sử dụng</MenuItem>
              <MenuItem value="EXPIRED">Hết hạn</MenuItem>
              <MenuItem value="REVOKED">Đã thu hồi</MenuItem>
            </Select>
          </Grid>
          <Grid item xs={6} md={2}>
            <Select
              fullWidth
              size="small"
              value={period}
              onChange={(event) => changePeriod(event.target.value)}
            >
              <MenuItem value="TODAY">Hôm nay</MenuItem>
              <MenuItem value="MONTH">Tháng này</MenuItem>
              <MenuItem value="CUSTOM">Khoảng thời gian</MenuItem>
              <MenuItem value="ALL">Tất cả</MenuItem>
            </Select>
          </Grid>
          {period === "CUSTOM" && (
            <>
              <Grid item xs={6} md={2}>
                <SoftInput
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={2}>
                <SoftInput type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </Grid>
            </>
          )}
          <Grid item xs={12} md={period === "CUSTOM" ? 12 : 4}>
            <SoftButton
              fullWidth
              color="info"
              variant="outlined"
              onClick={() => {
                setPage(1);
                setSubmittedSearch(search.trim());
              }}
            >
              <Icon>search</Icon>&nbsp;Lọc dữ liệu
            </SoftButton>
          </Grid>
        </Grid>

        <Grid container spacing={1.25} mt={1}>
          {[
            ["Mã trong kỳ", summary.issuedCount || 0, "confirmation_number", "#1565c0"],
            ["Mã đã dùng", summary.usedCodeCount || 0, "task_alt", "#2e7d32"],
            ["Lượt sử dụng", summary.usageCount || 0, "receipt_long", "#7b1fa2"],
            ["Khách sử dụng", summary.uniqueCustomers || 0, "groups", "#ef6c00"],
            ["Tổng tiền giảm", money(summary.discountAmount), "savings", "#c62828"],
          ].map(([label, value, icon, color]) => (
            <Grid item xs={6} md key={label}>
              <SoftBox p={1.25} bgcolor="#f8fafc" borderRadius={2} height="100%">
                <Icon sx={{ color, fontSize: "20px !important" }}>{icon}</Icon>
                <SoftTypography variant="caption" color="text" display="block">
                  {label}
                </SoftTypography>
                <SoftTypography variant="h6" fontWeight="bold" sx={{ color }}>
                  {value}
                </SoftTypography>
              </SoftBox>
            </Grid>
          ))}
        </Grid>

        <SoftBox mt={2} sx={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {[
                  "Mã voucher",
                  "Chương trình",
                  "Khách được cấp",
                  "Trạng thái",
                  "Ngày cấp / Hạn dùng",
                  "Hóa đơn đã sử dụng",
                  "Tổng giảm",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{ padding: 10, textAlign: "left", fontSize: 12, color: "#475467" }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((voucher) => (
                <tr
                  key={voucher.id || voucher._id}
                  style={{ borderBottom: "1px solid #e5e7eb", verticalAlign: "top" }}
                >
                  <td style={{ padding: 10 }}>
                    <SoftBox display="flex" alignItems="flex-start" gap={0.75} flexWrap="wrap">
                      <SoftTypography
                        variant="button"
                        fontWeight="bold"
                        color="info"
                        sx={{ wordBreak: "break-all" }}
                      >
                        {voucher.code}
                      </SoftTypography>
                      <SoftButton
                        size="small"
                        color="info"
                        variant="outlined"
                        onClick={() => copyVoucher(voucher.code)}
                        sx={{ minWidth: 78, px: 1 }}
                      >
                        <Icon>content_copy</Icon>&nbsp;Copy
                      </SoftButton>
                    </SoftBox>
                  </td>
                  <td style={{ padding: 10, fontSize: 13 }}>
                    {[voucher.promotionId?.code, voucher.promotionId?.name]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td style={{ padding: 10, fontSize: 13 }}>
                    {[voucher.customerId?.code, voucher.customerId?.name, voucher.customerId?.phone]
                      .filter(Boolean)
                      .join(" · ") || "Mã dùng chung"}
                  </td>
                  <td style={{ padding: 10 }}>
                    <SoftTypography
                      variant="caption"
                      fontWeight="bold"
                      color={
                        voucher.invoiceCount
                          ? "success"
                          : voucher.status === "ACTIVE"
                          ? "info"
                          : "text"
                      }
                    >
                      {voucher.invoiceCount
                        ? `Đã dùng ${voucher.invoiceCount} lần`
                        : voucher.status === "ACTIVE"
                        ? "Chưa sử dụng"
                        : voucher.status}
                    </SoftTypography>
                  </td>
                  <td style={{ padding: 10, fontSize: 12 }}>
                    {voucher.activatedAt
                      ? new Date(voucher.activatedAt).toLocaleString("vi-VN")
                      : "—"}
                    <br />
                    Hạn:{" "}
                    {voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td style={{ padding: 10, minWidth: 250 }}>
                    {!voucher.usages?.length ? (
                      <SoftTypography variant="caption" color="text">
                        Chưa có hóa đơn
                      </SoftTypography>
                    ) : (
                      voucher.usages.map((invoice) => (
                        <SoftBox
                          key={invoice._id || invoice.id}
                          mb={0.5}
                          p={0.75}
                          borderRadius={1.5}
                          bgcolor="#f8fafc"
                        >
                          <SoftTypography variant="caption" fontWeight="bold">
                            {invoice.code} · {new Date(invoice.date).toLocaleDateString("vi-VN")}
                          </SoftTypography>
                          <SoftTypography variant="caption" color="text" display="block">
                            {[invoice.customerCode, invoice.customerName, invoice.customerPhone]
                              .filter(Boolean)
                              .join(" · ") || "Khách lẻ"}{" "}
                            · Giảm {money(invoice.discountAmount)}
                          </SoftTypography>
                        </SoftBox>
                      ))
                    )}
                  </td>
                  <td style={{ padding: 10, fontSize: 13, fontWeight: 700, color: "#c62828" }}>
                    {money(voucher.totalDiscount)}
                  </td>
                </tr>
              ))}
              {!loading && !rows.length && (
                <tr>
                  <td colSpan={7} style={{ padding: 35, textAlign: "center", color: "#98a2b3" }}>
                    Không có voucher phù hợp bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SoftBox>
        {loading && (
          <SoftTypography variant="button" color="text" display="block" textAlign="center" py={3}>
            Đang tải dữ liệu...
          </SoftTypography>
        )}
        <SoftBox display="flex" justifyContent="space-between" alignItems="center" mt={2}>
          <SoftTypography variant="caption" color="text">
            {Number(meta.total || 0).toLocaleString("vi-VN")} mã voucher
          </SoftTypography>
          <SoftBox display="flex" gap={1} alignItems="center">
            <SoftButton
              size="small"
              variant="outlined"
              color="secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Trước
            </SoftButton>
            <SoftTypography variant="caption">
              Trang {page}/{Math.max(1, Number(meta.totalPages || 1))}
            </SoftTypography>
            <SoftButton
              size="small"
              variant="outlined"
              color="secondary"
              disabled={page >= Number(meta.totalPages || 1) || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Sau
            </SoftButton>
          </SoftBox>
        </SoftBox>
      </SoftBox>
    </Card>
  );
}

function QuickCustomerPromotionCodes({ onVoucherCreated }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [codes, setCodes] = useState([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);
  const [quickMode, setQuickMode] = useState("GIFT_CODE");
  const [voucherManagerKey, setVoucherManagerKey] = useState(0);
  const [form, setForm] = useState({
    prefix: "KM",
    product: null,
    customer: null,
    salesperson: null,
    giftQuantity: 1,
    stockSource: "WAREHOUSE",
    sourceTruck: null,
    code: "",
  });

  const cleanPart = (value, fallback = "") =>
    String(value || "")
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/Đ/g, "D")
      .replace(/[^A-Z0-9_-]+/g, "") || fallback;

  const datePart = () => {
    const now = new Date();
    return [
      String(now.getDate()).padStart(2, "0"),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getFullYear()).slice(-2),
    ].join("");
  };

  const generatedCode = () => {
    const customerCode = cleanPart(
      form.customer?.code,
      String(idOf(form.customer) || "").slice(-6)
    );
    return [
      cleanPart(form.prefix, "KM"),
      cleanPart(form.product?.code, "SANPHAM"),
      datePart(),
      cleanPart(
        form.salesperson?.fullName || form.salesperson?.username || form.salesperson?.employeeCode,
        "SALE"
      ),
      customerCode.replace(/^KH/, "") || "KHACH",
    ].join("/");
  };

  useEffect(() => {
    Promise.all([
      loadAllOptions((params) => ProductService.getAll(params)),
      loadAllOptions((params) => CategoryService.getAll(params)),
      loadAllOptions((params) => CustomerService.getAll(params)),
      loadAllOptions((params) => EmployeeService.getAll(params)),
      loadAllOptions((params) => TruckService.getAll(params)),
    ])
      .then(([productRows, categoryRows, customerRows, employeeRows, truckRows]) => {
        setProducts(productRows);
        setCategories(categoryRows);
        setCustomers(customerRows);
        setEmployees(employeeRows);
        setTrucks(truckRows);
      })
      .catch(() => toast.error("Không thể tải dữ liệu tạo mã khuyến mãi nhanh"));
  }, []);

  useEffect(() => {
    if (!codeEdited)
      setForm((current) => ({
        ...current,
        code: [
          cleanPart(current.prefix, "KM"),
          cleanPart(current.product?.code, "SANPHAM"),
          datePart(),
          cleanPart(
            current.salesperson?.fullName ||
              current.salesperson?.username ||
              current.salesperson?.employeeCode,
            "SALE"
          ),
          cleanPart(current.customer?.code, String(idOf(current.customer) || "").slice(-6)).replace(
            /^KH/,
            ""
          ) || "KHACH",
        ].join("/"),
      }));
  }, [codeEdited, form.customer, form.prefix, form.product, form.salesperson]);

  const load = useCallback(() => {
    setLoading(true);
    PromotionActivationService.getAll({
      source: "MANUAL",
      search: submittedSearch || undefined,
      page,
      limit: 20,
    })
      .then((response) => {
        setCodes(listData(response));
        setMeta(response.data?.meta || { totalPages: 1 });
      })
      .catch((error) =>
        toast.error(error.response?.data?.message || "Không thể tải danh sách mã khuyến mãi")
      )
      .finally(() => setLoading(false));
  }, [page, submittedSearch]);

  useEffect(load, [load]);

  const reset = () => {
    setEditingId("");
    setCodeEdited(false);
    setForm({
      prefix: "KM",
      product: null,
      customer: null,
      salesperson: null,
      giftQuantity: 1,
      stockSource: "WAREHOUSE",
      sourceTruck: null,
      code: "",
    });
  };

  const save = async () => {
    if (!form.product || !form.customer || !form.salesperson)
      return toast.error("Vui lòng chọn sản phẩm, khách hàng và nhân viên sale");
    if (form.stockSource === "TRUCK" && !form.sourceTruck)
      return toast.error("Vui lòng chọn xe xuất hàng khuyến mãi");
    if (!Number.isInteger(Number(form.giftQuantity)) || Number(form.giftQuantity) < 1)
      return toast.error("Số lượng sản phẩm muốn tặng phải là số nguyên từ 1 trở lên");
    if (!form.code.trim()) return toast.error("Vui lòng nhập mã khuyến mãi");
    try {
      setSaving(true);
      const payload = {
        prefix: cleanPart(form.prefix, "KM"),
        productId: idOf(form.product),
        customerId: idOf(form.customer),
        salespersonId: idOf(form.salesperson),
        giftQuantity: Number(form.giftQuantity),
        stockSource: form.stockSource,
        sourceTruckId: form.stockSource === "TRUCK" ? idOf(form.sourceTruck) : undefined,
        code: form.code.trim().toUpperCase(),
      };
      const response = editingId
        ? await PromotionActivationService.updateManual(editingId, payload)
        : await PromotionActivationService.createManual(payload);
      if (response.data?.data?.stockWarning)
        toast.warning("Đã lưu mã nhưng nguồn đã chọn hiện không đủ số lượng sản phẩm để tặng");
      else toast.success(editingId ? "Đã cập nhật mã khuyến mãi" : "Đã tạo mã khuyến mãi");
      reset();
      setPage(1);
      if (page === 1) load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể lưu mã khuyến mãi");
    } finally {
      setSaving(false);
    }
  };

  const edit = async (item) => {
    let sourceTruck =
      trucks.find((truck) => idOf(truck) === String(item.sourceTruckId)) ||
      (item.sourceTruckId
        ? { id: item.sourceTruckId, code: item.sourceTruckCode, name: item.sourceTruckName }
        : null);
    if (item.stockSource === "TRUCK" && item.sourceTruckId) {
      try {
        const response = await TruckService.getById(item.sourceTruckId);
        sourceTruck = response.data?.data || response.data;
      } catch {
        toast.warning("Không thể tải tồn hiện tại của xe đã chọn");
      }
    }
    setEditingId(idOf(item));
    setCodeEdited(true);
    setForm({
      prefix: item.customPrefix || String(item.code || "").split("/")[0] || "KM",
      product: products.find((product) => idOf(product) === String(item.productId)) || {
        id: item.productId,
        code: item.productCode,
        name: item.productName,
      },
      customer: customers.find((customer) => idOf(customer) === String(item.customerId)) || {
        id: item.customerId,
        code: item.customerCode,
        name: item.customerName,
        phone: item.customerPhone,
      },
      salesperson: employees.find((employee) => idOf(employee) === String(item.salespersonId)) || {
        id: item.salespersonId,
        employeeCode: item.salespersonCode,
        fullName: item.salespersonName,
      },
      giftQuantity: Number(item.giftQuantity) || 1,
      stockSource: item.stockSource || "WAREHOUSE",
      sourceTruck,
      code: item.code || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copy = async (code) => {
    try {
      await copyText(code);
      toast.success("Đã sao chép mã khuyến mãi");
    } catch {
      toast.error("Không thể sao chép tự động");
    }
  };

  const exportExcel = async () => {
    try {
      const response = await PromotionActivationService.exportExcel({
        source: "MANUAL",
        search: submittedSearch || undefined,
      });
      downloadBlob(response.data, "ma-khuyen-mai-khach-hang.xlsx");
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể xuất Excel");
    }
  };

  const selectedTruckInventoryItem = (form.sourceTruck?.inventory || []).find(
    (item) => String(idOf(item.productId) || item.productId) === String(idOf(form.product))
  );
  const availableQuantity =
    form.stockSource === "WAREHOUSE"
      ? Number(form.product?.stock || 0)
      : Number(selectedTruckInventoryItem?.qty ?? selectedTruckInventoryItem?.quantity ?? 0);
  const canCheckStock =
    Boolean(form.product) &&
    (form.stockSource === "WAREHOUSE" ||
      (form.stockSource === "TRUCK" && Boolean(form.sourceTruck)));
  const requestedGiftQuantity = Math.max(1, Number(form.giftQuantity) || 1);
  const hasEnoughStock = canCheckStock && availableQuantity >= requestedGiftQuantity;
  const stockSourceOptions = [
    {
      id: "warehouse",
      sourceType: "WAREHOUSE",
      name: "Kho chính",
      subtitle: "Xuất quà trực tiếp từ kho",
    },
    ...trucks.map((truck) => ({
      ...truck,
      id: idOf(truck),
      sourceType: "TRUCK",
      subtitle: [truck.code, truck.licensePlate, truck.driverName || truck.driver?.fullName]
        .filter(Boolean)
        .join(" · "),
    })),
  ];
  const selectedStockSource =
    form.stockSource === "WAREHOUSE" ? stockSourceOptions[0] : form.sourceTruck;

  const selectStockSource = async (value) => {
    if (!value || value.sourceType === "WAREHOUSE") {
      setForm((current) => ({
        ...current,
        stockSource: "WAREHOUSE",
        sourceTruck: null,
      }));
      return;
    }
    setForm((current) => ({ ...current, stockSource: "TRUCK", sourceTruck: value }));
    try {
      const response = await TruckService.getById(idOf(value));
      const detail = { ...(response.data?.data || response.data), sourceType: "TRUCK" };
      setForm((current) => ({
        ...current,
        sourceTruck: idOf(current.sourceTruck) === idOf(value) ? detail : current.sourceTruck,
      }));
    } catch {
      toast.error("Không thể kiểm tra tồn hàng trên xe");
    }
  };

  return (
    <SoftBox mb={3}>
      <Card>
        <SoftBox p={{ xs: 1.5, md: 3 }}>
          <SoftBox
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={1.5}
            flexWrap="wrap"
          >
            <SoftBox>
              <SoftTypography variant="h5" fontWeight="bold">
                Tạo mã khuyến mãi nhanh cho khách
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                Chọn từng thành phần, hệ thống tự ghép mã và vẫn cho phép chỉnh sửa trước khi lưu.
              </SoftTypography>
            </SoftBox>
            <SoftButton color="success" variant="outlined" onClick={exportExcel}>
              <Icon>download</Icon>&nbsp;Xuất Excel
            </SoftButton>
          </SoftBox>

          <SoftBox display="flex" gap={1} mt={2} mb={1.5} flexWrap="wrap">
            <SoftButton
              color={quickMode === "GIFT_CODE" ? "info" : "dark"}
              variant={quickMode === "GIFT_CODE" ? "gradient" : "outlined"}
              onClick={() => setQuickMode("GIFT_CODE")}
            >
              <Icon>redeem</Icon>&nbsp;Mã tặng hàng nhanh
            </SoftButton>
            <SoftButton
              color={quickMode === "DISCOUNT_VOUCHER" ? "success" : "dark"}
              variant={quickMode === "DISCOUNT_VOUCHER" ? "gradient" : "outlined"}
              onClick={() => setQuickMode("DISCOUNT_VOUCHER")}
            >
              <Icon>confirmation_number</Icon>&nbsp;Voucher giảm giá
            </SoftButton>
          </SoftBox>

          <Grid
            container
            spacing={1.25}
            mt={0.5}
            sx={{ display: quickMode === "GIFT_CODE" ? "flex" : "none" }}
          >
            <Grid item xs={12} sm={4} md={2}>
              <SoftTypography variant="caption">Tiền tố</SoftTypography>
              <SoftInput
                value={form.prefix}
                onChange={(event) => {
                  setCodeEdited(false);
                  setForm((current) => ({ ...current, prefix: event.target.value }));
                }}
                placeholder="KM"
              />
            </Grid>
            <Grid item xs={12} sm={8} md={4}>
              <SoftTypography variant="caption">Sản phẩm khuyến mãi *</SoftTypography>
              <Autocomplete
                options={products}
                value={form.product}
                onChange={(_, value) => {
                  setCodeEdited(false);
                  setForm((current) => ({ ...current, product: value }));
                }}
                getOptionLabel={(item) => [item.code, item.name].filter(Boolean).join(" · ")}
                isOptionEqualToValue={(option, value) => idOf(option) === idOf(value)}
                renderOption={(props, item) => (
                  <li {...props} key={idOf(item)}>
                    <SoftBox display="flex" alignItems="center" gap={1}>
                      <EntityThumbnail entity={item} size={36} />
                      <SoftBox>
                        <SoftTypography variant="button" fontWeight="bold">
                          {item.name}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text" display="block">
                          {item.code}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  </li>
                )}
                renderInput={(params) => <TextField {...params} placeholder="Chọn sản phẩm" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <SoftTypography variant="caption">Nhân viên sale *</SoftTypography>
              <Autocomplete
                options={employees}
                value={form.salesperson}
                onChange={(_, value) => {
                  setCodeEdited(false);
                  setForm((current) => ({ ...current, salesperson: value }));
                }}
                getOptionLabel={(item) =>
                  [item.employeeCode, item.fullName || item.username].filter(Boolean).join(" · ")
                }
                isOptionEqualToValue={(option, value) => idOf(option) === idOf(value)}
                renderInput={(params) => <TextField {...params} placeholder="Chọn sale" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <SoftTypography variant="caption">Khách hàng *</SoftTypography>
              <Autocomplete
                options={customers}
                value={form.customer}
                onChange={(_, value) => {
                  setCodeEdited(false);
                  setForm((current) => ({ ...current, customer: value }));
                }}
                getOptionLabel={(item) =>
                  [item.code, item.name, item.phone].filter(Boolean).join(" · ")
                }
                isOptionEqualToValue={(option, value) => idOf(option) === idOf(value)}
                renderOption={(props, item) => (
                  <li {...props} key={idOf(item)}>
                    <SoftBox display="flex" alignItems="center" gap={1}>
                      <EntityThumbnail entity={item} type="customer" size={36} />
                      <SoftBox>
                        <SoftTypography variant="button" fontWeight="bold">
                          {item.name}
                        </SoftTypography>
                        <SoftTypography variant="caption" color="text" display="block">
                          {[item.code, item.phone].filter(Boolean).join(" · ")}
                        </SoftTypography>
                      </SoftBox>
                    </SoftBox>
                  </li>
                )}
                renderInput={(params) => <TextField {...params} placeholder="Chọn khách hàng" />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <SoftTypography variant="caption">Nguồn xuất hàng khuyến mãi *</SoftTypography>
              <Autocomplete
                options={stockSourceOptions}
                value={selectedStockSource}
                onChange={(_, value) => selectStockSource(value)}
                getOptionLabel={(item) => item.name || "Xe bán hàng"}
                isOptionEqualToValue={(option, value) =>
                  option.sourceType === "WAREHOUSE"
                    ? value?.sourceType === "WAREHOUSE"
                    : idOf(option) === idOf(value)
                }
                renderOption={(props, item) => (
                  <li {...props} key={`${item.sourceType}-${idOf(item)}`}>
                    <SoftBox>
                      <SoftTypography variant="button" fontWeight="bold" display="block">
                        {item.name || "Xe bán hàng"}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {item.subtitle}
                      </SoftTypography>
                    </SoftBox>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} placeholder="Chọn kho chính hoặc xe xuất quà" />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <SoftTypography variant="caption">Số lượng muốn tặng *</SoftTypography>
              <SoftInput
                type="number"
                value={form.giftQuantity}
                inputProps={{ min: 1, step: 1 }}
                onChange={(event) =>
                  setForm((current) => ({ ...current, giftQuantity: event.target.value }))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <SoftBox
                height="100%"
                minHeight={40}
                px={1.5}
                py={1}
                borderRadius={2}
                bgcolor={!canCheckStock ? "#f5f7fa" : hasEnoughStock ? "#e8f5e9" : "#ffebee"}
                sx={{
                  border: "1px solid",
                  borderColor: !canCheckStock ? "#dfe4ea" : hasEnoughStock ? "#a5d6a7" : "#ef9a9a",
                }}
              >
                <SoftTypography
                  variant="button"
                  fontWeight="bold"
                  color={!canCheckStock ? "text" : hasEnoughStock ? "success" : "error"}
                >
                  {!canCheckStock
                    ? "Chọn sản phẩm và nguồn để kiểm tra tồn"
                    : hasEnoughStock
                    ? `Có thể tặng ${requestedGiftQuantity} · Còn ${availableQuantity} ${
                        form.product?.unit || ""
                      }`
                    : `Cảnh báo: nguồn chỉ còn ${availableQuantity} ${
                        form.product?.unit || ""
                      }, không đủ tặng ${requestedGiftQuantity}`}
                </SoftTypography>
              </SoftBox>
            </Grid>
            <Grid item xs={12}>
              <SoftTypography variant="caption">Mã hoàn chỉnh — có thể chỉnh sửa</SoftTypography>
              <SoftBox display="flex" gap={1} alignItems="stretch" flexWrap="wrap">
                <SoftBox flex={1} minWidth={240}>
                  <SoftInput
                    value={form.code}
                    onChange={(event) => {
                      setCodeEdited(true);
                      setForm((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      }));
                    }}
                    placeholder="KM/SANPHAM/NGAY/SALE/KHACH"
                  />
                </SoftBox>
                <SoftButton
                  color="secondary"
                  variant="outlined"
                  onClick={() => {
                    setCodeEdited(false);
                    setForm((current) => ({ ...current, code: generatedCode() }));
                  }}
                >
                  <Icon>autorenew</Icon>&nbsp;Tạo lại
                </SoftButton>
                <SoftButton
                  color="info"
                  variant="outlined"
                  disabled={!form.code}
                  onClick={() => copy(form.code)}
                >
                  <Icon>content_copy</Icon>&nbsp;Copy
                </SoftButton>
                <SoftButton color="info" variant="gradient" disabled={saving} onClick={save}>
                  <Icon>save</Icon>&nbsp;
                  {saving ? "Đang lưu..." : editingId ? "Lưu chỉnh sửa" : "Tạo mã"}
                </SoftButton>
                {editingId && (
                  <SoftButton color="secondary" variant="text" onClick={reset}>
                    Hủy sửa
                  </SoftButton>
                )}
              </SoftBox>
              <SoftTypography variant="caption" color="text">
                Ngày tạo trong mã: {datePart()} · Mẫu: KM/NOILAU/120826/THOAI/123
              </SoftTypography>
            </Grid>
          </Grid>
          {quickMode === "DISCOUNT_VOUCHER" && (
            <AdvancedVoucherCreator
              products={products}
              categories={categories}
              customers={customers}
              onCreated={() => {
                setVoucherManagerKey((value) => value + 1);
                onVoucherCreated?.();
              }}
            />
          )}
        </SoftBox>
      </Card>

      {quickMode === "DISCOUNT_VOUCHER" && <VoucherManagement refreshKey={voucherManagerKey} />}

      <Card sx={{ mt: 2, display: quickMode === "GIFT_CODE" ? "block" : "none" }}>
        <SoftBox p={{ xs: 1.5, md: 3 }}>
          <SoftBox
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap={1}
            flexWrap="wrap"
            mb={2}
          >
            <SoftBox>
              <SoftTypography variant="h6" fontWeight="bold">
                Mã đã lưu
              </SoftTypography>
              <SoftTypography variant="caption" color="text">
                Có thể tìm, sao chép hoặc mở lại để chỉnh sửa.
              </SoftTypography>
            </SoftBox>
            <SoftBox minWidth={{ xs: "100%", sm: 300 }}>
              <SoftInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setPage(1);
                    setSubmittedSearch(search.trim());
                  }
                }}
                placeholder="Tìm mã, khách, sale, sản phẩm..."
                icon={{ component: "search", direction: "left" }}
              />
            </SoftBox>
          </SoftBox>
          <Grid container spacing={1.25}>
            {codes.map((item) => (
              <Grid item xs={12} lg={6} key={idOf(item)}>
                <SoftBox p={1.5} borderRadius={2.5} sx={{ border: "1px solid #dfe5ec" }}>
                  <SoftBox display="flex" justifyContent="space-between" gap={1}>
                    <SoftBox minWidth={0}>
                      <SoftTypography
                        variant="button"
                        fontWeight="bold"
                        color="info"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {item.code}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text" display="block" mt={0.5}>
                        {item.productName || item.productCode} · SL tặng:{" "}
                        {Number(item.giftQuantity) || 1} · {item.customerName} ·{" "}
                        {item.salespersonName}
                      </SoftTypography>
                      <SoftTypography
                        variant="caption"
                        display="block"
                        color={item.stockWarning ? "error" : "success"}
                        fontWeight="bold"
                      >
                        {item.stockSource === "TRUCK"
                          ? "Xuất từ xe: " +
                            (item.sourceTruckCode || "") +
                            " · " +
                            (item.sourceTruckName || "")
                          : "Xuất từ kho chính"}
                        {" · "}
                        {item.stockWarning
                          ? "Không đủ hàng tại thời điểm tạo"
                          : "Tồn lúc tạo: " + Number(item.availableQuantityAtCreation || 0)}
                      </SoftTypography>
                      <SoftTypography variant="caption" color="text">
                        {new Date(item.activatedAt || item.createdAt).toLocaleString("vi-VN")} ·{" "}
                        {item.status === "ACTIVE"
                          ? "Chưa sử dụng"
                          : item.status === "USED"
                          ? `Đã sử dụng${item.invoiceCode ? ` · Hóa đơn ${item.invoiceCode}` : ""}`
                          : item.status === "CANCELLED"
                          ? "Đã hủy"
                          : item.status === "REVOKED"
                          ? "Đã thu hồi"
                          : item.status}
                      </SoftTypography>
                    </SoftBox>
                    <SoftBox display="flex" alignItems="flex-start">
                      <Tooltip title="Sao chép mã">
                        <IconButton onClick={() => copy(item.code)}>
                          <Icon color="info">content_copy</Icon>
                        </IconButton>
                      </Tooltip>
                      <Tooltip
                        title={
                          item.status === "USED" ? "Mã đã sử dụng không thể chỉnh sửa" : "Chỉnh sửa"
                        }
                      >
                        <span>
                          <IconButton disabled={item.status === "USED"} onClick={() => edit(item)}>
                            <Icon>edit</Icon>
                          </IconButton>
                        </span>
                      </Tooltip>
                    </SoftBox>
                  </SoftBox>
                </SoftBox>
              </Grid>
            ))}
          </Grid>
          {!loading && !codes.length && (
            <SoftBox py={4} textAlign="center">
              <SoftTypography variant="button" color="text">
                Chưa có mã khuyến mãi tạo nhanh
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
        const nextPromotions = Array.isArray(listResponse.data?.data) ? listResponse.data.data : [];
        setPromotions((current) =>
          page > 1 ? mergeUniqueItems(current, nextPromotions) : nextPromotions
        );
        setMeta(listResponse.data?.meta || { totalPages: 1, totalItems: 0 });
        setSummary(summaryResponse.data?.data || {});
      })
      .catch((error) => {
        if (page === 1) setPromotions([]);
        toast.error(error.response?.data?.message || "Không thể tải chương trình khuyến mãi");
      })
      .finally(() => setLoading(false));
  };
  useEffect(load, [page, debouncedSearch, status, type, refreshKey]);
  const refresh = () => {
    setPage(1);
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
  const copyProgramVoucher = async (code) => {
    try {
      await copyText(code);
      toast.success(`Đã sao chép voucher ${code}`);
    } catch {
      toast.error("Không thể sao chép voucher");
    }
  };
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <SoftBox py={3}>
        <QuickCustomerPromotionCodes onVoucherCreated={refresh} />
        <SoftBox className="admin-summary-grid" display="flex" gap={2} mb={3} flexWrap="wrap">
          {[
            ["Tổng chương trình", summary.totalPrograms || 0, "local_offer", "#1565C0"],
            ["Đang chạy", summary.active || 0, "play_circle", "#2E7D32"],
            ["Sắp diễn ra", summary.scheduled || 0, "schedule", "#7B1FA2"],
            ["Voucher đã dùng", summary.usedVouchers || 0, "confirmation_number", "#E65100"],
          ].map(([label, value, icon, color]) => (
            <Card className="admin-summary-card" key={label} sx={{ flex: 1, minWidth: 180 }}>
              <SoftBox
                className="admin-summary-content"
                p={2.5}
                display="flex"
                gap={2}
                alignItems="center"
              >
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
                  {loading && promotions.length === 0 && (
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
                  {promotions.map((item) => {
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
                          {item.type === "VOUCHER" && item.sharedCode && (
                            <SoftBox
                              display="flex"
                              alignItems="center"
                              gap={0.75}
                              mt={0.75}
                              p={0.6}
                              borderRadius={1.5}
                              bgcolor="#eef6ff"
                              width="fit-content"
                            >
                              <SoftTypography variant="caption" fontWeight="bold" color="info">
                                {item.sharedCode}
                              </SoftTypography>
                              <SoftButton
                                size="small"
                                color="info"
                                variant="outlined"
                                onClick={() => copyProgramVoucher(item.sharedCode)}
                                sx={{ minWidth: 72, px: 0.8 }}
                              >
                                <Icon>content_copy</Icon>&nbsp;Copy
                              </SoftButton>
                            </SoftBox>
                          )}
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
            <MobileLoadMore
              loading={loading}
              hasMore={page < (meta.totalPages || 1)}
              onLoadMore={() => setPage((value) => value + 1)}
            />
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
