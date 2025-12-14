"use client";

import { useState, useMemo } from "react";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { Membership, MembershipFilters } from "../types/membership";
import { 
  useMembershipTypes, 
  useCreateMembershipType, 
  useUpdateMembershipType, 
  useDeleteMembershipType 
} from "@/hooks/use-membership-types";

export function useMemberships() {
  const [filters, setFilters] = useState<MembershipFilters>({
    search: "",
    status: "all",
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Use React Query to fetch data from MongoDB
  const { data: membershipsData = [], isLoading } = useMembershipTypes({
    search: filters.search || undefined,
    status: filters.status !== "all" ? filters.status : undefined,
  });
  
  const createMembershipMutation = useCreateMembershipType();
  const updateMembershipMutation = useUpdateMembershipType();
  const deleteMembershipMutation = useDeleteMembershipType();

  // Data is already filtered by the API, but we can apply additional client-side filtering if needed
  const filteredMemberships = useMemo(() => {
    return membershipsData;
  }, [membershipsData]);

  const sortedMemberships = useMemo(() => {
    if (sorting.length === 0) return filteredMemberships;

    const sorted = [...filteredMemberships];
    sorting.forEach((sort) => {
      sorted.sort((a, b) => {
        const aValue = a[sort.id as keyof Membership];
        const bValue = b[sort.id as keyof Membership];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sort.desc
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue);
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return sort.desc ? bValue - aValue : aValue - bValue;
        }

        return 0;
      });
    });

    return sorted;
  }, [filteredMemberships, sorting]);

  const paginatedMemberships = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return sortedMemberships.slice(start, end);
  }, [sortedMemberships, pagination]);

  const pageCount = Math.ceil(
    sortedMemberships.length / pagination.pageSize
  );

  const updateFilters = (newFilters: MembershipFilters) => {
    setFilters(newFilters);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const handleSortingChange = (newSorting: SortingState) => {
    setSorting(newSorting);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const handlePaginationChange = (newPagination: PaginationState) => {
    setPagination(newPagination);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "all",
    });
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const createMembership = async (data: Omit<Membership, "id" | "createdAt" | "updatedAt">) => {
    await createMembershipMutation.mutateAsync(data);
  };

  const updateMembership = async (id: string, data: Omit<Membership, "id" | "createdAt" | "updatedAt">) => {
    await updateMembershipMutation.mutateAsync({ id, data });
  };

  const deleteMembership = async (id: string) => {
    await deleteMembershipMutation.mutateAsync(id);
  };

  return {
    memberships: paginatedMemberships,
    allMemberships: sortedMemberships,
    pageCount,
    filters,
    sorting,
    pagination,
    loading: isLoading,
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
    handleClearFilters,
    createMembership,
    updateMembership,
    deleteMembership,
  };
}

