"use client";

import { useMemo, useState, useEffect } from "react";
import { usePTPackageRecords as usePTPackageRecordsQuery, useUpdatePTPackageRecord, useDeletePTPackageRecord } from "@/hooks/use-pt-package-records";
import { usePTPackageRecords } from "./hooks/use-pt-package-records";
import { PTPackageRecord } from "./types/pt-package-record";
import { EditPTPackageRecordDialog } from "./components/edit-pt-package-record-dialog";
import { PTPackageRecordsTable } from "./components/pt-package-records-table";
import { PTPackageRecordsFilters } from "./components/pt-package-records-filters";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, FileText, Package, DollarSign, Activity, TrendingUp } from "lucide-react";
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
import { exportToExcel, exportToPDF } from "./utils/export-pt-package-records";
import { useAppointments } from "@/hooks/use-appointments";
import { useQueryClient } from "@tanstack/react-query";

export function PTPackagesListPage() {
  const queryClient = useQueryClient();
  const [recordToEdit, setRecordToEdit] = useState<PTPackageRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<PTPackageRecord | null>(null);
  
  const updatePTPackageRecord = useUpdatePTPackageRecord();
  const deletePTPackageRecord = useDeletePTPackageRecord();
  
  // Fetch real data from API using React Query
  const { data: apiRecords = [] } = usePTPackageRecordsQuery();
  const { data: appointments = [] } = useAppointments();
  
  // Force refetch on mount to ensure fresh data
  useEffect(() => {
    // Invalidate and refetch to clear any stale cache
    queryClient.invalidateQueries({ queryKey: ["pt-packages"] });
    queryClient.refetchQueries({ queryKey: ["pt-packages"] });
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
  } = usePTPackageRecords({ initialRecords: apiRecords });

  // Calculate stats from filtered records
  const stats = useMemo(() => {
    const totalPackages = allRecords.length;
    const totalRevenue = allRecords.reduce((sum, record) => sum + record.amount, 0);
    const totalSessions = allRecords.reduce((sum, record) => sum + record.ptPackageSessions, 0);
    const activePackages = allRecords.filter((record) => {
      const expiry = new Date(record.expiryDate);
      const now = new Date();
      return expiry >= now;
    }).length;

    return {
      totalPackages,
      totalRevenue,
      totalSessions,
      activePackages,
    };
  }, [allRecords]);

  const handleExportExcel = () => {
    exportToExcel(allRecords);
  };

  const handleExportPDF = () => {
    exportToPDF(allRecords);
  };

  const handleEdit = (record: PTPackageRecord) => {
    setRecordToEdit(record);
  };

  const handleDelete = (record: PTPackageRecord) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      const recordId = (recordToDelete as any)._id || recordToDelete.id || "";
      await deletePTPackageRecord.mutateAsync(recordId);
      setRecordToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["pt-packages"] });
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight uppercase font-montserrat">PT PACKAGE</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground/90">Total Packages</CardTitle>
              <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20">
                <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[40px] flex items-center justify-center">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">{stats.totalPackages}</div>
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
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">${stats.totalRevenue.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground/90">Total Sessions</CardTitle>
              <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/20">
                <Activity className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[40px] flex items-center justify-center">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">{stats.totalSessions}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground/90">Active Packages</CardTitle>
              <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-950/20">
                <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[40px] flex items-center justify-center">
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">{stats.activePackages}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <PTPackageRecordsFilters filters={filters} onFiltersChange={updateFilters} />
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
          <PTPackageRecordsTable
            records={records}
            totalRows={allRecords.length}
            sorting={sorting}
            onSort={handleSortingChange}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            pageCount={pageCount}
            appointments={appointments}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Edit Dialog */}
      <EditPTPackageRecordDialog
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
            <AlertDialogTitle>Delete PT Package Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the PT package record for {recordToDelete?.memberName}? This action cannot be undone.
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

