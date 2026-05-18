import {
  LayoutDashboard,
  Users,
  CalendarClock,
  UserCircle,
  UserCheck,
  FileText,
  Calendar,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { StaffPermission } from "@/types/staff";

export const sidebarMenus = {
  // These are fallback placeholders only — the session provider overrides
  // them with the real signed-in staff (see nav-user.tsx).
  user: {
    name: "Loading…",
    email: "",
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
      requiredPermission: "manage_appointments" as StaffPermission,
    },
    {
      title: "Program",
      url: "/dashboard/program",
      icon: ClipboardList,
      requiredPermission: "manage_program" as StaffPermission,
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
      hideForDepartments: ["PT", "PTS"],
    },
    {
      title: "Active Clients",
      url: "/dashboard/active-clients",
      icon: UserCheck,
      requiredPermission: "manage_members" as StaffPermission,
      showOnlyForDepartments: ["PT", "PTS"],
    },
    {
      title: "Packages",
      url: "/dashboard/services", // route name kept to avoid breaking deep links
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
};
