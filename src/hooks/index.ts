/**
 * Central exports for all custom hooks
 * Import from "@/hooks" instead of individual files for cleaner imports
 */

// Navigation & UI hooks
export { useActiveMenu } from "./use-active-menu";
export { useActiveSection } from "./use-active-section";
export { useBreadcrumbs } from "./use-breadcrumbs";
export { useIsMobile } from "./use-mobile";

// Authentication
export { useAuth } from "./use-auth";

// Data fetching hooks
export {
  useAppointments,
  useAppointmentById,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
} from "./use-appointments";

export {
  useMembers,
  useMemberById,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
} from "./use-members";

export {
  useMembershipRecords,
  useMembershipRecordById,
  useCreateMembershipRecord,
  useUpdateMembershipRecord,
  useDeleteMembershipRecord,
} from "./use-membership-records";

export {
  useMembershipTypes,
  useMembershipTypeById,
  useCreateMembershipType,
  useUpdateMembershipType,
  useDeleteMembershipType,
} from "./use-membership-types";

export {
  usePTPackageRecords,
  usePTPackageRecordById,
  useCreatePTPackageRecord,
  useUpdatePTPackageRecord,
  useDeletePTPackageRecord,
} from "./use-pt-package-records";

export {
  usePTPackageTypes,
  usePTPackageTypeById,
  useCreatePTPackageType,
  useUpdatePTPackageType,
  useDeletePTPackageType,
} from "./use-pt-package-types";

export { useRequests, useCreateRequest } from "./use-requests";

export { useRoster, useUpdateRoster } from "./use-roster";

export {
  useStaff,
  useStaffById,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
} from "./use-staff";

export {
  usePrograms,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
} from "./use-programs";

export {
  useMealPlans,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
} from "./use-meal-plans";

// Store hooks
export { useCalendarStore } from "./use-calendar-store";

// Utility hooks
export { useClearPackageRecords } from "./use-clear-package-records";
