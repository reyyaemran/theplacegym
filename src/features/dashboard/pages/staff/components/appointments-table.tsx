"use client";

import { Appointment } from "@/types/appointment";
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
  ColumnDef,
} from "@tanstack/react-table";
import { StaffTablePagination } from "./staff-table-pagination";
import { StaffTableHeaderCell } from "./staff-table-header-cell";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useMemo } from "react";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";

interface AppointmentsTableProps {
  appointments: Appointment[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  ptPackageRecords?: PTPackageRecord[];
}

const formatTime = (time: string) => {
  try {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { icon: any; color: string; label: string }> = {
    COMPLETED: { icon: CheckCircle2, color: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400", label: "Completed" },
    CONFIRMED: { icon: CheckCircle2, color: "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400", label: "Confirmed" },
    SCHEDULED: { icon: Clock, color: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400", label: "Scheduled" },
    CANCELLED: { icon: XCircle, color: "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400", label: "Cancelled" },
    NO_SHOW: { icon: XCircle, color: "bg-gray-50 dark:bg-gray-950/20 text-gray-600 dark:text-gray-400", label: "No Show" },
  };
  return configs[status] || configs.SCHEDULED;
};

export function AppointmentsTable({
  appointments,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
  ptPackageRecords = [],
}: AppointmentsTableProps) {
  const columns = useMemo<ColumnDef<Appointment>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
          const appointment = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">
                {appointment.date ? format(new Date(appointment.date), "MMM dd, yyyy") : "-"}
              </span>
              {appointment.time && (
                <span className="text-xs font-mono text-muted-foreground">
                  {formatTime(appointment.time)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "clientName",
        header: "Client",
        cell: ({ row }) => {
          return (
            <span className="text-sm font-medium">{row.original.clientName || "Client"}</span>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Session Type",
        cell: ({ row }) => {
          return (
            <span className="text-xs font-black" >
              {row.original.type || "Session"}
            </span>
          );
        },
      },
      {
        accessorKey: "duration",
        header: "Duration",
        cell: ({ row }) => {
          return (
            <span className="text-sm font-mono text-muted-foreground">
              {row.original.duration || 0} min
            </span>
          );
        },
      },
      {
        accessorKey: "sessions",
        header: "Sessions",
        cell: ({ row }) => {
          const appointment = row.original;
          
          // Only show sessions for PT Session appointments with a package record
          if (!appointment.ptPackageRecordId || appointment.type !== "PT Session") {
            return <span className="text-sm font-mono text-muted-foreground">-</span>;
          }
          
          // Find the package record
          const packageRecord = ptPackageRecords.find(
            (pkg) => pkg.id === appointment.ptPackageRecordId
          );
          
          if (!packageRecord) {
            return <span className="text-sm font-mono text-muted-foreground">-</span>;
          }
          
          const totalSessions = packageRecord.ptPackageSessions || 0;
          
          // Calculate used sessions from completed appointments for this package
          const usedSessions = appointments.filter(
            (apt) =>
              apt.ptPackageRecordId === appointment.ptPackageRecordId &&
              apt.status === "COMPLETED"
          ).length;
          
          return (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-baseline gap-0.5">
                <span className="font-mono text-sm font-semibold text-foreground">
                  {usedSessions}
                </span>
                <span className="font-mono text-xs text-muted-foreground/70">/</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {totalSessions}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const statusInfo = getStatusConfig(row.original.status);
          const StatusIcon = statusInfo.icon;
          return (
            <Badge className={`${statusInfo.color} text-xs p-1`} variant="secondary">
              <StatusIcon className="h-2 w-2 mr-1" />
              {statusInfo.label}
            </Badge>
          );
        },
      },
    ],
    [appointments, ptPackageRecords]
  );

  const table = useReactTable({
    data: appointments,
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
                No appointments found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <StaffTablePagination table={table} totalRows={totalRows} />
    </>
  );
}

