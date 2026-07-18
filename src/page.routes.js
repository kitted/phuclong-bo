// Minimal page routes for Phuc Long Warehouse App
// Auth layouts reference this for the top navbar links
const pageRoutes = [
  {
    name: "Tổng quan",
    key: "dashboards",
    collapse: [{ name: "Trang chủ", key: "trang-chu", route: "/dashboards" }],
  },
];

export default pageRoutes;
