"use client";

// External dependencies
import {
  ChevronsUpDown,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

// Internal components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

// Helper function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

/**
 * NavUser Component
 *
 * User profile section in the dashboard sidebar footer.
 * Displays user information and provides a dropdown with user-related actions.
 *
 * @param {Object} props - Component props
 * @param {Object} props.user - User information
 * @param {string} props.user.name - User's name
 * @param {string} props.user.email - User's email
 * @param {string} props.user.avatar - URL to user's avatar image
 */
export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    isAdmin?: boolean;
  };
}) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { staff } = useAuth();
  
  // Get the current staff ID for profile link
  // Session has staffId (camelCase), staff object might have _id
  const staffId = (staff as any)?.staffId || staff?._id || "";

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      // Trigger auth refresh event to clear auth state immediately
      window.dispatchEvent(new Event('auth-refresh'));
      
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      
      // Trigger auth refresh event even if logout API fails
      window.dispatchEvent(new Event('auth-refresh'));
      
      // Still redirect even if logout API fails
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer hover:bg-transparent hover:font-bold"
              aria-label="User profile and options"
            >
              <Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-sm">
                <AvatarImage src="" alt={`${user.name}'s profile`} />
                <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 items-center gap-2 min-w-0">
                <span className="truncate font-semibold text-sm">{user.name}</span>
                {user.isAdmin && (
                  <Shield className="h-3 w-3 text-primary shrink-0" aria-label="Admin" />
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
            role="menu"
            aria-label="User options"
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-9 w-9 shrink-0 border-2 border-background shadow-sm">
                  <AvatarImage
                    src=""
                    alt={`${user.name}'s profile`}
                  />
                  <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="truncate font-semibold">{user.name}</span>
                  {user.isAdmin && (
                    <Shield className="h-3 w-3 text-primary shrink-0" aria-label="Admin" />
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {staffId && (
                <DropdownMenuItem asChild role="menuitem">
                  <Link href={`/dashboard/staff/${staffId}`} className="flex items-center">
                    <User aria-hidden="true" />
                    Profile
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} role="menuitem">
              <LogOut aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
