/**
 * Utility for matching records (PT packages, memberships) to staff.
 * Uses assignedStaffId (preferred) and case-insensitive assignedStaffName.
 */

export interface StaffLike {
  _id?: string;
  staffId?: string;
  name?: string;
}

export interface RecordWithStaffAssignment {
  assignedStaffId?: string;
  assignedStaffName?: string;
}

/**
 * Check if a record is assigned to the given staff.
 * Matches by assignedStaffId (staff._id or staff.staffId) first, then by name (case-insensitive).
 */
export function isRecordAssignedToStaff<T extends RecordWithStaffAssignment>(
  record: T,
  staff: StaffLike | null | undefined
): boolean {
  if (!staff) return false;

  const staffId = staff._id || staff.staffId;
  const recordStaffId = record.assignedStaffId;
  const recordName = record.assignedStaffName?.trim().toLowerCase();
  const staffName = staff.name?.trim().toLowerCase();

  // Prefer ID match - most reliable
  if (staffId && recordStaffId) {
    const staffIdStr = String(staffId);
    const recordIdStr = String(recordStaffId);
    if (staffIdStr === recordIdStr) return true;
  }

  // Fallback to case-insensitive name match
  if (recordName && staffName && recordName === staffName) {
    return true;
  }

  return false;
}
