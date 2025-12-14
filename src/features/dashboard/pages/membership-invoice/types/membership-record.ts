import { MembershipStatus, MembershipType } from "@/features/dashboard/pages/members/types/member";

export type PaymentType = 'cash' | 'card' | 'bank_transfer' | 'online' | 'other';
export type { MembershipStatus, MembershipType };

export interface MembershipRecord {
  id: string;
  memberId: string;
  memberName: string;
  membershipType: MembershipType;
  invoiceNumber: string;
  startDate: string;
  expiryDate: string;
  paymentType: PaymentType;
  paymentDate: string;
  amount: number;
  paymentRemark?: string;
  assignedStaffName?: string; // Personal Trainer or Fitness Consultant assigned to this membership
  issuedBy?: string; // CC, CCS, ASM, CM who issued/created this membership
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipRecordFilters {
  search: string;
}

