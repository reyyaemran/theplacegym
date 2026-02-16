"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Staff, StaffDepartment, StaffStatus } from "@/types/staff";
import { Appointment } from "@/types/appointment";
import { calculateStaffMetrics } from "./utils/calculate-staff-metrics";
import { useAppointments } from "@/hooks/use-appointments";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useMembershipRecords } from "@/hooks/use-membership-records";
import { useStaffById, useUpdateStaff } from "@/hooks/use-staff";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { 
  ArrowLeft, 
  Edit, 
  Settings,
  Mail, 
  Phone, 
  Calendar, 
  Target, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Plane, 
  CalendarDays, 
  HeartPulse,
  User,
  Briefcase,
  FileText,
  MapPin,
  PhoneCall,
  Clock,
  DollarSign,
  Star,
  MessageSquare,
  Download,
  FileSpreadsheet,
  Upload,
  Eye,
  Flag,
  Thermometer,
  Wallet,
  Ban,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { StaffDocument } from "@/types/staff";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { AppointmentsTable } from "./components/appointments-table";
import { TrainerPTRecordsTable } from "./components/trainer-pt-records-table";
import { FCMembershipRecordsTable } from "./components/fc-membership-records-table";
import { CCIssuedRecordsTable } from "./components/cc-issued-records-table";
import { exportToExcel as exportPTPackagesToExcel, exportToPDF as exportPTPackagesToPDF } from "@/features/dashboard/pages/ptpackage-invoice/utils/export-pt-package-records";
import { exportToExcel as exportMembershipsToExcel, exportToPDF as exportMembershipsToPDF } from "@/features/dashboard/pages/membership-invoice/utils/export-membership-records";
import { getStaffAverageRating, getStaffRatingCount } from "./utils/staff-ratings";
import { toast } from "sonner";
import { useRoster } from "@/hooks/use-roster";
import { useAuth } from "@/hooks/use-auth";

  // Ring indicator component for Leave Stats
const RingIndicator = ({
  actual,
  target,
  size = 56,
  strokeWidth = 4,
  color = "emerald", // default color
}: {
  actual: number;
  target?: number; // target is now optional
  size?: number;
  strokeWidth?: number;
  color?: "emerald" | "amber" | "red" | "blue" | "purple";
}) => {
  const hasTarget = target !== undefined && target > 0;
  const percentage = hasTarget ? (actual / target!) * 100 : 0; // Use 0 for no target to show full ring or empty depending on design. Let's say empty ring if no target, or full?
  // Actually for unpaid leave (no target), we might just want to show the number.
  // If no target, let's assume we don't show a progress ring, or show a full ring?
  // Let's show a full faint ring and just the number.
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = hasTarget ? circumference - (percentage / 100) * circumference : 0; // 0 offset means full ring if we want
  // But for 'no target', maybe we want no progress bar, just the background ring?
  // Let's just show the background ring and the number.
  
  let ringColorClass = "";
  switch (color) {
    case "emerald":
      ringColorClass = "stroke-emerald-500 dark:stroke-emerald-400";
      break;
    case "amber":
      ringColorClass = "stroke-amber-500 dark:stroke-amber-400";
      break;
    case "red":
      ringColorClass = "stroke-red-500 dark:stroke-red-400";
      break;
    case "blue":
      ringColorClass = "stroke-blue-500 dark:stroke-blue-400";
      break;
    case "purple":
      ringColorClass = "stroke-purple-500 dark:stroke-purple-400";
      break;
    default:
      ringColorClass = "stroke-emerald-500 dark:stroke-emerald-400";
  }

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/30 dark:text-muted/20"
        />
        {hasTarget && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-500 ease-out ${ringColorClass}`}
          />
        )}
      </svg>
      <div className="absolute flex items-baseline justify-center gap-0.5" style={{ marginTop: '2px' }}>
        <span className="font-mono text-xs font-semibold text-foreground leading-none">
          {actual}
        </span>
        {hasTarget && (
          <>
            <span className="font-mono text-[9px] text-muted-foreground/70 leading-none">/</span>
            <span className="font-mono text-[10px] text-muted-foreground leading-none">
              {target}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

import { StaffSettingsDialog } from "./components/staff-settings-dialog";

export function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { staff: currentStaff } = useAuth();
  
  // Check if the current user is viewing their own profile
  // Session has staffId (camelCase), staff object has _id
  const currentStaffId = (currentStaff as any)?.staffId || currentStaff?._id;
  const isOwnProfile = currentStaffId === id;
  
  // Use React Query hooks for data fetching
  const { data: staff, isLoading: staffLoading, error: staffError } = useStaffById(id);
  const { data: appointments = [] } = useAppointments();
  const { data: ptPackageRecords = [] } = usePTPackageRecords();
  const { data: membershipRecords = [] } = useMembershipRecords();
  const updateStaffMutation = useUpdateStaff();

  // Fetch Roster for integration
  const currentDate = new Date();
  const rosterMonth = currentDate.getMonth() + 1;
  const rosterYear = currentDate.getFullYear();
  const { data: rosterRecords = [] } = useRoster(rosterMonth, rosterYear);
  
  const loading = staffLoading;

  // Merge Roster Status into Staff Data
  const displayStaff = useMemo(() => {
    if (!staff) return null;
    
    const todayStr = `${rosterYear}-${String(rosterMonth).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const todayDate = new Date(rosterYear, rosterMonth - 1, currentDate.getDate());
    const todayDayName = todayDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const rosterRecord = rosterRecords.find(r => r.staffId === staff._id && r.date === todayStr);
    
    let status = staff.status;
    
    if (rosterRecord) {
        // Map Roster Status to StaffStatus
        switch (rosterRecord.status) {
          case "shift":
            status = "AVAILABLE";
            break;
          case "dayoff":
            status = "DAY_OFF";
            break;
          case "leave":
            switch (rosterRecord.leaveType) {
              case "AL": status = "ON_LEAVE_ANNUAL"; break;
              case "PH": status = "ON_LEAVE_PUBLIC_HOLIDAY"; break;
              case "SL": status = "ON_LEAVE_SICK"; break;
              case "UP": status = "UNAVAILABLE"; break; // Mapping Unpaid to Unavailable for now
              default: status = "ON_LEAVE_ANNUAL"; 
            }
            break;
          case "none":
            status = "UNAVAILABLE";
            break;
        }
    } else {
      // If no roster record exists, check if today is the staff's day off
      const staffDayOff = staff.dayOff?.toLowerCase();
      if (staffDayOff && todayDayName === staffDayOff) {
        status = "DAY_OFF";
        }
    }
    
    return { ...staff, status };
  }, [staff, rosterRecords, rosterMonth, rosterYear, currentDate]);

  // Handle staff document upload
  const handleStaffDocumentUpload = async (file: File) => {
    if (!staff) return;
    
    try {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const newDoc: StaffDocument = {
          id: `doc-${Date.now()}`,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'document',
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
        };
        
        // Get existing documents and add the new one
        const existingDocuments = staff.documents || [];
        const updatedDocuments = [...existingDocuments, newDoc];
        
        // Update staff via API
        await updateStaffMutation.mutateAsync({
          id: staff._id!,
          data: {
            documents: updatedDocuments,
          },
        });
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      // Error is handled by toast
      toast.error("Failed to upload document");
    }
  };
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Appointments table state
  const [appointmentsSorting, setAppointmentsSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [appointmentsPagination, setAppointmentsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });
  
  // PT Records table state
  const [ptRecordsSorting, setPTRecordsSorting] = useState<SortingState>([
    { id: "startDate", desc: true },
  ]);
  const [ptRecordsPagination, setPTRecordsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });
  
  // FC Membership Records table state
  const [membershipRecordsSorting, setMembershipRecordsSorting] = useState<SortingState>([
    { id: "startDate", desc: true },
  ]);
  const [membershipRecordsPagination, setMembershipRecordsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });

  // CC/CCS Issued Records table state (unified)
  const [ccIssuedRecordsSorting, setCCIssuedRecordsSorting] = useState<SortingState>([
    { id: "startDate", desc: true },
  ]);
  const [ccIssuedRecordsPagination, setCCIssuedRecordsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });
  
  // Initialize data filters - handle null staff
  const allStaffAppointments = displayStaff ? appointments.filter(
    (apt) => apt.staffId === displayStaff._id
  ) : [];
  
  const trainerPTRecords = displayStaff ? ptPackageRecords.filter(
    (record) => record.assignedStaffName === displayStaff.name
  ) : [];
  
  const fcMembershipRecords = displayStaff ? membershipRecords.filter(
    (record) => record.assignedStaffName === displayStaff.name
  ) : [];

  // CC/CCS Issued Records - filter by issuedBy
  const ccIssuedMembershipRecords = displayStaff ? membershipRecords.filter(
    (record) => record.issuedBy === displayStaff.name
  ) : [];
  const ccIssuedPTPackageRecords = displayStaff ? ptPackageRecords.filter(
    (record) => record.issuedBy === displayStaff.name
  ) : [];
  
  // All useMemo hooks must be called unconditionally - BEFORE early returns
  const sortedAppointments = useMemo(() => {
    const sorted = [...allStaffAppointments];
    appointmentsSorting.forEach((sort) => {
      sorted.sort((a, b) => {
        let aValue: any = a[sort.id as keyof Appointment];
        let bValue: any = b[sort.id as keyof Appointment];
        
        if (sort.id === "date") {
          aValue = a.date ? new Date(a.date).getTime() : 0;
          bValue = b.date ? new Date(b.date).getTime() : 0;
        }
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sort.desc ? bValue - aValue : aValue - bValue;
        }
        
        return 0;
      });
    });
    return sorted;
  }, [allStaffAppointments, appointmentsSorting]);
  
  const paginatedAppointments = useMemo(() => {
    const start = appointmentsPagination.pageIndex * appointmentsPagination.pageSize;
    const end = start + appointmentsPagination.pageSize;
    return sortedAppointments.slice(start, end);
  }, [sortedAppointments, appointmentsPagination]);
  
  const sortedPTRecords = useMemo(() => {
    const sorted = [...trainerPTRecords];
    ptRecordsSorting.forEach((sort) => {
      sorted.sort((a, b) => {
        let aValue: any = a[sort.id as keyof PTPackageRecord];
        let bValue: any = b[sort.id as keyof PTPackageRecord];
        
        if (sort.id === "startDate" || sort.id === "expiryDate" || sort.id === "paymentDate") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sort.desc ? bValue - aValue : aValue - bValue;
        }
        
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sort.desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }
        
        return 0;
      });
    });
    return sorted;
  }, [trainerPTRecords, ptRecordsSorting]);
  
  const paginatedPTRecords = useMemo(() => {
    const start = ptRecordsPagination.pageIndex * ptRecordsPagination.pageSize;
    const end = start + ptRecordsPagination.pageSize;
    return sortedPTRecords.slice(start, end);
  }, [sortedPTRecords, ptRecordsPagination]);
  
  // Sort and paginate membership records
  const sortedMembershipRecords = useMemo(() => {
    const sorted = [...fcMembershipRecords];
    membershipRecordsSorting.forEach((sort) => {
      sorted.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        // Handle status column sorting
        if (sort.id === "membershipStatus") {
          // Calculate status priority for sorting
          const getStatusPriority = (record: MembershipRecord): number => {
            const expiry = new Date(record.expiryDate);
            const now = new Date();
            const daysUntilExpiry = differenceInDays(expiry, now);
            
            if (expiry < now) return 0; // expired
            if (daysUntilExpiry <= 7) return 1; // 7_days_left
            if (daysUntilExpiry <= 14) return 2; // expiring_soon
            
            const start = new Date(record.startDate);
            const daysSinceStart = differenceInDays(now, start);
            if (daysSinceStart < 30) return 3; // new_member
            
            return 4; // active
          };
          
          aValue = getStatusPriority(a);
          bValue = getStatusPriority(b);
        } else {
          aValue = a[sort.id as keyof MembershipRecord];
          bValue = b[sort.id as keyof MembershipRecord];
          
          if (sort.id === "startDate" || sort.id === "expiryDate" || sort.id === "paymentDate") {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }
        }
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sort.desc ? bValue - aValue : aValue - bValue;
        }
        
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sort.desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }
        
        return 0;
      });
    });
    return sorted;
  }, [fcMembershipRecords, membershipRecordsSorting]);
  
  const paginatedMembershipRecords = useMemo(() => {
    const start = membershipRecordsPagination.pageIndex * membershipRecordsPagination.pageSize;
    const end = start + membershipRecordsPagination.pageSize;
    return sortedMembershipRecords.slice(start, end);
  }, [sortedMembershipRecords, membershipRecordsPagination]);

  // Combine and sort CC/CCS issued records (membership + PT package)
  const combinedCCRecords = useMemo(() => {
    return [...ccIssuedMembershipRecords, ...ccIssuedPTPackageRecords];
  }, [ccIssuedMembershipRecords, ccIssuedPTPackageRecords]);

  const sortedCCRecords = useMemo(() => {
    const sorted = [...combinedCCRecords];
    ccIssuedRecordsSorting.forEach((sort) => {
      sorted.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        // Handle status column sorting
        if (sort.id === "status") {
          const getStatusPriority = (record: MembershipRecord | PTPackageRecord): number => {
            const expiry = new Date(record.expiryDate);
            const now = new Date();
            const daysUntilExpiry = differenceInDays(expiry, now);
            
            if (expiry < now) return 0; // expired
            if (daysUntilExpiry <= 7) return 1; // 7_days_left
            if (daysUntilExpiry <= 14) return 2; // expiring_soon
            
            const start = new Date(record.startDate);
            const daysSinceStart = differenceInDays(now, start);
            if (daysSinceStart < 30) return 3; // new_member
            
            return 4; // active
          };
          
          aValue = getStatusPriority(a);
          bValue = getStatusPriority(b);
        } else {
          aValue = (a as any)[sort.id];
          bValue = (b as any)[sort.id];
          
          if (sort.id === "startDate" || sort.id === "expiryDate" || sort.id === "paymentDate") {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }
        }
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sort.desc ? bValue - aValue : aValue - bValue;
        }
        
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sort.desc ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
        }
        
        return 0;
      });
    });
    return sorted;
  }, [combinedCCRecords, ccIssuedRecordsSorting]);
  
  const paginatedCCRecords = useMemo(() => {
    const start = ccIssuedRecordsPagination.pageIndex * ccIssuedRecordsPagination.pageSize;
    const end = start + ccIssuedRecordsPagination.pageSize;
    return sortedCCRecords.slice(start, end);
  }, [sortedCCRecords, ccIssuedRecordsPagination]);

  // Data is now fetched via React Query hooks above

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatStaffID = (_id?: string): string => {
    if (!_id) return "-";
    // Format as 9 digits with leading zeros (e.g., 000005124)
    const num = parseInt(_id, 10) || 0;
    return String(num).padStart(9, "0");
  };

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
    return labels[dept];
  };

  const getStatusLabel = (status: StaffStatus) => {
    const labels: Record<StaffStatus, string> = {
      AVAILABLE: "Available",
      UNAVAILABLE: "Unavailable",
      DAY_OFF: "Day Off",
      ON_LEAVE_ANNUAL: "Annual Leave",
      ON_LEAVE_PUBLIC_HOLIDAY: "Public Holiday",
      ON_LEAVE_SICK: "Sick Leave",
    };
    return labels[status];
  };

  const getStatusIcon = (status: StaffStatus) => {
    switch (status) {
      case "AVAILABLE":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      case "UNAVAILABLE":
        return <XCircle className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />;
      case "DAY_OFF":
        return <Ban className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case "ON_LEAVE_ANNUAL":
        return <Plane className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
      case "ON_LEAVE_PUBLIC_HOLIDAY":
        return <Flag className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
      case "ON_LEAVE_SICK":
        return <Thermometer className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />;
    }
  };

  if (loading) {
    return null;
  }

  if (!loading && (staffError || !staff)) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {staffError ? "Failed to load staff member" : "Staff member not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Early return if displayStaff is null (which handles if staff is null)
  if (!displayStaff) return null;

  // Calculate metrics and get staff data - after hooks but before early returns
  const currentMonth = format(new Date(), "yyyy-MM");
  const metrics = displayStaff ? calculateStaffMetrics(displayStaff, currentMonth, appointments, membershipRecords, ptPackageRecords) : { sales: 0, conduct: 0, salesPercent: 0, conductPercent: 0 };
  
  // Get staff's data
  const staffAppointments = displayStaff ? appointments.filter(
    (apt) => apt.staffId === displayStaff._id && apt.status === "COMPLETED"
  ) : [];
  
  // Get active clients count from PT Package records (for PT) or Membership records (for FC)
  const activeClients = displayStaff ? (() => {
    if (displayStaff.department === "PT" || displayStaff.department === "PTS") {
      const trainerPTRecords = ptPackageRecords.filter(
        (record) => record.assignedStaffName === displayStaff.name
      );
      return trainerPTRecords.length;
    } else if (displayStaff.department === "FC" || displayStaff.department === "FCS") {
      const fcMembershipRecords = membershipRecords.filter(
        (record) => record.assignedStaffName === displayStaff.name
      );
      return fcMembershipRecords.filter(record => {
        const expiry = new Date(record.expiryDate);
        return expiry > new Date();
      }).length;
    }
    return 0;
  })() : 0;
  
  // Calculate total working days from hire date
  const totalWorkingDays = differenceInDays(new Date(), new Date(displayStaff.hireDate));
  
  // Find last activity date
  const lastActivityDates: Date[] = [];
  
  // Add appointment dates
  staffAppointments.forEach(apt => {
    if (apt.date) {
      lastActivityDates.push(new Date(apt.date));
    }
  });
  
  // Add payment dates from PT Package records (for PT) or Membership records (for FC)
  if (displayStaff) {
    if (displayStaff.department === "PT" || displayStaff.department === "PTS") {
      const trainerPTRecords = ptPackageRecords.filter(
        (record) => record.assignedStaffName === displayStaff.name
      );
      trainerPTRecords.forEach(record => {
        if (record.paymentDate) {
          lastActivityDates.push(new Date(record.paymentDate));
        }
      });
    } else if (displayStaff.department === "FC" || displayStaff.department === "FCS") {
      const fcMembershipRecords = membershipRecords.filter(
        (record) => record.assignedStaffName === displayStaff.name
      );
      fcMembershipRecords.forEach(record => {
        if (record.paymentDate) {
          lastActivityDates.push(new Date(record.paymentDate));
        }
      });
    }
  }
  
  // Get the most recent activity date
  const lastActivityDate = lastActivityDates.length > 0 
    ? new Date(Math.max(...lastActivityDates.map(d => d.getTime())))
    : null;
  
  // Calculate days since last activity
  const daysSinceLastActivity = lastActivityDate 
    ? differenceInDays(new Date(), lastActivityDate)
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">
            Profile
          </h1>
        </div>
        {!isOwnProfile && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/dashboard/staff?edit=${displayStaff._id}`)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      {displayStaff && (
        <StaffSettingsDialog 
          open={settingsOpen} 
          onOpenChange={setSettingsOpen} 
          staff={displayStaff} 
        />
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        {/* Left Column - Profile Card */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardContent className="pt-6 flex-1 flex flex-col">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Avatar */}
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={displayStaff.avatar} alt={displayStaff.name} />
                <AvatarFallback 
                  className="text-2xl font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" 
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {getInitials(displayStaff.name)}
                </AvatarFallback>
              </Avatar>

              {/* Name and Title */}
              <div className="space-y-1">
                <h2 className="text-xl font-black italic tracking-tight uppercase font-montserrat">{displayStaff.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {getDepartmentLabel(displayStaff.department)}
                  {displayStaff.level && ` • ${displayStaff.level}`}
                </p>
              </div>

              {/* Status Badge */}
              <Badge
                variant="outline"
                className="gap-1.5 px-3 py-1"
              >
                {getStatusIcon(displayStaff.status)}
                {getStatusLabel(displayStaff.status)}
              </Badge>

              {/* Message Button */}
              <Button variant="outline" className="w-full" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </Button>

              {/* Key Information */}
              <div className="w-full space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Working Days</span>
                  <span className="font-medium font-mono">
                    {totalWorkingDays.toLocaleString()} {totalWorkingDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Active</span>
                  <span className="font-medium font-mono">
                    {daysSinceLastActivity !== null 
                      ? `${daysSinceLastActivity} ${daysSinceLastActivity === 1 ? 'day' : 'days'} ago`
                      : 'No activity'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">StaffID</span>
                  <span className="font-medium font-mono">
                    {displayStaff.staffID || formatStaffID(displayStaff._id)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Stats and Tabs */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Appointments / Expiring Members / Total Issued */}
            <Card className="hover:border-border/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90">
                  {displayStaff.department === "PT" || displayStaff.department === "PTS" 
                    ? "Appointments" 
                    : (displayStaff.department === "FC" || displayStaff.department === "FCS")
                    ? "Expiring Members"
                    : (displayStaff.department === "CC" || displayStaff.department === "CCS")
                    ? "Total Issued"
                    : "Projects Completed"}
                </CardTitle>
                <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20">
                  <Star className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {displayStaff.department === "PT" || displayStaff.department === "PTS" 
                    ? metrics.conduct 
                    : (displayStaff.department === "FC" || displayStaff.department === "FCS")
                    ? (() => {
                        // Count memberships with expiring_soon status
                        const expiringCount = fcMembershipRecords.filter(record => {
                          const expiry = new Date(record.expiryDate);
                          const now = new Date();
                          const daysUntilExpiry = differenceInDays(expiry, now);
                          return daysUntilExpiry > 7 && daysUntilExpiry <= 14;
                        }).length;
                        return expiringCount;
                      })()
                    : (displayStaff.department === "CC" || displayStaff.department === "CCS")
                    ? combinedCCRecords.length
                    : activeClients}
                </div>
              </CardContent>
            </Card>

            {/* Active Clients (PT Package Invoices) / Team Members */}
            <Card className="hover:border-border/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90">
                  {displayStaff.department === "PT" || displayStaff.department === "PTS"
                    ? "Active Clients" 
                    : displayStaff.department === "FC" || displayStaff.department === "FCS"
                    ? "Active Clients"
                    : "Team Members"}
                </CardTitle>
                <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/20">
                  <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {displayStaff.department === "PT" || displayStaff.department === "PTS"
                    ? (() => {
                        const trainerPTRecords = ptPackageRecords.filter(
                          (record) => record.assignedStaffName === displayStaff.name
                        );
                        return trainerPTRecords.length > 0 ? trainerPTRecords.length.toLocaleString() : "0";
                      })()
                    : activeClients > 0 ? activeClients.toLocaleString() : "0"}
                </div>
              </CardContent>
            </Card>

            {/* Satisfaction Rate / Sales Performance */}
            <Card className="hover:border-border/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90">
                  {displayStaff.monthlySaleTarget !== undefined
                    ? "Sales Performance" 
                    : (displayStaff.department === "CC" || displayStaff.department === "CCS")
                    ? "Satisfaction Rate"
                    : "Satisfaction Rate"}
                </CardTitle>
                <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                  {displayStaff.monthlySaleTarget !== undefined ? (
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Star className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {displayStaff.monthlySaleTarget !== undefined
                    ? `${metrics.salesPercent.toFixed(0)}%`
                    : (() => {
                        if (displayStaff.department === "CC" || displayStaff.department === "CCS") {
                          const avgRating = getStaffAverageRating(displayStaff._id || "");
                          const ratingCount = getStaffRatingCount(displayStaff._id || "");
                          if (avgRating !== null) {
                            return `${(avgRating * 25).toFixed(0)}%`;
                          }
                          return "N/A";
                        }
                        return "99%";
                      })()}
                </div>
                {(displayStaff.department === "CC" || displayStaff.department === "CCS") && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {(() => {
                      const ratingCount = getStaffRatingCount(displayStaff._id || "");
                      const avgRating = getStaffAverageRating(displayStaff._id || "");
                      if (ratingCount > 0 && avgRating !== null) {
                        return `${ratingCount} rating${ratingCount > 1 ? 's' : ''} • ${avgRating.toFixed(1)}/4.0`;
                      }
                      return "No ratings yet";
                    })()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="information" className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="information" className="text-xs sm:text-sm">
                <User className="mr-2 h-4 w-4" />
                Information
              </TabsTrigger>
              <TabsTrigger value="work-details" className="text-xs sm:text-sm">
                <Briefcase className="mr-2 h-4 w-4" />
                Work Details
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm">
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </TabsTrigger>
            </TabsList>

            {/* Tab Content Container - Fixed Height */}
            <div className="mt-6 flex-1 flex flex-col min-h-[400px]">
              {/* Information Tab */}
              <TabsContent value="information" className="mt-0 flex-1 flex flex-col">
                <div className="grid gap-4 md:grid-cols-2 flex-1">
                  {/* Personal Information */}
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Name</p>
                            <p className="text-sm font-medium">{displayStaff.name}</p>
                          </div>
                        </div>
                        {displayStaff.staffID && (
                          <div className="flex items-center gap-3">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Staff ID</p>
                              <p className="text-sm font-mono font-medium">{displayStaff.staffID}</p>
                            </div>
                          </div>
                        )}
                        {displayStaff.dateOfBirth && (
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Date of Birth</p>
                              <p className="text-sm font-medium">
                                {format(new Date(displayStaff.dateOfBirth), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        )}
                        {displayStaff.address && (
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Address</p>
                              <p className="text-sm font-medium">{displayStaff.address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <div className="space-y-3">
                        {displayStaff.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium">{displayStaff.email}</p>
                            </div>
                          </div>
                        )}
                        {displayStaff.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="text-sm font-medium">{displayStaff.phone}</p>
                            </div>
                          </div>
                        )}
                        {displayStaff.emergencyPhoneName && displayStaff.emergencyPhone && (
                          <div className="flex items-center gap-3">
                            <PhoneCall className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Emergency Contact</p>
                              <p className="text-sm font-medium">
                                {displayStaff.emergencyPhoneName} - {displayStaff.emergencyPhone}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Work Details Tab */}
              <TabsContent value="work-details" className="mt-0 flex-1 flex flex-col">
                <div className="grid gap-4 md:grid-cols-2 flex-1">
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">Work Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Department</p>
                            <p className="text-sm font-medium">{getDepartmentLabel(displayStaff.department)}</p>
                          </div>
                        </div>
                        {displayStaff.level && (
                          <div className="flex items-center gap-3">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Level</p>
                              <p className="text-sm font-medium">{displayStaff.level}</p>
                            </div>
                          </div>
                        )}
                        {displayStaff.shift && (
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Shift</p>
                              <p className="text-sm font-medium">{displayStaff.shift}</p>
                            </div>
                          </div>
                        )}
                        {displayStaff.dayOff && (
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Day Off</p>
                              <p className="text-sm font-medium">{displayStaff.dayOff}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Hire Date</p>
                            <p className="text-sm font-medium">
                              {format(new Date(displayStaff.hireDate), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">Leave & Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {/* Leave Stats with Ring Indicators */}
                      <div className="grid grid-cols-4 gap-2 mb-6">
                        {/* Annual Leave */}
                        <div className="flex flex-col items-center gap-2">
                          <RingIndicator 
                            actual={displayStaff.annualLeaveUsed || 0} 
                            target={displayStaff.annualLeaveBalance || 18} 
                            size={60} 
                            strokeWidth={4}
                            color="amber" 
                          />
                          <div className="flex items-center gap-1.5">
                            <Plane className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs text-muted-foreground font-medium">Annual</span>
                          </div>
                        </div>

                        {/* Public Holiday */}
                        <div className="flex flex-col items-center gap-2">
                          <RingIndicator 
                            actual={displayStaff.publicHolidayUsed || 0} 
                            target={displayStaff.publicHolidayBalance || 11} 
                            size={60} 
                            strokeWidth={4}
                            color="purple" 
                          />
                          <div className="flex items-center gap-1.5">
                            <Flag className="h-3.5 w-3.5 text-purple-500" />
                            <span className="text-xs text-muted-foreground font-medium">Public Holiday</span>
                          </div>
                        </div>

                        {/* Sick Leave */}
                        <div className="flex flex-col items-center gap-2">
                          <RingIndicator 
                            actual={displayStaff.sickLeaveUsed || 0} 
                            target={displayStaff.sickLeaveBalance || 14} 
                            size={60} 
                            strokeWidth={4}
                            color="red" 
                          />
                          <div className="flex items-center gap-1.5">
                            <Thermometer className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-xs text-muted-foreground font-medium">Sick Leave</span>
                          </div>
                        </div>

                        {/* Unpaid Leave */}
                        <div className="flex flex-col items-center gap-2">
                          <RingIndicator 
                            actual={displayStaff.unpaidLeaveUsed || 0} 
                            // No target for Unpaid Leave
                            size={60} 
                            strokeWidth={4}
                            color="blue" 
                          />
                          <div className="flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-xs text-muted-foreground font-medium">Unpaid</span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Targets if applicable */}
                      {(displayStaff.monthlySaleTarget !== undefined || displayStaff.monthlyConductTarget !== undefined || displayStaff.commissionPercentage !== undefined) && (
                        <div className="space-y-3 border-t pt-4">
                          <p className="text-xs font-semibold text-muted-foreground">Performance Targets</p>
                          <div className="grid grid-cols-2 gap-4">
                            {displayStaff.monthlySaleTarget !== undefined && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Sale Target</p>
                                <p className="text-base font-mono font-semibold">
                                  ${displayStaff.monthlySaleTarget.toLocaleString()}
                                </p>
                              </div>
                            )}
                            {displayStaff.monthlyConductTarget !== undefined && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Conduct Target</p>
                                <p className="text-base font-mono font-semibold">
                                  {displayStaff.monthlyConductTarget} sessions
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-0 flex-1 flex flex-col">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base">Documents</CardTitle>
                    <label htmlFor="staff-document-upload" className="cursor-pointer">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('staff-document-upload') as HTMLInputElement;
                          input?.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </label>
                    <input
                      id="staff-document-upload"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && displayStaff) {
                          handleStaffDocumentUpload(file);
                          // Reset input to allow uploading the same file again
                          e.target.value = '';
                        }
                      }}
                    />
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <StaffDocumentsSection staff={displayStaff} />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Performance Tables - Only for PT/PTS - Placed below all cards */}
      {(displayStaff.department === "PT" || displayStaff.department === "PTS") && (
        <div className="space-y-6">
          {/* Appointments Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Appointments</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    // Export appointments to Excel
                    const csvContent = [
                      ["Date", "Time", "Client", "Session Type", "Duration", "Status"],
                      ...allStaffAppointments.map(apt => [
                        apt.date ? format(new Date(apt.date), "MMM dd, yyyy") : "-",
                        apt.time || "-",
                        apt.clientName || "Client",
                        apt.type || "Session",
                        `${apt.duration || 0} min`,
                        apt.status || "-"
                      ])
                    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                    
                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const link = document.createElement("a");
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", `appointments-${displayStaff.name.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`);
                    link.style.visibility = "hidden";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Export appointments to PDF with styled design
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      const htmlContent = `
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <title>Appointments Report - ${displayStaff.name}</title>
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
                            <style>
                              @page {
                                size: landscape;
                                margin: 1cm;
                              }
                              @media print {
                                @page {
                                  size: landscape;
                                  margin: 1cm;
                                }
                              }
                              body {
                                font-family: Arial, sans-serif;
                                font-size: 12px;
                                padding: 20px;
                              }
                              .header {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                gap: 12px;
                                margin-bottom: 30px;
                              }
                              .logo-badge {
                                background-color: #000;
                                color: #fff;
                                width: 40px;
                                height: 40px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                border-radius: 8px;
                                font-family: 'Montserrat', sans-serif;
                              }
                              .logo-badge span {
                                font-size: 14px;
                                font-weight: 900;
                                font-style: italic;
                                line-height: 1;
                              }
                              .logo-text {
                                display: flex;
                                flex-direction: column;
                                text-align: left;
                                font-family: 'Montserrat', sans-serif;
                              }
                              .logo-text .logo-line1 {
                                font-size: 18px;
                                font-weight: 900;
                                font-style: italic;
                                letter-spacing: 0.05em;
                                line-height: 1;
                              }
                              .logo-text .logo-line2 {
                                font-size: 18px;
                                font-weight: 900;
                                font-style: italic;
                                letter-spacing: 0.05em;
                                line-height: 1;
                                margin-top: -2px;
                                padding-left: 0.6em;
                              }
                              h1 {
                                text-align: center;
                                margin-bottom: 20px;
                                font-family: 'Montserrat', sans-serif;
                                font-weight: 900;
                                font-style: italic;
                                font-size: 24px;
                                text-transform: uppercase;
                              }
                              .info {
                                margin-bottom: 15px;
                                font-size: 11px;
                                color: #666;
                              }
                              table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                              }
                              th, td {
                                border: 1px solid #ddd;
                                padding: 8px;
                                text-align: left;
                              }
                              th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                              }
                              tr:nth-child(even) {
                                background-color: #f9f9f9;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div class="logo-badge">
                                <span>TP</span>
                              </div>
                              <div class="logo-text">
                                <span class="logo-line1">THE</span>
                                <span class="logo-line2">PLACE</span>
                              </div>
                            </div>
                            <h1>Appointments Report</h1>
                            <div class="info">
                              <p>Staff: ${displayStaff.name}</p>
                              <p>Generated on: ${format(new Date(), "MMM dd, yyyy 'at' HH:mm")}</p>
                              <p>Total Records: ${allStaffAppointments.length}</p>
                            </div>
                            <table>
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Time</th>
                                  <th>Client</th>
                                  <th>Session Type</th>
                                  <th>Duration</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${allStaffAppointments.map(apt => `
                                  <tr>
                                    <td>${apt.date ? format(new Date(apt.date), "MMM dd, yyyy") : "-"}</td>
                                    <td>${apt.time || "-"}</td>
                                    <td>${apt.clientName || "Client"}</td>
                                    <td>${apt.type || "Session"}</td>
                                    <td>${apt.duration || 0} min</td>
                                    <td>${apt.status || "-"}</td>
                                  </tr>
                                `).join("")}
                              </tbody>
                            </table>
                          </body>
                        </html>
                      `;
                      printWindow.document.write(htmlContent);
                      printWindow.document.close();
                      printWindow.onload = () => {
                        printWindow.print();
                      };
                    }
                  }}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <AppointmentsTable
                appointments={paginatedAppointments}
                totalRows={allStaffAppointments.length}
                sorting={appointmentsSorting}
                onSort={setAppointmentsSorting}
                pagination={appointmentsPagination}
                onPaginationChange={setAppointmentsPagination}
                pageCount={Math.ceil(allStaffAppointments.length / appointmentsPagination.pageSize)}
                ptPackageRecords={ptPackageRecords}
              />
            </CardContent>
          </Card>

          {/* Active Clients Table (PT Package Records) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Active Clients</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    exportPTPackagesToExcel(trainerPTRecords);
                  }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    exportPTPackagesToPDF(trainerPTRecords);
                  }}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <TrainerPTRecordsTable
                appointments={appointments}
                records={paginatedPTRecords}
                totalRows={trainerPTRecords.length}
                sorting={ptRecordsSorting}
                onSort={setPTRecordsSorting}
                pagination={ptRecordsPagination}
                onPaginationChange={setPTRecordsPagination}
                pageCount={Math.ceil(trainerPTRecords.length / ptRecordsPagination.pageSize)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Membership Records Table - Only for FC/FCS - Placed below all cards */}
      {(displayStaff.department === "FC" || displayStaff.department === "FCS") && (
        <div className="space-y-6">
          {/* Active Clients Table (Membership Records) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">My Members</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    exportMembershipsToExcel(fcMembershipRecords);
                  }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    exportMembershipsToPDF(fcMembershipRecords);
                  }}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <FCMembershipRecordsTable
                records={paginatedMembershipRecords}
                totalRows={fcMembershipRecords.length}
                sorting={membershipRecordsSorting}
                onSort={setMembershipRecordsSorting}
                pagination={membershipRecordsPagination}
                onPaginationChange={setMembershipRecordsPagination}
                pageCount={Math.ceil(fcMembershipRecords.length / membershipRecordsPagination.pageSize)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Issued Records Table - Only for CC/CCS - Placed below all cards */}
      {(displayStaff.department === "CC" || displayStaff.department === "CCS") && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">Issued Records</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    exportMembershipsToExcel(ccIssuedMembershipRecords);
                  }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Memberships as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    exportMembershipsToPDF(ccIssuedMembershipRecords);
                  }}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export Memberships as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    exportPTPackagesToExcel(ccIssuedPTPackageRecords);
                  }}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export PT Packages as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    exportPTPackagesToPDF(ccIssuedPTPackageRecords);
                  }}>
                    <FileText className="mr-2 h-4 w-4" />
                    Export PT Packages as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <CCIssuedRecordsTable
                membershipRecords={ccIssuedMembershipRecords}
                ptPackageRecords={ccIssuedPTPackageRecords}
                totalRows={combinedCCRecords.length}
                sorting={ccIssuedRecordsSorting}
                onSort={setCCIssuedRecordsSorting}
                pagination={ccIssuedRecordsPagination}
                onPaginationChange={setCCIssuedRecordsPagination}
                pageCount={Math.ceil(combinedCCRecords.length / ccIssuedRecordsPagination.pageSize)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Staff Documents Section Component
function StaffDocumentsSection({ staff }: { staff: Staff }) {
  const [selectedDocument, setSelectedDocument] = useState<StaffDocument | null>(null);
  const documents = staff.documents || [];

  const handleDownload = (doc: StaffDocument) => {
    const link = document.createElement("a");
    link.href = doc.url;
    link.download = doc.name;
    link.click();
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4">
        {/* Documents List */}
        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(doc.uploadedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No documents uploaded</p>
          </div>
        )}
      </ScrollArea>

      {/* Document View Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.name}</DialogTitle>
            <DialogDescription>
              Uploaded on {selectedDocument ? format(new Date(selectedDocument.uploadedAt), "PPP") : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="mt-4">
              {selectedDocument.type === 'image' ? (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.name}
                  className="max-w-full max-h-[70vh] object-contain mx-auto rounded-lg"
                />
              ) : selectedDocument.type === 'pdf' ? (
                <iframe
                  src={selectedDocument.url}
                  className="w-full h-[70vh] rounded-lg border"
                  title={selectedDocument.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Preview not available for this file type</p>
                  <Button onClick={() => selectedDocument && handleDownload(selectedDocument)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download to View
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
