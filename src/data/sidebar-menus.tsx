import {
  LayoutDashboard,
  Users,
  Settings2,
  TrendingUp,
  CalendarClock,
  UserCircle,
  FileText,
  Calendar,
  Sparkles,
  ClipboardList,
  } from "lucide-react";
import { StaffPermission } from "@/types/staff";

export const sidebarMenus = {
  user: {
    name: "James",
    email: "james@example.com",
    avatar: "/avatars/avatar.png",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      requiredPermission: "view_dashboard" as StaffPermission,
    },
    {
      title: "Staff",
      url: "/dashboard/staff",
      icon: Users,
      requiredPermission: "manage_staff" as StaffPermission,
    },
    {
      title: "Appointments",
      url: "/dashboard/appointments",
      icon: CalendarClock,
      requiredPermission: "manage_roster" as StaffPermission, // Using manage_roster for appointments as well
    },
    {
      title: "Program",
      url: "/dashboard/program",
      icon: ClipboardList,
      requiredPermission: "manage_roster" as StaffPermission,
    },
    {
      title: "Roster",
      url: "/dashboard/roster",
      icon: Calendar,
      requiredPermission: "manage_roster" as StaffPermission,
    },
    {
      title: "Members",
      url: "/dashboard/members",
      icon: UserCircle,
      requiredPermission: "manage_members" as StaffPermission,
    },
    {
      title: "Services",
      url: "/dashboard/services", // This points to the "All Packages" page
      icon: Sparkles,
      requiredPermission: "view_reports" as StaffPermission,
    },
    {
      title: "Reports",
      url: "/dashboard/membership-invoice", 
      icon: FileText,
      requiredPermission: "view_reports" as StaffPermission, // Using view_reports as a proxy for package/financial visibility
      items: [
        {
          title: "Membership",
          url: "/dashboard/membership-invoice",
        },
        {
          title: "PT Package",
          url: "/dashboard/ptpackage-invoice",
        },
      ],
    },
  ],
  navSecondary: [],
  workspaces: [],
};
