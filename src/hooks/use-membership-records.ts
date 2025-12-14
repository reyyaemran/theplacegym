"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { toast } from "sonner";

// Fetch all membership records
export function useMembershipRecords(filters?: {
  memberId?: string;
  memberName?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["memberships", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.memberId) params.append("memberId", filters.memberId);
      if (filters?.memberName) params.append("memberName", filters.memberName);
      if (filters?.search) params.append("search", filters.search);

      const response = await fetch(`/api/memberships?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch membership records");
      }
      return response.json() as Promise<MembershipRecord[]>;
    },
    staleTime: 0, // Always consider data stale, refetch on mount
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

// Fetch single membership record
export function useMembershipRecordById(id: string | undefined) {
  return useQuery({
    queryKey: ["memberships", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/memberships/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch membership record");
      }
      return response.json() as Promise<MembershipRecord>;
    },
    enabled: !!id,
  });
}

// Create membership record mutation
export function useCreateMembershipRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MembershipRecord, "id">) => {
      const response = await fetch("/api/memberships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create membership record");
      }

      return response.json() as Promise<MembershipRecord>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Membership record created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create membership record");
    },
  });
}

// Update membership record mutation
export function useUpdateMembershipRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<MembershipRecord, "id">>;
    }) => {
      const response = await fetch(`/api/memberships/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update membership record");
      }

      return response.json() as Promise<MembershipRecord>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["memberships", variables.id] });
      toast.success("Membership record updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update membership record");
    },
  });
}

// Delete membership record mutation
export function useDeleteMembershipRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/memberships/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete membership record");
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      toast.success("Membership record deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete membership record");
    },
  });
}

