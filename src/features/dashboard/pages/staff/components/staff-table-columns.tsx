"use client";

import { useMemo, ReactNode } from "react";
import { Staff, StaffStatus, StaffDepartment, StaffLevel } from "@/types/staff";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ColumnDef } from "@tanstack/react-table";
import { StaffActionsDropdown } from "./staff-actions-dropdown";
import {
  CheckCircle2,
  XCircle,
  Ban,
  Plane,
  Flag,
  Thermometer,
  Users,
  Target,
  Circle,
  Award,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Helper function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Format StaffID - use staffID if available, otherwise format _id
const formatStaffID = (staffID?: string, _id?: string): string => {
  // If staffID is provided, use it directly
  if (staffID) {
    return staffID;
  }
  // Otherwise, format _id as fallback
  if (!_id) return "-";
  // Format as 9 digits with leading zeros (e.g., 000005124)
  const num = parseInt(_id, 10) || 0;
  return String(num).padStart(9, "0");
};

export const getDepartmentIcon = (dept: StaffDepartment): ReactNode => {
  switch (dept) {
    case "PT":
    case "PTS":
      return <Users className="h-3 w-3" />;
    case "FC":
    case "FCS":
      return <Target className="h-3 w-3" />;
    case "CC":
    case "CCS":
      return <Circle className="h-3 w-3" />;
    case "CM":
    case "ASM":
      return <Award className="h-3 w-3" />;
  }
};

export const getStatusIcon = (status: StaffStatus) => {
  switch (status) {
    case "AVAILABLE":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
    case "UNAVAILABLE":
      return <XCircle className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />;
    case "DAY_OFF":
      return <Ban className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
    case "ON_LEAVE_ANNUAL":
      return <Plane className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
    case "ON_LEAVE_PUBLIC_HOLIDAY":
      return <Flag className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
    case "ON_LEAVE_SICK":
      return <Thermometer className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
  }
};

export const getStatusLabel = (status: StaffStatus): string => {
  const labels: Record<StaffStatus, string> = {
    AVAILABLE: "Available",
    UNAVAILABLE: "Unavailable",
    DAY_OFF: "Day Off",
    ON_LEAVE_ANNUAL: "Annual Leave",
    ON_LEAVE_PUBLIC_HOLIDAY: "Public Holiday",
    ON_LEAVE_SICK: "Sick Leave",
  };
  return labels[status];
};

// Ring indicator component for Conduct
const RingIndicator = ({
  actual,
  target,
  size = 56,
  strokeWidth = 4,
}: {
  actual: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const percentage = target > 0 ? (actual / target) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100);

  let ringColor = "stroke-slate-400 dark:stroke-slate-500";
  if (normalizedPercentage >= 100) {
    ringColor = "stroke-emerald-500 dark:stroke-emerald-400";
  } else if (normalizedPercentage >= 75) {
    ringColor = "stroke-amber-500 dark:stroke-amber-400";
  } else if (normalizedPercentage >= 50) {
    ringColor = "stroke-orange-500 dark:stroke-orange-400";
  } else if (normalizedPercentage > 0) {
    ringColor = "stroke-red-500 dark:stroke-red-400";
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
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
      <div className="absolute flex items-baseline justify-center gap-0.5" style={{ marginTop: '2px' }}>
        <span className="font-mono text-xs font-semibold text-foreground leading-none">
          {actual}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground/70 leading-none">/</span>
        <span className="font-mono text-[10px] text-muted-foreground leading-none">
          {target}
        </span>
      </div>
    </div>
  );
};

interface UseStaffColumnsProps {
  staffMetrics: Record<string, { sales: number; conduct: number; salesPercent: number; conductPercent: number }>;
  onView: (staff: Staff) => void;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  onUpdateStatus: (staff: Staff, status: Staff["status"]) => void;
  onRate?: (staff: Staff) => void;
}

export const useStaffColumns = ({ staffMetrics, onView, onEdit, onDelete, onUpdateStatus, onRate }: UseStaffColumnsProps) => {
  return useMemo<ColumnDef<Staff>[]>(
    () => [
      {
        accessorKey: "staffID",
        header: "Staff ID",
        cell: ({ row }) => {
          const staff = row.original;
          return (
            <div className="font-medium font-mono text-sm">{formatStaffID(staff.staffID, staff._id)}</div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const staff = row.original;
          return (
            <div className="flex items-center gap-3 h-full">
              <Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-sm">
                <AvatarImage src="" />
                <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {getInitials(staff.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">{row.getValue("name")}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "department",
        header: "Department & Level",
        cell: ({ row }) => {
          const staff = row.original;
          const dept = row.getValue("department") as StaffDepartment;
          const level = staff.level;
          return (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
                {getDepartmentIcon(dept)}
                <span>{dept}</span>
              </Badge>
              {level && (
                <Badge variant="outline" className="border-muted bg-muted/50 text-xs font-normal">
                  {level}
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as StaffStatus;
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/30 text-xs font-normal h-6">
              {getStatusIcon(status)}
              <span>{getStatusLabel(status)}</span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "monthlySaleTarget",
        header: "Sales",
        cell: ({ row }) => {
          const staff = row.original;
          const target = staff.monthlySaleTarget;
          if (target === undefined) return <span className="text-muted-foreground text-sm">-</span>;
          
          const staffKey = staff._id || "";
          const metrics = staffMetrics[staffKey];
          const actualSales = metrics?.sales || 0;
          const salesPercent = metrics?.salesPercent || 0;

          // Determine progress bar color
          let progressColorClass = "";
          if (salesPercent >= 100) {
            progressColorClass = "[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-400";
          } else if (salesPercent >= 60) {
            progressColorClass = "[&>div]:bg-amber-600 dark:[&>div]:bg-amber-400";
          } else if (salesPercent > 0) {
            progressColorClass = "[&>div]:bg-red-600 dark:[&>div]:bg-red-400";
          }

          return (
            <div className="flex flex-col justify-center gap-1 min-w-[100px] h-full">
              <div className="flex items-baseline gap-0.5">
                <span className="font-mono text-xs font-semibold">
                  {actualSales > 0 ? actualSales.toLocaleString() : "0"}
                </span>
                <span className="text-muted-foreground font-mono text-[10px]">/</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {target.toLocaleString()}
                </span>
              </div>
              {metrics && (
                <div className="flex flex-col gap-0.5">
                  <div className="w-[80px]">
                    <Progress
                      value={Math.min(salesPercent, 100)}
                      className={`h-1.5 ${progressColorClass}`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {salesPercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "monthlyConductTarget",
        header: "Conduct",
        cell: ({ row }) => {
          const staff = row.original;
          const target = staff.monthlyConductTarget;
          if (target === undefined) return <span className="text-muted-foreground text-sm">-</span>;
          
          const staffKey = staff._id || "";
          const metrics = staffMetrics[staffKey];
          const conductPercent = metrics?.conductPercent || 0;
          const actualConduct = metrics?.conduct || 0;

          return (
            <div className="flex items-center justify-center h-full">
              {metrics ? (
                <RingIndicator actual={actualConduct} target={target} size={56} strokeWidth={4} />
              ) : (
                <RingIndicator actual={0} target={target} size={56} strokeWidth={4} />
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <StaffActionsDropdown 
            staff={row.original} 
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateStatus={onUpdateStatus}
            onRate={onRate}
          />
        ),
      },
    ],
    [staffMetrics, onView, onEdit, onDelete, onUpdateStatus, onRate]
  );
};
