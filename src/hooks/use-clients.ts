"use client";

import { useQuery } from "@tanstack/react-query";
import { Member } from "@/features/dashboard/pages/members/types/member";

/**
 * Fetch clients (members with PT package assignments).
 * - For trainers: returns only their assigned clients.
 * - For admins: returns all clients, optionally filtered by trainer name.
 * @param sessionStaffId - Include current user's staffId in cache key to avoid cross-account cache bleed when switching trainer accounts
 */
export function useClients(filters?: { search?: string; trainer?: string; sessionStaffId?: string }) {
  const { sessionStaffId, ...apiFilters } = filters ?? {};
  return useQuery({
    queryKey: ["clients", apiFilters, sessionStaffId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (apiFilters.search) params.append("search", apiFilters.search);
      if (apiFilters.trainer) params.append("trainer", apiFilters.trainer);

      const response = await fetch(`/api/clients?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      return response.json() as Promise<Member[]>;
    },
  });
}

/**
 * Fetch a single client by ID.
 * Verifies the member is assigned to the logged-in trainer.
 */
export function useClientById(id: string | undefined) {
  return useQuery({
    queryKey: ["clients", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/clients/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch client");
      }
      return response.json() as Promise<Member>;
    },
    enabled: !!id,
  });
}
