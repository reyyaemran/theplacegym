export type MembershipType = 'day_pass' | '1_month' | '3_month' | '6_month' | '1_year';

export interface Membership {
  id: string;
  type: MembershipType;
  name: string;
  shortName: string;
  duration: number; // Duration in months (0 for day pass)
  price: number;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

