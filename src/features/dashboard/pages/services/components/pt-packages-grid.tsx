"use client";

import { PTPackage } from "../types/pt-package";
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

interface PTPackagesGridProps {
  ptPackages: PTPackage[];
  memberCounts: Record<string, number>;
  onEdit: (ptPackage: PTPackage) => void;
  onDelete: (ptPackage: PTPackage) => void;
}

export function PTPackagesGrid({
  ptPackages,
  memberCounts,
  onEdit,
  onDelete,
}: PTPackagesGridProps) {
  if (ptPackages.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {ptPackages.map((ptPackage) => (
        <Card
          key={ptPackage.id}
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
                    {ptPackage.name}
                  </span>
                </Badge>
                {ptPackage.validityDays && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-mono">
                      {ptPackage.validityDays} Days
                      {ptPackage.validityDays >= 7 && (
                        <span> / {Math.floor(ptPackage.validityDays / 7)} {Math.floor(ptPackage.validityDays / 7) === 1 ? 'Week' : 'Weeks'}</span>
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
                  <DropdownMenuItem onClick={() => onEdit(ptPackage)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(ptPackage)}
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
                <span className="text-xs text-muted-foreground">Total Price</span>
                <span className="font-mono font-bold text-base text-foreground">
                  ${ptPackage.price.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Price/Session</span>
                <span className="font-mono font-semibold text-foreground">
                  ${ptPackage.pricePerSession.toFixed(2)}
                </span>
              </div>
            </div>
            {ptPackage.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {ptPackage.description}
              </p>
            )}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
              <Badge
                variant={ptPackage.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {ptPackage.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {memberCounts[ptPackage.id] || 0} {memberCounts[ptPackage.id] === 1 ? 'member' : 'members'}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

