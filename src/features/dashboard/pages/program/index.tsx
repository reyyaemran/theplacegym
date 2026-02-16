"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutPlannerForm } from "./components/workout-planner-form";
import { MealPlannerForm } from "./components/meal-planner-form";
import { exportWorkoutProgramToPDF } from "./utils/export-workout-program";
import { exportMealPlanToPDF } from "@/features/dashboard/pages/meal-planner/utils/export-meal-plan";
import {
  getEffectiveDailyTarget,
  getEffectiveTDEE,
  getEffectiveMacros,
} from "@/features/dashboard/pages/meal-planner/utils/calorie-calculator";
import { findMatchingFood } from "@/features/dashboard/pages/meal-planner/utils/food-matcher";
import { COMMON_FOODS } from "@/features/dashboard/pages/meal-planner/data/common-foods";
import { WorkoutProgram, WorkoutExercise } from "./types/workout-program";
import { MealPlan, MealEntry } from "@/features/dashboard/pages/meal-planner/types/meal-plan";
import { useAuth } from "@/hooks/use-auth";
import { useMembers } from "@/hooks/use-members";
import {
  usePrograms,
  useCreateProgram,
  useUpdateProgram,
  useDeleteProgram,
} from "@/hooks/use-programs";
import {
  useMealPlans,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
} from "@/hooks/use-meal-plans";
import {
  Dumbbell,
  UtensilsCrossed,
  Download,
  Share2,
  FilePlus,
  MoreVertical,
  Search,
} from "lucide-react";
import { toast } from "sonner";

