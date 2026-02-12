import { listCommonMeals } from "@/lib/common-meals";

type DemoPlan = {
  id: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
};

function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickMealsFromNames(seed: string, names: string[], count: number): string[] {
  const source = [...names];
  let state = hashSeed(seed);

  for (let i = source.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [source[i], source[j]] = [source[j], source[i]];
  }

  return source.slice(0, count);
}

export async function getDemoWeeklyPlan(weekStart: string): Promise<DemoPlan> {
  const commonMeals = await listCommonMeals();
  const names = commonMeals.map((meal) => meal.name);
  const fallback = ["Tacos", "Lasagne", "Pasta", "Hamburgare", "Pizza"];
  const sourceNames =
    names.length >= 5 ? names : Array.from(new Set([...names, ...fallback]));
  const meals = pickMealsFromNames(weekStart, sourceNames, 5);

  return {
    id: `demo-${weekStart}`,
    monday: meals[0],
    tuesday: meals[1],
    wednesday: meals[2],
    thursday: meals[3],
    friday: meals[4],
  };
}
