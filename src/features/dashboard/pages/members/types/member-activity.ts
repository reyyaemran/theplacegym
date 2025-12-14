export type MemberActivityType = 
  | "appointment_completed"
  | "membership_purchased"
  | "membership_date_changed"
  | "membership_frozen"
  | "membership_unfrozen"
  | "pt_package_purchased"
  | "pt_package_extended"
  | "pt_package_date_changed"
  | "payment_received"
  | "status_changed"
  | "document_uploaded"
  | "other";

export interface MemberActivity {
  id: string;
  type: MemberActivityType;
  description: string;
  performedBy: string; // Staff member who performed the action
  timestamp: string;
  relatedRecordId?: string; // ID of related membership or PT package record
  relatedRecordType?: "membership" | "pt_package" | "appointment";
  details?: {
    packageName?: string;
    invoiceNumber?: string;
    amount?: number;
    oldValue?: string;
    newValue?: string;
    reason?: string;
    [key: string]: any;
  };
}

