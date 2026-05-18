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
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Membership, MembershipType } from "../types/membership";
import { toast } from "sonner";

const membershipSchema = z.object({
  name: z.string().min(1, "Name is required"),
  duration: z.number().min(0, "Duration must be 0 or greater"),
  durationUnit: z.enum(["days", "months"]),
  price: z.number().min(0.01, "Price must be greater than 0"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type MembershipFormValues = z.infer<typeof membershipSchema>;

interface MembershipFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership?: Membership | null;
  onSave: (data: Omit<Membership, "id" | "createdAt" | "updatedAt">) => void;
}

// Helper to convert days to months (approximate)
const daysToMonths = (days: number): number => {
  return Math.round((days / 30) * 10) / 10; // Round to 1 decimal place
};

// Helper to convert months to days
const monthsToDays = (months: number): number => {
  return Math.round(months * 30);
};

// Helper to determine membership type from duration (in months)
const getMembershipType = (durationMonths: number): MembershipType => {
  if (durationMonths === 0) return "day_pass";
  if (durationMonths === 1) return "1_month";
  if (durationMonths === 3) return "3_month";
  if (durationMonths === 6) return "6_month";
  if (durationMonths === 12) return "1_year";
  return "1_month"; // default
};

// Helper to generate name from duration
const generateMembershipName = (durationMonths: number): string => {
  if (durationMonths === 0) return "Day Pass";
  if (durationMonths === 1) return "1 Month";
  if (durationMonths === 12) return "1 Year";
  return `${durationMonths} Months`;
};

export function MembershipFormDialog({
  open,
  onOpenChange,
  membership,
  onSave,
}: MembershipFormDialogProps) {
  const form = useForm<MembershipFormValues>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      name: "",
      duration: 0,
      durationUnit: "days",
      price: 0,
      description: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (membership) {
      // Convert months to days for display if duration is less than 30 days equivalent
      const durationMonths = membership.duration;
      const durationDays = monthsToDays(durationMonths);
      const useDays = durationMonths < 1 || durationDays < 30;
      
      form.reset({
        name: membership.shortName || membership.name,
        duration: useDays ? durationDays : durationMonths,
        durationUnit: useDays ? "days" : "months",
        price: membership.price,
        description: membership.description || "",
        isActive: membership.isActive,
      });
    } else {
      form.reset({
        name: "",
        duration: 0,
        durationUnit: "days",
        price: 0,
        description: "",
        isActive: true,
      });
    }
  }, [membership, form, open]);

  const onSubmit = (data: MembershipFormValues) => {
    try {
      // Convert duration to months for storage
      const durationMonths = data.durationUnit === "days" 
        ? daysToMonths(data.duration) 
        : data.duration;
      
      const membershipType = getMembershipType(durationMonths);
      const fullName = generateMembershipName(durationMonths);
      
      onSave({
        type: membershipType,
        name: fullName,
        shortName: data.name,
        duration: durationMonths,
        price: data.price,
        description: data.description?.trim() || undefined,
        isActive: data.isActive,
      });
      toast.success(membership ? "Membership updated successfully" : "Membership created successfully");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to save membership");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {membership ? "Edit Membership" : "Create Membership"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name (for Membership Badges)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 1M"
                      {...field}
                      className="font-mono uppercase italic"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid grid-cols-[1fr_auto] gap-2">
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                      <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
                <FormField
                  control={form.control}
                  name="durationUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="opacity-0">Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-[100px] mt-0">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                        min="0"
                      placeholder="0.00"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                    <p className="text-xs text-muted-foreground">Allow this membership to be sold</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
              <Button type="submit">
                {membership ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

