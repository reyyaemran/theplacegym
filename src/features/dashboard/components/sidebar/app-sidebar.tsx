"use client";

// External dependencies
import * as React from "react";
import Link from "next/link";

// Internal components
import { NavMain } from "@/features/dashboard/components/sidebar/nav-main";
import { NavSecondary } from "@/features/dashboard/components/sidebar/nav-secondary";
import { NavUser } from "@/features/dashboard/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { sidebarMenus } from "@/data/sidebar-menus";
import { useAuth } from "@/hooks/use-auth";

/**
 * AppSidebar Component
 *
 * Main application sidebar with navigation sections for the dashboard.
 * Includes app logo/header, main navigation, workspace selection,
 * secondary links, and user profile.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open } = useSidebar();
  const { staff, isLoading, isAdmin } = useAuth();

  // Persist sidebar open state in localStorage
  React.useEffect(() => {
    localStorage.setItem("sidebar-open", open.toString());
  }, [open]);

  // Get user info from session or fallback to default
  const user = staff
    ? {
        name: staff.name,
        email: staff.email || "",
        avatar: (staff as { avatar?: string }).avatar || "",
        isAdmin: isAdmin,
      }
    : { ...sidebarMenus.user, isAdmin: false };

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      {...props}
      aria-label="Main navigation"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="/dashboard"
                className="hover:bg-transparent"
                aria-label="Go to dashboard home"
              >
                <div
                  className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg font-montserrat"
                  aria-hidden="true"
                >
                  <span className="text-sm font-black italic leading-none w-full text-center">TP</span>
                </div>
                <div className="flex flex-1 flex-col text-left">
                  <span className="font-montserrat text-base font-black italic tracking-wide leading-none">THE</span>
                  <span className="font-montserrat text-base font-black italic tracking-wide pl-[0.6em] leading-none -mt-1">PLACE</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarMenus.navMain} />
        <NavSecondary items={sidebarMenus.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {!isLoading && <NavUser user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
