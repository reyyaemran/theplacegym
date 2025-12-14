"use client";

import { useMemo, useState } from "react";
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
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { MembersTableHeaderCell } from "./members-table-header-cell";
import { MembersTablePagination } from "./members-table-pagination";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Calendar, 
  CreditCard, 
  DollarSign, 
  FileText,
  CheckCircle2,
  XCircle,
  UserPlus,
  AlertTriangle,
  Clock,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MembershipStatus } from "@/features/dashboard/pages/members/types/member";
import { getMembershipStatusIcon } from "@/features/dashboard/pages/membership-invoice/components/membership-records-table-columns";
import { useAuth } from "@/hooks/use-auth";

type HistoryRecord = (MembershipRecord | PTPackageRecord) & {
  recordType: 'membership' | 'pt_package';
};

interface MemberHistoryTableProps {
  membershipRecords: MembershipRecord[];
  ptPackageRecords: PTPackageRecord[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  member?: {
    id: string;
    memberNumber: string;
    fullName: string;
  };
  onManageMembership?: (record: MembershipRecord) => void;
  onManagePTPackage?: (record: PTPackageRecord) => void;
}

const formatMemberID = (id: string): string => {
  return id.padStart(6, "0");
};

const getMembershipTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    day_pass: "DAY PASS",
    "1_month": "1 MONTH",
    "3_month": "3 MONTH",
    "6_month": "6 MONTH",
    "1_year": "1 YEAR",
  };
  return labels[type] || type.toUpperCase();
};

const getPaymentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    bank_transfer: "Bank Transfer",
    online: "Online",
    other: "Other",
  };
  return labels[type] || type;
};

// Use the same status calculation as membership records table
const getMembershipStatus = (
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
  
  const start = new Date(startDate);
  const daysSinceStart = differenceInDays(now, start);
  
  if (daysSinceStart < 30) {
    return 'new_member';
  }
  
  return 'active';
};

// Use the same status calculation as PT package records table
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
  
  const start = new Date(startDate);
  const daysSinceStart = differenceInDays(now, start);
  
  if (daysSinceStart < 30) {
    return 'new_member';
  }
  
  return 'active';
};

