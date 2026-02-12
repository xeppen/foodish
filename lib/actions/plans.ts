"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { selectMeals, selectMealsWithConstraints, type SelectionWarning } from "@/lib/planning/selection";

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
        rating: "THUMBS_UP",
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

export async function generateWeeklyPlan() {
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

  if (existingPlan) {
    return { success: true, plan: existingPlan, warning: undefined };
  }

  const recentMealIds = await getRecentMealIds(user.id, weekStart);
  const blockedFavoriteIds = await getBlockedFavoriteIds(user.id, weekStart);
  const allMeals = await prisma.meal.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, rating: true },
  });
  const { selectedMeals, warnings } = selectMealsWithConstraints(
    allMeals,
    5,
    recentMealIds,
    blockedFavoriteIds
  );

  if (allMeals.length === 0 || selectedMeals.length < 5) {
    return {
      error: "Du behöver minst 5 rätter i din lista för att kunna skapa en plan. Lägg till fler rätter.",
    };
  }

  // Create the plan
  const plan = await prisma.weeklyPlan.create({
    data: {
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
    data: selectedMeals.map((meal) => ({
      mealId: meal.id,
      userId: user.id,
      usedDate: new Date(),
      weekStartDate: weekStart,
    })),
  });

  revalidatePath("/");
  revalidatePath("/plan");
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

export async function swapDayMeal(day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday") {
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

  await prisma.usageHistory.create({
    data: {
      mealId: newMeals[0].id,
      userId: user.id,
      usedDate: new Date(),
      weekStartDate: weekStart,
    },
  });

  revalidatePath("/");
  revalidatePath("/plan");
  return { success: true, newMeal };
}
