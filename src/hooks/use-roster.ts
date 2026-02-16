"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RosterRecord } from "@/types/roster";
import { toast } from "sonner";

export function useRoster(month: number, year: number, staffId?: string) {
  return useQuery({
    queryKey: ["roster", year, month, staffId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("month", month.toString());
      params.append("year", year.toString());
      if (staffId) params.append("staffId", staffId);

      const response = await fetch(`/api/roster?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch roster");
      }
      return response.json() as Promise<RosterRecord[]>;
    },
  });
}

/**
 * Fetches roster records for a staff member from Jan 1 of the given year to the endDate.
 * Used for calculating YTD working days, leave usage, and leave balance.
 */
export function useStaffYearRoster(staffId: string | undefined, year: number, endDate?: string) {
  return useQuery({
    queryKey: ["roster", "ytd", staffId, year, endDate],
    queryFn: async () => {
      if (!staffId) return [];
      const startDate = `${year}-01-01`;
      const end = endDate || new Date().toISOString().split("T")[0]; // Default to today

      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", end);
      params.append("staffId", staffId);

      const response = await fetch(`/api/roster?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch staff year roster");
      }
      return response.json() as Promise<RosterRecord[]>;
    },
    enabled: !!staffId,
  });
}

export function useUpdateRoster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<RosterRecord>) => {
      const response = await fetch("/api/roster", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update roster");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate roster queries
      // We could be more specific if we parsed the date from variables
      queryClient.invalidateQueries({ queryKey: ["roster"] });
      
      // Note: We don't show toast here to avoid spamming during rapid edits
      // unless it's an error
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update roster");
    },
  });
}

