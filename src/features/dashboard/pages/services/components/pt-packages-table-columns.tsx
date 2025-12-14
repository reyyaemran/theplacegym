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
import { PTPackage } from "../types/pt-package";
import { Edit, MoreVertical, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";

interface PTPackageActionsDropdownProps {
  ptPackage: PTPackage;
  onEdit: (ptPackage: PTPackage) => void;
  onDelete: (ptPackage: PTPackage) => void;
}

const PTPackageActionsDropdown = ({ ptPackage, onEdit, onDelete }: PTPackageActionsDropdownProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(ptPackage)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => onDelete(ptPackage)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface UsePTPackageColumnsProps {
  onEdit: (ptPackage: PTPackage) => void;
  onDelete: (ptPackage: PTPackage) => void;
}

export const usePTPackageColumns = ({ onEdit, onDelete }: UsePTPackageColumnsProps) => {
  return useMemo<ColumnDef<PTPackage>[]>(
    () => [
      {
        accessorKey: "sessions",
        header: "PT Package",
        cell: ({ row }) => {
          const ptPackage = row.original;
          
          return (
            <Badge variant="outline" className="gap-1.5 border-muted bg-muted/50 text-xs font-normal">
              <span className="uppercase italic font-black text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {ptPackage.shortName} SESSIONS
              </span>
            </Badge>
          );
        },
      },
      {
        id: "duration",
        accessorKey: "validityDays",
        header: "Duration",
        cell: ({ row }) => {
          const ptPackage = row.original;
          const days = ptPackage.validityDays || 0;
          return (
            <span className="text-sm font-mono font-medium">
              {days} {days === 1 ? "Day" : "Days"}
            </span>
          );
        },
      },
      {
        accessorKey: "price",
        header: "Total Price",
        cell: ({ row }) => {
          const ptPackage = row.original;
          return (
            <span className="text-sm font-mono font-medium">
              ${ptPackage.price.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "pricePerSession",
        header: "Price/Sessions",
        cell: ({ row }) => {
          const ptPackage = row.original;
          return (
            <span className="text-sm font-mono text-muted-foreground">
              ${ptPackage.pricePerSession.toFixed(2)}
            </span>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => {
          const ptPackage = row.original;
          return (
            <span className="text-sm text-muted-foreground">
              {ptPackage.description || "-"}
            </span>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
          const ptPackage = row.original;
          return (
            <Badge
              variant={ptPackage.isActive ? "default" : "secondary"}
              className={
                ptPackage.isActive
                  ? "bg-emerald-600/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 hover:bg-emerald-600/20 dark:hover:bg-emerald-400/20"
                  : "bg-muted text-muted-foreground"
              }
            >
              {ptPackage.isActive ? "Active" : "Inactive"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Last Update",
        cell: ({ row }) => {
          const ptPackage = row.original;
          if (!ptPackage.updatedAt) return <span className="text-xs text-muted-foreground">-</span>;
          return (
            <span className="text-xs font-mono text-muted-foreground">
              {format(new Date(ptPackage.updatedAt), "MMM dd, yyyy")}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <PTPackageActionsDropdown
            ptPackage={row.original}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [onEdit, onDelete]
  );
};

