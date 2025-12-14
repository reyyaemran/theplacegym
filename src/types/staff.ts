export type StaffLevel = "Master" | "Senior" | "Junior";
export type StaffStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "DAY_OFF"
  | "ON_LEAVE_ANNUAL"
  | "ON_LEAVE_PUBLIC_HOLIDAY"
  | "ON_LEAVE_SICK";
export type StaffDepartment =
  | "PT" // Personal Trainer
  | "PTS" // PT Supervisor
  | "CC" // Customer Care
  | "CCS" // CC Supervisor
  | "FC" // Fitness Consultant
  | "FCS" // FC Supervisor
  | "CM" // Club Manager
  | "ASM"; // Assistant Manager

export type StaffShift = "AM" | "MID" | "NOON";

export interface StaffDocument {
  id: string;
  name: string;
  type: string; // 'image' | 'pdf' | 'document'
  url: string; // Base64 or URL
  uploadedAt: string;
}

export type StaffPermission = 
  | "view_dashboard"
  | "manage_roster"
  | "manage_staff"
  | "manage_members"
  | "view_reports"
  | "manage_settings";

export interface Staff {
  _id?: string;
  name: string;
  department: StaffDepartment;
  level?: StaffLevel; // Only for PT/PTS
  status: StaffStatus;
  hireDate: Date | string;
  monthlySaleTarget?: number; // Only for PT, PTS, FC, FCS
  monthlyConductTarget?: number; // Only for PT, PTS
  phone?: string;
  email?: string;
  staffID?: string; // Optional staff ID (not auto-generated if provided)
  password?: string; // Optional specific password (overrides staffID for login)
  bio?: string; // Bio/description
  dayOff?: string; // Day off (e.g., "Monday", "Sunday")
  commissionPercentage?: number; // Commission percentage (for PT/PTS, varies by level)
  shift?: StaffShift; // Shift schedule
  avatar?: string; // Avatar image URL
  dateOfBirth?: Date | string; // Date of birth
  address?: string; // Address
  emergencyPhoneName?: string; // Emergency contact name
  emergencyPhone?: string; // Emergency contact phone number
  documents?: StaffDocument[]; // List of documents
  
  // Leave Management
  annualLeaveBalance?: number; // Total entitlement per year
  sickLeaveBalance?: number; // Total entitlement per year
  publicHolidayBalance?: number; // Total entitlement per year
  
  // Leave Usage (Managed via Roster)
  annualLeaveUsed?: number; // Used so far
  sickLeaveUsed?: number; // Used so far
  unpaidLeaveUsed?: number; // Used so far
  publicHolidayUsed?: number; // Used so far

  // Access Control
  loginEnabled?: boolean; // Can the staff member log in?
  role?: "ADMIN" | "STAFF"; // Simple role for now
  permissions?: StaffPermission[]; // List of permissions

  createdAt?: Date | string;
  updatedAt?: Date | string;
}
