/* eslint-disable react/prop-types */
import { Table, TableBody, TableContainer, TableRow } from "@mui/material";
import DataTableBodyCell from "examples/Tables/DataTable/DataTableBodyCell";
import DataTableHeadCell from "examples/Tables/DataTable/DataTableHeadCell";
import { useEffect, useRef, useState } from "react";
import SoftBox from "./SoftBox";
import SoftTypography from "./SoftTypography";
import MobileLoadMore from "./MobileLoadMore";
import QuickSortBar from "./QuickSortBar";
export default function TableCommon({
  loading,
  paginationData,
  setPaginationData,
  isSorted,
  noEndBorder,
  tableInstance,
}) {
  const { getTableProps, getTableBodyProps, headerGroups, prepareRow, rows, setPageSize } =
    tableInstance;

  const [totalPage, setTotalPage] = useState(0);
  const containerRef = useRef();
  const sortableColumns = headerGroups
    .flatMap((group) => group.headers)
    .filter((column) => isSorted && column.canSort);
  const activeSortColumn = sortableColumns.find((column) => column.isSorted);

  useEffect(() => {
    setPageSize(paginationData.size);
  }, [paginationData.size, setPageSize]);

  useEffect(() => {
    const totalPage = Math.ceil(paginationData?.count / paginationData?.size);
    setTotalPage(totalPage);
  }, [paginationData.count, paginationData.size]);

  const setSortedValue = (column) => {
    if (!isSorted || !column.canSort) return false;
    if (!column.isSorted) return "none";
    return column.isSortedDesc ? "desc" : "asc";
  };

  return (
    <TableContainer sx={{ boxShadow: "none" }} ref={containerRef}>
      {sortableColumns.length > 0 && (
        <SoftBox display={{ xs: "block", xl: "none" }} px={2} pt={1.5}>
          <QuickSortBar
            value={activeSortColumn?.id || "NONE"}
            compact
            onChange={(columnId) => {
              const column = sortableColumns.find((item) => item.id === columnId);
              if (!column) return;
              column.toggleSortBy(column.isSorted ? !column.isSortedDesc : false);
              setPaginationData?.((current) => ({ ...current, page: 1 }));
            }}
            options={sortableColumns.map((column) => ({
              value: column.id,
              label:
                typeof column.Header === "string"
                  ? `${column.Header}${column.isSorted ? (column.isSortedDesc ? " ↓" : " ↑") : ""}`
                  : column.id,
              icon: column.isSorted ? (column.isSortedDesc ? "south" : "north") : "swap_vert",
            }))}
          />
        </SoftBox>
      )}
      {loading && rows.length === 0 ? (
        <SoftBox
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={containerRef.current?.offsetHeight || "500px"}
          width="100%"
        >
          <svg
            stroke="currentColor"
            fill="none"
            strokeWidth="0"
            viewBox="0 0 24 24"
            className="animate-spin text-indigo-600"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              width: "3.25rem",
              height: "3.25rem",
            }}
          >
            <path
              opacity="0.2"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 19C15.866 19 19 15.866 19 12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12C5 15.866 8.13401 19 12 19ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              fill="currentColor"
            ></path>
            <path
              d="M2 12C2 6.47715 6.47715 2 12 2V5C8.13401 5 5 8.13401 5 12H2Z"
              fill="currentColor"
            ></path>
          </svg>
        </SoftBox>
      ) : (
        <>
          <Table {...getTableProps()}>
            <SoftBox component="thead">
              {headerGroups.map((headerGroup, key) => {
                return (
                  <TableRow key={key} {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map((column, key) => {
                      return (
                        <DataTableHeadCell
                          key={key}
                          {...column.getHeaderProps(
                            isSorted && column.canSort ? column.getSortByToggleProps() : undefined
                          )}
                          aria-sort={
                            column.isSorted
                              ? column.isSortedDesc
                                ? "descending"
                                : "ascending"
                              : "none"
                          }
                          onClickCapture={() => {
                            if (!isSorted || !column.canSort) return;
                            setPaginationData?.((current) => ({ ...current, page: 1 }));
                          }}
                          width={column.width ? column.width : "auto"}
                          align={"center"}
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
              {rows.map((row, key) => {
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
        </>
      )}

      <SoftBox
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        p={3}
      >
        <SoftBox mb={{ xs: 3, sm: 0 }}>
          <SoftTypography variant="button" color="secondary" fontWeight="regular">
            Tổng {rows.length}{" "}
          </SoftTypography>
          <SoftTypography variant="button" color="secondary" fontWeight="regular">
            / {paginationData?.count}
          </SoftTypography>
        </SoftBox>
      </SoftBox>
      <MobileLoadMore
        loading={loading}
        hasMore={Number(paginationData?.page || 1) < totalPage}
        onLoadMore={() =>
          setPaginationData((current) => ({
            ...current,
            page: Number(current.page || 1) + 1,
          }))
        }
      />
    </TableContainer>
  );
}
