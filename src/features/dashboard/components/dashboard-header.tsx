"use client";

// External dependencies
import React from "react";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from "lucide-react";

// Internal components
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ModeToggle } from "@/components/mode-toggle";
import { NotificationsDropdown } from "./notifications-dropdown";

/**
 * DashboardHeader Component
 *
 * Main header for the dashboard layout.
 * Contains sidebar toggle, breadcrumbs navigation, search, notifications, and theme toggle.
 */
export const DashboardHeader = () => {
  const { open } = useSidebar();

  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between px-4 transition-all duration-200"
      role="banner"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <SidebarTrigger
          icon={
            open ? (
              <PanelLeftCloseIcon aria-hidden="true" />
            ) : (
              <PanelLeftOpenIcon aria-hidden="true" />
            )
          }
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          aria-expanded={open}
          aria-controls="main-sidebar"
        />
        <Separator orientation="vertical" className="h-4" aria-hidden="true" />
        <Breadcrumbs
          homeLabel="Dashboard"
          homeHref="/dashboard"
          className="overflow-hidden"
          showHome={false}
        />
      </div>

      <div className="flex items-center gap-3">
        <NotificationsDropdown />
        <ModeToggle />
      </div>
    </header>
  );
};
