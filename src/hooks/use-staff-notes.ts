"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StaffNote } from "@/types/staff-note";
import { toast } from "sonner";

export function useStaffNotes(direction: "received" | "sent" = "received") {
  return useQuery({
    queryKey: ["staff-notes", direction],
    queryFn: async () => {
      const response = await fetch(`/api/staff-notes?direction=${direction}`);
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json() as Promise<StaffNote[]>;
    },
    refetchInterval: 30_000,
  });
}

export function useUnreadNotesCount() {
  const { data: notes = [] } = useStaffNotes("received");
  return notes.filter((n) => !n.read).length;
}

export function useSendNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      toStaffId: string;
      toStaffName: string;
      message: string;
    }) => {
      const response = await fetch("/api/staff-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to send note");
      }
      return response.json() as Promise<StaffNote>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-notes"] });
      toast.success("Note sent successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send note");
    },
  });
}

export function useMarkNoteRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/staff-notes/${noteId}`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-notes"] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/staff-notes/${noteId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete note");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-notes"] });
      toast.success("Note deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete note");
    },
  });
}
