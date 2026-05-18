// External dependencies
import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

// Internal UI components
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

// Utilities
import { cn } from "@/lib/utils";

/**
 * Props interface for DatePicker component
 * @interface DatePickerProps
 * @property {Date} [date] - Currently selected date
 * @property {(date?: Date) => void} setDate - Callback function to update selected date
 * @property {Date} [fromDate] - Optional minimum selectable date
 */
interface DatePickerProps {
  date?: Date;
  setDate: (date?: Date) => void;
  fromDate?: Date;
  id?: string;
  name?: string;
}

/**
 * DatePicker Component
 * A customizable date picker component with popover calendar
 *
 * @component
 * @example
 * ```tsx
 * <DatePicker
 *   date={selectedDate}
 *   setDate={handleDateChange}
 *   fromDate={new Date()}
 * />
 * ```
 */
export function DatePicker({
  date,
  setDate,
  fromDate,
  id,
  name,
}: DatePickerProps) {
  const isMobile = useIsMobile();
  const dateFormat = isMobile ? "MMM d, y" : "PPP";
  const formattedDate = date ? format(date, dateFormat) : undefined;

  const [open, setOpen] = useState(false);  
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          name={name}
          variant="outline"
          className={cn(
            "rounded-full h-10 px-4 justify-start text-left font-normal w-full sm:w-auto sm:min-w-0 max-w-full",
            !date && "text-muted-foreground",
          )}
          aria-label="Choose date"
          aria-expanded="false"
          aria-haspopup="dialog"
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
          {formattedDate ? (
            <span className="truncate min-w-0" aria-live="polite">{formattedDate}</span>
          ) : (
            <span className="text-muted-foreground truncate">Pick a date</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 max-w-[calc(100vw-2rem)]"
        role="dialog"
        aria-label="Calendar date picker"
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => {
            setDate(date);
            setOpen(false);
          }}
          initialFocus
          fromDate={fromDate}
          aria-label="Select date"
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  );
}

// Default export for cleaner imports
export default DatePicker;
