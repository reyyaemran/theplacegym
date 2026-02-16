/**
 * Meal plan types for nutrition planning.
 * Calories are calculated using Atwater factors:
 * - Protein: 4 cal/g
 * - Carbohydrates: 4 cal/g
 * - Fat: 9 cal/g
 */

export interface MealEntry {
  id: string;
  foodName: string;
  // Per 100g reference (for auto-calculation from quantity)
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  quantity?: number; // grams consumed
  // Calculated or manually entered macros (grams)
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  // calories computed: (protein * 4) + (carbs * 4) + (fat * 9)
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";

export type TdeeGender = "male" | "female";
export type TdeeActivity =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export interface MealPlan {
  id?: string;
  client: string;
  goals: string;
  tdee?: number; // From calculator or manual override
  tdeeAge?: number;
  tdeeGender?: TdeeGender;
  tdeeWeight?: number; // kg
  tdeeHeight?: number; // cm
  tdeeActivity?: TdeeActivity;
  dailyCalorieTarget?: number;
  week?: string; // Deprecated
  breakfast: MealEntry[];
  lunch: MealEntry[];
  dinner: MealEntry[];
  snacks: MealEntry[];
  notesFeedback: string;
  trainerName?: string;
  trainerId?: string;
  createdAt?: string;
}
