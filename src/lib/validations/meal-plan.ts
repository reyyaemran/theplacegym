import { z } from "zod";

const mealEntrySchema = z.object({
  id: z.string().optional(),
  foodName: z.string().optional(),
  proteinPer100: z.number().optional(),
  carbsPer100: z.number().optional(),
  fatPer100: z.number().optional(),
  quantity: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),
});

export const mealPlanSchema = z.object({
  client: z.string().min(1, "Client name is required"),
  goals: z.string().optional(),
  tdee: z.number().optional(),
  tdeeAge: z.number().optional(),
  tdeeGender: z.enum(["male", "female"]).optional(),
  tdeeWeight: z.number().optional(),
  tdeeHeight: z.number().optional(),
  tdeeActivity: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).optional(),
  dailyCalorieTarget: z.number().optional(),
  week: z.string().optional(),
  breakfast: z.array(mealEntrySchema).optional(),
  lunch: z.array(mealEntrySchema).optional(),
  dinner: z.array(mealEntrySchema).optional(),
  snacks: z.array(mealEntrySchema).optional(),
  notesFeedback: z.string().optional(),
  trainerName: z.string().optional(),
  trainerId: z.string().optional(),
  createdAt: z.string().optional(),
  id: z.string().optional(),
});
