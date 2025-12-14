"use client";

import { useState } from "react";
import { Staff } from "@/types/staff";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StaffRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: Staff;
  onRate: (staffId: string, rating: number) => void;
}

export function StaffRatingDialog({
  open,
  onOpenChange,
  staff,
  onRate,
}: StaffRatingDialogProps) {
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const handleSubmit = () => {
    if (selectedRating === 0) {
      toast.error("Please select a rating", {
        description: "Choose a rating from 1 to 4 stars",
      });
      return;
    }

    if (!staff._id) {
      toast.error("Unable to submit rating");
      return;
    }

    onRate(staff._id, selectedRating);
    toast.success("Rating submitted", {
      description: `You rated ${staff.name} ${selectedRating} star${selectedRating > 1 ? 's' : ''}`,
    });
    setSelectedRating(0);
    setHoveredRating(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {staff.name}</DialogTitle>
          <DialogDescription>
            Your rating is anonymous. Please rate this staff member from 1 to 4 stars based on your experience.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setSelectedRating(star)}
              >
                <Star
                  className={cn(
                    "h-10 w-10 transition-colors",
                    (hoveredRating >= star || selectedRating >= star)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-muted text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
          {selectedRating > 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Selected: {selectedRating} star{selectedRating > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={selectedRating === 0}>
            Submit Rating
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

