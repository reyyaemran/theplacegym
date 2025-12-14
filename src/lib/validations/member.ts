import { z } from "zod";

// Document schema for validation
const memberDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  url: z.string(),
  uploadedAt: z.string(),
});

export const memberSchema = z.object({
  memberNumber: z.string().min(1, "Member number is required"),
  fullName: z.string().min(1, "Full name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional(),
  location: z.string().optional(),
  dateJoined: z.string().min(1, "Date joined is required").transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date joined");
    }
    return date;
  }),
  status: z.enum(["active", "inactive", "pending", "blocked"]),
  totalSpent: z.number().min(0).optional(),
  lastPurchase: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyPhoneName: z.string().optional(),
  bloodType: z.string().optional(),
  medicine: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  documents: z.array(memberDocumentSchema).optional(),
  membershipType: z.enum(["day_pass", "1_month", "3_month", "6_month", "1_year"]).optional(),
  ptPackageSessions: z.number().min(0).optional(),
  ptPackageUsedSessions: z.number().min(0).optional(),
  ptPackageStartDate: z.string().optional(),
  ptPackageExpiryDate: z.string().optional(),
});

export type MemberFormInput = z.input<typeof memberSchema>;
export type MemberFormOutput = z.output<typeof memberSchema>;

