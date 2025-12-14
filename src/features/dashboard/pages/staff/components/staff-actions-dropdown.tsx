"use client";

import { Staff, StaffStatus } from "@/types/staff";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Eye, Edit, Trash2, MoreVertical, ChevronLeft, CheckCircle2, XCircle, Ban, Plane, Flag, Thermometer, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface StaffActionsDropdownProps {
  staff: Staff;
  onView: (staff: Staff) => void;
  onEdit: (staff: Staff) => void;
  onDelete: (staff: Staff) => void;
  onUpdateStatus: (staff: Staff, status: StaffStatus) => void;
  onRate?: (staff: Staff) => void;
}

const statusOptions: { value: StaffStatus; label: string; icon: React.ReactNode }[] = [
  { value: "AVAILABLE", label: "Available", icon: <CheckCircle2 className="h-4 w-4" /> },
  { value: "UNAVAILABLE", label: "Unavailable", icon: <XCircle className="h-4 w-4" /> },
  { value: "DAY_OFF", label: "Day Off", icon: <Ban className="h-4 w-4" /> },
  { value: "ON_LEAVE_ANNUAL", label: "Annual Leave", icon: <Plane className="h-4 w-4" /> },
  { value: "ON_LEAVE_PUBLIC_HOLIDAY", label: "Public Holiday", icon: <Flag className="h-4 w-4" /> },
  { value: "ON_LEAVE_SICK", label: "Sick Leave", icon: <Thermometer className="h-4 w-4" /> },
];

export function StaffActionsDropdown({ 
  staff: targetStaff, 
  onView, 
  onEdit, 
  onDelete, 
  onUpdateStatus, 
  onRate
}: StaffActionsDropdownProps) {
  const { canDelete } = useAuth();
  const isCCorCCS = targetStaff.department === "CC" || targetStaff.department === "CCS";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(targetStaff)}>
          <Eye className="mr-2 h-4 w-4" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(targetStaff)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </DropdownMenuItem>
        {isCCorCCS && onRate && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRate(targetStaff)}>
              <Star className="mr-2 h-4 w-4" />
              Rate
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="[&>svg:last-child]:hidden">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Status
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {statusOptions.map((status) => (
              <DropdownMenuItem
                key={status.value}
                onClick={() => onUpdateStatus(targetStaff, status.value)}
                className={targetStaff.status === status.value ? "bg-accent" : ""}
              >
                {status.icon}
                <span className="ml-2">{status.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive" 
              onClick={() => onDelete(targetStaff)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
