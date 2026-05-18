"use client";

import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
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
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays } from "date-fns";
import { useMemo } from "react";
import { MembershipType, PaymentType } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { MembershipStatus } from "@/features/dashboard/pages/members/types/member";
import { CheckCircle2, XCircle, Clock, AlertTriangle, UserPlus, CreditCard, Banknote, Globe, Wallet } from "lucide-react";

// Unified record type
type IssuedRecord = (MembershipRecord & { recordType: 'membership' }) | (PTPackageRecord & { recordType: 'pt_package' });

interface CCIssuedRecordsTableProps {
  membershipRecords: MembershipRecord[];
  ptPackageRecords: PTPackageRecord[];
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

const getShortName = (fullName?: string): string => {
  if (!fullName) return "-";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  if (parts.length >= 2) {
    return `${parts[0][0]}. ${parts[parts.length - 1]}`;
  }
  return fullName;
};

const getMembershipTypeLabel = (type: MembershipType): string => {
  switch (type) {
    case "day_pass":
      return "DAY PASS";
    case "1_month":
      return "1 MONTH";
    case "3_month":
      return "3 MONTHS";
    case "6_month":
      return "6 MONTHS";
    case "1_year":
      return "1 YEAR";
    default:
      return String(type).toUpperCase();
  }
};

const getPaymentTypeLabel = (type: PaymentType): string => {
  switch (type) {
    case "cash":
      return "Cash";
    case "card":
      return "Card";
    case "bank_transfer":
      return "KHQR";
    case "online":
      return "Online";
    case "other":
      return "Other";
    default:
      return type;
  }
};

const getPaymentTypeIcon = (type: PaymentType) => {
  switch (type) {
    case "cash":
      return <Banknote className="h-3 w-3" />;
    case "card":
      return <CreditCard className="h-3 w-3" />;
    case "bank_transfer":
      return <Wallet className="h-3 w-3" />;
    case "online":
      return <Globe className="h-3 w-3" />;
    case "other":
      return <Wallet className="h-3 w-3" />;
    default:
      return <Wallet className="h-3 w-3" />;
  }
};

// Calculate status for membership
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

// Calculate status for PT Package - only based on expiry date, not start date
const getPTPackageStatus = (
  startDate: string,
  expiryDate: string
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
  
  // PT packages should always show "active" if not expired, regardless of start date
  return 'active';
};

const membershipStatusIconColors: Record<MembershipStatus, string> = {
  active: "text-emerald-600 dark:text-emerald-400",
  expired: "text-red-600 dark:text-red-400",
  new_member: "text-blue-600 dark:text-blue-400",
  renew: "text-purple-600 dark:text-purple-400",
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

const getMembershipTotalDays = (membershipType: MembershipType, startDate: string, expiryDate: string): number => {
  if (membershipType === 'day_pass') {
    return 1;
  }
  const start = new Date(startDate);
  const expiry = new Date(expiryDate);
  return differenceInDays(expiry, start);
};

const getPTPackageTotalDays = (startDate: string, expiryDate: string): number => {
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

export function CCIssuedRecordsTable({
  membershipRecords,
  ptPackageRecords,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
}: CCIssuedRecordsTableProps) {
  // Combine records with type discriminator
  const combinedRecords: IssuedRecord[] = useMemo(() => {
    const memberships: IssuedRecord[] = membershipRecords.map(record => ({
      ...record,
      recordType: 'membership' as const,
    }));
    const ptPackages: IssuedRecord[] = ptPackageRecords.map(record => ({
      ...record,
      recordType: 'pt_package' as const,
    }));
    return [...memberships, ...ptPackages];
  }, [membershipRecords, ptPackageRecords]);

  const columns = useMemo<ColumnDef<IssuedRecord>[]>(
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
              {record.memberId && record.recordType === 'membership' && (record as MembershipRecord).membershipType !== 'day_pass' && (
                <span className="text-xs font-mono text-muted-foreground/70">
                  {formatMemberID(record.memberId)}
                </span>
              )}
              {record.memberId && record.recordType === 'pt_package' && (
                <span className="text-xs font-mono text-muted-foreground/70">
                  {formatMemberID(record.memberId)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "packageType",
        header: "Package Type",
        cell: ({ row }) => {
          const record = row.original;
          if (record.recordType === 'membership') {
            const membership = record as MembershipRecord;
            return (
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
                <span className="uppercase font-black text-foreground" >
                  {getMembershipTypeLabel(membership.membershipType)}
                </span>
              </Badge>
            );
          } else {
            const ptPackage = record as PTPackageRecord;
            return (
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
                <span className="uppercase font-black text-foreground" >
                  {ptPackage.ptPackageName}
                </span>
              </Badge>
            );
          }
        },
      },
      {
        accessorKey: "startDate",
        header: "Duration",
        size: 90,
        cell: ({ row }) => {
          const record = row.original;
          let totalDays: number;
          let usedDays: number;
          
          if (record.recordType === 'membership') {
            const membership = record as MembershipRecord;
            totalDays = getMembershipTotalDays(membership.membershipType, record.startDate, record.expiryDate);
            usedDays = getUsedDays(record.startDate, record.expiryDate);
          } else {
            const ptPackage = record as PTPackageRecord;
            totalDays = getPTPackageTotalDays(record.startDate, record.expiryDate);
            usedDays = getUsedDays(record.startDate, record.expiryDate);
          }
          
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
        accessorKey: "paymentType",
        header: "Payment Type",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal w-fit">
                {getPaymentTypeIcon(record.paymentType)}
                <span>{getPaymentTypeLabel(record.paymentType)}</span>
              </Badge>
              {record.paymentRemark && (
                <span className="text-[10px] text-muted-foreground/60 truncate w-fit">
                  {record.paymentRemark}
                </span>
              )}
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
            <span className="font-mono font-bold italic" >
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
        accessorKey: "assignedStaffName",
        header: "Assigned",
        size: 100,
        cell: ({ row }) => {
          const record = row.original;
          return (
            <span className="text-sm text-muted-foreground truncate block max-w-[100px]">
              {getShortName(record.assignedStaffName)}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => {
          if (row.recordType === 'membership') {
            const membership = row as MembershipRecord;
            const status = getMembershipStatus(
              membership.startDate,
              membership.expiryDate,
              membership.membershipType
            );
            const statusOrder: Record<MembershipStatus, number> = {
              active: 1,
              new_member: 2,
            renew: 2,
              expiring_soon: 3,
              '7_days_left': 4,
              expired: 5,
            };
            return statusOrder[status] || 0;
          } else {
            const ptPackage = row as PTPackageRecord;
            const status = getPTPackageStatus(
              ptPackage.startDate,
              ptPackage.expiryDate
            );
            const statusOrder: Record<MembershipStatus, number> = {
              active: 1,
              new_member: 2,
            renew: 2,
              expiring_soon: 3,
              '7_days_left': 4,
              expired: 5,
            };
            return statusOrder[status] || 0;
          }
        },
        cell: ({ row }) => {
          const record = row.original;
          let status: MembershipStatus;
          let daysLeft = 0;
          
          if (record.recordType === 'membership') {
            const membership = record as MembershipRecord;
            status = getMembershipStatus(
              membership.startDate,
              membership.expiryDate,
              membership.membershipType
            );
            if (status === '7_days_left') {
              const expiry = new Date(membership.expiryDate);
              const now = new Date();
              daysLeft = differenceInDays(expiry, now);
            }
          } else {
            const ptPackage = record as PTPackageRecord;
            status = getPTPackageStatus(
              ptPackage.startDate,
              ptPackage.expiryDate
            );
            if (status === '7_days_left') {
              const expiry = new Date(ptPackage.expiryDate);
              const now = new Date();
              daysLeft = differenceInDays(expiry, now);
            }
          }
          
          if (status === '7_days_left') {
            return (
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal w-fit">
                <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                  {daysLeft}
                </span>
                <span className="text-muted-foreground">Days Left</span>
              </Badge>
            );
          }
          
          const labels: Record<MembershipStatus, string> = {
            active: "Active",
            expired: "Expired",
            new_member: "New Member",
            renew: "Renew",
            expiring_soon: "Expiring Soon",
            '7_days_left': "7 Days Left",
          };
          
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal w-fit">
              {getMembershipStatusIcon(status)}
              <span>{labels[status]}</span>
            </Badge>
          );
        },
        enableSorting: true,
      },
    ],
    []
  );

  const table = useReactTable({
    data: combinedRecords,
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
                No records found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <StaffTablePagination table={table} totalRows={totalRows} />
    </>
  );
}
