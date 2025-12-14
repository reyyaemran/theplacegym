import { useState, useMemo } from "react";
import { Staff } from "@/types/staff";
import { StaffFilters } from "../types/staff";
import { mockStaff } from "@/lib/mock-data";
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";
import { format } from "date-fns";

/**
 * Hook for managing staff table state: filtering, sorting, and pagination
 * This is separate from the global useStaff hook which handles API data fetching
 */
interface UseStaffTableStateProps {
  initialStaff?: Staff[];
}

export function useStaffTableState({ initialStaff = mockStaff }: UseStaffTableStateProps = {}) {
  // Get current month as default (YYYY-MM format)
  const currentMonth = format(new Date(), "yyyy-MM");
  
  const [filters, setFilters] = useState<StaffFilters>({
    search: "",
    month: currentMonth,
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  });

  const filteredStaff = useMemo(() => {
    return initialStaff.filter((staff) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableFields = [
          staff.name,
          staff.email || "",
          staff.phone || "",
          staff.department,
        ].map((field) => field.toLowerCase());
        
        if (!searchableFields.some((field) => field.includes(searchLower))) {
          return false;
        }
      }

      // Month filter - used for filtering staff metrics by month
      // Metrics are calculated from clients and appointments for the selected month

      return true;
    });
  }, [initialStaff, filters]);

  const paginatedAndSortedStaff = useMemo(() => {
    // Early return if no filters
    if (filteredStaff.length === 0) return [];

    // Sort function
    const compareValues = (a: any, b: any, desc: boolean): number => {
      if (a === null || a === undefined) return 1;
      if (b === null || b === undefined) return -1;
      if (a === b) return 0;

      const direction = desc ? -1 : 1;

      // Handle dates
      if (a instanceof Date && b instanceof Date) {
        return (a.getTime() - b.getTime()) * direction;
      }

      // Handle strings
      if (typeof a === "string" && typeof b === "string") {
        return String(a).localeCompare(String(b)) * direction;
      }

      // Handle numbers
      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * direction;
      }

      return String(a).localeCompare(String(b)) * direction;
    };

    // Apply sorting
    const sortedStaff = [...filteredStaff].sort((a, b) => {
      // Handle multi-sorting using sortingState array
      for (const sort of sorting) {
        const key = sort.id as keyof Staff;
        const compared = compareValues(a[key], b[key], sort.desc);
        if (compared !== 0) return compared;
      }
      return 0;
    });

    // Apply pagination
    const startIdx = pagination.pageIndex * pagination.pageSize;
    const endIdx = startIdx + pagination.pageSize;
    return sortedStaff.slice(startIdx, endIdx);
  }, [filteredStaff, sorting, pagination]);

  const updateFilters = (newFilters: Partial<StaffFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    // Reset to first page when filters change
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    setSorting(
      updaterOrValue instanceof Function
        ? updaterOrValue(sorting)
        : updaterOrValue
    );
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (
    updaterOrValue
  ) => {
    setPagination(
      updaterOrValue instanceof Function
        ? updaterOrValue(pagination)
        : updaterOrValue
    );
  };

  const handleClearFilters = () => {
    const defaultMonth = format(new Date(), "yyyy-MM");
    setFilters({
      search: "",
      month: defaultMonth,
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return {
    // Raw filtered staff (no pagination applied)
    allStaff: filteredStaff,
    // Staff with pagination and sorting applied
    staff: paginatedAndSortedStaff,
    // Total count for pagination
    pageCount: Math.ceil(filteredStaff.length / pagination.pageSize),
    // States
    filters,
    sorting,
    pagination,
    // Update handlers
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
    handleClearFilters,
  };
}

