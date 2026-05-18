export interface StaffNote {
  _id?: string;
  fromStaffId: string;
  fromStaffName: string;
  toStaffId: string;
  toStaffName: string;
  message: string;
  read: boolean;
  createdAt?: Date | string;
}
