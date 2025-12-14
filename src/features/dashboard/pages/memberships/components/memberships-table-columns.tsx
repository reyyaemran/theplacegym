"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ReactNode, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Membership } from "../types/membership";
import { Edit, MoreVertical, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";

const getMembershipTypeFullName = (type: string): string => {
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
      return type.toUpperCase();
  }
};

interface MembershipActionsDropdownProps {
  membership: Membership;
  onEdit: (membership: Membership) => void;
  onDelete: (membership: Membership) => void;
}

const MembershipActionsDropdown = ({ membership, onEdit, onDelete }: MembershipActionsDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(membership)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => onDelete(membership)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface UseMembershipColumnsProps {
  onEdit: (membership: Membership) => void;
  onDelete: (membership: Membership) => void;
}

export const useMembershipColumns = ({ onEdit, onDelete }: UseMembershipColumnsProps) => {
  return useMemo<ColumnDef<Membership>[]>(
    () => [
      {
        accessorKey: "type",
        header: "Membership Type",
        cell: ({ row }) => {
          const membership = row.original;
          
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
              <span className="uppercase italic font-black text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {getMembershipTypeFullName(membership.type)}
              </span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "duration",
        header: "Duration",
        cell: ({ row }) => {
          const membership = row.original;
          const durationMonths = membership.duration;
          
          if (durationMonths === 0) {
            return <span className="text-sm font-mono text-muted-foreground">1 Day</span>;
          }
          
          // Convert to days if less than 1 month
          if (durationMonths < 1) {
            const days = Math.round(durationMonths * 30);
            return (
              <span className="text-sm font-mono">
                {days} {days === 1 ? "Day" : "Days"}
              </span>
            );
          }
          
          // Show months for 1 month or more
          return (
            <span className="text-sm font-mono">
              {durationMonths} {durationMonths === 1 ? "Month" : "Months"}
            </span>
          );
        },
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => {
          const membership = row.original;
          return (
            <span className="text-sm font-mono font-medium">
              ${membership.price.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const membership = row.original;
          return (
            <span className="text-sm text-muted-foreground">
              {membership.description || "-"}
            </span>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
          const membership = row.original;
          return (
            <Badge
              variant={membership.isActive ? "default" : "secondary"}
              className={
                membership.isActive
                  ? "bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 hover:bg-emerald-600/20 dark:hover:bg-emerald-400/20"
                  : "bg-muted text-muted-foreground"
              }
            >
              {membership.isActive ? "Active" : "Inactive"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ row }) => {
          const membership = row.original;
          if (!membership.updatedAt) return <span className="text-xs text-muted-foreground">-</span>;
          return (
            <span className="text-xs font-mono text-muted-foreground">
              {format(new Date(membership.updatedAt), "MMM dd, yyyy")}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <MembershipActionsDropdown
            membership={row.original}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    []
  );
};

