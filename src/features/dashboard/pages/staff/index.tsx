"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Plus, Loader2 } from "lucide-react";
import { Staff } from "@/types/staff";
import { useStaffTableState } from "./hooks/use-staff-table-state";
import { useStaff as useStaffQuery, useUpdateStaff, useDeleteStaff } from "@/hooks/use-staff";
import { StaffTable } from "./components/staff-table";
import { StaffFilters as StaffFiltersComponent } from "./components/staff-filters";
import { calculateStaffMetrics } from "./utils/calculate-staff-metrics";
import { useAppointments } from "@/hooks/use-appointments";
import { useMembershipRecords } from "@/hooks/use-membership-records";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { StaffFormDrawer } from "./components/staff-form-drawer";
import { StaffRatingDialog } from "./components/staff-rating-dialog";
import { addStaffRating } from "./utils/staff-ratings";
import { useRoster, useUpdateRoster } from "@/hooks/use-roster";
import { RosterStatus, ShiftType, LeaveType } from "@/types/roster";

export function StaffPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [ratingStaff, setRatingStaff] = useState<Staff | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const router = useRouter();

  // Use React Query to fetch staff data
  const { data: staffData = [], isLoading, error } = useStaffQuery();
  const updateStaffMutation = useUpdateStaff();
  const deleteStaffMutation = useDeleteStaff();
  
  // Fetch appointments, membership records, and PT package records from MongoDB
  const { data: appointments = [] } = useAppointments();
  const { data: membershipRecords = [] } = useMembershipRecords();
  const { data: ptPackageRecords = [] } = usePTPackageRecords();

  // Fetch Roster for integration - memoize date to prevent unnecessary re-renders
  const currentDate = useMemo(() => new Date(), []);
  const currentMonth = useMemo(() => currentDate.getMonth() + 1, [currentDate]);
  const currentYear = useMemo(() => currentDate.getFullYear(), [currentDate]);
  const { data: rosterRecords = [] } = useRoster(currentMonth, currentYear);
  const updateRosterMutation = useUpdateRoster();

  // Use local hook for filtering, sorting, and pagination
  const {
    allStaff,
    staff: paginatedStaff,
    pageCount,
    filters,
    sorting,
    pagination,
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
  } = useStaffTableState({ initialStaff: staffData });

  // Merge Roster Status into Staff Data for the Table
  const staffWithRosterStatus = useMemo(() => {
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const todayDate = new Date(currentYear, currentMonth - 1, currentDate.getDate());
    const todayDayName = todayDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    
    return paginatedStaff.map(staff => {
      const rosterRecord = rosterRecords.find(r => r.staffId === staff._id && r.date === todayStr);
      
      // Default to staff.status
      let status = staff.status;
      
      if (rosterRecord) {
        // Map Roster Status to StaffStatus
        switch (rosterRecord.status) {
          case "shift":
            status = "AVAILABLE";
            break;
          case "dayoff":
            status = "DAY_OFF";
            break;
          case "leave":
            switch (rosterRecord.leaveType) {
              case "AL": status = "ON_LEAVE_ANNUAL"; break;
              case "PH": status = "ON_LEAVE_PUBLIC_HOLIDAY"; break;
              case "SL": status = "ON_LEAVE_SICK"; break;
              case "UP": status = "UNAVAILABLE"; break; // Mapping Unpaid to Unavailable for now, or could be custom
              default: status = "ON_LEAVE_ANNUAL"; 
            }
            break;
          case "none":
            status = "UNAVAILABLE";
            break;
        }
      } else {
        // If no roster record exists, check if today is the staff's day off
        const staffDayOff = staff.dayOff?.toLowerCase();
        if (staffDayOff && todayDayName === staffDayOff) {
          status = "DAY_OFF";
        }
      }
      
      return { ...staff, status };
    });
  }, [paginatedStaff, rosterRecords, currentMonth, currentYear, currentDate]);

  // Calculate metrics for each staff member based on selected month
  const staffMetrics = useMemo(() => {
    const metrics: Record<string, { sales: number; conduct: number; salesPercent: number; conductPercent: number }> = {};
    
    allStaff.forEach((staffMember) => {
      const metric = calculateStaffMetrics(
        staffMember,
        filters.month,
        appointments,
        membershipRecords,
        ptPackageRecords
      );
      // Use _id only for metrics key (removed staffID to improve performance)
      const staffKey = staffMember._id || "";
      if (staffKey) {
        metrics[staffKey] = metric;
      }
    });
    
    return metrics;
  }, [allStaff, filters.month, appointments, membershipRecords, ptPackageRecords]);

  // Loading and error states are handled by React Query
  // Error is handled by React Query hooks

  const handleViewStaff = (staff: Staff) => {
    // Use staffID if available, otherwise fall back to _id
    const staffIdentifier = staff.staffID || staff._id;
    if (staffIdentifier) {
      router.push(`/dashboard/staff/${staffIdentifier}`);
    }
  };

  const handleAddStaff = () => {
    setEditingStaff(null);
    setDrawerOpen(true);
  };

  const handleEditStaff = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setDrawerOpen(true);
  };

  const handleSaveStaff = async (data: Omit<Staff, "_id" | "createdAt" | "updatedAt">) => {
    // This will be handled by the form using React Query mutations
    // We keep this for backward compatibility but it won't be called
    // The form will handle the save directly
  };

  const handleDeleteStaff = (staffMember: Staff) => {
    setStaffToDelete(staffMember);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    // Use staffID if available, otherwise fall back to _id
    const staffIdentifier = staffToDelete.staffID || staffToDelete._id;
    if (!staffIdentifier) return;

    try {
      await deleteStaffMutation.mutateAsync(staffIdentifier);
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      // Error is already handled by the mutation (toast shown)
    }
  };

  const handleUpdateStatus = async (staffMember: Staff, newStatus: Staff["status"]) => {
    // Use staffID if available, otherwise fall back to _id
    const staffIdentifier = staffMember.staffID || staffMember._id;
    if (!staffIdentifier) return;

    // Calculate Roster updates
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    let rosterStatus: RosterStatus = "none";
    let shiftType: ShiftType | undefined = undefined;
    let leaveType: LeaveType | undefined = undefined;

    switch (newStatus) {
      case "AVAILABLE":
        rosterStatus = "shift";
        // Map StaffShift (AM/MID/NOON) to ShiftType (AM/MID/PM)
        if (staffMember.shift === "AM") shiftType = "AM";
        else if (staffMember.shift === "MID") shiftType = "MID";
        else if (staffMember.shift === "NOON") shiftType = "PM";
        else shiftType = "AM"; // Default
        break;
      case "DAY_OFF":
        rosterStatus = "dayoff";
        break;
      case "ON_LEAVE_ANNUAL":
        rosterStatus = "leave";
        leaveType = "AL";
        break;
      case "ON_LEAVE_PUBLIC_HOLIDAY":
        rosterStatus = "leave";
        leaveType = "PH";
        break;
      case "ON_LEAVE_SICK":
        rosterStatus = "leave";
        leaveType = "SL";
        break;
      case "UNAVAILABLE":
        rosterStatus = "none"; 
        break;
    }

    try {
      // 1. Update Roster
      await updateRosterMutation.mutateAsync({
        staffId: staffIdentifier,
        date: todayStr,
        status: rosterStatus,
        shiftType,
        leaveType
      });
      
      // 2. Handle Leave Usage Counters
      // Check previous roster record for today to see if we need to decrement usage
      const prevRecord = rosterRecords.find(r => r.staffId === staffIdentifier && r.date === todayStr);
      
      let currentAnnual = staffMember.annualLeaveUsed || 0;
      let currentSick = staffMember.sickLeaveUsed || 0;
      let currentPH = staffMember.publicHolidayUsed || 0;
      let currentUnpaid = staffMember.unpaidLeaveUsed || 0;
      let usageChanged = false;

      // If previously on leave, decrement
      if (prevRecord && prevRecord.status === "leave") {
        if (prevRecord.leaveType === "AL") { currentAnnual--; usageChanged = true; }
        else if (prevRecord.leaveType === "SL") { currentSick--; usageChanged = true; }
        else if (prevRecord.leaveType === "PH") { currentPH--; usageChanged = true; }
        else if (prevRecord.leaveType === "UP") { currentUnpaid--; usageChanged = true; }
      }

      // If new status is leave, increment
      if (rosterStatus === "leave" && leaveType) {
        if (leaveType === "AL") { currentAnnual++; usageChanged = true; }
        else if (leaveType === "SL") { currentSick++; usageChanged = true; }
        else if (leaveType === "PH") { currentPH++; usageChanged = true; }
        else if (leaveType === "UP") { currentUnpaid++; usageChanged = true; }
      }

      // 3. Update Staff Status & Usage
      await updateStaffMutation.mutateAsync({
        id: staffIdentifier,
        data: {
          status: newStatus,
          // Only update usage if it changed
          ...(usageChanged ? {
            annualLeaveUsed: Math.max(0, currentAnnual),
            sickLeaveUsed: Math.max(0, currentSick),
            publicHolidayUsed: Math.max(0, currentPH),
            unpaidLeaveUsed: Math.max(0, currentUnpaid)
          } : {})
        },
      });

    } catch (error) {
      // Error is already handled by the mutation (toast shown)
    }
  };

  const handleRateStaff = (staffMember: Staff) => {
    setRatingStaff(staffMember);
    setRatingDialogOpen(true);
  };

  const handleRatingSubmit = (staffId: string, rating: number) => {
    if (!staffId) return;
    addStaffRating(staffId, rating);
    // React Query will automatically refetch and update the UI
    // No need to manually force re-render
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">STAFF</h1>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card min-w-0">
        <div className="border-b p-4">
          <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <StaffFiltersComponent filters={filters} onFiltersChange={updateFilters} />
            <Button onClick={handleAddStaff} size="sm" className="h-8 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Staff
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <StaffTable
            staff={staffWithRosterStatus}
            totalRows={allStaff.length}
            sorting={sorting}
            onSort={handleSortingChange}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            pageCount={pageCount}
            staffMetrics={staffMetrics}
            onView={handleViewStaff}
            onEdit={handleEditStaff}
            onDelete={handleDeleteStaff}
            onUpdateStatus={handleUpdateStatus}
            onRate={handleRateStaff}
          />
        </div>
      </div>

      <StaffFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        staff={editingStaff}
        onSave={handleSaveStaff}
      />

      {ratingStaff && (
        <StaffRatingDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          staff={ratingStaff}
          onRate={handleRatingSubmit}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!deleteStaffMutation.isPending) {
          setDeleteDialogOpen(open);
          if (!open) {
            setStaffToDelete(null);
          }
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              <span className="font-semibold">{staffToDelete?.name}</span> from
              the staff list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                if (!deleteStaffMutation.isPending) {
                  setStaffToDelete(null);
                  setDeleteDialogOpen(false);
                }
              }}
              disabled={deleteStaffMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStaff}
              disabled={deleteStaffMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStaffMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
