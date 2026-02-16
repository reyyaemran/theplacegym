/**
 * Central exports for all application types
 * Import from "@/types" instead of individual files for cleaner imports
 */

// Appointment types
export type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from "./appointment";

// Calendar types
export type {
  Calendar,
  CalendarEvent,
  CalendarId,
  CalendarView,
  EventId,
} from "./calendar";

// Client types
export type { Client, ClientStatus } from "./client";

// Issue types
export type { Issue, IssueCategory, IssueStatus } from "./issue";

// Request types
export type {
  AppointmentRequest,
  RequestStatus,
  RequestType,
} from "./request";

// Roster types
export type {
  LeaveType,
  RosterRecord,
  RosterStatus,
  ShiftType,
} from "./roster";

// Staff types
export type {
  Staff,
  StaffDepartment,
  StaffDocument,
  StaffLevel,
  StaffPermission,
  StaffShift,
  StaffStatus,
} from "./staff";

// User types
export type { User, UserRole } from "./user";
