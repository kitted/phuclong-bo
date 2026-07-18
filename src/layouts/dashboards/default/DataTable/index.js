import { useMemo, useEffect, useState } from "react";
SoftSelect;

// prop-types is a library for typechecking of props
import PropTypes from "prop-types";

// react-table components
import { useTable, usePagination, useGlobalFilter, useAsyncDebounce, useSortBy } from "react-table";

// @mui material components
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Icon from "@mui/material/Icon";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import SoftSelect from "components/SoftSelect";
import SoftInput from "components/SoftInput";
import SoftPagination from "components/SoftPagination";

// Soft UI Dashboard PRO React example components
import DataTableHeadCell from "examples/Tables/DataTable/DataTableHeadCell";
import DataTableBodyCell from "examples/Tables/DataTable/DataTableBodyCell";
import { Stack } from "@mui/material";
import { Link } from "react-router-dom";
import SoftButton from "components/SoftButton";
import SoftDatePicker from "components/SoftDatePicker";
import Grid from "@mui/material/Grid";
import TableCommon from "components/TableCommon";
import { toast } from "react-toastify";

const value_Type = [
  { value: "personal", label: "Cá nhân" },
  { value: "department", label: "Khoa" },
];

function DataTable({
  loading,
  query,
  setQuery,
  entriesPerPage,
  canSearch,
  table,
  paginationData,
  setPaginationData,
  isSorted,
  noEndBorder,
  totalTHDGYear,
}) {
  const defaultValue = entriesPerPage?.defaultValue ? entriesPerPage.defaultValue : 10;
  const columns = useMemo(() => table.columns, [table]);
  const data = useMemo(() => table.rows, [table]);

  const tableInstance = useTable(
    { columns, data, initialState: { pageIndex: 0 } },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    rows,
    pageOptions,
    setPageSize,
    setGlobalFilter,
    state: { pageIndex, pageSize, globalFilter },
  } = tableInstance;

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [select1, setSelect1] = useState({ type: "Theo tháng", year: new Date().getFullYear() });
  const [select2, setSelect2] = useState({ type: "Theo tháng", year: new Date().getFullYear() });

  const valueYear1 = [];
  const valueYear2 = [];

  for (var i = -2; i <= 10; i++) {
    const year = new Date().getFullYear() - i;
    valueYear1.push({ value: year, label: year });
    valueYear2.push({ value: year, label: year });
  }

  const handleChangeDate = (type, newDate) => {
    const time = new Date(newDate[0]).getTime();
    if (type === "startDate") {
      setStartDate(newDate);
      setQuery((prev) => ({ ...prev, dayStart: time }));
    }
    if (type === "endDate") {
      setEndDate(newDate);
      setQuery((prev) => ({ ...prev, dayEnd: time }));
    }
  };

  // Set the default value for the entries per page when component mounts
  useEffect(() => setPageSize(defaultValue || 10), [defaultValue]);

  // Search input value state
  const [search, setSearch] = useState(globalFilter);

  // Search input state handle
  const onSearchChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || undefined);
    setQuery((prev) => ({ ...prev, searchBy: value }));
  }, 100);

  let entriesEnd;

  if (pageIndex === 0) {
    entriesEnd = pageSize;
  } else if (pageIndex === pageOptions.length - 1) {
    entriesEnd = rows.length;
  } else {
    entriesEnd = pageSize * (pageIndex + 1);
  }

  return (
    <>
      <SoftBox
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
        alignItems="flex-start"
        p={2}
        style={{ gap: "15px" }}
      >
        {/* <Stack spacing={1} direction="row" mb={3}>
          <Link to="/quan-ly-xe/xe/create">
            <SoftButton variant="gradient" color="dark" size="small">
              Tạo mới
            </SoftButton>
          </Link>
          <SoftButton variant="outlined" color="info" size="small">
            Xuất file
          </SoftButton>
        </Stack> */}
        <Grid container>
          <Grid item xs={6}>
            <p style={{ fontSize: 16, fontWeight: "500", marginBottom: "5px" }}>
              Tổng hợp đánh giá điểm cơ bản cuối năm
            </p>
          </Grid>
          <Grid item xs={6} display={"flex"} justifyContent={"end"}>
            <p
              style={{
                fontWeight: "500",
                fontSize: "14px",
                color: "#344767",
                marginBottom: "5px",
                // width: 230,
              }}
            >
              Thống kê năm {query.year} tổng:{" "}
              <span style={{ fontWeight: "500", fontSize: "20px", color: "#89121A" }}>
                {totalTHDGYear}
              </span>{" "}
              điểm
            </p>
          </Grid>
        </Grid>
        <SoftBox lineHeight={1} width={"100%"}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              width: "100%",
              gap: "5px",
            }}
          >
            <Grid container spacing={2} style={{ width: "100%", justifyContent: "flex-end" }}>
              <Grid item xs={12} sm={12} md={6} lg={6} xl={2.5}>
                {canSearch && (
                  <SoftBox display="flex" flexDirection="row" alignItems="center">
                    <SoftBox width="100%">
                      <SoftInput
                        placeholder="Tìm kiếm..."
                        value={search}
                        onChange={({ currentTarget }) => {
                          setSearch(search);
                          onSearchChange(currentTarget.value);
                        }}
                      />
                    </SoftBox>
                  </SoftBox>
                )}
              </Grid>

              <Grid item xs={12} sm={12} md={6} lg={6} xl={2.5} style={{ width: "100%" }}>
                <SoftBox
                  display="flex"
                  flexDirection="row"
                  alignItems="center"
                  // sx={{ gap: "0px" }}
                  style={{ width: "100%" }}
                >
                  {/* <SoftTypography
                    component="label"
                    variant="caption"
                    fontSize={14}
                    sx={{ color: "rgba(131, 146, 171, 1)", width: "26%" }}
                    mb={0.5}
                  >
                    Xem Theo
                  </SoftTypography> */}
                  <SoftSelect
                    style={{ width: "100%" }}
                    onChange={(e) => {
                      setQuery((prev) => ({ ...prev, type: e.value }));
                    }}
                    placeholder={"Xem theo"}
                    value={value_Type.find((item) => item.value === query.type)}
                    options={value_Type}
                  />
                </SoftBox>
              </Grid>
              <Grid item xs={12} sm={12} md={6} lg={6} xl={2.5}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <p style={{ fontWeight: "bold", fontSize: 12, width: 60 }}>Năm</p>
                  <SoftSelect
                    onChange={(e) => {
                      // if (e.value <= query.endYear) {
                      setSelect1((prev) => ({ ...prev, year: e.value }));
                      setQuery({ ...query, year: e.value });
                      // } else {
                      //   toast.error("Từ năm phải nhỏ hơn hơn đến năm");
                      // }
                    }}
                    value={valueYear1.find((item) => item.value === select1.year)}
                    options={valueYear1}
                  />
                </div>
              </Grid>
              {/* <Grid item xs={12} sm={12} md={6} lg={6} xl={2.5}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <p style={{ fontWeight: "bold", fontSize: 12, width: 70 }}>Đến năm</p>
                  <SoftSelect
                    onChange={(e) => {
                      if (e.value >= query.startYear) {
                        setSelect2((prev) => ({ ...prev, year: e.value }));
                        setQuery({ ...query, endYear: e.value });
                      } else {
                        toast.error("Đến Năm phải lớn hơn hơn từ năm");
                      }
                    }}
                    value={valueYear2.find((item) => item.value === select2.year)}
                    options={valueYear2}
                  />
                </div>
              </Grid> */}
            </Grid>
          </div>
        </SoftBox>
      </SoftBox>

      <TableCommon
        loading={loading}
        query={query}
        setQuery={setQuery}
        paginationData={paginationData}
        setPaginationData={setPaginationData}
        table={table}
        isSorted={isSorted}
        noEndBorder={noEndBorder}
        tableInstance={tableInstance}
      />
    </>
  );
}

