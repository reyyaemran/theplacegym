"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MealTable } from "./components/meal-table";
import { exportMealPlanToPDF } from "./utils/export-meal-plan";
import { MealPlan, MealEntry } from "./types/meal-plan";
import { caloriesFromMacros, getEffectiveMacros } from "./utils/calorie-calculator";
import { useAuth } from "@/hooks/use-auth";
import { useMembers } from "@/hooks/use-members";
import {
  useMealPlans,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
} from "@/hooks/use-meal-plans";
import {
  UtensilsCrossed,
  Download,
  Share2,
  FilePlus,
  MoreVertical,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const emptyMeal = (): MealEntry => ({
  id: `meal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  foodName: "",
  protein: 0,
  carbs: 0,
  fat: 0,
});

const defaultPlan = (): MealPlan => ({
  client: "",
  goals: "",
  week: "",
  dailyCalorieTarget: undefined,
  breakfast: [emptyMeal()],
  lunch: [emptyMeal()],
  dinner: [emptyMeal()],
  snacks: [emptyMeal()],
  notesFeedback: "",
});

export function MealPlannerPage() {
  const { staff, isAdmin } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: plans = [] } = useMealPlans();
  const createMealPlan = useCreateMealPlan();
  const updateMealPlan = useUpdateMealPlan();
  const deleteMealPlan = useDeleteMealPlan();

  const trainerName = (staff as any)?.name || "Trainer";
  const trainerId = (staff as any)?._id ?? (staff as any)?.id ?? "";

  const [currentPlan, setCurrentPlan] = useState<MealPlan>(defaultPlan());
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [savedPlanSearch, setSavedPlanSearch] = useState("");

  const displayedPlans = useMemo(() => {
    if (isAdmin) return plans;
    return plans.filter(
      (p) =>
        p.trainerId === trainerId ||
        (!p.trainerId && p.trainerName === trainerName)
    );
  }, [plans, isAdmin, trainerId, trainerName]);

  const handleNewPlan = () => {
    setCurrentPlan(defaultPlan());
    setSelectedPlanId(null);
    toast.success("New meal plan created");
  };

  const handleSavePlan = () => {
    if (!currentPlan.client?.trim()) {
      toast.error("Please enter client name");
      return;
    }
    const toSave = {
      ...currentPlan,
      trainerName,
      trainerId,
      createdAt: new Date().toISOString(),
    };
    if (selectedPlanId) {
      updateMealPlan.mutate(
        { id: selectedPlanId, data: toSave },
        {
          onSuccess: (updated) => {
            setCurrentPlan(updated);
            setSelectedPlanId(updated.id ?? selectedPlanId);
          },
        }
      );
    } else {
      createMealPlan.mutate(toSave, {
        onSuccess: (created) => {
          setCurrentPlan(created);
          setSelectedPlanId(created.id ?? null);
        },
      });
    }
  };

  const handleLoadPlan = (id: string) => {
    const plan = displayedPlans.find((p) => p.id === id);
    if (plan) {
      setCurrentPlan(plan);
      setSelectedPlanId(id);
    }
  };

  const handleDeletePlan = (id: string) => {
    deleteMealPlan.mutate(id, {
      onSuccess: () => {
        if (selectedPlanId === id) {
          setCurrentPlan(defaultPlan());
          setSelectedPlanId(null);
        }
      },
    });
  };

  const handleExportPDF = () => {
    if (!currentPlan.client?.trim()) {
      toast.error("Please enter client name before exporting");
      return;
    }
    exportMealPlanToPDF({
      ...currentPlan,
      trainerName,
    });
    toast.success("PDF ready to print/download");
  };

  const handleShare = async () => {
    if (!currentPlan.client?.trim()) {
      toast.error("Please enter client name and save before sharing");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Meal Planner - ${currentPlan.client}`,
          text: `Meal plan for ${currentPlan.client}. Export as PDF and share with your client.`,
        });
        toast.success("Share dialog opened");
      } catch {
        handleExportPDF();
        toast.info("Export PDF to share with your client");
      }
    } else {
      handleExportPDF();
      toast.info("Export PDF to share with your client");
    }
  };

  const dailyTotalCalories = [
    ...(currentPlan.breakfast || []),
    ...(currentPlan.lunch || []),
    ...(currentPlan.dinner || []),
    ...(currentPlan.snacks || []),
  ].reduce(
    (sum, m) => {
      const ef = getEffectiveMacros(m);
      return sum + caloriesFromMacros(ef.protein, ef.carbs, ef.fat);
    },
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight uppercase font-montserrat">
          Meal Planner
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewPlan}>
            <FilePlus className="mr-2 h-4 w-4" />
            New
          </Button>
          <Button size="icon" variant="outline" className="h-10 w-10 min-w-10 min-h-10 shrink-0 sm:h-8 sm:w-8" onClick={handleExportPDF} title="Export PDF">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-10 w-10 min-w-10 min-h-10 shrink-0 sm:h-8 sm:w-8" onClick={handleShare} title="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-black tracking-tight uppercase font-montserrat">
                Saved Plans
              </CardTitle>
              <div className="relative w-full max-w-[140px] sm:max-w-[160px]">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  placeholder="Search client..."
                  value={savedPlanSearch}
                  onChange={(e) => setSavedPlanSearch(e.target.value)}
                  className="h-8 pl-8 text-xs placeholder:text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayedPlans.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isAdmin ? "No saved plans yet." : "No plans yet. Create one for your client."}
              </p>
            ) : displayedPlans.filter(
                (p) =>
                  !savedPlanSearch.trim() ||
                  (p.client || "")
                    .toLowerCase()
                    .includes(savedPlanSearch.trim().toLowerCase())
              ).length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching clients.</p>
            ) : (
              <div className="space-y-2">
                {displayedPlans
                  .filter(
                    (p) =>
                      !savedPlanSearch.trim() ||
                      (p.client || "")
                        .toLowerCase()
                        .includes(savedPlanSearch.trim().toLowerCase())
                  )
                  .map((plan) => (
                    <div
                      key={plan.id}
                      className={`flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer ${
                        selectedPlanId === plan.id ? "bg-muted" : ""
                      }`}
                    >
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => plan.id && handleLoadPlan(plan.id)}
                      >
                        <p className="text-sm font-medium truncate">{plan.client || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">
                          Week {plan.week || "-"} • {plan.goals || "—"}
                          {isAdmin && plan.trainerName && (
                            <span className="block mt-0.5 text-[10px] opacity-80">
                              by {plan.trainerName}
                            </span>
                          )}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => plan.id && handleLoadPlan(plan.id)}>
                            Load
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => plan.id && handleDeletePlan(plan.id)}
                            className="text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                <CardTitle className="text-lg font-black tracking-tight uppercase font-montserrat">
                  MEAL PLANNER
                </CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleSavePlan}>
                Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
              <div className="flex flex-col gap-1.5 min-w-0">
                <Label className="text-sm font-semibold uppercase">CLIENT</Label>
                <Input
                  list="meal-client-suggestions"
                  value={currentPlan.client}
                  onChange={(e) =>
                    setCurrentPlan({ ...currentPlan, client: e.target.value })
                  }
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
                  value={currentPlan.goals}
                  onValueChange={(v) =>
                    setCurrentPlan({ ...currentPlan, goals: v })
                  }
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
                <Label className="text-sm font-semibold uppercase">WEEK</Label>
                <Select
                  value={currentPlan.week}
                  onValueChange={(v) =>
                    setCurrentPlan({ ...currentPlan, week: v })
                  }
                >
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
              <div className="flex flex-col gap-1.5 min-w-0">
                <Label className="text-sm font-semibold uppercase">DAILY TARGET (cal)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 2000"
                  value={currentPlan.dailyCalorieTarget ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const num = v ? parseInt(v, 10) : NaN;
                    setCurrentPlan({
                      ...currentPlan,
                      dailyCalorieTarget: !isNaN(num) && num >= 0 ? num : undefined,
                    });
                  }}
                  className="h-9 w-full text-sm"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold">
                Total daily calories:{" "}
                <span className="text-primary font-bold tabular-nums">
                  {dailyTotalCalories} cal
                </span>
                {currentPlan.dailyCalorieTarget && (
                  <span className="text-muted-foreground ml-2">
                    (target: {currentPlan.dailyCalorieTarget} cal)
                  </span>
                )}
              </p>
            </div>

            <MealTable
              title="BREAKFAST"
              meals={currentPlan.breakfast}
              onChange={(breakfast) =>
                setCurrentPlan({ ...currentPlan, breakfast })
              }
            />
            <MealTable
              title="LUNCH"
              meals={currentPlan.lunch}
              onChange={(lunch) =>
                setCurrentPlan({ ...currentPlan, lunch })
              }
            />
            <MealTable
              title="DINNER"
              meals={currentPlan.dinner}
              onChange={(dinner) =>
                setCurrentPlan({ ...currentPlan, dinner })
              }
            />
            <MealTable
              title="SNACKS"
              meals={currentPlan.snacks}
              onChange={(snacks) =>
                setCurrentPlan({ ...currentPlan, snacks })
              }
            />

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase">
                NOTES / FEEDBACK
              </Label>
              <Textarea
                value={currentPlan.notesFeedback}
                onChange={(e) =>
                  setCurrentPlan({
                    ...currentPlan,
                    notesFeedback: e.target.value,
                  })
                }
                placeholder="Notes..."
                rows={4}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
