"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { useMembers as useMembersLocal } from "../members/hooks/use-members";
import { useClients } from "@/hooks/use-clients";
import { MembersTable } from "../members/components/members-table";
import { MembersFilters } from "../members/components/members-filters";
import { Button } from "@/components/ui/button";
import { MemberFormDrawer } from "../members/components/member-form-drawer";
import { Member } from "../members/types/member";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useAppointments } from "@/hooks/use-appointments";
import { useAuth } from "@/hooks/use-auth";
import { isRecordAssignedToStaff } from "@/lib/staff-assignment";

/**
 * Active Clients Page - shows only clients (members with PT packages) assigned to the logged-in trainer.
 */
export function ActiveClientsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const { staff: authStaff } = useAuth();
  const trainerId = (authStaff as { staffId?: string; _id?: string } | null)?.staffId
    ?? (authStaff as { staffId?: string; _id?: string } | null)?._id
    ?? "";

  const { data: clientsData = [], isLoading } = useClients({
    sessionStaffId: trainerId || (authStaff as { name?: string } | null)?.name || undefined,
  });

  const { data: allPtPackageRecords = [] } = usePTPackageRecords();
  const { data: allAppointments = [] } = useAppointments();

  const ptPackageRecords = useMemo(() => {
    if (!authStaff) return [];
    return allPtPackageRecords.filter((r) => isRecordAssignedToStaff(r, authStaff));
  }, [allPtPackageRecords, authStaff]);

  const appointments = useMemo(() => {
    const clientIds = new Set(
      clientsData.flatMap((c) => [
        c.id,
        (c as { _id?: string })._id,
        c.memberNumber,
      ].filter(Boolean) as string[])
    );
    const clientNames = new Set(clientsData.map((c) => c.fullName?.toLowerCase()).filter(Boolean));
    return allAppointments.filter(
      (apt) =>
        (apt.clientId && clientIds.has(apt.clientId)) ||
        (apt.clientName && clientNames.has(apt.clientName.toLowerCase()))
    );
  }, [allAppointments, clientsData]);

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
  } = useMembersLocal({ initialMembers: clientsData });

  const handleOpenDrawer = (member?: Member) => {
    setEditingMember(member || null);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase font-montserrat">
          ACTIVE CLIENTS
        </h1>
      </div>

      <div className="rounded-lg border bg-card min-w-0">
        <div className="border-b p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <MembersFilters filters={filters} onFiltersChange={updateFilters} />
            <Button size="sm" className="h-8 text-xs" onClick={() => handleOpenDrawer()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Client
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
            detailBasePath="/dashboard/active-clients"
          />
        </div>
      </div>

      <MemberFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        member={editingMember}
        onSave={() => {}}
      />
    </div>
  );
}
