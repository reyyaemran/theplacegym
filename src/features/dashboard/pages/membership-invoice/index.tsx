"use client";

import { useMemo, useState, useEffect } from "react";
import { useMembershipRecords as useMembershipRecordsQuery, useUpdateMembershipRecord, useDeleteMembershipRecord } from "@/hooks/use-membership-records";
import { useMembershipRecords } from "./hooks/use-membership-records";
import { MembershipRecord } from "./types/membership-record";
import { EditMembershipRecordDialog } from "./components/edit-membership-record-dialog";
import { MembershipRecordsTable } from "./components/membership-records-table";
import { MembershipRecordsFilters } from "./components/membership-records-filters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, FileText, Users, DollarSign, CheckCircle2, AlertTriangle } from "lucide-react";
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
import { exportToExcel, exportToPDF } from "./utils/export-membership-records";
import { differenceInDays } from "date-fns";
import { MembershipStatus } from "@/features/dashboard/pages/members/types/member";
import { useQueryClient } from "@tanstack/react-query";

// Calculate membership status (same logic as in table columns)
const getMembershipStatus = (
  startDate: string,
  expiryDate: string
): MembershipStatus => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = differenceInDays(expiry, now);
  
  if (expiry < now) {
    return 'expired';
  }
  
  if (daysUntilExpiry <= 7) {
    return '7_days_left';
  }
  
  if (daysUntilExpiry <= 14) {
    return 'expiring_soon';
  }
  
  const start = new Date(startDate);
  const daysSinceStart = differenceInDays(now, start);
  
  if (daysSinceStart < 30) {
    return 'new_member';
  }
  
  return 'active';
};

export function MembershipsListPage() {
  const queryClient = useQueryClient();
  const [recordToEdit, setRecordToEdit] = useState<MembershipRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MembershipRecord | null>(null);
  
  const updateMembershipRecord = useUpdateMembershipRecord();
  const deleteMembershipRecord = useDeleteMembershipRecord();
  
  // Fetch real data from API using React Query
  const { data: apiRecords = [] } = useMembershipRecordsQuery();
  
  // Force refetch on mount to ensure fresh data
  useEffect(() => {
    // Invalidate and refetch to clear any stale cache
    queryClient.invalidateQueries({ queryKey: ["memberships"] });
    queryClient.refetchQueries({ queryKey: ["memberships"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  // Use local hook for filtering, sorting, and pagination with real API data
  const {
    records,
    allRecords,
    pageCount,
    filters,
    sorting,
    pagination,
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
  } = useMembershipRecords({ initialRecords: apiRecords });

  // Calculate stats from filtered records
  const stats = useMemo(() => {
    const totalMemberships = allRecords.length;
    const totalRevenue = allRecords.reduce((sum, record) => sum + record.amount, 0);
    
    const activeMemberships = allRecords.filter((record) => {
      const status = getMembershipStatus(record.startDate, record.expiryDate);
      return status === 'active';
    }).length;
    
    const expiringSoon = allRecords.filter((record) => {
      const status = getMembershipStatus(record.startDate, record.expiryDate);
      return status === 'expiring_soon' || status === '7_days_left';
    }).length;

    return {
      totalMemberships,
      totalRevenue,
      activeMemberships,
      expiringSoon,
    };
  }, [allRecords]);

  const handleExportExcel = () => {
    // Export filtered records (allRecords contains filtered data)
    exportToExcel(allRecords);
  };

  const handleExportPDF = () => {
    // Export filtered records (allRecords contains filtered data)
    exportToPDF(allRecords);
  };

  const handleEdit = (record: MembershipRecord) => {
    setRecordToEdit(record);
  };

  const handleDelete = (record: MembershipRecord) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      const recordId = (recordToDelete as any)._id || recordToDelete.id || "";
      await deleteMembershipRecord.mutateAsync(recordId);
      setRecordToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">MEMBERSHIP</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground/90">Total Memberships</CardTitle>
              <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20">
                <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[40px] flex items-center justify-center">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{stats.totalMemberships}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground/90">Total Revenue</CardTitle>
              <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[40px] flex items-center justify-center">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">${stats.totalRevenue.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground/90">Active Memberships</CardTitle>
              <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[40px] flex items-center justify-center">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{stats.activeMemberships}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground/90">Expiring Soon</CardTitle>
              <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-950/20">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[40px] flex items-center justify-center">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{stats.expiringSoon}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <MembershipRecordsFilters filters={filters} onFiltersChange={updateFilters} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="overflow-x-auto">
          <MembershipRecordsTable
            records={records}
            totalRows={allRecords.length}
            sorting={sorting}
            onSort={handleSortingChange}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            pageCount={pageCount}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Edit Dialog */}
      <EditMembershipRecordDialog
        open={!!recordToEdit}
        onOpenChange={(open) => {
          if (!open) {
            setRecordToEdit(null);
          }
        }}
        record={recordToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Membership Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the membership record for {recordToDelete?.memberName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

