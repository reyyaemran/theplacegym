"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Member } from "@/features/dashboard/pages/members/types/member";
import { toast } from "sonner";

// Fetch all members
export function useMembers(filters?: {
  search?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["members", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append("search", filters.search);
      if (filters?.status) params.append("status", filters.status);

      const response = await fetch(`/api/members?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }
      return response.json() as Promise<Member[]>;
    },
  });
}

// Fetch single member
export function useMemberById(id: string | undefined) {
  return useQuery({
    queryKey: ["members", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/members/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch member");
      }
      return response.json() as Promise<Member>;
    },
    enabled: !!id,
  });
}

// Create member mutation
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Member, "id">) => {
      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create member");
      }

      return response.json() as Promise<Member>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create member");
    },
  });
}

// Update member mutation
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Member, "id">>;
    }) => {
      const response = await fetch(`/api/members/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update member");
      }

      return response.json() as Promise<Member>;
    },
    onSuccess: (updatedMember, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      // Invalidate by both the ID used and memberNumber (in case they differ)
      queryClient.invalidateQueries({ queryKey: ["members", variables.id] });
      if (updatedMember.memberNumber && updatedMember.memberNumber !== variables.id) {
        queryClient.invalidateQueries({ queryKey: ["members", updatedMember.memberNumber] });
      }
      // Also invalidate by _id if it exists (for MongoDB document ID)
      if ((updatedMember as any)._id && (updatedMember as any)._id !== variables.id) {
        queryClient.invalidateQueries({ queryKey: ["members", (updatedMember as any)._id] });
      }
      // Also set the updated data directly to ensure immediate UI update
      queryClient.setQueryData(["members", variables.id], updatedMember);
      if (updatedMember.memberNumber && updatedMember.memberNumber !== variables.id) {
        queryClient.setQueryData(["members", updatedMember.memberNumber], updatedMember);
      }
      if ((updatedMember as any)._id && (updatedMember as any)._id !== variables.id && (updatedMember as any)._id !== updatedMember.memberNumber) {
        queryClient.setQueryData(["members", (updatedMember as any)._id], updatedMember);
      }
      toast.success("Member updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update member");
    },
  });
}

// Delete member mutation
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/members/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete member");
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete member");
    },
  });
}

