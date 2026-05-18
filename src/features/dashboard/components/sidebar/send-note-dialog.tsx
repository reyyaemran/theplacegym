"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendNote } from "@/hooks/use-staff-notes";
import { Send, Loader2 } from "lucide-react";

interface SendNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toStaffId: string;
  toStaffName: string;
}

export function SendNoteDialog({
  open,
  onOpenChange,
  toStaffId,
  toStaffName,
}: SendNoteDialogProps) {
  const [message, setMessage] = useState("");
  const sendNote = useSendNote();

  const handleSend = () => {
    if (!message.trim()) return;
    sendNote.mutate(
      { toStaffId, toStaffName, message: message.trim() },
      {
        onSuccess: () => {
          setMessage("");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Send Note to {toStaffName}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            This note will appear in their notifications
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message..."
          className="min-h-[80px] text-xs resize-none"
          autoFocus
        />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() || sendNote.isPending}
            className="text-xs"
          >
            {sendNote.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Send className="h-3 w-3 mr-1" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
