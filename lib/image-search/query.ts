import { mapDishName } from "@/lib/dish-mapping";

export function buildEnglishImageSearchQuery(rawMealName: string): string {
  const mapped = mapDishName(rawMealName);
  return `${mapped.canonicalEn} plated food photography`.trim();
}
