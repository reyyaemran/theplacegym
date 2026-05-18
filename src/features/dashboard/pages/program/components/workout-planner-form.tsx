"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExerciseTable } from "./exercise-table";
import { BodyPartCheckboxes } from "./body-part-checkboxes";
import { WorkoutProgram } from "../types/workout-program";
import { Dumbbell, Sparkles } from "lucide-react";

interface WorkoutPlannerFormProps {
  program: WorkoutProgram;
  onChange: (program: WorkoutProgram) => void;
  onSave: () => void;
  onSuggest?: () => Promise<void>;
  members: { id: string; fullName: string }[];
  isSuggesting?: boolean;
}

export function WorkoutPlannerForm({
  program,
  onChange,
  onSave,
  onSuggest,
  members,
  isSuggesting,
}: WorkoutPlannerFormProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            <CardTitle className="text-lg font-black tracking-tight uppercase font-montserrat">
              WORKOUT PLANNER
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {onSuggest && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onSuggest}
                disabled={isSuggesting}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                {isSuggesting ? "Generating..." : "AI Suggest"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label className="text-sm font-semibold uppercase">CLIENT</Label>
            <Input
              list="client-suggestions"
              value={program.client}
              onChange={(e) => onChange({ ...program, client: e.target.value })}
              placeholder="Name"
              className="h-9 w-full text-sm"
            />
            <datalist id="client-suggestions">
              {members.map((m) => (
                <option key={m.id} value={m.fullName} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label className="text-sm font-semibold uppercase">LEVEL</Label>
            <Select value={program.level} onValueChange={(v) => onChange({ ...program, level: v })}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label className="text-sm font-semibold uppercase">GOALS</Label>
            <Select value={program.goals} onValueChange={(v) => onChange({ ...program, goals: v })}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Goals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Strength">Strength</SelectItem>
                <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
                <SelectItem value="Endurance">Endurance</SelectItem>
                <SelectItem value="General Fitness">General Fitness</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 min-w-0">
            <Label className="text-sm font-semibold uppercase">WEEK</Label>
            <Select value={program.week} onValueChange={(v) => onChange({ ...program, week: v })}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={String(i + 1)}>
                    Week {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <BodyPartCheckboxes
          value={program.bodyParts || {}}
          onChange={(bodyParts) => onChange({ ...program, bodyParts })}
        />

        <ExerciseTable
          title="WARM - UP"
          exercises={program.warmUp}
          onChange={(warmUp) => onChange({ ...program, warmUp })}
        />
        <ExerciseTable
          title="EXERCISES"
          exercises={program.exercises}
          onChange={(exercises) => onChange({ ...program, exercises })}
        />
        <ExerciseTable
          title="COOLDOWN"
          exercises={program.cooldown}
          onChange={(cooldown) => onChange({ ...program, cooldown })}
        />

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">NOTES / FEEDBACK</Label>
          <Textarea
            value={program.notesFeedback}
            onChange={(e) => onChange({ ...program, notesFeedback: e.target.value })}
            placeholder="e.g. Knee injury, back..."
            rows={4}
            className="resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
