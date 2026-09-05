// Phuc Long Warehouse App – Routes
import Shop from "examples/Icons/Shop";
import Office from "examples/Icons/Office";
import Document from "examples/Icons/Document";
import CustomerSupport from "examples/Icons/CustomerSupport";
import SpaceShip from "examples/Icons/SpaceShip";
import Cube from "examples/Icons/Cube";

// Layouts
import Default from "layouts/dashboards/default";
import DanhMuc from "layouts/danh-muc"; // <-- Thêm import này
import HangHoa from "layouts/hang-hoa";
import NhapKho from "layouts/nhap-kho";
import HoaDon from "layouts/hoa-don";
import QuanLyXe from "layouts/quan-ly-xe";
import TonKho from "layouts/ton-kho";
import NhaCungCap from "layouts/nha-cung-cap";
import BaoCao from "layouts/bao-cao";
import KhachHang from "layouts/khach-hang";
import KhuyenMai from "layouts/khuyen-mai";
import NhanVien from "layouts/nhan-vien";
import AuditLogs from "layouts/audit-logs";
import StaffHome from "layouts/staff-home";
import ThuCongNo from "layouts/thu-cong-no";
import BackupData from "layouts/backup-data";
import DailyOperations from "layouts/nghiep-vu-ngay";
import QuickNotes from "layouts/quick-notes";
import WebsiteAdmin from "layouts/website-admin";
import WebsiteProducts from "layouts/website-products";
import WebsiteProductEditor from "layouts/website-product-editor";
import Leads from "layouts/leads";

const routes = [
  {
    type: "route",
    name: "Bảng tin bán hàng",
    key: "staff-home",
    route: "/staff-home",
    component: <StaffHome />,
    permission: ["staff"],
  },
  {
    type: "route",
    name: "Thu công nợ",
    key: "thu-cong-no",
    route: "/thu-cong-no",
    component: <ThuCongNo />,
    permission: ["staff"],
  },
  // ─── Dashboard ────────────────────────────────────────────────────────────
  {
    type: "collapse",
    name: "Quản lý website",
    key: "website-admin",
    icon: <Document size="12px" />,
    route: "/website-admin",
    noCollapse: true,
    component: <WebsiteAdmin />,
    permission: ["admin"],
  },
  {
    type: "route",
    name: "Tạo sản phẩm website",
    key: "website-product-new",
    route: "/website-products/new",
    component: <WebsiteProductEditor />,
    permission: ["admin"],
  },
  {
    type: "route",
    name: "Biên tập sản phẩm website",
    key: "website-product-edit",
    route: "/website-products/:id/edit",
    component: <WebsiteProductEditor />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Sản phẩm website",
    key: "website-products",
    icon: <Cube size="12px" />,
    route: "/website-products",
    noCollapse: true,
    component: <WebsiteProducts />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Note nhanh cho sale",
    key: "quick-notes",
    icon: <Document size="12px" />,
    route: "/quick-notes",
    noCollapse: true,
    component: <QuickNotes />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Nghiệp vụ trong ngày",
    key: "nghiep-vu-ngay",
    icon: <Document size="12px" />,
    route: "/nghiep-vu-ngay",
    noCollapse: true,
    component: <DailyOperations />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Tổng quan",
    key: "dashboards",
    icon: <Shop size="12px" />,
    route: "/dashboards",
    noCollapse: true,
    component: <Default />,
    permission: ["admin"],
  },

  // ─── Section: Kho hàng ────────────────────────────────────────────────────
  { type: "title", title: "Kho hàng", key: "title-kho", permission: ["admin", "staff"] },

  {
    type: "collapse",
    name: "Danh mục", // <-- Route Danh mục mới thêm
    key: "danh-muc",
    icon: <Document size="12px" />,
    route: "/danh-muc",
    noCollapse: true,
    component: <DanhMuc />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Hàng hóa",
    key: "hang-hoa",
    icon: <Cube size="12px" />,
    route: "/hang-hoa",
    noCollapse: true,
    component: <HangHoa />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Nhập kho",
    key: "nhap-kho",
    icon: <Document size="12px" />,
    route: "/nhap-kho",
    noCollapse: true,
    component: <NhapKho />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Tồn kho",
    key: "ton-kho",
    icon: <Office size="12px" />,
    route: "/ton-kho",
    noCollapse: true,
    component: <TonKho />,
    permission: ["admin"],
  },

  // ─── Section: Bán hàng ────────────────────────────────────────────────────
  { type: "title", title: "Bán hàng", key: "title-ban-hang", permission: ["admin", "staff"] },

  {
    type: "collapse",
    name: "Hóa đơn",
    key: "hoa-don",
    icon: <Shop size="12px" />,
    route: "/hoa-don",
    noCollapse: true,
    component: <HoaDon />,
    permission: ["admin", "staff"],
  },
  {
    type: "collapse",
    name: "Quản lý xe tải",
    key: "quan-ly-xe",
    icon: <SpaceShip size="12px" />,
    route: "/quan-ly-xe",
    noCollapse: true,
    component: <QuanLyXe />,
    permission: ["admin", "staff"],
  },

  // ─── Section: CRM & Khuyến mãi ──────────────────────────────────────────
  { type: "title", title: "CRM & Khuyến mãi", key: "title-crm", permission: ["admin", "staff"] },
  {
    type: "collapse",
    name: "Khách hàng",
    key: "khach-hang",
    icon: <CustomerSupport size="12px" />,
    route: "/khach-hang",
    noCollapse: true,
    component: <KhachHang />,
    permission: ["admin", "staff"],
  },
  {
    type: "collapse",
    name: "Lead tiềm năng",
    key: "leads",
    icon: <CustomerSupport size="12px" />,
    route: "/leads",
    noCollapse: true,
    component: <Leads />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Chương trình khuyến mãi",
    key: "khuyen-mai",
    icon: <Document size="12px" />,
    route: "/khuyen-mai",
    noCollapse: true,
    component: <KhuyenMai />,
    permission: ["admin"],
  },

  // ─── Section: Quản trị (admin only) ──────────────────────────────────────
  { type: "title", title: "Quản trị", key: "title-quan-tri", permission: ["admin"] },

  {
    type: "collapse",
    name: "Nhân viên",
    key: "nhan-vien",
    icon: <CustomerSupport size="12px" />,
    route: "/nhan-vien",
    noCollapse: true,
    component: <NhanVien />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Nhật ký hoạt động",
    key: "audit-logs",
    icon: <Document size="12px" />,
    route: "/audit-logs",
    noCollapse: true,
    component: <AuditLogs />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Sao lưu dữ liệu",
    key: "backup-data",
    icon: <Document size="12px" />,
    route: "/backup-data",
    noCollapse: true,
    component: <BackupData />,
    permission: ["admin"],
  },

  {
    type: "collapse",
    name: "Nhà cung cấp",
    key: "nha-cung-cap",
    icon: <CustomerSupport size="12px" />,
    route: "/nha-cung-cap",
    noCollapse: true,
    component: <NhaCungCap />,
    permission: ["admin"],
  },
  {
    type: "collapse",
    name: "Báo cáo",
    key: "bao-cao",
    icon: <Document size="12px" />,
    route: "/bao-cao",
    noCollapse: true,
    component: <BaoCao />,
    permission: ["admin"],
  },
];

export default routes;
