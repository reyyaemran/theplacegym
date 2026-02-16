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
import { useMembershipRecords } from "@/hooks/use-membership-records";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useAppointments } from "@/hooks/use-appointments";
import { useMembers } from "@/hooks/use-members";
import { useStaff } from "@/hooks/use-staff";
import { useAuth } from "@/hooks/use-auth";
import { format, differenceInDays, isToday, isYesterday, subDays } from "date-fns";

interface NotificationItem {
  id: string;
  type: "activity" | "alert" | "info";
  icon: React.ReactNode;
  title: string;
  description: string;
  time: Date;
  category: "membership" | "pt-package" | "appointment" | "member" | "system";
}

const STORAGE_KEY_PREFIX = "tp-notifications-read";

/**
 * NotificationsDropdown Component
 * 
 * Shows recent activities and alerts in the dashboard header.
 * Tracks read/unread state per user (each user has their own read state).
 * Only superadmin sees all notifications; staff see only relevant ones.
 */
export function NotificationsDropdown() {
  const { isSuperAdmin, staff } = useAuth();
  const { data: membershipRecords = [] } = useMembershipRecords();
  const { data: ptPackageRecords = [] } = usePTPackageRecords();
  const { data: appointments = [] } = useAppointments();
  const { data: members = [] } = useMembers();
  const { data: staffList = [] } = useStaff();
  
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

    // Recent Membership Invoices (last 7 days)
    membershipRecords
      .filter((record) => new Date(record.paymentDate) >= sevenDaysAgo)
      .slice(0, 5)
      .forEach((record) => {
        items.push({
          id: `membership-${record.id}`,
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
      .filter((record) => new Date(record.paymentDate) >= sevenDaysAgo)
      .slice(0, 5)
      .forEach((record) => {
        items.push({
          id: `pt-${record.id}`,
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
      .filter((apt) => apt.status === "COMPLETED" && apt.date && isToday(new Date(apt.date)))
      .slice(0, 3)
      .forEach((apt) => {
        items.push({
          id: `apt-completed-${apt._id ?? apt.appointmentNumber}`,
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
      .filter((apt) => apt.status === "SCHEDULED" && apt.date && isToday(new Date(apt.date)))
      .slice(0, 3)
      .forEach((apt) => {
        items.push({
          id: `apt-upcoming-${apt._id ?? apt.appointmentNumber}`,
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
        return daysUntil >= 0 && daysUntil <= 7;
      })
      .slice(0, 3)
      .forEach((record) => {
        const daysLeft = differenceInDays(new Date(record.expiryDate), now);
        items.push({
          id: `membership-expiring-${record.id}`,
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
        return daysUntil >= 0 && daysUntil <= 7;
      })
      .slice(0, 3)
      .forEach((record) => {
        const daysLeft = differenceInDays(new Date(record.expiryDate), now);
        items.push({
          id: `pt-expiring-${record.id}`,
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
      .filter((member) => new Date(member.dateJoined) >= threeDaysAgo)
      .slice(0, 3)
      .forEach((member) => {
        items.push({
          id: `member-new-${member.id}`,
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
        return isUpcoming;
      })
      .slice(0, 5)
      .forEach((member) => {
        const { daysUntil, birthdayDate } = isBirthdayUpcoming(member.dateOfBirth);
        items.push({
          id: `member-birthday-${member.id}`,
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
      .forEach((staffMember) => {
        const { daysUntil, birthdayDate } = isBirthdayUpcoming(staffMember.dateOfBirth);
        items.push({
          id: `staff-birthday-${staffMember._id}`,
          type: "info",
          icon: <Cake className="h-4 w-4 text-rose-500" />,
          title: "Staff Birthday",
          description: `${staffMember.name} - ${daysUntil === 0 ? "🎉 Today!" : daysUntil === 1 ? "Tomorrow!" : `in ${daysUntil} days`}`,
          time: birthdayDate!,
          category: "system",
        });
      });

    // Sort by time (most recent first)
    items.sort((a, b) => b.time.getTime() - a.time.getTime());

    return items.slice(0, 20); // Limit to 20 notifications
  }, [membershipRecords, ptPackageRecords, appointments, members, staffList]);

  // Count unread notifications
  const unreadCount = useMemo(() => {
    if (!hasHydrated) return 0;
    return notifications.filter((n) => !readIds.has(n.id)).length;
  }, [notifications, readIds, hasHydrated]);

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
    }
  }, [notifications, readIds, currentUserId, storageKey]);

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
            {/* Show badge for superadmin with unread count, or alert count for others */}
            {isSuperAdmin && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            {!isSuperAdmin && alertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {alertCount > 9 ? "9+" : alertCount}
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
                const read = isRead(notification.id);
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50 ${
                      notification.type === "alert" ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                    } ${!read && isSuperAdmin ? "border-l-2 border-primary" : ""}`}
                  >
                    <div className="mt-0.5 shrink-0">{notification.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm leading-tight ${!read && isSuperAdmin ? "font-semibold" : "font-medium"}`}>
                          {notification.title}
                        </p>
                        {!read && isSuperAdmin && (
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
                {notifications.length} activit{notifications.length === 1 ? "y" : "ies"} from last 7 days
              </p>
              {isSuperAdmin && (
                <p className="text-[10px] text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "✓ All read"}
                </p>
              )}
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
