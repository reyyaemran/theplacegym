import { z } from "zod";

export const appointmentSchema = z.object({
  appointmentNumber: z.string().optional(), // Auto-generated if not provided
  clientId: z.string().min(1, "Client ID is required"),
  clientName: z.string().min(1, "Client name is required"),
  staffId: z.string().min(1, "Staff ID is required"),
  staffName: z.string().min(1, "Staff name is required"),
  date: z.string().min(1, "Date is required").transform((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    return date;
  }),
  time: z.string().min(1, "Time is required"), // Format: "HH:mm"
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  type: z.enum(["PT Session", "Consultation", "Assessment", "Follow-up", "Group Class"]),
  notes: z.string().optional(),
  location: z.string().optional(),
  ptPackageRecordId: z.string().optional(),
});

export type AppointmentFormInput = z.input<typeof appointmentSchema>;
export type AppointmentFormOutput = z.output<typeof appointmentSchema>;

