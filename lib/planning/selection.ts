export type CandidateMeal = {
  id: string;
  name: string;
  thumbsUpCount?: number;
  thumbsDownCount?: number;
};

export type SelectionWarning =
  | "included_recent_meal"
  | "relaxed_favorite_streak"
  | "repeated_meal_due_to_small_library";

function shuffle<T>(items: T[], randomFn: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function voteWeight(meal: CandidateMeal): number {
  const up = meal.thumbsUpCount ?? 0;
  const down = meal.thumbsDownCount ?? 0;
  const delta = up - down;

  if (delta > 0) {
    return 2;
  }
  if (delta < 0) {
    return 0.5;
  }
  return 1;
}

function weightedOrder(items: CandidateMeal[], randomFn: () => number): CandidateMeal[] {
  const pool = [...items];
  const ordered: CandidateMeal[] = [];

  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, meal) => sum + voteWeight(meal), 0);
    if (totalWeight <= 0) {
      ordered.push(...shuffle(pool, randomFn));
      break;
    }

    const target = randomFn() * totalWeight;
    let cumulative = 0;
    let pickedIndex = 0;

    for (let i = 0; i < pool.length; i++) {
      cumulative += voteWeight(pool[i]);
      if (target <= cumulative) {
        pickedIndex = i;
        break;
      }
    }

    const [picked] = pool.splice(pickedIndex, 1);
    ordered.push(picked);
  }

  return ordered;
}

export function selectMeals(
  allMeals: CandidateMeal[],
  count: number,
  excludedMealIds: Set<string>,
  randomFn: () => number = Math.random
): CandidateMeal[] {
  if (allMeals.length === 0 || count <= 0) {
    return [];
  }

  const nonRecentMeals = allMeals.filter((meal) => !excludedMealIds.has(meal.id));
  const availableMeals = nonRecentMeals.length > 0 ? nonRecentMeals : allMeals;

  if (availableMeals.length < count) {
    const selected: CandidateMeal[] = [];
    for (let i = 0; i < count; i++) {
      selected.push(availableMeals[i % availableMeals.length]);
    }
    return selected;
  }

  return shuffle(availableMeals, randomFn).slice(0, count);
}

export function selectMealsWithConstraints(
  allMeals: CandidateMeal[],
  count: number,
  recentMealIds: Set<string>,
  blockedFavoriteIds: Set<string>,
  randomFn: () => number = Math.random
): { selectedMeals: CandidateMeal[]; warnings: SelectionWarning[] } {
  if (allMeals.length === 0 || count <= 0) {
    return { selectedMeals: [], warnings: [] };
  }

  const strict = allMeals.filter(
    (meal) => !recentMealIds.has(meal.id) && !blockedFavoriteIds.has(meal.id)
  );
  const recentFallback = allMeals.filter(
    (meal) => recentMealIds.has(meal.id) && !blockedFavoriteIds.has(meal.id)
  );
  const favoriteFallback = allMeals.filter((meal) => blockedFavoriteIds.has(meal.id));

  const selected: CandidateMeal[] = [];
  const selectedIds = new Set<string>();
  const warnings = new Set<SelectionWarning>();

  for (const bucket of [
    weightedOrder(strict, randomFn),
    weightedOrder(recentFallback, randomFn),
    weightedOrder(favoriteFallback, randomFn),
  ]) {
    for (const meal of bucket) {
      if (selected.length >= count) {
        break;
      }
      if (selectedIds.has(meal.id)) {
        continue;
      }
      selected.push(meal);
      selectedIds.add(meal.id);

      if (recentMealIds.has(meal.id)) {
        warnings.add("included_recent_meal");
      }
      if (blockedFavoriteIds.has(meal.id)) {
        warnings.add("relaxed_favorite_streak");
      }
    }
  }

  if (selected.length < count) {
    warnings.add("repeated_meal_due_to_small_library");
    const baseCycle = selected.length > 0 ? [...selected] : [...allMeals];
    for (let i = selected.length; i < count; i++) {
      selected.push(baseCycle[i % baseCycle.length]);
    }
  }

  return { selectedMeals: selected, warnings: Array.from(warnings) };
}
