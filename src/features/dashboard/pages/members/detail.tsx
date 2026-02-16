"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Member, MemberDocument } from "./types/member";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin,
  Building,
  DollarSign,
  User,
  FileText,
  Clock,
  MessageSquare,
  CalendarDays,
  Activity,
  Star,
  Download,
  Eye,
  Upload,
  X,
  Heart,
  Pill,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, differenceInDays } from "date-fns";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { MemberHistoryTable } from "./components/member-history-table";
import { MemberActivityTable } from "./components/member-activity-table";
import { generateMemberActivities } from "./data/mock-member-activities";
import { getActivityTypeLabel } from "./components/member-activity-table";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { useMembershipRecords } from "@/hooks/use-membership-records";
import { usePTPackageRecords } from "@/hooks/use-pt-package-records";
import { useAppointments } from "@/hooks/use-appointments";
import { useMemberById } from "@/hooks/use-members";
import { useClearPackageRecords } from "@/hooks/use-clear-package-records";
import { Appointment } from "@/types/appointment";
import { toast } from "sonner";
import { ManageMembershipDialog } from "./components/manage-membership-dialog";
import { ManagePTPackageDialog } from "./components/manage-pt-package-dialog";
import { AddPackageDrawer } from "./components/add-package-drawer";
import { useStaff as useStaffQuery } from "@/hooks/use-staff";
import { useUpdateMember } from "@/hooks/use-members";

