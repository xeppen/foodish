import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_USER_ID = "integration_smart_rotation_user";

const { mockGetCurrentUser, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

import { prisma } from "@/lib/prisma";
import { generateWeeklyPlan } from "@/lib/actions/plans";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;
const DAY_OFFSETS = [0, 1, 2, 3, 4];

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function subtractDays(date: Date, days: number): Date {
  return addDays(date, -days);
}

async function cleanupTestData(userId: string) {
  await prisma.shoppingList.deleteMany({ where: { userId } });
  await prisma.weeklyPlan.deleteMany({ where: { userId } });
  await prisma.mealHistory.deleteMany({ where: { userId } });
  await prisma.usageHistory.deleteMany({ where: { userId } });
  await prisma.mealDaySignal.deleteMany({ where: { userId } });
  await prisma.meal.deleteMany({ where: { userId } });
}

async function seedMeals(userId: string, count: number) {
  await prisma.meal.createMany({
    data: Array.from({ length: count }, (_, index) => ({
      userId,
      name: `Rotation Meal ${index + 1}`,
      complexity: "MEDIUM",
    })),
  });

  return prisma.meal.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
}

describeIfDatabase("smart rotation integration (live DB)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: TEST_USER_ID, name: "Smart Rotation Integration User" });
    await cleanupTestData(TEST_USER_ID);
  });

  afterAll(async () => {
    await cleanupTestData(TEST_USER_ID);
  });

  it("stores 5 unique meal assignments in MealHistory for generated week", async () => {
    await seedMeals(TEST_USER_ID, 6);
    const weekStart = getWeekStart();

    const result = await generateWeeklyPlan({ force: true, revalidate: false });
    expect(result).toMatchObject({ success: true });

    const rows = await prisma.mealHistory.findMany({
      where: { userId: TEST_USER_ID, weekStartDate: weekStart },
      select: { mealId: true, dateAssigned: true },
    });

    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((row) => row.mealId)).size).toBe(5);

    const friday = addDays(weekStart, 4);
    for (const row of rows) {
      expect(row.dateAssigned >= weekStart).toBe(true);
      expect(row.dateAssigned <= friday).toBe(true);
    }
  });

  it("applies recency penalty from last week in weighted selection", async () => {
    const meals = await seedMeals(TEST_USER_ID, 6);
    const weekStart = getWeekStart();
    const previousWeek = subtractDays(weekStart, 7);

    await prisma.mealHistory.create({
      data: {
        userId: TEST_USER_ID,
        mealId: meals[0].id,
        weekStartDate: previousWeek,
        dateAssigned: previousWeek,
      },
    });

    vi.spyOn(Math, "random").mockReturnValue(0.08);
    const result = await generateWeeklyPlan({ force: true, revalidate: false });

    expect(result).toMatchObject({ success: true });
    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: TEST_USER_ID,
          weekStartDate: weekStart,
        },
      },
      select: { monday: true },
    });

    expect(plan?.monday).toBe(meals[1].name);
  });

  it("applies frequency penalty over last 4 weeks in weighted selection", async () => {
    const meals = await seedMeals(TEST_USER_ID, 6);
    const weekStart = getWeekStart();
    const threeWeeksAgo = subtractDays(weekStart, 21);

    await prisma.mealHistory.createMany({
      data: DAY_OFFSETS.map((offset) => ({
        userId: TEST_USER_ID,
        mealId: meals[0].id,
        weekStartDate: threeWeeksAgo,
        dateAssigned: addDays(threeWeeksAgo, offset),
      })),
    });

    vi.spyOn(Math, "random").mockReturnValue(0.12);
    const result = await generateWeeklyPlan({ force: true, revalidate: false });

    expect(result).toMatchObject({ success: true });
    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStartDate: {
          userId: TEST_USER_ID,
          weekStartDate: weekStart,
        },
      },
      select: { monday: true },
    });

    expect(plan?.monday).toBe(meals[1].name);
  });

  it("avoids repeating last week's exact weekly meal combination when alternatives exist", async () => {
    const meals = await seedMeals(TEST_USER_ID, 6);
    const weekStart = getWeekStart();
    const previousWeek = subtractDays(weekStart, 7);
    const previousWeekMealIds = new Set(meals.slice(0, 5).map((meal) => meal.id));

    await prisma.mealHistory.createMany({
      data: meals.slice(0, 5).map((meal, index) => ({
        userId: TEST_USER_ID,
        mealId: meal.id,
        weekStartDate: previousWeek,
        dateAssigned: addDays(previousWeek, index),
      })),
    });

    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = await generateWeeklyPlan({ force: true, revalidate: false });

    expect(result).toMatchObject({ success: true });
    const currentWeekRows = await prisma.mealHistory.findMany({
      where: { userId: TEST_USER_ID, weekStartDate: weekStart },
      select: { mealId: true },
    });
    const currentWeekMealIds = new Set(currentWeekRows.map((row) => row.mealId));

    expect(currentWeekMealIds.size).toBe(5);
    expect(currentWeekMealIds).not.toEqual(previousWeekMealIds);
    expect(currentWeekMealIds.has(meals[5].id)).toBe(true);
  });
});
