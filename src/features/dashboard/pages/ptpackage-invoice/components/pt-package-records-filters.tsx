"use client";

import { useState } from "react";
import { PTPackageRecordFilters } from "../types/pt-package-record";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface PTPackageRecordsFiltersProps {
  filters: PTPackageRecordFilters;
  onFiltersChange: (filters: Partial<PTPackageRecordFilters>) => void;
}

export function PTPackageRecordsFilters({
  filters,
  onFiltersChange,
}: PTPackageRecordsFiltersProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const hasSearchValue = filters.search.length > 0;

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
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
          placeholder="Search by member name, invoice..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ search: e.target.value })}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className={cn(
            "pl-9 transition-all duration-200 placeholder:text-xs",
            !isSearchFocused && !hasSearchValue && "pr-3"
          )}
        />
      </div>
    </div>
  );
}

