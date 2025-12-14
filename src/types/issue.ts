export type IssueCategory =
  | "Low Check-In"
  | "Holiday"
  | "PT Performance"
  | "System Issue"
  | "Other";

export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface Issue {
  _id?: string;
  month: string; // "YYYY-MM"
  week: number; // 1-5
  title: string;
  description: string;
  category: IssueCategory;
  ownerId: string;
  status: IssueStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

