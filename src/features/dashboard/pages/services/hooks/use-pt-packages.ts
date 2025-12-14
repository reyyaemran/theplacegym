"use client";

import { useState, useMemo } from "react";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { PTPackage, PTPackageFilters } from "../types/pt-package";
import { 
  usePTPackageTypes, 
  useCreatePTPackageType, 
  useUpdatePTPackageType, 
  useDeletePTPackageType 
} from "@/hooks/use-pt-package-types";

export function usePTPackages() {
  const [filters, setFilters] = useState<PTPackageFilters>({
    search: "",
    status: "all",
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Use React Query to fetch data from MongoDB
  const { data: packagesData = [], isLoading } = usePTPackageTypes({
    search: filters.search || undefined,
    status: filters.status !== "all" ? filters.status : undefined,
  });
  
  const createPTPackageMutation = useCreatePTPackageType();
  const updatePTPackageMutation = useUpdatePTPackageType();
  const deletePTPackageMutation = useDeletePTPackageType();

  // Data is already filtered by the API, but we can apply additional client-side filtering if needed
  const filteredPTPackages = useMemo(() => {
    return packagesData;
  }, [packagesData]);

  const sortedPTPackages = useMemo(() => {
    if (sorting.length === 0) return filteredPTPackages;

    const sorted = [...filteredPTPackages];
    sorting.forEach((sort) => {
      sorted.sort((a, b) => {
        const aValue = a[sort.id as keyof PTPackage];
        const bValue = b[sort.id as keyof PTPackage];

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
  }, [filteredPTPackages, sorting]);

  const paginatedPTPackages = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    const end = start + pagination.pageSize;
    return sortedPTPackages.slice(start, end);
  }, [sortedPTPackages, pagination]);

  const pageCount = Math.ceil(
    sortedPTPackages.length / pagination.pageSize
  );

  const updateFilters = (newFilters: PTPackageFilters) => {
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

  const createPTPackage = async (data: Omit<PTPackage, "id" | "createdAt" | "updatedAt">) => {
    await createPTPackageMutation.mutateAsync(data);
  };

  const updatePTPackage = async (id: string, data: Omit<PTPackage, "id" | "createdAt" | "updatedAt">) => {
    await updatePTPackageMutation.mutateAsync({ id, data });
  };

  const deletePTPackage = async (id: string) => {
    await deletePTPackageMutation.mutateAsync(id);
  };

  return {
    ptPackages: paginatedPTPackages,
    allPTPackages: sortedPTPackages,
    pageCount,
    filters,
    sorting,
    pagination,
    loading: isLoading,
    updateFilters,
    handleSortingChange,
    handlePaginationChange,
    handleClearFilters,
    createPTPackage,
    updatePTPackage,
    deletePTPackage,
  };
}

