"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembershipsGrid } from "@/features/dashboard/pages/services/components/memberships-grid";
import { useMemberships } from "@/features/dashboard/pages/memberships/hooks/use-memberships";
import { MembershipFormDialog } from "@/features/dashboard/pages/memberships/components/membership-form-dialog";
import { MembershipDeleteDialog } from "@/features/dashboard/pages/memberships/components/membership-delete-dialog";
import { PTPackagesGrid } from "./components/pt-packages-grid";
import { usePTPackages } from "./hooks/use-pt-packages";
import { PTPackageFormDialog } from "./components/pt-package-form-dialog";
import { PTPackageDeleteDialog } from "./components/pt-package-delete-dialog";
import { PTPackage } from "./types/pt-package";
import { Membership } from "@/features/dashboard/pages/memberships/types/membership";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useMembershipRecords } from "@/hooks/use-membership-records";

export function ServicesPage() {
  // Persist tab state in localStorage
  const [activeTab, setActiveTab] = useState<"pt-packages" | "memberships">(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("services-active-tab");
      if (savedTab === "pt-packages" || savedTab === "memberships") {
        return savedTab;
      }
    }
    return "pt-packages";
  });
  
  // Update localStorage when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as "pt-packages" | "memberships";
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      localStorage.setItem("services-active-tab", newTab);
    }
  };
  
  // PT Package dialogs
  const [ptPackageFormOpen, setPTPackageFormOpen] = useState(false);
  const [selectedPTPackage, setSelectedPTPackage] = useState<PTPackage | null>(null);
  const [ptPackageDeleteOpen, setPTPackageDeleteOpen] = useState(false);
  const [ptPackageToDelete, setPTPackageToDelete] = useState<PTPackage | null>(null);

  // Membership dialogs
  const [membershipFormOpen, setMembershipFormOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null);
  const [membershipDeleteOpen, setMembershipDeleteOpen] = useState(false);
  const [membershipToDelete, setMembershipToDelete] = useState<Membership | null>(null);

  const {
    ptPackages,
    allPTPackages,
    pageCount: ptPackagePageCount,
    filters: ptPackageFilters,
    sorting: ptPackageSorting,
    pagination: ptPackagePagination,
    loading: ptPackageLoading,
    updateFilters: updatePTPackageFilters,
    handleSortingChange: handlePTPackageSortingChange,
    handlePaginationChange: handlePTPackagePaginationChange,
    handleClearFilters: handleClearPTPackageFilters,
    createPTPackage,
    updatePTPackage,
    deletePTPackage,
  } = usePTPackages();

  const {
    memberships,
    allMemberships,
    pageCount: membershipPageCount,
    filters: membershipFilters,
    sorting: membershipSorting,
    pagination: membershipPagination,
    loading: membershipLoading,
    updateFilters: updateMembershipFilters,
    handleSortingChange: handleMembershipSortingChange,
    handlePaginationChange: handleMembershipPaginationChange,
    handleClearFilters: handleClearMembershipFilters,
    createMembership,
    updateMembership,
    deleteMembership,
  } = useMemberships();

  // Fetch PT package records and membership records for counts
  const { data: ptPackageRecords = [] } = usePTPackageRecords();
  const { data: membershipRecords = [] } = useMembershipRecords();

  // PT Package handlers
  const handleCreatePTPackage = () => {
    setSelectedPTPackage(null);
    setPTPackageFormOpen(true);
  };

  const handleEditPTPackage = (ptPackage: PTPackage) => {
    setSelectedPTPackage(ptPackage);
    setPTPackageFormOpen(true);
  };

  const handleDeletePTPackage = (ptPackage: PTPackage) => {
    setPTPackageToDelete(ptPackage);
    setPTPackageDeleteOpen(true);
  };

  const handleSavePTPackage = async (data: Omit<PTPackage, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (selectedPTPackage) {
        await updatePTPackage(selectedPTPackage.id, data);
      } else {
        await createPTPackage(data);
      }
      setPTPackageFormOpen(false);
      setSelectedPTPackage(null);
    } catch (error) {
      // Error is handled by the mutation (toast shown)
      // Error is handled by the mutation (toast shown)
    }
  };

  const handleConfirmDeletePTPackage = async () => {
    if (ptPackageToDelete) {
      try {
        await deletePTPackage(ptPackageToDelete.id);
        setPTPackageDeleteOpen(false);
        setPTPackageToDelete(null);
      } catch (error) {
        // Error is handled by the mutation (toast shown)
        // Error is handled by the mutation (toast shown)
      }
    }
  };

  // Membership handlers
  const handleCreateMembership = () => {
    setSelectedMembership(null);
    setMembershipFormOpen(true);
  };

  const handleEditMembership = (membership: Membership) => {
    setSelectedMembership(membership);
    setMembershipFormOpen(true);
  };

  const handleDeleteMembership = (membership: Membership) => {
    setMembershipToDelete(membership);
    setMembershipDeleteOpen(true);
  };

  const handleSaveMembership = async (data: Omit<Membership, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (selectedMembership) {
        await updateMembership(selectedMembership.id, data);
      } else {
        await createMembership(data);
      }
      setMembershipFormOpen(false);
      setSelectedMembership(null);
    } catch (error) {
      // Error is handled by the mutation (toast shown)
      // Error is handled by the mutation (toast shown)
    }
  };

  const handleConfirmDeleteMembership = async () => {
    if (membershipToDelete) {
      try {
        await deleteMembership(membershipToDelete.id);
        setMembershipDeleteOpen(false);
        setMembershipToDelete(null);
      } catch (error) {
        // Error is handled by the mutation (toast shown)
        // Error is handled by the mutation (toast shown)
      }
    }
  };


  // Calculate member counts for PT Packages
  const ptPackageMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allPTPackages.forEach((pkg) => {
      // Match by ptPackageId to get accurate count for this specific package
      const count = ptPackageRecords.filter(
        (record) => record.ptPackageId === pkg.id
      ).length;
      counts[pkg.id] = count;
    });
    return counts;
  }, [allPTPackages, ptPackageRecords]);

  // Calculate member counts for Memberships
  const membershipMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allMemberships.forEach((membership) => {
      const count = membershipRecords.filter(
        (record) => record.membershipType === membership.type
      ).length;
      counts[membership.id] = count;
    });
    return counts;
  }, [allMemberships, membershipRecords]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">ALL PACKAGE</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pt-packages">PT Package</TabsTrigger>
            <TabsTrigger value="memberships">Memberships</TabsTrigger>
          </TabsList>
          {activeTab === "pt-packages" && (
            <Button
              size="sm"
              onClick={handleCreatePTPackage}
              className="text-xs"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          )}
          {activeTab === "memberships" && (
            <Button
              size="sm"
              onClick={handleCreateMembership}
              className="text-xs"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          )}
        </div>

        <TabsContent value="pt-packages" className="space-y-6">
          <PTPackagesGrid
            ptPackages={allPTPackages}
            memberCounts={ptPackageMemberCounts}
            onEdit={handleEditPTPackage}
            onDelete={handleDeletePTPackage}
          />
        </TabsContent>

        <TabsContent value="memberships" className="space-y-6">
          <MembershipsGrid
            memberships={allMemberships}
            memberCounts={membershipMemberCounts}
            onEdit={handleEditMembership}
            onDelete={handleDeleteMembership}
          />
        </TabsContent>
      </Tabs>

      {/* PT Package Dialogs */}
      <PTPackageFormDialog
        open={ptPackageFormOpen}
        onOpenChange={setPTPackageFormOpen}
        ptPackage={selectedPTPackage}
        onSave={handleSavePTPackage}
      />
      <PTPackageDeleteDialog
        open={ptPackageDeleteOpen}
        onOpenChange={setPTPackageDeleteOpen}
        ptPackage={ptPackageToDelete}
        onConfirm={handleConfirmDeletePTPackage}
      />

      {/* Membership Dialogs */}
      <MembershipFormDialog
        open={membershipFormOpen}
        onOpenChange={setMembershipFormOpen}
        membership={selectedMembership}
        onSave={handleSaveMembership}
      />
      <MembershipDeleteDialog
        open={membershipDeleteOpen}
        onOpenChange={setMembershipDeleteOpen}
        membership={membershipToDelete}
        onConfirm={handleConfirmDeleteMembership}
      />
    </div>
  );
}
