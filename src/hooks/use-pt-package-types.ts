"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PTPackage } from "@/features/dashboard/pages/services/types/pt-package";
import { toast } from "sonner";

// Fetch all PT package types
export function usePTPackageTypes(filters?: {
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["pt-package-types", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.status) params.append("status", filters.status);

      const response = await fetch(`/api/package-types/pt-packages?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch PT packages");
      }
      return response.json() as Promise<PTPackage[]>;
    },
  });
}

// Fetch single PT package type
export function usePTPackageTypeById(id: string | undefined) {
  return useQuery({
    queryKey: ["pt-package-types", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/package-types/pt-packages/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch PT package");
      }
      return response.json() as Promise<PTPackage>;
    },
    enabled: !!id,
  });
}

// Create PT package type mutation
export function useCreatePTPackageType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PTPackage, "id" | "createdAt" | "updatedAt">) => {
      const response = await fetch("/api/package-types/pt-packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create PT package");
      }

      return response.json() as Promise<PTPackage>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-package-types"] });
      toast.success("PT package created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create PT package");
    },
  });
}

// Update PT package type mutation
export function useUpdatePTPackageType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<PTPackage, "id" | "createdAt" | "updatedAt">>;
    }) => {
      const response = await fetch(`/api/package-types/pt-packages/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update PT package");
      }

      return response.json() as Promise<PTPackage>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pt-package-types"] });
      queryClient.invalidateQueries({ queryKey: ["pt-package-types", variables.id] });
      toast.success("PT package updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update PT package");
    },
  });
}

// Delete PT package type mutation
export function useDeletePTPackageType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/package-types/pt-packages/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete PT package");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-package-types"] });
      toast.success("PT package deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete PT package");
    },
  });
}