// Get PT Package status icon (same as PT package records table)
const getPTPackageStatusIcon = (status: MembershipStatus) => {
  const iconColors: Record<MembershipStatus, string> = {
    active: "text-emerald-600 dark:text-emerald-400",
    expired: "text-red-600 dark:text-red-400",
    new_member: "text-blue-600 dark:text-blue-400",
    expiring_soon: "text-amber-600 dark:text-amber-400",
    '7_days_left': "text-orange-600 dark:text-orange-400",
  };
  
  const iconColor = iconColors[status];
  
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

const getUsedDays = (startDate: string, expiryDate: string): number => {
  const start = new Date(startDate);
  const now = new Date();
  const expiry = new Date(expiryDate);
  
  if (now > expiry) return differenceInDays(expiry, start);
  return Math.max(0, differenceInDays(now, start));
};

const getTotalDays = (startDate: string, expiryDate: string): number => {
  const start = new Date(startDate);
  const expiry = new Date(expiryDate);
  return differenceInDays(expiry, start);
};

export function MemberHistoryTable({
  membershipRecords,
  ptPackageRecords,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
  member,
  onManageMembership,
  onManagePTPackage,
}: MemberHistoryTableProps) {
  const { isManager } = useAuth();

  // Combine records with type discriminator
  const combinedRecords: HistoryRecord[] = useMemo(() => {
    const memberships: HistoryRecord[] = membershipRecords.map(record => ({
      ...record,
      recordType: 'membership' as const,
    }));
    const ptPackages: HistoryRecord[] = ptPackageRecords.map(record => ({
      ...record,
      recordType: 'pt_package' as const,
    }));
    const combined = [...memberships, ...ptPackages];
    
    
    return combined;
  }, [membershipRecords, ptPackageRecords]);

  const columns = useMemo<ColumnDef<HistoryRecord>[]>(
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
        id: "packageType",
        header: "Package Type",
        cell: ({ row }) => {
          const record = row.original;
          if (record.recordType === 'membership') {
            const membership = record as MembershipRecord;
            return (
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
                <span className="uppercase italic font-black text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {getMembershipTypeLabel(membership.membershipType)}
                </span>
              </Badge>
            );
          } else {
            const ptPackage = record as PTPackageRecord;
            return (
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
                <span className="uppercase italic font-black text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
          const usedDays = getUsedDays(record.startDate, record.expiryDate);
          const totalDays = getTotalDays(record.startDate, record.expiryDate);
          const progress = totalDays > 0 ? (usedDays / totalDays) * 100 : 0;

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col gap-1 max-w-[90px] cursor-help">
                    <Progress value={progress} className="h-1.5" />
                    <div className="text-[10px]">
                      <span className="font-mono text-muted-foreground">
                        {format(new Date(record.expiryDate), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
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
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: "paymentType",
        header: "Payment",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="flex flex-col gap-0.5">
              <Badge variant="outline" className="w-fit text-xs">
                {getPaymentTypeLabel(record.paymentType)}
              </Badge>
              {record.paymentRemark && (
                <span className="text-xs text-muted-foreground/70">
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
          return (
            <span className="text-sm font-mono font-bold italic" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              ${row.original.amount.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "paymentDate",
        header: "Payment Date",
        cell: ({ row }) => {
          return (
            <span className="text-xs text-muted-foreground/70">
              {format(new Date(row.original.paymentDate), "MMM d, yyyy")}
            </span>
          );
        },
      },
      {
        accessorKey: "assignedStaffName",
        header: "Assigned To",
        cell: ({ row }) => {
          const record = row.original;
          const assignedStaff = record.assignedStaffName;
          
          if (!assignedStaff) {
            return <span className="text-xs text-muted-foreground/50">-</span>;
          }
          
          return (
            <span className="text-xs text-muted-foreground/70">
              {assignedStaff}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => {
          if (row.recordType === 'membership') {
            return getMembershipStatus(row.startDate, row.expiryDate);
          } else {
            return getPTPackageStatus(row.startDate, row.expiryDate);
          }
        },
        cell: ({ row }) => {
          const record = row.original;
          if (record.recordType === 'membership') {
            const membershipRecord = record as MembershipRecord;
            const status = getMembershipStatus(membershipRecord.startDate, membershipRecord.expiryDate);
            
            // Calculate days left for 7_days_left status
            let daysLeft = 0;
            if (status === '7_days_left') {
              const expiry = new Date(membershipRecord.expiryDate);
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
            if (status === '7_days_left') {
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
                {getMembershipStatusIcon(status)}
                <span>{labels[status]}</span>
              </Badge>
            );
          } else {
            const ptPackageRecord = record as PTPackageRecord;
            const status = getPTPackageStatus(ptPackageRecord.startDate, ptPackageRecord.expiryDate);
            
            // Calculate days left for 7_days_left status
            let daysLeft = 0;
            if (status === '7_days_left') {
              const expiry = new Date(ptPackageRecord.expiryDate);
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
            if (status === '7_days_left') {
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
                {getPTPackageStatusIcon(status)}
                <span>{labels[status]}</span>
              </Badge>
            );
          }
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const record = row.original;
          const isExpired = new Date(record.expiryDate) < new Date();
          
          // Only show manage action for active or expiring packages
          // AND only if user is a manager/admin
          if (isExpired || !isManager) {
            return null;
          }
          
          if (record.recordType === 'membership' && onManageMembership) {
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onManageMembership(record as MembershipRecord)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Membership
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          } else if (record.recordType === 'pt_package' && onManagePTPackage) {
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onManagePTPackage(record as PTPackageRecord)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage PT Package
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          
          return null;
        },
      },
    ],
    [onManageMembership, onManagePTPackage, isManager]
  );

  // Sort records
  const sortedRecords = useMemo(() => {
    const sorted = [...combinedRecords];
    sorting.forEach((sort) => {
      sorted.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sort.id === "status") {
          if (a.recordType === 'membership') {
            aValue = getMembershipStatus(a.startDate, a.expiryDate);
          } else {
            aValue = getPTPackageStatus(a.startDate, a.expiryDate);
          }
          if (b.recordType === 'membership') {
            bValue = getMembershipStatus(b.startDate, b.expiryDate);
          } else {
            bValue = getPTPackageStatus(b.startDate, b.expiryDate);
          }
        } else {
          aValue = (a as any)[sort.id];
          bValue = (b as any)[sort.id];

          if (sort.id === "startDate" || sort.id === "expiryDate" || sort.id === "paymentDate") {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }
        }

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sort.desc ? bValue - aValue : aValue - bValue;
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sort.desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }

        return 0;
      });
    });
    return sorted;
  }, [combinedRecords, sorting]);

  // Paginate records
  const paginatedRecords = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return sortedRecords.slice(start, end);
  }, [sortedRecords, pagination]);

  const table = useReactTable({
    data: paginatedRecords,
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
                className="hover:bg-muted/50 transition-colors h-16"
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
                <div className="flex flex-col items-center justify-center gap-2">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No history found</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {table.getRowModel().rows.length > 0 && (
        <MembersTablePagination table={table} totalRows={totalRows} />
      )}
    </>
  );
}
