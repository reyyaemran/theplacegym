"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Member } from "../types/member";
import { toast } from "sonner";
import { useCreateMember, useUpdateMember } from "@/hooks/use-members";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronLeft, Check, ChevronsUpDown, Ruler, Scale } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CaptionProps, useNavigation } from "react-day-picker";
import { Progress } from "@/components/ui/progress";
import { useStaff } from "@/hooks/use-staff";
import { Staff } from "@/types/staff";
import { useMembershipTypes } from "@/hooks/use-membership-types";
import { usePTPackageTypes } from "@/hooks/use-pt-package-types";
import { useCreateMembershipRecord } from "@/hooks/use-membership-records";
import { useCreatePTPackageRecord } from "@/hooks/use-pt-package-records";
import { addMonths, addDays } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StaffDepartment } from "@/types/staff";

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

// Common allergies list
const COMMON_ALLERGIES = [
  "Peanuts", "Tree Nuts", "Dairy", "Eggs", "Soy", "Wheat", "Fish", "Shellfish",
  "Latex", "Penicillin", "Aspirin", "Ibuprofen", "Sulfa Drugs", "Codeine",
  "Dust Mites", "Pollen", "Mold", "Pet Dander", "Bee Stings", "Other"
];

const memberSchema = z.object({
  // Step 1: Information
  issuedBy: z.string().min(1, "Issued by is required"),
  memberNumber: z.string().optional(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.date().optional(),
  emergencyPhone: z.string().optional(),
  emergencyPhoneName: z.string().optional(),
  
  // Step 2: Payment & Packages (optional)
  membershipInvoiceNumber: z.string().optional(),
  membershipType: z.enum(["day_pass", "1_month", "3_month", "6_month", "1_year"]).optional(),
  membershipAssignedTo: z.string().optional(), // FC, FCS only
  membershipPaymentType: z.enum(["cash", "card", "bank_transfer", "online", "other"]).optional(),
  membershipPaymentRemark: z.string().optional(),
  ptPackageInvoiceNumber: z.string().optional(),
  ptPackageType: z.string().optional(),
  ptPackageAssignedTo: z.string().optional(), // PT, PTS only
  ptPackagePaymentType: z.enum(["cash", "card", "bank_transfer", "online", "other"]).optional(),
  ptPackagePaymentRemark: z.string().optional(),
  membershipStartDate: z.date().optional(),
  ptPackageStartDate: z.date().optional(),
  
  // Step 3: Medical
  measurementSystem: z.enum(["metric", "imperial"]).default("metric"),
  weight: z.number().optional(),
  height: z.number().optional(),
  bloodType: z.string().optional(),
  medicine: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  
  // Step 4: Rules
  rulesAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the rules and regulations",
  }),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
  /**
   * Optional post-save hook. The drawer already handles the API write itself
   * (createMemberMutation / updateMemberMutation). This callback fires with
   * the saved member data after the mutation resolves, so the parent can
   * react (e.g. optimistic UI, analytics).
   */
  onSave?: (data: Omit<Member, "id">) => void;
}

const STEPS = [
  { id: 1, title: "Information", fields: ["issuedBy", "fullName", "email", "phone"] },
  { id: 2, title: "Payment & Packages", fields: [] }, // Optional step
  { id: 3, title: "Medical", fields: [] }, // Optional step
  { id: 4, title: "Rules & Regulations", fields: ["rulesAccepted"] },
];

// Get staff filtered by department - will be used inside component with real data
const getStaffByDepartments = (staff: Staff[], departments: string[]) => {
  return staff.filter((s) => departments.includes(s.department));
};

// Helper function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

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

