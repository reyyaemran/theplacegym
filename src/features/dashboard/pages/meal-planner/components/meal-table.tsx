"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealEntry } from "../types/meal-plan";
import { caloriesFromMacros, getEffectiveMacros } from "../utils/calorie-calculator";
import { COMMON_FOODS } from "../data/common-foods";
import { findMatchingFood } from "../utils/food-matcher";
import { Plus, Trash2 } from "lucide-react";

interface MealTableProps {
  title: string;
  meals: MealEntry[];
  onChange: (meals: MealEntry[]) => void;
}

const emptyMeal = (): MealEntry => ({
  id: `meal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  foodName: "",
  protein: 0,
  carbs: 0,
  fat: 0,
});

function parseNum(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.max(0, n);
}

const getDatalistId = (title: string) =>
  `meal-foods-${title.replace(/\s/g, "-")}`;

export function MealTable({ title, meals, onChange }: MealTableProps) {
  const addRow = () => {
    onChange([...meals, emptyMeal()]);
  };

  const removeRow = (id: string) => {
    onChange(meals.filter((m) => m.id !== id));
  };

  const updateMeal = (
    id: string,
    field: keyof MealEntry,
    value: string | number | undefined
  ) => {
    onChange(
      meals.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleFoodSelect = (id: string, foodName: string) => {
    const food = findMatchingFood(foodName, COMMON_FOODS);
    if (food) {
      onChange(
        meals.map((m) =>
          m.id === id
            ? {
                ...m,
                foodName: food.name,
                proteinPer100: food.proteinPer100,
                carbsPer100: food.carbsPer100,
                fatPer100: food.fatPer100,
              }
            : m
        )
      );
    }
  };

  const totals = meals.reduce(
    (acc, m) => {
      const ef = getEffectiveMacros(m);
      return {
        protein: acc.protein + ef.protein,
        carbs: acc.carbs + ef.carbs,
        fat: acc.fat + ef.fat,
      };
    },
    { protein: 0, carbs: 0, fat: 0 }
  );
  const totalCalories = caloriesFromMacros(
    totals.protein,
    totals.carbs,
    totals.fat
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      <datalist id={getDatalistId(title)}>
        {COMMON_FOODS.map((f) => (
          <option key={f.name} value={f.name} />
        ))}
      </datalist>
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/80 dark:bg-muted">
              <th className="p-2 text-left font-semibold text-xs uppercase min-w-[140px]">
                FOOD / MEAL
              </th>
              <th className="p-2 text-left font-semibold text-xs uppercase w-20">
                Qty (g)
              </th>
              <th className="p-2 text-left font-semibold text-xs uppercase w-14">
                Protein
              </th>
              <th className="p-2 text-left font-semibold text-xs uppercase w-14">
                Carbs
              </th>
              <th className="p-2 text-left font-semibold text-xs uppercase w-14">
                Fat
              </th>
              <th className="p-2 text-left font-semibold text-xs uppercase w-20">
                Calories
              </th>
              <th className="p-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {meals.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-4 text-center text-muted-foreground text-sm"
                >
                  No meals. Click &quot;Add&quot; to add one.
                </td>
              </tr>
            ) : (
              meals.map((meal) => {
                const ef = getEffectiveMacros(meal);
                const cal = caloriesFromMacros(ef.protein, ef.carbs, ef.fat);
                const useCalculated =
                  (meal.quantity ?? 0) > 0 &&
                  ((meal.proteinPer100 ?? 0) > 0 ||
                    (meal.carbsPer100 ?? 0) > 0 ||
                    (meal.fatPer100 ?? 0) > 0);

                return (
                  <tr
                    key={meal.id}
                    className="border-t border-border hover:bg-muted/30 dark:hover:bg-muted/50"
                  >
                    <td className="p-2">
                      <Input
                        list={getDatalistId(title)}
                        value={meal.foodName}
                        onChange={(e) =>
                          updateMeal(meal.id, "foodName", e.target.value)
                        }
                        onBlur={(e) =>
                          handleFoodSelect(meal.id, e.target.value)
                        }
                        placeholder="Select or type food"
                        className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={meal.quantity ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateMeal(
                            meal.id,
                            "quantity",
                            v === "" ? undefined : parseNum(v)
                          );
                        }}
                        placeholder="g"
                        className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50 w-16"
                      />
                    </td>
                    <td className="p-2">
                      {useCalculated ? (
                        <span className="text-muted-foreground font-medium tabular-nums">
                          {ef.protein > 0 ? ef.protein.toFixed(1) : "—"}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={meal.protein || ""}
                          onChange={(e) =>
                            updateMeal(meal.id, "protein", parseNum(e.target.value))
                          }
                          placeholder="0"
                          className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50 w-14"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {useCalculated ? (
                        <span className="text-muted-foreground font-medium tabular-nums">
                          {ef.carbs > 0 ? ef.carbs.toFixed(1) : "—"}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={meal.carbs || ""}
                          onChange={(e) =>
                            updateMeal(meal.id, "carbs", parseNum(e.target.value))
                          }
                          placeholder="0"
                          className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50 w-14"
                        />
                      )}
                    </td>
                    <td className="p-2">
                      {useCalculated ? (
                        <span className="text-muted-foreground font-medium tabular-nums">
                          {ef.fat > 0 ? ef.fat.toFixed(1) : "—"}
                        </span>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={meal.fat || ""}
                          onChange={(e) =>
                            updateMeal(meal.id, "fat", parseNum(e.target.value))
                          }
                          placeholder="0"
                          className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1 focus-visible:ring-ring/50 w-14"
                        />
                      )}
                    </td>
                    <td className="p-2 text-muted-foreground font-medium tabular-nums">
                      {cal > 0 ? Math.round(cal) : "—"}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(meal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {meals.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                <td className="p-2">Total</td>
                <td className="p-2" />
                <td className="p-2 tabular-nums">{totals.protein.toFixed(1)}g</td>
                <td className="p-2 tabular-nums">{totals.carbs.toFixed(1)}g</td>
                <td className="p-2 tabular-nums">{totals.fat.toFixed(1)}g</td>
                <td className="p-2 tabular-nums text-primary">
                  {Math.round(totalCalories)} cal
                </td>
                <td className="p-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