export function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  
  // Fetch member data from API (supports both ID and memberNumber)
  const { data: member, isLoading: memberLoading, error: memberError } = useMemberById(id);
  
  // Update URL to use memberNumber instead of ID once member is loaded
  useEffect(() => {
    if (member && member.memberNumber && id !== member.memberNumber) {
      // Update URL without page reload using Next.js router
      router.replace(`/dashboard/members/${currentMember.memberNumber}`, { scroll: false });
    }
  }, [member, id, router]);
  
  // Fetch all records and filter by member
  // Force refetch to ensure fresh data (staleTime: 0 in hooks)
  const { data: allMembershipRecords = [], refetch: refetchMemberships } = useMembershipRecords();
  const { data: allPTPackageRecords = [], refetch: refetchPTPackages } = usePTPackageRecords();
  const { data: allAppointments = [] } = useAppointments();
  const { data: staffData = [] } = useStaffQuery();
  
  // Refetch on mount to ensure fresh data after cleanup
  useEffect(() => {
    refetchMemberships();
    refetchPTPackages();
  }, [refetchMemberships, refetchPTPackages]);
  
  // History table state
  const [historySorting, setHistorySorting] = useState<SortingState>([
    { id: "paymentDate", desc: true },
  ]);
  const [historyPagination, setHistoryPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });

  // Activity table state
  const [activitySorting, setActivitySorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [activityPagination, setActivityPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 6,
  });

  // Get member's membership and PT package records
  const memberMembershipRecords = useMemo(() => {
    if (!member) return [];
    const filtered = allMembershipRecords.filter(
      (record) => record.memberId === member.memberNumber || record.memberName === member.fullName
    );
    return filtered;
  }, [member, allMembershipRecords]);

  const memberPTPackageRecords = useMemo(() => {
    if (!member) return [];
    const filtered = allPTPackageRecords.filter(
      (record) => record.memberId === member.memberNumber || record.memberName === member.fullName
    );
    return filtered;
  }, [member, allPTPackageRecords]);

  // Get member's appointments
  const memberAppointments = useMemo(() => {
    if (!member) return [];
    return allAppointments.filter(
      (apt) => apt.clientName === member.fullName || apt.clientId === member.id
    );
  }, [member, allAppointments]);

  // Generate member activities
  const memberActivities = useMemo(() => {
    if (!member) return [];
    return generateMemberActivities(
      member.id,
      member.fullName,
      memberMembershipRecords,
      memberPTPackageRecords,
      memberAppointments,
      staffData,
      member.documents
    );
  }, [member, memberMembershipRecords, memberPTPackageRecords, memberAppointments, staffData]);

  const activityPageCount = Math.ceil(memberActivities.length / activityPagination.pageSize);

  // Dialog states for managing packages
  const [manageMembershipDialogOpen, setManageMembershipDialogOpen] = useState(false);
  const [managePTPackageDialogOpen, setManagePTPackageDialogOpen] = useState(false);
  const [selectedMembershipRecord, setSelectedMembershipRecord] = useState<MembershipRecord | null>(null);
  const [selectedPTPackageRecord, setSelectedPTPackageRecord] = useState<PTPackageRecord | null>(null);
  
  // Drawer state for creating packages
  const [createPackageDrawerOpen, setCreatePackageDrawerOpen] = useState(false);
  const [selectedPackageTab, setSelectedPackageTab] = useState<"membership" | "pt-package">("membership");

  const handleManageMembership = (record: MembershipRecord) => {
    setSelectedMembershipRecord(record);
    setManageMembershipDialogOpen(true);
  };

  const handleManagePTPackage = (record: PTPackageRecord) => {
    setSelectedPTPackageRecord(record);
    setManagePTPackageDialogOpen(true);
  };

  const handlePackageManageSuccess = () => {
    // Refetch records after successful management
    refetchMemberships();
    refetchPTPackages();
  };

  const handleCreatePackage = () => {
    setSelectedPackageTab("membership");
    setCreatePackageDrawerOpen(true);
  };

  const handlePackageCreateSuccess = () => {
    // Refetch records after successful creation
    refetchMemberships();
    refetchPTPackages();
    setCreatePackageDrawerOpen(false);
  };

  // Document upload mutation
  const updateMemberMutation = useUpdateMember();

  // Handle document upload
  const handleDocumentUpload = async (file: File) => {
    if (!member) return;
    
    try {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const newDoc: MemberDocument = {
          id: `doc-${Date.now()}`,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'document',
          url: reader.result as string,
          uploadedAt: new Date().toISOString(),
        };
        
        // Get existing documents and add the new one
        const existingDocuments = member.documents || [];
        const updatedDocuments = [...existingDocuments, newDoc];
        
        // Update member via API - use memberNumber as it's more reliable than id
        const memberIdentifier = member.memberNumber || member.id;
        await updateMemberMutation.mutateAsync({
          id: memberIdentifier,
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

  // Member data is fetched via React Query hook above

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMemberID = (id: string): string => {
    return id.padStart(6, "0");
  };

  // Calculate total visits (completed appointments)
  const totalVisits = useMemo(() => {
    return memberAppointments.filter(apt => apt.status === "COMPLETED").length;
  }, [memberAppointments]);

  // Calculate total sessions (sum of PT package sessions)
  const totalSessions = useMemo(() => {
    return memberPTPackageRecords.reduce((sum, r) => sum + (r.ptPackageSessions || 0), 0);
  }, [memberPTPackageRecords]);

  // Calculate total spent from records
  const totalSpent = useMemo(() => {
    const membershipTotal = memberMembershipRecords.reduce((sum, r) => sum + r.amount, 0);
    const ptTotal = memberPTPackageRecords.reduce((sum, r) => sum + r.amount, 0);
    return membershipTotal + ptTotal;
  }, [memberMembershipRecords, memberPTPackageRecords]);

  // Calculate days since joined
  const daysSinceJoined = member ? differenceInDays(new Date(), new Date(member.dateJoined)) : 0;

  // Find last activity date
  const lastActivityDates: Date[] = [];
  
  // Add appointment dates
  memberAppointments.forEach(apt => {
    if (apt.date) {
      lastActivityDates.push(new Date(apt.date));
    }
  });
  
  // Add payment dates from records
  memberMembershipRecords.forEach(record => {
    if (record.paymentDate) {
      lastActivityDates.push(new Date(record.paymentDate));
    }
  });
  
  memberPTPackageRecords.forEach(record => {
    if (record.paymentDate) {
      lastActivityDates.push(new Date(record.paymentDate));
    }
  });
  
  // Get the most recent activity date
  const lastActivityDate = lastActivityDates.length > 0 
    ? new Date(Math.max(...lastActivityDates.map(d => d.getTime())))
    : null;
  
  // Calculate days since last activity
  const daysSinceLastActivity = lastActivityDate 
    ? differenceInDays(new Date(), lastActivityDate)
    : null;

  // Sort and paginate history records
  const sortedHistoryRecords = useMemo(() => {
    const allRecords = [...memberMembershipRecords, ...memberPTPackageRecords];
    const sorted = [...allRecords];
    historySorting.forEach((sort) => {
      sorted.sort((a, b) => {
        let aValue: any = (a as any)[sort.id];
        let bValue: any = (b as any)[sort.id];

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
  }, [memberMembershipRecords, memberPTPackageRecords, historySorting]);

  const historyPageCount = Math.ceil(sortedHistoryRecords.length / historyPagination.pageSize);

  if (memberLoading) {
    return null;
  }

  if (!memberLoading && (memberError || !member)) {
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground">
              {memberError ? "Failed to load member" : "Member not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // At this point, member is guaranteed to be defined
  const currentMember = member!;

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
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
        {/* Left Column - Profile Card */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardContent className="pt-6 flex-1 flex flex-col">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Avatar */}
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src="" alt={currentMember.fullName} />
                <AvatarFallback 
                  className="text-2xl font-black bg-gradient-to-br from-muted to-muted/80 text-foreground" 
                  style={{ fontFamily: 'Montserrat, sans-serif' }}
                >
                  {getInitials(currentMember.fullName)}
                </AvatarFallback>
              </Avatar>

              {/* Name and Member ID */}
              <div className="space-y-1">
                <h2 className="text-xl font-black italic tracking-tight uppercase font-montserrat">{currentMember.fullName}</h2>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatMemberID(currentMember.memberNumber)}
                </p>
              </div>

              {/* Status Badge */}
              <Badge
                variant={currentMember.status === "active" ? "default" : "secondary"}
                className="gap-1.5 px-3 py-1"
              >
                {currentMember.status === "active" ? (
                  <Activity className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                {currentMember.status.charAt(0).toUpperCase() + currentMember.status.slice(1)}
              </Badge>

              {/* Message Button */}
              <Button variant="outline" className="w-full" size="sm">
                <MessageSquare className="mr-2 h-4 w-4" />
                Message
              </Button>

              {/* Key Information */}
              <div className="w-full space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="font-medium font-mono">
                    {daysSinceJoined.toLocaleString()} {daysSinceJoined === 1 ? 'day' : 'days'}
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
                  <span className="text-muted-foreground">Member ID</span>
                  <span className="font-medium font-mono">
                    {formatMemberID(currentMember.memberNumber)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
          
          {/* Ring Indicators in Card Footer */}
          {(() => {
            // Calculate total balance sessions from ALL PT packages (active and future)
            // This includes packages that haven't started yet and active packages
            const allPTPackages = memberPTPackageRecords.filter(record => {
              const expiry = new Date(record.expiryDate);
              return expiry > new Date(); // Only include packages that haven't expired
            });
            
            let totalBalanceSessions = 0;
            let totalSessions = 0;
            
            // Sum up remaining sessions from ALL packages
            allPTPackages.forEach(record => {
              const packageTotalSessions = record.ptPackageSessions || 0;
              const usedSessions = memberAppointments.filter(
                apt => apt.ptPackageRecordId === record.id && apt.status === "COMPLETED"
              ).length;
              const balanceSessions = Math.max(0, packageTotalSessions - usedSessions);
              totalBalanceSessions += balanceSessions; // Sum all remaining sessions
              totalSessions += packageTotalSessions;
            });
            
            // Calculate total remaining days from ALL active memberships
            const activeMemberships = memberMembershipRecords.filter(record => {
              const expiry = new Date(record.expiryDate);
              return expiry > new Date();
            });
            
            let totalRemainingDays = 0;
            activeMemberships.forEach(record => {
              const start = new Date(record.startDate);
              const expiry = new Date(record.expiryDate);
              const now = new Date();
              
              // Calculate remaining days for this membership
              const membershipTotalDays = differenceInDays(expiry, start);
              const membershipUsedDays = Math.min(
                Math.max(0, differenceInDays(now, start)),
                membershipTotalDays
              );
              const membershipRemainingDays = Math.max(0, membershipTotalDays - membershipUsedDays);
              
              // Add to total
              totalRemainingDays += membershipRemainingDays;
            });
            
            // Ring Indicator Component (for simple display)
            // Shows balance sessions with proper color: green when high balance, red when low
            const SimpleRingIndicator = ({ 
              balance,
              total,
              label,
              size = 64,
              strokeWidth = 4,
            }: {
              balance: number;
              total: number;
              label: string;
              size?: number;
              strokeWidth?: number;
            }) => {
              // Calculate percentage of balance remaining (balance / total)
              const percentage = total > 0 ? Math.min((balance / total) * 100, 100) : 0;
              const radius = (size - strokeWidth) / 2;
              const circumference = radius * 2 * Math.PI;
              const offset = circumference - (percentage / 100) * circumference;
              const normalizedPercentage = Math.min(Math.max(percentage, 0), 100);

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
                <div className="flex flex-col items-center gap-1">
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
                        className={`transition-all duration-500 ease-out ${ringColor}`}
                      />
                    </svg>
                    <div className="absolute flex items-center justify-center" style={{ marginTop: '1px' }}>
                      <span className="font-mono text-sm font-semibold text-foreground leading-none">
                        {balance}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground text-center">{label}</span>
                </div>
              );
            };
            
            // Always show both rings, even if values are 0
            // For remaining days, we need to calculate total days as well
            let totalMembershipDays = 0;
            activeMemberships.forEach(record => {
              const start = new Date(record.startDate);
              const expiry = new Date(record.expiryDate);
              const membershipTotalDays = differenceInDays(expiry, start);
              totalMembershipDays += membershipTotalDays;
            });
            
            return (
              <CardFooter className="justify-center gap-8 border-t">
                <SimpleRingIndicator 
                  balance={totalBalanceSessions}
                  total={totalSessions}
                  label="Balance Sessions"
                />
                <SimpleRingIndicator 
                  balance={totalRemainingDays}
                  total={totalMembershipDays}
                  label="Remaining Days"
                />
              </CardFooter>
            );
          })()}
        </Card>

        {/* Right Column - Stats and Tabs */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Total Visits */}
            <Card className="hover:border-border/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90">
                  Total Visits
                </CardTitle>
                <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {totalVisits.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            {/* Total Sessions */}
            <Card className="hover:border-border/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90">
                  Total Sessions
                </CardTitle>
                <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-950/20">
                  <Activity className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {totalSessions.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            {/* Total Spent */}
            <Card className="hover:border-border/80 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold text-foreground/90">
                  Total Spent
                </CardTitle>
                <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/20">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
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
              <TabsTrigger value="medical" className="text-xs sm:text-sm">
                <Heart className="mr-2 h-4 w-4" />
                Medical
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
                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <div className="space-y-3">
                        {currentMember.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium">{currentMember.email}</p>
                            </div>
                          </div>
                        )}
                        {currentMember.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Phone No</p>
                              <p className="text-sm font-medium">{currentMember.phone}</p>
                            </div>
                          </div>
                        )}
                        {currentMember.dateOfBirth && (
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Date of Birth</p>
                              <p className="text-sm font-medium">
                                {format(new Date(currentMember.dateOfBirth), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                        )}
                        {currentMember.address && (
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Address</p>
                              <p className="text-sm font-medium">{currentMember.address}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="h-full flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-base">Emergency Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <div className="space-y-3">
                        {currentMember.emergencyPhoneName && (
                          <div className="flex items-center gap-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Emergency Name</p>
                              <p className="text-sm font-medium">{currentMember.emergencyPhoneName}</p>
                            </div>
                          </div>
                        )}
                        {currentMember.emergencyPhone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Emergency Phone</p>
                              <p className="text-sm font-medium">{currentMember.emergencyPhone}</p>
                            </div>
                          </div>
                        )}
                        {(!currentMember.emergencyPhoneName && !currentMember.emergencyPhone) && (
                          <p className="text-sm text-muted-foreground">No emergency contact information</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Medical Tab */}
              <TabsContent value="medical" className="mt-0 flex-1 flex flex-col">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base">Medical Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-1">
                    <div className="space-y-4">
                      {currentMember.bloodType && (
                        <div className="flex items-center gap-3">
                          <Heart className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Blood Type</p>
                            <p className="text-sm font-medium">{currentMember.bloodType}</p>
                          </div>
                        </div>
                      )}
                      {currentMember.medicine && currentMember.medicine.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Medicine</p>
                          <div className="flex flex-wrap gap-2">
                            {currentMember.medicine.map((med, index) => (
                              <Badge key={index} variant="outline" className="gap-1.5">
                                <Pill className="h-3 w-3" />
                                {med}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {currentMember.allergies && currentMember.allergies.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Allergies</p>
                          <div className="flex flex-wrap gap-2">
                            {currentMember.allergies.map((allergy, index) => (
                              <Badge key={index} variant="outline" className="gap-1.5">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                {allergy}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {!currentMember.bloodType && (!currentMember.medicine || currentMember.medicine.length === 0) && (!currentMember.allergies || currentMember.allergies.length === 0) && (
                        <p className="text-sm text-muted-foreground">No medical information available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-0 flex-1 flex flex-col">
                <Card className="h-full flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base">Documents</CardTitle>
                    <label htmlFor="document-upload" className="cursor-pointer">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('document-upload') as HTMLInputElement;
                          input?.click();
                        }}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </label>
                    <input
                      id="document-upload"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && member) {
                          handleDocumentUpload(file);
                          // Reset input to allow uploading the same file again
                          e.target.value = '';
                        }
                      }}
                    />
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <MemberDocumentsSection member={currentMember} />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Packages & Activity Table - Placed below all cards */}
      <Card>
        <Tabs defaultValue="packages" className="w-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="packages" className="text-xs sm:text-sm">
                  <Package className="mr-2 h-4 w-4" />
                  Packages
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs sm:text-sm">
                  <Activity className="mr-2 h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <TabsContent value="packages" className="mt-0">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={handleCreatePackage}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Create
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          // Export to Excel
                          const csvContent = [
                            ["Invoice", "Package Type", "Duration", "Payment", "Amount", "Payment Date", "Status"],
                            ...sortedHistoryRecords.map(record => [
                              record.invoiceNumber,
                              'membership' in record ? getMembershipTypeLabel((record as MembershipRecord).membershipType) : (record as PTPackageRecord).ptPackageName,
                              `${format(new Date(record.startDate), "MMM d")} - ${format(new Date(record.expiryDate), "MMM d")}`,
                              getPaymentTypeLabel(record.paymentType),
                              `$${record.amount.toFixed(2)}`,
                              format(new Date(record.paymentDate), "MMM d, yyyy"),
                              'membership' in record ? getMembershipStatus(record as MembershipRecord, allMembershipRecords).label : getPTPackageStatus(record as PTPackageRecord).label,
                            ])
                          ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                          
                          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                          const link = document.createElement("a");
                          const url = URL.createObjectURL(blob);
                          link.setAttribute("href", url);
                          link.setAttribute("download", `member-packages-${currentMember.fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`);
                          link.style.visibility = "hidden";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export as Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          // Export to PDF with styled design
                          const printWindow = window.open("", "_blank");
                          if (printWindow) {
                            const totalAmount = sortedHistoryRecords.reduce((sum, record) => sum + record.amount, 0);
                            const htmlContent = `
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Member Packages Report - ${currentMember.fullName}</title>
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
                                    tr.summary-row {
                                      background-color: #e5e5e5 !important;
                                      font-weight: bold;
                                    }
                                    tr.summary-row td {
                                      padding: 12px 8px;
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
                                  <h1>Member Packages Report</h1>
                                  <div class="info">
                                    <p>Member: ${currentMember.fullName} (${formatMemberID(currentMember.memberNumber)})</p>
                                    <p>Generated on: ${format(new Date(), "MMM dd, yyyy 'at' HH:mm")}</p>
                                    <p>Total Records: ${sortedHistoryRecords.length}</p>
                                  </div>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Invoice</th>
                                        <th>Package Type</th>
                                        <th>Duration</th>
                                        <th>Payment</th>
                                        <th>Amount</th>
                                        <th>Payment Date</th>
                                        <th>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${sortedHistoryRecords.map(record => `
                                        <tr>
                                          <td>${record.invoiceNumber}</td>
                                          <td>${'membership' in record ? getMembershipTypeLabel((record as MembershipRecord).membershipType) : (record as PTPackageRecord).ptPackageName}</td>
                                          <td>${format(new Date(record.startDate), "MMM d")} - ${format(new Date(record.expiryDate), "MMM d, yyyy")}</td>
                                          <td>${getPaymentTypeLabel(record.paymentType)}</td>
                                          <td>$${record.amount.toFixed(2)}</td>
                                          <td>${format(new Date(record.paymentDate), "MMM d, yyyy")}</td>
                                          <td>${'membership' in record ? getMembershipStatus(record as MembershipRecord, memberMembershipRecords).label : getPTPackageStatus(record as PTPackageRecord).label}</td>
                                        </tr>
                                      `).join("")}
                                      <tr class="summary-row">
                                        <td colspan="4"></td>
                                        <td>$${totalAmount.toFixed(2)}</td>
                                        <td colspan="2"></td>
                                      </tr>
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
                  </div>
                </TabsContent>
                <TabsContent value="activity" className="mt-0">
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          // Export activities to Excel
                          const csvContent = [
                            ["Date & Time", "Type", "Description", "Performed By"],
                            ...memberActivities.map(activity => [
                              format(new Date(activity.timestamp), "MMM dd, yyyy HH:mm"),
                              getActivityTypeLabel(activity.type),
                              activity.description,
                              activity.performedBy,
                            ])
                          ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
                          
                          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                          const link = document.createElement("a");
                          const url = URL.createObjectURL(blob);
                          link.setAttribute("href", url);
                          link.setAttribute("download", `member-activity-${currentMember.fullName.replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.csv`);
                          link.style.visibility = "hidden";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Export as Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          // Export activities to PDF with styled design
                          const printWindow = window.open("", "_blank");
                          if (printWindow) {
                            const htmlContent = `
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Member Activity Report - ${currentMember.fullName}</title>
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
                                  <h1>Member Activity Report</h1>
                                  <div class="info">
                                    <p>Member: ${currentMember.fullName} (${formatMemberID(currentMember.memberNumber)})</p>
                                    <p>Generated on: ${format(new Date(), "MMM dd, yyyy 'at' HH:mm")}</p>
                                    <p>Total Records: ${memberActivities.length}</p>
                                  </div>
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Date & Time</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                        <th>Performed By</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${memberActivities.map(activity => `
                                        <tr>
                                          <td>${format(new Date(activity.timestamp), "MMM dd, yyyy HH:mm")}</td>
                                          <td>${getActivityTypeLabel(activity.type)}</td>
                                          <td>${activity.description}</td>
                                          <td>${activity.performedBy}</td>
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
                  </div>
                </TabsContent>
              </div>
            </div>
          </CardHeader>
          <TabsContent value="packages" className="mt-0">
            <CardContent className="pt-4">
              <MemberHistoryTable
                membershipRecords={memberMembershipRecords}
                ptPackageRecords={memberPTPackageRecords}
                totalRows={sortedHistoryRecords.length}
                sorting={historySorting}
                onSort={setHistorySorting}
                pagination={historyPagination}
                onPaginationChange={setHistoryPagination}
                pageCount={historyPageCount}
                member={currentMember ? { id: currentMember.id, memberNumber: currentMember.memberNumber, fullName: currentMember.fullName } : undefined}
                onManageMembership={handleManageMembership}
                onManagePTPackage={handleManagePTPackage}
              />
            </CardContent>
          </TabsContent>
          <TabsContent value="activity" className="mt-0">
            <CardContent className="pt-4">
              <MemberActivityTable
                activities={memberActivities}
                totalRows={memberActivities.length}
                sorting={activitySorting}
                onSort={setActivitySorting}
                pagination={activityPagination}
                onPaginationChange={setActivityPagination}
                pageCount={activityPageCount}
              />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Manage Membership Dialog */}
      {member && selectedMembershipRecord && (
        <ManageMembershipDialog
          open={manageMembershipDialogOpen}
          onOpenChange={(open) => {
            setManageMembershipDialogOpen(open);
            if (!open) {
              setSelectedMembershipRecord(null);
            }
          }}
          member={member}
          membershipRecord={selectedMembershipRecord}
          onSuccess={() => {
            handlePackageManageSuccess();
            setManageMembershipDialogOpen(false);
            setSelectedMembershipRecord(null);
          }}
        />
      )}

      {/* Manage PT Package Dialog */}
      {member && selectedPTPackageRecord && (
        <ManagePTPackageDialog
          open={managePTPackageDialogOpen}
          onOpenChange={(open) => {
            setManagePTPackageDialogOpen(open);
            if (!open) {
              setSelectedPTPackageRecord(null);
            }
          }}
          member={member}
          ptPackageRecord={selectedPTPackageRecord}
          onSuccess={() => {
            handlePackageManageSuccess();
            setManagePTPackageDialogOpen(false);
            setSelectedPTPackageRecord(null);
          }}
        />
      )}

      {/* Create Package Drawer with Tabs */}
      {member && (
        <Drawer open={createPackageDrawerOpen} onOpenChange={setCreatePackageDrawerOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2 px-4 pt-4">
              <DrawerTitle>Add Package</DrawerTitle>
              <DrawerDescription>
                Add a membership or PT package for {currentMember.fullName}
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-hidden flex flex-col">
              <Tabs 
                value={selectedPackageTab} 
                onValueChange={(value) => setSelectedPackageTab(value as "membership" | "pt-package")}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="px-4 border-b">
                  <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="membership" className="gap-2 text-sm">
                      <DollarSign className="h-4 w-4" />
                      Membership
                    </TabsTrigger>
                    <TabsTrigger value="pt-package" className="gap-2 text-sm">
                      <Activity className="h-4 w-4" />
                      PT Package
                    </TabsTrigger>
                  </TabsList>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  <TabsContent value="membership" className="mt-0 flex-1 flex flex-col overflow-hidden">
                    <AddPackageDrawer
                      open={createPackageDrawerOpen && selectedPackageTab === "membership"}
                      onOpenChange={(open) => {
                        if (!open) setCreatePackageDrawerOpen(false);
                      }}
                      member={member}
                      packageType="membership"
                      onSuccess={handlePackageCreateSuccess}
                      renderAsContent={true}
                    />
                  </TabsContent>
                  <TabsContent value="pt-package" className="mt-0 flex-1 flex flex-col overflow-hidden">
                    <AddPackageDrawer
                      open={createPackageDrawerOpen && selectedPackageTab === "pt-package"}
                      onOpenChange={(open) => {
                        if (!open) setCreatePackageDrawerOpen(false);
                      }}
                      member={member}
                      packageType="pt-package"
                      onSuccess={handlePackageCreateSuccess}
                      renderAsContent={true}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}

// Helper functions for export
const getMembershipTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    day_pass: "DAY PASS",
    "1_month": "1 MONTH",
    "3_month": "3 MONTH",
    "6_month": "6 MONTH",
    "1_year": "1 YEAR",
  };
  return labels[type] || type.toUpperCase();
};

const getPaymentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    bank_transfer: "Bank Transfer",
    online: "Online",
    other: "Other",
  };
  return labels[type] || type;
};

const getMembershipStatus = (record: MembershipRecord, allMembershipRecords: MembershipRecord[]) => {
  const now = new Date();
  const expiry = new Date(record.expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, now);

  if (expiry < now) return { status: "expired", label: "Expired" };
  if (daysUntilExpiry <= 7) return { status: "7_days_left", label: `${Math.max(0, daysUntilExpiry)} Days Left` };
  if (daysUntilExpiry <= 14) return { status: "expiring_soon", label: "Expiring Soon" };
  
  // Check if this member has previous membership records
  const previousRecords = allMembershipRecords.filter(
    r => r.id !== record.id && 
    r.memberId === record.memberId &&
    new Date(r.paymentDate) < new Date(record.paymentDate)
  );
  
  // If member has previous memberships, check if any are the same type (renewal)
  if (previousRecords.length > 0) {
    const hasSameTypeRenewal = previousRecords.some(
      r => r.membershipType === record.membershipType
    );
    if (hasSameTypeRenewal) {
      return { status: "renew", label: "Renew" };
    }
  }
  
  // If this is the first membership ever (no previous records), show "new_member"
  if (previousRecords.length === 0) {
    const start = new Date(record.startDate);
    const daysSinceStart = differenceInDays(now, start);
    if (daysSinceStart < 30) {
      return { status: "new_member", label: "New Member" };
    }
  }
  
  return { status: "active", label: "Active" };
};

const getPTPackageStatus = (record: PTPackageRecord) => {
  const now = new Date();
  const expiry = new Date(record.expiryDate);
  const start = new Date(record.startDate);
  const daysUntilExpiry = differenceInDays(expiry, now);
  const daysSinceStart = differenceInDays(now, start);

  if (expiry < now) return { status: "expired", label: "Expired" };
  if (daysUntilExpiry <= 7) return { status: "7_days_left", label: `${Math.max(0, daysUntilExpiry)} Days Left` };
  if (daysUntilExpiry <= 14) return { status: "expiring_soon", label: "Expiring Soon" };
  return { status: "active", label: "Active" };
};

// Documents Section Component
function MemberDocumentsSection({ member }: { member: Member }) {
  const [selectedDocument, setSelectedDocument] = useState<MemberDocument | null>(null);
  const documents = member.documents || [];

  const handleDownload = (doc: MemberDocument) => {
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

