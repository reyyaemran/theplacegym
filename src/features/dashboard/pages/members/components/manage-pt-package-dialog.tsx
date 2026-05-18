"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, CalendarPlus, CalendarClock, Scissors, RotateCcw, Dumbbell } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { CaptionProps, useNavigation } from "react-day-picker";
import { Member } from "../types/member";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { mockPTPackageRecords } from "@/features/dashboard/pages/ptpackage-invoice/data/mock-pt-package-records";
import { mockAppointments } from "@/lib/mock-data";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useAppointments } from "@/hooks/use-appointments";

// Custom Caption Component
function CustomCaption(props: CaptionProps) {
  const { goToMonth } = useNavigation();
  const { displayMonth } = props;

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = displayMonth.getFullYear();
  const currentMonth = displayMonth.getMonth();
  const startYear = 1900;
  const endYear = new Date().getFullYear() + 10;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    goToMonth(new Date(currentYear, newMonth, 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    goToMonth(new Date(newYear, currentMonth, 1));
  };

  return (
    <div className="flex flex-row justify-center items-center gap-2 pb-3 pt-2">
      <select
        value={currentMonth}
        onChange={handleMonthChange}
        className="text-xs h-7 px-2 rounded-md border bg-background cursor-pointer"
        aria-label="Select month"
      >
        {months.map((month, index) => (
          <option key={month} value={index}>
            {month}
          </option>
        ))}
      </select>
      <select
        value={currentYear}
        onChange={handleYearChange}
        className="text-xs h-7 px-2 rounded-md border bg-background cursor-pointer"
        aria-label="Select year"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

const extensionSchema = z.object({
  extensionDays: z.number().min(1, "Extension days must be at least 1"),
  newExpiryDate: z.date({
    required_error: "New expiry date is required",
  }),
  reason: z.string().optional(),
});

const changeStartDateSchema = z.object({
  newStartDate: z.date({
    required_error: "New start date is required",
  }),
  reason: z.string().optional(),
});

const cutSessionsSchema = z.object({
  sessionsToCut: z.number().min(1, "Must cut at least 1 session"),
  reason: z.string().optional(),
});

const undoSessionsSchema = z.object({
  sessionsToUndo: z.number().min(1, "Must undo at least 1 session"),
  reason: z.string().optional(),
});

type ExtensionFormValues = z.infer<typeof extensionSchema>;
type ChangeStartDateFormValues = z.infer<typeof changeStartDateSchema>;
type CutSessionsFormValues = z.infer<typeof cutSessionsSchema>;
type UndoSessionsFormValues = z.infer<typeof undoSessionsSchema>;

interface ManagePTPackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  ptPackageRecord?: PTPackageRecord;
  onSuccess?: () => void;
}

export function ManagePTPackageDialog({
  open,
  onOpenChange,
  member,
  ptPackageRecord,
  onSuccess,
}: ManagePTPackageDialogProps) {
  const [activeTab, setActiveTab] = useState<"extension" | "change-start-date" | "cut-sessions" | "undo-sessions">("extension");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePackage, setActivePackage] = useState<PTPackageRecord | null>(null);
  const [usedSessions, setUsedSessions] = useState(0);
  const { data: allPTPackageRecords = [] } = usePTPackageRecords();
  const { data: allAppointments = [] } = useAppointments();

  // Find active PT package record
  useEffect(() => {
    if (open && member) {
      // If a specific record is provided, use it
      if (ptPackageRecord) {
        setActivePackage(ptPackageRecord);
        
        // Calculate used sessions from appointments
        const completedAppointments = allAppointments.filter(
          (apt) =>
            apt.ptPackageRecordId === ptPackageRecord.id &&
            apt.status === "COMPLETED"
        );
        setUsedSessions(completedAppointments.length);
        return;
      }
      
      // Otherwise, find the active PT package from real data
      const ptPackage = allPTPackageRecords.find(
        (record) =>
          (record.memberId === member.memberNumber || record.memberName === member.fullName) &&
          new Date(record.expiryDate) >= new Date()
      );
      setActivePackage(ptPackage || null);

      // Calculate used sessions from appointments
      if (ptPackage) {
        const completedAppointments = allAppointments.filter(
          (apt) =>
            apt.ptPackageRecordId === ptPackage.id &&
            apt.status === "COMPLETED"
        );
        setUsedSessions(completedAppointments.length);
      }
    }
  }, [open, member, ptPackageRecord, allPTPackageRecords, allAppointments]);

  const extensionForm = useForm<ExtensionFormValues>({
    resolver: zodResolver(extensionSchema),
    defaultValues: {
      extensionDays: 0,
      newExpiryDate: undefined,
      reason: "",
    },
  });

  const changeStartDateForm = useForm<ChangeStartDateFormValues>({
    resolver: zodResolver(changeStartDateSchema),
    defaultValues: {
      newStartDate: undefined,
      reason: "",
    },
  });

  const cutSessionsForm = useForm<CutSessionsFormValues>({
    resolver: zodResolver(cutSessionsSchema),
    defaultValues: {
      sessionsToCut: 0,
      reason: "",
    },
  });

  const undoSessionsForm = useForm<UndoSessionsFormValues>({
    resolver: zodResolver(undoSessionsSchema),
    defaultValues: {
      sessionsToUndo: 0,
      reason: "",
    },
  });

  // Initialize extension form
  useEffect(() => {
    if (activeTab === "extension" && activePackage) {
      const currentExpiry = new Date(activePackage.expiryDate);
      extensionForm.reset({
        extensionDays: 0,
        newExpiryDate: currentExpiry,
        reason: "",
      });
    }
  }, [activeTab, activePackage, extensionForm]);

  // Initialize change start date form
  useEffect(() => {
    if (activeTab === "change-start-date" && activePackage) {
      const currentStart = new Date(activePackage.startDate);
      changeStartDateForm.reset({
        newStartDate: currentStart,
        reason: "",
      });
    }
  }, [activeTab, activePackage, changeStartDateForm]);

  // Initialize cut sessions form
  useEffect(() => {
    if (activeTab === "cut-sessions" && activePackage) {
      const remaining = activePackage.ptPackageSessions - usedSessions;
      cutSessionsForm.reset({
        sessionsToCut: 0,
        reason: "",
      });
    }
  }, [activeTab, activePackage, usedSessions, cutSessionsForm]);

  // Initialize undo sessions form
  useEffect(() => {
    if (activeTab === "undo-sessions" && activePackage) {
      undoSessionsForm.reset({
        sessionsToUndo: 0,
        reason: "",
      });
    }
  }, [activeTab, activePackage, undoSessionsForm]);

  const handleExtensionDaysChange = (days: number) => {
    if (activePackage) {
      const currentExpiry = new Date(activePackage.expiryDate);
      const newExpiry = addDays(currentExpiry, days);
      extensionForm.setValue("extensionDays", days);
      extensionForm.setValue("newExpiryDate", newExpiry);
    }
  };

  const handleNewExpiryDateChange = (date: Date | undefined) => {
    if (date && activePackage) {
      const currentExpiry = new Date(activePackage.expiryDate);
      const days = differenceInDays(date, currentExpiry);
      extensionForm.setValue("newExpiryDate", date);
      extensionForm.setValue("extensionDays", days);
    }
  };

  const onExtensionSubmit = async (data: ExtensionFormValues) => {
    try {
      setIsSubmitting(true);
      // TODO: API call to extend PT package
      toast.success(`PT Package extended by ${data.extensionDays} days`);
      onSuccess?.();
      onOpenChange(false);
      extensionForm.reset();
    } catch (error) {
      toast.error("Failed to extend PT package");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangeStartDateSubmit = async (data: ChangeStartDateFormValues) => {
    try {
      setIsSubmitting(true);
      // TODO: API call to change start date
      toast.success("PT Package start date updated successfully");
      onSuccess?.();
      onOpenChange(false);
      changeStartDateForm.reset();
    } catch (error) {
      toast.error("Failed to change start date");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCutSessionsSubmit = async (data: CutSessionsFormValues) => {
    try {
      setIsSubmitting(true);
      const remaining = activePackage ? activePackage.ptPackageSessions - usedSessions : 0;
      if (data.sessionsToCut > remaining) {
        toast.error(`Cannot cut more than ${remaining} remaining sessions`);
        return;
      }
      // TODO: API call to cut sessions
      toast.success(`${data.sessionsToCut} session(s) cut from package`);
      onSuccess?.();
      onOpenChange(false);
      cutSessionsForm.reset();
    } catch (error) {
      toast.error("Failed to cut sessions");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUndoSessionsSubmit = async (data: UndoSessionsFormValues) => {
    try {
      setIsSubmitting(true);
      if (data.sessionsToUndo > usedSessions) {
        toast.error(`Cannot undo more than ${usedSessions} used sessions`);
        return;
      }
      // TODO: API call to undo sessions
      toast.success(`${data.sessionsToUndo} session(s) undone`);
      onSuccess?.();
      onOpenChange(false);
      undoSessionsForm.reset();
    } catch (error) {
      toast.error("Failed to undo sessions");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activePackage) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>No Active PT Package</DialogTitle>
            <DialogDescription>
              This member does not have an active PT package to manage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const currentExpiry = new Date(activePackage.expiryDate);
  const currentStart = new Date(activePackage.startDate);
  const daysUntilExpiry = differenceInDays(currentExpiry, new Date());
  const remainingSessions = activePackage.ptPackageSessions - usedSessions;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Manage PT Package
          </DialogTitle>
          <DialogDescription>
            Manage PT package for <strong>{member.fullName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Current Package Info */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current PT Package</span>
            <Badge variant="outline" className="font-black font-montserrat">
              {activePackage.ptPackageName}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Start Date:</span>
              <p className="font-mono font-medium">{format(currentStart, "MMM dd, yyyy")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expiry Date:</span>
              <p className="font-mono font-medium">{format(currentExpiry, "MMM dd, yyyy")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Sessions:</span>
              <p className="font-mono font-medium">{activePackage.ptPackageSessions}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Used Sessions:</span>
              <p className="font-mono font-medium text-amber-600">{usedSessions}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining Sessions:</span>
              <p className="font-mono font-medium text-emerald-600">{remainingSessions}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Days Remaining:</span>
              <p className="font-mono font-medium">
                {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : "Expired"}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="extension" className="flex items-center gap-1 text-xs">
              <CalendarPlus className="h-3.5 w-3.5" />
              Extension
            </TabsTrigger>
            <TabsTrigger value="change-start-date" className="flex items-center gap-1 text-xs">
              <CalendarClock className="h-3.5 w-3.5" />
              Start Date
            </TabsTrigger>
            <TabsTrigger value="cut-sessions" className="flex items-center gap-1 text-xs">
              <Scissors className="h-3.5 w-3.5" />
              Cut Sessions
            </TabsTrigger>
            <TabsTrigger value="undo-sessions" className="flex items-center gap-1 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Undo Sessions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extension" className="space-y-4 mt-4">
            <Form {...extensionForm}>
              <form onSubmit={extensionForm.handleSubmit(onExtensionSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={extensionForm.control}
                    name="extensionDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Extension Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="0"
                            {...field}
                            onChange={(e) => {
                              const days = parseInt(e.target.value) || 0;
                              handleExtensionDaysChange(days);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Extend package by number of days
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={extensionForm.control}
                    name="newExpiryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>New Expiry Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => handleNewExpiryDateChange(date)}
                              initialFocus
                              disabled={(date) => date < currentExpiry}
                              components={{
                                Caption: CustomCaption,
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          New expiry date after extension
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={extensionForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Reason..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Extending...
                      </>
                    ) : (
                      <>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Extend Package
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="change-start-date" className="space-y-4 mt-4">
            <Form {...changeStartDateForm}>
              <form onSubmit={changeStartDateForm.handleSubmit(onChangeStartDateSubmit)} className="space-y-4">
                <FormField
                  control={changeStartDateForm.control}
                  name="newStartDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>New Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            components={{
                              Caption: CustomCaption,
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Current start date: {format(currentStart, "MMM dd, yyyy")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={changeStartDateForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Reason..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CalendarClock className="mr-2 h-4 w-4" />
                        Update Start Date
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="cut-sessions" className="space-y-4 mt-4">
            <Form {...cutSessionsForm}>
              <form onSubmit={cutSessionsForm.handleSubmit(onCutSessionsSubmit)} className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scissors className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900">Remaining Sessions</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-amber-700">{remainingSessions}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    You can cut up to {remainingSessions} session(s)
                  </p>
                </div>

                <FormField
                  control={cutSessionsForm.control}
                  name="sessionsToCut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sessions to Cut</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={remainingSessions}
                          placeholder="0"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of sessions to remove from remaining sessions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={cutSessionsForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Reason..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} variant="destructive">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cutting...
                      </>
                    ) : (
                      <>
                        <Scissors className="mr-2 h-4 w-4" />
                        Cut Sessions
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="undo-sessions" className="space-y-4 mt-4">
            <Form {...undoSessionsForm}>
              <form onSubmit={undoSessionsForm.handleSubmit(onUndoSessionsSubmit)} className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Used Sessions</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-blue-700">{usedSessions}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    You can undo up to {usedSessions} session(s)
                  </p>
                </div>

                <FormField
                  control={undoSessionsForm.control}
                  name="sessionsToUndo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sessions to Undo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max={usedSessions}
                          placeholder="0"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of completed sessions to undo (restore to remaining)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={undoSessionsForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Reason..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Undoing...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Undo Sessions
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