const emptyExercise = (): WorkoutExercise => ({
  id: `ex-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  exercise: "",
  resistance: "",
  setRepDuration: "",
  tempo: "",
  load: "",
  notes: "",
});

const defaultProgram = (): WorkoutProgram => ({
  client: "",
  level: "",
  goals: "",
  week: "",
  bodyParts: {},
  warmUp: [emptyExercise()],
  exercises: [emptyExercise()],
  cooldown: [emptyExercise()],
  notesFeedback: "",
});

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
  tdee: undefined,
  tdeeAge: undefined,
  tdeeGender: undefined,
  tdeeWeight: undefined,
  tdeeHeight: undefined,
  tdeeActivity: undefined,
  dailyCalorieTarget: undefined,
  breakfast: [emptyMeal()],
  lunch: [emptyMeal()],
  dinner: [emptyMeal()],
  snacks: [emptyMeal()],
  notesFeedback: "",
});

type TabValue = "workout" | "meal";

type SavedItem =
  | { type: "workout"; id: string; client: string; subtitle: string; trainerName?: string }
  | { type: "meal"; id: string; client: string; subtitle: string; trainerName?: string };

export function ProgramPage() {
  const searchParams = useSearchParams();
  const { staff, isAdmin } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: programs = [] } = usePrograms();
  const { data: plans = [] } = useMealPlans();
  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();
  const createMealPlan = useCreateMealPlan();
  const updateMealPlan = useUpdateMealPlan();
  const deleteMealPlan = useDeleteMealPlan();

  const trainerName = (staff as any)?.name || "Trainer";
  const trainerId = (staff as any)?._id ?? (staff as any)?.id ?? "";

  const tabParam = searchParams.get("tab");
  const initialTab: TabValue = tabParam === "meal" ? "meal" : "workout";
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  useEffect(() => {
    if (tabParam === "meal") setActiveTab("meal");
  }, [tabParam]);

  const [currentProgram, setCurrentProgram] = useState<WorkoutProgram>(defaultProgram());
  const [currentPlan, setCurrentPlan] = useState<MealPlan>(defaultPlan());

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [isSuggestingWorkout, setIsSuggestingWorkout] = useState(false);
  const [isSuggestingMeal, setIsSuggestingMeal] = useState(false);

  const [savedSearch, setSavedSearch] = useState("");

  const migratedPrograms = useMemo(() => {
    return programs.map((p) => {
      const old = p as { bodyPart?: string };
      if (old.bodyPart && !p.bodyParts)
        return { ...p, bodyParts: { [old.bodyPart]: true } } as WorkoutProgram;
      return p;
    });
  }, [programs]);

  const displayedPrograms = useMemo(() => {
    if (isAdmin) return migratedPrograms;
    return migratedPrograms.filter(
      (p) => p.trainerId === trainerId || (!p.trainerId && p.trainerName === trainerName)
    );
  }, [migratedPrograms, isAdmin, trainerId, trainerName]);

  const displayedPlans = useMemo(() => {
    if (isAdmin) return plans;
    return plans.filter(
      (p) => p.trainerId === trainerId || (!p.trainerId && p.trainerName === trainerName)
    );
  }, [plans, isAdmin, trainerId, trainerName]);

  const savedItems: SavedItem[] = useMemo(() => {
    const items: SavedItem[] = [
      ...displayedPrograms.map((p) => ({
        type: "workout" as const,
        id: p.id!,
        client: p.client || "Unnamed",
        subtitle:
          `Week ${p.week || "-"} • ` +
          (p.bodyParts
            ? Object.entries(p.bodyParts)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(", ") || "—"
            : (p as { bodyPart?: string }).bodyPart || "—"),
        trainerName: p.trainerName,
      })),
      ...displayedPlans.map((p) => {
        const tdee = getEffectiveTDEE(p);
        return {
          type: "meal" as const,
          id: p.id!,
          client: p.client || "Unnamed",
          subtitle:
            tdee != null ? `TDEE ${tdee} cal • ${p.goals || "—"}` : `${p.goals || "—"}`,
          trainerName: p.trainerName,
        };
      }),
    ];
    return items.sort((a, b) => (a.client || "").localeCompare(b.client || ""));
  }, [displayedPrograms, displayedPlans]);

  const filteredSavedItems = useMemo(
    () =>
      savedItems.filter(
        (item) =>
          !savedSearch.trim() ||
          (item.client || "").toLowerCase().includes(savedSearch.trim().toLowerCase())
      ),
    [savedItems, savedSearch]
  );

  const handleNew = () => {
    if (activeTab === "workout") {
      setCurrentProgram(defaultProgram());
      setSelectedWorkoutId(null);
      toast.success("New program created");
    } else {
      setCurrentPlan(defaultPlan());
      setSelectedPlanId(null);
      toast.success("New meal plan created");
    }
  };

  const handleSave = () => {
    if (activeTab === "workout") {
      if (!currentProgram.client?.trim()) {
        toast.error("Please enter client name");
        return;
      }
      const toSave = {
        ...currentProgram,
        trainerName,
        trainerId,
        createdAt: new Date().toISOString(),
      };
      if (selectedWorkoutId) {
        updateProgram.mutate(
          { id: selectedWorkoutId, data: toSave },
          {
            onSuccess: (updated) => {
              setCurrentProgram(updated);
              setSelectedWorkoutId(updated.id ?? selectedWorkoutId);
            },
          }
        );
      } else {
        createProgram.mutate(toSave, {
          onSuccess: (created) => {
            setCurrentProgram(created);
            setSelectedWorkoutId(created.id ?? null);
          },
        });
      }
    } else {
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
    }
  };

  const handleSuggestWorkout = async () => {
    setIsSuggestingWorkout(true);
    try {
      const bodyParts = currentProgram.bodyParts
        ? Object.entries(currentProgram.bodyParts)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : [];
      const res = await fetch("/api/ai/suggest-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: currentProgram.level || "Beginner",
          goals: currentProgram.goals || "General Fitness",
          week: currentProgram.week || "1",
          bodyParts,
          clientName: currentProgram.client?.trim() || undefined,
          notes: currentProgram.notesFeedback?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get suggestion");
      const addIds = (arr: { exercise: string; resistance: string; setRepDuration: string; tempo: string; load: string; notes: string }[]) =>
        arr.map((e) => ({
          ...e,
          id: `ex-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }));
      setCurrentProgram({
        ...currentProgram,
        warmUp: addIds(data.warmUp || []),
        exercises: addIds(data.exercises || []),
        cooldown: addIds(data.cooldown || []),
      });
      toast.success("AI workout suggestion applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get workout suggestion");
    } finally {
      setIsSuggestingWorkout(false);
    }
  };

  const handleSuggestMeal = async () => {
    setIsSuggestingMeal(true);
    try {
      const clientName = currentPlan.client?.trim();
      const member = clientName ? members.find((m) => m.fullName?.toLowerCase() === clientName.toLowerCase()) : null;
      const allergies = (member as { allergies?: string[] })?.allergies ?? [];
      const effectiveTarget = getEffectiveDailyTarget(currentPlan) ?? 2000;
      const tdee = getEffectiveTDEE(currentPlan);
      const res = await fetch("/api/ai/suggest-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: currentPlan.goals || "General Health",
          dailyCalorieTarget: effectiveTarget,
          tdee: tdee ?? undefined,
          clientName: clientName || undefined,
          notes: currentPlan.notesFeedback?.trim() || undefined,
          allergies: Array.isArray(allergies) ? allergies : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get suggestion");
      const toMealEntries = (arr: unknown[]): MealEntry[] => {
        const items = Array.isArray(arr) ? arr : [];
        if (items.length === 0) return [emptyMeal()];
        return items.map((m, i) => {
          const raw = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
          let qty = Math.max(0, Number(raw.quantity ?? raw.qty ?? raw.grams ?? 0));
          let foodName = String(raw.foodName ?? raw.food_name ?? raw.food ?? raw.name ?? "").trim();
          if (foodName && qty === 0) qty = 100;

          let proteinPer100 = Math.max(0, Number(raw.proteinPer100 ?? raw.protein_per_100 ?? 0));
          let carbsPer100 = Math.max(0, Number(raw.carbsPer100 ?? raw.carbs_per_100 ?? 0));
          let fatPer100 = Math.max(0, Number(raw.fatPer100 ?? raw.fat_per_100 ?? 0));

          if (foodName && proteinPer100 === 0 && carbsPer100 === 0 && fatPer100 === 0) {
            const match = findMatchingFood(foodName, COMMON_FOODS);
            if (match) {
              foodName = match.name;
              proteinPer100 = match.proteinPer100;
              carbsPer100 = match.carbsPer100;
              fatPer100 = match.fatPer100;
            }
          }

          const entry: MealEntry = {
            id: typeof raw.id === "string" ? raw.id : `meal-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
            foodName,
            proteinPer100,
            carbsPer100,
            fatPer100,
            quantity: qty,
            protein: Number(raw.protein ?? 0),
            carbs: Number(raw.carbs ?? 0),
            fat: Number(raw.fat ?? 0),
          };
          const ef = getEffectiveMacros(entry);
          entry.protein = ef.protein;
          entry.carbs = ef.carbs;
          entry.fat = ef.fat;
          return entry;
        });
      };
      setCurrentPlan((prev) => ({
        ...prev,
        breakfast: toMealEntries(data.meal1 ?? []),
        lunch: toMealEntries(data.meal2 ?? []),
        dinner: toMealEntries(data.meal3 ?? []),
        snacks: toMealEntries(data.meal4 ?? []),
      }));
      setActiveTab("meal");
      toast.success("AI meal plan suggestion applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get meal plan suggestion");
    } finally {
      setIsSuggestingMeal(false);
    }
  };

  const handleLoadItem = (item: SavedItem) => {
    if (item.type === "workout") {
      const prog = migratedPrograms.find((p) => p.id === item.id);
      if (prog) {
        const migrated =
          "bodyPart" in prog && prog.bodyPart && !prog.bodyParts
            ? { ...prog, bodyParts: { [String(prog.bodyPart)]: true } }
            : prog;
        setCurrentProgram(migrated as WorkoutProgram);
        setSelectedWorkoutId(item.id);
        setActiveTab("workout");
      }
    } else {
      const plan = plans.find((p) => p.id === item.id);
      if (plan) {
        setCurrentPlan(plan);
        setSelectedPlanId(item.id);
        setActiveTab("meal");
      }
    }
  };

  const handleDeleteItem = (item: SavedItem) => {
    if (item.type === "workout") {
      deleteProgram.mutate(item.id, {
        onSuccess: () => {
          if (selectedWorkoutId === item.id) {
            setCurrentProgram(defaultProgram());
            setSelectedWorkoutId(null);
          }
        },
      });
    } else {
      deleteMealPlan.mutate(item.id, {
        onSuccess: () => {
          if (selectedPlanId === item.id) {
            setCurrentPlan(defaultPlan());
            setSelectedPlanId(null);
          }
        },
      });
    }
  };

  const handleExportPDF = () => {
    if (activeTab === "workout") {
      if (!currentProgram.client?.trim()) {
        toast.error("Please enter client name before exporting");
        return;
      }
      exportWorkoutProgramToPDF({ ...currentProgram, trainerName });
    } else {
      if (!currentPlan.client?.trim()) {
        toast.error("Please enter client name before exporting");
        return;
      }
      exportMealPlanToPDF({ ...currentPlan, trainerName });
    }
    toast.success("PDF ready to print/download");
  };

  const handleShare = async () => {
    if (activeTab === "workout") {
      if (!currentProgram.client?.trim()) {
        toast.error("Please enter client name and save before sharing");
        return;
      }
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Workout Planner - ${currentProgram.client}`,
            text: `Workout program for ${currentProgram.client}. Export as PDF and share with your client.`,
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
    } else {
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
    }
  };

  const isSelected = (item: SavedItem) =>
    item.type === "workout"
      ? selectedWorkoutId === item.id
      : selectedPlanId === item.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black italic tracking-tight uppercase font-montserrat">
          Program
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNew}>
            <FilePlus className="mr-2 h-4 w-4" />
            New
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={handleExportPDF}
            title="Export PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={handleShare}
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-black italic tracking-tight uppercase font-montserrat">
                Saved Programs & Plans
              </CardTitle>
              <div className="relative w-full max-w-[140px] sm:max-w-[160px]">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                  placeholder="Search client..."
                  value={savedSearch}
                  onChange={(e) => setSavedSearch(e.target.value)}
                  className="h-8 pl-8 text-xs placeholder:text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {savedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isAdmin
                  ? "No saved programs or plans yet."
                  : "No programs or plans yet. Create one for your client."}
              </p>
            ) : filteredSavedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matching clients.</p>
            ) : (
              <div className="space-y-2">
                {filteredSavedItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className={`flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer ${
                      isSelected(item) ? "bg-muted" : ""
                    }`}
                  >
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => handleLoadItem(item)}
                    >
                      <p className="text-sm font-medium truncate">{item.client}</p>
                      <p className="text-xs text-muted-foreground">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 ${
                            item.type === "workout"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {item.type === "workout" ? "Workout" : "Meal"}
                        </span>
                        {item.subtitle}
                        {isAdmin && item.trainerName && (
                          <span className="block mt-0.5 text-[10px] opacity-80">
                            by {item.trainerName}
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
                        <DropdownMenuItem onClick={() => handleLoadItem(item)}>
                          Load
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteItem(item)}
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

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger value="workout" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                Workout
              </TabsTrigger>
              <TabsTrigger value="meal" className="gap-2">
                <UtensilsCrossed className="h-4 w-4" />
                Meal Plan
              </TabsTrigger>
            </TabsList>
            <TabsContent value="workout">
              <WorkoutPlannerForm
                program={currentProgram}
                onChange={setCurrentProgram}
                onSave={handleSave}
                onSuggest={handleSuggestWorkout}
                isSuggesting={isSuggestingWorkout}
                members={members}
              />
            </TabsContent>
            <TabsContent value="meal">
              <MealPlannerForm
                plan={currentPlan}
                onChange={setCurrentPlan}
                onSave={handleSave}
                onSuggest={handleSuggestMeal}
                isSuggesting={isSuggestingMeal}
                members={members}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
