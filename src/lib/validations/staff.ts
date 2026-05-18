import { z } from "zod";
import { StaffDepartment, StaffLevel, StaffShift, StaffStatus } from "@/types/staff";

// Document schema for validation
const staffDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  uploadedAt: z.string(),
});

export const staffSchema = z.object({
  // Information
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val === "" ? undefined : val)),
  phone: z.string().optional(),
  staffID: z.string()
    .optional()
    .refine((val) => {
      // If provided, must be numeric only
      if (!val || val.trim() === "") return true; // Empty is allowed (will be auto-generated)
      return /^\d+$/.test(val.trim());
    }, {
      message: "Staff ID must be numeric only",
    })
    .transform((val) => {
      // Trim whitespace, return undefined if empty
      if (!val || val.trim() === "") return undefined;
      return val.trim();
    }),
  dateOfBirth: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  address: z.string().optional(),
  emergencyPhoneName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  avatar: z.string().optional(),
  bio: z.string().optional(),
  documents: z.array(staffDocumentSchema).optional(),

  // Work Details
  department: z.enum(["PT", "PTS", "CC", "CCS", "FC", "FCS", "CM", "ASM"]),
  level: z.enum(["Master", "Senior", "Junior"]).optional(),
  status: z.enum([
    "AVAILABLE",
    "UNAVAILABLE",
    "DAY_OFF",
    "ON_LEAVE_ANNUAL",
    "ON_LEAVE_PUBLIC_HOLIDAY",
    "ON_LEAVE_SICK",
  ]),
  dayOff: z.string().optional(),
  monthlySaleTarget: z
    .number()
    .min(0, "Sale target must be 0 or greater")
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  monthlyConductTarget: z
    .number()
    .min(0, "Conduct target must be 0 or greater")
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  commissionPercentage: z
    .number()
    .min(0, "Commission must be 0 or greater")
    .max(100, "Commission must be between 0 and 100")
    .optional()
    .transform((val) => (val === 0 ? undefined : val)),
  shift: z.enum(["AM", "MID", "NOON"]).optional(),
  hireDate: z.string().min(1, "Hire date is required").transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid hire date");
    }
    return date;
  }),

  // Leave Management (Entitlements)
  annualLeaveBalance: z.number().min(0).optional(),
  sickLeaveBalance: z.number().min(0).optional(),
  publicHolidayBalance: z.number().min(0).optional(),

  // Leave Usage
  annualLeaveUsed: z.number().min(0).optional(),
  sickLeaveUsed: z.number().min(0).optional(),
  unpaidLeaveUsed: z.number().min(0).optional(),
  publicHolidayUsed: z.number().min(0).optional(),

  // Access Control
  loginEnabled: z.boolean().optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  permissions: z.array(z.string()).optional(),
  password: z.string().min(1).optional(),
});

export type StaffFormInput = z.input<typeof staffSchema>;
export type StaffFormOutput = z.output<typeof staffSchema>;
