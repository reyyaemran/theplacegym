"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PermissionDeniedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  requiredPermission?: string;
}

export function PermissionDeniedDialog({
  open,
  onOpenChange,
  featureName,
  requiredPermission,
}: PermissionDeniedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto bg-amber-100 p-3 rounded-full mb-2">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-xl">Access Restricted</DialogTitle>
          <DialogDescription className="text-center pt-2">
            You do not have permission to access the <strong>{featureName}</strong> feature.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 text-center text-sm text-muted-foreground">
          <p>
            This feature requires the <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{requiredPermission}</code> permission.
          </p>
          <p className="mt-2">
            Please contact an administrator to request access.
          </p>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

