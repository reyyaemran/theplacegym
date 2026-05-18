"use client";

import { useState } from "react";
import {
  MessageSquare,
  CalendarDays,
  Circle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useOnlineStaff } from "@/hooks/use-online-staff";
import { useAuth } from "@/hooks/use-auth";
import { SendNoteDialog } from "./send-note-dialog";
import { LeaveRequestDialog } from "./leave-request-dialog";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const DEPT_COLORS: Record<string, string> = {
  PT: "bg-blue-500",
  PTS: "bg-blue-600",
  FC: "bg-emerald-500",
  FCS: "bg-emerald-600",
  CC: "bg-amber-500",
  CCS: "bg-amber-600",
  CM: "bg-purple-500",
  ASM: "bg-purple-600",
};

const SUPERVISOR_DEPARTMENTS = ["PTS", "CCS", "CM"];

export function NavOnline() {
  const { data: onlineStaff = [], isLoading } = useOnlineStaff();
  const { staff: currentStaff } = useAuth();
  const { isMobile } = useSidebar();

  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    staffId: string;
    staffName: string;
  }>({ open: false, staffId: "", staffName: "" });

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  // Filter out self from online list
  const staffAny = currentStaff as unknown as Record<string, unknown> | null;
  const currentId = staffAny?.staffId || staffAny?._id || "";
  const others = onlineStaff.filter(
    (s) => s._id !== currentId
  );

  return (
    <SidebarGroup
      className="group-data-[collapsible=icon]:hidden"
      aria-label="Online staff"
    >
      <SidebarGroupLabel>
        <span className="flex items-center gap-1.5">
          Online
          {!isLoading && (
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">
              ({others.length})
            </span>
          )}
        </span>
      </SidebarGroupLabel>

      <SidebarMenu>
        {isLoading ? (
          <SidebarMenuItem>
            <div className="flex gap-1 px-2 py-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-full bg-muted animate-pulse"
                />
              ))}
            </div>
          </SidebarMenuItem>
        ) : others.length === 0 ? (
          <SidebarMenuItem>
            <span className="px-2 py-1 text-[11px] text-muted-foreground">
              No other staff online
            </span>
          </SidebarMenuItem>
        ) : (
          <SidebarMenuItem>
            <div className="flex flex-wrap gap-1 px-2 py-1">
              {others.map((member) => (
                <DropdownMenu key={member._id}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="relative focus:outline-none rounded-full transition-transform hover:scale-110"
                      aria-label={`${member.name} (${member.department})`}
                    >
                      <Avatar className="h-7 w-7 border border-background shadow-sm">
                        <AvatarImage
                          src={member.avatar || ""}
                          alt={member.name}
                        />
                        <AvatarFallback
                          className="text-[10px] font-black bg-gradient-to-br from-muted to-muted/80 text-foreground font-montserrat"
                        >
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Green dot indicator */}
                      <Circle
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 fill-green-500 text-background stroke-[3]"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                      side={isMobile ? "bottom" : "right"}
                      align="start"
                      className="w-44"
                    >
                      <div className="px-2 py-1.5">
                        <div className="text-xs font-semibold">{member.name}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${DEPT_COLORS[member.department || ""] || "bg-gray-400"}`}
                          />
                          {member.department}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-xs cursor-pointer"
                        onClick={() =>
                          setNoteDialog({
                            open: true,
                            staffId: member._id || "",
                            staffName: member.name,
                          })
                        }
                      >
                        <MessageSquare className="h-3 w-3 mr-2" />
                        Send Note
                      </DropdownMenuItem>
                      {SUPERVISOR_DEPARTMENTS.includes(member.department || "") && (
                        <DropdownMenuItem
                          className="text-xs cursor-pointer"
                          onSelect={() => {
                            setTimeout(() => setLeaveDialogOpen(true), 150);
                          }}
                        >
                          <CalendarDays className="h-3 w-3 mr-2" />
                          Request Leave
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}
            </div>
          </SidebarMenuItem>
        )}
      </SidebarMenu>

      {/* Send Note Dialog */}
      <SendNoteDialog
        open={noteDialog.open}
        onOpenChange={(open) =>
          setNoteDialog((prev) => ({ ...prev, open }))
        }
        toStaffId={noteDialog.staffId}
        toStaffName={noteDialog.staffName}
      />

      {/* Leave Request Dialog */}
      <LeaveRequestDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
      />
    </SidebarGroup>
  );
}
