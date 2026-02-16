import { NextRequest, NextResponse } from "next/server";
import { generateText, getConfigError } from "@/lib/ai-provider";
import { caloriesFromMacros } from "@/features/dashboard/pages/meal-planner/utils/calorie-calculator";
import { COMMON_FOODS } from "@/features/dashboard/pages/meal-planner/data/common-foods";
import { findMatchingFood } from "@/features/dashboard/pages/meal-planner/utils/food-matcher";

interface MealEntryInput {
  foodName: string;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  quantity: number;
}

interface SuggestMealPlanRequest {
  goals?: string;
  dailyCalorieTarget?: number;
  tdee?: number;
  clientName?: string;
  notes?: string;
  allergies?: string[];
}

function parseMealResponse(text: string): {
  meal1: MealEntryInput[];
  meal2: MealEntryInput[];
  meal3: MealEntryInput[];
  meal4: MealEntryInput[];
} {
  const arr = (a: unknown) => (Array.isArray(a) ? a : []);
  const empty = { meal1: [] as MealEntryInput[], meal2: [], meal3: [], meal4: [] };

  const tryParse = (str: string) => {
    try {
      let jsonStr = str.trim();
      const codeBlock = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlock) jsonStr = codeBlock[1].trim();
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const parsed = JSON.parse(jsonMatch[0]);
      const root = parsed.meals ?? parsed.data ?? parsed;
      return {
        meal1: arr(root?.meal1 ?? root?.breakfast ?? parsed.meal1 ?? parsed.breakfast),
        meal2: arr(root?.meal2 ?? root?.lunch ?? parsed.meal2 ?? parsed.lunch),
        meal3: arr(root?.meal3 ?? root?.dinner ?? parsed.meal3 ?? parsed.dinner),
        meal4: arr(root?.meal4 ?? root?.snacks ?? parsed.meal4 ?? parsed.snacks),
      };
    } catch {
      return null;
    }
  };

  const result = tryParse(text) ?? tryParse(text.replace(/[\r\n]+/g, "\n"));
  if (result) return result;

  try {
    const parsed = JSON.parse(text.trim());
    const root = parsed.meals ?? parsed.data ?? parsed;
    return {
      meal1: arr(root?.meal1 ?? root?.breakfast ?? parsed.meal1 ?? parsed.breakfast),
      meal2: arr(root?.meal2 ?? root?.lunch ?? parsed.meal2 ?? parsed.lunch),
      meal3: arr(root?.meal3 ?? root?.dinner ?? parsed.meal3 ?? parsed.dinner),
      meal4: arr(root?.meal4 ?? root?.snacks ?? parsed.meal4 ?? parsed.snacks),
    };
  } catch {
    return empty;
  }
}

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : Math.max(0, n);
}

