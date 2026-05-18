"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { toast } from "sonner";

// Fetch all PT package records
export function usePTPackageRecords(filters?: {
  memberId?: string;
  memberName?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["pt-packages", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.memberId) params.append("memberId", filters.memberId);
      if (filters?.memberName) params.append("memberName", filters.memberName);
      if (filters?.search) params.append("search", filters.search);

      const response = await fetch(`/api/pt-packages?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch PT package records");
      }
      return response.json() as Promise<PTPackageRecord[]>;
    },
    staleTime: 60 * 1000, // 1 min - avoid aggressive refetches on dashboard load
  });
}

// Fetch single PT package record
export function usePTPackageRecordById(id: string | undefined) {
  return useQuery({
    queryKey: ["pt-packages", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/pt-packages/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch PT package record");
      }
      return response.json() as Promise<PTPackageRecord>;
    },
    enabled: !!id,
  });
}

// Create PT package record mutation
export function useCreatePTPackageRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<PTPackageRecord, "id">) => {
      const response = await fetch("/api/pt-packages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create PT package record");
      }

      return response.json() as Promise<PTPackageRecord>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-packages"] });
      toast.success("PT package record created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create PT package record");
    },
  });
}

// Update PT package record mutation
export function useUpdatePTPackageRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<PTPackageRecord, "id">>;
    }) => {
      const response = await fetch(`/api/pt-packages/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update PT package record");
      }

      return response.json() as Promise<PTPackageRecord>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pt-packages"] });
      queryClient.invalidateQueries({ queryKey: ["pt-packages", variables.id] });
      toast.success("PT package record updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update PT package record");
    },
  });
}

// Delete PT package record mutation
export function useDeletePTPackageRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pt-packages/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete PT package record");
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pt-packages"] });
      toast.success("PT package record deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete PT package record");
    },
  });
}

