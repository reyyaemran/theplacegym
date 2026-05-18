"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStaff, useUpdateStaff } from "@/hooks/use-staff";
import { useRoster, useUpdateRoster, useStaffYearRoster } from "@/hooks/use-roster";
import { Calendar, CalendarDays, TrendingUp, Users, Target, Circle, Award, Sun, Moon, Clock, Ban, Plane, Search, Flag, Thermometer, Wallet, X, Briefcase } from "lucide-react";
import { Staff, StaffDepartment } from "@/types/staff";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { RosterRecord } from "@/types/roster";

type ShiftType = "AM" | "MID" | "PM";
type LeaveType = "AL" | "PH" | "SL" | "UP";
type RosterDayStatus = "shift" | "dayoff" | "leave" | "none";

interface RosterDayData {
  status: RosterDayStatus;
  shiftType?: ShiftType;
  leaveType?: LeaveType;
}

interface RosterData {
  [staffId: string]: {
    [day: number]: RosterDayData;
  };
}

// Department icon helper
const getDepartmentIcon = (dept: StaffDepartment) => {
  switch (dept) {
    case "PT":
    case "PTS":
      return <Users className="h-3 w-3" />;
    case "FC":
    case "FCS":
      return <Target className="h-3 w-3" />;
    case "CC":
    case "CCS":
      return <Circle className="h-3 w-3" />;
    case "CM":
    case "ASM":
      return <Award className="h-3 w-3" />;
  }
};

