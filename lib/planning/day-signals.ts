import { prisma } from "@/lib/prisma";
import type { PlannerDay } from "@/lib/planning/selection";

export type MealDaySignalSnapshot = {
  shownCount: number;
  swappedAwayCount: number;
  selectedCount: number;
};

const DAY_TO_ENUM = {
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
} as const;

export function dayToEnum(day: PlannerDay): "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" {
  return DAY_TO_ENUM[day];
}

export async function loadMealDaySignals(userId: string, mealIds: string[]) {
  if (mealIds.length === 0) {
    return new Map<string, MealDaySignalSnapshot>();
  }

  const rows = await prisma.mealDaySignal.findMany({
    where: {
      userId,
      mealId: { in: mealIds },
    },
    select: {
      mealId: true,
      day: true,
      shownCount: true,
      swappedAwayCount: true,
      selectedCount: true,
    },
  });

  const map = new Map<string, MealDaySignalSnapshot>();
  for (const row of rows) {
    map.set(`${row.mealId}:${row.day.toLowerCase()}`, {
      shownCount: row.shownCount,
      swappedAwayCount: row.swappedAwayCount,
      selectedCount: row.selectedCount,
    });
  }

  return map;
}

export async function recordMealDayShown(userId: string, mealId: string, day: PlannerDay) {
  await prisma.mealDaySignal.upsert({
    where: {
      mealId_userId_day: {
        mealId,
        userId,
        day: dayToEnum(day),
      },
    },
    update: {
      shownCount: { increment: 1 },
      lastShownAt: new Date(),
    },
    create: {
      mealId,
      userId,
      day: dayToEnum(day),
      shownCount: 1,
      lastShownAt: new Date(),
    },
  });
}

export async function recordMealSwappedAway(userId: string, mealId: string, day: PlannerDay) {
  await prisma.mealDaySignal.upsert({
    where: {
      mealId_userId_day: {
        mealId,
        userId,
        day: dayToEnum(day),
      },
    },
    update: {
      swappedAwayCount: { increment: 1 },
    },
    create: {
      mealId,
      userId,
      day: dayToEnum(day),
      swappedAwayCount: 1,
    },
  });
}

export async function recordMealSelectedForDay(userId: string, mealId: string, day: PlannerDay) {
  await prisma.mealDaySignal.upsert({
    where: {
      mealId_userId_day: {
        mealId,
        userId,
        day: dayToEnum(day),
      },
    },
    update: {
      selectedCount: { increment: 1 },
      shownCount: { increment: 1 },
      lastShownAt: new Date(),
    },
    create: {
      mealId,
      userId,
      day: dayToEnum(day),
      selectedCount: 1,
      shownCount: 1,
      lastShownAt: new Date(),
    },
  });
}

export async function resetUserMealDaySignals(userId: string) {
  await prisma.mealDaySignal.deleteMany({ where: { userId } });
}
