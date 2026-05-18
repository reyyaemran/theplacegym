"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Staff } from "@/types/staff";

type OnlineStaffMember = Pick<Staff, "_id" | "name" | "department" | "avatar" | "email" | "lastActive">;

export function useOnlineStaff() {
  return useQuery({
    queryKey: ["staff", "online"],
    queryFn: async () => {
      const response = await fetch("/api/staff/online");
      if (!response.ok) throw new Error("Failed to fetch online staff");
      return response.json() as Promise<OnlineStaffMember[]>;
    },
    refetchInterval: 30_000, // Refetch every 30 seconds
    staleTime: 20_000,
  });
}

/**
 * Sends a heartbeat every 2 minutes to keep the current user's
 * online status active. Also fires on mount.
 */
export function useHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const beat = () => {
      fetch("/api/staff/heartbeat", { method: "POST" }).catch(() => {
        // Silently ignore heartbeat failures
      });
    };

    // Fire immediately on mount
    beat();

    // Then every 2 minutes
    intervalRef.current = setInterval(beat, 2 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
