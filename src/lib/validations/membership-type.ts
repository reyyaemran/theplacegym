import { z } from "zod";

export const membershipTypeSchema = z.object({
  type: z.enum(["day_pass", "1_month", "3_month", "6_month", "1_year"]),
  name: z.string().min(1, "Name is required"),
  shortName: z.string().min(1, "Short name is required"),
  duration: z.number().min(0, "Duration must be non-negative"),
  price: z.number().min(0, "Price must be positive"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type MembershipTypeFormInput = z.input<typeof membershipTypeSchema>;

