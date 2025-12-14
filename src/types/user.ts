export type UserRole = "MANAGER" | "ADMIN" | "PT";

export interface User {
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  staffId?: string; // Link to staff if role is PT
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

