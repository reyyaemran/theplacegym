/**
 * Calorie calculation from macronutrients using Atwater factors.
 * Standard nutritional science values:
 * - Protein: 4 calories per gram
 * - Carbohydrates: 4 calories per gram
 * - Fat: 9 calories per gram
 *
 * Optionally: Net carbs = Total carbs - Fiber (fiber is largely indigestible)
 * For calorie calc we use total carbs × 4 (fiber contributes minimally).
 */

import type { MealEntry } from "../types/meal-plan";

const CAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

export function caloriesFromMacros(
  protein: number,
  carbs: number,
  fat: number
): number {
  return (
    protein * CAL_PER_GRAM.protein +
    carbs * CAL_PER_GRAM.carbs +
    fat * CAL_PER_GRAM.fat
  );
}

/** Get effective macros: from quantity × per100g when available, else manual values */
export function getEffectiveMacros(meal: MealEntry): {
  protein: number;
  carbs: number;
  fat: number;
} {
  const qty = meal.quantity ?? 0;
  const hasPer100 =
    (meal.proteinPer100 ?? 0) > 0 ||
    (meal.carbsPer100 ?? 0) > 0 ||
    (meal.fatPer100 ?? 0) > 0;

  if (qty > 0 && hasPer100) {
    return {
      protein: ((meal.proteinPer100 ?? 0) * qty) / 100,
      carbs: ((meal.carbsPer100 ?? 0) * qty) / 100,
      fat: ((meal.fatPer100 ?? 0) * qty) / 100,
    };
  }
  return {
    protein: meal.protein ?? 0,
    carbs: meal.carbs ?? 0,
    fat: meal.fat ?? 0,
  };
}

/** Mifflin-St Jeor BMR */
function bmrMifflinStJeor(weightKg: number, heightCm: number, age: number, isMale: boolean): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 0;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return base + (isMale ? 5 : -161);
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Calculate TDEE from age, gender, weight (kg), height (cm), activity level */
export function calculateTDEE(
  age: number,
  gender: "male" | "female",
  weightKg: number,
  heightCm: number,
  activity: string
): number | null {
  if (age <= 0 || weightKg <= 0 || heightCm <= 0) return null;
  const mult = ACTIVITY_MULTIPLIERS[activity?.toLowerCase()] ?? 1.2;
  const bmr = bmrMifflinStJeor(weightKg, heightCm, age, gender === "male");
  return Math.round(bmr * mult);
}

/**
 * Calculate daily calorie target from TDEE based on nutrition goals.
 * - Weight Loss: TDEE - 400 (moderate deficit)
 * - Muscle Gain: TDEE + 300 (moderate surplus)
 * - Maintenance: TDEE
 * - Performance: TDEE + 200
 * - General Health: TDEE
 */
export function getDailyTargetFromTDEE(tdee: number, goals: string): number {
  const g = goals?.toLowerCase() ?? "";
  if (g.includes("weight loss") || g.includes("weightloss")) return Math.max(1200, tdee - 400);
  if (g.includes("muscle gain") || g.includes("musclegain")) return tdee + 300;
  if (g.includes("performance")) return tdee + 200;
  return tdee; // Maintenance, General Health
}

/** Effective daily calorie target: from TDEE+goals when TDEE set, else manual dailyCalorieTarget */
export function getEffectiveDailyTarget(plan: {
  tdee?: number;
  tdeeAge?: number;
  tdeeGender?: "male" | "female";
  tdeeWeight?: number;
  tdeeHeight?: number;
  tdeeActivity?: string;
  dailyCalorieTarget?: number;
  goals: string;
}): number | undefined {
  let tdee = plan.tdee;
  if (tdee == null && plan.tdeeAge && plan.tdeeGender && plan.tdeeWeight && plan.tdeeHeight && plan.tdeeActivity) {
    tdee = calculateTDEE(
      plan.tdeeAge,
      plan.tdeeGender,
      plan.tdeeWeight,
      plan.tdeeHeight,
      plan.tdeeActivity
    ) ?? undefined;
  }
  if (tdee != null && tdee > 0) {
    return getDailyTargetFromTDEE(tdee, plan.goals);
  }
  return plan.dailyCalorieTarget;
}

/** Get computed TDEE from plan (calculator params or direct tdee) */
export function getEffectiveTDEE(plan: {
  tdee?: number;
  tdeeAge?: number;
  tdeeGender?: "male" | "female";
  tdeeWeight?: number;
  tdeeHeight?: number;
  tdeeActivity?: string;
}): number | undefined {
  const calc =
    plan.tdeeAge && plan.tdeeGender && plan.tdeeWeight && plan.tdeeHeight && plan.tdeeActivity
      ? calculateTDEE(
          plan.tdeeAge,
          plan.tdeeGender,
          plan.tdeeWeight,
          plan.tdeeHeight,
          plan.tdeeActivity
        )
      : null;
  return calc ?? (plan.tdee != null && plan.tdee > 0 ? plan.tdee : undefined);
}

export function macroPercentages(
  protein: number,
  carbs: number,
  fat: number
): { protein: number; carbs: number; fat: number } {
  const total = caloriesFromMacros(protein, carbs, fat);
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round((protein * CAL_PER_GRAM.protein / total) * 100),
    carbs: Math.round((carbs * CAL_PER_GRAM.carbs / total) * 100),
    fat: Math.round((fat * CAL_PER_GRAM.fat / total) * 100),
  };
}
