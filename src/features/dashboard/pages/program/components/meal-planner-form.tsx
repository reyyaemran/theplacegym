"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MealTable } from "@/features/dashboard/pages/meal-planner/components/meal-table";
import { MealPlan, TdeeGender } from "@/features/dashboard/pages/meal-planner/types/meal-plan";
import {
  caloriesFromMacros,
  getEffectiveMacros,
  getDailyTargetFromTDEE,
  getEffectiveDailyTarget,
  calculateTDEE,
} from "@/features/dashboard/pages/meal-planner/utils/calorie-calculator";
import { UtensilsCrossed, Sparkles } from "lucide-react";

interface MealPlannerFormProps {
  plan: MealPlan;
  onChange: (plan: MealPlan) => void;
  onSave: () => void;
  onSuggest?: () => Promise<void>;
  members: { id: string; fullName: string }[];
  isSuggesting?: boolean;
}

export function MealPlannerForm({
  plan,
  onChange,
  onSave,
  onSuggest,
  members,
  isSuggesting,
}: MealPlannerFormProps) {
  const effectiveTarget = getEffectiveDailyTarget(plan);
  const dailyTotalCalories = [
    ...(plan.breakfast || []),
    ...(plan.lunch || []),
    ...(plan.dinner || []),
    ...(plan.snacks || []),
  ].reduce(
    (sum, m) => {
      const ef = getEffectiveMacros(m);
      return sum + caloriesFromMacros(ef.protein, ef.carbs, ef.fat);
    },
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            <CardTitle className="text-lg font-black tracking-tight uppercase font-montserrat">
              MEAL PLANNER
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
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            TDEE Calculator
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 w-full">
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label className="text-sm font-semibold uppercase">CLIENT</Label>
              <Input
                list="meal-client-suggestions"
                value={plan.client}
                onChange={(e) => onChange({ ...plan, client: e.target.value })}
                placeholder="Name"
                className="h-9 w-full text-sm"
              />
              <datalist id="meal-client-suggestions">
                {members.map((m) => (
                  <option key={m.id} value={m.fullName} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label className="text-sm font-semibold uppercase">GOALS</Label>
              <Select
                value={plan.goals}
                onValueChange={(v) => {
                  const goals = v;
                  const tdee =
                    plan.tdeeAge &&
                    plan.tdeeGender &&
                    plan.tdeeWeight &&
                    plan.tdeeHeight &&
                    plan.tdeeActivity
                      ? calculateTDEE(
                          plan.tdeeAge,
                          plan.tdeeGender,
                          plan.tdeeWeight,
                          plan.tdeeHeight,
                          plan.tdeeActivity
                        )
                      : plan.tdee;
                  const dailyCalorieTarget =
                    tdee != null ? getDailyTargetFromTDEE(tdee, goals) : plan.dailyCalorieTarget;
                  onChange({ ...plan, goals, dailyCalorieTarget });
                }}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Goals" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                  <SelectItem value="Muscle Gain">Muscle Gain</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Performance">Performance</SelectItem>
                  <SelectItem value="General Health">General Health</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label className="text-sm font-semibold uppercase">AGE</Label>
              <Input
                type="number"
                min={1}
                max={120}
                placeholder="Years"
                value={plan.tdeeAge ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const num = v ? parseInt(v, 10) : NaN;
                  const tdeeAge = !isNaN(num) && num > 0 ? num : undefined;
                  const update = { ...plan, tdeeAge };
                  const tdee =
                    tdeeAge &&
                    plan.tdeeGender &&
                    plan.tdeeWeight &&
                    plan.tdeeHeight &&
                    plan.tdeeActivity
                      ? calculateTDEE(
                          tdeeAge,
                          plan.tdeeGender,
                          plan.tdeeWeight,
                          plan.tdeeHeight,
                          plan.tdeeActivity
                        )
                      : undefined;
                  update.tdee = tdee ?? undefined;
                  update.dailyCalorieTarget =
                    tdee != null ? getDailyTargetFromTDEE(tdee, plan.goals) : undefined;
                  onChange(update as MealPlan);
                }}
                className="h-9 w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label className="text-sm font-semibold uppercase">GENDER</Label>
              <Select
                value={plan.tdeeGender ?? ""}
                onValueChange={(v) => {
                  const tdeeGender: TdeeGender | undefined = v === "male" || v === "female" ? v : undefined;
                  const update = { ...plan, tdeeGender };
                  const tdee =
                    plan.tdeeAge &&
                    tdeeGender &&
                    plan.tdeeWeight &&
                    plan.tdeeHeight &&
                    plan.tdeeActivity
                      ? calculateTDEE(
                          plan.tdeeAge,
                          tdeeGender,
                          plan.tdeeWeight,
                          plan.tdeeHeight,
                          plan.tdeeActivity
                        )
                      : undefined;
                  update.tdee = tdee ?? undefined;
                  update.dailyCalorieTarget =
                    tdee != null ? getDailyTargetFromTDEE(tdee, plan.goals) : undefined;
                  onChange(update as MealPlan);
                }}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="M/F" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label className="text-sm font-semibold uppercase">WEIGHT (kg)</Label>
              <Input
                type="number"
                min={1}
                step={0.1}
                placeholder="kg"
                value={plan.tdeeWeight ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const num = v ? parseFloat(v) : NaN;
                  const tdeeWeight = !isNaN(num) && num > 0 ? num : undefined;
                  const update = { ...plan, tdeeWeight };
                  const tdee =
                    plan.tdeeAge &&
                    plan.tdeeGender &&
                    tdeeWeight &&
                    plan.tdeeHeight &&
                    plan.tdeeActivity
                      ? calculateTDEE(
                          plan.tdeeAge,
                          plan.tdeeGender,
                          tdeeWeight,
                          plan.tdeeHeight,
                          plan.tdeeActivity
                        )
                      : undefined;
                  update.tdee = tdee ?? undefined;
                  update.dailyCalorieTarget =
                    tdee != null ? getDailyTargetFromTDEE(tdee, plan.goals) : undefined;
                  onChange(update as MealPlan);
                }}
                className="h-9 w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label className="text-sm font-semibold uppercase">HEIGHT (cm)</Label>
              <Input
                type="number"
                min={1}
                placeholder="cm"
                value={plan.tdeeHeight ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const num = v ? parseInt(v, 10) : NaN;
                  const tdeeHeight = !isNaN(num) && num > 0 ? num : undefined;
                  const update = { ...plan, tdeeHeight };
                  const tdee =
                    plan.tdeeAge &&
                    plan.tdeeGender &&
                    plan.tdeeWeight &&
                    tdeeHeight &&
                    plan.tdeeActivity
                      ? calculateTDEE(
                          plan.tdeeAge,
                          plan.tdeeGender,
                          plan.tdeeWeight,
                          tdeeHeight,
                          plan.tdeeActivity
                        )
                      : undefined;
                  update.tdee = tdee ?? undefined;
                  update.dailyCalorieTarget =
                    tdee != null ? getDailyTargetFromTDEE(tdee, plan.goals) : undefined;
                  onChange(update as MealPlan);
                }}
                className="h-9 w-full text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label className="text-sm font-semibold uppercase">ACTIVITY</Label>
              <Select
                value={plan.tdeeActivity ?? ""}
                onValueChange={(v) => {
                  const tdeeActivity =
                    v === "sedentary" ||
                    v === "light" ||
                    v === "moderate" ||
                    v === "active" ||
                    v === "very_active"
                      ? v
                      : undefined;
                  const update = { ...plan, tdeeActivity };
                  const tdee =
                    plan.tdeeAge &&
                    plan.tdeeGender &&
                    plan.tdeeWeight &&
                    plan.tdeeHeight &&
                    tdeeActivity
                      ? calculateTDEE(
                          plan.tdeeAge,
                          plan.tdeeGender,
                          plan.tdeeWeight,
                          plan.tdeeHeight,
                          tdeeActivity
                        )
                      : undefined;
                  update.tdee = tdee ?? undefined;
                  update.dailyCalorieTarget =
                    tdee != null ? getDailyTargetFromTDEE(tdee, plan.goals) : undefined;
                  onChange(update as MealPlan);
                }}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="very_active">Very Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold">
            Total daily calories:{" "}
            <span className="text-primary font-bold tabular-nums">{dailyTotalCalories} cal</span>
            {effectiveTarget != null && (
              <span className="text-muted-foreground ml-2">
                (target: {effectiveTarget} cal
                {(plan.tdee != null ||
                  (plan.tdeeAge &&
                    plan.tdeeGender &&
                    plan.tdeeWeight &&
                    plan.tdeeHeight &&
                    plan.tdeeActivity))
                  ? " from TDEE"
                  : ""}
                )
              </span>
            )}
          </p>
        </div>

        <MealTable title="MEAL 1" meals={plan.breakfast || []} onChange={(breakfast) => onChange({ ...plan, breakfast })} />
        <MealTable title="MEAL 2" meals={plan.lunch || []} onChange={(lunch) => onChange({ ...plan, lunch })} />
        <MealTable title="MEAL 3" meals={plan.dinner || []} onChange={(dinner) => onChange({ ...plan, dinner })} />
        <MealTable title="MEAL 4" meals={plan.snacks || []} onChange={(snacks) => onChange({ ...plan, snacks })} />

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase">NOTES / FEEDBACK</Label>
          <Textarea
            value={plan.notesFeedback}
            onChange={(e) => onChange({ ...plan, notesFeedback: e.target.value })}
            placeholder="e.g. Gluten-free, 3 meals"
            rows={4}
            className="resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
