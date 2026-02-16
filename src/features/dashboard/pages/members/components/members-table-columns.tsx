"use client";

import { useMemo, ReactNode } from "react";
import { Member, MemberStatus, MembershipStatus, MembershipType } from "@/features/dashboard/pages/members/types/member";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, differenceInDays, addMonths, addDays } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { MemberActionsDropdown } from "./members-actions-dropdown";
import { CheckCircle2, XCircle, UserPlus, Calendar, CalendarDays, Infinity, AlertTriangle, Clock } from "lucide-react";
import { mockPTPackageRecords } from "@/features/dashboard/pages/ptpackage-invoice/data/mock-pt-package-records";
import { mockAppointments } from "@/lib/mock-data";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { Appointment } from "@/types/appointment";

// Helper function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const statusColors: Record<MemberStatus, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  blocked: "bg-red-100 text-red-800",
};

export const membershipStatusIconColors: Record<MembershipStatus, string> = {
  active: "text-emerald-600 dark:text-emerald-400",
  expired: "text-red-600 dark:text-red-400",
  new_member: "text-blue-600 dark:text-blue-400",
  renew: "text-purple-600 dark:text-purple-400",
  expiring_soon: "text-amber-600 dark:text-amber-400",
  '7_days_left': "text-orange-600 dark:text-orange-400",
};

export const membershipTypeLabels: Record<MembershipType, string> = {
  day_pass: "DAY PASS",
  '1_month': "1 MONTH",
  '3_month': "3 MONTHS",
  '6_month': "6 MONTHS",
  '1_year': "1 YEAR",
};

export const getMembershipStatusIcon = (status: MembershipStatus) => {
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

// Get membership duration in months based on membership type
const getMembershipDurationMonths = (membershipType?: MembershipType): number => {
  switch (membershipType) {
    case 'day_pass':
      return 0; // 1 day, handled separately
    case '1_month':
      return 1;
    case '3_month':
      return 3;
    case '6_month':
      return 6;
    case '1_year':
      return 12;
    default:
      return 0;
  }
};

// Calculate membership status based on dateJoined and membership type
export const getMembershipStatus = (
  dateJoined: string,
  membershipType?: MembershipType,
  ptPackageExpiryDate?: string
): MembershipStatus => {
  const joinedDate = new Date(dateJoined);
  const now = new Date();
  const daysSinceJoined = differenceInDays(now, joinedDate);
  
  // Calculate membership expiry based on joined date + membership duration
  let membershipExpiry: Date | null = null;
  if (membershipType) {
    const durationMonths = getMembershipDurationMonths(membershipType);
    if (membershipType === 'day_pass') {
      // Day pass expires after 1 day
      membershipExpiry = addDays(joinedDate, 1);
    } else if (durationMonths > 0) {
      membershipExpiry = addMonths(joinedDate, durationMonths);
    }
  }
  
  // Check membership expiry status
  if (membershipExpiry) {
    const daysUntilExpiry = differenceInDays(membershipExpiry, now);
    
    if (membershipExpiry < now) {
      return 'expired';
    }
    
    // 7 days or less left
    if (daysUntilExpiry <= 7) {
      return '7_days_left';
    }
    
    // 14 days (2 weeks) or less left
    if (daysUntilExpiry <= 14) {
      return 'expiring_soon';
    }
  }
  
  // New member if less than 30 days
  if (daysSinceJoined < 30) {
    return 'new_member';
  }
  
  return 'active';
};

// Format Cambodia phone number
export const formatCambodiaPhone = (phone: string): string => {
  // Remove any non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 855 (country code), format as +855 XX XXX XXXX
  if (digits.startsWith('855') && digits.length >= 12) {
    const num = digits.substring(3);
    return `+855 ${num.substring(0, 2)} ${num.substring(2, 5)} ${num.substring(5)}`;
  }
  
  // If starts with 0, format as 0XX XXX XXXX
  if (digits.startsWith('0') && digits.length >= 9) {
    return `${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }
  
  // Default: return as is
  return phone;
};

// Ring indicator component for PT Package - shows balance/total
// Color: Green when high balance (good), Red when low balance (warning)
const BalanceRingIndicator = ({
  balance,
  total,
  size = 56,
  strokeWidth = 4,
}: {
  balance: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) => {
  // Calculate percentage of balance remaining (balance / total)
  const percentage = total > 0 ? (balance / total) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100);

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
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30 dark:text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-500 ease-out ${ringColor}`}
        />
      </svg>
      <div className="absolute flex items-baseline justify-center gap-0.5">
        <span className="font-mono text-sm font-semibold text-foreground leading-none">
          {balance}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/70 leading-none">/</span>
        <span className="font-mono text-xs text-muted-foreground leading-none">
          {total}
        </span>
      </div>
    </div>
  );
};

