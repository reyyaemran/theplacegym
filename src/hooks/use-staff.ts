"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Staff } from "@/types/staff";
import { toast } from "sonner";

// Fetch all staff
export function useStaff(filters?: {
  department?: string;
  level?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["staff", filters],
    staleTime: 60 * 1000, // 1 min - staff list changes infrequently
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.department) params.append("department", filters.department);
      if (filters?.level) params.append("level", filters.level);
      if (filters?.status) params.append("status", filters.status);

      const response = await fetch(`/api/staff?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch staff");
      }
      return response.json() as Promise<Staff[]>;
    },
  });
}

// Fetch single staff member
export function useStaffById(id: string | undefined) {
  return useQuery({
    queryKey: ["staff", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/staff/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch staff member");
      }
      return response.json() as Promise<Staff>;
    },
    enabled: !!id,
  });
}

// Create staff mutation
export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Staff, "_id" | "createdAt" | "updatedAt">) => {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create staff");
      }

      return response.json() as Promise<Staff>;
    },
    onSuccess: (newStaff) => {
      // Invalidate all staff queries to trigger automatic refetch
      // This ensures the table updates regardless of filters
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create staff member");
    },
  });
}

// Update staff mutation
export function useUpdateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Staff, "_id" | "createdAt" | "updatedAt">>;
    }) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update staff");
      }

      return response.json() as Promise<Staff>;
    },
    onSuccess: (updatedStaff, variables) => {
      // Invalidate both the list and the specific staff member
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["staff", variables.id] });
      // Also invalidate by _id if it exists and differs
      if (updatedStaff._id && updatedStaff._id !== variables.id) {
        queryClient.invalidateQueries({ queryKey: ["staff", updatedStaff._id] });
      }
      // Also set the updated data directly to ensure immediate UI update
      queryClient.setQueryData(["staff", variables.id], updatedStaff);
      if (updatedStaff._id && updatedStaff._id !== variables.id) {
        queryClient.setQueryData(["staff", updatedStaff._id], updatedStaff);
      }
      toast.success("Staff member updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update staff member");
    },
  });
}

// Delete staff mutation
export function useDeleteStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete staff");
      }

      return { id };
    },
    onSuccess: () => {
      // Invalidate and refetch staff list
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff member deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete staff member");
    },
  });
}

