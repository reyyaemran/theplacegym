export type RequestType = 
  | "CHANGE_DATE" 
  | "UNDO_SESSION" 
  | "CHANGE_PACKAGE" 
  | "EXTEND_PACKAGE" 
  | "CUT_SESSIONS" 
  | "OTHER";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

export interface AppointmentRequest {
  _id?: string;
  requestNumber: string; // Auto-generated: REQ-2025-00001
  requestType: RequestType;
  appointmentId: string; // Reference to the appointment
  ptPackageRecordId?: string; // Reference to the package (if applicable)
  requestedBy: string; // Staff ID who made the request
  requestedByName: string; // Staff name
  status: RequestStatus;
  reason: string; // Description/reason for the request
  newDate?: string; // If changing date
  newTime?: string; // If changing time
  additionalNotes?: string;
  reviewedBy?: string; // SuperAdmin ID who reviewed
  reviewedByName?: string; // SuperAdmin name
  reviewNotes?: string; // Notes from superadmin
  createdAt: Date | string;
  updatedAt?: Date | string;
}

