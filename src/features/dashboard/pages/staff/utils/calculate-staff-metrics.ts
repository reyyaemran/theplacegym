import { Staff } from "@/types/staff";
import { Appointment } from "@/types/appointment";
import { MembershipRecord } from "@/features/dashboard/pages/membership-invoice/types/membership-record";
import { PTPackageRecord } from "@/features/dashboard/pages/ptpackage-invoice/types/pt-package-record";
import { parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { isRecordAssignedToStaff } from "@/lib/staff-assignment";

export interface StaffMetrics {
  sales: number;
  conduct: number;
  salesPercent: number;
  conductPercent: number;
}

/**
 * Calculate staff sales and conduct metrics for a given month
 * Sales: 
 *   - For PT/PTS: Sum of amount from PT Package records assigned to the trainer, where paymentDate is in the selected month
 *   - For FC/FCS: Sum of amount from Membership records assigned to the consultant, where paymentDate is in the selected month
 * Conduct: Count of completed appointments for the trainer in the selected month
 */
export function calculateStaffMetrics(
  staff: Staff,
  month: string, // Format: YYYY-MM
  appointments: Appointment[],
  membershipRecords: MembershipRecord[],
  ptPackageRecords: PTPackageRecord[]
): StaffMetrics {
  const staffId = staff._id;
  if (!staffId) {
    return {
      sales: 0,
      conduct: 0,
      salesPercent: 0,
      conductPercent: 0,
    };
  }

  // Parse the month to get start and end dates (1st to last day of month)
  // Ensure we're working with the exact month boundaries
  const monthDate = parseISO(`${month}-01`);
  const monthStart = startOfMonth(monthDate);
  monthStart.setHours(0, 0, 0, 0); // Start of first day
  const monthEnd = endOfMonth(monthDate);
  monthEnd.setHours(23, 59, 59, 999); // End of last day

  // Calculate Sales based on department
  let sales = 0;
  
  if (staff.department === "PT" || staff.department === "PTS") {
    // For PT/PTS: Calculate from PT Package records
    sales = ptPackageRecords
      .filter((record) => {
        // Check if assigned to this trainer (by ID or case-insensitive name)
        if (!isRecordAssignedToStaff(record, staff)) return false;
        
        // Check if paymentDate is in the selected month (1st to last day)
        if (!record.paymentDate) return false;
        
        const paymentDate = parseISO(record.paymentDate);
        // Normalize to start of day for comparison
        const paymentDateOnly = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
        const monthStartOnly = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
        const monthEndOnly = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
        
        return paymentDateOnly >= monthStartOnly && paymentDateOnly <= monthEndOnly;
      })
      .reduce((sum, record) => sum + (record.amount || 0), 0);
  } else if (staff.department === "FC" || staff.department === "FCS") {
    // For FC/FCS: Calculate from Membership records
    sales = membershipRecords
      .filter((record) => {
        // Check if assigned to this consultant (by ID or case-insensitive name)
        if (!isRecordAssignedToStaff(record, staff)) return false;
        
        // Check if paymentDate is in the selected month (1st to last day)
        if (!record.paymentDate) return false;
        
        const paymentDate = parseISO(record.paymentDate);
        // Normalize to start of day for comparison
        const paymentDateOnly = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
        const monthStartOnly = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
        const monthEndOnly = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
        
        return paymentDateOnly >= monthStartOnly && paymentDateOnly <= monthEndOnly;
      })
      .reduce((sum, record) => sum + (record.amount || 0), 0);
  }

  // Calculate Conduct: Count of completed appointments for this trainer
  // where the appointment date is in the selected month (1st to last day)
  const conduct = appointments.filter((appointment) => {
    // Check if assigned to this trainer
    if (appointment.staffId !== staffId) return false;
    
    // Check if status is COMPLETED
    if (appointment.status !== "COMPLETED") return false;
    
    // Check if date is in the selected month (1st to last day)
    if (!appointment.date) return false;
    
    const appointmentDate = typeof appointment.date === "string"
      ? parseISO(appointment.date)
      : new Date(appointment.date);
    // Normalize to start of day for comparison
    const appointmentDateOnly = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
    const monthStartOnly = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
    const monthEndOnly = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate());
    
    return appointmentDateOnly >= monthStartOnly && appointmentDateOnly <= monthEndOnly;
  }).length;

  // Calculate percentages
  const salesTarget = staff.monthlySaleTarget || 0;
  const conductTarget = staff.monthlyConductTarget || 0;
  
  const salesPercent = salesTarget > 0 ? (sales / salesTarget) * 100 : 0;
  const conductPercent = conductTarget > 0 ? (conduct / conductTarget) * 100 : 0;

  return {
    sales,
    conduct,
    salesPercent: Math.round(salesPercent * 100) / 100,
    conductPercent: Math.round(conductPercent * 100) / 100,
  };
}

