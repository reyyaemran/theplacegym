import { useState, useMemo } from "react";
import { Member, MemberFilters } from "@/features/dashboard/pages/members/types/member";
import { useQuery } from "@tanstack/react-query";
import {
  SortingState,
  PaginationState,
  OnChangeFn,
} from "@tanstack/react-table";

interface UseMembersProps {
  initialMembers?: Member[];
}

export function useMembers({ initialMembers }: UseMembersProps = {}) {
  const [filters, setFilters] = useState<MemberFilters>({
    search: "",
  });

  const [sorting, setSorting] = useState<SortingState>([
    { id: "dateJoined", desc: true },
  ]);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 8,
  });

  // Fetch members from API
  const { data: fetchedMembers = [], isLoading, error } = useQuery({
    queryKey: ["members", filters.status], // Add status to query key if needed
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      
      const response = await fetch(`/api/members?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }
      return response.json() as Promise<Member[]>;
    },
    // Use initialMembers as initial data if provided (for SSR or pre-fetching)
    initialData: initialMembers,
  });

  const filteredMembers = useMemo(() => {
    return fetchedMembers.filter((member) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableFields = [
          member.memberNumber,
          member.fullName,
          member.email,
          member.company,
          member.location,
        ].map((field) => (field || "").toLowerCase());

        if (!searchableFields.some((field) => field.includes(searchLower))) {
          return false;
        }
      }

      return true;
    });
  }, [fetchedMembers, filters.search]);

  // For TanStack table, we need to handle pagination and sorting separately
  const paginatedAndSortedMembers = useMemo(() => {
    // Early return if no filters
    if (filteredMembers.length === 0) return [];

    // Skip sorting if no sort criteria
    if (sorting.length === 0) {
      // Just apply pagination
      const startIdx = pagination.pageIndex * pagination.pageSize;
      const endIdx = startIdx + pagination.pageSize;
      return filteredMembers.slice(startIdx, endIdx);
    }

    // Create a sorting function that makes comparisons based on field type
    const compareValues = (
      a: number | string | Date | undefined,
      b: number | string | Date | undefined,
      desc: boolean
    ): number => {
      const direction = desc ? -1 : 1;

      // Handle different value types
      if (a === b) return 0;

      // Handle null/undefined values
      if (a == null || a === undefined) return direction;
      if (b == null || b === undefined) return -direction;

      // Check if values are dates (try to detect ISO strings)
      if (typeof a === "string" && typeof b === "string") {
        // ISO date format detection (more reliable than checking for "T")
        const isDateA = /^\d{4}-\d{2}-\d{2}(T|\s)/.test(a);
        const isDateB = /^\d{4}-\d{2}-\d{2}(T|\s)/.test(b);

        if (isDateA && isDateB) {
          const dateA = new Date(a).getTime();
          const dateB = new Date(b).getTime();
          return (dateA - dateB) * direction;
        }

        // Regular string comparison
        return a.localeCompare(b) * direction;
      }

      // Number comparison
      if (typeof a === "number" && typeof b === "number") {
        return (a - b) * direction;
      }

      // Default comparison (converts to string)
      return String(a).localeCompare(String(b)) * direction;
    };

    // Apply sorting
    const sortedMembers = [...filteredMembers].sort((a, b) => {
      // Handle multi-sorting using sortingState array
      for (const sort of sorting) {
        const key = sort.id as keyof Member;
        const compared = compareValues(a[key] as any, b[key] as any, sort.desc);
        if (compared !== 0) return compared;
      }
      return 0;
    });

    // Apply pagination
    const startIdx = pagination.pageIndex * pagination.pageSize;
    const endIdx = startIdx + pagination.pageSize;
    return sortedMembers.slice(startIdx, endIdx);
  }, [filteredMembers, sorting, pagination]);

  const updateFilters = (newFilters: Partial<MemberFilters>) => {
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
    setFilters({
      search: "",
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return {
    // Raw filtered members (no pagination applied)
    allMembers: filteredMembers,
    // Members with pagination and sorting applied
    members: paginatedAndSortedMembers,
    // Total count for pagination
    pageCount: Math.ceil(filteredMembers.length / pagination.pageSize),
    // States
    filters,
    sorting,
    pagination,
    isLoading,
    error,
    // Update handlers
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
    handleClearFilters,
  };
}
