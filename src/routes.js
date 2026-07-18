// Phuc Long Warehouse App – Routes
import Shop from "examples/Icons/Shop";
import Office from "examples/Icons/Office";
import Document from "examples/Icons/Document";
import CustomerSupport from "examples/Icons/CustomerSupport";
import SpaceShip from "examples/Icons/SpaceShip";
import Cube from "examples/Icons/Cube";

// Layouts
import Default from "layouts/dashboards/default";
import HangHoa from "layouts/hang-hoa";
import NhapKho from "layouts/nhap-kho";
import HoaDon from "layouts/hoa-don";
import QuanLyXe from "layouts/quan-ly-xe";
import TonKho from "layouts/ton-kho";
import NhaCungCap from "layouts/nha-cung-cap";
import BaoCao from "layouts/bao-cao";

const routes = [
  // ─── Dashboard ────────────────────────────────────────────────────────────
  {
    type: "collapse",
    name: "Tổng quan",
    key: "dashboards",
    icon: <Shop size="12px" />,
    route: "/dashboards",
    noCollapse: true,
    component: <Default />,
    permission: ["admin", "staff"],
  },

  // ─── Section: Kho hàng ────────────────────────────────────────────────────
  { type: "title", title: "Kho hàng", key: "title-kho", permission: ["admin", "staff"] },

  {
    type: "collapse",
    name: "Hàng hóa",
    key: "hang-hoa",
    icon: <Cube size="12px" />,
    route: "/hang-hoa",
    noCollapse: true,
    component: <HangHoa />,
    permission: ["admin", "staff"],
  },
  {
    type: "collapse",
    name: "Nhập kho",
    key: "nhap-kho",
    icon: <Document size="12px" />,
    route: "/nhap-kho",
    noCollapse: true,
    component: <NhapKho />,
    permission: ["admin", "staff"],
  },
  {
    type: "collapse",
    name: "Tồn kho",
    key: "ton-kho",
    icon: <Office size="12px" />,
    route: "/ton-kho",
    noCollapse: true,
    component: <TonKho />,
    permission: ["admin", "staff"],
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

  // ─── Section: Quản trị (admin only) ──────────────────────────────────────
  { type: "title", title: "Quản trị", key: "title-quan-tri", permission: ["admin"] },

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
