"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  BellIcon,
  UserPlus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Dumbbell,
  CreditCard,
  Cake,
  MessageSquare,
  CalendarClock,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMembershipRecords } from "@/hooks/use-membership-records";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useAppointments } from "@/hooks/use-appointments";
import { useMembers } from "@/hooks/use-members";
import { useStaff } from "@/hooks/use-staff";
import { useAuth } from "@/hooks/use-auth";
import { useStaffNotes, useMarkNoteRead } from "@/hooks/use-staff-notes";
import { useLeaveRequests, useReviewLeaveRequest } from "@/hooks/use-leave-requests";
import { LEAVE_TYPE_LABELS } from "@/types/leave-request";
import type { LeaveRequest } from "@/types/leave-request";
import { format, differenceInDays, isToday, isYesterday, subDays } from "date-fns";
import { isRecordAssignedToStaff } from "@/lib/staff-assignment";

const SUPERVISOR_DEPARTMENTS = ["PTS", "CCS", "CM", "ASM"];

interface NotificationItem {
  id: string;
  type: "activity" | "alert" | "info" | "note" | "leave-pending";
  icon: React.ReactNode;
  title: string;
  description: string;
  time: Date;
  category: "membership" | "pt-package" | "appointment" | "member" | "system" | "staff-note" | "leave-pending";
  fromStaffId?: string;
  fromStaffName?: string;
  fromStaffAvatar?: string;
  leaveRequestId?: string;
  leaveRequest?: LeaveRequest;
}

const STORAGE_KEY_PREFIX = "tp-notifications-read";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * NotificationsDropdown Component
 * 
 * Shows recent activities and alerts in the dashboard header.
 * Tracks read/unread state per user (each user has their own read state).
 * Only superadmin sees all notifications; staff see only relevant ones.
 */
