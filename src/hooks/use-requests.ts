"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppointmentRequest } from "@/types/request";
import { toast } from "sonner";

// Fetch all requests
export function useRequests(filters?: {
  status?: string;
  requestedBy?: string;
  appointmentId?: string;
}) {
  return useQuery({
    queryKey: ["requests", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.requestedBy) params.append("requestedBy", filters.requestedBy);
      if (filters?.appointmentId) params.append("appointmentId", filters.appointmentId);

      const response = await fetch(`/api/requests?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }
      return response.json() as Promise<AppointmentRequest[]>;
    },
  });
}

// Create request mutation
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<AppointmentRequest, "_id" | "requestNumber" | "status" | "createdAt">) => {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create request");
      }

      return response.json() as Promise<AppointmentRequest>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      toast.success("Request submitted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit request");
    },
  });
}

