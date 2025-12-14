"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { MembershipRecord, MembershipType, PaymentType } from "../types/membership-record";
import { useUpdateMembershipRecord } from "@/hooks/use-membership-records";
import { useStaff } from "@/hooks/use-staff";
import { addMonths, addDays } from "date-fns";

const editMembershipRecordSchema = z.object({
  membershipType: z.enum(["day_pass", "1_month", "3_month", "6_month", "1_year"]),
  startDate: z.date(),
  expiryDate: z.date(),
  paymentType: z.enum(["cash", "card", "bank_transfer", "online", "other"]),
  paymentDate: z.date(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentRemark: z.string().optional(),
  assignedStaffName: z.string().optional(),
  issuedBy: z.string().optional(),
});

type EditMembershipRecordFormValues = z.infer<typeof editMembershipRecordSchema>;

interface EditMembershipRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: MembershipRecord | null;
}

export function EditMembershipRecordDialog({
  open,
  onOpenChange,
  record,
}: EditMembershipRecordDialogProps) {
  const updateMembershipRecord = useUpdateMembershipRecord();
  const { data: staffData = [] } = useStaff();

  const form = useForm<EditMembershipRecordFormValues>({
    resolver: zodResolver(editMembershipRecordSchema),
    defaultValues: {
      membershipType: "1_month",
      startDate: new Date(),
      expiryDate: new Date(),
      paymentType: "cash",
      paymentDate: new Date(),
      amount: 0,
      paymentRemark: "",
      assignedStaffName: "",
      issuedBy: "",
    },
  });

  useEffect(() => {
    if (record && open) {
      form.reset({
        membershipType: record.membershipType,
        startDate: new Date(record.startDate),
        expiryDate: new Date(record.expiryDate),
        paymentType: record.paymentType,
        paymentDate: new Date(record.paymentDate),
        amount: record.amount,
        paymentRemark: record.paymentRemark || "",
        assignedStaffName: record.assignedStaffName || "",
        issuedBy: record.issuedBy || "",
      });
    }
  }, [record, open, form]);

  const calculateExpiryDate = (startDate: Date, membershipType: MembershipType): Date => {
    if (membershipType === "day_pass") {
      return addDays(startDate, 1);
    }
    const months = membershipType === "1_month" ? 1 :
                  membershipType === "3_month" ? 3 :
                  membershipType === "6_month" ? 6 : 12;
    return addMonths(startDate, months);
  };

  const handleMembershipTypeChange = (value: MembershipType) => {
    const startDate = form.getValues("startDate");
    const newExpiryDate = calculateExpiryDate(startDate, value);
    form.setValue("membershipType", value);
    form.setValue("expiryDate", newExpiryDate);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      form.setValue("startDate", date);
      const membershipType = form.getValues("membershipType");
      const newExpiryDate = calculateExpiryDate(date, membershipType);
      form.setValue("expiryDate", newExpiryDate);
    }
  };

  const onSubmit = async (data: EditMembershipRecordFormValues) => {
    if (!record) return;

    try {
      const recordId = (record as any)._id || record.id || "";
      await updateMembershipRecord.mutateAsync({
        id: recordId,
        data: {
          membershipType: data.membershipType,
          startDate: data.startDate.toISOString(),
          expiryDate: data.expiryDate.toISOString(),
          paymentType: data.paymentType,
          paymentDate: data.paymentDate.toISOString(),
          amount: data.amount,
          paymentRemark: data.paymentRemark || undefined,
          assignedStaffName: data.assignedStaffName || undefined,
          issuedBy: data.issuedBy || undefined,
        },
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Membership Record</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="membershipType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership Type</FormLabel>
                    <Select
                      onValueChange={(value) => handleMembershipTypeChange(value as MembershipType)}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select membership type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="day_pass">Day Pass</SelectItem>
                        <SelectItem value="1_month">1 Month</SelectItem>
                        <SelectItem value="3_month">3 Months</SelectItem>
                        <SelectItem value="6_month">6 Months</SelectItem>
                        <SelectItem value="1_year">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={handleStartDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => date && field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">KHQR</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => date && field.onChange(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedStaffName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Staff</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {staffData.map((staff) => (
                          <SelectItem key={staff._id} value={staff.name}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuedBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issued By</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {staffData.map((staff) => (
                          <SelectItem key={staff._id} value={staff.name}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentRemark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Remark</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional payment remark"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMembershipRecord.isPending}>
                {updateMembershipRecord.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

