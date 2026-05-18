"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Staff, StaffPermission } from "@/types/staff";
import { useState, useEffect } from "react";
import { useUpdateStaff } from "@/hooks/use-staff";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Eye, EyeOff, Users, Calendar, CalendarClock, FileText, Settings as SettingsIcon, Edit, X, ClipboardList, UserCircle } from "lucide-react";
import { DEFAULT_PERMISSIONS_BY_DEPARTMENT } from "@/types/staff";

interface StaffSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff;
}

const PERMISSIONS: { id: StaffPermission; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    id: "view_dashboard", 
    label: "View Dashboard", 
    description: "Access the main dashboard overview.",
    icon: <Eye className="h-4 w-4 text-blue-500" />
  },
  { 
    id: "manage_roster", 
    label: "Manage Roster", 
    description: "View and edit staff schedules.",
    icon: <Calendar className="h-4 w-4 text-green-500" />
  },
  { 
    id: "manage_appointments", 
    label: "Manage Appointments", 
    description: "Create, view, and manage client appointments.",
    icon: <CalendarClock className="h-4 w-4 text-teal-500" />
  },
  { 
    id: "manage_program", 
    label: "Manage Program", 
    description: "Create workout programs and meal plans.",
    icon: <ClipboardList className="h-4 w-4 text-cyan-500" />
  },
  { 
    id: "manage_staff", 
    label: "Manage Staff", 
    description: "Add, edit, and remove staff members.",
    icon: <Users className="h-4 w-4 text-purple-500" />
  },
  { 
    id: "manage_members", 
    label: "Manage Members", 
    description: "Access and modify member profiles.",
    icon: <Users className="h-4 w-4 text-orange-500" />
  },
  { 
    id: "view_reports", 
    label: "View Reports", 
    description: "Access financial and performance reports.",
    icon: <FileText className="h-4 w-4 text-red-500" />
  },
  { 
    id: "manage_settings", 
    label: "System Settings", 
    description: "Configure system-wide settings.",
    icon: <SettingsIcon className="h-4 w-4 text-gray-500" />
  },
];

export function StaffSettingsDialog({ open, onOpenChange, staff }: StaffSettingsDialogProps) {
  const updateStaffMutation = useUpdateStaff();
  const [loginEnabled, setLoginEnabled] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  
  // Credentials State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // Used for specific password
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Initialize state from staff prop
  useEffect(() => {
    if (staff) {
      setLoginEnabled(staff.loginEnabled ?? true);
      setPermissions(staff.permissions || []);
      setRole(staff.role || "STAFF");
      setEmail(staff.email || "");
      // Initialize password field with existing specific password, or fallback to staffID (implied default)
      // But to avoid confusion, if we want to show "what is the password", we show the active one.
      setPassword(staff.password || staff.staffID || "");
      setIsEditingCredentials(false);
      setShowPassword(false);
    }
  }, [staff, open]);

  const handleSave = async () => {
    if (!staff._id) return;

    try {
      await updateStaffMutation.mutateAsync({
        id: staff._id,
        data: {
          loginEnabled,
          permissions,
          role,
          email,
          // Save 'password' field. We do NOT update 'staffID' here.
          password: password,
        },
      });
      toast.success("Staff settings updated successfully");
      onOpenChange(false);
    } catch (error) {
      // Error is handled by mutation hook
      // Toast handled by mutation hook
    }
  };

  const togglePermission = (permissionId: StaffPermission) => {
    setPermissions((prev) => 
      prev.includes(permissionId) 
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Staff Access & Permissions</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Login Access */}
          <div className="flex items-center justify-between space-x-2 border-b pb-4">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="login-access" className="text-base font-medium">Login Access</Label>
            </div>
            <Switch
              id="login-access"
              checked={loginEnabled}
              onCheckedChange={setLoginEnabled}
            />
          </div>

          {/* Credentials Info */}
          <div className="bg-muted/30 p-3 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Login Credentials
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 rounded-full hover:bg-background/80" 
                onClick={() => setIsEditingCredentials(!isEditingCredentials)}
                title={isEditingCredentials ? "Cancel" : "Edit credentials"}
              >
                {isEditingCredentials ? <X className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
              </Button>
            </div>
            
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input 
                  id="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="h-8 text-xs"
                  placeholder="staff@example.com"
                  disabled={!isEditingCredentials}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password" className="text-xs">Password {staff.password ? "(Custom Set)" : "(Default: Staff ID)"}</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="h-8 text-xs font-mono pr-8"
                    placeholder="Password"
                    disabled={!isEditingCredentials}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {!email && (
              <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                ⚠️ Email is required for login.
              </div>
            )}
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-base font-medium">Feature Permissions</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-muted-foreground px-2"
                  onClick={() => {
                    const defaults = DEFAULT_PERMISSIONS_BY_DEPARTMENT[staff.department] || ["view_dashboard"];
                    setPermissions(defaults);
                    toast.info(`Permissions reset to ${staff.department} defaults`);
                  }}
                  disabled={!loginEnabled}
                >
                  Reset to Defaults
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Role:</span>
                <select 
                  className="text-xs border rounded p-1 bg-background"
                  value={role}
                  onChange={(e) => {
                    const newRole = e.target.value as "ADMIN" | "STAFF";
                    setRole(newRole);
                    if (newRole === "ADMIN") {
                      setPermissions(PERMISSIONS.map(p => p.id));
                    }
                  }}
                >
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 border rounded-md p-3 h-[240px] overflow-y-auto">
              {PERMISSIONS.map((perm) => (
                <div key={perm.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                  <Checkbox 
                    id={perm.id} 
                    checked={permissions.includes(perm.id)}
                    onCheckedChange={() => togglePermission(perm.id)}
                    disabled={!loginEnabled}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={perm.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      {perm.icon}
                      {perm.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {perm.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!email && loginEnabled}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
