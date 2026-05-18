"use client";

import { useState } from "react";
import { MemberFilters } from "@/features/dashboard/pages/members/types/member";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MembersFiltersProps {
  filters: MemberFilters;
  onFiltersChange: (filters: Partial<MemberFilters>) => void;
}

export function MembersFilters({
  filters,
  onFiltersChange,
}: MembersFiltersProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const hasSearchValue = filters.search.length > 0;

  return (
    <div
      className={cn(
        "relative transition-all duration-200 ease-in-out",
        isSearchFocused || hasSearchValue
          ? "w-full lg:w-80"
          : "w-20 lg:w-24"
      )}
    >
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        placeholder="Search members..."
        value={filters.search}
        onChange={(e) => onFiltersChange({ search: e.target.value })}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
        className={cn(
          "pl-9 transition-all duration-200 placeholder:text-sm",
          !isSearchFocused && !hasSearchValue && "pr-3"
        )}
      />
    </div>
  );
} 