interface UseMemberColumnsProps {
  onEdit?: (member: Member) => void;
  ptPackageRecords?: PTPackageRecord[];
  appointments?: Appointment[];
}

export const useMemberColumns = ({ 
  onEdit,
  ptPackageRecords = mockPTPackageRecords,
  appointments = mockAppointments,
}: UseMemberColumnsProps = {}) => {
  return useMemo<ColumnDef<Member>[]>(
    () => [
      {
        accessorKey: "memberNumber",
        header: "Member ID",
        cell: ({ row }) => (
          <div className="font-medium font-mono text-sm">{row.getValue("memberNumber")}</div>
        ),
      },
      {
        accessorKey: "fullName",
        header: "Name",
        cell: ({ row }) => {
          const member = row.original;
          return (
            <div className="flex items-center gap-3 h-full">
              <Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-sm">
                <AvatarImage src="" />
                <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {getInitials(member.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">{row.getValue("fullName")}</span>
          </div>
            </div>
          );
        },
      },
      {
        accessorKey: "dateJoined",
        header: "Member Since",
        cell: ({ row }) => {
          const member = row.original;
          const joinedDate = new Date(member.dateJoined);
          
          return (
            <span className="text-xs font-mono text-muted-foreground">
              {format(joinedDate, "MMM dd, yyyy")}
            </span>
          );
        },
      },
      {
        accessorKey: "membershipType",
        header: "Membership Type",
        cell: ({ row }) => {
          const member = row.original;
          const membershipType = member.membershipType;
          
          if (!membershipType) {
            return <span className="text-sm text-muted-foreground">-</span>;
          }
          
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
              <span className="uppercase italic font-black text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {membershipTypeLabels[membershipType]}
              </span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "ptPackageSessions",
        header: "PT Package",
        cell: ({ row }) => {
          const member = row.original;
          
          // Calculate balance sessions from PT package records (same logic as member profile)
          const memberPTPackageRecords = ptPackageRecords.filter(
            (record) => record.memberId === member.memberNumber || record.memberName === member.fullName
          );
          
          // Get member's appointments
          const memberAppointments = appointments.filter(
            (apt) => apt.clientName === member.fullName || apt.clientId === member.id
          );
          
          // Calculate total balance sessions from ALL active PT packages
          const activePTPackages = memberPTPackageRecords.filter(record => {
            const expiry = new Date(record.expiryDate);
            return expiry > new Date();
          });
          
          let totalBalanceSessions = 0;
          let totalSessions = 0;
          
          activePTPackages.forEach(record => {
            const packageTotalSessions = record.ptPackageSessions || 0;
            const usedSessions = memberAppointments.filter(
              apt => apt.ptPackageRecordId === record.id && apt.status === "COMPLETED"
            ).length;
            const balanceSessions = Math.max(0, packageTotalSessions - usedSessions);
            totalBalanceSessions += balanceSessions;
            totalSessions += packageTotalSessions;
          });
          
          // If no active packages, show dash
          if (totalSessions === 0) {
            return <span className="text-sm text-muted-foreground">-</span>;
          }
          
          // Show balance sessions / total sessions (balance, not used)
          // The RingIndicator shows used/total, so we need to pass balance correctly
          // But we want to show balance/total, so we'll modify the display
          const usedSessions = totalSessions - totalBalanceSessions;
          
          return (
            <div className="flex items-center justify-center h-full">
              <BalanceRingIndicator 
                balance={totalBalanceSessions} 
                total={totalSessions} 
                size={56} 
                strokeWidth={4} 
              />
            </div>
          );
        },
      },
      {
        id: "ptPackageExpiry",
        header: "PT Package Expiry",
        cell: ({ row }) => {
          const member = row.original;
          
          if (!ptPackageRecords || ptPackageRecords.length === 0) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          
          // Find all PT package records for this member
          const memberPTPackageRecords = ptPackageRecords.filter(
            (record) => {
              const matchesById = record.memberId === member.memberNumber;
              const matchesByName = record.memberName === member.fullName;
              return matchesById || matchesByName;
            }
          );
          
          // If no packages, show dash
          if (memberPTPackageRecords.length === 0) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          
          // Get packages that have started (current date is on or after start date)
          const startedPackages = memberPTPackageRecords.filter(record => {
            if (!record.startDate) return true; // If no start date, include it
            const start = new Date(record.startDate);
            start.setHours(0, 0, 0, 0);
            return now >= start;
          });
          
          // Use started packages if available, otherwise use all packages
          const packagesToCheck = startedPackages.length > 0 ? startedPackages : memberPTPackageRecords;
          
          // Get the most recent package (latest expiry date)
          const latestPackage = packagesToCheck.reduce((latest, current) => {
            if (!latest.expiryDate) return current;
            if (!current.expiryDate) return latest;
            const latestExpiry = new Date(latest.expiryDate);
            const currentExpiry = new Date(current.expiryDate);
            return currentExpiry > latestExpiry ? current : latest;
          });
          
          if (!latestPackage || !latestPackage.expiryDate) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          
          const expiry = new Date(latestPackage.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          const isExpired = expiry < now;
          const daysUntilExpiry = differenceInDays(expiry, now);
          
          // Determine color based on expiry status - use muted secondary colors
          let dateColor = 'text-muted-foreground';
          if (isExpired) {
            dateColor = 'text-red-600/70 dark:text-red-400/70';
          } else if (daysUntilExpiry <= 7) {
            dateColor = 'text-amber-600/70 dark:text-amber-400/70';
          }
          
          return (
            <span className={`text-xs font-mono ${dateColor}`}>
              {format(expiry, "MMM dd, yyyy")}
            </span>
          );
        },
      },
      {
        id: "membershipStatus",
        header: "Status",
        cell: ({ row }) => {
          const member = row.original;
          const membershipStatus = getMembershipStatus(
            member.dateJoined,
            member.membershipType,
            member.ptPackageExpiryDate
          );
          
          // Calculate days left for 7_days_left status based on membership expiry
          let daysLeft = 0;
          if (membershipStatus === '7_days_left' && member.membershipType) {
            const joinedDate = new Date(member.dateJoined);
            const durationMonths = getMembershipDurationMonths(member.membershipType);
            let membershipExpiry: Date;
            
            if (member.membershipType === 'day_pass') {
              membershipExpiry = addDays(joinedDate, 1);
            } else if (durationMonths > 0) {
              membershipExpiry = addMonths(joinedDate, durationMonths);
            } else {
              membershipExpiry = joinedDate;
            }
            
            const now = new Date();
            daysLeft = differenceInDays(membershipExpiry, now);
          }
          
          const labels: Record<MembershipStatus, string> = {
            active: "Active",
            expired: "Expired",
            new_member: "New Member",
            renew: "Renewed",
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
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => <MemberActionsDropdown member={row.original} onEdit={onEdit} />,
      },
    ],
    [onEdit, ptPackageRecords, appointments]
  );
}; 