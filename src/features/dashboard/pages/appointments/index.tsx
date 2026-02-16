"use client";

import { useState, useEffect, useMemo } from "react";
import { Appointment, AppointmentStatus, AppointmentType } from "@/types/appointment";
import { Staff } from "@/types/staff";
import { useMembers } from "@/features/dashboard/pages/members/hooks/use-members";
import { useStaff } from "@/hooks/use-staff";
import { useAppointments, useCreateAppointment, useUpdateAppointment, useDeleteAppointment } from "@/hooks/use-appointments";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useRoster } from "@/hooks/use-roster";
import { useAuth } from "@/hooks/use-auth";
import { useCreateRequest } from "@/hooks/use-requests";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { differenceInDays, isAfter, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format, startOfWeek, addDays, isSameDay, isToday, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, parseISO, isPast } from "date-fns";
import { toast } from "sonner";
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  BarChart3,
  Save,
  Trash2,
  ArrowUpCircle,
  CheckCircle,
  XCircle as CancelIcon,
  UserCheck,
  Dumbbell,
  User2,
  Package,
  FileText,
  Star,
  MoreVertical,
  Edit
} from "lucide-react";

// Helper function to get initials from name
const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Ring indicator component for PT Package - shows balance/total
// Color: Green when high balance (good), Red when low balance (warning)
const BalanceRingIndicator = ({
  balance,
  total,
  size = 34,
  strokeWidth = 3,
}: {
  balance: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) => {
  // Calculate percentage of balance remaining (balance / total)
  const percentage = total > 0 ? (balance / total) * 100 : 0;
  const normalizedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // Calculate radius accounting for stroke width to prevent clipping
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalizedPercentage / 100) * circumference;

  // Color logic: Green when high balance (good), Red when low balance (warning)
  let ringColor = "stroke-slate-400 dark:stroke-slate-500";
  if (normalizedPercentage >= 75) {
    ringColor = "stroke-emerald-500 dark:stroke-emerald-400"; // High balance = Green
  } else if (normalizedPercentage >= 50) {
    ringColor = "stroke-amber-500 dark:stroke-amber-400"; // Medium balance = Amber
  } else if (normalizedPercentage >= 25) {
    ringColor = "stroke-orange-500 dark:stroke-orange-400"; // Low balance = Orange
  } else if (normalizedPercentage > 0) {
    ringColor = "stroke-red-500 dark:stroke-red-400"; // Very low balance = Red
  }

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-500 ease-out ${ringColor}`}
          style={{ 
            transformOrigin: `${center}px ${center}px`,
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="font-mono text-xs font-bold text-foreground tracking-tighter leading-none">
          {balance}
        </span>
      </div>
    </div>
  );
};

// SessionType colors configuration

const sessionTypeColors = {
  strength: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  cardio: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  yoga: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  hiit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  mobility: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  pilates: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
  powerlifting: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
};

const getCapacityStatus = (booked: number, capacity: number) => {
  const percentage = (booked / capacity) * 100;
  if (percentage >= 100) return { status: 'full', color: 'text-red-600', icon: XCircle };
  if (percentage >= 80) return { status: 'filling', color: 'text-yellow-600', icon: AlertCircle };
  return { status: 'available', color: 'text-green-600', icon: CheckCircle2 };
};

const getSessionStatus = (status: string) => {
  switch (status) {
    case 'completed':
      return { 
        status: 'Completed', 
        color: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400', 
        icon: CheckCircle 
      };
    case 'scheduled':
      return { 
        status: 'Scheduled', 
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400', 
        icon: ArrowUpCircle 
      };
    case 'in_progress':
      return { 
        status: 'In Progress', 
        color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400', 
        icon: Clock 
      };
    case 'upcoming': // Legacy support
      return { 
        status: 'Scheduled', 
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400', 
        icon: ArrowUpCircle 
      };
    case 'cancelled':
      return { 
        status: 'Cancelled', 
        color: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400', 
        icon: CancelIcon 
      };
    default:
      return { 
        status: 'Unknown', 
        color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400', 
        icon: AlertCircle 
      };
  }
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Utility function to determine appointment status based on timing
const getAppointmentStatusByTiming = (appointment: any, currentDate: Date = new Date()) => {
  const scheduledDate = appointment.scheduledDate || appointment.date;
  const startTime = appointment.startTime || appointment.time;
  const endTime = appointment.endTime || (() => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const end = new Date(new Date(scheduledDate));
    end.setHours(hours, minutes + 60, 0, 0);
    return format(end, "HH:mm");
  })();
  const status = appointment.status || appointment.originalStatus || 'scheduled';
  
  // If appointment is manually cancelled, return cancelled
  if (status === 'cancelled' || status === 'CANCELLED') {
    return 'cancelled';
  }
  
  // If appointment is manually completed, return completed
  if (status === 'completed' || status === 'COMPLETED') {
    return 'completed';
  }
  
  // Create appointment start and end datetime objects
  const appointmentDate = new Date(scheduledDate);
  const appointmentStart = new Date(appointmentDate);
  const appointmentEnd = new Date(appointmentDate);
  
  // Parse time strings and set hours/minutes
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  appointmentStart.setHours(startHours, startMinutes || 0, 0, 0);
  appointmentEnd.setHours(endHours, endMinutes || 0, 0, 0);
  
  const now = currentDate;
  
  // Determine status based on timing
  if (now < appointmentStart) {
    // Future appointment
    return 'scheduled';
  } else if (now >= appointmentStart && now <= appointmentEnd) {
    // Currently happening
    return 'in_progress';
  } else {
    // Past appointment (if not manually marked as completed)
    return status === 'completed' || status === 'COMPLETED' ? 'completed' : 'completed';
  }
};

// Utility function to sort appointments by status priority and time
const sortAppointmentsByStatusAndTime = (appointments: any[]) => {
  return appointments.sort((a: any, b: any) => {
    // Define status priority (lower number = higher priority/top position)
    const statusPriority: { [key: string]: number } = {
      'completed': 1,     // Completed appointments at the top
      'in_progress': 2,   // In progress appointments second
      'cancelled': 3,     // Cancelled appointments third
      'scheduled': 4      // Scheduled appointments at the bottom
    };
    
    const aPriority = statusPriority[a.status] || 5;
    const bPriority = statusPriority[b.status] || 5;
    
    // First sort by status priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // If same status, sort by start time (earliest first)
    return a.startTime.localeCompare(b.startTime);
  });
};

// Note: Removed todayClasses as we're focusing on personal training appointments
// Group classes would be handled separately from personal training appointments

export default function AppointmentCalendarPage() {
  // Get current logged-in staff
  const { staff: currentStaff, isSuperAdmin } = useAuth();
  
  // Check if current user is PT or PTS
  const isPTorPTS = currentStaff?.department === "PT" || currentStaff?.department === "PTS";
  const currentTrainerName = currentStaff?.name || "";
  const currentTrainerId = (currentStaff as any)?.staffId || currentStaff?._id || "";
  
  // Get member data from hook
  const { allMembers, isLoading: isLoadingMembers } = useMembers();
  
  // Get staff from API
  const { data: staffData = [] } = useStaff();
  const { data: appointmentsData = [], refetch: refetchAppointments } = useAppointments();
  const { data: ptPackageRecords = [] } = usePTPackageRecords();
  
  // Get today's roster
  const today = new Date();
  const { data: rosterData = [] } = useRoster(today.getMonth() + 1, today.getFullYear());
  
  // Mutation hooks for API operations
  const createAppointmentMutation = useCreateAppointment();
  const updateAppointmentMutation = useUpdateAppointment();
  const deleteAppointmentMutation = useDeleteAppointment();
  const createRequestMutation = useCreateRequest();
  
  // Get trainers (PT/PTS staff)
  const trainers = useMemo(() => {
    return staffData
      .filter((s: Staff) => s.department === "PT" || s.department === "PTS")
      .map((staff: Staff) => ({
        id: staff._id || "",
        name: staff.name,
        avatar: staff.avatar || "",
        role: "trainer",
        status: staff.status === "AVAILABLE" ? "active" : "inactive",
        originalStatus: staff.status, // Preserve original status for validation
        specialties: []
      }));
  }, [staffData]);
  
  // Get all PT/PTS trainers to display in the trainers card
  const trainersWorkingToday = useMemo(() => {
    // Simply return all PT/PTS trainers from the trainers list
    // The trainers list is already filtered for PT/PTS departments
    return trainers.map((trainer) => {
      const staffMember = staffData.find((s: Staff) => s._id === trainer.id);
      return {
        id: trainer.id,
        name: trainer.name,
        avatar: trainer.avatar || staffMember?.avatar || "",
        department: staffMember?.department || "PT",
        email: staffMember?.email || "",
        status: trainer.originalStatus || trainer.status
      };
    });
  }, [trainers, staffData]);

  // Helper function to get status message
  const getStatusMessage = (status: string): string => {
    switch (status) {
      case "UNAVAILABLE":
        return "Unavailable";
      case "DAY_OFF":
        return "Day Off";
      case "ON_LEAVE_ANNUAL":
        return "On Annual Leave";
      case "ON_LEAVE_PUBLIC_HOLIDAY":
        return "On Public Holiday Leave";
      case "ON_LEAVE_SICK":
        return "On Sick Leave";
      default:
        return "Unavailable";
    }
  };
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const loadingMembers = isLoadingMembers;
  const loadingTrainers = false;
  const loadingAppointments = false;
  
  // Update appointments when data changes
  useEffect(() => {
    if (appointmentsData && appointmentsData.length > 0) {
      setAppointments(appointmentsData);
    }
  }, [appointmentsData]);

  // Auto-complete past appointments that haven't been manually completed or cancelled
  useEffect(() => {
    const autoCompletePastAppointments = async () => {
      const now = new Date();
      const appointmentsToUpdate: { id: string }[] = [];

      appointments.forEach((appointment: Appointment) => {
        // Only process SCHEDULED or CONFIRMED appointments
        const status = appointment.status;
        if (status !== "SCHEDULED" && status !== "CONFIRMED") {
          return;
        }

        // Calculate end time
        const appointmentDateTime = new Date(appointment.date);
        const [hours, minutes] = appointment.time.split(":").map(Number);
        appointmentDateTime.setHours(hours, minutes || 0, 0, 0);
        const endDateTime = new Date(appointmentDateTime);
        endDateTime.setMinutes(endDateTime.getMinutes() + appointment.duration);

        // If appointment end time has passed, mark for update
        if (now > endDateTime) {
          appointmentsToUpdate.push({ id: appointment._id || "" });
        }
      });

      // Update all past appointments in parallel
      if (appointmentsToUpdate.length > 0) {
        try {
          await Promise.all(
            appointmentsToUpdate.map((apt) =>
              updateAppointmentMutation.mutateAsync({
                id: apt.id,
                data: { status: "COMPLETED" as AppointmentStatus }
              })
            )
          );
          // Refetch after updates
          await refetchAppointments();
        } catch (error) {
          // Error is handled silently
        }
      }
    };

    // Run auto-completion check when appointments data changes
    if (appointmentsData && appointmentsData.length > 0) {
      autoCompletePastAppointments();
    }

    // Also set up a periodic check (every 5 minutes) to catch appointments that pass their end time
    const interval = setInterval(() => {
      if (appointmentsData && appointmentsData.length > 0) {
        autoCompletePastAppointments();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [appointmentsData, appointments, updateAppointmentMutation, refetchAppointments]);
  
  const refreshAppointments = () => {
    refetchAppointments();
  };
  
  // Calculate remaining sessions for each PT Package Record
  const ptPackageSessions = useMemo(() => {
    const packageSessions: Record<string, { total: number; used: number; remaining: number }> = {};
    
    ptPackageRecords.forEach((pkg: PTPackageRecord) => {
      const completedAppointments = appointments.filter(
        (apt: Appointment) => 
          apt.ptPackageRecordId === pkg.id && 
          apt.status === "COMPLETED"
      );
      
      packageSessions[pkg.id] = {
        total: pkg.ptPackageSessions,
        used: completedAppointments.length,
        remaining: Math.max(0, pkg.ptPackageSessions - completedAppointments.length)
      };
    });
    
    return packageSessions;
  }, [appointments, ptPackageRecords]);
  
  // Get active PT Package Records (not expired, has remaining sessions)
  const activePTPackages = useMemo(() => {
    const now = new Date();
    return ptPackageRecords.filter((pkg: PTPackageRecord) => {
      const expiry = new Date(pkg.expiryDate);
      const sessions = ptPackageSessions[pkg.id];
      return isAfter(expiry, now) && sessions && sessions.remaining > 0;
    });
  }, [ptPackageRecords, ptPackageSessions]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [trainerFilter, setTrainerFilter] = useState<string>("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [isAddAppointmentOpen, setIsAddAppointmentOpen] = useState(false);
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [isEditRequestDialogOpen, setIsEditRequestDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState({
    requestType: "CHANGE_DATE" as "CHANGE_DATE" | "UNDO_SESSION" | "CHANGE_PACKAGE" | "EXTEND_PACKAGE" | "CUT_SESSIONS" | "OTHER",
    reason: "",
    newDate: new Date(),
    newTime: "",
    additionalNotes: ""
  });
  const [newAppointment, setNewAppointment] = useState({
    name: "",
    trainer: "",
    trainerId: "",
    client: "",
    date: new Date(), // Default to today's date
    startTime: `${new Date().getHours().toString().padStart(2, '0')}:00`, // Current hour in HH:00 format
    endTime: "",
    capacity: "1",
    location: "",
    description: "",
    category: "",
    selectedMember: "",
    selectedPackage: ""
  });

  // Auto-calculate end time when start time changes
  const handleStartTimeChange = (time: string) => {
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + 60; // Add 1 hour by default
      const endHours = Math.floor(endMinutes / 60);
      const endTime = `${endHours.toString().padStart(2, '0')}:00`; // Always show HH:00 format
      setNewAppointment(prev => ({ ...prev, startTime: time, endTime }));
    }
  };

  // Initialize end time when component mounts
  useEffect(() => {
    if (newAppointment.startTime && !newAppointment.endTime) {
      handleStartTimeChange(newAppointment.startTime);
    }
  }, [newAppointment.startTime, newAppointment.endTime]);

  // Periodic refresh for appointment status updates (every minute)
  useEffect(() => {
    const interval = setInterval(() => {
      // Force refresh of appointments data to update statuses based on current time
      refreshAppointments();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, []);

  // Get available PT Package Records for selected member
  const getAvailablePackages = (memberId: string) => {
    if (!memberId || memberId === "") return [];
    
    // Find member by ID
    const member = allMembers.find((c) => c.id === memberId);
    if (!member) return [];
    
    // Find PT Package Records for this member (by memberId or memberName)
    let memberPackages = activePTPackages.filter((pkg: PTPackageRecord) => {
      // Match by member number or name
      const matchesId = pkg.memberId === member.memberNumber;
      const matchesName = pkg.memberName.toLowerCase() === member.fullName.toLowerCase();
      return matchesId || matchesName;
    });
    
    // If current user is PT/PTS, filter to only packages assigned to them
    if (isPTorPTS && currentTrainerName) {
      memberPackages = memberPackages.filter((pkg: PTPackageRecord) =>
        pkg.assignedStaffName?.toLowerCase() === currentTrainerName.toLowerCase()
      );
    }
    
    return memberPackages.map((pkg: PTPackageRecord) => {
      const sessions = ptPackageSessions[pkg.id] || { total: pkg.ptPackageSessions, used: 0, remaining: pkg.ptPackageSessions };
      return {
        id: pkg.id,
        packageId: pkg.invoiceNumber,
        ptPackageName: pkg.ptPackageName,
        sessionsTotal: sessions.total,
        sessionsRemaining: sessions.remaining,
        sessionsUsed: sessions.used,
        startDate: pkg.startDate,
        expiryDate: pkg.expiryDate,
        assignedStaffName: pkg.assignedStaffName
      };
    });
  };

  // Get active members with available PT Package sessions
  const getActiveMembers = () => {
    // If current user is PT/PTS, filter packages to only those assigned to them
    let filteredPackages = activePTPackages;
    if (isPTorPTS && currentTrainerName) {
      filteredPackages = activePTPackages.filter((pkg: PTPackageRecord) => 
        pkg.assignedStaffName?.toLowerCase() === currentTrainerName.toLowerCase()
      );
    }
    
    // Get unique member IDs and Names from filtered PT packages
    const activeMemberIds = new Set(filteredPackages.map((pkg) => pkg.memberId));
    const activeMemberNames = new Set(filteredPackages.map((pkg) => pkg.memberName.toLowerCase()));
    
    return allMembers
      .filter((member) => {
         const hasIdMatch = member.memberNumber && activeMemberIds.has(member.memberNumber);
         const hasNameMatch = activeMemberNames.has(member.fullName.toLowerCase());
         return hasIdMatch || hasNameMatch;
      })
      .map((member) => ({
        value: member.id,
        label: member.fullName,
        fullName: member.fullName,
        searchable: `${member.fullName} ${member.email || ""}`,
        disabled: false
      }));
  };

  // Get active trainers
  const getActiveTrainers = () => {
    return trainers
      .filter((staff: any) => staff.role === 'trainer' && staff.status === 'active')
      .map((staff: any) => ({
        value: staff.id,
        label: staff.name,
        name: staff.name,
        avatar: staff.avatar || "",
        searchable: `${staff.name} ${(staff.specialties || []).join(' ')}`,
        disabled: false
      }));
  };

  // Handle member selection
  const handleMemberChange = (memberId: string) => {
    const member = allMembers.find((c) => c.id === memberId);
    setNewAppointment(prev => ({
      ...prev,
      selectedMember: memberId,
      client: member?.fullName || "",
      selectedPackage: "",
      category: ""
    }));
  };

  // Handle package selection
  const handlePackageChange = (packageRecordId: string) => {
    const pkg = ptPackageRecords.find((p: PTPackageRecord) => p.id === packageRecordId);
    
    // Auto-select trainer if package has assigned staff
    let autoSelectedTrainerId = "";
    let autoSelectedTrainerName = "";
    
    if (pkg?.assignedStaffName) {
      // Find trainer by matching assigned staff name
      const matchedTrainer = trainers.find((trainer: any) => 
        trainer.name.toLowerCase() === pkg.assignedStaffName?.toLowerCase()
      );
      
      if (matchedTrainer) {
        autoSelectedTrainerId = matchedTrainer.id;
        autoSelectedTrainerName = matchedTrainer.name;
        
        // Check if trainer is available
        if (matchedTrainer.originalStatus && matchedTrainer.originalStatus !== "AVAILABLE") {
          const statusMessage = getStatusMessage(matchedTrainer.originalStatus);
          toast.warning(
            `Trainer ${matchedTrainer.name} is ${statusMessage}`,
            {
              description: "Please make an appointment on another day.",
              duration: 5000,
            }
          );
        }
      }
    }
    
    setNewAppointment(prev => ({
      ...prev,
      selectedPackage: packageRecordId,
      category: "PT Session",
      trainerId: autoSelectedTrainerId || prev.trainerId, // Keep existing trainer if no match found
      trainer: autoSelectedTrainerName || prev.trainer
    }));
  };

  // Handle trainer selection
  const handleTrainerChange = (trainerId: string) => {
    const trainer = trainers.find((t: any) => t.id === trainerId);
    
    // Check if trainer is available
    if (trainer?.originalStatus && trainer.originalStatus !== "AVAILABLE") {
      const statusMessage = getStatusMessage(trainer.originalStatus);
      toast.warning(
        `Trainer ${trainer.name} is ${statusMessage}`,
        {
          description: "Please make an appointment on another day.",
          duration: 5000,
        }
      );
    }
    
    setNewAppointment(prev => ({
      ...prev,
      trainerId: trainerId,
      trainer: trainer?.name || ""
    }));
  };

  // Function to get appointments for a specific date using current app's data structure
  const getSessionsForDate = (date: Date) => {
    return appointments.filter((appointment: Appointment) => {
      const appointmentDate = new Date(appointment.date);
      return isSameDay(appointmentDate, date);
    }).map((appointment: Appointment) => {
      const appointmentDateTime = new Date(appointment.date);
      const [hours, minutes] = appointment.time.split(":").map(Number);
      appointmentDateTime.setHours(hours, minutes || 0, 0, 0);
      const endDateTime = new Date(appointmentDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + appointment.duration);
      
      const now = new Date();
      let status = appointment.status.toLowerCase() as string;
      
      // Always respect manually set statuses first (CANCELLED, NO_SHOW, COMPLETED)
      // Check original status (uppercase) to ensure we catch all cases
      if (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") {
        status = 'cancelled';
      } else if (appointment.status === "COMPLETED") {
        status = 'completed';
      } else if (status === 'scheduled' || status === 'confirmed') {
        // Determine status based on timing only for SCHEDULED or CONFIRMED appointments
        if (now < appointmentDateTime) {
          status = 'scheduled';
        } else if (now >= appointmentDateTime && now <= endDateTime) {
          status = 'in_progress';
        } else {
          // Past scheduled appointment - mark as completed
          status = 'completed';
        }
      }
      
      // Get PT Package info if linked
      let packageInfo: {
        packageId: string;
        packageType: string;
        packageSessions: {
          total: number;
          remaining: number;
          used: number;
        };
      } = {
        packageId: 'N/A',
        packageType: appointment.type,
        packageSessions: {
          total: 0,
          remaining: 0,
          used: 0
        }
      };

      // Session order within the package (1 of N)
      let packageSequenceNumber = 0;

      if (appointment.ptPackageRecordId) {
        const ptPackage = ptPackageRecords.find((p: PTPackageRecord) => p.id === appointment.ptPackageRecordId);
        if (ptPackage) {
          const sessions = ptPackageSessions[ptPackage.id] || {
            total: ptPackage.ptPackageSessions,
            used: 0,
            remaining: ptPackage.ptPackageSessions
          };

          // Compute the sequence number of this appointment within its package,
          // based on chronological order, but ONLY counting COMPLETED appointments.
          // Cancelled appointments don't count towards the sequence number.
          const relatedAppointments = appointments
            .filter((apt: Appointment) => apt.ptPackageRecordId === ptPackage.id)
            .sort((a: Appointment, b: Appointment) => {
              const aDate = new Date(a.date).getTime();
              const bDate = new Date(b.date).getTime();
              if (aDate !== bDate) return aDate - bDate;
              return a.time.localeCompare(b.time);
            });

          // Find the index of this appointment in the chronological list
          const currentAppointmentIndex = relatedAppointments.findIndex(
            (apt: Appointment) => apt._id === appointment._id
          );

          if (currentAppointmentIndex >= 0) {
            // Count only COMPLETED appointments that come before this appointment
            const completedBeforeThis = relatedAppointments
              .slice(0, currentAppointmentIndex)
              .filter((apt: Appointment) => apt.status === "COMPLETED").length;
            
            // If this appointment is COMPLETED, add 1 to the count
            // If it's cancelled or scheduled, don't count it
            if (appointment.status === "COMPLETED") {
              packageSequenceNumber = completedBeforeThis + 1;
            } else {
              // For cancelled/scheduled appointments, show the next sequence number
              // that would be used if this appointment were completed
              packageSequenceNumber = completedBeforeThis + 1;
            }
          }

          packageInfo = {
            packageId: ptPackage.invoiceNumber,
            packageType: ptPackage.ptPackageName,
            packageSessions: {
              total: sessions.total,
              remaining: sessions.remaining,
              used: sessions.used
            }
          };
        }
      }
      
      return {
        id: appointment._id || "",
        name: `${appointment.type} - ${appointment.staffName}`,
        category: appointment.type.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        startTime: appointment.time,
        endTime: format(endDateTime, "HH:mm"),
        trainer: appointment.staffName,
        location: appointment.location || "BKK 1",
        client: appointment.clientName,
        sessionType: appointment.type,
        sessionNumber: appointment.appointmentNumber || appointment._id || 'N/A',
        status: status,
        originalStatus: appointment.status,
        notes: appointment.notes,
        packageId: packageInfo.packageId,
        packageType: packageInfo.packageType,
        packageSessions: packageInfo.packageSessions,
        packageSequenceNumber,
        scheduledDate: appointment.date,
        ptPackageRecordId: appointment.ptPackageRecordId,
        originalAppointmentStatus: appointment.status // Preserve original status for accurate calculations
      };
    });
  };


  // Get current date sessions (use real data, fallback to demo if empty)
  const currentDaySessions = getSessionsForDate(currentDate);

  // Function to get filtered sessions for the current view
  const getFilteredSessions = () => {
    let sessions: any[] = [];
    
    if (view === "day") {
      sessions = getSessionsForDate(currentDate);
    } else if (view === "week") {
      // For weekly view, get sessions for all days in the week
      const days = getDaysInView();
      sessions = days.flatMap(day => getSessionsForDate(day));
    } else if (view === "month") {
      // For monthly view, get sessions for all days in the month
      const days = getDaysInView();
      sessions = days.flatMap(day => getSessionsForDate(day));
    }

    // Apply filters
    if (searchTerm) {
      sessions = sessions.filter((session: any) =>
        session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.client.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      sessions = sessions.filter((session: any) => session.category === categoryFilter);
    }

    if (trainerFilter !== "all") {
      sessions = sessions.filter((session: any) => 
        session.trainer?.toLowerCase().trim() === trainerFilter.toLowerCase().trim()
      );
    }

    return sessions;
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
  };

  const handleTrainerFilter = (trainer: string) => {
    setTrainerFilter(trainer);
  };

  const handleAddAppointment = async () => {
    if (!newAppointment.selectedMember || !newAppointment.trainerId || !newAppointment.date || !newAppointment.startTime || !newAppointment.selectedPackage) return;

    setIsBookingLoading(true);

    try {
      // Get member info
      const member = allMembers.find((c) => c.id === newAppointment.selectedMember);
      if (!member) {
        throw new Error("Member not found");
      }
      
      // Get PT Package Record
      const ptPackage = ptPackageRecords.find((p: PTPackageRecord) => p.id === newAppointment.selectedPackage);
      if (!ptPackage) {
        throw new Error("PT Package not found");
      }
      
      // Check if package has remaining sessions
      const sessions = ptPackageSessions[ptPackage.id];
      if (!sessions || sessions.remaining <= 0) {
        throw new Error("No remaining sessions in this package");
      }
      
      const sessionType = newAppointment.category || "PT Session";
      
      // Calculate duration
      const [startHours, startMinutes] = newAppointment.startTime.split(":").map(Number);
      const [endHours, endMinutes] = newAppointment.endTime.split(":").map(Number);
      const startMinutesTotal = startHours * 60 + startMinutes;
      const endMinutesTotal = endHours * 60 + endMinutes;
      const duration = endMinutesTotal - startMinutesTotal;
      
      // Format date for API
      const appointmentDate = newAppointment.date instanceof Date 
        ? newAppointment.date.toISOString() 
        : new Date(newAppointment.date).toISOString();
      
      // Create appointment via API
      await createAppointmentMutation.mutateAsync({
        clientId: newAppointment.selectedMember,
        clientName: member.fullName,
        staffId: newAppointment.trainerId,
        staffName: newAppointment.trainer,
        date: appointmentDate,
        time: newAppointment.startTime,
        duration: duration,
        type: (sessionType || "PT Session") as AppointmentType,
        status: "SCHEDULED",
        notes: newAppointment.description,
        location: newAppointment.location || "BKK 1",
        ptPackageRecordId: ptPackage.id
      });

      setIsAddAppointmentOpen(false);
      setNewAppointment({
        name: "",
        trainer: "",
        trainerId: "",
        client: "",
        date: new Date(),
        startTime: `${new Date().getHours().toString().padStart(2, '0')}:00`,
        endTime: "",
        capacity: "1",
        location: "",
        description: "",
        category: "",
        selectedMember: "",
        selectedPackage: ""
      });
    } catch (error: any) {
      // Error is already handled by the mutation hook
      // Error is already handled by the mutation hook
    } finally {
      setIsBookingLoading(false);
    }
  };

  const handleAppointmentClick = (appointmentItem: any) => {
    setSelectedAppointment(appointmentItem);
    setIsAppointmentDialogOpen(true);
  };

  const handleDeleteAppointment = () => {
    if (!selectedAppointment) return;
    setIsDeleteConfirmDialogOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      // Delete appointment via API
      await deleteAppointmentMutation.mutateAsync(selectedAppointment.id);
      setIsAppointmentDialogOpen(false);
      setIsDeleteConfirmDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error: any) {
      // Error is already handled by the mutation hook
      setIsDeleteConfirmDialogOpen(false);
    }
  };


  const handleCompleteAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      // Complete the appointment via API
      await updateAppointmentMutation.mutateAsync({
        id: selectedAppointment.id,
        data: { status: "COMPLETED" as AppointmentStatus }
      });
      
      // Force refetch appointments to ensure all pages get updated data
      await refetchAppointments();
      
      // Show success message
      toast.success("Session completed successfully!", {
        description: "Great work! 1 sessions completed.",
        duration: 5000
      });
      
      setIsAppointmentDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error: any) {
      // Error is already handled by the mutation hook
      // Error is already handled by the mutation hook
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      // Cancel appointment via API
      await updateAppointmentMutation.mutateAsync({
        id: selectedAppointment.id,
        data: { status: "CANCELLED" as AppointmentStatus }
      });
      
      // Force refetch appointments to ensure all pages get updated data
      await refetchAppointments();
      
      toast.success("Session cancelled successfully");
      
      setIsAppointmentDialogOpen(false);
      setSelectedAppointment(null);
    } catch (error: any) {
      // Error is already handled by the mutation hook
      // Error is already handled by the mutation hook
    }
  };

  const handleSubmitEditRequest = async () => {
    if (!selectedAppointment || !currentStaff) return;
    
    if (!editRequest.reason.trim()) {
      toast.error("Please provide a reason for this request");
      return;
    }

    if (editRequest.requestType === "CHANGE_DATE" && !editRequest.newTime) {
      toast.error("Please provide a new time for the appointment");
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        requestType: editRequest.requestType,
        appointmentId: selectedAppointment.id || selectedAppointment._id,
        ptPackageRecordId: selectedAppointment.ptPackageRecordId,
        requestedBy: currentTrainerId,
        requestedByName: currentTrainerName,
        reason: editRequest.reason,
        newDate: editRequest.requestType === "CHANGE_DATE" ? editRequest.newDate.toISOString() : undefined,
        newTime: editRequest.requestType === "CHANGE_DATE" ? editRequest.newTime : undefined,
        additionalNotes: editRequest.additionalNotes || undefined,
      });

      toast.success("Request submitted successfully. SuperAdmin will review your request.");
      setIsEditRequestDialogOpen(false);
      setIsAppointmentDialogOpen(false);
      setSelectedAppointment(null);
      setEditRequest({
        requestType: "CHANGE_DATE",
        reason: "",
        newDate: new Date(),
        newTime: "",
        additionalNotes: ""
      });
    } catch (error) {
      toast.error("Failed to submit request");
    }
  };

  const getDaysInView = () => {
    switch (view) {
      case "day":
        return [currentDate];
      case "week":
        const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
      case "month":
        const startOfMonthDate = startOfMonth(currentDate);
        const endOfMonthDate = endOfMonth(currentDate);
        return eachDayOfInterval({ start: startOfMonthDate, end: endOfMonthDate });
      default:
        return [currentDate];
    }
  };

  const navigate = (direction: "prev" | "next") => {
    let newDate = new Date(currentDate);
    if (view === "day") {
      newDate = addDays(newDate, direction === "next" ? 1 : -1);
    } else if (view === "week") {
      newDate = addDays(newDate, direction === "next" ? 7 : -7);
    } else if (view === "month") {
      newDate = addMonths(newDate, direction === "next" ? 1 : -1);
    }
    setCurrentDate(newDate);
  };
  
  // Get filtered sessions for stats (applies all current filters)
  const getFilteredSessionsForStats = () => {
    // Filter out cancelled appointments - only show upcoming/active appointments
    let sessions = currentDaySessions.filter((session: any) => 
      session.status !== 'cancelled' && session.originalStatus !== "CANCELLED" && session.originalStatus !== "NO_SHOW"
    );

    // Apply filters
    if (searchTerm) {
      sessions = sessions.filter((session: any) =>
        session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.client.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      sessions = sessions.filter((session: any) => session.category === categoryFilter);
    }

    if (trainerFilter !== "all") {
      sessions = sessions.filter((session: any) => 
        session.trainer?.toLowerCase().trim() === trainerFilter.toLowerCase().trim()
      );
    }

    return sessions;
  };

  const filteredSessionsForStats = getFilteredSessionsForStats();
  
  const sessionStats = {
    total: filteredSessionsForStats.length,
    booked: filteredSessionsForStats.filter((s: any) => (s.packageSessions?.used || 0) > 0).length,
    available: filteredSessionsForStats.filter((s: any) => (s.packageSessions?.remaining || 0) > 0).length,
    totalCapacity: filteredSessionsForStats.reduce((sum: any, s: any) => sum + (s.packageSessions?.total || 0), 0),
    totalBooked: filteredSessionsForStats.reduce((sum: any, s: any) => sum + (s.packageSessions?.used || 0), 0),
  };

  // Calculate Appointment Stats for PT/PTS
  const appointmentStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    monthEnd.setHours(23, 59, 59, 999);

    // Filter appointments based on user role
    let filteredAppointments = appointments;
    if (isPTorPTS && currentTrainerId) {
      filteredAppointments = appointments.filter((apt: Appointment) => 
        apt.staffId === currentTrainerId
      );
    }

    let todaysAppointments = 0;
    let cancellations = 0;
    let upcoming = 0;
    let totalSessions = 0;

    filteredAppointments.forEach((apt: Appointment) => {
      if (!apt.date) return;
      
      const aptDate = typeof apt.date === "string" ? parseISO(apt.date) : new Date(apt.date);
      const aptDateTime = new Date(aptDate);
      const [hours, minutes] = apt.time.split(":").map(Number);
      aptDateTime.setHours(hours, minutes || 0, 0, 0);
      
      // Today's Appointments (any status for today)
      if (isToday(aptDate)) {
        todaysAppointments += 1;
      }
      
      // Cancellations (for the month)
      if (aptDate >= monthStart && aptDate <= monthEnd) {
        if (apt.status === "CANCELLED" || apt.status === "NO_SHOW") {
          cancellations += 1;
        }
      }
      
      // Upcoming (future appointments, not cancelled)
      if (aptDateTime > now && apt.status !== "CANCELLED" && apt.status !== "NO_SHOW" && apt.status !== "COMPLETED") {
        upcoming += 1;
      }
      
      // Total Sessions (completed appointments for the month)
      if (aptDate >= monthStart && aptDate <= monthEnd) {
        if (apt.status === "COMPLETED") {
          totalSessions += 1;
        }
      }
    });

    return { todaysAppointments, cancellations, upcoming, totalSessions };
  }, [appointments, isPTorPTS, currentTrainerId]);

  const uniqueTrainers = Array.from(new Set(currentDaySessions.map((s: any) => s.trainer)));
  
  // Get selected trainer stats based on actual data
  const selectedTrainerStats = useMemo(() => {
    if (trainerFilter === "all") return null;
    
    // Find the trainer in trainersWorkingToday or trainers
    const trainerData = trainersWorkingToday.find(t => t.name === trainerFilter) ||
                        trainers.find(t => t.name === trainerFilter);
    
    if (!trainerData) return null;
    
    // Calculate total sessions for this trainer (from appointments)
    // Use case-insensitive comparison for trainer name matching
    const trainerFilterLower = trainerFilter.toLowerCase().trim();
    const trainerAppointments = appointments.filter(
      (apt: Appointment) => apt.staffName?.toLowerCase().trim() === trainerFilterLower ||
                           apt.staffId === trainerData?.id
    );
    
    const totalSessions = trainerAppointments.length;
    const completedSessions = trainerAppointments.filter(
      (apt: Appointment) => apt.status === "COMPLETED"
    ).length;
    
    // Count unique clients
    const uniqueClients = new Set(
      trainerAppointments.map((apt: Appointment) => apt.clientName || apt.clientId)
    ).size;
    
    // Today's sessions
    const todaysSessions = trainerAppointments.filter((apt: Appointment) => {
      const aptDate = new Date(apt.date);
      return isSameDay(aptDate, new Date());
    }).length;
    
    return {
      ...trainerData,
      totalSessions,
      completedSessions,
      uniqueClients,
      todaysSessions
    };
  }, [trainerFilter, trainersWorkingToday, trainers, appointments]);
  
  // Show loading state
  if (loadingAppointments || loadingMembers || loadingTrainers) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">APPOINTMENTS</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  const daysInView = getDaysInView();
  const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM

  const renderCalendarHeader = () => {
    if (view === "day") {
      return format(currentDate, "PPP");
    } else if (view === "week") {
      const start = daysInView[0];
      const end = daysInView[daysInView.length - 1];
      return `${format(start, "MMM dd")} - ${format(end, "MMM dd, yyyy")}`;
    } else if (view === "month") {
      return format(currentDate, "MMMM yyyy");
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">APPOINTMENTS</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* View Tabs */}
          
          <Button 
            onClick={() => setIsAddAppointmentOpen(true)}
            className="h-10 px-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Appointment
          </Button>
          {/* Add Appointment Dialog */}
          <Dialog open={isAddAppointmentOpen} onOpenChange={(open) => {
            setIsAddAppointmentOpen(open);
            if (open && isPTorPTS && currentTrainerId) {
              // Auto-set trainer when PT/PTS opens the dialog
              const matchedTrainer = trainers.find((t: any) => t.id === currentTrainerId);
              if (matchedTrainer) {
                setNewAppointment(prev => ({
                  ...prev,
                  trainerId: currentTrainerId,
                  trainer: matchedTrainer.name
                }));
              }
            }
            if (!open) {
              setNewAppointment({
                name: "",
                trainer: "",
                trainerId: "",
                client: "",
                date: new Date(),
                startTime: `${new Date().getHours().toString().padStart(2, '0')}:00`,
                endTime: "",
                capacity: "1",
                location: "",
                description: "",
                category: "",
                selectedMember: "",
                selectedPackage: ""
              });
            }
          }}>
            <DialogContent className="max-w-[720px] w-full h-[650px] p-0 overflow-hidden flex flex-col">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="text-xl font-semibold">New Appointment</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-x-6 md:gap-y-5 auto-rows-fr">
                  {/* Member */}
                  <div className="flex flex-col gap-2 h-full">
                      <Label className="text-sm font-medium text-muted-foreground">Member</Label>
                      <Select value={newAppointment.selectedMember} onValueChange={handleMemberChange}>
                      <SelectTrigger className={`relative h-11 w-full border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full ${newAppointment.selectedMember ? 'pl-14' : 'pl-10'}`}>
                        {newAppointment.selectedMember ? (
                          (() => {
                            const selectedMember = getActiveMembers().find((m: any) => m.value === newAppointment.selectedMember);
                            return selectedMember ? (
                              <>
                                <Avatar className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 shrink-0 border-2 border-background shadow-sm">
                                  <AvatarImage src="" />
                                  <AvatarFallback className="text-xs font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {getInitials(selectedMember.fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <SelectValue />
                              </>
                            ) : (
                              <>
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder={loadingMembers ? "Loading members..." : "Select a member"} />
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder={loadingMembers ? "Loading members..." : "Select a member"} />
                          </>
                        )}
                        </SelectTrigger>
                        <SelectContent>
                          {loadingMembers ? (
                            <div className="p-4 text-center text-muted-foreground">Loading...</div>
                          ) : getActiveMembers().length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No active members with packages</div>
                          ) : (
                            getActiveMembers().map((member: any) => (
                              <SelectItem key={member.value} value={member.value}>
                                {member.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                  {/* Package */}
                  <div className="flex flex-col gap-2 h-full">
                      <Label className="text-sm font-medium text-muted-foreground">Package</Label>
                      <Select 
                        value={newAppointment.selectedPackage} 
                        onValueChange={handlePackageChange}
                        disabled={!newAppointment.selectedMember}
                      >
                      <SelectTrigger className="relative h-11 w-full border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full pl-10 pr-2">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                        {newAppointment.selectedPackage ? (
                          (() => {
                            const selectedPackage = getAvailablePackages(newAppointment.selectedMember).find(
                              (pkg: any) => pkg.id === newAppointment.selectedPackage
                            );
                            if (!selectedPackage) {
                              return (
                                <SelectValue placeholder="Select package" />
                              );
                            }
                            const balance = selectedPackage.sessionsRemaining || 0;
                            return (
                              <div className="flex items-center justify-between gap-2 w-full min-w-0 pr-1">
                                <span
                                  className="uppercase italic font-black text-xs leading-tight tracking-tight text-foreground truncate flex-1 min-w-0"
                                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                                >
                                  {selectedPackage.ptPackageName}
                                </span>
                                <span
                                  className="font-black italic text-xs tracking-tight text-foreground shrink-0"
                                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                                >
                                  {balance}
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <SelectValue placeholder="Select package" />
                        )}
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {getAvailablePackages(newAppointment.selectedMember).length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No active packages found</div>
                          ) : (
                            getAvailablePackages(newAppointment.selectedMember).map((pkg: any) => {
                              const balance = pkg.sessionsRemaining || 0;
                              return (
                                <SelectItem
                                  key={pkg.id}
                                  value={pkg.id}
                                  className="py-1.5 pl-2 pr-2 [&>span:first-child]:hidden relative"
                                >
                                  <div className="flex items-center gap-2 w-full min-w-0 pr-6">
                                    <div className="flex flex-col gap-[1px] min-w-0 flex-1">
                                      <span
                                        className="uppercase italic font-black text-xs leading-tight tracking-tight text-foreground truncate"
                                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                                      >
                                        {pkg.ptPackageName}
                                      </span>
                                      <span className="font-mono text-[10px] leading-tight text-muted-foreground/60 truncate">
                                        #{pkg.packageId}
                                      </span>
                                    </div>
                                  </div>
                                  <span
                                    className="absolute right-2 top-1/2 -translate-y-1/2 font-black italic text-xs tracking-tight text-foreground"
                                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                                  >
                                    {balance}
                                  </span>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                  </div>

                  {/* Trainer */}
                  <div className="flex flex-col gap-2 h-full">
                      <Label className="text-sm font-medium text-muted-foreground">Trainer</Label>
                      <Select 
                        value={newAppointment.trainerId} 
                        onValueChange={handleTrainerChange}
                        disabled={isPTorPTS}
                      >
                      <SelectTrigger className={`relative h-11 w-full border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full ${newAppointment.trainerId ? 'pl-14' : 'pl-10'} ${isPTorPTS ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {newAppointment.trainerId ? (
                          (() => {
                            const selectedTrainer = getActiveTrainers().find((t: any) => t.value === newAppointment.trainerId);
                            return selectedTrainer ? (
                              <>
                                <Avatar className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 shrink-0 border-2 border-background shadow-sm">
                                  <AvatarImage src={selectedTrainer.avatar} alt={selectedTrainer.name} />
                                  <AvatarFallback className="text-xs font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {getInitials(selectedTrainer.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="pl-2 text-sm text-foreground truncate">
                                  {selectedTrainer.name}
                                </span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder={loadingTrainers ? "Loading trainers..." : "Select a trainer"} />
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder={loadingTrainers ? "Loading trainers..." : "Select a trainer"} />
                          </>
                        )}
                        </SelectTrigger>
                        <SelectContent>
                          {loadingTrainers ? (
                            <div className="p-4 text-center text-muted-foreground">Loading...</div>
                          ) : getActiveTrainers().length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No trainers available</div>
                          ) : (
                            getActiveTrainers().map((trainer: any) => (
                              <SelectItem key={trainer.value} value={trainer.value}>
                                {trainer.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                  {/* Date */}
                  <div className="flex flex-col gap-2 h-full">
                      <Label className="text-sm font-medium text-muted-foreground">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Button variant="outline" className="h-11 w-full justify-start border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full pl-10">
                              {newAppointment.date ? format(newAppointment.date, "MMM dd, yyyy") : "Select date"}
                          </Button>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newAppointment.date}
                            onSelect={(date) => setNewAppointment({ ...newAppointment, date: date || new Date() })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                  </div>

                  {/* Start Time */}
                  <div className="flex flex-col gap-2 h-full">
                      <Label className="text-sm font-medium text-muted-foreground">Start Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={newAppointment.startTime}
                          onChange={(e) => handleStartTimeChange(e.target.value)}
                          placeholder="HH:MM (e.g., 10:00)"
                          className="h-11 w-full pl-10 pr-16 border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full"
                        />
                        {newAppointment.startTime && (
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                            {formatTime(newAppointment.startTime).split(' ')[1]}
                          </span>
                        )}
                      </div>
                    </div>

                  {/* End Time */}
                  <div className="flex flex-col gap-2 h-full">
                      <Label className="text-sm font-medium text-muted-foreground">End Time</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          value={newAppointment.endTime}
                          readOnly
                          className="h-11 w-full pl-10 pr-16 border-2 border-border/10 bg-muted/40 text-muted-foreground rounded-full"
                        />
                        {newAppointment.endTime && (
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                            {formatTime(newAppointment.endTime).split(' ')[1]}
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex flex-col gap-2 h-full">
                      <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                      <Select value={newAppointment.location} onValueChange={(value) => setNewAppointment({ ...newAppointment, location: value })}>
                      <SelectTrigger className="relative h-11 w-full border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full pl-10">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BKK 1">BKK 1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-2 h-full">
                      <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          value={newAppointment.description}
                          onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })}
                          className="min-h-[44px] h-11 w-full pl-10 resize-none border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-2xl"
                          placeholder="Add notes..."
                        />
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddAppointmentOpen(false)}
                  className="h-10 px-6 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAppointment}
                  className="h-10 px-6 rounded-full"
                    disabled={!newAppointment.trainerId || !newAppointment.selectedMember || !newAppointment.selectedPackage || !newAppointment.date || !newAppointment.startTime || !newAppointment.endTime || isBookingLoading}
                  >
                    {isBookingLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      "Add Appointment"
                    )}
                  </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Appointment Stats Cards - For PT/PTS */}
      {isPTorPTS ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Today's Appointments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground/90">Today&apos;s Appointments</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20">
                  <CalendarIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[40px] flex items-center justify-center">
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {appointmentStats.todaysAppointments}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancellations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground/90">Cancellations</CardTitle>
                <div className="p-1.5 rounded-md bg-red-50 dark:bg-red-950/20">
                  <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[40px] flex items-center justify-center">
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {appointmentStats.cancellations}
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">This month</p>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground/90">Upcoming</CardTitle>
                <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20">
                  <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[40px] flex items-center justify-center">
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {appointmentStats.upcoming}
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">Future appointments</p>
            </CardContent>
          </Card>

          {/* Total Sessions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground/90">Total Sessions</CardTitle>
                <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[40px] flex items-center justify-center">
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {appointmentStats.totalSessions}
                </div>
              </div>
              <p className="text-xs text-muted-foreground/70 text-center mt-1">
                {format(startOfMonth(new Date()), "MMM dd")} - {format(endOfMonth(new Date()), "MMM dd")}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Original Stats Cards for SUPERADMIN
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground/90">Today&apos;s Sessions</CardTitle>
                <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20">
                  <CalendarIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[40px] flex items-center justify-center">
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{sessionStats.total}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground/90">Booked Sessions</CardTitle>
                <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-950/20">
                  <Users className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[40px] flex items-center justify-center">
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{sessionStats.booked}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground/90">Available Slots</CardTitle>
                <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[40px] flex items-center justify-center">
                <div className="text-2xl font-bold tracking-tight text-green-600 dark:text-green-400 font-mono">{sessionStats.available}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                {trainerFilter === "all" ? (
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="text-sm font-semibold text-foreground/90">Trainers</CardTitle>
                    <div className="flex -space-x-2">
                      {trainersWorkingToday.slice(0, 3).map((trainer: any) => (
                        <Avatar key={trainer.id} className="w-8 h-8 border-2 border-background shadow-sm">
                          <AvatarImage src={trainer.avatar || ""} />
                          <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            {getInitials(trainer.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {trainersWorkingToday.length > 3 && (
                        <Avatar className="w-8 h-8 border-2 border-background shadow-sm">
                          <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/60 text-muted-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            +{trainersWorkingToday.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 shadow-sm">
                      <AvatarImage src={selectedTrainerStats?.avatar || ""} />
                      <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {getInitials(trainerFilter)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-semibold text-foreground/90 truncate">{trainerFilter}</CardTitle>
                      <Badge variant="outline" className="text-[10px] px-2 py-0 mt-1">
                        {(selectedTrainerStats as { department?: string })?.department || "PT"}
                      </Badge>
                    </div>
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted/60">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleTrainerFilter("all")}>
                      <Users className="mr-2 h-4 w-4" />
                      All Trainers
                    </DropdownMenuItem>
                    {trainersWorkingToday.map((trainer: any) => (
                      <DropdownMenuItem key={trainer.id} onClick={() => handleTrainerFilter(trainer.name)}>
                        <User className="mr-2 h-4 w-4" />
                        {trainer.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[40px] flex items-center justify-center">
                {trainerFilter === "all" ? (
                  <div className="text-2xl font-bold tracking-tight text-foreground font-mono">{trainersWorkingToday.length}</div>
                ) : (
                  <div className="flex items-center justify-center gap-6 text-xs font-medium text-muted-foreground">
                    <span className="font-mono font-bold">Today: {selectedTrainerStats?.todaysSessions || 0}</span>
                    <span className="font-mono font-bold">Total: {selectedTrainerStats?.totalSessions || 0}</span>
                    <span className="font-mono font-bold">Clients: {selectedTrainerStats?.uniqueClients || 0}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Calendar Views */}
      {view === "day" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-medium">
                  {format(currentDate, "EEEE, MMMM dd")}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => navigate("prev")} className="h-7 w-7 p-0">
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-7 px-2 text-xs">
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("next")} className="h-7 w-7 p-0">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Tabs value={view} onValueChange={(value) => setView(value as "day" | "week" | "month")}>
                  <TabsList className="grid w-full grid-cols-3 h-10 bg-muted">
                    <TabsTrigger value="day" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">D</TabsTrigger>
                    <TabsTrigger value="week" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">W</TabsTrigger>
                    <TabsTrigger value="month" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">M</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {getFilteredSessions().length > 0 ? (
                <div className="divide-y">
                  {sortAppointmentsByStatusAndTime(getFilteredSessions()).map((session) => {
                    const capacityInfo = getCapacityStatus(session.packageSessions?.used || 0, session.packageSessions?.total || 1);
                    const StatusIcon = capacityInfo.icon;
                    const utilizationPercentage = ((session.packageSessions?.used || 0) / (session.packageSessions?.total || 1)) * 100;
                    
                    const sessionStatusInfo = getSessionStatus(session.status);
                    const SessionStatusIcon = sessionStatusInfo.icon;
                    const isInProgress = session.status === 'in_progress';
                    
                    return (
                      <div key={session.id} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleAppointmentClick(session)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[60px]">
                              <div className="text-lg font-bold font-mono">
                                {formatTime(session.startTime)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {formatTime(session.endTime)}
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div>
                                <h3 className="font-semibold text-sm">{session.client}</h3>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {session.trainer}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                  <Dumbbell className="h-3 w-3" />
                                  <span className="font-black italic" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                    {session.sessionType}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-2 min-h-[16px]">
                                  {session.notes || ""}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-1">
                            <div className="flex justify-end mb-1">
                              <Badge className={`${sessionStatusInfo.color} text-xs px-1.5 py-0.5 ${isInProgress ? 'animate-pulse' : ''}`} variant="secondary">
                                <SessionStatusIcon className={`mr-1 h-2 w-2 ${isInProgress ? 'animate-pulse' : ''}`} />
                                {sessionStatusInfo.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-end">
                              <div className="relative w-8 h-8 flex items-center justify-center">
                                <div className="text-xs font-mono text-muted-foreground/70">
                                  {(session.packageSequenceNumber || 0)}/{session.packageSessions?.total || 1}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {session.packageId || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No appointments scheduled</h3>
                  <p className="text-muted-foreground mb-4">
                    {appointments.length === 0 
                      ? "Get started by booking your first session" 
                      : "No appointments on this date"}
                  </p>
                  <Button onClick={() => setIsAddAppointmentOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Appointment
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "week" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-medium">
                  {renderCalendarHeader()}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => navigate("prev")} className="h-7 w-7 p-0">
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-7 px-2 text-xs">
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("next")} className="h-7 w-7 p-0">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Tabs value={view} onValueChange={(value) => setView(value as "day" | "week" | "month")}>
                  <TabsList className="grid w-full grid-cols-3 h-10 bg-muted">
                    <TabsTrigger value="day" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">D</TabsTrigger>
                    <TabsTrigger value="week" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">W</TabsTrigger>
                    <TabsTrigger value="month" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">M</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px] sm:min-w-[900px] md:min-w-[1000px] lg:min-w-[1100px] grid grid-cols-7 divide-x">
                {daysInView.map((day) => {
                  // Get sessions for this specific day
                  let daySessions = getSessionsForDate(day);
                  
                  // Apply filters to weekly view
                  if (searchTerm) {
                    daySessions = daySessions.filter((session: any) =>
                      session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      session.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      session.client.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  }
                  
                  if (categoryFilter !== "all") {
                    daySessions = daySessions.filter((session: any) => session.category === categoryFilter);
                  }
                  
                  if (trainerFilter !== "all") {
                    daySessions = daySessions.filter((session: any) => 
                      session.trainer?.toLowerCase().trim() === trainerFilter.toLowerCase().trim()
                    );
                  }
                  
                  return (
                    <div key={day.toISOString()} className="flex flex-col h-[500px] min-w-[110px] sm:min-w-[120px] md:min-w-[130px] lg:min-w-[140px]">
                      {/* Day Header */}
                      <div className={`p-2 border-b text-center ${isToday(day) ? 'bg-primary/5' : 'bg-muted/20'}`}>
                        <div className={`text-xs font-medium ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                          {format(day, "EEE")}
                        </div>
                        <div className="relative inline-block">
                          <div className={`text-lg font-bold ${isToday(day) ? 'text-primary' : ''}`}>
                            {format(day, "dd")}
                          </div>
                          {isToday(day) && (
                            <div className="absolute inset-0 rounded-full border-2 border-white -m-0.5"></div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {daySessions.length}
                        </div>
                      </div>

                      {/* Day Content with Vertical Scroll */}
                      <div className="flex-1 overflow-y-auto">
                        {daySessions.length > 0 && (
                          <div className="divide-y">
                            {sortAppointmentsByStatusAndTime(daySessions).map((session: any) => {
                                const sessionStatusInfo = getSessionStatus(session.status);
                                const StatusIcon = sessionStatusInfo.icon;
                                const isInProgress = session.status === 'in_progress';
                                
                                return (
                                  <div 
                                    key={session.id} 
                                    className="bg-background rounded p-1.5 border cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => handleAppointmentClick(session)}
                                  >
                                    <div>
                                      {/* Time and Status Badge on Top */}
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-sm font-bold font-mono text-center flex-1">
                                          {formatTime(session.startTime)}
                                        </div>
                                        <Badge className={`${sessionStatusInfo.color} text-xs p-1 ${isInProgress ? 'animate-pulse' : ''}`} variant="secondary">
                                          <StatusIcon className={`h-2 w-2 ${isInProgress ? 'animate-pulse' : ''}`} />
                                        </Badge>
                                      </div>
                                      
                                      <div className="font-medium text-xs truncate pr-1">{session.client}</div>
                                      <div className="text-xs text-muted-foreground truncate font-black italic" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                        {session.sessionType}
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <User2 className="h-3 w-3" />
                                        <span>{session.trainer}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {view === "month" && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-base font-medium">
                  {renderCalendarHeader()}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => navigate("prev")} className="h-7 w-7 p-0">
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="h-7 px-2 text-xs">
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("next")} className="h-7 w-7 p-0">
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Tabs value={view} onValueChange={(value) => setView(value as "day" | "week" | "month")}>
                  <TabsList className="grid w-full grid-cols-3 h-10 bg-muted">
                    <TabsTrigger value="day" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">D</TabsTrigger>
                    <TabsTrigger value="week" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">W</TabsTrigger>
                    <TabsTrigger value="month" className="text-base font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">M</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto p-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {daysInView.map((day) => {
                  // Get sessions for this specific day
                  let daySessions = getSessionsForDate(day);
                  
                  // Apply filters to monthly view
                  if (searchTerm) {
                    daySessions = daySessions.filter((session: any) =>
                      session.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      session.trainer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      session.client.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                  }
                  
                  if (categoryFilter !== "all") {
                    daySessions = daySessions.filter((session: any) => session.category === categoryFilter);
                  }
                  
                  if (trainerFilter !== "all") {
                    daySessions = daySessions.filter((session: any) => 
                      session.trainer?.toLowerCase().trim() === trainerFilter.toLowerCase().trim()
                    );
                  }
                  const hasSessions = daySessions.length > 0;
                  const totalBooked = daySessions.reduce((sum: any, s: any) => sum + (s.packageSessions?.used || 0), 0);
                  const totalCapacity = daySessions.reduce((sum: any, s: any) => sum + (s.packageSessions?.total || 0), 0);
                  const utilizationRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;
            
                  return (
                    <Card key={day.toISOString()} className={`${hasSessions ? 'border-primary/20 bg-primary/5' : ''} ${isToday(day) ? 'ring-1 ring-primary/30' : ''}`}>
                      <CardHeader className="pb-0 px-2 pt-1">
                        <CardTitle className="flex items-center justify-between">
                          <div className="text-xs font-medium">
                            <div className={`${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                              {format(day, "EEE")}
                            </div>
                            <div className={`text-sm font-bold ${isToday(day) ? 'text-primary' : ''}`}>
                              {format(day, "dd")}
                            </div>
                          </div>
                          {isToday(day) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-2 pb-2">
                        {hasSessions && (
                          <div className="space-y-1">
                            {/* Session List */}
                            <div className="space-y-0.5 max-h-20 overflow-y-auto">
                              {sortAppointmentsByStatusAndTime(daySessions).map((session: any) => {
                                const sessionStatusInfo = getSessionStatus(session.status);
                                const StatusIcon = sessionStatusInfo.icon;
                                const isInProgress = session.status === 'in_progress';
                                
                                return (
                                  <div key={session.id} className="bg-background rounded p-1 border cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleAppointmentClick(session)}>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center justify-between">
                                        <div className="text-xs font-medium truncate pr-1">
                                          {session.client}
                                        </div>
                                        <Badge className={`${sessionStatusInfo.color} text-xs p-1 ${isInProgress ? 'animate-pulse' : ''}`} variant="secondary">
                                          <StatusIcon className={`h-2 w-2 ${isInProgress ? 'animate-pulse' : ''}`} />
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground font-mono">
                                        {formatTime(session.startTime)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointment Detail Dialog */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">Session Details</DialogTitle>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-6">
              {/* Session Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{selectedAppointment.client}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getSessionStatus(selectedAppointment.status).color} text-xs px-2 py-1`} variant="secondary">
                      {getSessionStatus(selectedAppointment.status).status}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-muted-foreground">Appointment ID</div>
                  <div className="text-sm font-mono text-foreground">{selectedAppointment.sessionNumber}</div>
                </div>
              </div>

              {/* Session Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Time</div>
                    <div className="text-sm font-medium font-mono text-foreground">
                      {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trainer</div>
                    <div className="text-sm font-medium text-foreground">{selectedAppointment.trainer}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</div>
                    <div className="text-sm font-medium text-foreground">60 minutes</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</div>
                    <div className="text-sm font-medium text-foreground">{selectedAppointment.location}</div>
                  </div>
                </div>
              </div>

              {/* Package Information */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Package</div>
                    <div className="text-sm font-black italic text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                      {selectedAppointment.packageType}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Package ID</div>
                    <div className="text-sm font-mono text-foreground">{selectedAppointment.packageId}</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Session Progress</span>
                    <span className="text-sm font-mono font-medium text-foreground">
                      {(() => {
                        // Calculate used sessions based on COMPLETED appointments only (real-time calculation)
                        if (!selectedAppointment.ptPackageRecordId) {
                          return `${selectedAppointment.packageSessions?.used || 0}/${selectedAppointment.packageSessions?.total || 0}`;
                        }
                        // Count COMPLETED appointments for this package
                        const completedCount = appointments.filter(
                          (apt: Appointment) => 
                            apt.ptPackageRecordId === selectedAppointment.ptPackageRecordId && 
                            apt.status === "COMPLETED"
                        ).length;
                        const total = selectedAppointment.packageSessions?.total || 0;
                        return `${completedCount}/${total}`;
                      })()}
                    </span>
                  </div>
                  <Progress 
                    value={(() => {
                      // Calculate progress based on COMPLETED appointments only (real-time calculation)
                      if (!selectedAppointment.ptPackageRecordId) {
                        return ((selectedAppointment.packageSessions?.used || 0) / (selectedAppointment.packageSessions?.total || 1)) * 100;
                      }
                      // Count COMPLETED appointments for this package
                      const completedCount = appointments.filter(
                        (apt: Appointment) => 
                          apt.ptPackageRecordId === selectedAppointment.ptPackageRecordId && 
                          apt.status === "COMPLETED"
                      ).length;
                      const total = selectedAppointment.packageSessions?.total || 1;
                      return (completedCount / total) * 100;
                    })()} 
                    className="h-2" 
                  />
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {(() => {
                      // Calculate percentage based on COMPLETED appointments only (real-time calculation)
                      if (!selectedAppointment.ptPackageRecordId) {
                        return `${Math.round(((selectedAppointment.packageSessions?.used || 0) / (selectedAppointment.packageSessions?.total || 1)) * 100)}% completed`;
                      }
                      // Count COMPLETED appointments for this package
                      const completedCount = appointments.filter(
                        (apt: Appointment) => 
                          apt.ptPackageRecordId === selectedAppointment.ptPackageRecordId && 
                          apt.status === "COMPLETED"
                      ).length;
                      const total = selectedAppointment.packageSessions?.total || 1;
                      return `${Math.round((completedCount / total) * 100)}% completed`;
                    })()}
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {selectedAppointment.notes && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Notes</div>
                  <div className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                    {selectedAppointment.notes}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'COMPLETED' && selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'CANCELLED' && (
                  <Button 
                    onClick={handleCompleteAppointment}
                    className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                )}
                {selectedAppointment.status === 'completed' || selectedAppointment.status === 'COMPLETED' ? (
                  <div className="flex gap-2 flex-1">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsEditRequestDialogOpen(true);
                      }}
                      className="flex-1 h-10 font-medium"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    {isSuperAdmin && (
                      <Button 
                        variant="outline" 
                        onClick={handleDeleteAppointment}
                        className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 font-medium"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                ) : selectedAppointment.status !== 'cancelled' && selectedAppointment.status !== 'CANCELLED' && (
                  <div className="flex gap-2 flex-1">
                    <Button 
                      variant="outline" 
                      onClick={handleCancelAppointment}
                      className="flex-1 h-10 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 font-medium"
                    >
                      <CancelIcon className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    {isSuperAdmin && (
                      <Button 
                        variant="outline" 
                        onClick={handleDeleteAppointment}
                        className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 font-medium"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmDialogOpen} onOpenChange={setIsDeleteConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment? This action cannot be undone and will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Remove the appointment from all views</li>
                <li>Recalculate the PT package session balance if applicable</li>
                <li>Update all related statistics and displays</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAppointmentMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAppointment}
              disabled={deleteAppointmentMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAppointmentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Request Dialog */}
      <Dialog open={isEditRequestDialogOpen} onOpenChange={setIsEditRequestDialogOpen}>
        <DialogContent className="max-w-[600px] w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Submit Request</DialogTitle>
            <DialogDescription>
              Submit a request to SuperAdmin to manage this appointment or package
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-6">
              {/* Request Type */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-muted-foreground">Request Type</Label>
                <Select 
                  value={editRequest.requestType} 
                  onValueChange={(value: any) => setEditRequest({ ...editRequest, requestType: value })}
                >
                  <SelectTrigger className="h-11 w-full border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHANGE_DATE">Change Appointment Date</SelectItem>
                    <SelectItem value="UNDO_SESSION">Undo Session (Mark as Not Completed)</SelectItem>
                    <SelectItem value="CHANGE_PACKAGE">Change Package</SelectItem>
                    <SelectItem value="EXTEND_PACKAGE">Extend Package</SelectItem>
                    <SelectItem value="CUT_SESSIONS">Cut Sessions</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New Date & Time (only for CHANGE_DATE) */}
              {editRequest.requestType === "CHANGE_DATE" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-muted-foreground">New Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-11 w-full border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full pl-10"
                        >
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          {format(editRequest.newDate, "PPP")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editRequest.newDate}
                          onSelect={(date) => date && setEditRequest({ ...editRequest, newDate: date })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-medium text-muted-foreground">New Time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        value={editRequest.newTime}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Format as HH:MM
                          if (/^\d{0,2}:?\d{0,2}$/.test(value.replace(/[^\d:]/g, ''))) {
                            let formatted = value.replace(/[^\d]/g, '');
                            if (formatted.length > 2) {
                              formatted = formatted.slice(0, 2) + ':' + formatted.slice(2, 4);
                            }
                            if (formatted.length <= 5) {
                              setEditRequest({ ...editRequest, newTime: formatted });
                            }
                          }
                        }}
                        placeholder="HH:MM"
                        className="h-11 w-full pl-10 border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-full"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-muted-foreground">Reason *</Label>
                <Textarea
                  value={editRequest.reason}
                  onChange={(e) => setEditRequest({ ...editRequest, reason: e.target.value })}
                  placeholder="Please explain why you need this change..."
                  className="min-h-[100px] resize-none border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-2xl"
                />
              </div>

              {/* Additional Notes */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-muted-foreground">Additional Notes (Optional)</Label>
                <Textarea
                  value={editRequest.additionalNotes}
                  onChange={(e) => setEditRequest({ ...editRequest, additionalNotes: e.target.value })}
                  placeholder="Any additional information..."
                  className="min-h-[80px] resize-none border-2 border-border/20 bg-background hover:border-primary/50 transition-all duration-200 focus-visible:ring-0 focus-visible:border-primary rounded-2xl"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-4 border-t justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditRequestDialogOpen(false);
                    setEditRequest({
                      requestType: "CHANGE_DATE",
                      reason: "",
                      newDate: new Date(),
                      newTime: "",
                      additionalNotes: ""
                    });
                  }}
                  className="h-10 px-6 rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitEditRequest}
                  disabled={createRequestMutation.isPending}
                  className="h-10 px-6 rounded-full"
                >
                  {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
