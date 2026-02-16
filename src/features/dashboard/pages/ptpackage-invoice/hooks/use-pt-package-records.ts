import { useState, useMemo } from "react";
import { PTPackageRecord, PTPackageRecordFilters } from "../types/pt-package-record";
import { mockPTPackageRecords } from "../data/mock-pt-package-records";
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import { differenceInDays } from "date-fns";
import { MembershipStatus } from "@/features/dashboard/pages/members/types/member";

interface UsePTPackageRecordsProps {
  initialRecords?: PTPackageRecord[];
}

export function usePTPackageRecords({ initialRecords = mockPTPackageRecords }: UsePTPackageRecordsProps = {}) {
  const [filters, setFilters] = useState<PTPackageRecordFilters>({
    search: "",
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "startDate", desc: true },
  ]);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });

  const filteredRecords = useMemo(() => {
    return initialRecords.filter((record) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableFields = [
          record.memberId,
          record.memberName,
          record.invoiceNumber,
          record.ptPackageName,
        ].map((field) => field.toLowerCase());

        if (!searchableFields.some((field) => field.includes(searchLower))) {
          return false;
        }
      }

      return true;
    });
  }, [initialRecords, filters]);

  // Pagination and sorting
  const paginatedAndSortedRecords = useMemo(() => {
    if (filteredRecords.length === 0) return [];

    if (sorting.length === 0) {
      const startIdx = pagination.pageIndex * pagination.pageSize;
      const endIdx = startIdx + pagination.pageSize;
      return filteredRecords.slice(startIdx, endIdx);
    }

    const compareValues = (
      a: number | string | Date | undefined,
      b: number | string | Date | undefined,
      desc: boolean
    ): number => {
      const direction = desc ? -1 : 1;
      if (a === b) return 0;
      if (a == null || a === undefined) return direction;
      if (b == null || b === undefined) return -direction;

      if (typeof a === "string" && typeof b === "string") {
        const aDate = new Date(a);
        const bDate = new Date(b);
        if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
          return (aDate.getTime() - bDate.getTime()) * direction;
        }
        return a.localeCompare(b) * direction;
      }

      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * direction;
      }

      return String(a).localeCompare(String(b)) * direction;
    };

    // Helper to get PT Package status - only based on expiry date, not start date
    const getPTPackageStatus = (startDate: string, expiryDate: string): MembershipStatus => {
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
      
      // PT packages should always show "active" if not expired, regardless of start date
      return 'active';
    };

    const sorted = [...filteredRecords].sort((a, b) => {
      for (const sort of sorting) {
        let aValue: any;
        let bValue: any;
        
        // Handle status column specially
        if (sort.id === 'ptPackageStatus') {
          const statusA = getPTPackageStatus(a.startDate, a.expiryDate);
          const statusB = getPTPackageStatus(b.startDate, b.expiryDate);
          const statusOrder: Record<MembershipStatus, number> = {
            active: 1,
            new_member: 2,
            renew: 2,
            expiring_soon: 3,
            '7_days_left': 4,
            expired: 5,
          };
          aValue = statusOrder[statusA] || 0;
          bValue = statusOrder[statusB] || 0;
        } else {
          aValue = (a as any)[sort.id];
          bValue = (b as any)[sort.id];
        }
        
        const result = compareValues(aValue, bValue, sort.desc ?? false);
        if (result !== 0) return result;
      }
      return 0;
    });

    const startIdx = pagination.pageIndex * pagination.pageSize;
    const endIdx = startIdx + pagination.pageSize;
    return sorted.slice(startIdx, endIdx);
  }, [filteredRecords, sorting, pagination]);

  const pageCount = Math.ceil(filteredRecords.length / pagination.pageSize);

  const updateFilters = (newFilters: Partial<PTPackageRecordFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(typeof updater === "function" ? updater(sorting) : updater);
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    setPagination(typeof updater === "function" ? updater(pagination) : updater);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return {
    records: paginatedAndSortedRecords,
    allRecords: filteredRecords,
    pageCount,
    filters,
    sorting,
    pagination,
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
    handleClearFilters,
  };
}

