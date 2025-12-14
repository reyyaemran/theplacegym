export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export type AppointmentType = "PT Session" | "Consultation" | "Assessment" | "Follow-up" | "Group Class";

export interface Appointment {
  _id?: string;
  appointmentNumber: string; // Unique appointment ID (e.g., "APT-2025-00001")
  clientId: string;
  clientName: string;
  staffId: string;
  staffName: string;
  date: Date | string;
  time: string; // Format: "HH:mm"
  duration: number; // Duration in minutes
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  location?: string;
  ptPackageRecordId?: string; // Link to PT Package Record for session tracking
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

