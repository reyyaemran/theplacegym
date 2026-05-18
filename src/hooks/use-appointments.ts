"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Appointment } from "@/types/appointment";
import { toast } from "sonner";

// Fetch all appointments
export function useAppointments(filters?: {
  trainerId?: string;
  clientId?: string;
  status?: string;
  date?: string;
}) {
  return useQuery({
    queryKey: ["appointments", filters],
    staleTime: 30 * 1000, // 30s - appointments update more often
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.trainerId) params.append("trainerId", filters.trainerId);
      if (filters?.clientId) params.append("clientId", filters.clientId);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.date) params.append("date", filters.date);

      const response = await fetch(`/api/appointments?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      return response.json() as Promise<Appointment[]>;
    },
  });
}

// Fetch single appointment
export function useAppointmentById(id: string | undefined) {
  return useQuery({
    queryKey: ["appointments", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/appointments/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch appointment");
      }
      return response.json() as Promise<Appointment>;
    },
    enabled: !!id,
  });
}

// Create appointment mutation
export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Appointment, "_id" | "appointmentNumber">) => {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create appointment");
      }

      return response.json() as Promise<Appointment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create appointment");
    },
  });
}

// Update appointment mutation with optimistic updates
export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Appointment, "_id">>;
    }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update appointment");
      }

      return response.json() as Promise<Appointment>;
    },
    // Optimistic update - update UI immediately before server responds
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["appointments"] });

      // Snapshot the previous value
      const previousAppointments = queryClient.getQueryData<Appointment[]>(["appointments"]);

      // Optimistically update the cache
      if (previousAppointments) {
        queryClient.setQueryData<Appointment[]>(
          ["appointments"],
          previousAppointments.map((apt) =>
            apt._id === id ? { ...apt, ...data } : apt
          )
        );
      }

      // Return context with the snapshot
      return { previousAppointments };
    },
    onSuccess: (updatedAppointment) => {
      // Update the specific appointment in cache with server response
      queryClient.setQueryData<Appointment[]>(["appointments"], (old) =>
        old?.map((apt) =>
          apt._id === updatedAppointment._id ? updatedAppointment : apt
        )
      );
      toast.success("Appointment updated successfully");
    },
    onError: (error: Error, _, context) => {
      // Rollback to previous state on error
      if (context?.previousAppointments) {
        queryClient.setQueryData(["appointments"], context.previousAppointments);
      }
      toast.error(error.message || "Failed to update appointment");
    },
    onSettled: () => {
      // Refetch in background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

// Delete appointment mutation with optimistic updates
export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete appointment");
      }

      return { id };
    },
    // Optimistic delete - remove from UI immediately
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["appointments"] });

      const previousAppointments = queryClient.getQueryData<Appointment[]>(["appointments"]);

      // Optimistically remove the appointment
      if (previousAppointments) {
        queryClient.setQueryData<Appointment[]>(
          ["appointments"],
          previousAppointments.filter((apt) => apt._id !== id)
        );
      }

      return { previousAppointments };
    },
    onSuccess: () => {
      // Only invalidate related queries (not all of them)
      queryClient.invalidateQueries({ queryKey: ["pt-packages"] });
      toast.success("Appointment deleted successfully");
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousAppointments) {
        queryClient.setQueryData(["appointments"], context.previousAppointments);
      }
      toast.error(error.message || "Failed to delete appointment");
    },
    onSettled: () => {
      // Ensure consistency with server
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
