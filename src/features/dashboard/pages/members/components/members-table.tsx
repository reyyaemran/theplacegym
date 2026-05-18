"use client";

import { Member } from "@/features/dashboard/pages/members/types/member";
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
import { MembersTablePagination } from "./members-table-pagination";
import { useMemberColumns } from "./members-table-columns";
import { MembersTableHeaderCell } from "./members-table-header-cell";
import { Separator } from "@/components/ui/separator";
import { UserCircle } from "lucide-react";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { Appointment } from "@/types/appointment";
import { useRouter } from "next/navigation";

interface MembersTableProps {
  members: Member[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  onEdit?: (member: Member) => void;
  ptPackageRecords?: PTPackageRecord[];
  appointments?: Appointment[];
  detailBasePath?: string;
}

export function MembersTable({
  members,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
  onEdit,
  ptPackageRecords,
  appointments,
  detailBasePath = "/dashboard/members",
}: MembersTableProps) {
  const router = useRouter();
  const columns = useMemberColumns({ onEdit, ptPackageRecords, appointments, detailBasePath });

  const table = useReactTable({
    data: members,
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
                onClick={() => {
                  const member = row.original;
                  if (member.memberNumber) {
                    router.push(`${detailBasePath}/${member.memberNumber}`);
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
                  <UserCircle className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No members found</p>
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
      <MembersTablePagination table={table} totalRows={totalRows} />
        </>
      )}
    </>
  );
} 