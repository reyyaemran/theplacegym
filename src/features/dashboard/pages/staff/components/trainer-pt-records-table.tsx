"use client";

import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
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
import { format, differenceInDays } from "date-fns";
import { useMemo } from "react";
import { Appointment } from "@/types/appointment";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

// Ring indicator component for PT Package - shows balance
// Color: Green when high balance (good), Red when low balance (warning)
const BalanceRingIndicator = ({
  balance,
  total,
  size = 40,
  strokeWidth = 3.5,
}: {
  balance: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) => {
  // Calculate percentage of balance remaining (balance / total)
  const percentage = total > 0 ? (balance / total) * 100 : 0;
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // Calculate radius accounting for stroke width to prevent clipping
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedPercentage / 100) * circumference;

  // Color logic: Green when high balance (good), Red when low balance (warning)
  let ringColor = "stroke-slate-400 dark:stroke-slate-500";
  if (normalizedPercentage >= 75) {
    ringColor = "stroke-emerald-500 dark:stroke-emerald-400"; // High balance = Green
  } else if (normalizedPercentage >= 50) {
    ringColor = "stroke-amber-500 dark:stroke-amber-400"; // Medium balance = Amber
  } else if (normalizedPercentage >= 25) {
    ringColor = "stroke-orange-500 dark:stroke-orange-400"; // Low balance = Orange
  } else if (normalizedPercentage > 0) {
    ringColor = "stroke-red-500 dark:stroke-red-400"; // Very low balance = Red
  }

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="stroke-muted/30"
        />
        {/* Progress circle */}
        {normalizedPercentage > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={ringColor}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        )}
      </svg>
      {/* Balance number in center */}
      <span
        className="absolute font-mono font-black text-sm text-foreground"
        style={{ fontFamily: 'Montserrat, sans-serif' }}
      >
        {balance}
      </span>
    </div>
  );
};

interface TrainerPTRecordsTableProps {
  records: PTPackageRecord[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  appointments?: Appointment[];
}

const formatMemberID = (memberId: string): string => {
  return memberId.padStart(9, "0");
};

// Calculate package status based on business rules
// Uses the same expiration logic as membership records
const getPackageStatus = (
  record: PTPackageRecord,
  appointments: Appointment[],
  totalSessions: number,
  balanceSessions: number
): "Active" | "Inactive" | "Low" | "Expired" => {
  const now = new Date();
  const expiryDate = new Date(record.expiryDate);
  
  // Expired: Highest priority - check expiry date first (same logic as membership)
  // Package is expired if:
  // 1. Expiry date has passed (expiryDate < now), OR
  // 2. All sessions are finished (balanceSessions === 0)
  if (expiryDate < now || balanceSessions === 0) {
    return "Expired";
  }

  // Low: When remaining sessions are 20% or less of total sessions
  const lowThreshold = totalSessions * 0.2;
  if (balanceSessions <= lowThreshold && balanceSessions > 0) {
    return "Low";
  }

  // Inactive: Sessions not being used over 10 days (excludes packages with only 1 session)
  if (totalSessions > 1) {
    // Find the last appointment date for this package (any status, not just completed)
    const packageAppointments = appointments
      .filter((apt) => apt.ptPackageRecordId === record.id)
      .filter((apt) => apt.date) // Only appointments with dates
      .map((apt) => new Date(apt.date))
      .sort((a, b) => b.getTime() - a.getTime()); // Sort descending (most recent first)

    if (packageAppointments.length > 0) {
      const lastAppointmentDate = packageAppointments[0];
      const daysSinceLastAppointment = differenceInDays(now, lastAppointmentDate);
      
      if (daysSinceLastAppointment > 10) {
        return "Inactive";
      }
    } else {
      // No appointments yet - check if package start date is more than 10 days ago
      const packageStartDate = new Date(record.startDate);
      const daysSinceStart = differenceInDays(now, packageStartDate);
      
      if (daysSinceStart > 10) {
        return "Inactive";
      }
    }
  }

  // Default: Active
  return "Active";
};

const getStatusConfig = (status: "Active" | "Inactive" | "Low" | "Expired") => {
  const configs = {
    Active: {
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      label: "Active",
    },
    Inactive: {
      icon: AlertCircle,
      iconColor: "text-amber-600 dark:text-amber-400",
      label: "Inactive",
    },
    Low: {
      icon: XCircle,
      iconColor: "text-red-600 dark:text-red-400",
      label: "Low",
    },
    Expired: {
      icon: XCircle,
      iconColor: "text-red-600 dark:text-red-400",
      label: "Expired",
    },
  };
  return configs[status];
};

export function TrainerPTRecordsTable({
  records,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
  appointments = [],
}: TrainerPTRecordsTableProps) {
  const columns = useMemo<ColumnDef<PTPackageRecord>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Invoice",
        cell: ({ row }) => {
          return (
            <span className="text-xs font-mono text-muted-foreground/70">
              {row.original.invoiceNumber}
            </span>
          );
        },
      },
      {
        accessorKey: "memberName",
        header: "Member Name",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{record.memberName}</span>
              {record.memberId && (
                <span className="text-xs font-mono text-muted-foreground/70">
                  {formatMemberID(record.memberId)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "ptPackageName",
        header: "PT Package",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
              <span className="uppercase italic font-black text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {record.ptPackageName}
              </span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "ptPackageSessions",
        header: "Sessions",
        cell: ({ row }) => {
          const record = row.original;
          const totalSessions = record.ptPackageSessions || 0;
          
          // Calculate used sessions from completed appointments
          const usedSessions = appointments.filter(
            (apt) => apt.ptPackageRecordId === record.id && apt.status === "COMPLETED"
          ).length;
          
          const balanceSessions = Math.max(0, totalSessions - usedSessions);
          
          return (
            <div className="flex items-center justify-center h-full">
              <BalanceRingIndicator
                balance={balanceSessions}
                total={totalSessions}
                size={40}
                strokeWidth={3.5}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "startDate",
        header: "Duration",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-mono text-muted-foreground">
                {format(new Date(record.startDate), "MMM dd")} - {format(new Date(record.expiryDate), "MMM dd")}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <span className="font-mono font-bold italic text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              ${record.amount.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "paymentDate",
        header: "Payment Date",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <span className="text-xs font-mono text-muted-foreground">
              {format(new Date(record.paymentDate), "MMM dd, yyyy")}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const record = row.original;
          const totalSessions = record.ptPackageSessions || 0;
          
          // Calculate used sessions from completed appointments
          const usedSessions = appointments.filter(
            (apt) => apt.ptPackageRecordId === record.id && apt.status === "COMPLETED"
          ).length;
          
          const balanceSessions = Math.max(0, totalSessions - usedSessions);
          
          // Calculate status
          const status = getPackageStatus(record, appointments, totalSessions, balanceSessions);
          const statusInfo = getStatusConfig(status);
          const StatusIcon = statusInfo.icon;
          
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
              <StatusIcon className={`h-3 w-3 ${statusInfo.iconColor}`} />
              <span className="text-foreground">{statusInfo.label}</span>
            </Badge>
          );
        },
      },
    ],
    [appointments]
  );

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
                No PT package records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <StaffTablePagination table={table} totalRows={totalRows} />
    </>
  );
}

