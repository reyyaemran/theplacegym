"use client";

/**
 * Utility function to clear React Query cache
 * Can be called from browser console: window.clearQueryCache()
 */
export function clearQueryCache() {
  if (typeof window !== "undefined") {
    // Access the query client from the window object if available
    // This is a fallback - the proper way is through useQueryClient hook
    console.log("To clear React Query cache, please refresh the page (F5 or Cmd+R)");
    console.log("Or use the browser's Application tab to clear localStorage");
  }
}

// Make it available globally for debugging
if (typeof window !== "undefined") {
  (window as any).clearQueryCache = clearQueryCache;
}

