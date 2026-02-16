"use client";

import { MembershipRecord } from "../types/membership-record";
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
import { MembershipRecordsTablePagination } from "./membership-records-table-pagination";
import { useMembershipRecordsColumns } from "./membership-records-table-columns";
import { MembersTableHeaderCell } from "@/features/dashboard/pages/members/components/members-table-header-cell";

interface MembershipRecordsTableProps {
  records: MembershipRecord[];
  allMembershipRecords?: MembershipRecord[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  onEdit?: (record: MembershipRecord) => void;
  onDelete?: (record: MembershipRecord) => void;
}

export function MembershipRecordsTable({
  records,
  allMembershipRecords = [],
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
  onEdit,
  onDelete,
}: MembershipRecordsTableProps) {
  const columns = useMembershipRecordsColumns({ onEdit, onDelete });

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
      <MembershipRecordsTablePagination table={table} totalRows={totalRows} />
    </>
  );
}

