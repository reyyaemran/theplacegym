"use client";

import { useMemo } from "react";
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
import { MemberActivity } from "../types/member-activity";
import { MembersTableHeaderCell } from "./members-table-header-cell";
import { MembersTablePagination } from "./members-table-pagination";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import { 
  Calendar,
  ShoppingCart,
  Edit,
  Snowflake,
  Package,
  Clock,
  CreditCard,
  CheckCircle2,
  Activity,
  FileText,
} from "lucide-react";

interface MemberActivityTableProps {
  activities: MemberActivity[];
  totalRows: number;
  sorting: SortingState;
  onSort: OnChangeFn<SortingState>;
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
}

const getActivityTypeIcon = (type: MemberActivity["type"]) => {
  switch (type) {
    case "appointment_completed":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "membership_purchased":
    case "pt_package_purchased":
      return <ShoppingCart className="h-3.5 w-3.5" />;
    case "membership_date_changed":
    case "pt_package_date_changed":
      return <Edit className="h-3.5 w-3.5" />;
    case "membership_frozen":
      return <Snowflake className="h-3.5 w-3.5" />;
    case "membership_unfrozen":
      return <Activity className="h-3.5 w-3.5" />;
    case "pt_package_extended":
      return <Clock className="h-3.5 w-3.5" />;
    case "payment_received":
      return <CreditCard className="h-3.5 w-3.5" />;
    case "document_uploaded":
      return <FileText className="h-3.5 w-3.5" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
};

const getActivityTypeColor = (type: MemberActivity["type"]): string => {
  switch (type) {
    case "appointment_completed":
      return "text-emerald-600 dark:text-emerald-400";
    case "membership_purchased":
    case "pt_package_purchased":
      return "text-blue-600 dark:text-blue-400";
    case "membership_date_changed":
    case "pt_package_date_changed":
      return "text-amber-600 dark:text-amber-400";
    case "membership_frozen":
      return "text-slate-600 dark:text-slate-400";
    case "membership_unfrozen":
      return "text-green-600 dark:text-green-400";
    case "pt_package_extended":
      return "text-purple-600 dark:text-purple-400";
    case "payment_received":
      return "text-emerald-600 dark:text-emerald-400";
    case "document_uploaded":
      return "text-indigo-600 dark:text-indigo-400";
    default:
      return "text-muted-foreground";
  }
};

export const getActivityTypeLabel = (type: MemberActivity["type"]): string => {
  switch (type) {
    case "appointment_completed":
      return "Session Completed";
    case "membership_purchased":
      return "Membership Purchased";
    case "membership_date_changed":
      return "Date Changed";
    case "membership_frozen":
      return "Membership Frozen";
    case "membership_unfrozen":
      return "Membership Unfrozen";
    case "pt_package_purchased":
      return "PT Package Purchased";
    case "pt_package_extended":
      return "Package Extended";
    case "pt_package_date_changed":
      return "Date Changed";
    case "payment_received":
      return "Payment Received";
    case "document_uploaded":
      return "Document Uploaded";
    default:
      return "Activity";
  }
};

const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const minutes = differenceInMinutes(now, date);
  const hours = differenceInHours(now, date);
  const days = differenceInDays(now, date);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return format(date, "MMM dd, yyyy");
};

export function MemberActivityTable({
  activities,
  totalRows,
  sorting,
  onSort,
  pagination,
  onPaginationChange,
  pageCount,
}: MemberActivityTableProps) {
  const columns = useMemo<ColumnDef<MemberActivity>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "Date & Time",
        cell: ({ row }) => {
          const activity = row.original;
          const date = new Date(activity.timestamp);
          
          // For completed appointments, show time range instead of relative time
          const isCompletedAppointment = activity.type === "appointment_completed";
          const timeRange = activity.details?.timeRange;
          
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-mono font-medium text-foreground">
                {format(date, "MMM dd, yyyy")}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/70">
                {isCompletedAppointment && timeRange 
                  ? timeRange
                  : `${format(date, "HH:mm")} • ${formatRelativeTime(activity.timestamp)}`
                }
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const activity = row.original;
          const Icon = getActivityTypeIcon(activity.type);
          const color = getActivityTypeColor(activity.type);
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal w-fit">
              <span className={color}>{Icon}</span>
              <span>{getActivityTypeLabel(activity.type)}</span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const activity = row.original;
          const isCompletedAppointment = activity.type === "appointment_completed";
          const isPTPackagePurchase = activity.type === "pt_package_purchased";
          const isMembershipPurchase = activity.type === "membership_purchased";
          
          // For purchase activities, show badge and staff info
          const showPurchaseInfo = isPTPackagePurchase || isMembershipPurchase;
          const packageName = activity.details?.packageName;
          const assignedStaffName = activity.details?.assignedStaffName;
          const assignedStaffLevel = activity.details?.assignedStaffLevel;
          const packageType = activity.details?.packageType;
          
          // Check if we have details to show
          // For PT package purchases, don't show sessions (already in package name)
          const hasDetails = activity.details && (
            activity.details.invoiceNumber || 
            activity.details.amount || 
            (activity.details.sessions && activity.details.sessions > 0 && !isPTPackagePurchase)
          );
          
          return (
            <div className="flex flex-col gap-1.5">
              {showPurchaseInfo ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {packageName && (
                    <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
                      <span className="uppercase font-black text-foreground text-xs" >
                        {packageName}
                      </span>
                    </Badge>
                  )}
                  {assignedStaffName && (
                    <span className="text-xs text-muted-foreground/80">
                      {assignedStaffName}
                      {assignedStaffLevel && (
                        <span className="text-muted-foreground/60 ml-1">({assignedStaffLevel})</span>
                      )}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-sm font-medium text-foreground leading-tight">
                  {activity.description}
                </span>
              )}
              {hasDetails && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {activity.details?.invoiceNumber && (
                    <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal w-fit">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">#{activity.details.invoiceNumber}</span>
                    </Badge>
                  )}
                  {activity.details?.amount && !isCompletedAppointment && (
                    <span className="font-mono font-medium text-foreground/90">
                      ${activity.details.amount.toFixed(2)}
                    </span>
                  )}
                  {activity.details?.sessions && activity.details.sessions > 0 && !isCompletedAppointment && !isPTPackagePurchase && (
                    <span className="font-mono text-muted-foreground">
                      {activity.details.sessions} {activity.details.sessions === 1 ? 'session' : 'sessions'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "performedBy",
        header: "By",
        cell: ({ row }) => {
          const activity = row.original;
          return (
            <span className="text-xs text-muted-foreground">
              {activity.performedBy}
            </span>
          );
        },
      },
    ],
    []
  );

  // Sort activities
  const sortedActivities = useMemo(() => {
    const sorted = [...activities];
    sorting.forEach((sort) => {
      sorted.sort((a, b) => {
        let aValue: any = (a as any)[sort.id];
        let bValue: any = (b as any)[sort.id];

        if (sort.id === "timestamp") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
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
  }, [activities, sorting]);

  // Paginate activities
  const paginatedActivities = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return sortedActivities.slice(start, end);
  }, [sortedActivities, pagination]);

  const table = useReactTable({
    data: paginatedActivities,
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
            <TableRow key={headerGroup.id} className="border-b h-10">
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
                className="hover:bg-muted/50 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-3 align-top"
                  >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Activity className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No activity found</p>
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

