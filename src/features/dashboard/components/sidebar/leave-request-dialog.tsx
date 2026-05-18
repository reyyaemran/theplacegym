"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useCreateLeaveRequest } from "@/hooks/use-leave-requests";
import { useAuth } from "@/hooks/use-auth";
import { useStaffById } from "@/hooks/use-staff";
import { LEAVE_TYPE_LABELS, LeaveRequestType } from "@/types/leave-request";
import { CalendarDays, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function countDaysInRange(from: Date, to: Date): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

const LEAVE_BALANCE_DEFAULTS: Record<LeaveRequestType, number | null> = {
  AL: 18,
  SL: 30,
  PH: 11,
  UP: null,
};

export function LeaveRequestDialog({
  open,
  onOpenChange,
}: LeaveRequestDialogProps) {
  const today = new Date();
  const { staff: authStaff } = useAuth();
  const staffId = (authStaff as { staffId?: string; _id?: string } | null)?.staffId
    ?? (authStaff as { staffId?: string; _id?: string } | null)?._id
    ?? "";
  const { data: staff } = useStaffById(open ? staffId : undefined);

  const [leaveType, setLeaveType] = useState<LeaveRequestType>("AL");
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({ from: today, to: today });
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const createLeave = useCreateLeaveRequest();

  const startDate = dateRange?.from;
  const endDate = dateRange?.to ?? dateRange?.from;
  const startStr = startDate ? toLocalDateString(startDate) : "";
  const endStr = endDate ? toLocalDateString(endDate) : "";
  const reasonValid = reason.trim().length > 0;
  const reasonError = reasonTouched && !reasonValid;

  const leaveBalance = useMemo(() => {
    switch (leaveType) {
      case "AL":
        return Math.max(0, (staff?.annualLeaveBalance ?? LEAVE_BALANCE_DEFAULTS.AL ?? 0)
          - (staff?.annualLeaveUsed ?? 0));
      case "SL":
        return Math.max(0, (staff?.sickLeaveBalance ?? LEAVE_BALANCE_DEFAULTS.SL ?? 0)
          - (staff?.sickLeaveUsed ?? 0));
      case "PH":
        return Math.max(0, (staff?.publicHolidayBalance ?? LEAVE_BALANCE_DEFAULTS.PH ?? 0)
          - (staff?.publicHolidayUsed ?? 0));
      case "UP":
        return null;
    }
  }, [leaveType, staff]);

  const requestedDays = startDate && endDate ? countDaysInRange(startDate, endDate) : 0;
  const balanceExceeded = leaveBalance !== null && requestedDays > leaveBalance;
  const balanceError = balanceExceeded && requestedDays > 0;

  const handleSubmit = () => {
    setReasonTouched(true);
    if (!startStr || !endStr || !reasonValid) return;
    if (balanceExceeded) return;
    createLeave.mutate(
      { leaveType, startDate: startStr, endDate: endStr, reason: reason.trim() },
      {
        onSuccess: () => {
          setLeaveType("AL");
          setDateRange({ from: today, to: today });
          setReason("");
          setReasonTouched(false);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col sm:max-w-md gap-0 p-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="shrink-0 gap-1.5 px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" />
            Request Leave
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Submit a leave request for supervisor approval
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-type" className="text-xs font-medium">
                Leave Type
              </Label>
              <Select
                value={leaveType}
                onValueChange={(v) => setLeaveType(v as LeaveRequestType)}
              >
                <SelectTrigger id="leave-type" className="h-9 w-full min-w-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LEAVE_TYPE_LABELS) as LeaveRequestType[]).map(
                    (key) => (
                      <SelectItem key={key} value={key} className="text-xs">
                        {LEAVE_TYPE_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Leave Balance</Label>
              <div className="flex h-9 items-center">
                {leaveBalance !== null ? (
                  <span
                    className={cn(
                      "font-montserrat text-lg font-black tracking-tight",
                      balanceExceeded && "text-destructive"
                    )}
                  >
                    {leaveBalance}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Leave Dates</Label>
            <div className="flex justify-center overflow-x-auto max-w-full">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range: { from?: Date; to?: Date } | undefined) => setDateRange(range?.from ? { from: range.from, to: range.to } : { from: today, to: today })}
                disabled={(date: Date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                numberOfMonths={1}
                className={cn(
                  "rounded-md border bg-background p-3",
                  balanceError ? "border-destructive" : "border-border"
                )}
              />
            </div>
            {balanceError && (
              <p className="text-[10px] text-destructive">
                Selected {requestedDays} day{requestedDays !== 1 ? "s" : ""} exceeds your balance of {leaveBalance} day{leaveBalance !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="leave-reason" className="text-xs font-medium">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="leave-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setReasonTouched(true)}
              placeholder="e.g. Family event, medical..."
              className={cn(
                "min-h-[72px] text-xs resize-none",
                reasonError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {reasonError && (
              <p className="text-[10px] text-destructive">Reason is required</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 flex-row justify-center gap-2 px-6 py-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs min-w-0 w-full sm:min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!startStr || !endStr || !reasonValid || createLeave.isPending || balanceExceeded}
            className="text-xs min-w-0 w-full sm:min-w-[100px]"
          >
            {createLeave.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5 shrink-0" />
            ) : (
              <CalendarDays className="h-3 w-3 mr-1.5 shrink-0" />
            )}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