export function NotificationsDropdown() {
  const { isSuperAdmin, staff } = useAuth();
  const staffDepartment = (staff as { department?: string } | null)?.department;
  const isSupervisor = staffDepartment && SUPERVISOR_DEPARTMENTS.includes(staffDepartment);
  const { data: membershipRecords = [] } = useMembershipRecords();
  const { data: ptPackageRecords = [] } = usePTPackageRecords();
  const { data: appointments = [] } = useAppointments();
  const { data: members = [] } = useMembers();
  const { data: staffList = [] } = useStaff();
  const { data: receivedNotes = [] } = useStaffNotes("received");
  const { data: pendingLeaveRequests = [] } = useLeaveRequests(
    isSupervisor ? { status: "PENDING" } : undefined
  );
  const markNoteRead = useMarkNoteRead();
  const reviewLeaveRequest = useReviewLeaveRequest();
  
  // Get current user ID for user-specific storage key
  const currentUserId = (staff as any)?.staffId || (staff as any)?._id || "anonymous";
  const storageKey = `${STORAGE_KEY_PREFIX}-${currentUserId}`;
  
  // Track read notification IDs in localStorage (per user)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Load read IDs from localStorage on mount (user-specific)
  useEffect(() => {
    if (!currentUserId) return;
    
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Clean up old entries (older than 7 days)
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const validEntries = Object.entries(parsed).filter(
          ([_, timestamp]) => now - (timestamp as number) < sevenDaysMs
        );
        const cleanedIds = new Set(validEntries.map(([id]) => id));
        setReadIds(cleanedIds);
        // Save cleaned version back
        localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(validEntries)));
      } catch {
        setReadIds(new Set());
      }
    } else {
      setReadIds(new Set());
    }
    setHasHydrated(true);
  }, [currentUserId, storageKey]);

  // Generate notifications from data
  const notifications = useMemo(() => {
    const items: NotificationItem[] = [];
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    const isAdmin = (staff as { isAdmin?: boolean; role?: string } | null)?.isAdmin || (staff as { role?: string } | null)?.role === "SUPERADMIN" || (staff as { role?: string } | null)?.role === "ADMIN";
    const isPT = staffDepartment === "PT" || staffDepartment === "PTS";
    const isFC = staffDepartment === "FC" || staffDepartment === "FCS";
    const currentStaffId = (staff as { _id?: string; staffId?: string })?.staffId ?? (staff as { _id?: string })?._id;

    // For PT/FC: only show notifications for their assigned clients. Admins see all.
    const myClientMemberIds = new Set<string>();
    if (!isAdmin && staff) {
      if (isPT) {
        ptPackageRecords
          .filter((r) => isRecordAssignedToStaff(r, staff))
          .forEach((r) => myClientMemberIds.add(String(r.memberId)));
      } else if (isFC) {
        membershipRecords
          .filter((r) => isRecordAssignedToStaff(r, staff))
          .forEach((r) => myClientMemberIds.add(String(r.memberId)));
      }
    }

    // Recent Membership Invoices (last 7 days)
    membershipRecords
      .filter((record) => {
        if (isAdmin) return new Date(record.paymentDate) >= sevenDaysAgo;
        if (isFC && isRecordAssignedToStaff(record, staff)) return new Date(record.paymentDate) >= sevenDaysAgo;
        return false;
      })
      .slice(0, 5)
      .forEach((record, idx) => {
        const rid = record.id ?? (record as { _id?: string })._id ?? `m-${record.memberId}-${record.invoiceNumber}-${idx}`;
        items.push({
          id: `membership-${rid}`,
          type: "activity",
          icon: <CreditCard className="h-4 w-4 text-emerald-500" />,
          title: "Membership Issued",
          description: `${record.memberName} - ${record.membershipType?.replace(/_/g, " ").toUpperCase() || "Membership"}`,
          time: new Date(record.paymentDate),
          category: "membership",
        });
      });

    // Recent PT Package Invoices (last 7 days)
    ptPackageRecords
      .filter((record) => {
        if (isAdmin) return new Date(record.paymentDate) >= sevenDaysAgo;
        if (isPT && isRecordAssignedToStaff(record, staff)) return new Date(record.paymentDate) >= sevenDaysAgo;
        return false;
      })
      .slice(0, 5)
      .forEach((record, idx) => {
        const rid = record.id ?? (record as { _id?: string })._id ?? `pt-${record.memberId}-${record.invoiceNumber}-${idx}`;
        items.push({
          id: `pt-${rid}`,
          type: "activity",
          icon: <Dumbbell className="h-4 w-4 text-purple-500" />,
          title: "PT Package Issued",
          description: `${record.memberName} - ${record.ptPackageName}`,
          time: new Date(record.paymentDate),
          category: "pt-package",
        });
      });

    // Completed Appointments Today
    appointments
      .filter((apt) => {
        if (!apt.status || apt.status !== "COMPLETED" || !apt.date || !isToday(new Date(apt.date))) return false;
        if (isAdmin) return true;
        const aptStaffId = (apt as { staffId?: string }).staffId;
        return currentStaffId && aptStaffId && String(aptStaffId) === String(currentStaffId);
      })
      .slice(0, 3)
      .forEach((apt, idx) => {
        const aid = apt._id ?? apt.appointmentNumber ?? `apt-completed-${idx}`;
        items.push({
          id: `apt-completed-${aid}`,
          type: "activity",
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          title: "Session Completed",
          description: `${apt.clientName} with ${apt.staffName || "Staff"}`,
          time: new Date(apt.date!),
          category: "appointment",
        });
      });

    // Upcoming Appointments Today
    appointments
      .filter((apt) => {
        if (!apt.status || apt.status !== "SCHEDULED" || !apt.date || !isToday(new Date(apt.date))) return false;
        if (isAdmin) return true;
        const aptStaffId = (apt as { staffId?: string }).staffId;
        return currentStaffId && aptStaffId && String(aptStaffId) === String(currentStaffId);
      })
      .slice(0, 3)
      .forEach((apt, idx) => {
        const aid = apt._id ?? apt.appointmentNumber ?? `apt-upcoming-${idx}`;
        items.push({
          id: `apt-upcoming-${aid}`,
          type: "info",
          icon: <Calendar className="h-4 w-4 text-blue-500" />,
          title: "Upcoming Session",
          description: `${apt.clientName} at ${apt.time || "TBD"}`,
          time: new Date(apt.date!),
          category: "appointment",
        });
      });

    // Expiring Memberships (within 7 days)
    membershipRecords
      .filter((record) => {
        const expiry = new Date(record.expiryDate);
        const daysUntil = differenceInDays(expiry, now);
        if (daysUntil < 0 || daysUntil > 7) return false;
        if (isAdmin) return true;
        if (isFC && isRecordAssignedToStaff(record, staff)) return true;
        return false;
      })
      .slice(0, 3)
      .forEach((record, idx) => {
        const rid = record.id ?? (record as { _id?: string })._id ?? `mem-exp-${record.memberId}-${record.invoiceNumber}-${idx}`;
        const daysLeft = differenceInDays(new Date(record.expiryDate), now);
        items.push({
          id: `membership-expiring-${rid}`,
          type: "alert",
          icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
          title: "Membership Expiring",
          description: `${record.memberName} - ${daysLeft === 0 ? "Today" : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}`,
          time: new Date(record.expiryDate),
          category: "membership",
        });
      });

    // Expiring PT Packages (within 7 days)
    ptPackageRecords
      .filter((record) => {
        const expiry = new Date(record.expiryDate);
        const daysUntil = differenceInDays(expiry, now);
        if (daysUntil < 0 || daysUntil > 7) return false;
        if (isAdmin) return true;
        if (isPT && isRecordAssignedToStaff(record, staff)) return true;
        return false;
      })
      .slice(0, 3)
      .forEach((record, idx) => {
        const rid = record.id ?? (record as { _id?: string })._id ?? `pt-exp-${record.memberId}-${record.invoiceNumber}-${idx}`;
        const daysLeft = differenceInDays(new Date(record.expiryDate), now);
        items.push({
          id: `pt-expiring-${rid}`,
          type: "alert",
          icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
          title: "PT Package Expiring",
          description: `${record.memberName} - ${daysLeft === 0 ? "Today" : `${daysLeft} day${daysLeft > 1 ? "s" : ""} left`}`,
          time: new Date(record.expiryDate),
          category: "pt-package",
        });
      });

    // New Members (joined in last 3 days)
    const threeDaysAgo = subDays(now, 3);
    members
      .filter((member) => {
        if (new Date(member.dateJoined) < threeDaysAgo) return false;
        if (isAdmin) return true;
        const mid = member.memberNumber ?? member.id ?? (member as { _id?: string })._id;
        return mid != null && myClientMemberIds.has(String(mid));
      })
      .slice(0, 3)
      .forEach((member, idx) => {
        const mid = member.id ?? (member as { _id?: string })._id ?? member.memberNumber ?? `member-new-${idx}`;
        items.push({
          id: `member-new-${mid}`,
          type: "activity",
          icon: <UserPlus className="h-4 w-4 text-cyan-500" />,
          title: "New Member",
          description: member.fullName,
          time: new Date(member.dateJoined),
          category: "member",
        });
      });

    // Helper function to check if birthday is today or within next 7 days
    const isBirthdayUpcoming = (dateOfBirth: string | Date | undefined) => {
      if (!dateOfBirth) return { isUpcoming: false, daysUntil: 0, birthdayDate: now };
      
      const dob = new Date(dateOfBirth);
      const todayMonth = now.getMonth();
      const todayDay = now.getDate();
      const dobMonth = dob.getMonth();
      const dobDay = dob.getDate();
      
      // Check if birthday is today
      const isToday = todayMonth === dobMonth && todayDay === dobDay;
      
      // Create this year's birthday at midnight for accurate comparison
      let thisYearBirthday = new Date(now.getFullYear(), dobMonth, dobDay, 0, 0, 0, 0);
      
      // Create today at midnight for accurate comparison
      const todayMidnight = new Date(now.getFullYear(), todayMonth, todayDay, 0, 0, 0, 0);
      
      // If birthday already passed this year (and it's not today), check next year
      if (thisYearBirthday < todayMidnight) {
        thisYearBirthday = new Date(now.getFullYear() + 1, dobMonth, dobDay, 0, 0, 0, 0);
      }
      
      // Calculate days until birthday
      const daysUntil = Math.round((thisYearBirthday.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      
      return { 
        isUpcoming: daysUntil >= 0 && daysUntil <= 7, 
        daysUntil: daysUntil,
        birthdayDate: thisYearBirthday
      };
    };

    // Member Birthdays (today or within 7 days)
    members
      .filter((member) => {
        const { isUpcoming } = isBirthdayUpcoming(member.dateOfBirth);
        if (!isUpcoming) return false;
        if (isAdmin) return true;
        const mid = member.memberNumber ?? member.id ?? (member as { _id?: string })._id;
        return mid != null && myClientMemberIds.has(String(mid));
      })
      .slice(0, 5)
      .forEach((member, idx) => {
        const mid = member.id ?? (member as { _id?: string })._id ?? member.memberNumber ?? `member-bday-${idx}`;
        const { daysUntil, birthdayDate } = isBirthdayUpcoming(member.dateOfBirth);
        items.push({
          id: `member-birthday-${mid}`,
          type: "info",
          icon: <Cake className="h-4 w-4 text-pink-500" />,
          title: "Member Birthday",
          description: `${member.fullName} - ${daysUntil === 0 ? "🎉 Today!" : daysUntil === 1 ? "Tomorrow!" : `in ${daysUntil} days`}`,
          time: birthdayDate!,
          category: "member",
        });
      });

    // Staff Birthdays (today or within 7 days)
    staffList
      .filter((staffMember) => {
        const { isUpcoming } = isBirthdayUpcoming(staffMember.dateOfBirth);
        return isUpcoming;
      })
      .slice(0, 5)
      .forEach((staffMember, idx) => {
        const sid = staffMember._id ?? (staffMember as { id?: string }).id ?? `staff-bday-${idx}`;
        const { daysUntil, birthdayDate } = isBirthdayUpcoming(staffMember.dateOfBirth);
        items.push({
          id: `staff-birthday-${sid}`,
          type: "info",
          icon: <Cake className="h-4 w-4 text-rose-500" />,
          title: "Staff Birthday",
          description: `${staffMember.name} - ${daysUntil === 0 ? "🎉 Today!" : daysUntil === 1 ? "Tomorrow!" : `in ${daysUntil} days`}`,
          time: birthdayDate!,
          category: "system",
        });
      });

    // Staff Notes received by this user
    receivedNotes
      .slice(0, 10)
      .forEach((note, idx) => {
        const nid = note._id ?? `note-${idx}`;
        const fromStaff = note.fromStaffId
          ? staffList.find((s: { _id?: string }) => String(s._id) === String(note.fromStaffId))
          : null;
        items.push({
          id: `staff-note-${nid}`,
          type: "note",
          icon: <MessageSquare className={`h-4 w-4 ${note.read ? "text-muted-foreground" : "text-blue-500"}`} />,
          title: note.fromStaffName,
          description: note.message,
          time: new Date(note.createdAt || Date.now()),
          category: "staff-note",
          fromStaffId: note.fromStaffId,
          fromStaffName: note.fromStaffName,
          fromStaffAvatar: (fromStaff as { avatar?: string })?.avatar,
        });
      });

    // Pending leave requests (for supervisors only – to approve/reject)
    if (isSupervisor && pendingLeaveRequests.length > 0) {
      pendingLeaveRequests.slice(0, 10).forEach((req, idx) => {
        const lid = req._id ?? `leave-${idx}`;
        items.push({
          id: `leave-pending-${lid}`,
          type: "leave-pending",
          icon: <CalendarClock className="h-4 w-4 text-amber-500" />,
          title: `Leave request from ${req.staffName}`,
          description: `${LEAVE_TYPE_LABELS[req.leaveType as keyof typeof LEAVE_TYPE_LABELS] || req.leaveType} • ${req.startDate} to ${req.endDate}${req.reason ? ` • ${req.reason}` : ""}`,
          time: new Date(req.createdAt || Date.now()),
          category: "leave-pending",
          leaveRequestId: req._id,
          leaveRequest: req,
        });
      });
    }

    // Sort by time (most recent first)
    items.sort((a, b) => b.time.getTime() - a.time.getTime());

    return items.slice(0, 25); // Limit to 25 notifications
  }, [membershipRecords, ptPackageRecords, appointments, members, staffList, receivedNotes, isSupervisor, pendingLeaveRequests, staff, staffDepartment]);

  // Count unread notes (from DB)
  const unreadNotesCount = useMemo(
    () => receivedNotes.filter((n) => !n.read).length,
    [receivedNotes]
  );

  // Pending leave count for supervisors (action required)
  const pendingLeaveCount = useMemo(
    () => (isSupervisor ? pendingLeaveRequests.length : 0),
    [isSupervisor, pendingLeaveRequests.length]
  );

  // Count unread notifications (localStorage-based + unread notes + pending leave for supervisors)
  const unreadCount = useMemo(() => {
    if (!hasHydrated) return 0;
    const localUnread = notifications.filter(
      (n) => !readIds.has(n.id) && n.category !== "staff-note" && n.category !== "leave-pending"
    ).length;
    return localUnread + unreadNotesCount + pendingLeaveCount;
  }, [notifications, readIds, hasHydrated, unreadNotesCount, pendingLeaveCount]);

  // Count alerts
  const alertCount = notifications.filter((n) => n.type === "alert").length;

  // Timeout ref for delayed close
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Mark all as read when dropdown opens (user-specific)
  const markAsRead = useCallback(() => {
    if (notifications.length > 0 && currentUserId) {
      const now = Date.now();
      const newReadEntries: Record<string, number> = {};
      
      // Keep existing read entries
      readIds.forEach((id) => {
        newReadEntries[id] = now;
      });
      
      // Add new notifications as read
      notifications.forEach((n) => {
        newReadEntries[n.id] = now;
      });
      
      // Save to user-specific localStorage key
      localStorage.setItem(storageKey, JSON.stringify(newReadEntries));
      
      // Update state
      setReadIds(new Set(Object.keys(newReadEntries)));

      // Mark unread staff notes as read in DB
      receivedNotes
        .filter((n) => !n.read && n._id)
        .forEach((n) => {
          markNoteRead.mutate(n._id!);
        });
    }
  }, [notifications, readIds, currentUserId, storageKey, receivedNotes, markNoteRead]);

  // Handle mouse enter - keep dropdown open (clear close timeout)
  const handleMouseEnter = useCallback(() => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  // Handle mouse leave - close dropdown with delay
  const handleMouseLeave = useCallback(() => {
    // Only close if dropdown is open
    if (isOpen) {
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 100);
    }
  }, [isOpen]);

  // Handle open change (for accessibility - keyboard/click still works)
  const handleOpenChange = useCallback((open: boolean) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(open);
    if (open) {
      markAsRead();
    }
  }, [markAsRead]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Format time display
  const formatTimeAgo = (date: Date) => {
    if (isToday(date)) {
      return format(date, "'Today at' h:mm a");
    }
    if (isYesterday(date)) {
      return format(date, "'Yesterday at' h:mm a");
    }
    return format(date, "MMM d 'at' h:mm a");
  };

  // Check if notification is read
  const isRead = (id: string) => readIds.has(id);

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <div onMouseLeave={handleMouseLeave}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative h-9 w-9 rounded-full"
            aria-label="Notifications"
          >
            <BellIcon className="h-4 w-4" aria-hidden="true" />
            {/* Show badge for unread count (notes + other notifications) */}
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent 
        align="end" 
        sideOffset={-36} 
        className="w-80 rounded-2xl"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Notifications</span>
          {alertCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {alertCount} alert{alertCount > 1 ? "s" : ""}
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[320px]">
          {notifications.length > 0 ? (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => {
                const isNoteItem = notification.category === "staff-note";
                const noteObj = isNoteItem
                  ? receivedNotes.find(
                      (n) => `staff-note-${n._id}` === notification.id
                    )
                  : null;
                const unread = isNoteItem
                  ? noteObj && !noteObj.read
                  : !isRead(notification.id) && isSuperAdmin;

                if (isNoteItem) {
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50 ${
                        noteObj && !noteObj.read
                          ? "bg-blue-50/50 dark:bg-blue-950/20"
                          : ""
                      } ${unread ? "border-l-2 border-primary" : ""}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0 border border-background">
                        <AvatarImage src={notification.fromStaffAvatar || ""} alt={notification.fromStaffName} />
                        <AvatarFallback
                          className="text-[10px] font-black bg-gradient-to-br from-muted to-muted/80 text-foreground font-montserrat"
                        >
                          {getInitials(notification.fromStaffName || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm leading-tight ${
                              unread ? "font-semibold" : "font-medium"
                            }`}
                          >
                            {notification.fromStaffName}
                          </p>
                          {unread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground break-words mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {formatTimeAgo(notification.time)}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (notification.category === "leave-pending" && notification.leaveRequestId) {
                  const isReviewing = reviewLeaveRequest.isPending;
                  return (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50 bg-amber-50/50 dark:bg-amber-950/20 border-l-2 border-amber-500"
                    >
                      <div className="mt-0.5 shrink-0">{notification.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground break-words mt-0.5">
                          {notification.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {formatTimeAgo(notification.time)}
                        </p>
                        <div className="flex gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs flex-1"
                            disabled={isReviewing}
                            onClick={() =>
                              reviewLeaveRequest.mutate({
                                id: notification.leaveRequestId!,
                                status: "APPROVED",
                              })
                            }
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex-1 border-destructive text-destructive hover:bg-destructive/10"
                            disabled={isReviewing}
                            onClick={() =>
                              reviewLeaveRequest.mutate({
                                id: notification.leaveRequestId!,
                                status: "REJECTED",
                              })
                            }
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50 ${
                      notification.type === "alert"
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : ""
                    } ${unread ? "border-l-2 border-primary" : ""}`}
                  >
                    <div className="mt-0.5 shrink-0">{notification.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm leading-tight ${
                            unread ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {notification.title}
                        </p>
                        {unread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {formatTimeAgo(notification.time)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BellIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70">
                Activities will appear here
              </p>
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">
                {notifications.length} activit{notifications.length === 1 ? "y" : "ies"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All read"}
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
