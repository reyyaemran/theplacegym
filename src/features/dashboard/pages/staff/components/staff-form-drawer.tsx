"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateStaff, useUpdateStaff } from "@/hooks/use-staff";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Staff, StaffDepartment, StaffLevel, StaffShift } from "@/types/staff";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, FileText, Activity, Briefcase, Upload, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CaptionProps, useNavigation } from "react-day-picker";

// Custom Caption Component - Only shows month and year dropdowns without labels
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
          <option key={index} value={index}>
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

const staffSchema = z.object({
  // Information
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  staffID: z.string().optional(),
  dateOfBirth: z.date().optional(),
  address: z.string().optional(),
  emergencyPhoneName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  avatar: z.string().optional(),
  
  // Work Details
  department: z.enum(["PT", "PTS", "CC", "CCS", "FC", "FCS", "CM", "ASM"]),
  level: z.enum(["Master", "Senior", "Junior"]).optional(),
  dayOff: z.string().optional(),
  monthlySaleTarget: z.number().min(0, "Sale target must be 0 or greater").optional(),
  monthlyConductTarget: z.number().min(0, "Conduct target must be 0 or greater").optional(),
  commissionPercentage: z.number().min(0).max(100, "Commission must be between 0 and 100").optional(),
  shift: z.enum(["AM", "MID", "NOON"]).optional(),
  hireDate: z.string().min(1, "Hire date is required"),

  // Leave Balances (Entitlements)
  annualLeaveBalance: z.number().min(0).optional(),
  sickLeaveBalance: z.number().min(0).optional(),
  publicHolidayBalance: z.number().min(0).optional(),
  // Usage is now managed via roster, not manually editable here
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
  onSave: (data: Omit<Staff, "_id" | "createdAt" | "updatedAt">) => void;
}

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SHIFT_OPTIONS: { value: StaffShift; label: string; time: string }[] = [
  { value: "AM", label: "AM", time: "5:30 AM - 2:00 PM" },
  { value: "MID", label: "MID", time: "10:00 AM - 7:00 PM" },
  { value: "NOON", label: "NOON", time: "12:30 PM - 9:30 PM" },
];

export function StaffFormDrawer({
  open,
  onOpenChange,
  staff,
  onSave,
}: StaffFormDrawerProps) {
  const [activeTab, setActiveTab] = useState("information");
  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const isSubmitting = createStaffMutation.isPending || updateStaffMutation.isPending;

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      staffID: "",
      dateOfBirth: undefined,
      address: "",
      emergencyPhoneName: "",
      emergencyPhone: "",
      avatar: "",
      department: "PT",
      level: undefined,
      dayOff: undefined,
      monthlySaleTarget: undefined,
      monthlyConductTarget: undefined,
        commissionPercentage: undefined,
        shift: undefined,
        hireDate: new Date().toISOString().split("T")[0],
      annualLeaveBalance: undefined,
      sickLeaveBalance: undefined,
      publicHolidayBalance: undefined,
    },
  });

  const department = form.watch("department");
  const isPTDepartment = department === "PT" || department === "PTS";

  useEffect(() => {
    if (staff) {
      form.reset({
        name: staff.name,
        email: staff.email || "",
        phone: staff.phone || "",
        staffID: staff.staffID || "",
        dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth) : undefined,
        address: staff.address || "",
        emergencyPhoneName: staff.emergencyPhoneName || "",
        emergencyPhone: staff.emergencyPhone || "",
        avatar: staff.avatar || "",
        department: staff.department,
        level: staff.level,
        dayOff: staff.dayOff,
        monthlySaleTarget: staff.monthlySaleTarget,
        monthlyConductTarget: staff.monthlyConductTarget,
        commissionPercentage: staff.commissionPercentage,
        shift: staff.shift,
        hireDate: staff.hireDate
          ? new Date(staff.hireDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        annualLeaveBalance: staff.annualLeaveBalance,
        sickLeaveBalance: staff.sickLeaveBalance,
        publicHolidayBalance: staff.publicHolidayBalance,
      });
      // Allow activity log tab when editing
      if (activeTab === "activity-log" || !activeTab) {
        // Keep current tab or default to information
      }
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        staffID: "",
        dateOfBirth: undefined,
        address: "",
        emergencyPhoneName: "",
        emergencyPhone: "",
        avatar: "",
        department: "PT",
        level: undefined,
        dayOff: undefined,
        monthlySaleTarget: undefined,
        monthlyConductTarget: undefined,
        commissionPercentage: undefined,
        shift: undefined,
        hireDate: new Date().toISOString().split("T")[0],
        annualLeaveBalance: undefined,
        sickLeaveBalance: undefined,
        publicHolidayBalance: undefined,
      });
      // Reset to information tab for new staff
      setActiveTab("information");
    }
  }, [staff, form, open]);

  const onSubmit = async (data: StaffFormValues) => {
    try {
      const staffData: Omit<Staff, "_id" | "createdAt" | "updatedAt"> = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        staffID: data.staffID || undefined,
        dateOfBirth: data.dateOfBirth ? (typeof data.dateOfBirth === 'string' ? new Date(data.dateOfBirth) : data.dateOfBirth) : undefined,
        address: data.address || undefined,
        emergencyPhoneName: data.emergencyPhoneName || undefined,
        emergencyPhone: data.emergencyPhone || undefined,
        avatar: data.avatar || undefined,
        department: data.department,
        level: data.level,
        dayOff: data.dayOff,
        monthlySaleTarget: data.monthlySaleTarget,
        monthlyConductTarget: data.monthlyConductTarget,
        commissionPercentage: data.commissionPercentage,
        shift: data.shift,
        hireDate: data.hireDate ? (typeof data.hireDate === 'string' ? new Date(data.hireDate) : data.hireDate) : new Date(),
        status: staff?.status || "AVAILABLE",
        annualLeaveBalance: data.annualLeaveBalance,
        sickLeaveBalance: data.sickLeaveBalance,
        publicHolidayBalance: data.publicHolidayBalance,
        // Preserve existing usage data
        annualLeaveUsed: staff?.annualLeaveUsed ?? 0,
        sickLeaveUsed: staff?.sickLeaveUsed ?? 0,
        unpaidLeaveUsed: staff?.unpaidLeaveUsed ?? 0,
        publicHolidayUsed: staff?.publicHolidayUsed ?? 0,
      };

      if (staff?._id) {
        // Update existing staff
        await updateStaffMutation.mutateAsync({
          id: staff._id,
          data: staffData,
        });
      } else {
        // Create new staff
        await createStaffMutation.mutateAsync(staffData);
      }

      // Success toast is handled by the mutation hooks
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error toast is handled by the mutation hooks
      // Error toast is handled by the mutation hooks
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("avatar", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl rounded-l-2xl p-0">
        <SheetHeader className="border-b pb-4 px-6 pt-6">
          <SheetTitle className="text-lg font-semibold">
            {staff ? "Edit Staff Member" : "Add Staff Member"}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col px-6">
              <TabsList className="grid w-full mt-4 grid-cols-2">
                <TabsTrigger value="information" className="text-xs">
                  <User className="h-3 w-3 mr-1.5" />
                  Information
                </TabsTrigger>
                <TabsTrigger value="work-details" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1.5" />
                  Work Details
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4 pr-2">
                <TabsContent value="information" className="mt-0">
                  {/* Avatar */}
                  <div className="flex flex-col items-center mb-6">
                    <FormField
                      control={form.control}
                      name="avatar"
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative">
                            <Avatar className="h-20 w-20">
                              <AvatarImage src={field.value} alt={form.watch("name") || "Staff"} />
                              <AvatarFallback className="text-lg">
                                {form.watch("name") ? getInitials(form.watch("name")) : "ST"}
                              </AvatarFallback>
                            </Avatar>
                            <label
                              htmlFor="avatar-upload"
                              className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer hover:bg-primary/90 transition-colors"
                            >
                              <Camera className="h-3 w-3" />
                              <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                              />
                            </label>
                          </div>
                          <FormControl>
                            <Input type="hidden" {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Phone and Email in 2 columns */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} className="h-8 text-xs" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Staff ID and Date of Birth in 2 columns */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="staffID"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Staff ID</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="e.g. 3386" 
                                className="h-8 text-xs font-mono placeholder:text-xs" 
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                onChange={(e) => {
                                  // Only allow numeric input
                                  const value = e.target.value.replace(/[^0-9]/g, '');
                                  field.onChange(value);
                                }}
                                onBlur={(e) => {
                                  // Pad to 6 digits on blur if value exists
                                  const value = e.target.value.trim();
                                  if (value && /^\d+$/.test(value)) {
                                    const padded = value.padStart(6, "0");
                                    if (padded.length <= 6) {
                                      field.onChange(padded);
                                    }
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => {
                          const dateValue = field.value ? new Date(field.value) : undefined;
                          return (
                            <FormItem>
                              <FormLabel className="text-xs">Date of Birth</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full h-8 text-xs justify-start text-left font-normal",
                                        !dateValue && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-3 w-3" />
                                      {dateValue ? (
                                        format(dateValue, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={dateValue}
                                    onSelect={(date) => {
                                      field.onChange(date || undefined);
                                    }}
                                    className="rounded-md border shadow-sm"
                                    fromDate={new Date(1900, 0, 1)}
                                    toDate={new Date(new Date().getFullYear() + 10, 11, 31)}
                                    classNames={{
                                      nav: "hidden",
                                      nav_button_previous: "hidden",
                                      nav_button_next: "hidden",
                                      caption: "flex flex-row justify-center items-center gap-2 pb-3 pt-2",
                                    }}
                                    components={{
                                      Caption: CustomCaption,
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    {/* Address */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Address</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-8 text-xs placeholder:text-xs" placeholder="Enter address" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {/* Emergency Phone Number - 2 columns */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="emergencyPhoneName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Emergency Contact Name</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-xs placeholder:text-xs" placeholder="Name" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emergencyPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Emergency Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-8 text-xs placeholder:text-xs" placeholder="Phone" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="work-details" className="mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem className="col-span-2 w-full">
                          <FormLabel className="text-xs">Department</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Select" className="text-xs" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="PT">Personal Trainer</SelectItem>
                              <SelectItem value="PTS">PT Supervisor</SelectItem>
                              <SelectItem value="CC">Customer Care</SelectItem>
                              <SelectItem value="CCS">CC Supervisor</SelectItem>
                              <SelectItem value="FC">Fitness Consultant</SelectItem>
                              <SelectItem value="FCS">FC Supervisor</SelectItem>
                              <SelectItem value="CM">Club Manager</SelectItem>
                              <SelectItem value="ASM">Assistant Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    {isPTDepartment && (
                      <FormField
                        control={form.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-xs">Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs w-full">
                                  <SelectValue placeholder="Select" className="text-xs" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Master">Master</SelectItem>
                                <SelectItem value="Senior">Senior</SelectItem>
                                <SelectItem value="Junior">Junior</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="dayOff"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-xs">Day Off</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Select" className="text-xs" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day} value={day}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shift"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel className="text-xs">Shift</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs w-full">
                                <SelectValue placeholder="Select" className="text-xs" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SHIFT_OPTIONS.map((shift) => (
                                <SelectItem key={shift.value} value={shift.value}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{shift.label}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">{shift.time}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hireDate"
                      render={({ field }) => {
                        const dateValue = field.value ? new Date(field.value) : undefined;
                        return (
                          <FormItem className="w-full">
                            <FormLabel className="text-xs">Hire Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full h-8 text-xs justify-start text-left font-normal",
                                      !dateValue && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {dateValue ? (
                                      format(dateValue, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={dateValue}
                                  onSelect={(date) => {
                                    field.onChange(date ? date.toISOString().split("T")[0] : "");
                                  }}
                                  className="rounded-md border shadow-sm"
                                  fromDate={new Date(1900, 0, 1)}
                                  toDate={new Date(new Date().getFullYear() + 10, 11, 31)}
                                  classNames={{
                                    nav: "hidden",
                                    nav_button_previous: "hidden",
                                    nav_button_next: "hidden",
                                    caption: "flex flex-row justify-center items-center gap-2 pb-3 pt-2",
                                  }}
                                  components={{
                                    Caption: CustomCaption,
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        );
                      }}
                    />

                    {(isPTDepartment || department === "FC" || department === "FCS") && (
                      <FormField
                        control={form.control}
                        name="monthlySaleTarget"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-xs">Sale Target (Monthly)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                className="h-8 text-xs w-full"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}

                    {isPTDepartment && (
                      <FormField
                        control={form.control}
                        name="monthlyConductTarget"
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="text-xs">Conduct Target (Monthly)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                className="h-8 text-xs w-full"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}

                    {isPTDepartment && (
                      <FormField
                        control={form.control}
                        name="commissionPercentage"
                        render={({ field }) => (
                          <FormItem className="col-span-2 w-full">
                            <FormLabel className="text-xs">Commission Percentage (%)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                className="h-8 text-xs w-full"
                                placeholder="e.g., 50"
                              />
                            </FormControl>
                            <p className="text-[10px] text-muted-foreground">
                              Commission is calculated from PT package per session price. 
                              Example: $10/session × 50% = $5 commission per completed appointment.
                            </p>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Leave Balances Section */}
                    <div className="col-span-2 space-y-3 mt-2">
                      <h3 className="text-xs font-semibold text-muted-foreground border-b pb-1">Leave Entitlements (Annual)</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <FormField
                          control={form.control}
                          name="annualLeaveBalance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Annual Leave</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  className="h-8 text-xs placeholder:text-xs"
                                  placeholder="Enter days"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="sickLeaveBalance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Sick Leave</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  className="h-8 text-xs placeholder:text-xs"
                                  placeholder="Enter days"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="publicHolidayBalance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Public Holiday</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  className="h-8 text-xs placeholder:text-xs"
                                  placeholder="Enter days"
                                />
                              </FormControl>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Note: Leave usage is tracked automatically based on the roster.
                      </p>
                    </div>
                  </div>
                </TabsContent>

              </ScrollArea>
            </Tabs>

            <SheetFooter className="border-t pt-4 mt-4 px-6 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8"
              >
                Cancel
              </Button>
              <Button type="submit" className="text-xs h-8" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {staff ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  `${staff ? "Update" : "Create"} Staff Member`
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
