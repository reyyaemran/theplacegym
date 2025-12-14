"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Users,
  Activity,
  Clock,
  CalendarClock,
  CheckCircle2,
  PlayCircle,
  Circle,
  Clock3,
  XCircle,
} from "lucide-react";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, addDays, isAfter, isToday, isBefore, isPast, parseISO, isWithinInterval, differenceInDays } from "date-fns";
import { Staff } from "@/types/staff";
import { Client, ClientStatus } from "@/types/client";
import { Appointment } from "@/types/appointment";
import { useMembershipRecords } from "@/hooks/use-membership-records";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useStaff as useStaffQuery, useStaffById } from "@/hooks/use-staff";
import { useAppointments } from "@/hooks/use-appointments";
import { useMembers } from "@/hooks/use-members";
import { useAuth } from "@/hooks/use-auth";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/shared/date-picker-with-range";
import { DateRange } from "react-day-picker";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  LabelList,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  Label,
} from "recharts";
import { cn } from "@/lib/utils";

interface DashboardStats {
  availableStaff: number;
  totalRevenue: number;
  totalRevenueTarget: number;
  totalSessions: number;
  totalSessionsTarget: number;
  expiringSoon: number;
}

export function OverviewPage() {
  // Get current logged-in staff
  const { staff: currentStaff, isSuperAdmin } = useAuth();
  
  // Check if current user is PT or PTS
  const isPTorPTS = currentStaff?.department === "PT" || currentStaff?.department === "PTS";
  const currentTrainerName = currentStaff?.name || "";
  const currentTrainerId = (currentStaff as any)?.staffId || currentStaff?._id || "";
  
  // Fetch full staff profile for PT/PTS to get targets (monthlySaleTarget, monthlyConductTarget)
  const { data: fullStaffProfile } = useStaffById(
    isPTorPTS && currentTrainerId && !isSuperAdmin ? currentTrainerId : undefined
  );
  
  // Use the full staff profile if available, otherwise fall back to currentStaff from auth
  const staffWithTargets = isPTorPTS && fullStaffProfile ? fullStaffProfile : currentStaff;
  
  // Use React Query hooks for data fetching (same as staff/members pages)
  const { data: staffData = [], isLoading: staffLoading } = useStaffQuery();
  const { data: appointmentsData = [], isLoading: appointmentsLoading } = useAppointments();
  const { data: membershipRecords = [] } = useMembershipRecords();
  const { data: ptPackageRecords = [] } = usePTPackageRecords();
  const { data: membersData = [] } = useMembers();
  
  // Initialize state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<(Appointment & { dateTime: Date; displayStatus: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" })[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return {
      from: startOfMonth(now),
      to: endOfMonth(now),
    };
  });

  // Use data directly from React Query - no need for local state
  const staff = staffData || [];
  const appointments = appointmentsData || [];

  // Convert members to clients format using useMemo to prevent recreation
  const clients = useMemo(() => {
    return membersData.map((member) => ({
      _id: member.id,
      name: member.fullName,
      receiptNo: member.memberNumber,
      assignedStaffId: "",
      currentSessionBalance: member.ptPackageSessions || 0,
      packageValue: member.totalSpent || 0,
      status: member.status === "active" ? "ACTIVE" : "PAUSED" as ClientStatus,
      phone: member.phone,
      email: member.email,
    }));
  }, [membersData]);

  // Calculate stats and process appointments (using current staff/appointments state)
  useEffect(() => {
    const calculateStats = () => {
      if (!dateRange?.from || !dateRange?.to) return;
      
      const rangeStart = new Date(dateRange.from);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(dateRange.to);
      rangeEnd.setHours(23, 59, 59, 999);
      
      // Count all available staff (status = AVAILABLE)
      // Keep showing all available staff for everyone
      const availableStaffList = staff.filter((s: Staff) => {
        return s.status === "AVAILABLE";
      });
      
      // Calculate revenue from Membership Records
      const membershipRevenue = (membershipRecords || [])
        .filter((record: MembershipRecord) => {
          if (!record.paymentDate) return false;
          const paymentDate = typeof record.paymentDate === "string" ? parseISO(record.paymentDate) : new Date(record.paymentDate);
          return isWithinInterval(paymentDate, { start: rangeStart, end: rangeEnd });
        })
        .reduce((sum: number, record: MembershipRecord) => sum + (record.amount || 0), 0);

      // Calculate revenue from PT Package Records
      // For PT/PTS, only count packages assigned to them; for SUPERADMIN, count all
      const ptPackageRevenue = (ptPackageRecords || [])
        .filter((record: PTPackageRecord) => {
          if (!record.paymentDate) return false;
          const paymentDate = typeof record.paymentDate === "string" ? parseISO(record.paymentDate) : new Date(record.paymentDate);
          const inDateRange = isWithinInterval(paymentDate, { start: rangeStart, end: rangeEnd });
          
          // For PT/PTS, filter by assigned staff name
          if (isPTorPTS && currentTrainerName && !isSuperAdmin) {
            return inDateRange && record.assignedStaffName?.toLowerCase() === currentTrainerName.toLowerCase();
          }
          
          return inDateRange;
        })
        .reduce((sum: number, record: PTPackageRecord) => sum + (record.amount || 0), 0);

      // Total revenue is the sum of both
      const totalRevenue = membershipRevenue + ptPackageRevenue;
      
      // Calculate revenue target
      // For PT/PTS, only their target from full staff profile; for SUPERADMIN, sum of all
      let totalRevenueTarget = 0;
      if (isPTorPTS && staffWithTargets && !isSuperAdmin) {
        totalRevenueTarget = staffWithTargets.monthlySaleTarget || 0;
      } else {
        totalRevenueTarget = staff
          .filter((s: Staff) => s.department === "PT" || s.department === "PTS" || s.department === "FC" || s.department === "FCS")
          .reduce((sum: number, s: Staff) => sum + (s.monthlySaleTarget || 0), 0);
      }

      // Get PT staff IDs for filtering
      // For PT/PTS, only their ID; for SUPERADMIN, all PT/PTS IDs
      let ptStaffIds: string[] = [];
      if (isPTorPTS && currentTrainerId && !isSuperAdmin) {
        ptStaffIds = [currentTrainerId];
      } else {
        ptStaffIds = staff
          .filter((s: Staff) => s.department === "PT" || s.department === "PTS")
          .map((s: Staff) => String(s._id))
          .filter(Boolean);
      }
      
      const totalSessions = (appointments || [])
        .filter((apt: Appointment) => {
          if (!apt.staffId || !ptStaffIds.includes(apt.staffId)) return false;
          if (apt.status !== "COMPLETED" || !apt.date) return false;
          const aptDate = typeof apt.date === "string" ? parseISO(apt.date) : new Date(apt.date);
          return isWithinInterval(aptDate, { start: rangeStart, end: rangeEnd });
        }).length;

      // Calculate sessions target
      // For PT/PTS, only their target from full staff profile; for SUPERADMIN, sum of all
      let totalSessionsTarget = 0;
      if (isPTorPTS && staffWithTargets && !isSuperAdmin) {
        totalSessionsTarget = staffWithTargets.monthlyConductTarget || 0;
      } else {
        totalSessionsTarget = staff
          .filter((s: Staff) => s.department === "PT" || s.department === "PTS")
          .reduce((sum: number, s: Staff) => sum + (s.monthlyConductTarget || 0), 0);
      }

      // Count memberships/PT packages expiring soon (within 14 days)
      // For PT/PTS, only count PT packages assigned to them; for SUPERADMIN, count all memberships
      let expiringSoon = 0;
      if (isPTorPTS && currentTrainerName && !isSuperAdmin) {
        // Count PT packages assigned to them that are expiring soon
        // Exclude already expired packages and packages with 0 balance (same logic as status calculation)
        expiringSoon = (ptPackageRecords || []).filter((record: PTPackageRecord) => {
          if (!record.expiryDate) return false;
          if (record.assignedStaffName?.toLowerCase() !== currentTrainerName.toLowerCase()) return false;
          
          const expiry = typeof record.expiryDate === "string" ? parseISO(record.expiryDate) : new Date(record.expiryDate);
          const now = new Date();
          
          // Exclude already expired packages
          if (expiry < now) return false;
          
          // Calculate used sessions to check if package is finished
          const totalSessions = record.ptPackageSessions || 0;
          const usedSessions = appointments.filter(
            (apt) => apt.ptPackageRecordId === record.id && apt.status === "COMPLETED"
          ).length;
          const balanceSessions = Math.max(0, totalSessions - usedSessions);
          
          // Exclude packages with 0 balance (all sessions finished)
          if (balanceSessions === 0) return false;
          
          // Count packages expiring within 14 days
          const daysUntilExpiry = differenceInDays(expiry, now);
          return daysUntilExpiry > 0 && daysUntilExpiry <= 14;
        }).length;
      } else {
        // For SUPERADMIN, count memberships expiring soon (same logic as membership status)
        expiringSoon = (membershipRecords || []).filter((record: MembershipRecord) => {
          if (!record.expiryDate) return false;
          const expiry = typeof record.expiryDate === "string" ? parseISO(record.expiryDate) : new Date(record.expiryDate);
          const now = new Date();
          
          // Exclude already expired memberships (same logic as membership status)
          if (expiry < now) return false;
          
          const daysUntilExpiry = differenceInDays(expiry, now);
          return daysUntilExpiry > 0 && daysUntilExpiry <= 14;
        }).length;
      }

      // Process appointments for upcoming appointments list (using current appointments state)
      // First, filter out cancelled appointments - only show active/upcoming appointments
      let activeAppointments = appointments.filter(
        (apt) => apt.status !== "CANCELLED" && apt.status !== "NO_SHOW"
      );
      
      // For PT/PTS, only show their appointments; for SUPERADMIN, show all
      if (isPTorPTS && currentTrainerId && !isSuperAdmin) {
        activeAppointments = activeAppointments.filter((apt: Appointment) => 
          apt.staffId === currentTrainerId
        );
      }
      
      const now = new Date();
      const allAppointments = activeAppointments
        .map((apt) => {
          const aptDateTime = new Date(apt.date);
          const [hours, minutes] = apt.time.split(":").map(Number);
          aptDateTime.setHours(hours, minutes, 0, 0);
          
          let displayStatus: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" = "UPCOMING";
          
          // Always respect COMPLETED status from database
          if (apt.status === "COMPLETED") {
            displayStatus = "COMPLETED";
          } else if (isPast(aptDateTime)) {
            const endTime = new Date(aptDateTime);
            endTime.setMinutes(endTime.getMinutes() + apt.duration);
            if (now >= aptDateTime && now <= endTime) {
              displayStatus = "IN_PROGRESS";
            } else if (now > endTime) {
              // Past appointment - mark as completed
              displayStatus = "COMPLETED";
            } else {
              displayStatus = "UPCOMING";
            }
          }
          
          return {
            ...apt,
            dateTime: aptDateTime,
            displayStatus,
          };
        })
        .filter((apt) => {
          if (apt.displayStatus === "COMPLETED") {
            // Calculate completion time: use updatedAt if available (when status was changed to COMPLETED),
            // otherwise use the appointment's end time (dateTime + duration)
            let completionTime: Date;
            if (apt.status === "COMPLETED" && apt.updatedAt) {
              // Use the updatedAt timestamp when appointment was marked as COMPLETED
              completionTime = typeof apt.updatedAt === "string" ? parseISO(apt.updatedAt) : new Date(apt.updatedAt);
            } else {
              // Fall back to appointment's scheduled end time
              completionTime = new Date(apt.dateTime);
              completionTime.setMinutes(completionTime.getMinutes() + apt.duration);
            }
            
            // Calculate hours since completion
            const hoursSinceCompletion = (now.getTime() - completionTime.getTime()) / (1000 * 60 * 60);
            
            // Only show if it's been less than 24 hours since completion
            return hoursSinceCompletion <= 24;
          }
          return apt.displayStatus === "UPCOMING" || apt.displayStatus === "IN_PROGRESS";
        })
        .sort((a, b) => {
          const statusOrder = { COMPLETED: 0, IN_PROGRESS: 1, UPCOMING: 2 };
          const statusDiff = statusOrder[a.displayStatus] - statusOrder[b.displayStatus];
          if (statusDiff !== 0) {
            return statusDiff;
          }
          if (a.displayStatus === "COMPLETED") {
            return b.dateTime.getTime() - a.dateTime.getTime();
          }
          return a.dateTime.getTime() - b.dateTime.getTime();
        });

      setStats({
        availableStaff: availableStaffList.length,
        totalRevenue,
        totalRevenueTarget,
        totalSessions,
        totalSessionsTarget,
        expiringSoon,
      });
      setAvailableStaff(availableStaffList);
      setUpcomingAppointments(allAppointments);
    };
    
    calculateStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dateRange?.from?.getTime(),
    dateRange?.to?.getTime(),
    staffData.length,
    appointmentsData.length,
    membersData.length,
    membershipRecords.length,
    ptPackageRecords.length,
    isPTorPTS,
    currentTrainerId,
    currentTrainerName,
    isSuperAdmin,
    staffWithTargets?.monthlySaleTarget,
    staffWithTargets?.monthlyConductTarget,
  ]);

  // Note: Clients still use mock data from @/lib/mock-data
  // This is consistent with the rest of the app - clients are separate from members
  // If needed, we can create a /api/clients route later

  // Top 2 staff from each department based on performance metrics
  // PT/FC: Sales revenue percentage
  // CC: Total issued (memberships + PT packages)
  const topStaffByDepartment = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
      
      const rangeStart = new Date(dateRange.from);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(dateRange.to);
      rangeEnd.setHours(23, 59, 59, 999);
      
    // Get only PT and PTS departments for performance card
    const departments = ["PT", "PTS"] as const;
    
    // Calculate performance for each staff member
    // Only show PT and PTS staff for performance card
    const staffPerformance = staff
      .filter((s) => s._id && (s.department === "PT" || s.department === "PTS"))
      .map((staffMember) => {
        const dept = staffMember.department;
        
        // For PT/PTS: Sales revenue percentage
        if (dept === "PT" || dept === "PTS") {
          if (!staffMember.monthlySaleTarget || staffMember.monthlySaleTarget <= 0) {
            return null;
          }
          
          // Calculate sales from records based on department
          let staffSales = 0;
          
          // For PT/PTS: Calculate from PT Package records only
          staffSales = (ptPackageRecords || [])
            .filter((record: PTPackageRecord) => {
              if (record.assignedStaffName !== staffMember.name) return false;
              if (!record.paymentDate) return false;
              const paymentDate = typeof record.paymentDate === "string" ? parseISO(record.paymentDate) : new Date(record.paymentDate);
              return isWithinInterval(paymentDate, { start: rangeStart, end: rangeEnd });
            })
            .reduce((sum: number, record: PTPackageRecord) => sum + (record.amount || 0), 0);
        
          const salesPercent = staffMember.monthlySaleTarget && staffMember.monthlySaleTarget > 0
            ? (staffSales / staffMember.monthlySaleTarget) * 100
          : 0;
        
        return {
            staffId: String(staffMember._id),
            staffName: staffMember.name,
            department: dept,
            metric: salesPercent,
            metricType: "salesPercent" as const,
            displayValue: Math.round(salesPercent * 10) / 10, // Round to 1 decimal place
        };
        }
        
        // For other departments (CM, ASM), return null (not included)
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    
    // Group by department and get top 2 from each
    const topByDept: Array<{
      staffId: string;
      staffName: string;
      department: string;
      metric: number;
      metricType: "issued" | "salesPercent";
      displayValue: number;
    }> = [];
    
    departments.forEach((dept) => {
      const deptStaff = staffPerformance
        .filter((s) => s.department === dept)
        .sort((a, b) => b.metric - a.metric)
        .slice(0, 2);
      
      topByDept.push(...deptStaff);
    });
    
    // Sort all by metric value for display
    return topByDept.sort((a, b) => b.metric - a.metric);
  }, [staff, membershipRecords, ptPackageRecords, dateRange, isPTorPTS, currentTrainerId, currentTrainerName, isSuperAdmin]);
  
  // Get department display name
  const getDepartmentName = (dept: string) => {
    const deptNames: Record<string, string> = {
      PT: "Personal Trainer",
      PTS: "PT Supervisor",
      FC: "Fitness Consultant",
      FCS: "FC Supervisor",
      CC: "Customer Care",
      CCS: "CC Supervisor",
      CM: "Club Manager",
      ASM: "Assistant Manager",
    };
    return deptNames[dept] || dept;
  };

  // Calculate daily revenue for both Membership and PT Package records
  const calculateDailyRevenue = () => {
    if (!dateRange?.from || !dateRange?.to) return [];
    
    // Use date range for the chart
    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Group revenue by day for both types
    const membershipRevenueByDay = new Map<string, number>();
    const ptPackageRevenueByDay = new Map<string, number>();
    
    // Process Membership Records
    // For PT/PTS, skip membership revenue (only show PT Package); for SUPERADMIN, show both
    if (!isPTorPTS || isSuperAdmin) {
      (membershipRecords || []).forEach((record: MembershipRecord) => {
        if (!record.paymentDate) return;
        const paymentDate = typeof record.paymentDate === "string" ? parseISO(record.paymentDate) : new Date(record.paymentDate);
        // Compare dates only (ignore time)
        const paymentDateOnly = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        if (paymentDateOnly >= startDateOnly && paymentDateOnly <= endDateOnly) {
          const dateKey = format(paymentDate, "yyyy-MM-dd");
          const currentRevenue = membershipRevenueByDay.get(dateKey) || 0;
          membershipRevenueByDay.set(dateKey, currentRevenue + (record.amount || 0));
        }
      });
    }
    
    // Process PT Package Records
    // For PT/PTS, only count packages assigned to them; for SUPERADMIN, count all
    (ptPackageRecords || []).forEach((record: PTPackageRecord) => {
      if (!record.paymentDate) return;
      
      // Filter by assigned staff for PT/PTS
      if (isPTorPTS && currentTrainerName && !isSuperAdmin) {
        if (record.assignedStaffName?.toLowerCase() !== currentTrainerName.toLowerCase()) return;
      }
      
      const paymentDate = typeof record.paymentDate === "string" ? parseISO(record.paymentDate) : new Date(record.paymentDate);
      // Compare dates only (ignore time)
      const paymentDateOnly = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      if (paymentDateOnly >= startDateOnly && paymentDateOnly <= endDateOnly) {
        const dateKey = format(paymentDate, "yyyy-MM-dd");
        const currentRevenue = ptPackageRevenueByDay.get(dateKey) || 0;
        ptPackageRevenueByDay.set(dateKey, currentRevenue + (record.amount || 0));
      }
    });
    
    // Create daily data array with both values
    const dailyData = days.map((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      return {
        date: dateKey,
        membership: Math.round((membershipRevenueByDay.get(dateKey) || 0) * 100) / 100,
        ptPackage: Math.round((ptPackageRevenueByDay.get(dateKey) || 0) * 100) / 100,
      };
    });
    
    return dailyData;
  };


  const chartData = useMemo(() => calculateDailyRevenue(), [dateRange, membershipRecords, ptPackageRecords, isPTorPTS, currentTrainerName, isSuperAdmin]);
  
  // Prepare Appointment Performance data (COMPLETED and CANCELLED)
  const getAppointmentPerformanceData = () => {
    if (!dateRange?.from || !dateRange?.to) return { completed: 0, cancelled: 0 };
    
    const rangeStart = new Date(dateRange.from);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(dateRange.to);
    rangeEnd.setHours(23, 59, 59, 999);

    let completed = 0;
    let cancelled = 0;

    // Filter appointments based on user role
    let filteredAppointments = appointments;
    if (isPTorPTS && currentTrainerId && !isSuperAdmin) {
      filteredAppointments = appointments.filter((apt: Appointment) => 
        apt.staffId === currentTrainerId
      );
    }

    // Count completed and cancelled appointments in the selected date range
    filteredAppointments.forEach((apt: Appointment) => {
      if (!apt.date) return;
      
      const aptDate = typeof apt.date === "string" ? parseISO(apt.date) : new Date(apt.date);
      if (!isWithinInterval(aptDate, { start: rangeStart, end: rangeEnd })) return;
      
      if (apt.status === "COMPLETED") {
        completed += 1;
      } else if (apt.status === "CANCELLED" || apt.status === "NO_SHOW") {
        cancelled += 1;
      }
    });

    return { completed, cancelled };
  };
  
  const appointmentPerformanceData = useMemo(() => getAppointmentPerformanceData(), [appointments, dateRange, isPTorPTS, currentTrainerId, isSuperAdmin]);
  
  // Prepare chart data for radial chart
  const appointmentChartData = useMemo(() => {
    const total = appointmentPerformanceData.completed + appointmentPerformanceData.cancelled;
    return total > 0 ? [{
      completed: appointmentPerformanceData.completed,
      cancelled: appointmentPerformanceData.cancelled,
    }] : [];
  }, [appointmentPerformanceData]);
  
  const chartConfig = {
    membership: {
      label: "Membership",
      color: "var(--chart-1)",
    },
    ptPackage: {
      label: "PT Package",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const appointmentChartConfig = {
    completed: {
      label: "Completed",
      color: "var(--chart-1)",
    },
    cancelled: {
      label: "Cancelled",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };


  const revenuePercent = stats && stats.totalRevenueTarget > 0
    ? (stats.totalRevenue / stats.totalRevenueTarget) * 100
    : 0;

  const sessionsPercent = stats && stats.totalSessionsTarget > 0
    ? (stats.totalSessions / stats.totalSessionsTarget) * 100
    : 0;

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase text-foreground font-montserrat">
            Hello, {currentStaff?.name || "User"}
          </h1>
        </div>
        <DatePickerWithRange
          value={dateRange}
          onChange={setDateRange}
          className="w-full sm:w-auto"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Available Staff Card */}
        <Card className="border-border/60 bg-card hover:border-border/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Staff</CardTitle>
            <div className="rounded-md bg-muted/40 p-1.5">
              <Users className="h-4 w-4 text-muted-foreground/70" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold font-mono text-foreground">
              {stats?.availableStaff || 0}
            </div>
            <div className="flex -space-x-2">
              {availableStaff.slice(0, 5).map((staffMember) => (
                <Avatar key={staffMember._id} className="border-2 border-background h-8 w-8 shadow-sm">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    {getInitials(staffMember.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {availableStaff.length > 5 && (
                <Avatar className="border-2 border-background h-8 w-8 shadow-sm">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-sm font-black bg-gradient-to-br from-muted to-muted/60 text-muted-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                    +{availableStaff.length - 5}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue Card */}
        <Card className="border-border/60 bg-card hover:border-border/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="rounded-md bg-muted/40 p-1.5">
              <DollarSign className="h-4 w-4 text-muted-foreground/70" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-2xl font-bold font-mono text-foreground">
                ${(stats?.totalRevenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground/70">
                of ${(stats?.totalRevenueTarget || 0).toLocaleString()} target
              </p>
            </div>
            <div className="space-y-1.5">
              <Progress 
                value={Math.min(revenuePercent, 100)} 
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground/70">
                {revenuePercent.toFixed(1)}% of target
            </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Sessions Card */}
        <Card className="border-border/60 bg-card hover:border-border/80 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
            <div className="rounded-md bg-muted/40 p-1.5">
              <Activity className="h-4 w-4 text-muted-foreground/70" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-2xl font-bold font-mono text-foreground">
                {stats?.totalSessions || 0}
              </div>
              <p className="text-xs text-muted-foreground/70">
                of {stats?.totalSessionsTarget || 0} target
              </p>
            </div>
            <div className="space-y-1.5">
              <Progress 
                value={Math.min(sessionsPercent, 100)} 
                className="h-1.5"
              />
              <p className="text-xs text-muted-foreground/70">
                {sessionsPercent.toFixed(1)}% of target
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon Card */}
        <Card className={cn(
          "border-border/60 bg-card hover:border-border/80 transition-colors",
          stats && stats.expiringSoon > 0 && "border-destructive/30 bg-destructive/5 dark:bg-destructive/5"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
            <div className={cn(
              "rounded-md p-1.5",
              stats && stats.expiringSoon > 0 
                ? "bg-destructive/10 dark:bg-destructive/20" 
                : "bg-muted/40"
            )}>
              <AlertCircle className={cn(
                "h-4 w-4",
                stats && stats.expiringSoon > 0 ? "text-destructive/70" : "text-muted-foreground/70"
              )} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="text-2xl font-bold font-mono text-foreground">
                {stats?.expiringSoon || 0}
              </div>
              <p className="text-xs text-muted-foreground/70">
                {isPTorPTS && !isSuperAdmin 
                  ? "PT packages expiring within 14 days" 
                  : "Memberships expiring within 14 days"}
              </p>
            </div>
            {stats && stats.expiringSoon > 0 && (
              <Badge variant="destructive" className="text-xs opacity-90">
                Attention Required
              </Badge>
              )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Daily Revenue Chart */}
        <Card className="col-span-4 border-border/60 bg-card pt-0">
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1">
              <CardTitle className="text-foreground">Daily Revenue</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-2 pt-4 pb-0 sm:px-6 sm:pt-6 sm:pb-0">
            {chartData.length > 0 && chartData.some(d => d.membership > 0 || d.ptPackage > 0) ? (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <AreaChart 
                  data={chartData}
                  margin={{
                    bottom: 8,
                    top: 8,
                    left: 8,
                    right: 8,
                  }}
                >
                  <defs>
                    <linearGradient id="fillMembership" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-membership)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-membership)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillPTPackage" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-ptPackage)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-ptPackage)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => {
                          return new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                        indicator="dot"
                        formatter={(value, name, item) => {
                          const indicatorColor = name === "membership" 
                            ? chartConfig.membership.color 
                            : name === "ptPackage" 
                            ? chartConfig.ptPackage.color 
                            : item.color;
                          return (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{
                                  backgroundColor: indicatorColor,
                                }}
                              />
                              <span className="text-foreground font-mono font-medium tabular-nums">
                                ${Number(value).toLocaleString()}
                              </span>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Area
                    dataKey="ptPackage"
                    type="natural"
                    fill="url(#fillPTPackage)"
                    stroke="var(--color-ptPackage)"
                  />
                  {(!isPTorPTS || isSuperAdmin) && (
                    <Area
                      dataKey="membership"
                      type="natural"
                      fill="url(#fillMembership)"
                      stroke="var(--color-membership)"
                    />
                  )}
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] items-center justify-center">
                <div className="text-center">
                  <div className="rounded-full bg-muted p-3 w-fit mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No revenue data</p>
                  <p className="text-xs text-muted-foreground">
                    Revenue data will appear here when available
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          {chartData.length > 0 && chartData.some(d => d.membership > 0 || d.ptPackage > 0) && (
            <CardFooter className="flex items-center justify-center gap-6 border-t border-border/50 pt-3 pb-3">
              {(!isPTorPTS || isSuperAdmin) && (
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-sm" 
                    style={{ backgroundColor: chartConfig.membership.color }} 
                  />
                  <span className="text-xs font-medium text-foreground">{chartConfig.membership.label}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-sm" 
                  style={{ backgroundColor: chartConfig.ptPackage.color }} 
                />
                <span className="text-xs font-medium text-foreground">{chartConfig.ptPackage.label}</span>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Performance Card */}
        <Card className="col-span-3 border-border/60 bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {topStaffByDepartment.length > 0 ? (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {topStaffByDepartment.map((staffMember, index) => {
                  const staffData = staff.find((s) => String(s._id) === staffMember.staffId);
                  // Only PT/PTS are shown, so no need for CC check
                  const isCC = false;
                  const displayValue = staffMember.displayValue;
                  const staffName = staffData?.name || staffMember.staffName;
                  const departmentName = getDepartmentName(staffMember.department);
                  const staffLevel = staffData?.level;

                  return (
                    <div
                      key={staffMember.staffId}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 dark:bg-muted/10 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/50 bg-muted/40 text-muted-foreground font-semibold text-xs shrink-0 font-mono">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {staffName}
                          </p>
                          <span className="text-xs text-muted-foreground/60">-</span>
                          <Badge variant="outline" className="text-[10px] h-5 px-2 font-medium">
                            {departmentName}
                          </Badge>
                        </div>
                        {staffLevel && (
                          <div className="flex items-center">
                            <span className="text-xs font-medium text-muted-foreground/80">
                              {staffLevel}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0 min-w-[80px]">
                        {isCC ? (
                          <>
                            <div className="text-base font-bold font-mono text-foreground">
                              {displayValue}
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 uppercase tracking-wide">
                              issued
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="text-base font-bold font-mono text-foreground">
                              {displayValue.toFixed(1)}%
                            </div>
                            <Progress 
                              value={Math.min(displayValue, 100)} 
                              className="w-20 h-1.5 mt-1.5"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center">
                <div className="text-center">
                  <div className="rounded-full bg-muted/50 p-3 w-fit mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-muted-foreground/70" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No data available</p>
                  <p className="text-xs text-muted-foreground/70">
                    Performance data will appear here
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* PT Conduct Bar Chart and Upcoming Appointments */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Appointment Performance Radial Chart */}
        <Card className="col-span-4 border-border/60 bg-card flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-foreground">Appointment Performance</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 items-center pb-0">
            {appointmentChartData.length > 0 && (appointmentPerformanceData.completed > 0 || appointmentPerformanceData.cancelled > 0) ? (
              <ChartContainer
                config={appointmentChartConfig}
                className="mx-auto aspect-square w-full max-w-[250px]"
              >
                <RadialBarChart
                  data={appointmentChartData}
                  endAngle={180}
                  innerRadius={80}
                  outerRadius={130}
                >
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const total = appointmentPerformanceData.completed + appointmentPerformanceData.cancelled;
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) - 16}
                                className="fill-foreground text-2xl font-bold"
                              >
                                {total.toLocaleString()}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 4}
                                className="fill-muted-foreground"
                              >
                                Total Appointments
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </PolarRadiusAxis>
                  <RadialBar
                    dataKey="completed"
                    stackId="a"
                    cornerRadius={5}
                    fill="var(--color-completed)"
                    className="stroke-transparent stroke-2"
                  />
                  <RadialBar
                    dataKey="cancelled"
                    fill="var(--color-cancelled)"
                    stackId="a"
                    cornerRadius={5}
                    className="stroke-transparent stroke-2"
                  />
                </RadialBarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center">
                <div className="text-center">
                  <div className="rounded-full bg-muted/50 p-3 w-fit mx-auto mb-4">
                    <CalendarClock className="h-6 w-6 text-muted-foreground/70" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No appointment data</p>
                  <p className="text-xs text-muted-foreground/70">
                    Appointment data will appear here when available
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          {appointmentChartData.length > 0 && (appointmentPerformanceData.completed > 0 || appointmentPerformanceData.cancelled > 0) && (
            <CardFooter className="flex-col gap-2 text-sm border-t border-border/50 pt-3 pb-3">
              <div className="flex items-center gap-2 leading-none font-medium">
                <span className="text-foreground">
                  {appointmentPerformanceData.completed} Completed
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-foreground">
                  {appointmentPerformanceData.cancelled} Cancelled
                </span>
              </div>
              <div className="text-muted-foreground leading-none">
                Showing appointments for the selected date range
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Upcoming Appointments Card */}
        <Card className="col-span-3 border-border/60 bg-card flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground">Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0 pb-0">
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-3 overflow-y-auto flex-1 pr-1 min-h-0 pb-1" style={{ maxHeight: '420px' }}>
                {upcomingAppointments.map((apt) => {
                  const aptDate = new Date(apt.date);
                  const isTodayApt = isToday(aptDate);
                  const isTomorrow = format(aptDate, "yyyy-MM-dd") === format(addDays(new Date(), 1), "yyyy-MM-dd");
                  
                  // Status badge configuration
                  const statusConfig = {
                    UPCOMING: {
                      icon: Clock3,
                      label: "Upcoming",
                      iconClassName: "text-muted-foreground/60",
                      badgeClassName: "bg-muted/30 border-border/40",
                    },
                    IN_PROGRESS: {
                      icon: PlayCircle,
                      label: "In Progress",
                      iconClassName: "text-primary",
                      badgeClassName: "bg-primary/10 border-primary/20",
                    },
                    COMPLETED: {
                      icon: CheckCircle2,
                      label: "Completed",
                      iconClassName: "text-green-600 dark:text-green-500",
                      badgeClassName: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/30",
                    },
                  };
                  
                  const status = statusConfig[apt.displayStatus];
                  const StatusIcon = status.icon;
                  
                  return (
                    <div
                      key={apt._id} 
                      className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-muted/20 dark:bg-muted/10 transition-colors"
                    >
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                        isTodayApt 
                          ? "bg-muted/60 border-border/50" 
                          : "bg-muted/40 border-border/50"
                      )}>
                        <CalendarClock className={cn(
                          "h-4 w-4",
                          isTodayApt ? "text-foreground" : "text-muted-foreground/70"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium leading-none text-foreground truncate">
                            {apt.clientName}
                          </p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                            {apt.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground/70 truncate">
                            {apt.staffName}
                          </p>
                          <span className="text-xs text-muted-foreground/50">•</span>
                          <span className="text-xs font-medium text-muted-foreground/70">
                            {isTodayApt ? "Today" : isTomorrow ? "Tomorrow" : format(aptDate, "MMM d")}
                          </span>
                          <span className="text-xs text-muted-foreground/50">•</span>
                          <span className="text-xs font-mono text-muted-foreground/70">
                            {apt.time}
                          </span>
                        </div>
                      </div>
                      <div 
                        className={cn(
                          "shrink-0 flex h-6 w-6 items-center justify-center rounded-md border",
                          status.badgeClassName
                        )}
                        title={status.label}
                      >
                        <StatusIcon className={cn("h-3.5 w-3.5", status.iconClassName)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="rounded-full bg-muted/50 p-3 w-fit mx-auto mb-4">
                    <CalendarClock className="h-6 w-6 text-muted-foreground/70" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No upcoming appointments</p>
                  <p className="text-xs text-muted-foreground/70">
                    Scheduled appointments will appear here
                </p>
              </div>
            </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

