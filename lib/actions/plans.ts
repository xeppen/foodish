"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { regenerateShoppingListForUser } from "@/lib/actions/shopping-list";
import {
  selectMeals,
  selectMealsWithDayAwareSmartRotation,
} from "@/lib/planning/selection";
import {
  dayToEnum,
  recordMealDayShown,
  recordMealSelectedForDay,
  recordMealSwappedAway,
} from "@/lib/planning/day-signals";

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
const DAY_ORDER: Day[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

type SwapFilterInput = {
  complexity?: "SIMPLE" | "MEDIUM" | "COMPLEX";
  rating?: "THUMBS_UP";
  recency?: "FRESH_ONLY";
  limit?: number;
};

type SwapCandidate = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  thumbsUpCount: number;
  thumbsDownCount: number;
  isRecent: boolean;
};

async function syncWeeklyPlanEntries(
  weeklyPlanId: string,
  assignments: Array<{ day: Day; mealId: string; servings?: number | null }>,
) {
  const dedupedByDay = new Map<
    Day,
    { mealId: string; servings?: number | null }
  >();
  for (const assignment of assignments) {
    dedupedByDay.set(assignment.day, {
      mealId: assignment.mealId,
      servings: assignment.servings,
    });
  }

  await prisma.$transaction(
    Array.from(dedupedByDay.entries()).map(([day, assignment]) =>
      prisma.weeklyPlanEntry.upsert({
        where: {
          weeklyPlanId_day: {
            weeklyPlanId,
            day: dayToEnum(day),
          },
        },
        update: {
          mealId: assignment.mealId,
          servings: clampServings(assignment.servings ?? null),
        },
        create: {
          weeklyPlanId,
          day: dayToEnum(day),
          mealId: assignment.mealId,
          servings: clampServings(assignment.servings ?? null),
        },
      }),
    ),
  );
}

// Get the Monday of the current week (ISO week starts on Monday)
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Get week start date without time
function getWeekStart(date: Date = new Date()): Date {
  const monday = getMonday(date);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const RECENT_LOOKBACK_DAYS = 14;
const ROTATION_LOOKBACK_WEEKS = 4;
const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

function clampServings(servings: number | null | undefined): number {
  if (typeof servings !== "number" || !Number.isFinite(servings)) {
    return 4;
  }
  return Math.max(MIN_SERVINGS, Math.min(MAX_SERVINGS, Math.round(servings)));
}

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function assignmentDateForDay(weekStart: Date, day: Day): Date {
  return addDays(weekStart, DAY_ORDER.indexOf(day));
}

async function getRecentMealIds(
  userId: string,
  weekStart: Date,
): Promise<Set<string>> {
  const cutoff = subtractDays(weekStart, RECENT_LOOKBACK_DAYS);
  const recentUsage = await prisma.mealHistory.findMany({
    where: {
      userId,
      dateAssigned: {
        gte: cutoff,
        lt: weekStart,
      },
    },
    select: { mealId: true },
  });
  return new Set(recentUsage.map((entry) => entry.mealId));
}

async function getSmartRotationHistory(userId: string, weekStart: Date) {
  const fourWeeksAgo = subtractDays(weekStart, 7 * ROTATION_LOOKBACK_WEEKS);
  const previousWeek = subtractDays(weekStart, 7);
  const twoWeeksAgo = subtractDays(weekStart, 14);
  const historyRows = await prisma.mealHistory.findMany({
    where: {
      userId,
      weekStartDate: {
        gte: fourWeeksAgo,
        lt: weekStart,
      },
    },
    select: {
      mealId: true,
      weekStartDate: true,
    },
  });

  const previousWeekKey = formatDate(previousWeek);
  const twoWeeksAgoKey = formatDate(twoWeeksAgo);
  const lastWeekMealIds = new Set<string>();
  const twoWeeksAgoMealIds = new Set<string>();
  const occurrencesLast4Weeks = new Map<string, number>();

  for (const entry of historyRows) {
    const key = formatDate(entry.weekStartDate);
    if (key === previousWeekKey) {
      lastWeekMealIds.add(entry.mealId);
    } else if (key === twoWeeksAgoKey) {
      twoWeeksAgoMealIds.add(entry.mealId);
    }
    occurrencesLast4Weeks.set(
      entry.mealId,
      (occurrencesLast4Weeks.get(entry.mealId) ?? 0) + 1,
    );
  }

  return {
    lastWeekMealIds,
    twoWeeksAgoMealIds,
    occurrencesLast4Weeks,
    previousWeekMealIds: lastWeekMealIds,
  };
}

function warningMessage(
  repeatedLastWeekCombination: boolean,
): string | undefined {
  if (repeatedLastWeekCombination) {
    return "Vi kunde inte undvika samma veckokombination som förra veckan. Lägg till fler måltider för mer variation.";
  }
  return undefined;
}

export async function getCurrentWeekPlan() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const weekStart = getWeekStart();

  try {
    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: user.id,
          weekStartDate: weekStart,
        },
      },
      include: {
        entries: {
          select: {
            day: true,
            servings: true,
          },
        },
      },
    });

    return plan;
  } catch (error) {
    console.error("Failed to load current week plan", {
      userId: user.id,
      weekStart: weekStart.toISOString(),
      error,
    });
    return null;
  }
}