// Department sort order
const getDepartmentSortOrder = (dept: StaffDepartment): number => {
  const order: Record<StaffDepartment, number> = {
    PT: 1,
    PTS: 2,
    FC: 3,
    FCS: 4,
    CC: 5,
    CCS: 6,
    CM: 7,
    ASM: 8,
  };
  return order[dept] || 99;
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

export function RosterPage() {
  const { data: staffData = [], isLoading: isStaffLoading } = useStaff();
  const updateStaffMutation = useUpdateStaff();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Fetch roster data from API
  const { data: rosterRecords = [], isLoading: isRosterLoading } = useRoster(selectedMonth, selectedYear);
  const updateRosterMutation = useUpdateRoster();

  const [rosterData, setRosterData] = useState<RosterData>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const isLoading = isStaffLoading || isRosterLoading;

  // Generate days 1-30 for the month
  const days = useMemo(() => {
    // Use actual days in month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [selectedMonth, selectedYear]);

  // Sort staff by department
  const sortedStaffData = useMemo(() => {
    return [...staffData].sort((a, b) => {
      const orderA = getDepartmentSortOrder(a.department);
      const orderB = getDepartmentSortOrder(b.department);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // If same department, sort by name
      return a.name.localeCompare(b.name);
    });
  }, [staffData]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery) return sortedStaffData;
    return sortedStaffData.filter((staff) =>
      staff.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedStaffData, searchQuery]);

  // Initialize/Update roster data merging DB records with defaults
  useEffect(() => {
    if (sortedStaffData.length === 0 || days.length === 0) return;
    
    setRosterData((prev) => {
      const updated: RosterData = {};
      
      sortedStaffData.forEach((staff) => {
        const staffId = staff._id || "";
        if (!staffId) return;
        
        updated[staffId] = {};
        
        // Get default shift type from staff profile
        const defaultShift: ShiftType = 
          staff.shift === "AM" ? "AM" :
          staff.shift === "MID" ? "MID" :
          staff.shift === "NOON" ? "PM" : "AM";
        
        // Get day off from staff profile (e.g., "Monday", "Sunday")
        const dayOffName = staff.dayOff?.toLowerCase();
        
        days.forEach((day) => {
          // Construct date string YYYY-MM-DD
          const dateObj = new Date(selectedYear, selectedMonth - 1, day);
          // Use local date string format to match API expected format (YYYY-MM-DD)
          // Pad month and day
          const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          // Check if there is a DB record for this day
          const record = rosterRecords.find(r => r.staffId === staffId && r.date === dateStr);

          if (record) {
            updated[staffId][day] = {
              status: record.status as RosterDayStatus,
              shiftType: record.shiftType,
              leaveType: record.leaveType,
            };
          } else {
            // Default logic if no record exists
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
            
            // If this is the staff's day off, set it as dayoff
            if (dayOffName && dayName === dayOffName) {
              updated[staffId][day] = {
                status: "dayoff",
              };
            } else if (staff.shift) {
              // Otherwise, set default shift
              updated[staffId][day] = {
                status: "shift",
                shiftType: defaultShift,
              };
            } else {
              // No shift set, leave as none
              updated[staffId][day] = {
                status: "none",
              };
            }
          }
        });
      });
      
      return updated;
    });
  }, [sortedStaffData, selectedMonth, selectedYear, days, rosterRecords]);

  // Get day names for each day of the month
  const dayNames = useMemo(() => {
    return days.map((day) => {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    });
  }, [days, selectedMonth, selectedYear]);

  // Calculate stats for each staff member
  const staffStats = useMemo(() => {
    return sortedStaffData.map((staff) => {
      const staffRoster = rosterData[staff._id || ""] || {};
      let workingDays = 0;
      let leaveDays = 0;

      days.forEach((day) => {
        const dayData = staffRoster[day];
        if (!dayData) return;
        
        const { status, leaveType } = dayData;
        if (status === "shift") {
          workingDays++;
        } else if (status === "leave") {
          leaveDays++;
          // Unpaid Leave (UP) is not counted as working day
          if (leaveType === "UP") {
            // Already counted as leave, but not as working day
          }
        }
        // "none" and "dayoff" are not counted
      });

      // Use staff's annual leave balance or default to 18
      const totalLeaveBalance = staff.annualLeaveBalance ?? 18;
      const leaveBalance = totalLeaveBalance - leaveDays;

      return {
        staffId: staff._id || "",
        staffName: staff.name,
        workingDays,
        leaveUsage: leaveDays,
        leaveBalance: Math.max(0, leaveBalance),
      };
    });
  }, [sortedStaffData, rosterData, days]);

  // Overall stats
  const overallStats = useMemo(() => {
    const totalWorkingDays = staffStats.reduce((sum, stat) => sum + stat.workingDays, 0);
    const totalLeaveUsage = staffStats.reduce((sum, stat) => sum + stat.leaveUsage, 0);
    const totalLeaveBalance = staffStats.reduce((sum, stat) => sum + stat.leaveBalance, 0);

    return {
      totalWorkingDays,
      totalLeaveUsage,
      totalLeaveBalance,
    };
  }, [staffStats]);

  const saveRosterUpdate = (staffId: string, day: number, data: RosterDayData) => {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    updateRosterMutation.mutate({
      staffId,
      date: dateStr,
      status: data.status,
      shiftType: data.shiftType,
      leaveType: data.leaveType,
    });
  };

  const handleStatusChange = async (staffId: string, day: number, status: RosterDayStatus) => {
    // Optimistic update
    setRosterData((prev) => {
      const currentDayData = prev[staffId]?.[day] || { status: "none" };
      const staff = sortedStaffData.find((s) => s._id === staffId);
      const defaultShift: ShiftType = 
        staff?.shift === "AM" ? "AM" :
        staff?.shift === "MID" ? "MID" :
        staff?.shift === "NOON" ? "PM" : "AM";

      // Check for leave changes to update user stats
      if (currentDayData.status === "leave" && status !== "leave") {
        // Removing leave -> decrement usage
        updateStaffLeaveUsage(staffId, currentDayData.leaveType, -1);
      } else if (status === "leave") {
        // Setting to leave without specifying type -> defaults to AL or keeps current
        const leaveType = currentDayData.leaveType || "AL";
        // If it wasn't leave before, increment
        if (currentDayData.status !== "leave") {
          updateStaffLeaveUsage(staffId, leaveType, 1);
        }
      }

      const newData: RosterDayData = {
        status,
        shiftType: status === "shift" ? (currentDayData.shiftType || defaultShift) : undefined,
        leaveType: status === "leave" ? (currentDayData.leaveType || "AL") : undefined,
      };

      // Trigger API update
      saveRosterUpdate(staffId, day, newData);

      return {
        ...prev,
        [staffId]: {
          ...(prev[staffId] || {}),
          [day]: newData,
        },
      };
    });
  };

  const handleShiftTypeChange = (staffId: string, day: number, shiftType: ShiftType) => {
    setRosterData((prev) => {
      const currentDayData = prev[staffId]?.[day] || { status: "shift" };
      
      // If changing from leave to shift, we need to decrement leave usage
      if (currentDayData.status === "leave") {
        updateStaffLeaveUsage(staffId, currentDayData.leaveType, -1);
      }

      const newData: RosterDayData = {
        ...currentDayData,
        status: "shift",
        shiftType,
        leaveType: undefined, // Ensure leave type is cleared
      };

      // Trigger API update
      saveRosterUpdate(staffId, day, newData);

      return {
        ...prev,
        [staffId]: {
          ...(prev[staffId] || {}),
          [day]: newData,
        },
      };
    });
  };

  const handleLeaveTypeChange = (staffId: string, day: number, leaveType: LeaveType) => {
    setRosterData((prev) => {
      const currentDayData = prev[staffId]?.[day] || { status: "leave" };
      
      // Logic for updating staff record
      if (currentDayData.status === "leave") {
        // Changing leave type
        if (currentDayData.leaveType !== leaveType) {
          // Decrement old type, increment new type
          updateStaffLeaveUsage(staffId, currentDayData.leaveType, -1);
          updateStaffLeaveUsage(staffId, leaveType, 1);
        }
      } else {
        // Changing from non-leave to leave
        updateStaffLeaveUsage(staffId, leaveType, 1);
      }

      const newData: RosterDayData = {
        ...currentDayData,
        status: "leave",
        leaveType,
        shiftType: undefined, // Ensure shift type is cleared
      };

      // Trigger API update
      saveRosterUpdate(staffId, day, newData);

      return {
        ...prev,
        [staffId]: {
          ...(prev[staffId] || {}),
          [day]: newData,
        },
      };
    });
  };

  // Helper to update staff leave usage
  const updateStaffLeaveUsage = (staffId: string, leaveType: LeaveType | undefined, change: number) => {
    const staff = sortedStaffData.find(s => s._id === staffId);
    if (!staff || !leaveType) return;

    const updateData: any = {};
    
    if (leaveType === "AL") {
      updateData.annualLeaveUsed = (staff.annualLeaveUsed || 0) + change;
    } else if (leaveType === "SL") {
      updateData.sickLeaveUsed = (staff.sickLeaveUsed || 0) + change;
    } else if (leaveType === "PH") {
      updateData.publicHolidayUsed = (staff.publicHolidayUsed || 0) + change;
    } else if (leaveType === "UP") {
      updateData.unpaidLeaveUsed = (staff.unpaidLeaveUsed || 0) + change;
    }

    // Ensure no negative values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] < 0) updateData[key] = 0;
    });

    updateStaffMutation.mutate({
      id: staffId,
      data: updateData
    });
  };

  const getStatusColor = (dayData: RosterDayData | undefined) => {
    if (!dayData || dayData.status === "none") {
      return "text-muted-foreground border border-border hover:text-muted-foreground";
    }
    
    switch (dayData.status) {
      case "shift":
        // Different colors for each shift type - text and icon only, maintain on hover
        switch (dayData.shiftType) {
          case "AM":
            // Primary color (purple) for AM shift (morning)
            return "text-primary dark:text-primary border border-border hover:text-primary dark:hover:text-primary";
          case "MID":
            // Muted nude green color for MID shift (midday)
            return "text-emerald-700/80 dark:text-emerald-300/80 border border-border hover:text-emerald-700/80 dark:hover:text-emerald-300/80";
          case "PM":
            // Blue color for PM shift (evening)
            return "text-blue-600 dark:text-blue-400 border border-border hover:text-blue-600 dark:hover:text-blue-400";
          default:
            return "text-primary dark:text-primary border border-border hover:text-primary dark:hover:text-primary";
        }
      case "dayoff":
        // Red color for day off
        return "text-destructive dark:text-destructive border border-border hover:text-destructive dark:hover:text-destructive";
      case "leave":
        // Orange/amber color for leave
        return "text-amber-600 dark:text-amber-400 border border-border hover:text-amber-600 dark:hover:text-amber-400";
      default:
        return "text-muted-foreground border border-border hover:text-muted-foreground";
    }
  };

  const getStatusIconColor = (dayData: RosterDayData | undefined) => {
    if (!dayData || dayData.status === "none") {
      return "text-muted-foreground";
    }
    
    switch (dayData.status) {
      case "shift":
        switch (dayData.shiftType) {
          case "AM":
            return "text-primary dark:text-primary";
          case "MID":
            return "text-emerald-700/80 dark:text-emerald-300/80";
          case "PM":
            return "text-blue-600 dark:text-blue-400";
          default:
            return "text-primary dark:text-primary";
        }
      case "dayoff":
        return "text-destructive dark:text-destructive";
      case "leave":
        return "text-amber-600 dark:text-amber-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (dayData: RosterDayData | undefined) => {
    if (!dayData || dayData.status === "none") {
      return null;
    }
    
    const iconColor = getStatusIconColor(dayData);
    
    switch (dayData.status) {
      case "shift":
        switch (dayData.shiftType) {
          case "AM":
            return <Sun className={`h-3 w-3 ${iconColor}`} />;
          case "MID":
            return <Clock className={`h-3 w-3 ${iconColor}`} />;
          case "PM":
            return <Moon className={`h-3 w-3 ${iconColor}`} />;
          default:
            return <Clock className={`h-3 w-3 ${iconColor}`} />;
        }
      case "dayoff":
        return <Ban className={`h-3 w-3 ${iconColor}`} />;
      case "leave":
        switch (dayData.leaveType) {
          case "AL":
            return <Plane className={`h-3 w-3 ${iconColor}`} />;
          case "PH":
            return <Flag className={`h-3 w-3 ${iconColor}`} />;
          case "SL":
            return <Thermometer className={`h-3 w-3 ${iconColor}`} />;
          case "UP":
            return <Wallet className={`h-3 w-3 ${iconColor}`} />;
          default:
            return <Plane className={`h-3 w-3 ${iconColor}`} />;
        }
      default:
        return null;
    }
  };

  const getDisplayText = (dayData: RosterDayData | undefined) => {
    if (!dayData || dayData.status === "none") {
      return "-";
    }
    
    switch (dayData.status) {
      case "shift":
        return dayData.shiftType || "Shift";
      case "dayoff":
        return "DO";
      case "leave":
        return dayData.leaveType || "Leave";
      default:
        return "-";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading roster...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight uppercase font-montserrat">ROSTER</h1>
      </div>

      {/* Stats Cards — Overall or Selected Staff Detail */}
      {selectedStaff ? (
        <SelectedStaffStats
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground/90">
                Total Working Days
              </CardTitle>
              <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20">
                <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {overallStats.totalWorkingDays}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground/90">
                Leave Usage
              </CardTitle>
              <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/20">
                <Calendar className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {overallStats.totalLeaveUsage}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-foreground/90">
                Leave Balance
              </CardTitle>
              <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {overallStats.totalLeaveBalance}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Roster Table */}
      <div className="rounded-lg border bg-card w-full flex flex-col min-h-[300px] h-[calc(100vh-12rem)] sm:h-[calc(100vh-380px)] overflow-hidden">
        <div className="border-b p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 shrink-0">
          <div
            className={cn(
              "relative transition-all duration-200 ease-in-out min-w-0",
              isSearchFocused || searchQuery.length > 0
                ? "w-full lg:w-80"
                : "w-full sm:w-40 lg:w-60"
            )}
          >
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className={cn(
                "pl-9 transition-all duration-200 placeholder:text-sm h-10",
                !isSearchFocused && !searchQuery.length && "pr-3"
              )}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-full min-w-[100px] sm:w-[130px] h-10">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {new Date(selectedYear, month - 1).toLocaleString("default", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-full min-w-[70px] sm:w-[90px] h-10">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex-1 w-full overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto">
            <Table className="w-max table-fixed border-collapse relative min-w-full">
              <TableHeader className="sticky top-0 z-20 bg-card shadow-sm">
                <TableRow>
                  <TableHead className="sticky left-0 z-30 bg-card w-[180px] min-w-[180px] shadow-[1px_0_0_0_hsl(var(--border))] h-14">
                    Staff Name
                  </TableHead>
                  <TableHead className="sticky left-[180px] z-30 bg-card w-[100px] min-w-[100px] shadow-[1px_0_0_0_hsl(var(--border))] h-14 text-center">
                    <div className="flex items-center justify-center h-full">
                      Dept
                    </div>
                  </TableHead>
                  {days.map((day, index) => (
                    <TableHead key={day} className="text-center p-1 bg-card w-[50px] min-w-[50px] h-14">
                      <div className="flex flex-col gap-0.5 items-center justify-center h-full">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                          {dayNames[index]}
                        </span>
                        <span className="text-xs font-semibold font-mono">{day}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staff) => {
                  const stats = staffStats.find((s) => s.staffId === staff._id) || {
                    workingDays: 0,
                    leaveUsage: 0,
                    leaveBalance: staff.annualLeaveBalance ?? 18,
                  };
                  const staffRoster = rosterData[staff._id || ""] || {};

                  return (
                    <TableRow key={staff._id} className={cn("h-12", selectedStaff?._id === staff._id && "bg-primary/5")}>
                      <TableCell className="sticky left-0 z-10 bg-background w-[180px] min-w-[180px] shadow-[1px_0_0_0_hsl(var(--border))] p-2">
                        <button
                          type="button"
                          className="flex items-center gap-2.5 w-full text-left cursor-pointer"
                          onClick={() => {
                            setSelectedStaff(selectedStaff?._id === staff._id ? null : staff);
                          }}
                        >
                          <Avatar className="h-8 w-8 shrink-0 border-2 border-background shadow-sm">
                            <AvatarImage src={staff.avatar} alt={staff.name} />
                            <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-muted to-muted/80 text-foreground font-montserrat">
                              {getInitials(staff.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm truncate block transition-colors" title={staff.name}>{staff.name}</span>
                        </button>
                      </TableCell>
                      <TableCell className="sticky left-[180px] z-10 bg-background w-[100px] min-w-[100px] shadow-[1px_0_0_0_hsl(var(--border))] p-2 text-center">
                        <Badge variant="outline" className="gap-1 border-muted bg-muted/50 text-[10px] font-normal shrink-0 inline-flex">
                          {getDepartmentIcon(staff.department)}
                          <span>{staff.department}</span>
                        </Badge>
                      </TableCell>
                      {days.map((day) => {
                        const dayData = staffRoster[day] || { status: "none" };
                        return (
                          <TableCell key={day} className="p-0.5 w-[50px] min-w-[50px] text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className={`h-7 w-full text-[10px] justify-center gap-1 hover:bg-transparent px-1 ${getStatusColor(dayData)}`}
                                  aria-label={getDisplayText(dayData)}
                                >
                                  {getStatusIcon(dayData)}
                                  {dayData.status !== "shift" && dayData.status !== "dayoff" && dayData.status !== "leave" && <span>{getDisplayText(dayData)}</span>}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-32">
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(staff._id || "", day, "none")}
                                >
                                  -
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    Shift
                                    {dayData.status === "shift" && dayData.shiftType && (
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {dayData.shiftType}
                                      </span>
                                    )}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() => handleShiftTypeChange(staff._id || "", day, "AM")}
                                    >
                                      AM
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleShiftTypeChange(staff._id || "", day, "MID")}
                                    >
                                      MID
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleShiftTypeChange(staff._id || "", day, "PM")}
                                    >
                                      PM
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuItem
                                  onClick={() => handleStatusChange(staff._id || "", day, "dayoff")}
                                >
                                  Day Off
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    Leave
                                    {dayData.status === "leave" && dayData.leaveType && (
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {dayData.leaveType}
                                      </span>
                                    )}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() => handleLeaveTypeChange(staff._id || "", day, "AL")}
                                    >
                                      AL
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleLeaveTypeChange(staff._id || "", day, "PH")}
                                    >
                                      PH
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleLeaveTypeChange(staff._id || "", day, "SL")}
                                    >
                                      SL
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleLeaveTypeChange(staff._id || "", day, "UP")}
                                    >
                                      UP
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Footer Shift Guide */}
        <div className="border-t p-4 bg-muted/10 shrink-0">
          <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Sun className="h-3 w-3 text-primary dark:text-primary" />
              <span>AM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-emerald-700/80 dark:text-emerald-300/80" />
              <span>MID</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Moon className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span>PM</span>
            </div>
            <div className="h-3 w-px bg-border mx-1" />
            <div className="flex items-center gap-1.5">
              <Ban className="h-3 w-3 text-destructive dark:text-destructive" />
              <span>Day Off</span>
            </div>
            <div className="h-3 w-px bg-border mx-1" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Plane className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>AL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flag className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>PH</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Thermometer className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>SL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span>UP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// --- Helper for leave stats calculation ---
interface LeaveStats {
  al: number;
  ph: number;
  sl: number;
  up: number;
  total: number;
}

function calcLeaveStats(records: RosterRecord[]): LeaveStats {
  const stats: LeaveStats = { al: 0, ph: 0, sl: 0, up: 0, total: 0 };
  records.forEach((r) => {
    if (r.status === "leave") {
      stats.total++;
      switch (r.leaveType) {
        case "AL": stats.al++; break;
        case "PH": stats.ph++; break;
        case "SL": stats.sl++; break;
        case "UP": stats.up++; break;
      }
    }
  });
  return stats;
}

// --- Selected Staff Stats inline component ---
function SelectedStaffStats({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentMonth = today.getMonth() + 1;
  const currentMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, "0")}-`;

  const { data: ytdRecords = [], isLoading } = useStaffYearRoster(
    staff._id,
    currentYear,
    todayStr
  );

  const stats = useMemo(() => {
    // Build a lookup from DB records: date string -> record
    const recordMap = new Map<string, RosterRecord>();
    ytdRecords.forEach((r) => recordMap.set(r.date, r));

    // Staff defaults
    const defaultShift: ShiftType =
      staff.shift === "AM" ? "AM" :
      staff.shift === "MID" ? "MID" :
      staff.shift === "NOON" ? "PM" : "AM";
    const dayOffName = staff.dayOff?.toLowerCase();
    const hasShift = !!staff.shift;

    // Iterate every calendar day from Jan 1 to today, applying defaults where no DB record
    let workingDays = 0;
    let dayOffs = 0;
    let monthWorkingDays = 0;
    let monthDayOffs = 0;
    const yearLeave: LeaveStats = { al: 0, ph: 0, sl: 0, up: 0, total: 0 };
    const monthLeave: LeaveStats = { al: 0, ph: 0, sl: 0, up: 0, total: 0 };

    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(today);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const isThisMonth = dateStr.startsWith(currentMonthPrefix);

      const record = recordMap.get(dateStr);
      let status: RosterDayStatus = "none";
      let leaveType: LeaveType | undefined;

      if (record) {
        status = record.status as RosterDayStatus;
        leaveType = record.leaveType as LeaveType | undefined;
      } else {
        // Apply default logic (same as the roster table useEffect)
        const dayName = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        if (dayOffName && dayName === dayOffName) {
          status = "dayoff";
        } else if (hasShift) {
          status = "shift";
        }
      }

      // Count
      if (status === "shift") {
        workingDays++;
        if (isThisMonth) monthWorkingDays++;
      } else if (status === "dayoff") {
        dayOffs++;
        if (isThisMonth) monthDayOffs++;
      } else if (status === "leave" && leaveType) {
        yearLeave.total++;
        if (isThisMonth) monthLeave.total++;
        switch (leaveType) {
          case "AL":
            yearLeave.al++;
            if (isThisMonth) monthLeave.al++;
            break;
          case "PH":
            yearLeave.ph++;
            if (isThisMonth) monthLeave.ph++;
            break;
          case "SL":
            yearLeave.sl++;
            if (isThisMonth) monthLeave.sl++;
            break;
          case "UP":
            yearLeave.up++;
            if (isThisMonth) monthLeave.up++;
            break;
        }
      }
    }

    const alBalance = Math.max(0, (staff.annualLeaveBalance ?? 18) - yearLeave.al);
    const phBalance = Math.max(0, (staff.publicHolidayBalance ?? 11) - yearLeave.ph);
    const slBalance = Math.max(0, (staff.sickLeaveBalance ?? 30) - yearLeave.sl);

    return { workingDays, dayOffs, yearLeave, monthWorkingDays, monthDayOffs, monthLeave, alBalance, phBalance, slBalance };
  }, [ytdRecords, currentMonthPrefix, staff, currentYear, today]);

  const startOfYear = new Date(currentYear, 0, 1);
  const calendarDays = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const monthName = today.toLocaleString("default", { month: "long" });

  return (
    <Card className="relative overflow-hidden">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
            <AvatarImage src={staff.avatar} alt={staff.name} />
            <AvatarFallback className="text-[10px] font-black bg-gradient-to-br from-muted to-muted/80 text-foreground font-montserrat">
              {getInitials(staff.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-sm font-bold">{staff.name}</CardTitle>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] font-normal gap-1">
                {getDepartmentIcon(staff.department)}
                {staff.department}
              </Badge>
              {staff.level && (
                <Badge variant="secondary" className="text-[10px] font-normal">{staff.level}</Badge>
              )}
              <span className="text-[10px] text-muted-foreground">
                Jan 1 – {today.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, {currentYear}
              </span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose} aria-label="Close staff details">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Calculating...</div>
        ) : (
          <>
            {/* Row 1: Summary numbers */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat
                icon={<Briefcase className="h-3.5 w-3.5 text-blue-500" />}
                label="Working Days (YTD)"
                value={stats.workingDays}
                sub={`of ${calendarDays} calendar days`}
              />
              <MiniStat
                icon={<Ban className="h-3.5 w-3.5 text-destructive" />}
                label="Day Offs (YTD)"
                value={stats.dayOffs}
              />
              <MiniStat
                icon={<Clock className="h-3.5 w-3.5 text-indigo-500" />}
                label={`Working (${monthName})`}
                value={stats.monthWorkingDays}
                sub={`${stats.monthDayOffs} day offs`}
              />
              <MiniStat
                icon={<Calendar className="h-3.5 w-3.5 text-amber-500" />}
                label={`Leave (${monthName})`}
                value={stats.monthLeave.total}
                badges={stats.monthLeave.total > 0 ? [
                  ...(stats.monthLeave.al > 0 ? [`AL:${stats.monthLeave.al}`] : []),
                  ...(stats.monthLeave.ph > 0 ? [`PH:${stats.monthLeave.ph}`] : []),
                  ...(stats.monthLeave.sl > 0 ? [`SL:${stats.monthLeave.sl}`] : []),
                  ...(stats.monthLeave.up > 0 ? [`UP:${stats.monthLeave.up}`] : []),
                ] : undefined}
              />
            </div>

            {/* Row 2: Leave Balance per type */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <LeaveBalanceItem
                icon={<Plane className="h-3.5 w-3.5" />}
                label="Annual Leave"
                used={stats.yearLeave.al}
                total={staff.annualLeaveBalance ?? 18}
                balance={stats.alBalance}
                color="blue"
              />
              <LeaveBalanceItem
                icon={<Flag className="h-3.5 w-3.5" />}
                label="Public Holiday"
                used={stats.yearLeave.ph}
                total={staff.publicHolidayBalance ?? 11}
                balance={stats.phBalance}
                color="purple"
              />
              <LeaveBalanceItem
                icon={<Thermometer className="h-3.5 w-3.5" />}
                label="Sick Leave"
                used={stats.yearLeave.sl}
                total={staff.sickLeaveBalance ?? 30}
                balance={stats.slBalance}
                color="emerald"
              />
              <LeaveBalanceItem
                icon={<Wallet className="h-3.5 w-3.5" />}
                label="Unpaid Leave"
                used={stats.yearLeave.up}
                total={null}
                balance={null}
                color="orange"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- Mini stat card ---
function MiniStat({ icon, label, value, sub, badges }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  badges?: string[];
}) {
  return (
    <div className="rounded-lg border bg-background p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="text-xl font-bold font-mono tracking-tight tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {badges.map((b) => (
            <span key={b} className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Leave balance item ---
function LeaveBalanceItem({ icon, label, used, total, balance, color }: {
  icon: React.ReactNode;
  label: string;
  used: number;
  total: number | null;
  balance: number | null;
  color: "blue" | "purple" | "emerald" | "orange";
}) {
  const percentage = total !== null && total > 0 ? Math.min(100, (used / total) * 100) : 0;

  const colorMap = {
    blue: { text: "text-blue-500", bar: "bg-blue-500" },
    purple: { text: "text-purple-500", bar: "bg-purple-500" },
    emerald: { text: "text-emerald-500", bar: "bg-emerald-500" },
    orange: { text: "text-orange-500", bar: "bg-orange-500" },
  };

  const c = colorMap[color];

  return (
    <div className="rounded-lg border bg-background p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className={c.text}>{icon}</span>
        <span className="text-[11px] font-medium truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        {balance !== null ? (
          <>
            <span className={`text-xl font-bold font-mono tabular-nums ${c.text}`}>{balance}</span>
            <span className="text-[10px] text-muted-foreground">remaining</span>
          </>
        ) : (
          <>
            <span className={`text-xl font-bold font-mono tabular-nums ${c.text}`}>{used}</span>
            <span className="text-[10px] text-muted-foreground">days used</span>
          </>
        )}
      </div>
      {total !== null && (
        <>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                percentage >= 90 ? "bg-destructive" : percentage >= 70 ? "bg-amber-500" : c.bar
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {used} used / {total} total
          </div>
        </>
      )}
    </div>
  );
}
