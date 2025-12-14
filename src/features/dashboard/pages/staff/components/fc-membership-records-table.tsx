"use client";

import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
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
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays } from "date-fns";
import { useMemo } from "react";
import { MembershipType } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { MembershipStatus } from "@/features/dashboard/pages/members/types/member";
import { CheckCircle2, XCircle, Clock, AlertTriangle, UserPlus } from "lucide-react";

interface FCMembershipRecordsTableProps {
  records: MembershipRecord[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
}

const formatMemberID = (memberId: string): string => {
  return memberId.padStart(9, "0");
};

const getMembershipTypeLabel = (type: MembershipType): string => {
  switch (type) {
    case "day_pass":
      return "Day Pass";
    case "1_month":
      return "1 MONTH";
    case "3_month":
      return "3 MONTH";
    case "6_month":
      return "6 MONTH";
    case "1_year":
      return "1 YEAR";
    default:
      return type;
  }
};

const getMembershipTotalDays = (startDate: string, expiryDate: string): number => {
  const start = new Date(startDate);
  const expiry = new Date(expiryDate);
  return differenceInDays(expiry, start);
};

const getUsedDays = (startDate: string, expiryDate: string): number => {
  const start = new Date(startDate);
  const now = new Date();
  const expiry = new Date(expiryDate);
  
  if (now > expiry) {
    return differenceInDays(expiry, start);
  }
  
  return Math.max(0, differenceInDays(now, start));
};

// Calculate membership status based on expiry date
const getMembershipStatus = (
  startDate: string,
  expiryDate: string,
  membershipType?: MembershipType
): MembershipStatus => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = differenceInDays(expiry, now);
  
  if (expiry < now) {
    return 'expired';
  }
  
  if (daysUntilExpiry <= 7) {
    return '7_days_left';
  }
  
  if (daysUntilExpiry <= 14) {
    return 'expiring_soon';
  }
  
  const start = new Date(startDate);
  const daysSinceStart = differenceInDays(now, start);
  
  if (daysSinceStart < 30) {
    return 'new_member';
  }
  
  return 'active';
};

const membershipStatusIconColors: Record<MembershipStatus, string> = {
  active: "text-emerald-600 dark:text-emerald-400",
  expired: "text-red-600 dark:text-red-400",
  new_member: "text-blue-600 dark:text-blue-400",
  expiring_soon: "text-amber-600 dark:text-amber-400",
  '7_days_left': "text-orange-600 dark:text-orange-400",
};

const getMembershipStatusIcon = (status: MembershipStatus) => {
  const iconColor = membershipStatusIconColors[status];
  switch (status) {
    case 'active':
      return <CheckCircle2 className={`h-3 w-3 ${iconColor}`} />;
    case 'expired':
      return <XCircle className={`h-3 w-3 ${iconColor}`} />;
    case 'new_member':
      return <UserPlus className={`h-3 w-3 ${iconColor}`} />;
    case 'expiring_soon':
      return <AlertTriangle className={`h-3 w-3 ${iconColor}`} />;
    case '7_days_left':
      return <Clock className={`h-3 w-3 ${iconColor}`} />;
  }
};

export function FCMembershipRecordsTable({
  records,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
}: FCMembershipRecordsTableProps) {
  const columns = useMemo<ColumnDef<MembershipRecord>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Invoice",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground/70">
            {row.original.invoiceNumber}
          </span>
        ),
      },
      {
        accessorKey: "memberName",
        header: "Member Name",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-sm">{record.memberName}</span>
              {record.memberId && record.membershipType !== "day_pass" && (
                <span className="text-xs font-mono text-muted-foreground/70">
                  {formatMemberID(record.memberId)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "membershipType",
        header: "Membership Type",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
              <span className="uppercase italic font-black text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {getMembershipTypeLabel(record.membershipType)}
              </span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "startDate",
        header: "Duration",
        size: 90,
        cell: ({ row }) => {
          const record = row.original;
          const totalDays = getMembershipTotalDays(record.startDate, record.expiryDate);
          const usedDays = getUsedDays(record.startDate, record.expiryDate);
          const progress = totalDays > 0 ? Math.min((usedDays / totalDays) * 100, 100) : 0;
          
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col gap-1 max-w-[90px] cursor-help">
                  <Progress
                    value={progress}
                    className="h-1.5"
                  />
                  <div className="text-[10px]">
                    <span className="font-mono text-muted-foreground">
                      {format(new Date(record.expiryDate), "MMM dd, yyyy")}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-mono">
                    <span className="font-semibold">Start:</span> {format(new Date(record.startDate), "MMM dd, yyyy")}
                  </div>
                  <div className="text-[10px] font-mono">
                    <span className="font-semibold">Expire:</span> {format(new Date(record.expiryDate), "MMM dd, yyyy")}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-mono font-bold italic text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            ${row.original.amount.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "paymentDate",
        header: "Payment Date",
        cell: ({ row }) => (
          <span className="text-xs font-mono text-muted-foreground">
            {row.original.paymentDate ? format(new Date(row.original.paymentDate), "MMM dd, yyyy") : "-"}
          </span>
        ),
      },
      {
        id: "membershipStatus",
        accessorFn: (row) => {
          // Return a sortable value based on status priority
          const status = getMembershipStatus(
            row.startDate,
            row.expiryDate,
            row.membershipType
          );
          // Priority order: expired (0), 7_days_left (1), expiring_soon (2), new_member (3), active (4)
          const statusPriority: Record<MembershipStatus, number> = {
            expired: 0,
            '7_days_left': 1,
            expiring_soon: 2,
            new_member: 3,
            active: 4,
          };
          return statusPriority[status];
        },
        header: "Status",
        cell: ({ row }) => {
          const record = row.original;
          // Calculate status based on expiry date
          const membershipStatus = getMembershipStatus(
            record.startDate,
            record.expiryDate,
            record.membershipType
          );
          
          // Calculate days left for 7_days_left status
          let daysLeft = 0;
          if (membershipStatus === '7_days_left') {
            const expiry = new Date(record.expiryDate);
            const now = new Date();
            daysLeft = differenceInDays(expiry, now);
          }
          
          const labels: Record<MembershipStatus, string> = {
            active: "Active",
            expired: "Expired",
            new_member: "New Member",
            expiring_soon: "Expiring Soon",
            '7_days_left': `${daysLeft} Days Left`,
          };
          
          // Special styling for 7_days_left - colored number, no icon
          if (membershipStatus === '7_days_left') {
            return (
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
                <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                  {daysLeft}
                </span>
                <span className="text-muted-foreground">Days Left</span>
              </Badge>
            );
          }
          
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
              {getMembershipStatusIcon(membershipStatus)}
              <span>{labels[membershipStatus]}</span>
            </Badge>
          );
        },
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const statusA = getMembershipStatus(
            rowA.original.startDate,
            rowA.original.expiryDate,
            rowA.original.membershipType
          );
          const statusB = getMembershipStatus(
            rowB.original.startDate,
            rowB.original.expiryDate,
            rowB.original.membershipType
          );
          
          const statusOrder: Record<MembershipStatus, number> = {
            active: 1,
            new_member: 2,
            expiring_soon: 3,
            '7_days_left': 4,
            expired: 5,
          };
          
          return (statusOrder[statusA] || 0) - (statusOrder[statusB] || 0);
        },
      },
    ],
    []
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
                No membership records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <StaffTablePagination table={table} totalRows={totalRows} />
    </>
  );
}