export async function generateWeeklyPlan(options?: {
  force?: boolean;
  revalidate?: boolean;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const weekStart = getWeekStart();

  // Check if plan already exists for this week
  const existingPlan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    include: {
      entries: {
        select: {
          day: true,
          servings: true,
        },
      },
    },
  });

  if (existingPlan && !options?.force) {
    return { success: true, plan: existingPlan, warning: undefined };
  }

  const allMeals = await prisma.meal.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      defaultServings: true,
      thumbsUpCount: true,
      thumbsDownCount: true,
      preferredDays: true,
    },
  });

  const daySignalsRaw = await prisma.mealDaySignal.findMany({
    where: { userId: user.id },
  });

  const signalsMap = new Map();
  for (const signal of daySignalsRaw) {
    signalsMap.set(`${signal.mealId}:${signal.day.toLowerCase()}`, signal);
  }

  const rotationHistory = await getSmartRotationHistory(user.id, weekStart);

  const { selectedMeals, repeatedLastWeekCombination } =
    selectMealsWithDayAwareSmartRotation(
      allMeals,
      DAY_ORDER,
      rotationHistory,
      signalsMap,
    );

  if (
    allMeals.length < DAY_ORDER.length ||
    selectedMeals.length < DAY_ORDER.length
  ) {
    return {
      error:
        "Du behöver minst 5 rätter i din lista för att kunna skapa en plan. Lägg till fler rätter.",
    };
  }

  // Create or replace the current week plan
  const plan = await prisma.weeklyPlan.upsert({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    update: {
      monday: selectedMeals[0].name,
      tuesday: selectedMeals[1].name,
      wednesday: selectedMeals[2].name,
      thursday: selectedMeals[3].name,
      friday: selectedMeals[4].name,
      updatedAt: new Date(),
    },
    create: {
      userId: user.id,
      weekStartDate: weekStart,
      monday: selectedMeals[0].name,
      tuesday: selectedMeals[1].name,
      wednesday: selectedMeals[2].name,
      thursday: selectedMeals[3].name,
      friday: selectedMeals[4].name,
    },
  });

  await syncWeeklyPlanEntries(
    plan.id,
    selectedMeals.map((meal, index) => ({
      day: DAY_ORDER[index],
      mealId: meal.id,
      servings: meal.defaultServings,
    })),
  );

  await prisma.mealHistory.createMany({
    data: selectedMeals.map((meal, index) => ({
      userId: user.id,
      mealId: meal.id,
      weekStartDate: weekStart,
      dateAssigned: assignmentDateForDay(weekStart, DAY_ORDER[index]),
    })),
  });
  await Promise.all(
    selectedMeals.map((meal, index) =>
      recordMealDayShown(user.id, meal.id, DAY_ORDER[index]),
    ),
  );
  try {
    await regenerateShoppingListForUser(user.id, weekStart, {
      revalidate: false,
    });
  } catch (error) {
    console.error(
      "Failed to regenerate shopping list after weekly plan generation",
      {
        userId: user.id,
        weekStart: weekStart.toISOString(),
        error,
      },
    );
  }

  const planWithEntries = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    include: {
      entries: {
        select: {
          day: true,
          servings: true,
        },
      },
    },
  });

  const shouldRevalidate = options?.revalidate !== false;
  if (shouldRevalidate) {
    revalidatePath("/");
    revalidatePath("/plan");
  }
  return {
    success: true,
    plan: planWithEntries ?? plan,
    warning: warningMessage(repeatedLastWeekCombination),
  };
}

