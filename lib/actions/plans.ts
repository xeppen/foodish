"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

// Get random meals avoiding recent ones
async function selectRandomMeals(
  userId: string,
  count: number,
  recentMealIds: Set<string>
): Promise<string[]> {
  // Get all user meals
  const allMeals = await prisma.meal.findMany({
    where: { userId },
    orderBy: { lastUsed: "asc" },
  });

  if (allMeals.length === 0) {
    return [];
  }

  // Separate meals into recent and non-recent
  const nonRecentMeals = allMeals.filter((m) => !recentMealIds.has(m.id));
  const availableMeals = nonRecentMeals.length > 0 ? nonRecentMeals : allMeals;

  // If we don't have enough meals, cycle through what we have
  if (availableMeals.length < count) {
    const selected: string[] = [];
    let index = 0;
    for (let i = 0; i < count; i++) {
      selected.push(availableMeals[index % availableMeals.length].name);
      index++;
    }
    return selected;
  }

  // Shuffle and select
  const shuffled = [...availableMeals].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((m) => m.name);
}

export async function getCurrentWeekPlan() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
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

  return plan;
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
    return { success: true, plan: existingPlan };
  }

  // Get meals from last week to avoid repetition
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastWeekPlan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: lastWeekStart,
      },
    },
  });

  // Build set of recent meal names to avoid
  const recentMealNames = new Set<string>();
  if (lastWeekPlan) {
    [
      lastWeekPlan.monday,
      lastWeekPlan.tuesday,
      lastWeekPlan.wednesday,
      lastWeekPlan.thursday,
      lastWeekPlan.friday,
    ].forEach((meal) => {
      if (meal) recentMealNames.add(meal);
    });
  }

  // Get meal IDs that match recent names
  const recentMeals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      name: { in: Array.from(recentMealNames) },
    },
    select: { id: true },
  });
  const recentMealIds = new Set(recentMeals.map((m) => m.id));

  // Select 5 random meals
  const selectedMeals = await selectRandomMeals(user.id, 5, recentMealIds);

  if (selectedMeals.length < 5) {
    return {
      error: "Du behöver minst 5 rätter i din lista för att kunna skapa en plan. Lägg till fler rätter.",
    };
  }

  // Create the plan
  const plan = await prisma.weeklyPlan.create({
    data: {
      userId: user.id,
      weekStartDate: weekStart,
      monday: selectedMeals[0],
      tuesday: selectedMeals[1],
      wednesday: selectedMeals[2],
      thursday: selectedMeals[3],
      friday: selectedMeals[4],
    },
  });

  // Update lastUsed for selected meals
  await prisma.meal.updateMany({
    where: {
      userId: user.id,
      name: { in: selectedMeals },
    },
    data: {
      lastUsed: new Date(),
    },
  });

  revalidatePath("/plan");
  return { success: true, plan };
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

  // Get meals from last week
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastWeekPlan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: lastWeekStart,
      },
    },
  });

  const recentMealNames = new Set<string>();
  if (lastWeekPlan) {
    [
      lastWeekPlan.monday,
      lastWeekPlan.tuesday,
      lastWeekPlan.wednesday,
      lastWeekPlan.thursday,
      lastWeekPlan.friday,
    ].forEach((meal) => {
      if (meal) recentMealNames.add(meal);
    });
  }

  // Get meal IDs for recent and current meals
  const recentMeals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      name: { in: Array.from(recentMealNames) },
    },
    select: { id: true },
  });
  const recentMealIds = new Set(recentMeals.map((m) => m.id));

  const currentMeals = await prisma.meal.findMany({
    where: {
      userId: user.id,
      name: { in: Array.from(currentPlanMeals) },
    },
    select: { id: true },
  });
  const currentMealIds = new Set(currentMeals.map((m) => m.id));

  // Combine both sets to avoid
  const mealsToAvoid = new Set([...recentMealIds, ...currentMealIds]);

  // Select one new meal
  const newMeals = await selectRandomMeals(user.id, 1, mealsToAvoid);

  if (newMeals.length === 0) {
    return { error: "Inga alternativa rätter tillgängliga" };
  }

  const newMeal = newMeals[0];

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

  // Update lastUsed for the new meal
  await prisma.meal.updateMany({
    where: {
      userId: user.id,
      name: newMeal,
    },
    data: {
      lastUsed: new Date(),
    },
  });

  revalidatePath("/plan");
  return { success: true, newMeal };
}
