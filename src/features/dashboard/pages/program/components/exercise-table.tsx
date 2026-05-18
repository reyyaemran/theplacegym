"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkoutExercise } from "../types/workout-program";
import { Plus, Trash2 } from "lucide-react";

interface ExerciseTableProps {
  title: string;
  exercises: WorkoutExercise[];
  onChange: (exercises: WorkoutExercise[]) => void;
}

const emptyExercise = (): WorkoutExercise => ({
  id: `ex-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  exercise: "",
  resistance: "",
  setRepDuration: "",
  tempo: "",
  load: "",
  notes: "",
});

export function ExerciseTable({ title, exercises, onChange }: ExerciseTableProps) {
  const addRow = () => {
    onChange([...exercises, emptyExercise()]);
  };

  const removeRow = (id: string) => {
    onChange(exercises.filter((e) => e.id !== id));
  };

  const updateExercise = (id: string, field: keyof WorkoutExercise, value: string) => {
    onChange(
      exercises.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/80 dark:bg-muted">
              <th className="p-2 text-left font-semibold text-xs uppercase">EXERCISE</th>
              <th className="p-2 text-left font-semibold text-xs uppercase">RESISTANCE</th>
              <th className="p-2 text-left font-semibold text-xs uppercase w-32">REP/DURATION</th>
              <th className="p-2 text-left font-semibold text-xs uppercase">TEMPO</th>
              <th className="p-2 text-left font-semibold text-xs uppercase">SETS</th>
              <th className="p-2 text-left font-semibold text-xs uppercase w-24">NOTES</th>
              <th className="p-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {exercises.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-muted-foreground text-sm">
                  No exercises. Click &quot;Add&quot; to add one.
                </td>
              </tr>
            ) : (
              exercises.map((ex) => (
                <tr key={ex.id} className="border-t border-border hover:bg-muted/30 dark:hover:bg-muted/50">
                  <td className="p-2">
                    <Input
                      value={ex.exercise}
                      onChange={(e) => updateExercise(ex.id, "exercise", e.target.value)}
                      placeholder="Exercise"
                      className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={ex.resistance}
                      onChange={(e) => updateExercise(ex.id, "resistance", e.target.value)}
                      placeholder="Resistance"
                      className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={ex.setRepDuration}
                      onChange={(e) => updateExercise(ex.id, "setRepDuration", e.target.value)}
                      placeholder="e.g. 3x12"
                      className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={ex.tempo}
                      onChange={(e) => updateExercise(ex.id, "tempo", e.target.value)}
                      placeholder="Tempo"
                      className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={ex.load}
                      onChange={(e) => updateExercise(ex.id, "load", e.target.value)}
                      placeholder="e.g. 3"
                      className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={ex.notes}
                      onChange={(e) => updateExercise(ex.id, "notes", e.target.value)}
                      placeholder="Notes"
                      className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50"
                    />
                  </td>
                  <td className="p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => removeRow(ex.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
