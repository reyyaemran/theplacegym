"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Membership } from "@/features/dashboard/pages/memberships/types/membership";
import { toast } from "sonner";

// Fetch all membership types
export function useMembershipTypes(filters?: {
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["membership-types", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.status) params.append("status", filters.status);

      const response = await fetch(`/api/package-types/memberships?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch memberships");
      }
      return response.json() as Promise<Membership[]>;
    },
  });
}

// Fetch single membership type
export function useMembershipTypeById(id: string | undefined) {
  return useQuery({
    queryKey: ["membership-types", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/package-types/memberships/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch membership");
      }
      return response.json() as Promise<Membership>;
    },
    enabled: !!id,
  });
}

// Create membership type mutation
export function useCreateMembershipType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Membership, "id" | "createdAt" | "updatedAt">) => {
      const response = await fetch("/api/package-types/memberships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create membership");
      }

      return response.json() as Promise<Membership>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-types"] });
      toast.success("Membership created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create membership");
    },
  });
}

// Update membership type mutation
export function useUpdateMembershipType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Membership, "id" | "createdAt" | "updatedAt">>;
    }) => {
      const response = await fetch(`/api/package-types/memberships/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update membership");
      }

      return response.json() as Promise<Membership>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["membership-types"] });
      queryClient.invalidateQueries({ queryKey: ["membership-types", variables.id] });
      toast.success("Membership updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update membership");
    },
  });
}

// Delete membership type mutation
export function useDeleteMembershipType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/package-types/memberships/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete membership");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership-types"] });
      toast.success("Membership deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete membership");
    },
  });
}

