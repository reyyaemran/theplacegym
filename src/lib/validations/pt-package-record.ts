import { z } from "zod";

export const ptPackageRecordSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  memberName: z.string().min(1, "Member name is required"),
  ptPackageId: z.string().min(1, "PT Package ID is required"),
  ptPackageName: z.string().min(1, "PT Package name is required"),
  ptPackageSessions: z.number().min(1, "Sessions must be at least 1"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  startDate: z.string().min(1, "Start date is required"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  paymentType: z.enum(["cash", "card", "bank_transfer", "online", "other"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.number().min(0, "Amount must be positive"),
  paymentRemark: z.string().optional(),
  assignedStaffName: z.string().optional(),
  issuedBy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

