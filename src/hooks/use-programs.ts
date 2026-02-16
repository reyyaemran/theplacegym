"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkoutProgram } from "@/features/dashboard/pages/program/types/workout-program";
import { toast } from "sonner";

export function usePrograms() {
  return useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const response = await fetch("/api/programs");
      if (!response.ok) {
        throw new Error("Failed to fetch programs");
      }
      return response.json() as Promise<WorkoutProgram[]>;
    },
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<WorkoutProgram, "id">) => {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create program");
      }

      return response.json() as Promise<WorkoutProgram>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save program");
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<WorkoutProgram, "id">>;
    }) => {
      const response = await fetch(`/api/programs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update program");
      }

      return response.json() as Promise<WorkoutProgram>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update program");
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/programs/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete program");
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      toast.success("Program deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete program");
    },
  });
}
