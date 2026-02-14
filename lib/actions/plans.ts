"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { selectMeals, selectMealsByDay, type SelectionWarning } from "@/lib/planning/selection";
import {
  dayToEnum,
  loadMealDaySignals,
  recordMealDayShown,
  recordMealSelectedForDay,
  recordMealSwappedAway,
} from "@/lib/planning/day-signals";

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
const DAY_ORDER: Day[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

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

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

async function getRecentMealIds(userId: string, weekStart: Date): Promise<Set<string>> {
  const cutoff = subtractDays(weekStart, RECENT_LOOKBACK_DAYS);
  const recentUsage = await prisma.usageHistory.findMany({
    where: {
      userId,
      usedDate: {
        gte: cutoff,
        lt: weekStart,
      },
    },
    select: { mealId: true },
  });
  return new Set(recentUsage.map((entry) => entry.mealId));
}

async function getBlockedFavoriteIds(userId: string, weekStart: Date): Promise<Set<string>> {
  const previousWeek = subtractDays(weekStart, 7);
  const twoWeeksAgo = subtractDays(weekStart, 14);

  const recentWeeklyUsage = await prisma.usageHistory.findMany({
    where: {
      userId,
      weekStartDate: {
        gte: twoWeeksAgo,
        lt: weekStart,
      },
      meal: {
        thumbsUpCount: { gt: 0 },
      },
    },
    select: {
      mealId: true,
      weekStartDate: true,
    },
  });

  const weekAKey = formatDate(twoWeeksAgo);
  const weekBKey = formatDate(previousWeek);
  const usageByMeal = new Map<string, Set<string>>();

  for (const entry of recentWeeklyUsage) {
    const key = formatDate(entry.weekStartDate);
    const seen = usageByMeal.get(entry.mealId) ?? new Set<string>();
    seen.add(key);
    usageByMeal.set(entry.mealId, seen);
  }

  const blocked = new Set<string>();
  for (const [mealId, weekKeys] of usageByMeal.entries()) {
    if (weekKeys.has(weekAKey) && weekKeys.has(weekBKey)) {
      blocked.add(mealId);
    }
  }

  return blocked;
}

function warningMessage(warnings: SelectionWarning[]): string | undefined {
  if (warnings.includes("repeated_meal_due_to_small_library")) {
    return "Vi upprepade en rätt eftersom din måltidslista är liten. Lägg till fler måltider för mer variation.";
  }
  if (warnings.includes("relaxed_favorite_streak")) {
    return "Vi inkluderade en favorit igen för att kunna fylla veckan.";
  }
  if (warnings.includes("included_recent_meal")) {
    return "Vi inkluderade en nyligen använd rätt för att kunna fylla veckan.";
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

export async function generateWeeklyPlan(options?: { force?: boolean; revalidate?: boolean }) {
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
  });

  if (existingPlan && !options?.force) {
    return { success: true, plan: existingPlan, warning: undefined };
  }

  const recentMealIds = await getRecentMealIds(user.id, weekStart);
  const blockedFavoriteIds = await getBlockedFavoriteIds(user.id, weekStart);
  const allMeals = await prisma.meal.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, thumbsUpCount: true, thumbsDownCount: true, preferredDays: true },
  });

  const daySignals = await loadMealDaySignals(
    user.id,
    allMeals.map((meal) => meal.id)
  );
  const { selectedMeals, warnings } = selectMealsByDay(allMeals, DAY_ORDER, recentMealIds, blockedFavoriteIds, daySignals);

  if (allMeals.length === 0 || selectedMeals.length < 5) {
    return {
      error: "Du behöver minst 5 rätter i din lista för att kunna skapa en plan. Lägg till fler rätter.",
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

  await prisma.usageHistory.createMany({
    data: selectedMeals.map((meal, index) => ({
      mealId: meal.id,
      userId: user.id,
      usedDate: new Date(),
      weekStartDate: weekStart,
      day: dayToEnum(DAY_ORDER[index]),
    })),
  });
  await Promise.all(
    selectedMeals.map((meal, index) => recordMealDayShown(user.id, meal.id, DAY_ORDER[index]))
  );

  const shouldRevalidate = options?.revalidate !== false;
  if (shouldRevalidate) {
    revalidatePath("/");
    revalidatePath("/plan");
  }
  return {
    success: true,
    plan,
    warning: warningMessage(warnings),
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

function applySwapFilters(candidates: SwapCandidate[], filters?: SwapFilterInput): SwapCandidate[] {
  let filtered = [...candidates];

  if (filters?.complexity) {
    filtered = filtered.filter((candidate) => candidate.complexity === filters.complexity);
  }
  if (filters?.rating === "THUMBS_UP") {
    filtered = filtered.filter((candidate) => candidate.thumbsUpCount > candidate.thumbsDownCount);
  }
  if (filters?.recency === "FRESH_ONLY") {
    filtered = filtered.filter((candidate) => !candidate.isRecent);
  }

  return filtered;
}

function buildCounts(candidates: SwapCandidate[]) {
  return {
    simple: candidates.filter((candidate) => candidate.complexity === "SIMPLE").length,
    medium: candidates.filter((candidate) => candidate.complexity === "MEDIUM").length,
    complex: candidates.filter((candidate) => candidate.complexity === "COMPLEX").length,
    thumbsUp: candidates.filter((candidate) => candidate.thumbsUpCount > candidate.thumbsDownCount).length,
    fresh: candidates.filter((candidate) => !candidate.isRecent).length,
    total: candidates.length,
  };
}

async function getSwapCandidatesForDay(userId: string, day: Day, weekStart: Date): Promise<SwapCandidate[]> {
  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId,
        weekStartDate: weekStart,
      },
    },
  });

  if (!plan) {
    return [];
  }

  const recentMealIds = await getRecentMealIds(userId, weekStart);
  const currentPlanMeals = new Set<string>(
    [plan.monday, plan.tuesday, plan.wednesday, plan.thursday, plan.friday].filter(
      (meal): meal is string => meal !== null
    )
  );

  const currentMealForDay = plan[day];
  if (currentMealForDay) {
    currentPlanMeals.delete(currentMealForDay);
  }

  const allMeals = await prisma.meal.findMany({
    where: { userId },
    select: { id: true, name: true, complexity: true, thumbsUpCount: true, thumbsDownCount: true },
  });

  return allMeals
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
  const usingFilters = Boolean(filters?.complexity || filters?.rating || filters?.recency);
  const orderedFiltered = selectMeals(
    filteredCandidates,
    Math.min(limit, filteredCandidates.length),
    new Set<string>()
  );
  const options = orderedFiltered.map((meal) => ({
    id: meal.id,
    name: meal.name,
    complexity: candidates.find((candidate) => candidate.id === meal.id)?.complexity ?? "MEDIUM",
    thumbsUpCount: candidates.find((candidate) => candidate.id === meal.id)?.thumbsUpCount ?? 0,
    thumbsDownCount: candidates.find((candidate) => candidate.id === meal.id)?.thumbsDownCount ?? 0,
  }));

  if (options.length > 0 || !usingFilters) {
    return {
      options,
      counts: buildCounts(filteredCandidates),
      fallbackUsed: false,
      fallbackOptions: [],
    };
  }

  const fallbackRaw = selectMeals(candidates, Math.min(limit, candidates.length), new Set<string>());
  const fallbackOptions = fallbackRaw.map((meal) => ({
    id: meal.id,
    name: meal.name,
    complexity: candidates.find((candidate) => candidate.id === meal.id)?.complexity ?? "MEDIUM",
    thumbsUpCount: candidates.find((candidate) => candidate.id === meal.id)?.thumbsUpCount ?? 0,
    thumbsDownCount: candidates.find((candidate) => candidate.id === meal.id)?.thumbsDownCount ?? 0,
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
  });

  if (!plan) {
    return { error: "Ingen plan hittades för den här veckan" };
  }

  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: { id: true, name: true, userId: true },
  });

  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  const occupiedMeals = new Set<string>(
    [plan.monday, plan.tuesday, plan.wednesday, plan.thursday, plan.friday].filter(
      (mealName): mealName is string => mealName !== null
    )
  );
  occupiedMeals.delete(plan[day] ?? "");

  if (occupiedMeals.has(meal.name)) {
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

  await prisma.usageHistory.create({
    data: {
      mealId: meal.id,
      userId: user.id,
      usedDate: new Date(),
      weekStartDate: weekStart,
      day: dayToEnum(day),
    },
  });
  await recordMealSelectedForDay(user.id, meal.id, day);
  if (previousMeal?.id) {
    await recordMealSwappedAway(user.id, previousMeal.id, day);
  }

  revalidatePath("/");
  revalidatePath("/plan");
  return { success: true, newMeal: meal.name, mealId: meal.id };
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
  });

  if (!plan) {
    return { error: "Ingen plan hittades för den här veckan" };
  }

  // Get all meals currently in the plan
  const currentPlanMeals = new Set<string>([
    plan.monday,
    plan.tuesday,
    plan.wednesday,
    plan.thursday,
    plan.friday,
  ].filter((m): m is string => m !== null));

  const recentMealIds = await getRecentMealIds(user.id, weekStart);

  const currentMeals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      name: { in: Array.from(currentPlanMeals) },
    },
    select: { id: true, name: true },
  });
  const currentMealIds = new Set(currentMeals.map((m) => m.id));

  // Combine both sets to avoid
  const mealsToAvoid = new Set([...recentMealIds, ...currentMealIds]);

  const allMeals = await prisma.meal.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
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

  const previousMealName = plan[day];
  const previousMeal =
    typeof previousMealName === "string"
      ? await prisma.meal.findFirst({
          where: { userId: user.id, name: previousMealName },
          select: { id: true },
        })
      : null;

  await prisma.usageHistory.create({
    data: {
      mealId: newMeals[0].id,
      userId: user.id,
      usedDate: new Date(),
      weekStartDate: weekStart,
      day: dayToEnum(day),
    },
  });
  await recordMealSelectedForDay(user.id, newMeals[0].id, day);
  if (previousMeal?.id) {
    await recordMealSwappedAway(user.id, previousMeal.id, day);
  }

  revalidatePath("/");
  revalidatePath("/plan");
  return { success: true, newMeal };
}
