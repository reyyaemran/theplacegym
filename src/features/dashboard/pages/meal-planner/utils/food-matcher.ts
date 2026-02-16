/**
 * Robust food name matching for AI responses and manual entry.
 * Used by API and frontend to resolve food names to COMMON_FOODS.
 */
import type { FoodReference } from "../data/common-foods";

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "") // remove (cooked), (fried), etc.
    .replace(/\s+/g, " ")
    .trim();
}

function getTokens(s: string): string[] {
  return normalizeForMatch(s).split(/\s+/).filter(Boolean);
}

/**
 * Find best matching food from the reference list.
 * Order: exact → normalized exact → contains → token overlap.
 */
export function findMatchingFood(
  name: string,
  foods: FoodReference[]
): FoodReference | null {
  const n = (name || "").trim();
  if (!n) return null;

  const nNorm = normalizeForMatch(n);
  const nTokens = getTokens(n);

  // 1. Exact match (case insensitive)
  const exact = foods.find((f) => f.name.toLowerCase() === n.toLowerCase());
  if (exact) return exact;

  // 2. Normalized exact (ignore parentheticals)
  const normExact = foods.find((f) => normalizeForMatch(f.name) === nNorm);
  if (normExact) return normExact;

  // 3. Reference contains input (e.g. input "Rice" → "White rice (cooked)")
  const refContainsInput = foods.find((f) => {
    const fn = normalizeForMatch(f.name);
    return fn.includes(nNorm) || nNorm.includes(fn);
  });
  if (refContainsInput) return refContainsInput;

  // 4. Token overlap: input tokens must all appear in ref (e.g. "Chicken Breast" → "Chicken breast (cooked)")
  const tokenMatch = foods.find((f) => {
    const fTokens = getTokens(f.name);
    return nTokens.every((t) => fTokens.some((ft) => ft.includes(t) || t.includes(ft)));
  });
  if (tokenMatch) return tokenMatch;

  // 5. First significant token match (e.g. "Rice" → first rice item)
  const firstToken = nTokens[0];
  if (firstToken && firstToken.length >= 2) {
    const firstMatch = foods.find((f) => {
      const fn = normalizeForMatch(f.name);
      return fn.includes(firstToken) || fn.startsWith(firstToken);
    });
    if (firstMatch) return firstMatch;
  }

  return null;
}
