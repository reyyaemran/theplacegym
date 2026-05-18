import { PTPackage } from "@/features/dashboard/pages/services/types/pt-package";

export type PaymentType = 'cash' | 'card' | 'bank_transfer' | 'online' | 'other';

export interface PTPackageRecord {
  id: string;
  memberId: string;
  memberName: string;
  ptPackageId: string;
  ptPackageName: string;
  ptPackageSessions: number;
  invoiceNumber: string;
  startDate: string;
  expiryDate: string;
  paymentType: PaymentType;
  paymentDate: string;
  amount: number;
  paymentRemark?: string;
  assignedStaffName?: string; // Personal Trainer assigned to this PT package
  assignedStaffId?: string; // Staff ID of the assigned trainer (e.g. STAFFID from source system)
  issuedBy?: string; // CC, CCS, ASM, CM who issued/created this PT package
  usedSessions?: number; // Used sessions (from import)
  remainingSessions?: number; // Remaining sessions (from import)
  ptContract?: string; // PT contract reference from source system
  createdAt?: string;
  updatedAt?: string;
}

export interface PTPackageRecordFilters {
  search: string;
}