export async function getWeekInfo() {
  const weekStart = getWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 4); // Friday

  return {
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    monday: formatDate(weekStart),
    tuesday: formatDate(new Date(weekStart.getTime() + 86400000)),
    wednesday: formatDate(new Date(weekStart.getTime() + 172800000)),
    thursday: formatDate(new Date(weekStart.getTime() + 259200000)),
    friday: formatDate(new Date(weekStart.getTime() + 345600000)),
  };
}

function applySwapFilters(
  candidates: SwapCandidate[],
  filters?: SwapFilterInput,
): SwapCandidate[] {
  let filtered = [...candidates];

  if (filters?.complexity) {
    filtered = filtered.filter(
      (candidate) => candidate.complexity === filters.complexity,
    );
  }
  if (filters?.rating === "THUMBS_UP") {
    filtered = filtered.filter(
      (candidate) => candidate.thumbsUpCount > candidate.thumbsDownCount,
    );
  }
  if (filters?.recency === "FRESH_ONLY") {
    filtered = filtered.filter((candidate) => !candidate.isRecent);
  }

  return filtered;
}

function buildCounts(candidates: SwapCandidate[]) {
  return {
    simple: candidates.filter((candidate) => candidate.complexity === "SIMPLE")
      .length,
    medium: candidates.filter((candidate) => candidate.complexity === "MEDIUM")
      .length,
    complex: candidates.filter(
      (candidate) => candidate.complexity === "COMPLEX",
    ).length,
    thumbsUp: candidates.filter(
      (candidate) => candidate.thumbsUpCount > candidate.thumbsDownCount,
    ).length,
    fresh: candidates.filter((candidate) => !candidate.isRecent).length,
    total: candidates.length,
  };
}

async function getSwapCandidatesForDay(
  userId: string,
  day: Day,
  weekStart: Date,
): Promise<SwapCandidate[]> {
  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId,
        weekStartDate: weekStart,
      },
    },
    include: {
      entries: {
        select: {
          day: true,
          mealId: true,
        },
      },
    },
  });

  if (!plan) {
    return [];
  }

  const recentMealIds = await getRecentMealIds(userId, weekStart);
  const currentPlanMeals = new Set<string>(
    [
      plan.monday,
      plan.tuesday,
      plan.wednesday,
      plan.thursday,
      plan.friday,
    ].filter((meal): meal is string => meal !== null),
  );

  const entries = plan.entries ?? [];
  const currentMealForDay = plan[day];
  const currentMealIdForDay =
    entries.find((entry) => entry.day === dayToEnum(day))?.mealId ?? null;
  const occupiedMealIds = new Set(
    entries
      .filter((entry) => entry.mealId !== currentMealIdForDay)
      .map((entry) => entry.mealId),
  );
  if (currentMealForDay) {
    currentPlanMeals.delete(currentMealForDay);
  }

  const allMeals = await prisma.meal.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      complexity: true,
      thumbsUpCount: true,
      thumbsDownCount: true,
    },
  });

  return allMeals
    .filter((meal) => !occupiedMealIds.has(meal.id))
    .filter((meal) => !currentPlanMeals.has(meal.name))
    .filter((meal) => meal.name !== currentMealForDay)
    .map((meal) => ({
      id: meal.id,
      name: meal.name,
      complexity: meal.complexity,
      thumbsUpCount: meal.thumbsUpCount,
      thumbsDownCount: meal.thumbsDownCount,
      isRecent: recentMealIds.has(meal.id),
    }));
}