// Setting default values for the props of DataTable
DataTable.defaultProps = {
  entriesPerPage: { defaultValue: 10, entries: [5, 10, 15, 20, 25] },
  canSearch: false,
  showTotalEntries: true,
  pagination: { variant: "gradient", color: "info" },
  isSorted: true,
  noEndBorder: false,
};

// Typechecking props for the DataTable
DataTable.propTypes = {
  query: PropTypes.any,
  setQuery: PropTypes.any,
  entriesPerPage: PropTypes.oneOfType([
    PropTypes.shape({
      defaultValue: PropTypes.number,
      entries: PropTypes.arrayOf(PropTypes.number),
    }),
    PropTypes.bool,
  ]),
  canSearch: PropTypes.bool,
  showTotalEntries: PropTypes.bool,
  table: PropTypes.objectOf(PropTypes.array).isRequired,
  pagination: PropTypes.shape({
    variant: PropTypes.oneOf(["contained", "gradient"]),
    color: PropTypes.oneOf([
      "primary",
      "secondary",
      "info",
      "success",
      "warning",
      "error",
      "dark",
      "light",
    ]),
  }),
  isSorted: PropTypes.bool,
  noEndBorder: PropTypes.bool,
  loading: PropTypes.any,
  paginationData: PropTypes.any,
  setPaginationData: PropTypes.any,
  totalTHDGYear: PropTypes.any,
};

export default DataTable;
