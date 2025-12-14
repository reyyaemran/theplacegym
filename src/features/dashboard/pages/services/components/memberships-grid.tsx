"use client";

import { Membership } from "@/features/dashboard/pages/memberships/types/membership";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getMembershipTypeLabel = (type: string): string => {
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

interface MembershipsGridProps {
  memberships: Membership[];
  memberCounts: Record<string, number>;
  onEdit: (membership: Membership) => void;
  onDelete: (membership: Membership) => void;
}

export function MembershipsGrid({
  memberships,
  memberCounts,
  onEdit,
  onDelete,
}: MembershipsGridProps) {
  if (memberships.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {memberships.map((membership) => (
        <Card
          key={membership.id}
          className="group relative border-border/60 bg-card hover:border-border/80 transition-all hover:shadow-sm"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 space-y-2">
                <Badge
                  variant="outline"
                  className="gap-1.5 border-muted bg-muted/50 text-sm font-normal"
                >
                  <span className="uppercase italic font-black text-foreground font-montserrat">
                    {membership.name}
                  </span>
                </Badge>
                  {membership.duration > 0 && (
                  <div className="text-xs text-muted-foreground">
                      <span className="font-mono">
                      {membership.duration * 30} days
                        {membership.duration * 30 >= 7 && (
                        <span> / {Math.floor(membership.duration * 30 / 7)} {Math.floor(membership.duration * 30 / 7) === 1 ? 'week' : 'weeks'}</span>
                        )}
                      </span>
                  </div>
                  )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(membership)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(membership)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Price</span>
                <span className="font-mono font-bold text-base text-foreground">
                  ${membership.price.toFixed(2)}
                </span>
              </div>
            </div>
            {membership.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {membership.description}
              </p>
            )}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <Badge
                variant={membership.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {membership.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {memberCounts[membership.id] || 0} {memberCounts[membership.id] === 1 ? 'member' : 'members'}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

