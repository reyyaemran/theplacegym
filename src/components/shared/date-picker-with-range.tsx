"use client";

// External dependencies
import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

// Internal UI components
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Props interface for DatePickerWithRange component
 * @interface DatePickerWithRangeProps
 * @property {DateRange | undefined} value - Currently selected date range
 * @property {(date: DateRange | undefined) => void} onChange - Callback function to update selected date range
 * @property {string} [className] - Optional CSS class name for additional styling
 */
interface DatePickerWithRangeProps {
  value: DateRange | undefined;
  onChange: (date: DateRange | undefined) => void;
  className?: string;
}

/**
 * DatePickerWithRange Component
 * A date range picker component with popover calendar allowing selection of start and end dates
 *
 * @component
 * @example
 * ```tsx
 * <DatePickerWithRange
 *   value={dateRange}
 *   onChange={handleDateRangeChange}
 *   className="my-date-picker"
 * />
 * ```
 */
export function DatePickerWithRange({
  value,
  onChange,
  className,
}: DatePickerWithRangeProps) {
  const isMobile = useIsMobile();
  const dateFormat = isMobile ? "MMM d" : "LLL dd, y";

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date-range-picker"
            variant={"outline"}
            className={cn(
              "rounded-full h-10 px-4 justify-start text-left font-normal w-full sm:w-auto sm:min-w-0 max-w-full",
              !value && "text-muted-foreground",
            )}
            aria-label="Choose date range"
            aria-haspopup="dialog"
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
            {value?.from ? (
              value.to ? (
                <span className="truncate min-w-0">
                  {format(value.from, dateFormat)} — {format(value.to, dateFormat)}
                </span>
              ) : (
                <span className="truncate">{format(value.from, dateFormat)}</span>
              )
            ) : (
              <span className="truncate">Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 max-w-[calc(100vw-2rem)]"
          align="start"
          role="dialog"
          aria-label="Calendar date range picker"
        >
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={isMobile ? 1 : 2}
            aria-label="Select date range"
            className="rounded-md border"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
