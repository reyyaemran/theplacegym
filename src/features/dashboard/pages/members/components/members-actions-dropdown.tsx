"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Member } from "@/features/dashboard/pages/members/types/member";
import { 
  MoreHorizontal, 
  Eye, 
  Package,
  CreditCard,
  Dumbbell,
  Settings,
  Calendar,
  Scissors,
  RotateCcw,
  Ban,
  Trash, 
  CalendarPlus,
  CalendarClock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AddPackageDrawer } from "./add-package-drawer";
import { ManageMembershipDialog } from "./manage-membership-dialog";
import { ManagePTPackageDialog } from "./manage-pt-package-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useDeleteMember } from "@/hooks/use-members";
import { useAuth } from "@/hooks/use-auth";

interface MemberActionsProps {
  member: Member;
  onEdit?: (member: Member) => void;
  onBlock?: (member: Member) => void;
}

export function MemberActionsDropdown({ member, onEdit, onBlock }: MemberActionsProps) {
  const { canDelete } = useAuth();
  const [membershipDrawerOpen, setMembershipDrawerOpen] = useState(false);
  const [ptPackageDrawerOpen, setPTPackageDrawerOpen] = useState(false);
  const [manageMembershipDialogOpen, setManageMembershipDialogOpen] = useState(false);
  const [managePTPackageDialogOpen, setManagePTPackageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const deleteMemberMutation = useDeleteMember();
  const router = useRouter();

  const handleViewDetails = () => {
    // Use memberNumber in URL instead of MongoDB ID
    router.push(`/dashboard/members/${member.memberNumber}`);
  };

  const handleAddMembership = () => {
    setMembershipDrawerOpen(true);
  };

  const handleAddPTPackage = () => {
    setPTPackageDrawerOpen(true);
  };

  // Management handlers
  const handleMembershipManagement = () => {
    setManageMembershipDialogOpen(true);
  };

  const handlePTPackageManagement = () => {
    setManagePTPackageDialogOpen(true);
  };

  const handleBlockMember = () => {
    setBlockDialogOpen(true);
  };

  const handleConfirmBlock = async () => {
    try {
      // TODO: Implement block member API call
      if (onBlock) {
        onBlock(member);
      }
      toast.success("Member blocked successfully");
      setBlockDialogOpen(false);
    } catch (error) {
      toast.error("Failed to block member");
    }
  };

  const handleDeleteMember = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!member.id) return;
    
    try {
      await deleteMemberMutation.mutateAsync(member.id);
      toast.success("Member deleted successfully");
    } catch (error) {
      toast.error("Failed to delete member");
    }
  };

  return (
    <>
    <div className="text-right">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            <span>View Details</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
            
            {/* Add Package Submenu - accessible to all staff */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Package className="mr-2 h-4 w-4" />
                <span>Add Package</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={handleAddMembership}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Membership</span>
          </DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddPTPackage}>
                  <Dumbbell className="mr-2 h-4 w-4" />
                  <span>PT Package</span>
          </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Admin/Manager Only Actions */}
            {canDelete && (
              <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Settings className="mr-2 h-4 w-4" />
                    <span>Manage</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={handleMembershipManagement}>
                  <CreditCard className="mr-2 h-4 w-4" />
                      <span>Memberships</span>
          </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePTPackageManagement}>
                  <Dumbbell className="mr-2 h-4 w-4" />
                      <span>PT Packages</span>
          </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
                
          <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleBlockMember}>
                  <Ban className="mr-2 h-4 w-4 text-amber-600" />
                  <span className="text-amber-600">Block Member</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleDeleteMember}>
                  <Trash className="mr-2 h-4 w-4 text-red-600" />
                  <span className="text-red-600">Delete Member</span>
            </DropdownMenuItem>
              </>
            )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

      <AddPackageDrawer
        type="membership"
        open={membershipDrawerOpen}
        onOpenChange={setMembershipDrawerOpen}
        member={member}
      />

      <AddPackageDrawer
        type="pt_package"
        open={ptPackageDrawerOpen}
        onOpenChange={setPTPackageDrawerOpen}
        member={member}
      />

      <ManageMembershipDialog
        open={manageMembershipDialogOpen}
        onOpenChange={setManageMembershipDialogOpen}
        member={member}
      />

      <ManagePTPackageDialog
        open={managePTPackageDialogOpen}
        onOpenChange={setManagePTPackageDialogOpen}
        member={member}
      />

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block {member.firstName} {member.lastName}? This member will not be able to check in or book classes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBlock} className="bg-amber-600 hover:bg-amber-700">
              Block Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {member.firstName} {member.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 
