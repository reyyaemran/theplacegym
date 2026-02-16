"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * React Query configuration optimized for multi-user appointment management
 * 
 * Performance settings:
 * - staleTime: 30 seconds - Data is considered fresh for 30s (reduces unnecessary fetches)
 * - gcTime: 5 minutes - Keep unused data in cache for 5 minutes (instant back navigation)
 * - refetchOnWindowFocus: true - Sync data when user returns to tab
 * - refetchInterval: false - No automatic polling (use real-time updates for live sync)
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is fresh for 30 seconds - reduces unnecessary API calls
            staleTime: 30 * 1000,
            // Keep unused data in cache for 5 minutes - instant navigation
            gcTime: 5 * 60 * 1000,
            // Refetch when window regains focus (catches changes from other users)
            refetchOnWindowFocus: true,
            // Don't refetch on every mount if data is fresh
            refetchOnMount: "always",
            // Retry failed requests once
            retry: 1,
            // Show stale data while fetching fresh data
            placeholderData: (previousData: unknown) => previousData,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

