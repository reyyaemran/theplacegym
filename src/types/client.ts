export type ClientStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface Client {
  _id?: string;
  name: string;
  receiptNo: string;
  assignedStaffId: string;
  currentSessionBalance: number;
  packageValue?: number;
  status: ClientStatus;
  phone?: string;
  email?: string;
  notes?: string;
  lastSessionDate?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

