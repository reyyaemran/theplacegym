"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { MembershipFilters } from "../types/membership";
import { cn } from "@/lib/utils";

interface MembershipsFiltersProps {
  filters: MembershipFilters;
  onFiltersChange: (filters: MembershipFilters) => void;
}

export function MembershipsFilters({
  filters,
  onFiltersChange,
}: MembershipsFiltersProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const hasSearchValue = filters.search.length > 0;

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value,
    });
  };


  return (
    <div
      className={cn(
        "relative transition-all duration-200 ease-in-out",
        isSearchFocused || hasSearchValue
          ? "w-full sm:w-80"
          : "w-20 sm:w-24"
      )}
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search memberships..."
        value={filters.search}
        onChange={(e) => handleSearchChange(e.target.value)}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
        className={cn(
          "pl-9 h-8 text-xs transition-all duration-200 placeholder:text-xs",
          !isSearchFocused && !hasSearchValue && "pr-3"
        )}
      />
    </div>
  );
}

