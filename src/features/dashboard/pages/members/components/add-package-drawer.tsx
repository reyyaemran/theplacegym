"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Member } from "../types/member";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, addMonths, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { CaptionProps, useNavigation } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { useStaff } from "@/hooks/use-staff";
import { StaffDepartment } from "@/types/staff";
import { useMembershipTypes } from "@/hooks/use-membership-types";
import { usePTPackageTypes } from "@/hooks/use-pt-package-types";
import { useCreateMembershipRecord } from "@/hooks/use-membership-records";
import { useCreatePTPackageRecord } from "@/hooks/use-pt-package-records";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

const packageSchema = z.object({
  issuedBy: z.string().min(1, "Issued by is required"),
  assignedTo: z.string().optional(),
  // Membership fields
  membershipAssignedTo: z.string().optional(),
  membershipInvoiceNumber: z.string().optional(),
  membershipType: z.enum(["day_pass", "1_month", "3_month", "6_month", "1_year"]).optional(),
  membershipStartDate: z.date().optional(),
  membershipPaymentType: z.enum(["cash", "card", "bank_transfer", "online", "other"]).optional(),
  membershipPaymentDate: z.date().optional(),
  membershipPaymentRemark: z.string().optional(),
  // PT Package fields
  ptPackageInvoiceNumber: z.string().optional(),
  ptPackageType: z.string().optional(),
  ptPackageStartDate: z.date().optional(),
  ptPackagePaymentType: z.enum(["cash", "card", "bank_transfer", "online", "other"]).optional(),
  ptPackagePaymentDate: z.date().optional(),
  ptPackagePaymentRemark: z.string().optional(),
  // Payment fields (legacy - keeping for backward compatibility)
  paymentType: z.enum(["cash", "card", "bank_transfer", "online", "other"]).optional(),
  paymentDate: z.date().optional(),
  paymentRemark: z.string().optional(),
});

type PackageFormValues = z.infer<typeof packageSchema>;

interface AddPackageDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: Member;
  packageType: "membership" | "pt-package";
  onSuccess?: () => void;
  renderAsContent?: boolean; // If true, render only the form content without drawer wrapper
}


// Helper function to get department label
const getDepartmentLabel = (dept: StaffDepartment) => {
  const labels: Record<StaffDepartment, string> = {
    PT: "Personal Trainer",
    PTS: "PT Supervisor",
    CC: "Customer Care",
    CCS: "CC Supervisor",
    FC: "Fitness Consultant",
    FCS: "FC Supervisor",
    CM: "Club Manager",
    ASM: "Assistant Manager",
  };
  return labels[dept] || dept;
};

// Helper function to get staff by departments
const getStaffByDepartments = (staff: any[], departments: string[]) => {
  return staff.filter((s) => departments.includes(s.department));
};

