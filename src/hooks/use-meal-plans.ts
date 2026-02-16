"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MealPlan } from "@/features/dashboard/pages/meal-planner/types/meal-plan";
import { toast } from "sonner";

export function useMealPlans() {
  return useQuery({
    queryKey: ["meal-plans"],
    queryFn: async () => {
      const response = await fetch("/api/meal-plans");
      if (!response.ok) {
        throw new Error("Failed to fetch meal plans");
      }
      return response.json() as Promise<MealPlan[]>;
    },
  });
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MealPlan, "id">) => {
      const response = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create meal plan");
      }

      return response.json() as Promise<MealPlan>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Meal plan saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save meal plan");
    },
  });
}

export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<MealPlan, "id">>;
    }) => {
      const response = await fetch(`/api/meal-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update meal plan");
      }

      return response.json() as Promise<MealPlan>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Meal plan updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update meal plan");
    },
  });
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/meal-plans/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete meal plan");
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plans"] });
      toast.success("Meal plan deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete meal plan");
    },
  });
}
