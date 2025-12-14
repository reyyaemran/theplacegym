"use client";

import { Staff } from "@/types/staff";
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
import { StaffTablePagination } from "./staff-table-pagination";
import { useStaffColumns } from "./staff-table-columns";
import { StaffTableHeaderCell } from "./staff-table-header-cell";
import { Separator } from "@/components/ui/separator";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface StaffTableProps {
  staff: Staff[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  staffMetrics: Record<string, { sales: number; conduct: number; salesPercent: number; conductPercent: number }>;
  onView: (staff: Staff) => void;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  onUpdateStatus: (staff: Staff, status: Staff["status"]) => void;
  onRate?: (staff: Staff) => void;
}

export function StaffTable({
  staff,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
  staffMetrics,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onRate,
}: StaffTableProps) {
  const router = useRouter();
  const columns = useStaffColumns({ staffMetrics, onView, onEdit, onDelete, onUpdateStatus, onRate });

  const table = useReactTable({
    data: staff,
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
                <StaffTableHeaderCell key={header.id} header={header} />
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
                onClick={() => {
                  const staff = row.original;
                  // Use staffID if available, otherwise fall back to _id
                  const staffIdentifier = staff.staffID || staff._id;
                  if (staffIdentifier) {
                    router.push(`/dashboard/staff/${staffIdentifier}`);
                  }
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="h-16 py-0 align-middle"
                    onClick={(e) => {
                      if (cell.column.id === "actions") {
                        e.stopPropagation();
                      }
                    }}
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
                <div className="flex flex-col items-center justify-center gap-2">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No staff members found</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {table.getRowModel().rows.length > 0 && (
        <>
      <Separator />
      <StaffTablePagination table={table} totalRows={totalRows} />
        </>
      )}
    </>
  );
}

