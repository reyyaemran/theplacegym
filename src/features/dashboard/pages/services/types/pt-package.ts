export type PTPackageSessions = 1 | 5 | 10 | 20 | 30 | 40;

export interface PTPackage {
  id: string;
  sessions: PTPackageSessions;
  name: string;
  shortName: string;
  price: number;
  pricePerSession: number;
  description?: string;
  validityDays?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PTPackageFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
}

