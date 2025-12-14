export type ShiftType = "AM" | "MID" | "PM";
export type LeaveType = "AL" | "PH" | "SL" | "UP";
export type RosterStatus = "shift" | "dayoff" | "leave" | "none";

export interface RosterRecord {
  _id?: string;
  staffId: string;
  date: string; // ISO date string YYYY-MM-DD
  status: RosterStatus;
  shiftType?: ShiftType;
  leaveType?: LeaveType;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