export function AddPackageDrawer({
  open,
  onOpenChange,
  member,
  packageType,
  onSuccess,
  renderAsContent = false,
}: AddPackageDrawerProps) {
  const [issuedByOpen, setIssuedByOpen] = useState(false);
  const [assignedToOpen, setAssignedToOpen] = useState(false);
  const [membershipAssignedToOpen, setMembershipAssignedToOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch real data from API
  const { data: staffData = [] } = useStaff();
  const { data: membershipsData = [] } = useMembershipTypes();
  const { data: ptPackagesData = [] } = usePTPackageTypes();

  // Get Customer Care staff for "Issued By"
  const customerCareStaff = useMemo(() => {
    return getStaffByDepartments(staffData, ["CC", "CCS"]);
  }, [staffData]);

  // Get eligible staff for "Assigned To" (FC, PT, PTS only - no CC/CCS)
  const eligibleStaff = useMemo(() => {
    return getStaffByDepartments(staffData, ["FC", "FCS", "PT", "PTS"]);
  }, [staffData]);

  // Get eligible staff for Membership "Assigned To" (FC, FCS only)
  const membershipEligibleStaff = useMemo(() => {
    return getStaffByDepartments(staffData, ["FC", "FCS"]);
  }, [staffData]);

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      issuedBy: "",
      assignedTo: "",
      membershipAssignedTo: "",
      membershipInvoiceNumber: "",
      membershipType: undefined,
      membershipStartDate: undefined,
      membershipPaymentType: undefined,
      membershipPaymentDate: undefined,
      membershipPaymentRemark: "",
      ptPackageInvoiceNumber: "",
      ptPackageType: "",
      ptPackageStartDate: undefined,
      ptPackagePaymentType: undefined,
      ptPackagePaymentDate: undefined,
      ptPackagePaymentRemark: "",
      paymentType: undefined,
      paymentDate: undefined,
      paymentRemark: "",
    },
  });

  // Watch assignedTo to filter PT packages by trainer level (must be after form declaration)
  const assignedToValue = form.watch("assignedTo");
  
  // Get the assigned trainer's level
  const assignedTrainerLevel = useMemo(() => {
    if (!assignedToValue) return null;
    const trainer = staffData.find(s => s._id === assignedToValue);
    return trainer?.level || null;
  }, [assignedToValue, staffData]);

  // Sort PT packages and filter by assigned trainer's level (if trainer is assigned)
  const sortedPTPackages = useMemo(() => {
    let filtered = [...ptPackagesData].filter(pkg => pkg.isActive);
    
    // Filter by trainer level if a trainer is assigned
    if (assignedTrainerLevel) {
      filtered = filtered.filter(pkg => {
        // Check if description contains the trainer's level
        const description = pkg.description?.toLowerCase() || "";
        const levelLower = assignedTrainerLevel.toLowerCase();
        return description.includes(levelLower);
      });
    }
    
    // Sort by sessions count
    return filtered.sort((a, b) => a.sessions - b.sessions);
  }, [ptPackagesData, assignedTrainerLevel]);

  useEffect(() => {
    if (open) {
      form.reset({
        issuedBy: "",
        assignedTo: "",
        membershipAssignedTo: "",
        membershipInvoiceNumber: "",
        membershipType: undefined,
        membershipStartDate: undefined,
        membershipPaymentType: undefined,
        membershipPaymentDate: undefined,
        membershipPaymentRemark: "",
        ptPackageInvoiceNumber: "",
        ptPackageType: "",
        ptPackageStartDate: undefined,
        ptPackagePaymentType: undefined,
        ptPackagePaymentDate: undefined,
        ptPackagePaymentRemark: "",
        paymentType: undefined,
        paymentDate: undefined,
        paymentRemark: "",
      });
    }
  }, [open, packageType, form]);

  const queryClient = useQueryClient();
  const generateInvoiceNumber = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return randomNum.toString().padStart(4, "0");
  };

  const createMembershipRecordMutation = useCreateMembershipRecord();
  const createPTPackageRecordMutation = useCreatePTPackageRecord();

  const onSubmit = async (data: PackageFormValues) => {
    try {
      setIsSubmitting(true);

      const issuedByStaff = staffData.find(s => s._id === data.issuedBy);
      const assignedToStaff = data.assignedTo ? staffData.find(s => s._id === data.assignedTo) : null;

      if (packageType === "membership" && data.membershipType) {
        const selectedMembership = membershipsData.find(m => m.type === data.membershipType);
        if (!selectedMembership) {
          toast.error("Membership type not found");
          return;
        }

        const startDate = data.membershipStartDate || new Date();
        const expiryDate = addMonths(startDate, 
          data.membershipType === "day_pass" ? 0 :
          data.membershipType === "1_month" ? 1 :
          data.membershipType === "3_month" ? 3 :
          data.membershipType === "6_month" ? 6 : 12
        );
        const invoiceNumber = data.membershipInvoiceNumber || generateInvoiceNumber();
        const paymentDate = data.membershipPaymentDate || data.paymentDate || new Date();
        const membershipAssignedToStaff = data.membershipAssignedTo ? staffData.find(s => s._id === data.membershipAssignedTo) : null;

        await createMembershipRecordMutation.mutateAsync({
          memberId: member.memberNumber,
          memberName: member.fullName,
          membershipType: data.membershipType,
          invoiceNumber,
          startDate: startDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
          paymentType: data.membershipPaymentType || data.paymentType || "cash",
          paymentDate: paymentDate.toISOString(),
          amount: selectedMembership.price,
          paymentRemark: data.membershipPaymentRemark || data.paymentRemark || undefined,
          assignedStaffName: membershipAssignedToStaff?.name || undefined,
          issuedBy: issuedByStaff?.name || undefined,
        });

        toast.success("Membership added successfully");
      } else if (packageType === "pt-package" && data.ptPackageType) {
        const selectedPTPackage = ptPackagesData.find(pkg => pkg.id === data.ptPackageType);
        if (!selectedPTPackage) {
          toast.error("PT Package type not found");
          return;
        }

        const startDate = data.ptPackageStartDate || new Date();
        const validityDays = selectedPTPackage.validityDays || 30;
        const expiryDate = addDays(startDate, validityDays);
        const invoiceNumber = data.ptPackageInvoiceNumber || generateInvoiceNumber();
        const paymentDate = data.ptPackagePaymentDate || data.paymentDate || new Date();

        await createPTPackageRecordMutation.mutateAsync({
          memberId: member.memberNumber,
          memberName: member.fullName,
          ptPackageId: selectedPTPackage.id,
          ptPackageName: selectedPTPackage.name,
          ptPackageSessions: selectedPTPackage.sessions,
          invoiceNumber,
          startDate: startDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
          paymentType: data.ptPackagePaymentType || data.paymentType || "cash",
          paymentDate: paymentDate.toISOString(),
          amount: selectedPTPackage.price,
          paymentRemark: data.ptPackagePaymentRemark || data.paymentRemark || undefined,
          assignedStaffName: assignedToStaff?.name || undefined,
          issuedBy: issuedByStaff?.name || undefined,
        });

        toast.success("PT Package added successfully");
      }

      // Force refetch of all related queries to ensure UI updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["pt-packages"] }),
        queryClient.invalidateQueries({ queryKey: ["members"] }),
        queryClient.invalidateQueries({ queryKey: ["appointments"] }),
      ]);
      
      // Refetch queries to ensure data is up to date
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["memberships"] }),
        queryClient.refetchQueries({ queryKey: ["pt-packages"] }),
        queryClient.refetchQueries({ queryKey: ["members"] }),
        queryClient.refetchQueries({ queryKey: ["appointments"] }),
      ]);

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error is handled by the mutation hook
      toast.error(`Failed to add ${packageType === "membership" ? "membership" : "PT package"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isMembership = packageType === "membership";
  const isPTPackage = packageType === "pt-package";

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3 max-w-2xl mx-auto">
                {/* Issued By and Assigned To - 2x2 Layout */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="issuedBy"
                    render={({ field }) => {
                      const selectedStaff = field.value ? customerCareStaff.find((staff) => staff._id === field.value) : null;
                      return (
                        <FormItem className="flex flex-col">
                          <FormLabel>Issued By *</FormLabel>
                          <Popover open={issuedByOpen} onOpenChange={setIssuedByOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-start gap-2 h-9",
                                    !field.value && "text-muted-foreground/60"
                                  )}
                                >
                                  {selectedStaff ? (
                                    <>
                                      <Avatar className="h-5 w-5 shrink-0 border border-background">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                          {getInitials(selectedStaff.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs truncate flex-1 text-left">
                                        {selectedStaff.name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60">Select CC/CCS</span>
                                  )}
                                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search staff..." />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty>No staff found.</CommandEmpty>
                              <CommandGroup>
                                {customerCareStaff.map((staff) => (
                                  <CommandItem
                                    key={staff._id}
                                    value={`${staff.name} ${getDepartmentLabel(staff.department)}`}
                                    onSelect={() => {
                                      form.setValue("issuedBy", staff._id || "");
                                      setIssuedByOpen(false);
                                    }}
                                    className="flex items-center gap-3 pr-8 relative"
                                  >
                                    <Avatar className="h-8 w-8 shrink-0 border border-background">
                                      <AvatarImage src="" />
                                      <AvatarFallback className="text-xs font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                        {getInitials(staff.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0 flex-1">
                                      <span className="text-sm font-medium truncate">{staff.name}</span>
                                      <span className="text-xs text-muted-foreground">{getDepartmentLabel(staff.department)}</span>
                                    </div>
                                    <Check
                                      className={cn(
                                        "h-4 w-4 shrink-0 absolute right-2",
                                        field.value === staff._id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              {/* Assigned To (for Membership) */}
                  {isMembership && (
                    <FormField
                      control={form.control}
                      name="membershipAssignedTo"
                      render={({ field }) => {
                        const selectedStaff = field.value ? membershipEligibleStaff.find((staff) => staff._id === field.value) : null;
                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel>Assigned To</FormLabel>
                            <Popover open={membershipAssignedToOpen} onOpenChange={setMembershipAssignedToOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-start gap-2 h-9",
                                      !field.value && "text-muted-foreground/60"
                                    )}
                                  >
                                    {selectedStaff ? (
                                      <>
                                        <Avatar className="h-5 w-5 shrink-0 border border-background">
                                          <AvatarImage src="" />
                                          <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                            {getInitials(selectedStaff.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs truncate flex-1 text-left">
                                          {selectedStaff.name}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground/60">Select FC/FCS</span>
                                    )}
                                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                          <PopoverContent className="w-[350px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search FC/FCS..." />
                              <CommandList className="max-h-[200px] overflow-y-auto">
                                <CommandEmpty>No staff found.</CommandEmpty>
                                <CommandGroup>
                                  {membershipEligibleStaff.map((staff) => (
                                    <CommandItem
                                      key={staff._id}
                                      value={`${staff.name} ${getDepartmentLabel(staff.department)}`}
                                      onSelect={() => {
                                        form.setValue("membershipAssignedTo", staff._id || "");
                                        setMembershipAssignedToOpen(false);
                                      }}
                                      className="flex items-center gap-3 pr-8 relative"
                                    >
                                      <Avatar className="h-8 w-8 shrink-0 border border-background">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="text-xs font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                          {getInitials(staff.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-medium truncate">{staff.name}</span>
                                        <span className="text-xs text-muted-foreground">{getDepartmentLabel(staff.department)}</span>
                                      </div>
                                      <Check
                                        className={cn(
                                          "h-4 w-4 shrink-0 absolute right-2",
                                          field.value === staff._id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}
                  
                  {/* Assigned To (for PT Package) */}
                  {isPTPackage && (
                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => {
                        const selectedStaff = field.value ? eligibleStaff.find((staff) => staff._id === field.value) : null;
                        return (
                          <FormItem className="flex flex-col">
                            <FormLabel>Assigned To</FormLabel>
                            <Popover open={assignedToOpen} onOpenChange={setAssignedToOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-start gap-2 h-9",
                                      !field.value && "text-muted-foreground/60"
                                    )}
                                  >
                                    {selectedStaff ? (
                                      <>
                                        <Avatar className="h-5 w-5 shrink-0 border border-background">
                                          <AvatarImage src="" />
                                          <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                            {getInitials(selectedStaff.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs truncate flex-1 text-left">
                                          {selectedStaff.name}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs text-muted-foreground/60">Select PT/PTS</span>
                                    )}
                                    <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                          <PopoverContent className="w-[350px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search trainers..." />
                              <CommandList className="max-h-[200px] overflow-y-auto">
                                <CommandEmpty>No trainers found.</CommandEmpty>
                                <CommandGroup>
                                  {eligibleStaff.map((staff) => (
                                    <CommandItem
                                      key={staff._id}
                                      value={`${staff.name} ${getDepartmentLabel(staff.department)}`}
                                      onSelect={() => {
                                        form.setValue("assignedTo", staff._id || "");
                                        setAssignedToOpen(false);
                                      }}
                                      className="flex items-center gap-3 pr-8 relative"
                                    >
                                      <Avatar className="h-8 w-8 shrink-0 border border-background">
                                        <AvatarImage src="" />
                                        <AvatarFallback className="text-xs font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                          {getInitials(staff.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-sm font-medium truncate">{staff.name}</span>
                                        <span className="text-xs text-muted-foreground">{getDepartmentLabel(staff.department)}</span>
                                      </div>
                                      <Check
                                        className={cn(
                                          "h-4 w-4 shrink-0 absolute right-2",
                                          field.value === staff._id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                )}
                </div>

                {/* Membership Fields */}
                {isMembership && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="membershipInvoiceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Membership Invoice</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Auto-generated"
                                className="h-9 placeholder:text-xs placeholder:text-muted-foreground/60"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="membershipType"
                        render={({ field }) => {
                          // Find the membership ID that matches the current type value
                          const currentMembership = membershipsData.find(m => m.type === field.value);
                          const currentValue = currentMembership?.id || field.value || "";
                          
                          return (
                            <FormItem>
                              <FormLabel>Membership Type</FormLabel>
                              <Select
                                onValueChange={(selectedId) => {
                                  // Find the membership by ID and set its type
                                  const selectedMembership = membershipsData.find(m => m.id === selectedId);
                                  if (selectedMembership) {
                                    field.onChange(selectedMembership.type);
                                  }
                                }}
                                value={currentValue}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-9 text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                    <SelectValue placeholder="Select membership type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-[200px]">
                                  {membershipsData
                                    .filter((m) => m.isActive)
                                    .sort((a, b) => a.duration - b.duration)
                                    .map((membership) => {
                                      // Extract badge text for 1-year memberships
                                      const getBadgeText = () => {
                                        if (membership.type === "1_year") {
                                          const name = membership.name.toLowerCase();
                                          if (name.includes("new")) {
                                            return "1Y NEW";
                                          }
                                          if (name.includes("renew")) {
                                            return "1Y RENEW";
                                          }
                                          if (name.includes("happy hour") || name.includes("happy")) {
                                            return "1Y HH";
                                          }
                                          return membership.shortName;
                                        }
                                        return membership.shortName;
                                      };

                                      return (
                                        <SelectItem key={membership.id} value={membership.id}>
                                          <div className="flex items-center gap-2 w-full">
                                            <Badge 
                                              variant="outline" 
                                              className="gap-1.5 border-muted bg-muted/50 text-xs font-black italic shrink-0"
                                              style={{ fontFamily: 'Montserrat, sans-serif' }}
                                            >
                                              {getBadgeText()}
                                            </Badge>
                                            <span className="text-xs text-foreground font-medium truncate">
                                              {membership.name}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>

                    {/* Start Date - Full Width */}
                    <FormField
                      control={form.control}
                      name="membershipStartDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-9",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60">Pick a date</span>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="membershipPaymentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                  <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="membershipPaymentDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Payment Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal h-9",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span className="text-xs text-muted-foreground/60">Pick a date</span>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="membershipPaymentRemark"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Remark</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Remark" 
                              className="h-9 placeholder:text-xs placeholder:text-muted-foreground/60"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* PT Package Fields */}
                {isPTPackage && (
                  <>
                    {/* Invoice Number and PT Package Type - 2x2 Layout */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="ptPackageInvoiceNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PT Invoice</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Auto-generated"
                                className="h-9 placeholder:text-xs placeholder:text-muted-foreground/60"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ptPackageType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PT Package Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                  <SelectValue placeholder="Select package" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[300px]">
                                {sortedPTPackages.map((pkg) => {
                                  return (
                                    <SelectItem key={pkg.id} value={pkg.id}>
                                      <div className="flex items-center gap-2 w-full">
                                        <Badge 
                                          variant="outline" 
                                          className="gap-1.5 border-muted bg-muted/50 text-sm font-black italic"
                                          style={{ fontFamily: 'Montserrat, sans-serif' }}
                                        >
                                          {pkg.shortName}
                                        </Badge>
                                        {pkg.description && (
                                          <span className="text-xs text-muted-foreground truncate flex-1">
                                            {pkg.description}
                                          </span>
                                        )}
                                        <span className="font-mono text-xs text-muted-foreground ml-auto">
                                          ${pkg.price.toFixed(2)}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Start Date - Full Width */}
                    <FormField
                      control={form.control}
                      name="ptPackageStartDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-9",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60">Pick a date</span>
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="ptPackagePaymentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-9 text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                  <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ptPackagePaymentDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Payment Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full justify-start text-left font-normal h-9",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span className="text-xs text-muted-foreground/60">Pick a date</span>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="ptPackagePaymentRemark"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Remark</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Remark" 
                              className="h-9 placeholder:text-xs placeholder:text-muted-foreground/60"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
          </ScrollArea>

          {renderAsContent ? (
            <div className="border-t pt-3 px-4 pb-3">
              <div className="flex justify-center gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="min-w-[100px] h-9"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="min-w-[140px] h-9" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${isMembership ? "Membership" : "PT Package"}`
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <DrawerFooter className="border-t pt-3">
              <div className="flex justify-center gap-3">
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="min-w-[100px] h-9">
                    Cancel
                  </Button>
                </DrawerClose>
                <Button type="submit" className="min-w-[140px] h-9" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    `Add ${isMembership ? "Membership" : "PT Package"}`
                  )}
                </Button>
              </div>
            </DrawerFooter>
          )}
        </form>
      </Form>
    );

  if (renderAsContent) {
    return formContent;
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle>
            Add {isMembership ? "Membership" : "PT Package"} - {member.fullName}
          </DrawerTitle>
          <DrawerDescription>
            Add a new {isMembership ? "membership" : "PT package"} for this member
          </DrawerDescription>
        </DrawerHeader>
        {formContent}
      </DrawerContent>
    </Drawer>
  );
}