export async function getSwapOptions(day: Day, filters?: SwapFilterInput) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const weekStart = getWeekStart();
  const limit = Math.max(1, Math.min(filters?.limit ?? 8, 20));
  const candidates = await getSwapCandidatesForDay(user.id, day, weekStart);
  if (candidates.length === 0) {
    return {
      options: [],
      counts: buildCounts([]),
      fallbackUsed: false,
      fallbackOptions: [],
    };
  }

  const filteredCandidates = applySwapFilters(candidates, filters);
  const usingFilters = Boolean(
    filters?.complexity || filters?.rating || filters?.recency,
  );
  const orderedFiltered = selectMeals(
    filteredCandidates,
    Math.min(limit, filteredCandidates.length),
    new Set<string>(),
  );
  const options = orderedFiltered.map((meal) => ({
    id: meal.id,
    name: meal.name,
    complexity:
      candidates.find((candidate) => candidate.id === meal.id)?.complexity ??
      "MEDIUM",
    thumbsUpCount:
      candidates.find((candidate) => candidate.id === meal.id)?.thumbsUpCount ??
      0,
    thumbsDownCount:
      candidates.find((candidate) => candidate.id === meal.id)
        ?.thumbsDownCount ?? 0,
  }));

  if (options.length > 0 || !usingFilters) {
    return {
      options,
      counts: buildCounts(filteredCandidates),
      fallbackUsed: false,
      fallbackOptions: [],
    };
  }

  const fallbackRaw = selectMeals(
    candidates,
    Math.min(limit, candidates.length),
    new Set<string>(),
  );
  const fallbackOptions = fallbackRaw.map((meal) => ({
    id: meal.id,
    name: meal.name,
    complexity:
      candidates.find((candidate) => candidate.id === meal.id)?.complexity ??
      "MEDIUM",
    thumbsUpCount:
      candidates.find((candidate) => candidate.id === meal.id)?.thumbsUpCount ??
      0,
    thumbsDownCount:
      candidates.find((candidate) => candidate.id === meal.id)
        ?.thumbsDownCount ?? 0,
  }));

  return {
    options: [],
    counts: buildCounts(filteredCandidates),
    fallbackUsed: true,
    fallbackOptions,
  };
}

export async function swapDayMealWithChoice(day: Day, mealId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const weekStart = getWeekStart();
  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    include: {
      entries: {
        select: {
          day: true,
          mealId: true,
        },
      },
    },
  });

  if (!plan) {
    return { error: "Ingen plan hittades för den här veckan" };
  }

  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: { id: true, name: true, userId: true, defaultServings: true },
  });

  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  const occupiedMeals = new Set<string>(
    [
      plan.monday,
      plan.tuesday,
      plan.wednesday,
      plan.thursday,
      plan.friday,
    ].filter((mealName): mealName is string => mealName !== null),
  );
  occupiedMeals.delete(plan[day] ?? "");
  const entries = plan.entries ?? [];
  const currentMealIdForDay =
    entries.find((entry) => entry.day === dayToEnum(day))?.mealId ?? null;
  const occupiedMealIds = new Set(
    entries
      .filter((entry) => entry.mealId !== currentMealIdForDay)
      .map((entry) => entry.mealId),
  );

  if (occupiedMeals.has(meal.name) || occupiedMealIds.has(meal.id)) {
    return { error: "Måltiden finns redan i veckoplanen" };
  }

  const previousMealName = plan[day];
  const previousMeal =
    typeof previousMealName === "string"
      ? await prisma.meal.findFirst({
          where: { userId: user.id, name: previousMealName },
          select: { id: true },
        })
      : null;

  await prisma.weeklyPlan.update({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    data: { [day]: meal.name },
  });

  await prisma.weeklyPlanEntry.upsert({
    where: {
      weeklyPlanId_day: {
        weeklyPlanId: plan.id,
        day: dayToEnum(day),
      },
    },
    update: {
      mealId: meal.id,
      servings: clampServings(meal.defaultServings),
    },
    create: {
      weeklyPlanId: plan.id,
      day: dayToEnum(day),
      mealId: meal.id,
      servings: clampServings(meal.defaultServings),
    },
  });

  await prisma.mealHistory.create({
    data: {
      userId: user.id,
      mealId: meal.id,
      weekStartDate: weekStart,
      dateAssigned: assignmentDateForDay(weekStart, day),
    },
  });
  await recordMealSelectedForDay(user.id, meal.id, day);
  if (previousMeal?.id) {
    await recordMealSwappedAway(user.id, previousMeal.id, day);
  }
  try {
    await regenerateShoppingListForUser(user.id, weekStart, {
      revalidate: false,
    });
  } catch (error) {
    console.error("Failed to regenerate shopping list after day swap", {
      userId: user.id,
      day,
      weekStart: weekStart.toISOString(),
      error,
    });
  }

  revalidatePath("/");
  revalidatePath("/plan");
  return {
    success: true,
    newMeal: meal.name,
    mealId: meal.id,
    servings: clampServings(meal.defaultServings),
  };
}

