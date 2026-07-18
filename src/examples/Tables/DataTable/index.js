import { useMemo, useEffect, useState } from "react";

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
import SoftDatePicker from "components/SoftDatePicker";

function DataTable({
  entriesPerPage,
  canSearch,
  showTotalEntries,
  table,
  pagination,
  isSorted,
  noEndBorder,
}) {
  const defaultValue = entriesPerPage?.defaultValue ? entriesPerPage.defaultValue : 10;
  const entries = entriesPerPage?.entries ? entriesPerPage.entries : [5, 10, 15, 20, 25];
  const columns = useMemo(() => table.columns, [table]);
  const data = useMemo(() => table.rows, [table]);

  const tableInstance = useTable(
    { columns, data, initialState: { pageIndex: 0 } },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const [startDate, setStartDate] = useState(new Date());

  const handleSetStartDate = (newDate) => setStartDate(newDate);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
    page,
    pageOptions,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    setGlobalFilter,
    state: { pageIndex, pageSize, globalFilter },
  } = tableInstance;

  // Set the default value for the entries per page when component mounts
  useEffect(() => setPageSize(defaultValue || 10), [defaultValue]);

  // Set the entries per page value based on the select value
  const setEntriesPerPage = ({ value }) => setPageSize(value);

  // Render the paginations
  const renderPagination = pageOptions.map((option) => (
    <SoftPagination
      item
      key={option}
      onClick={() => gotoPage(Number(option))}
      active={pageIndex === option}
    >
      {option + 1}
    </SoftPagination>
  ));

  // Handler for the input to set the pagination index
  const handleInputPagination = ({ target: { value } }) =>
    value > pageOptions.length || value < 0 ? gotoPage(0) : gotoPage(Number(value));

  // Customized page options starting from 1
  const customizedPageOptions = pageOptions.map((option) => option + 1);

  // Setting value for the pagination input
  const handleInputPaginationValue = ({ target: value }) => gotoPage(Number(value.value - 1));

  // Search input value state
  const [search, setSearch] = useState(globalFilter);

  // Search input state handle
  const onSearchChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || undefined);
  }, 100);

  // A function that sets the sorted value for the table
  const setSortedValue = (column) => {
    let sortedValue;
    if (isSorted && column.sorted) {
      sortedValue = column.isSortedDesc ? "desc" : "asce";
    } else {
      sortedValue = false;
    }
    return sortedValue;
  };

  // Setting the entries starting point
  const entriesStart = pageIndex === 0 ? pageIndex + 1 : pageIndex * pageSize + 1;

  // Setting the entries ending point
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
      <SoftBox display="flex" justifyContent="space-between" alignItems="flex-start" p={3} pb={1}>
        <SoftBox lineHeight={1}>
          <Stack spacing={2} direction="row">
            {canSearch && (
              <SoftBox display="flex" flexDirection="column">
                <SoftTypography component="label" variant="caption" fontWeight="bold" mb={0.5}>
                  Tìm kiếm
                </SoftTypography>
                <SoftBox width="12rem">
                  <SoftInput
                    placeholder="Tìm kiếm"
                    value={search}
                    onChange={({ currentTarget }) => {
                      setSearch(search);
                      onSearchChange(currentTarget.value);
                    }}
                  />
                </SoftBox>
              </SoftBox>
            )}
            <SoftBox display="flex" flexDirection="column">
              <SoftTypography component="label" variant="caption" fontWeight="bold" mb={0.5}>
                Loại xe
              </SoftTypography>
              <SoftSelect
                defaultValue={{ value: "sedan", label: "Loại xe" }}
                options={[
                  { value: "extra large", label: "Extra Large" },
                  { value: "extra small", label: "Extra Small" },
                  { value: "large", label: "Large" },
                  { value: "sedan", label: "Loại xe" },
                  { value: "small", label: "Small" },
                ]}
              />
            </SoftBox>

            <SoftBox display="flex" flexDirection="column">
              <SoftTypography component="label" variant="caption" fontWeight="bold" mb={0.5}>
                Dịch vụ
              </SoftTypography>
              <SoftSelect
                defaultValue={{ value: "sedan", label: "Dịch vụ" }}
                options={[
                  { value: "extra large", label: "Extra Large" },
                  { value: "extra small", label: "Extra Small" },
                  { value: "large", label: "Large" },
                  { value: "sedan", label: "Dịch vụ" },
                  { value: "small", label: "Small" },
                ]}
              />
            </SoftBox>
            <SoftBox display="flex" flexDirection="column">
              <SoftTypography component="label" variant="caption" fontWeight="bold" mb={0.5}>
                Ngày đi
              </SoftTypography>
              <SoftDatePicker value={startDate} onChange={handleSetStartDate} />
            </SoftBox>
            <SoftBox display="flex" flexDirection="column">
              <SoftTypography component="label" variant="caption" fontWeight="bold" mb={0.5}>
                Ngày về
              </SoftTypography>
              <SoftDatePicker value={startDate} onChange={handleSetStartDate} />
            </SoftBox>
          </Stack>
        </SoftBox>
      </SoftBox>

      <TableContainer sx={{ boxShadow: "none" }}>
        {entriesPerPage || canSearch ? (
          <SoftBox display="flex" justifyContent="space-between" alignItems="center" p={3}>
            {entriesPerPage && (
              <SoftBox display="flex" alignItems="center">
                <SoftSelect
                  defaultValue={{ value: defaultValue, label: defaultValue }}
                  options={entries.map((entry) => ({ value: entry, label: entry }))}
                  onChange={setEntriesPerPage}
                  size="small"
                />
                <SoftTypography variant="caption" color="secondary" ml={1}>
                  Hiển trị trên trang&nbsp;&nbsp;
                </SoftTypography>
              </SoftBox>
            )}
          </SoftBox>
        ) : null}
        <Table {...getTableProps()}>
          <SoftBox component="thead">
            {headerGroups.map((headerGroup, key) => {
              return (
                <TableRow key={key} {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column, key) => {
                    return (
                      <DataTableHeadCell
                        key={key}
                        {...column.getHeaderProps(isSorted && column.getSortByToggleProps())}
                        width={column.width ? column.width : "auto"}
                        align={column.align ? column.align : "left"}
                        sorted={setSortedValue(column)}
                      >
                        {column.render("Header")}
                      </DataTableHeadCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </SoftBox>
          <TableBody {...getTableBodyProps()}>
            {page.map((row, key) => {
              prepareRow(row);
              return (
                <TableRow key={key} {...row.getRowProps()}>
                  {row.cells.map((cell, key) => (
                    <DataTableBodyCell
                      key={key}
                      noBorder={noEndBorder && rows.length - 1 === key}
                      align={cell.column.align ? cell.column.align : "left"}
                      {...cell.getCellProps()}
                    >
                      {cell.render("Cell")}
                    </DataTableBodyCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <SoftBox
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          p={!showTotalEntries && pageOptions.length === 1 ? 0 : 3}
        >
          {showTotalEntries && (
            <SoftBox mb={{ xs: 3, sm: 0 }}>
              <SoftTypography variant="button" color="secondary" fontWeight="regular">
                Hiển thị {entriesStart} - {entriesEnd} trên tổng {rows.length}
              </SoftTypography>
            </SoftBox>
          )}
          {pageOptions.length > 1 && (
            <SoftPagination
              variant={pagination.variant ? pagination.variant : "gradient"}
              color={pagination.color ? pagination.color : "info"}
            >
              {canPreviousPage && (
                <SoftPagination item onClick={() => previousPage()}>
                  <Icon sx={{ fontWeight: "bold" }}>chevron_left</Icon>
                </SoftPagination>
              )}
              {renderPagination.length > 6 ? (
                <SoftBox width="5rem" mx={1}>
                  <SoftInput
                    inputProps={{ type: "number", min: 1, max: customizedPageOptions.length }}
                    value={customizedPageOptions[pageIndex]}
                    onChange={(handleInputPagination, handleInputPaginationValue)}
                  />
                </SoftBox>
              ) : (
                renderPagination
              )}
              {canNextPage && (
                <SoftPagination item onClick={() => nextPage()}>
                  <Icon sx={{ fontWeight: "bold" }}>chevron_right</Icon>
                </SoftPagination>
              )}
            </SoftPagination>
          )}
        </SoftBox>
      </TableContainer>
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
};

export default DataTable;
