"use client";

import { PTPackageRecord } from "../types/pt-package-record";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import { PTPackageRecordsTablePagination } from "./pt-package-records-table-pagination";
import { usePTPackageRecordsColumns } from "./pt-package-records-table-columns";
import { MembersTableHeaderCell } from "@/features/dashboard/pages/members/components/members-table-header-cell";
import { Appointment } from "@/types/appointment";

interface PTPackageRecordsTableProps {
  records: PTPackageRecord[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  appointments?: Appointment[];
  onEdit?: (record: PTPackageRecord) => void;
  onDelete?: (record: PTPackageRecord) => void;
}

export function PTPackageRecordsTable({
  records,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
  appointments = [],
  onEdit,
  onDelete,
}: PTPackageRecordsTableProps) {
  const columns = usePTPackageRecordsColumns({ appointments, onEdit, onDelete });

  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      pagination,
    },
    pageCount,
    onSortingChange: onSort,
    onPaginationChange: onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header) => (
                <MembersTableHeaderCell key={header.id} header={header} />
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors h-16"
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="h-16 py-0 align-middle"
                  >
                    <div className="flex items-center h-full">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PTPackageRecordsTablePagination table={table} totalRows={totalRows} />
    </>
  );
}

