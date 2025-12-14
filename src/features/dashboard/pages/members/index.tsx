"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useMembers as useMembersLocal } from "./hooks/use-members";
import { useMembers as useMembersQuery, useCreateMember, useUpdateMember } from "@/hooks/use-members";
import { MembersTable } from "./components/members-table";
import { MembersFilters } from "./components/members-filters";
import { Button } from "@/components/ui/button";
import { MemberFormDrawer } from "./components/member-form-drawer";
import { Member } from "./types/member";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useAppointments } from "@/hooks/use-appointments";

export function MembersPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Use React Query to fetch members data
  const { data: membersData = [], isLoading, error } = useMembersQuery();
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  
  // Fetch PT package records and appointments from MongoDB
  const { data: ptPackageRecords = [] } = usePTPackageRecords();
  const { data: appointments = [] } = useAppointments();

  // Use local hook for filtering, sorting, and pagination
  const {
    members,
    allMembers,
    pageCount,
    filters,
    sorting,
    pagination,
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
    handleClearFilters,
  } = useMembersLocal({ initialMembers: membersData });

  const handleSaveMember = async (data: Omit<Member, "id">) => {
    // This will be handled by the form using React Query mutations
    // We keep this for backward compatibility but it won't be called
    // The form will handle the save directly
  };

  const handleOpenDrawer = (member?: Member) => {
    setEditingMember(member || null);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">MEMBERS</h1>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card min-w-0">
        <div className="border-b p-4">
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <MembersFilters filters={filters} onFiltersChange={updateFilters} />
            <Button size="sm" className="h-8 text-xs" onClick={() => handleOpenDrawer()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Member
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <MembersTable
            members={members}
            totalRows={allMembers.length}
            sorting={sorting}
            onSort={handleSortingChange}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            pageCount={pageCount}
            onEdit={handleOpenDrawer}
            ptPackageRecords={ptPackageRecords}
            appointments={appointments}
          />
        </div>
      </div>


      <MemberFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        member={editingMember}
        onSave={handleSaveMember}
      />
    </div>
  );
} 