export type LeaveRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LeaveRequestType = "AL" | "SL" | "PH" | "UP";

export const LEAVE_TYPE_LABELS: Record<LeaveRequestType, string> = {
  AL: "Annual Leave",
  SL: "Sick Leave",
  PH: "Public Holiday",
  UP: "Unpaid Leave",
};

export interface LeaveRequest {
  _id?: string;
  staffId: string;
  staffName: string;
  department: string;
  leaveType: LeaveRequestType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason: string;
  status: LeaveRequestStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewNote?: string;
  reviewedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