function toStringVal(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeMeal(m: Record<string, unknown>): MealEntryInput {
  const foodName = toStringVal(m?.foodName ?? m?.food_name ?? m?.food ?? m?.name ?? "");
  const proteinPer100 = toNum(m?.proteinPer100 ?? m?.protein_per_100 ?? 0);
  const carbsPer100 = toNum(m?.carbsPer100 ?? m?.carbs_per_100 ?? 0);
  const fatPer100 = toNum(m?.fatPer100 ?? m?.fat_per_100 ?? 0);
  let quantity = toNum(m?.quantity ?? m?.qty ?? m?.grams ?? 0);
  if (quantity === 0 && foodName) quantity = 100;
  return {
    foodName,
    proteinPer100,
    carbsPer100,
    fatPer100,
    quantity,
  };
}

export async function POST(request: NextRequest) {
  const configError = getConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const body: SuggestMealPlanRequest = await request.json();
    const { goals = "General Health", dailyCalorieTarget = 2000, tdee, clientName, notes, allergies = [] } = body;

    const target = dailyCalorieTarget || 2000;
    const tdeeContext = tdee != null ? `TDEE (base): ${tdee} cal/day. ` : "";
    const clientContext = clientName ? `Client: ${clientName}. ` : "";
    const notesInstruction = notes?.trim()
      ? `TRAINER NOTES (MUST FOLLOW): ${notes}
If notes mention dietary restrictions, allergies, conditions (e.g. diabetes, celiac), meal frequency (e.g. "prefers 3 meals", "intermittent fasting 2 meals"), or preferences, respect them strictly. Do not include any foods that contradict these notes. Use the notes to decide how many meals (1–4) the client needs.`
      : "";
    const allergyContext =
      allergies.length > 0
        ? ` CRITICAL: AVOID these allergens - do not include any of these: ${allergies.join(", ")}.`
        : "";

    const promptFoods = COMMON_FOODS.slice(0, 90);
    const foodRef = promptFoods
      .map((f) => `${f.name}: P${f.proteinPer100}/C${f.carbsPer100}/F${f.fatPer100} per 100g`)
      .join(", ");

    const systemPrompt = `You are a certified sports nutritionist with expertise aligned to ACE (American Council on Exercise), NASM (National Academy of Sports Medicine), and ACSM (American College of Sports Medicine) nutrition guidelines. You create evidence-based, client-specific meal plans.

CRITICAL RULES:
1. Use ONLY the following USDA/evidence-based foods and their EXACT per-100g values. Do not invent nutrition data.
REFERENCE FOODS (name: proteinPer100/carbsPer100/fatPer100 per 100g):
${foodRef}

2. Total daily calories MUST equal the target within ±5%. Formula: cal = (protein×4)+(carbs×4)+(fat×9); macros = per100g × quantity/100.

3. Follow NASM/ACSM principles: adequate protein (1.6-2.2g/kg for muscle gain, 1.2-1.6g/kg for weight loss), balanced macros, nutrient timing when relevant.

Return ONLY valid JSON: meal1, meal2, meal3, meal4. Each object: foodName (match names above exactly), proteinPer100, carbsPer100, fatPer100, quantity.
- For targets 2500+: use larger portions (250-400g), add almonds, avocado, olive oil, peanut butter
- For targets <1500: smaller portions, lean proteins, vegetables
- Distribute across 1-4 meals. Leave unused meals as [].`;

    const userPrompt = `Create an ACE/NASM/ACSM-aligned meal plan achieving EXACTLY ${target} cal/day.

${clientContext}${tdeeContext}Goals: ${goals}
${allergyContext}
${notesInstruction}

Use ONLY foods from the reference list with exact per-100g values. Calculate: cal = (P×4)+(C×4)+(F×9) where P/C/F = per100g×quantity/100. Target ~${Math.round(target / 4)} cal per meal if 4 meals. Verify total ≈ ${target} before returning.

Return ONLY raw JSON (no markdown, no code blocks). Example format:
{"meal1":[{"foodName":"Oats (dry)","proteinPer100":17,"carbsPer100":66,"fatPer100":7,"quantity":80}],"meal2":[],"meal3":[],"meal4":[]}`;

    const content = await generateText(systemPrompt, userPrompt, { responseFormat: "json_object" });

    const parsed = parseMealResponse(content);

    const toEntry = (m: MealEntryInput) => {
      const match = findMatchingFood(m.foodName, COMMON_FOODS);
      const p100 = match ? match.proteinPer100 : m.proteinPer100;
      const c100 = match ? match.carbsPer100 : m.carbsPer100;
      const f100 = match ? match.fatPer100 : m.fatPer100;
      const foodName = match ? match.name : m.foodName;
      const p = (p100 * m.quantity) / 100;
      const c = (c100 * m.quantity) / 100;
      const f = (f100 * m.quantity) / 100;
      return {
        foodName,
        proteinPer100: p100,
        carbsPer100: c100,
        fatPer100: f100,
        quantity: m.quantity,
        protein: Math.round(p * 10) / 10,
        carbs: Math.round(c * 10) / 10,
        fat: Math.round(f * 10) / 10,
      };
    };

    const toEntries = (arr: unknown[]) =>
      arr
        .map((m) => normalizeMeal(typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {}))
        .filter((m) => m.foodName.length > 0)
        .map(toEntry);

    let meal1Entries = toEntries(parsed.meal1);
    let meal2Entries = toEntries(parsed.meal2);
    let meal3Entries = toEntries(parsed.meal3);
    let meal4Entries = toEntries(parsed.meal4);

    const allEntries = [...meal1Entries, ...meal2Entries, ...meal3Entries, ...meal4Entries];
    let totalCal = allEntries.reduce((sum, m) => {
      const p = (m.proteinPer100 * (m.quantity || 0)) / 100;
      const c = (m.carbsPer100 * (m.quantity || 0)) / 100;
      const f = (m.fatPer100 * (m.quantity || 0)) / 100;
      return sum + caloriesFromMacros(p, c, f);
    }, 0);

    const ACCEPTABLE_TOLERANCE = 0.15;
    if (totalCal > 0 && Math.abs(totalCal - target) / target > ACCEPTABLE_TOLERANCE) {
      const scale = target / totalCal;
      const scaleQty = (entries: typeof meal1Entries) =>
        entries.map((m) => {
          const q = (m as MealEntryInput).quantity ?? 0;
          const newQty = Math.round((q * scale) / 5) * 5 || Math.round(q * scale);
          return { ...m, quantity: Math.max(10, newQty) };
        });
      meal1Entries = scaleQty(meal1Entries);
      meal2Entries = scaleQty(meal2Entries);
      meal3Entries = scaleQty(meal3Entries);
      meal4Entries = scaleQty(meal4Entries);
    }

    const emptyMeal = () => ({
      foodName: "",
      proteinPer100: 0,
      carbsPer100: 0,
      fatPer100: 0,
      quantity: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });

    const finalToEntry = (m: MealEntryInput & { protein?: number; carbs?: number; fat?: number }) => {
      const qty = m.quantity ?? 0;
      const p = (m.proteinPer100! * qty) / 100;
      const c = (m.carbsPer100! * qty) / 100;
      const f = (m.fatPer100! * qty) / 100;
      return {
        foodName: m.foodName,
        proteinPer100: m.proteinPer100,
        carbsPer100: m.carbsPer100,
        fatPer100: m.fatPer100,
        quantity: qty,
        protein: Math.round(p * 10) / 10,
        carbs: Math.round(c * 10) / 10,
        fat: Math.round(f * 10) / 10,
      };
    };

    return NextResponse.json({
      meal1: meal1Entries.length > 0 ? meal1Entries.map((m) => finalToEntry(m as MealEntryInput)) : [emptyMeal()],
      meal2: meal2Entries.length > 0 ? meal2Entries.map((m) => finalToEntry(m as MealEntryInput)) : [emptyMeal()],
      meal3: meal3Entries.length > 0 ? meal3Entries.map((m) => finalToEntry(m as MealEntryInput)) : [emptyMeal()],
      meal4: meal4Entries.length > 0 ? meal4Entries.map((m) => finalToEntry(m as MealEntryInput)) : [emptyMeal()],
    });
  } catch (error) {
    console.error("suggest-meal-plan error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate meal plan suggestion";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
