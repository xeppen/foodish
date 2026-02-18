export type CandidateMeal = {
  id: string;
  name: string;
  thumbsUpCount?: number;
  thumbsDownCount?: number;
  defaultServings?: number | null;
};

export type PlannerDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export type PreferredDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type AdaptiveDaySignal = {
  shownCount: number;
  swappedAwayCount: number;
  selectedCount: number;
};

export type DayAwareCandidateMeal = CandidateMeal & {
  preferredDays?: PreferredDay[];
};

export type SelectionWarning =
  | "included_recent_meal"
  | "relaxed_favorite_streak"
  | "repeated_meal_due_to_small_library";

export type SmartRotationHistory = {
  lastWeekMealIds: Set<string>;
  twoWeeksAgoMealIds: Set<string>;
  occurrencesLast4Weeks: Map<string, number>;
  previousWeekMealIds?: Set<string>;
};

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

const MIN_ROTATION_WEIGHT = 0.01;

function rotationWeight(mealId: string, history: SmartRotationHistory): number {
  const recencyWeight = history.lastWeekMealIds.has(mealId)
    ? 0.2
    : history.twoWeeksAgoMealIds.has(mealId)
      ? 0.5
      : 1;

  const occurrences = history.occurrencesLast4Weeks.get(mealId) ?? 0;
  const frequencyMultiplier = Math.max(MIN_ROTATION_WEIGHT, 1 - occurrences * 0.1);
  return Math.max(MIN_ROTATION_WEIGHT, recencyWeight * frequencyMultiplier);
}

function weightedPickUnique(
  allMeals: CandidateMeal[],
  count: number,
  getWeight: (meal: CandidateMeal) => number,
  randomFn: () => number
): CandidateMeal[] {
  const pool = [...allMeals];
  const selected: CandidateMeal[] = [];

  while (pool.length > 0 && selected.length < count) {
    const weightedPool = pool.map((meal) => ({ meal, weight: Math.max(MIN_ROTATION_WEIGHT, getWeight(meal)) }));
    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);

    let pickedIndex = 0;
    if (totalWeight <= 0) {
      pickedIndex = Math.floor(randomFn() * pool.length);
    } else {
      const target = randomFn() * totalWeight;
      let cumulative = 0;
      for (let i = 0; i < weightedPool.length; i++) {
        cumulative += weightedPool[i].weight;
        if (target <= cumulative) {
          pickedIndex = i;
          break;
        }
      }
    }

    const [picked] = pool.splice(pickedIndex, 1);
    selected.push(picked);
  }

  return selected;
}

