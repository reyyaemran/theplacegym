"use client";

import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StaffTablePaginationProps<TData> {
  table: Table<TData>;
  totalRows: number;
}

export function StaffTablePagination<TData>({
  table,
  totalRows,
}: StaffTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 px-4 py-3 sm:flex-row">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">Rows per page</p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            table.setPageSize(Number(value));
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[6, 10, 15, 20].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="text-sm text-muted-foreground">
        {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
        {Math.min(
          (table.getState().pagination.pageIndex + 1) *
            table.getState().pagination.pageSize,
          totalRows
        )}{" "}
        of {totalRows}
      </div>
      <div className="flex items-center gap-2">
          <Button
            variant="outline"
          size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          className="h-8"
          >
          <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
          size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          className="h-8"
          >
          <ChevronLeft className="h-4 w-4" />
          </Button>
        <div className="text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
          <Button
            variant="outline"
          size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          className="h-8"
          >
          <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
          size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          className="h-8"
          >
          <ChevronsRight className="h-4 w-4" />
          </Button>
      </div>
    </div>
  );
}

