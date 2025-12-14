import { MemberActivity, MemberActivityType } from "../types/member-activity";
import { format, subDays, subHours, subMinutes } from "date-fns";

// Helper to create timestamps
function getTimestamp(offset: number): string {
  return new Date(Date.now() + offset).toISOString();
}

// Helper to format membership type label
const getMembershipTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    day_pass: "Day Pass",
    "1_month": "1 Month",
    "3_month": "3 Month",
    "6_month": "6 Month",
    "1_year": "1 Year",
  };
  return labels[type] || type;
};

// Generate mock activities for a member
export function generateMemberActivities(
  memberId: string,
  memberName: string,
  membershipRecords: any[],
  ptPackageRecords: any[],
  appointments: any[],
  staffData?: any[],
  memberDocuments?: any[]
): MemberActivity[] {
  const activities: MemberActivity[] = [];

  // Add activities from membership records (purchases, date changes)
  membershipRecords.forEach((record, index) => {
    // Find assigned staff info
    const assignedStaffName = record.assignedStaffName;
    const assignedStaff = staffData?.find(s => s.name === assignedStaffName);
    const assignedStaffLevel = assignedStaff?.level;
    
    // Purchase activity
    activities.push({
      id: `activity-membership-${record.id}-purchase`,
      type: "membership_purchased",
      description: "", // Will be rendered with badge in the table
      performedBy: record.issuedBy || "System",
      timestamp: record.paymentDate || record.createdAt || getTimestamp(-index * 86400000),
      relatedRecordId: record.id,
      relatedRecordType: "membership",
      details: {
        invoiceNumber: record.invoiceNumber,
        amount: record.amount,
        packageName: getMembershipTypeLabel(record.membershipType || "membership"),
        assignedStaffName: assignedStaffName,
        assignedStaffLevel: assignedStaffLevel,
        packageType: "membership",
      },
    });

    // Date change if updated
    if (record.updatedAt && record.updatedAt !== record.createdAt) {
      activities.push({
        id: `activity-membership-${record.id}-date-change`,
        type: "membership_date_changed",
        description: `Changed membership dates`,
        performedBy: record.issuedBy || "System",
        timestamp: record.updatedAt,
        relatedRecordId: record.id,
        relatedRecordType: "membership",
        details: {
          invoiceNumber: record.invoiceNumber,
          oldValue: record.startDate,
          newValue: record.expiryDate,
        },
      });
    }
  });

  // Add activities from PT package records
  ptPackageRecords.forEach((record, index) => {
    // Find assigned staff info
    const assignedStaffName = record.assignedStaffName;
    const assignedStaff = staffData?.find(s => s.name === assignedStaffName);
    const assignedStaffLevel = assignedStaff?.level;
    
    // Purchase activity
    activities.push({
      id: `activity-pt-${record.id}-purchase`,
      type: "pt_package_purchased",
      description: "", // Will be rendered with badge in the table
      performedBy: record.issuedBy || "System",
      timestamp: record.paymentDate || record.createdAt || getTimestamp(-index * 86400000),
      relatedRecordId: record.id,
      relatedRecordType: "pt_package",
      details: {
        invoiceNumber: record.invoiceNumber,
        amount: record.amount,
        packageName: record.ptPackageName,
        sessions: record.ptPackageSessions,
        assignedStaffName: assignedStaffName,
        assignedStaffLevel: assignedStaffLevel,
        packageType: "pt_package",
      },
    });

    // Extension if applicable
    if (record.updatedAt && record.updatedAt !== record.createdAt) {
      activities.push({
        id: `activity-pt-${record.id}-extended`,
        type: "pt_package_extended",
        description: `Extended PT package duration`,
        performedBy: record.issuedBy || "System",
        timestamp: record.updatedAt,
        relatedRecordId: record.id,
        relatedRecordType: "pt_package",
        details: {
          invoiceNumber: record.invoiceNumber,
          packageName: record.ptPackageName,
          oldValue: record.startDate,
          newValue: record.expiryDate,
        },
      });
    }
  });

  // Add activities from completed appointments
  appointments
    .filter(apt => apt.status === "COMPLETED")
    .forEach((appointment, index) => {
      const ptPackage = ptPackageRecords.find(pkg => pkg.id === appointment.ptPackageRecordId);
      
      // Calculate end time from start time and duration
      const startTime = appointment.time || "00:00";
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      const startTimeMinutes = startHours * 60 + startMinutes;
      const endTimeMinutes = startTimeMinutes + (appointment.duration || 60);
      const endHours = Math.floor(endTimeMinutes / 60);
      const endMins = endTimeMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
      const timeRange = `${startTime} - ${endTime}`;
      
      // Create compact description
      const description = "1 sessions is burned";
      
      activities.push({
        id: `activity-appointment-${appointment._id || index}`,
        type: "appointment_completed",
        description: description,
        performedBy: appointment.staffName || "Trainer",
        timestamp: appointment.date || getTimestamp(-index * 3600000),
        relatedRecordId: appointment.ptPackageRecordId || appointment._id,
        relatedRecordType: "appointment",
        details: {
          packageName: ptPackage?.ptPackageName,
          invoiceNumber: ptPackage?.invoiceNumber,
          trainer: appointment.staffName,
          date: appointment.date,
          timeRange: timeRange,
        },
      });
    });

  // Add activities from document uploads
  if (memberDocuments && memberDocuments.length > 0) {
    memberDocuments.forEach((doc, index) => {
      activities.push({
        id: `activity-document-${doc.id || index}`,
        type: "document_uploaded",
        description: `Uploaded ${doc.name}`,
        performedBy: "System",
        timestamp: doc.uploadedAt || getTimestamp(-index * 86400000),
        relatedRecordId: doc.id,
        relatedRecordType: undefined,
        details: {
          fileName: doc.name,
          fileType: doc.type,
        },
      });
    });
  }

  // Sort by timestamp (newest first)
  return activities.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

