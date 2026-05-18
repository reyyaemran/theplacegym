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
import { PTPackage, PTPackageSessions } from "../types/pt-package";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const ptPackageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sessions: z.number().min(1, "Sessions must be at least 1"),
  validityDays: z.number().min(1, "Validity must be at least 1 day"),
  price: z.number().min(0, "Price must be 0 or greater"),
  pricePerSession: z.number().min(0, "Price per session must be 0 or greater"),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type PTPackageFormValues = z.infer<typeof ptPackageSchema>;

interface PTPackageFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ptPackage?: PTPackage | null;
  onSave: (data: Omit<PTPackage, "id" | "createdAt" | "updatedAt">) => void;
}

export function PTPackageFormDialog({
  open,
  onOpenChange,
  ptPackage,
  onSave,
}: PTPackageFormDialogProps) {
  const form = useForm<PTPackageFormValues>({
    resolver: zodResolver(ptPackageSchema),
    defaultValues: {
      name: "",
      sessions: 1,
      validityDays: 30,
      price: 0,
      pricePerSession: 0,
      description: "",
      isActive: true,
    },
  });


  useEffect(() => {
    if (ptPackage) {
      form.reset({
        name: ptPackage.shortName || ptPackage.name,
        sessions: ptPackage.sessions,
        validityDays: ptPackage.validityDays || 30,
        price: ptPackage.price,
        pricePerSession: ptPackage.pricePerSession,
        description: ptPackage.description || "",
        isActive: ptPackage.isActive,
      });
    } else {
      form.reset({
        name: "",
        sessions: 1,
        validityDays: 30,
        price: 0,
        pricePerSession: 0,
        description: "",
        isActive: true,
      });
    }
  }, [ptPackage, form, open]);


  const onSubmit = (data: PTPackageFormValues) => {
    try {
      // Use name for both name and shortName (for badge display)
      onSave({
        sessions: data.sessions as PTPackageSessions,
        name: `${data.sessions} Session${data.sessions === 1 ? "" : "s"}`,
        shortName: data.name,
        price: data.price,
        pricePerSession: data.pricePerSession,
        description: data.description?.trim() || undefined,
        validityDays: data.validityDays,
        isActive: data.isActive,
      });
      toast.success(ptPackage ? "PT Package updated successfully" : "PT Package created successfully");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast.error("Failed to save PT Package");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {ptPackage ? "Edit PT Package" : "Create PT Package"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                  <FormLabel>Name (for PT Package Badges)</FormLabel>
                      <FormControl>
                    <Input
                      placeholder="e.g. 10"
                      {...field}
                      className="font-mono uppercase italic"
                    />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                name="validityDays"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>Duration (Days)</FormLabel>
                      <FormControl>
                        <Input
                        type="number"
                        min="1"
                        placeholder="30"
                          {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <FormField
                control={form.control}
                name="sessions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Sessions</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="10"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        className="font-mono"
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
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                          }}
                          onBlur={field.onBlur}
                          className="font-mono"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pricePerSession"
                  render={({ field }) => (
                    <FormItem>
                    <FormLabel>Price/Sessions</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                          }}
                          onBlur={field.onBlur}
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
                    <p className="text-xs text-muted-foreground">Allow this package to be sold</p>
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
                {ptPackage ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

