export type MemberStatus = 'active' | 'inactive' | 'pending' | 'blocked';
export type MembershipStatus = 'active' | 'expired' | 'new_member' | 'expiring_soon' | '7_days_left';
export type MembershipType = 'day_pass' | '1_month' | '3_month' | '6_month' | '1_year';

export interface MemberDocument {
  id: string;
  name: string;
  type: string; // 'image' | 'pdf' | 'document'
  url: string; // Base64 or URL
  uploadedAt: string;
}

export interface Member {
  id: string;
  memberNumber: string; // MemberID
  fullName: string;
  email: string;
  phone?: string; // Cambodia phone number
  company: string;
  totalSpent: number;
  status: MemberStatus;
  dateJoined: string;
  lastPurchase: string;
  location: string;
  dateOfBirth?: string; // Date of birth
  address?: string; // Address
  emergencyPhone?: string; // Emergency phone number
  emergencyPhoneName?: string; // Emergency contact name
  bloodType?: string; // Blood type
  medicine?: string[]; // List of medicines
  allergies?: string[]; // List of allergies (multiple select)
  documents?: MemberDocument[]; // List of documents
  // New fields
  membershipType?: MembershipType; // Membership type
  ptPackageSessions?: number; // Total PT package sessions (1, 5, 10, 20, 30, 40)
  ptPackageUsedSessions?: number; // Used sessions
  ptPackageStartDate?: string; // PT package start date
  ptPackageExpiryDate?: string; // PT package expiry date
}

export interface MemberFilters {
  search: string;
} 