"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import { Membership } from "../types/membership";
import { useMembershipColumns } from "./memberships-table-columns";
import { MembershipsTablePagination } from "./memberships-table-pagination";

interface MembershipsTableProps {
  memberships: Membership[];
  totalRows: number;
  sorting: SortingState;
  onSort: (sorting: SortingState) => void;
  pagination: PaginationState;
  onPaginationChange: (pagination: PaginationState) => void;
  pageCount: number;
  loading?: boolean;
  onEdit: (membership: Membership) => void;
  onDelete: (membership: Membership) => void;
}

export function MembershipsTable({
  memberships,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
  loading = false,
  onEdit,
  onDelete,
}: MembershipsTableProps) {
  const columns = useMembershipColumns({ onEdit, onDelete });

  const table = useReactTable({
    data: memberships,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: (updater) => {
      const newSorting =
        typeof updater === "function" ? updater(sorting) : updater;
      onSort(newSorting);
    },
    onPaginationChange: (updater) => {
      const newPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      onPaginationChange(newPagination);
    },
    pageCount,
  });

  if (loading) {
    return null;
  }

  if (memberships.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">No memberships found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-11 text-xs font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="h-16 hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <MembershipsTablePagination
        table={table}
        totalRows={totalRows}
        pagination={pagination}
      />
    </div>
  );
}
