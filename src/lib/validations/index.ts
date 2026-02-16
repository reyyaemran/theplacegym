/**
 * Central exports for all validation schemas
 * Import from "@/lib/validations" for cleaner imports
 */

// Appointment validation
export {
  appointmentSchema,
  type AppointmentFormInput,
  type AppointmentFormOutput,
} from "./appointment";

// Member validation
export {
  memberSchema,
  type MemberFormInput,
  type MemberFormOutput,
} from "./member";

// Membership record validation
export { membershipRecordSchema } from "./membership-record";

// Membership type validation
export {
  membershipTypeSchema,
  type MembershipTypeFormInput,
} from "./membership-type";

// PT package record validation
export { ptPackageRecordSchema } from "./pt-package-record";

// PT package type validation
export {
  ptPackageTypeSchema,
  type PTPackageTypeFormInput,
} from "./pt-package-type";

// Staff validation
export {
  staffSchema,
  type StaffFormInput,
  type StaffFormOutput,
} from "./staff";