export function MemberFormDrawer({
  open,
  onOpenChange,
  member,
  onSave,
}: MemberFormDrawerProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = STEPS.length;
  const [issuedByOpen, setIssuedByOpen] = useState(false);
  const [membershipAssignedToOpen, setMembershipAssignedToOpen] = useState(false);
  const [ptPackageAssignedToOpen, setPTPackageAssignedToOpen] = useState(false);
  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const queryClient = useQueryClient();
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();
  const createMembershipRecordMutation = useCreateMembershipRecord();
  const createPTPackageRecordMutation = useCreatePTPackageRecord();
  const isSubmitting = createMemberMutation.isPending || updateMemberMutation.isPending || createMembershipRecordMutation.isPending || createPTPackageRecordMutation.isPending;
  
  // Fetch real staff data from API
  const { data: staffData = [] } = useStaff();
  
  // Fetch real membership types and PT package types from API
  const { data: membershipsData = [] } = useMembershipTypes();
  const { data: ptPackagesData = [] } = usePTPackageTypes();
  
  // Get Customer Care staff for "Issued By"
  const customerCareStaff = useMemo(() => {
    return getStaffByDepartments(staffData, ["CC", "CCS"]);
  }, [staffData]);

  // Get eligible staff for Membership "Assigned To" (FC, FCS only)
  const membershipEligibleStaff = useMemo(() => {
    return getStaffByDepartments(staffData, ["FC", "FCS"]);
  }, [staffData]);

  // Get eligible staff for PT Package "Assigned To" (PT, PTS only)
  const ptPackageEligibleStaff = useMemo(() => {
    return getStaffByDepartments(staffData, ["PT", "PTS"]);
  }, [staffData]);
  
  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      issuedBy: "",
      memberNumber: "",
      fullName: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: undefined,
      emergencyPhone: "",
      emergencyPhoneName: "",
      membershipInvoiceNumber: "",
      membershipType: undefined,
      membershipAssignedTo: "",
      membershipPaymentType: undefined,
      membershipPaymentRemark: "",
      ptPackageInvoiceNumber: "",
      ptPackageType: "",
      ptPackageAssignedTo: "",
      ptPackagePaymentType: undefined,
      ptPackagePaymentRemark: "",
      membershipStartDate: undefined,
      ptPackageStartDate: undefined,
      measurementSystem: "metric",
      weight: undefined,
      height: undefined,
      bloodType: "",
      medicine: [],
      allergies: [],
      rulesAccepted: false,
    },
  });

  // Watch ptPackageAssignedTo to filter PT packages by trainer level
  const ptPackageAssignedToValue = form.watch("ptPackageAssignedTo");
  
  // Get the assigned trainer's level
  const assignedTrainerLevel = useMemo(() => {
    if (!ptPackageAssignedToValue) return null;
    const trainer = staffData.find(s => s._id === ptPackageAssignedToValue);
    return trainer?.level || null;
  }, [ptPackageAssignedToValue, staffData]);

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
    if (member) {
      form.reset({
        issuedBy: "",
        membershipAssignedTo: "",
        ptPackageAssignedTo: "",
        memberNumber: member.memberNumber || "",
        fullName: member.fullName,
        email: member.email || "",
        phone: member.phone || "",
        address: member.address || "",
        dateOfBirth: member.dateOfBirth ? new Date(member.dateOfBirth) : undefined,
        emergencyPhone: member.emergencyPhone || "",
        emergencyPhoneName: member.emergencyPhoneName || "",
        membershipInvoiceNumber: "",
        membershipType: member.membershipType,
        ptPackageInvoiceNumber: "",
        ptPackageType: member.ptPackageSessions 
          ? ptPackagesData.find(pkg => pkg.sessions === member.ptPackageSessions)?.id || ""
          : "",
        membershipStartDate: undefined,
        ptPackageStartDate: member.ptPackageStartDate ? new Date(member.ptPackageStartDate) : undefined,
        membershipPaymentType: undefined,
        membershipPaymentRemark: "",
        ptPackagePaymentType: undefined,
        ptPackagePaymentRemark: "",
        measurementSystem: "metric",
        weight: undefined,
        height: undefined,
        bloodType: member.bloodType || "",
        medicine: member.medicine || [],
        allergies: member.allergies || [],
        rulesAccepted: false,
      });
    } else {
      form.reset({
        issuedBy: "",
        membershipAssignedTo: "",
        ptPackageAssignedTo: "",
        memberNumber: "",
        fullName: "",
        email: "",
        phone: "",
        address: "",
        dateOfBirth: undefined,
        emergencyPhone: "",
        emergencyPhoneName: "",
        membershipInvoiceNumber: "",
        membershipType: undefined,
        ptPackageInvoiceNumber: "",
        ptPackageType: "",
        membershipStartDate: undefined,
        ptPackageStartDate: undefined,
        membershipPaymentType: undefined,
        membershipPaymentRemark: "",
        ptPackagePaymentType: undefined,
        ptPackagePaymentRemark: "",
        measurementSystem: "metric",
        weight: undefined,
        height: undefined,
        bloodType: "",
        medicine: [],
        allergies: [],
        rulesAccepted: false,
      });
      setCurrentStep(1);
    }
  }, [member, form, open]);

  const generateMemberNumber = () => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    return randomNum.toString().padStart(6, "0");
  };

  const generateInvoiceNumber = (type: "membership" | "pt") => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return randomNum.toString().padStart(4, "0");
  };

  // Helper to calculate membership expiry date
  const calculateMembershipExpiry = (startDate: Date, membershipType: string): Date => {
    switch (membershipType) {
      case 'day_pass':
        return addDays(startDate, 1);
      case '1_month':
        return addMonths(startDate, 1);
      case '3_month':
        return addMonths(startDate, 3);
      case '6_month':
        return addMonths(startDate, 6);
      case '1_year':
        return addMonths(startDate, 12);
      default:
        return startDate;
    }
  };

  const onSubmit = async (data: MemberFormValues) => {
    try {
      const memberNumber = data.memberNumber || generateMemberNumber();
      
      // Find the PT package by ID to get sessions
      const selectedPTPackage = data.ptPackageType 
        ? ptPackagesData.find(pkg => pkg.id === data.ptPackageType)
        : null;
      
      // Get staff names for records
      const issuedByStaff = data.issuedBy ? staffData.find(s => s._id === data.issuedBy) : null;
      const membershipAssignedToStaff = data.membershipAssignedTo ? staffData.find(s => s._id === data.membershipAssignedTo) : null;
      const ptPackageAssignedToStaff = data.ptPackageAssignedTo ? staffData.find(s => s._id === data.ptPackageAssignedTo) : null;
      
      // Get membership type details
      const selectedMembership = data.membershipType 
        ? membershipsData.find(m => m.type === data.membershipType)
        : null;
      
      const memberData: Omit<Member, "id"> = {
        memberNumber,
        fullName: data.fullName,
        email: data.email || "",
        phone: data.phone,
        company: "",
        totalSpent: member?.totalSpent ?? 0,
        status: member?.status || "active",
        dateJoined: member?.dateJoined || new Date().toISOString(),
        lastPurchase: member?.lastPurchase || new Date().toISOString(),
        location: data.address || "",
        address: data.address || undefined,
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.toISOString() : undefined,
        emergencyPhone: data.emergencyPhone || undefined,
        emergencyPhoneName: data.emergencyPhoneName || undefined,
        bloodType: data.bloodType || undefined,
        medicine: data.medicine || undefined,
        allergies: data.allergies || undefined,
        membershipType: data.membershipType,
        ptPackageSessions: selectedPTPackage ? selectedPTPackage.sessions : undefined,
        ptPackageStartDate: data.ptPackageStartDate ? data.ptPackageStartDate.toISOString() : undefined,
      };

      let createdMember: Member;
      if (member?.id) {
        // Update existing member
        createdMember = await updateMemberMutation.mutateAsync({
          id: member.id,
          data: memberData,
        });
      } else {
        // Create new member
        createdMember = await createMemberMutation.mutateAsync(memberData);
      }

      // Use memberNumber as memberId for records (as that's what the records use)
      // Use the memberNumber from form data (which we generated) to ensure consistency
      const memberIdForRecords = memberNumber;

      // Create membership record if membership data exists
      if (data.membershipType && selectedMembership) {
        try {
          const startDate = data.membershipStartDate || new Date();
          const expiryDate = calculateMembershipExpiry(startDate, data.membershipType);
          const invoiceNumber = data.membershipInvoiceNumber || generateInvoiceNumber("membership");
          const paymentDate = new Date();

          const membershipRecordData = {
            memberId: memberIdForRecords,
            memberName: data.fullName,
            membershipType: data.membershipType,
            invoiceNumber,
            startDate: startDate.toISOString(),
            expiryDate: expiryDate.toISOString(),
            paymentType: data.membershipPaymentType || "cash",
            paymentDate: paymentDate.toISOString(),
            amount: selectedMembership.price,
            paymentRemark: data.membershipPaymentRemark || undefined,
            assignedStaffName: membershipAssignedToStaff?.name || undefined,
            issuedBy: issuedByStaff?.name || undefined,
          };

          await createMembershipRecordMutation.mutateAsync(membershipRecordData);
        } catch (error) {
          toast.error("Member created but failed to create membership record");
        }
      }

      // Create PT package record if PT package data exists
      if (data.ptPackageType && selectedPTPackage) {
        try {
          const startDate = data.ptPackageStartDate || new Date();
          const validityDays = selectedPTPackage.validityDays || 30;
          const expiryDate = addDays(startDate, validityDays);
          const invoiceNumber = data.ptPackageInvoiceNumber || generateInvoiceNumber("pt");
          const paymentDate = new Date();

          const ptPackageRecordData = {
            memberId: memberIdForRecords,
            memberName: data.fullName,
            ptPackageId: selectedPTPackage.id,
            ptPackageName: selectedPTPackage.name,
            ptPackageSessions: selectedPTPackage.sessions,
            invoiceNumber,
            startDate: startDate.toISOString(),
            expiryDate: expiryDate.toISOString(),
            paymentType: data.ptPackagePaymentType || "cash",
            paymentDate: paymentDate.toISOString(),
            amount: selectedPTPackage.price,
            paymentRemark: data.ptPackagePaymentRemark || undefined,
            assignedStaffName: ptPackageAssignedToStaff?.name || undefined,
            issuedBy: issuedByStaff?.name || undefined,
          };

          await createPTPackageRecordMutation.mutateAsync(ptPackageRecordData);
        } catch (error) {
          toast.error("Member created but failed to create PT package record");
        }
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
      ]);

      // Success toast is handled by the mutation hooks.
      // Notify parent so it can run any post-save logic.
      onSave?.(memberData);

      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
    } catch (error) {
      // Error toast is handled by the mutation hooks
      // Error is handled by the mutation hook
    }
  };

  const nextStep = () => {
    const currentStepFields = STEPS[currentStep - 1].fields;
    
    if (currentStepFields.length > 0) {
      form.trigger(currentStepFields as any).then((isValid) => {
        if (isValid && currentStep < totalSteps) {
          setCurrentStep(currentStep + 1);
        }
      });
    } else {
      // Optional steps can be skipped
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / totalSteps) * 100;
  const measurementSystem = form.watch("measurementSystem");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] rounded-t-2xl">
        <div className="mx-auto w-full max-w-4xl">
          <DrawerHeader className="border-b pb-4">
            <DrawerTitle className="text-lg font-semibold">
              {member ? "Edit Member" : "Add New Member"}
            </DrawerTitle>
            <DrawerDescription>
              Step {currentStep} of {totalSteps}: {STEPS[currentStep - 1].title}
            </DrawerDescription>
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
            </div>
          </DrawerHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
              <div className="px-4 py-6" style={{ minHeight: "500px", maxHeight: "500px" }}>
                <ScrollArea className="h-full">
                {/* Step 1: Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="issuedBy"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Issued By *</FormLabel>
                            <Popover open={issuedByOpen} onOpenChange={setIssuedByOpen}>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value
                                      ? customerCareStaff.find((staff) => staff._id === field.value)?.name
                                      : "Select staff"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[min(350px,calc(100vw-2rem))] p-0" align="start">
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
                                              <AvatarImage src={staff.avatar || ""} alt={staff.name} />
                                              <AvatarFallback className="text-xs font-black bg-gradient-to-br from-muted to-muted/80 text-foreground font-montserrat">
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
                        )}
                      />

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="memberNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Member ID</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Auto-generated"
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Name" 
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Email" 
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Phone" 
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Address" 
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Date of Birth</FormLabel>
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
                                      <span className="text-xs text-muted-foreground/60">Pick a date</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                  components={{
                                    Caption: CustomCaption,
                                  }}
                                  captionLayout="dropdown"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="emergencyPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Phone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Phone" 
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="emergencyPhoneName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Contact" 
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Payment & Packages */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      This step is optional. You can add packages later from the member profile.
                    </p>
                    
                    {/* Two Column Layout: Membership (Left) | PT Package (Right) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Left Column: Membership */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Membership</h3>
                        
                        <FormField
                          control={form.control}
                          name="membershipAssignedTo"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Assigned To</FormLabel>
                              <Popover open={membershipAssignedToOpen} onOpenChange={setMembershipAssignedToOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between text-xs",
                                        !field.value && "text-muted-foreground/60"
                                      )}
                                    >
                                      <span className={cn("text-xs", !field.value && "text-muted-foreground/60")}>
                                        {field.value
                                          ? membershipEligibleStaff.find((staff) => staff._id === field.value)?.name
                                          : "Select FC/FCS"}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[min(350px,calc(100vw-2rem))] p-0" align="start">
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
                                              <AvatarImage src={staff.avatar || ""} alt={staff.name} />
                                              <AvatarFallback className="text-xs font-black bg-gradient-to-br from-muted to-muted/80 text-foreground font-montserrat">
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
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="membershipInvoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Membership Invoice</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Auto-generated"
                                  className="placeholder:text-sm placeholder:text-muted-foreground/60"
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
                                    <SelectTrigger className="text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                      <SelectValue placeholder="Membership" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-[200px]">
                                    {membershipsData
                                      .filter(m => m.isActive)
                                      .sort((a, b) => a.duration - b.duration)
                                      .map((membership) => {
                                        // Extract badge text for 1-year memberships
                                        const getBadgeText = () => {
                                          if (membership.type === "1_year") {
                                            const name = membership.name.toLowerCase();
                                            if (name.includes("new")) return "1Y NEW";
                                            if (name.includes("renew")) return "1Y RENEW";
                                            if (name.includes("happy hour") || name.includes("happy")) return "1Y HH";
                                            return membership.shortName;
                                          }
                                          return membership.shortName;
                                        };

                                        return (
                                          <SelectItem key={membership.id} value={membership.id}>
                                            <div className="flex items-center gap-2 w-full">
                                              <Badge 
                                                variant="outline" 
                                                className="gap-1.5 border-muted bg-muted/50 text-sm font-black shrink-0 font-montserrat"
                                              >
                                                {getBadgeText()}
                                              </Badge>
                                              <span className="text-sm text-foreground font-medium truncate">
                                                {membership.name}
                                              </span>
                                              <span className="font-mono text-sm font-semibold text-foreground ml-auto shrink-0">
                                                ${membership.price.toFixed(2)}
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
                                        "w-full justify-start text-left font-normal",
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
                                <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                    <SelectTrigger className="text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                      <SelectValue placeholder="Payment" />
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
                            name="membershipPaymentRemark"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Payment Remark</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Remark" 
                                    className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Right Column: PT Package */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-foreground mb-2">PT Package</h3>
                        
                        <FormField
                          control={form.control}
                          name="ptPackageAssignedTo"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Assigned To</FormLabel>
                              <Popover open={ptPackageAssignedToOpen} onOpenChange={setPTPackageAssignedToOpen}>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between text-xs",
                                        !field.value && "text-muted-foreground/60"
                                      )}
                                    >
                                      <span className={cn("text-xs", !field.value && "text-muted-foreground/60")}>
                                        {field.value
                                          ? ptPackageEligibleStaff.find((staff) => staff._id === field.value)?.name
                                          : "Select PT/PTS"}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[min(350px,calc(100vw-2rem))] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search trainers..." />
                                    <CommandList className="max-h-[200px] overflow-y-auto">
                                      <CommandEmpty>No trainers found.</CommandEmpty>
                                      <CommandGroup>
                                        {ptPackageEligibleStaff.map((staff) => (
                                          <CommandItem
                                            key={staff._id}
                                            value={`${staff.name} ${getDepartmentLabel(staff.department)}`}
                                            onSelect={() => {
                                              form.setValue("ptPackageAssignedTo", staff._id || "");
                                              setPTPackageAssignedToOpen(false);
                                            }}
                                            className="flex items-center gap-3 pr-8 relative"
                                          >
                                            <Avatar className="h-8 w-8 shrink-0 border border-background">
                                              <AvatarImage src={staff.avatar || ""} alt={staff.name} />
                                              <AvatarFallback className="text-xs font-black bg-gradient-to-br from-muted to-muted/80 text-foreground font-montserrat">
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
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="ptPackageInvoiceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>PT Invoice</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Auto-generated"
                                  className="placeholder:text-sm placeholder:text-muted-foreground/60"
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
                                  <SelectTrigger className="text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                    <SelectValue placeholder="Package" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-[300px]">
                                  {sortedPTPackages.map((pkg) => {
                                    return (
                                      <SelectItem key={pkg.id} value={pkg.id}>
                                        <div className="flex items-center gap-2 w-full">
                                          <Badge 
                                            variant="outline" 
                                            className="gap-1.5 border-muted bg-muted/50 text-sm font-black font-montserrat"
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
                                        "w-full justify-start text-left font-normal",
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
                                <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />


                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                    <SelectTrigger className="text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                      <SelectValue placeholder="Payment" />
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
                            name="ptPackagePaymentRemark"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Payment Remark</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Remark" 
                                    className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Medical */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="measurementSystem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Measurement System</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-6"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="metric" id="metric" />
                                <Label htmlFor="metric" className="flex items-center gap-2 cursor-pointer">
                                  <Ruler className="h-4 w-4" />
                                  Metric (kg, cm)
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="imperial" id="imperial" />
                                <Label htmlFor="imperial" className="flex items-center gap-2 cursor-pointer">
                                  <Scale className="h-4 w-4" />
                                  Imperial (lbs, ft/in)
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Weight ({measurementSystem === "metric" ? "kg" : "lbs"})
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder={measurementSystem === "metric" ? "kg" : "lbs"}
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Height ({measurementSystem === "metric" ? "cm" : "ft/in"})
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder={measurementSystem === "metric" ? "cm" : "ft/in"}
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bloodType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blood Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="text-sm data-[placeholder]:text-xs data-[placeholder]:text-muted-foreground/60">
                                  <SelectValue placeholder="Blood type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="medicine"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medicines</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Medicines"
                                className="placeholder:text-sm placeholder:text-muted-foreground/60"
                                {...field}
                                value={Array.isArray(field.value) ? field.value.join(", ") : field.value || ""}
                                onChange={(e) => {
                                  const medicines = e.target.value.split(",").map(m => m.trim()).filter(Boolean);
                                  field.onChange(medicines);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="allergies"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Allergies</FormLabel>
                          <Popover open={allergiesOpen} onOpenChange={setAllergiesOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !field.value || field.value.length === 0 && "text-muted-foreground"
                                  )}
                                >
                                  {field.value && field.value.length > 0
                                    ? `${field.value.length} selected`
                                    : "Select allergies"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandList className="h-[160px]">
                                  <CommandEmpty>No allergies found.</CommandEmpty>
                                  <CommandGroup>
                                    {COMMON_ALLERGIES.map((allergy) => (
                                      <CommandItem
                                        key={allergy}
                                        value={allergy}
                                        onSelect={() => {
                                          const current = field.value || [];
                                          const newValue = current.includes(allergy)
                                            ? current.filter((a) => a !== allergy)
                                            : [...current, allergy];
                                          field.onChange(newValue);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value?.includes(allergy) ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {allergy}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Rules & Regulations */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-6 space-y-4">
                      <h3 className="font-semibold">Rules and Regulations</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>By proceeding, you agree to the following:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Members must follow all gym rules and regulations</li>
                          <li>Membership fees are non-refundable</li>
                          <li>Members must maintain proper gym etiquette</li>
                          <li>Personal trainers must be booked in advance</li>
                          <li>Members are responsible for their personal belongings</li>
                        </ul>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="rulesAccepted"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="cursor-pointer">
                              I accept the rules and regulations *
                            </FormLabel>
                            <p className="text-xs text-muted-foreground">
                              You must accept the terms to proceed
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                </ScrollArea>
              </div>

              <DrawerFooter className="border-t pt-4">
                <div className="flex justify-between gap-2">
                  {currentStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      className="flex-1"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                  ) : (
                    <DrawerClose asChild>
                      <Button type="button" variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </DrawerClose>
                  )}
                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="flex-1"
                    >
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {member ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        `${member ? "Update" : "Create"} Member`
                      )}
                    </Button>
                  )}
                </div>
              </DrawerFooter>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
