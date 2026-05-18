"use client";

// External dependencies
import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";
import { useState } from "react";

// Internal components
import { cn } from "@/lib/utils";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarSubmenuWrapper } from "./sidebar-submenu-wrapper";
import { useAuth } from "@/hooks/use-auth";
import { StaffPermission } from "@/types/staff";

/**
 * Props interface for SidebarMenuWrapper component
 * @interface Props
 * @property {Object} item - Navigation item data
 * @property {string} item.title - Title of the navigation item
 * @property {string} item.url - URL for the navigation item
 * @property {LucideIcon} item.icon - Icon component for the navigation item
 * @property {StaffPermission} [item.requiredPermission] - Permission required to access this item
 * @property {Object[]} [item.items] - Optional sub-items for the navigation item
 * @property {string} item.items[].title - Title of the sub-item
 * @property {string} item.items[].url - URL for the sub-item
 * @property {boolean} item.items[].isActive - Whether the sub-item is active
 */
type Props = {
  item: {
    title: string;
    url: string;
    icon: LucideIcon;
    requiredPermission?: StaffPermission;
    hideForDepartments?: string[];
    showOnlyForDepartments?: string[];
    items?: {
      title: string;
      url: string;
      isActive: boolean;
    }[];
  };
};

/**
 * SidebarMenuWrapper Component
 *
 * Wrapper for sidebar menu items with collapsible functionality.
 * Handles different display modes (expanded vs collapsed) and hover cards.
 * Also handles permission checks.
 *
 * @param {Props} props - Component props
 */
export function SidebarMenuWrapper({ item }: Props) {
  const { state, isMobile } = useSidebar();
  const { staff, isAdmin } = useAuth();

  const isSubmenuActive = item.items?.some((item) => item.isActive);
  const isPopover = state === "collapsed" && !isMobile;

  // Department-based visibility: hide this item for certain departments
  if (item.hideForDepartments?.length && staff?.department) {
    if (item.hideForDepartments.includes(staff.department)) {
      return null;
    }
  }

  // Department-based visibility: show this item strictly for certain departments only
  // Even admins don't see these — admins have their own combined view (e.g. tabs)
  if (item.showOnlyForDepartments?.length) {
    if (!staff?.department || !item.showOnlyForDepartments.includes(staff.department)) {
      return null;
    }
  }

  // Permission check
  const hasPermission = 
    !item.requiredPermission || 
    isAdmin || 
    (staff?.permissions?.includes(item.requiredPermission));

  if (!hasPermission) {
    return null;
  }

  if (isPopover) {
    // If item has no sub-items, make it a direct link even in popover mode
    if (!item.items?.length) {
      return (
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip={item.title}>
            <Link
              href={item.url}
              className={cn(
                "cursor-pointer hover:bg-transparent hover:font-bold active:bg-transparent",
              )}
              aria-label={item.title}
            >
              <item.icon
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="text-sm text-balance">{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    // If item has sub-items, show hover card with submenu
    return (
      <SidebarMenuItem>
        <HoverCard openDelay={50} closeDelay={100}>
          <HoverCardTrigger asChild>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                className={cn(
                  "cursor-pointer hover:bg-transparent hover:font-bold active:bg-transparent data-[state=open]:hover:bg-transparent",
                  isSubmenuActive && "font-bold",
                )}
                aria-label={item.title}
                aria-expanded="false"
                aria-haspopup="true"
              >
                <item.icon
                  strokeWidth={isSubmenuActive ? 2.5 : 1.8}
                  aria-hidden="true"
                />
                <span className="text-sm text-balance">{item.title}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </HoverCardTrigger>
          <HoverCardContent
            side="right"
            align="start"
            className="w-fit min-w-52 px-0"
            role="menu"
            aria-label={`${item.title} submenu`}
          >
            <div className="flex flex-col gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 border-b px-4 pb-2",
                  isSubmenuActive && "font-bold",
                )}
              >
                <item.icon
                  className="size-4"
                  strokeWidth={isSubmenuActive ? 2.5 : 1.8}
                  aria-hidden="true"
                />
                <span className="text-sm text-balance">{item.title}</span>
              </div>
              <SidebarSubmenuWrapper isPopover={isPopover} item={item} />
            </div>
          </HoverCardContent>
        </HoverCard>
      </SidebarMenuItem>
    );
  }

  // If item has no sub-items, make it a direct link
  if (!item.items?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.title}>
          <Link
            href={item.url}
            className={cn(
              "cursor-pointer hover:bg-transparent hover:font-bold active:bg-transparent",
            )}
            aria-label={item.title}
          >
            <item.icon
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // If item has sub-items, use collapsible
  return (
    <SidebarMenuItem>
      <CollapsibleTrigger asChild>
        <SidebarMenuButton
          tooltip={item.title}
          className={cn(
            "cursor-pointer hover:bg-transparent hover:font-bold active:bg-transparent data-[state=open]:hover:bg-transparent",
            isSubmenuActive && "font-bold",
          )}
          aria-label={item.title}
          aria-expanded="false"
          aria-haspopup="true"
        >
          <item.icon
            strokeWidth={isSubmenuActive ? 2.5 : 1.8}
            aria-hidden="true"
          />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleTrigger asChild>
        <SidebarMenuAction
          className="cursor-pointer hover:bg-transparent data-[state=open]:rotate-90"
          aria-label={`Toggle ${item.title} submenu`}
        >
          <ChevronRight aria-hidden="true" />
          <span className="sr-only">Toggle</span>
        </SidebarMenuAction>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarSubmenuWrapper isPopover={isPopover} item={item} />
      </CollapsibleContent>
    </SidebarMenuItem>
  );
}
