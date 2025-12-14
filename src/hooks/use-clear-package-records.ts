"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useClearPackageRecords() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/package-records/clear", {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clear package records");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ["memberships"] });
      queryClient.invalidateQueries({ queryKey: ["pt-packages"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      
      // Refetch to get fresh data
      queryClient.refetchQueries({ queryKey: ["memberships"] });
      queryClient.refetchQueries({ queryKey: ["pt-packages"] });
      queryClient.refetchQueries({ queryKey: ["members"] });

      toast.success(
        `Cleared ${data.deletedCount.total} package records (${data.deletedCount.memberships} memberships, ${data.deletedCount.ptPackages} PT packages)`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to clear package records");
    },
  });
}

