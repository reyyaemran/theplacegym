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
import { format, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { PTPackageRecord, PaymentType } from "../types/pt-package-record";
import { useUpdatePTPackageRecord } from "@/hooks/use-pt-package-records";
import { useStaff } from "@/hooks/use-staff";
import { usePTPackageTypes } from "@/hooks/use-pt-package-types";

const editPTPackageRecordSchema = z.object({
  ptPackageId: z.string().min(1, "PT Package is required"),
  ptPackageSessions: z.number().min(1, "Sessions must be at least 1"),
  startDate: z.date(),
  expiryDate: z.date(),
  paymentType: z.enum(["cash", "card", "bank_transfer", "online", "other"]),
  paymentDate: z.date(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentRemark: z.string().optional(),
  assignedStaffName: z.string().optional(),
  issuedBy: z.string().optional(),
});

type EditPTPackageRecordFormValues = z.infer<typeof editPTPackageRecordSchema>;

interface EditPTPackageRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PTPackageRecord | null;
}

export function EditPTPackageRecordDialog({
  open,
  onOpenChange,
  record,
}: EditPTPackageRecordDialogProps) {
  const updatePTPackageRecord = useUpdatePTPackageRecord();
  const { data: staffData = [] } = useStaff();
  const { data: ptPackagesData = [] } = usePTPackageTypes();

  const form = useForm<EditPTPackageRecordFormValues>({
    resolver: zodResolver(editPTPackageRecordSchema),
    defaultValues: {
      ptPackageId: "",
      ptPackageSessions: 1,
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
        ptPackageId: record.ptPackageId,
        ptPackageSessions: record.ptPackageSessions,
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

  const handlePTPackageChange = (ptPackageId: string) => {
    const selectedPackage = ptPackagesData.find((pkg) => pkg.id === ptPackageId);
    if (selectedPackage) {
      form.setValue("ptPackageId", ptPackageId);
      form.setValue("ptPackageSessions", selectedPackage.sessions);
      form.setValue("amount", selectedPackage.price);
      
      // Update expiry date based on validity days
      const startDate = form.getValues("startDate");
      const validityDays = selectedPackage.validityDays || 30;
      const newExpiryDate = addDays(startDate, validityDays);
      form.setValue("expiryDate", newExpiryDate);
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      form.setValue("startDate", date);
      const ptPackageId = form.getValues("ptPackageId");
      const selectedPackage = ptPackagesData.find((pkg) => pkg.id === ptPackageId);
      if (selectedPackage) {
        const validityDays = selectedPackage.validityDays || 30;
        const newExpiryDate = addDays(date, validityDays);
        form.setValue("expiryDate", newExpiryDate);
      }
    }
  };

  const onSubmit = async (data: EditPTPackageRecordFormValues) => {
    if (!record) return;

    const selectedPackage = ptPackagesData.find((pkg) => pkg.id === data.ptPackageId);

    try {
      const recordId = (record as any)._id || record.id || "";
      await updatePTPackageRecord.mutateAsync({
        id: recordId,
        data: {
          ptPackageId: data.ptPackageId,
          ptPackageName: selectedPackage?.name || record.ptPackageName,
          ptPackageSessions: data.ptPackageSessions,
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
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit PT Package Record</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ptPackageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PT Package</FormLabel>
                    <Select
                      onValueChange={handlePTPackageChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="PT package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ptPackagesData.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.shortName || pkg.name}
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
                name="ptPackageSessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sessions</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
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
                      <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Payment" />
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
                      <PopoverContent className="w-auto p-0 max-w-[calc(100vw-2rem)]" align="start">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedStaffName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Staff</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Staff" />
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
                          <SelectValue placeholder="Staff" />
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
                      placeholder="Remark"
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
              <Button type="submit" disabled={updatePTPackageRecord.isPending}>
                {updatePTPackageRecord.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