function haveSameMealSet(meals: CandidateMeal[], expectedIds: Set<string>): boolean {
  if (meals.length !== expectedIds.size) {
    return false;
  }
  return meals.every((meal) => expectedIds.has(meal.id));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function voteScore(meal: CandidateMeal): number {
  const delta = (meal.thumbsUpCount ?? 0) - (meal.thumbsDownCount ?? 0);
  if (delta === 0) {
    return 0;
  }
  return clamp(delta * 0.2, -0.5, 0.8);
}

function adaptiveScore(signal: AdaptiveDaySignal | undefined): number {
  if (!signal) {
    return 0;
  }

  const shown = signal.shownCount;
  const keptApprox = Math.max(0, shown - signal.swappedAwayCount);
  const selected = signal.selectedCount;
  const quality = (keptApprox + selected + 1) / (shown + selected + 2);
  return clamp((quality - 0.5) * 1.6, -0.8, 0.8);
}

function explorationScore(signal: AdaptiveDaySignal | undefined): number {
  if (!signal || signal.shownCount < 2) {
    return 0.3;
  }
  return 0;
}

function dayToPreferred(day: PlannerDay): PreferredDay {
  switch (day) {
    case "monday":
      return "MONDAY";
    case "tuesday":
      return "TUESDAY";
    case "wednesday":
      return "WEDNESDAY";
    case "thursday":
      return "THURSDAY";
    case "friday":
      return "FRIDAY";
  }
}

function dayScore(meal: DayAwareCandidateMeal, day: PlannerDay, signal: AdaptiveDaySignal | undefined): number {
  const preferred = meal.preferredDays?.includes(dayToPreferred(day)) ? 1.2 : 0;
  return voteScore(meal) + preferred + adaptiveScore(signal) + explorationScore(signal);
}

function weightedPickByDay(
  meals: DayAwareCandidateMeal[],
  day: PlannerDay,
  recentMealIds: Set<string>,
  blockedFavoriteIds: Set<string>,
  signals: Map<string, AdaptiveDaySignal>,
  randomFn: () => number,
  warnings: Set<SelectionWarning>
): DayAwareCandidateMeal | null {
  if (meals.length === 0) {
    return null;
  }

  const strict = meals.filter((meal) => !recentMealIds.has(meal.id) && !blockedFavoriteIds.has(meal.id));
  const recentFallback = meals.filter((meal) => recentMealIds.has(meal.id) && !blockedFavoriteIds.has(meal.id));
  const favoriteFallback = meals.filter((meal) => blockedFavoriteIds.has(meal.id));

  const pool =
    strict.length > 0
      ? strict
      : recentFallback.length > 0
        ? recentFallback
        : favoriteFallback.length > 0
          ? favoriteFallback
          : meals;

  if (pool.some((meal) => recentMealIds.has(meal.id))) {
    warnings.add("included_recent_meal");
  }
  if (pool.some((meal) => blockedFavoriteIds.has(meal.id))) {
    warnings.add("relaxed_favorite_streak");
  }

  const scored = pool.map((meal) => {
    const signal = signals.get(`${meal.id}:${day}`);
    return {
      meal,
      score: dayScore(meal, day, signal),
    };
  });

  const temperature = 0.9;
  const weighted = scored.map((item) => ({
    meal: item.meal,
    weight: Math.exp(item.score / temperature),
  }));
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    return shuffle(pool, randomFn)[0] ?? null;
  }

  const target = randomFn() * totalWeight;
  let cumulative = 0;

  for (const item of weighted) {
    cumulative += item.weight;
    if (target <= cumulative) {
      return item.meal;
    }
  }

  return weighted[weighted.length - 1]?.meal ?? null;
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

export function selectMealsByDay(
  allMeals: DayAwareCandidateMeal[],
  days: PlannerDay[],
  recentMealIds: Set<string>,
  blockedFavoriteIds: Set<string>,
  signals: Map<string, AdaptiveDaySignal>,
  randomFn: () => number = Math.random
): { selectedMeals: DayAwareCandidateMeal[]; warnings: SelectionWarning[] } {
  if (allMeals.length === 0 || days.length === 0) {
    return { selectedMeals: [], warnings: [] };
  }

  const selected: DayAwareCandidateMeal[] = [];
  const selectedIds = new Set<string>();
  const warnings = new Set<SelectionWarning>();

  for (const day of days) {
    const uniquePool = allMeals.filter((meal) => !selectedIds.has(meal.id));
    const candidatePool = uniquePool.length > 0 ? uniquePool : allMeals;

    if (uniquePool.length === 0) {
      warnings.add("repeated_meal_due_to_small_library");
    }

    const picked = weightedPickByDay(
      candidatePool,
      day,
      recentMealIds,
      blockedFavoriteIds,
      signals,
      randomFn,
      warnings
    );

    if (!picked) {
      break;
    }

    selected.push(picked);
    selectedIds.add(picked.id);
  }

  if (selected.length < days.length) {
    warnings.add("repeated_meal_due_to_small_library");
    const baseCycle = selected.length > 0 ? [...selected] : [...allMeals];
    for (let i = selected.length; i < days.length; i++) {
      selected.push(baseCycle[i % baseCycle.length]);
    }
  }

  return { selectedMeals: selected, warnings: Array.from(warnings) };
}

export function selectMealsWithSmartRotation(
  allMeals: CandidateMeal[],
  count: number,
  history: SmartRotationHistory,
  randomFn: () => number = Math.random
): { selectedMeals: CandidateMeal[]; repeatedLastWeekCombination: boolean } {
  if (allMeals.length === 0 || count <= 0) {
    return { selectedMeals: [], repeatedLastWeekCombination: false };
  }

  if (allMeals.length < count) {
    return { selectedMeals: [], repeatedLastWeekCombination: false };
  }

  const pickWithRotation = () =>
    weightedPickUnique(
      allMeals,
      count,
      (meal) => rotationWeight(meal.id, history),
      randomFn
    );

  const previousWeekMealIds = history.previousWeekMealIds;
  let selected = pickWithRotation();

  if (!previousWeekMealIds || previousWeekMealIds.size === 0 || !haveSameMealSet(selected, previousWeekMealIds)) {
    return { selectedMeals: selected, repeatedLastWeekCombination: false };
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const candidate = pickWithRotation();
    if (!haveSameMealSet(candidate, previousWeekMealIds)) {
      return { selectedMeals: candidate, repeatedLastWeekCombination: false };
    }
  }

  const alternatives = allMeals.filter((meal) => !previousWeekMealIds.has(meal.id));
  if (alternatives.length === 0) {
    return { selectedMeals: selected, repeatedLastWeekCombination: true };
  }

  const replacement = weightedPickUnique(
    alternatives,
    1,
    (meal) => rotationWeight(meal.id, history),
    randomFn
  )[0];

  if (!replacement) {
    return { selectedMeals: selected, repeatedLastWeekCombination: true };
  }

  const replacementIndex = selected.reduce(
    (bestIndex, meal, index, arr) => {
      const currentWeight = rotationWeight(meal.id, history);
      const bestWeight = rotationWeight(arr[bestIndex].id, history);
      return currentWeight < bestWeight ? index : bestIndex;
    },
    0
  );

  selected = [...selected];
  selected[replacementIndex] = replacement;

  return {
    selectedMeals: selected,
    repeatedLastWeekCombination: haveSameMealSet(selected, previousWeekMealIds),
  };
}
