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
import { CalendarIcon, Loader2, CalendarPlus, CalendarClock, CreditCard } from "lucide-react";
import { format, addMonths, addDays, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { CaptionProps, useNavigation } from "react-day-picker";
import { Member } from "../types/member";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { mockMembershipRecords } from "@/features/dashboard/pages/membership-invoice/data/mock-membership-records";
import { useMembershipRecords } from "@/hooks/use-membership-records";

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

type ExtensionFormValues = z.infer<typeof extensionSchema>;
type ChangeStartDateFormValues = z.infer<typeof changeStartDateSchema>;

interface ManageMembershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  membershipRecord?: MembershipRecord;
  onSuccess?: () => void;
}

const getMembershipTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    day_pass: "Day Pass",
    "1_month": "1 Month",
    "3_month": "3 Months",
    "6_month": "6 Months",
    "1_year": "1 Year",
  };
  return labels[type] || type;
};

const getMembershipDurationMonths = (type: string) => {
  switch (type) {
    case "day_pass":
      return 0;
    case "1_month":
      return 1;
    case "3_month":
      return 3;
    case "6_month":
      return 6;
    case "1_year":
      return 12;
    default:
      return 0;
  }
};

export function ManageMembershipDialog({
  open,
  onOpenChange,
  member,
  membershipRecord,
  onSuccess,
}: ManageMembershipDialogProps) {
  const [activeTab, setActiveTab] = useState<"extension" | "change-start-date">("extension");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMembership, setActiveMembership] = useState<MembershipRecord | null>(null);
  const { data: allMembershipRecords = [] } = useMembershipRecords();

  // Find active membership record
  useEffect(() => {
    if (open && member) {
      // If a specific record is provided, use it
      if (membershipRecord) {
        setActiveMembership(membershipRecord);
        return;
      }
      
      // Otherwise, find the active membership from real data
      const membership = allMembershipRecords.find(
        (record) =>
          (record.memberId === member.memberNumber || record.memberName === member.fullName) &&
          new Date(record.expiryDate) >= new Date()
      );
      setActiveMembership(membership || null);
    }
  }, [open, member, membershipRecord, allMembershipRecords]);

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

  // Initialize extension form with current expiry date
  useEffect(() => {
    if (activeTab === "extension" && activeMembership) {
      const currentExpiry = new Date(activeMembership.expiryDate);
      extensionForm.reset({
        extensionDays: 0,
        newExpiryDate: currentExpiry,
        reason: "",
      });
    }
  }, [activeTab, activeMembership, extensionForm]);

  // Initialize change start date form
  useEffect(() => {
    if (activeTab === "change-start-date" && activeMembership) {
      const currentStart = new Date(activeMembership.startDate);
      changeStartDateForm.reset({
        newStartDate: currentStart,
        reason: "",
      });
    }
  }, [activeTab, activeMembership, changeStartDateForm]);

  const handleExtensionDaysChange = (days: number) => {
    if (activeMembership) {
      const currentExpiry = new Date(activeMembership.expiryDate);
      const newExpiry = addDays(currentExpiry, days);
      extensionForm.setValue("extensionDays", days);
      extensionForm.setValue("newExpiryDate", newExpiry);
    }
  };

  const handleNewExpiryDateChange = (date: Date | undefined) => {
    if (date && activeMembership) {
      const currentExpiry = new Date(activeMembership.expiryDate);
      const days = differenceInDays(date, currentExpiry);
      extensionForm.setValue("newExpiryDate", date);
      extensionForm.setValue("extensionDays", days);
    }
  };

  const onExtensionSubmit = async (data: ExtensionFormValues) => {
    try {
      setIsSubmitting(true);
      // TODO: API call to extend membership
      toast.success(`Membership extended by ${data.extensionDays} days`);
      onSuccess?.();
      onOpenChange(false);
      extensionForm.reset();
    } catch (error) {
      toast.error("Failed to extend membership");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onChangeStartDateSubmit = async (data: ChangeStartDateFormValues) => {
    try {
      setIsSubmitting(true);
      // TODO: API call to change start date
      toast.success("Membership start date updated successfully");
      onSuccess?.();
      onOpenChange(false);
      changeStartDateForm.reset();
    } catch (error) {
      toast.error("Failed to change start date");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeMembership) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>No Active Membership</DialogTitle>
            <DialogDescription>
              This member does not have an active membership to manage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const currentExpiry = new Date(activeMembership.expiryDate);
  const currentStart = new Date(activeMembership.startDate);
  const daysUntilExpiry = differenceInDays(currentExpiry, new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Manage Membership
          </DialogTitle>
          <DialogDescription>
            Manage membership for <strong>{member.fullName}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Current Membership Info */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Membership</span>
            <Badge variant="outline" className="font-black italic" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {getMembershipTypeLabel(activeMembership.membershipType)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Start Date:</span>
              <p className="font-mono font-medium">{format(currentStart, "MMM dd, yyyy")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Expiry Date:</span>
              <p className="font-mono font-medium">{format(currentExpiry, "MMM dd, yyyy")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Days Remaining:</span>
              <p className="font-mono font-medium text-emerald-600">
                {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : "Expired"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Invoice:</span>
              <p className="font-mono text-xs">{activeMembership.invoiceNumber}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="extension" className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              Extension
            </TabsTrigger>
            <TabsTrigger value="change-start-date" className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Change Start Date
            </TabsTrigger>
          </TabsList>

          <TabsContent value="extension" className="space-y-4 mt-4">
            <Form {...extensionForm}>
              <form onSubmit={extensionForm.handleSubmit(onExtensionSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                          Extend membership by number of days
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
                          <PopoverContent className="w-auto p-0" align="start">
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
                        <Input placeholder="Reason for extension..." {...field} />
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
                        Extend Membership
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
                        <PopoverContent className="w-auto p-0" align="start">
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
                        <Input placeholder="Reason for changing start date..." {...field} />
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

