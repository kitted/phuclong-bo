/* eslint-disable react/prop-types */
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  Pagination,
  PaginationItem,
  Table,
  TableBody,
  TableContainer,
  TableRow,
} from "@mui/material";
import DataTableBodyCell from "examples/Tables/DataTable/DataTableBodyCell";
import DataTableHeadCell from "examples/Tables/DataTable/DataTableHeadCell";
import { useEffect, useRef, useState } from "react";
import SoftBox from "./SoftBox";
import SoftTypography from "./SoftTypography";
export default function TableCommon({
  loading,
  paginationData,
  setPaginationData,
  isSorted,
  noEndBorder,
  tableInstance,
}) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
    page,
    setPageSize,
    state: { pageIndex, pageSize },
  } = tableInstance;

  const [totalPage, setTotalPage] = useState(0);
  const containerRef = useRef();

  useEffect(() => {
    setPageSize(paginationData.size);
    // setPaginationData((prev) => ({ ...prev, size: 10 }));
  }, []);

  useEffect(() => {
    const totalPage = Math.ceil(paginationData?.count / paginationData?.size);
    setTotalPage(totalPage);
  }, [paginationData.count, paginationData.size]);

  let countButton = [];
  if (paginationData) {
    for (let i = 0; i < totalPage; i++) {
      countButton.push(i);
    }
  }

  const setSortedValue = (column) => {
    let sortedValue;
    if (isSorted && column.sorted) {
      sortedValue = column.isSortedDesc ? "desc" : "asce";
    } else {
      sortedValue = false;
    }
    return sortedValue;
  };

  let entriesEnd;

  if (pageIndex === 0) {
    entriesEnd = pageSize;
  } else if (pageIndex === countButton.length - 1) {
    entriesEnd = rows.length;
  } else {
    entriesEnd = pageSize * (pageIndex + 1);
  }
  return (
    <TableContainer sx={{ boxShadow: "none" }} ref={containerRef}>
      {loading ? (
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
                          {...column.getHeaderProps(isSorted && column.getSortByToggleProps())}
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
        {countButton.length > 1 && (
          <Pagination
            count={countButton.length}
            color="secondary"
            page={paginationData.page}
            onChange={(e, value) => setPaginationData((prev) => ({ ...prev, page: value }))}
            renderItem={(item) => (
              <PaginationItem
                slots={{
                  previous: ArrowBackIcon,
                  next: ArrowForwardIcon,
                }}
                {...item}
              />
            )}
          />
        )}
      </SoftBox>
    </TableContainer>
  );
}
