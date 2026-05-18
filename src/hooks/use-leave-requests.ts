"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LeaveRequest } from "@/types/leave-request";
import { toast } from "sonner";

export function useLeaveRequests(filters?: { status?: string; staffId?: string }) {
  return useQuery({
    queryKey: ["leave-requests", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.staffId) params.append("staffId", filters.staffId);

      const response = await fetch(`/api/leave-requests?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch leave requests");
      return response.json() as Promise<LeaveRequest[]>;
    },
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
    }) => {
      const response = await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create leave request");
      }
      return response.json() as Promise<LeaveRequest>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request submitted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit leave request");
    },
  });
}

export function useReviewLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      reviewNote,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      reviewNote?: string;
    }) => {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to review leave request");
      }
      return response.json() as Promise<LeaveRequest>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success(
        `Leave request ${variables.status === "APPROVED" ? "approved" : "rejected"}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to review leave request");
    },
  });
}

export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/leave-requests/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete leave request");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete leave request");
    },
  });
}