export async function swapDayMeal(day: Day) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const weekStart = getWeekStart();

  // Get current plan
  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    include: {
      entries: {
        select: {
          mealId: true,
        },
      },
    },
  });

  if (!plan) {
    return { error: "Ingen plan hittades för den här veckan" };
  }

  // Get all meals currently in the plan
  const currentPlanMeals = new Set<string>(
    [
      plan.monday,
      plan.tuesday,
      plan.wednesday,
      plan.thursday,
      plan.friday,
    ].filter((m): m is string => m !== null),
  );

  const recentMealIds = await getRecentMealIds(user.id, weekStart);

  const entries = plan.entries ?? [];
  let currentMealIds = new Set(entries.map((entry) => entry.mealId));
  if (currentMealIds.size === 0) {
    const currentMeals = await prisma.meal.findMany({
      where: {
        userId: user.id,
        name: { in: Array.from(currentPlanMeals) },
      },
      select: { id: true, name: true },
    });
    currentMealIds = new Set(currentMeals.map((m) => m.id));
  }

  // Combine both sets to avoid
  const mealsToAvoid = new Set([...recentMealIds, ...currentMealIds]);

  const allMeals = await prisma.meal.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, defaultServings: true },
  });
  const newMeals = selectMeals(allMeals, 1, mealsToAvoid);

  if (newMeals.length === 0) {
    return { error: "Inga alternativa rätter tillgängliga" };
  }

  const newMeal = newMeals[0].name;

  // Update the plan
  await prisma.weeklyPlan.update({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    data: {
      [day]: newMeal,
    },
  });

  await prisma.weeklyPlanEntry.upsert({
    where: {
      weeklyPlanId_day: {
        weeklyPlanId: plan.id,
        day: dayToEnum(day),
      },
    },
    update: {
      mealId: newMeals[0].id,
      servings: clampServings(newMeals[0].defaultServings),
    },
    create: {
      weeklyPlanId: plan.id,
      day: dayToEnum(day),
      mealId: newMeals[0].id,
      servings: clampServings(newMeals[0].defaultServings),
    },
  });

  const previousMealName = plan[day];
  const previousMeal =
    typeof previousMealName === "string"
      ? await prisma.meal.findFirst({
          where: { userId: user.id, name: previousMealName },
          select: { id: true },
        })
      : null;

  await prisma.mealHistory.create({
    data: {
      userId: user.id,
      mealId: newMeals[0].id,
      weekStartDate: weekStart,
      dateAssigned: assignmentDateForDay(weekStart, day),
    },
  });
  await recordMealSelectedForDay(user.id, newMeals[0].id, day);
  if (previousMeal?.id) {
    await recordMealSwappedAway(user.id, previousMeal.id, day);
  }
  try {
    await regenerateShoppingListForUser(user.id, weekStart, {
      revalidate: false,
    });
  } catch (error) {
    console.error("Failed to regenerate shopping list after quick swap", {
      userId: user.id,
      day,
      weekStart: weekStart.toISOString(),
      error,
    });
  }

  revalidatePath("/");
  revalidatePath("/plan");
  return {
    success: true,
    newMeal,
    servings: clampServings(newMeals[0].defaultServings),
  };
}

export async function setDayServings(day: Day, servings: number) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const weekStart = getWeekStart();
  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
  });

  if (!plan) {
    return { error: "Ingen plan hittades för den här veckan" };
  }

  const normalizedServings = clampServings(servings);
  const mealName = plan[day];
  if (!mealName) {
    return { error: "Ingen måltid hittades för dagen" };
  }

  const meal = await prisma.meal.findFirst({
    where: { userId: user.id, name: mealName },
    select: { id: true },
  });

  if (!meal) {
    return { error: "Måltiden hittades inte" };
  }

  await prisma.weeklyPlanEntry.upsert({
    where: {
      weeklyPlanId_day: {
        weeklyPlanId: plan.id,
        day: dayToEnum(day),
      },
    },
    update: {
      servings: normalizedServings,
      mealId: meal.id,
    },
    create: {
      weeklyPlanId: plan.id,
      day: dayToEnum(day),
      mealId: meal.id,
      servings: normalizedServings,
    },
  });
  try {
    await regenerateShoppingListForUser(user.id, weekStart, {
      revalidate: false,
    });
  } catch (error) {
    console.error("Failed to regenerate shopping list after servings update", {
      userId: user.id,
      day,
      weekStart: weekStart.toISOString(),
      error,
    });
  }

  revalidatePath("/");
  return { success: true, servings: normalizedServings };
}
