"use client";

import { useMemo } from "react";
import { PTPackageRecord, PaymentType } from "../types/pt-package-record";
import { MembershipStatus } from "@/features/dashboard/pages/members/types/member";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ColumnDef } from "@tanstack/react-table";
import { format, differenceInDays } from "date-fns";
import { CreditCard, Banknote, Globe, Wallet, CheckCircle2, XCircle, Clock, AlertTriangle, UserPlus, Edit, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Appointment } from "@/types/appointment";

const formatMemberID = (memberId: string): string => {
  return memberId.padStart(9, "0");
};

// Get short name from full name (e.g., "John Smith" -> "J. Smith")
const getShortName = (fullName?: string): string => {
  if (!fullName) return "-";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  if (parts.length >= 2) {
    return `${parts[0][0]}. ${parts[parts.length - 1]}`;
  }
  return fullName;
};

// Get total days for PT package validity
const getPTPackageTotalDays = (startDate: string, expiryDate: string): number => {
  const start = new Date(startDate);
  const expiry = new Date(expiryDate);
  return differenceInDays(expiry, start);
};

// Calculate used days from start date to now
const getUsedDays = (startDate: string, expiryDate: string): number => {
  const start = new Date(startDate);
  const now = new Date();
  const expiry = new Date(expiryDate);
  
  // If expired, return total days
  if (now > expiry) {
    return differenceInDays(expiry, start);
  }
  
  // Otherwise return days from start to now
  return Math.max(0, differenceInDays(now, start));
};

// Calculate PT Package status based on expiry date (same logic as membership)
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

const ptPackageStatusIconColors: Record<MembershipStatus, string> = {
  active: "text-emerald-600 dark:text-emerald-400",
  expired: "text-red-600 dark:text-red-400",
  new_member: "text-blue-600 dark:text-blue-400",
  expiring_soon: "text-amber-600 dark:text-amber-400",
  '7_days_left': "text-orange-600 dark:text-orange-400",
};

const getPTPackageStatusIcon = (status: MembershipStatus) => {
  const iconColor = ptPackageStatusIconColors[status];
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

const getPTPackageStatusLabel = (status: MembershipStatus): string => {
  const labels: Record<MembershipStatus, string> = {
    active: "Active",
    expired: "Expired",
    new_member: "New Member",
    expiring_soon: "Expiring Soon",
    '7_days_left': "7 Days Left",
  };
  return labels[status] || status;
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

interface UsePTPackageRecordsColumnsProps {
  onView?: (record: PTPackageRecord) => void;
  onEdit?: (record: PTPackageRecord) => void;
  onDelete?: (record: PTPackageRecord) => void;
  appointments?: Appointment[];
}

export const usePTPackageRecordsColumns = ({ onView, onEdit, onDelete, appointments = [] }: UsePTPackageRecordsColumnsProps = {}) => {
  return useMemo<ColumnDef<PTPackageRecord>[]>(
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
        accessorKey: "startDate",
        header: "Duration",
        size: 90,
        cell: ({ row }) => {
          const record = row.original;
          const totalDays = getPTPackageTotalDays(record.startDate, record.expiryDate);
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
            <span className="font-mono font-bold italic" style={{ fontFamily: 'Montserrat, sans-serif' }}>
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
        accessorKey: "issuedBy",
        header: "Issued By",
        size: 100,
        cell: ({ row }) => {
          const record = row.original;
          return (
            <span className="text-sm text-muted-foreground truncate block max-w-[100px]">
              {getShortName(record.issuedBy)}
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
        id: "ptPackageStatus",
        accessorFn: (row) => {
          const status = getPTPackageStatus(
            row.startDate,
            row.expiryDate
          );
          const statusOrder: Record<MembershipStatus, number> = {
            active: 1,
            new_member: 2,
            expiring_soon: 3,
            '7_days_left': 4,
            expired: 5,
          };
          return statusOrder[status] || 0;
        },
        header: "Status",
        cell: ({ row }) => {
          const record = row.original;
          // Calculate status based on expiry date
          const ptPackageStatus = getPTPackageStatus(
            record.startDate,
            record.expiryDate
          );
          
          // For "7 Days Left", show the actual days remaining
          if (ptPackageStatus === '7_days_left') {
            const expiry = new Date(record.expiryDate);
            const now = new Date();
            const daysLeft = differenceInDays(expiry, now);
            
            return (
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal w-fit">
                <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                  {daysLeft}
                </span>
                <span className="text-muted-foreground">Days Left</span>
              </Badge>
            );
          }
          
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal w-fit">
              {getPTPackageStatusIcon(ptPackageStatus)}
              <span>{getPTPackageStatusLabel(ptPackageStatus)}</span>
            </Badge>
          );
        },
        enableSorting: true,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(record)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={() => onDelete(record)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [onView, onEdit, onDelete, appointments]
  );
};

