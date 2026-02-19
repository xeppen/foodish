import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCurrentUser,
  mockRevalidatePath,
  mockRegenerateShoppingListForUser,
  mockSelectMeals,
  mockSelectMealsWithSmartRotation,
  prismaMock,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRegenerateShoppingListForUser: vi.fn(),
  mockSelectMeals: vi.fn(),
  mockSelectMealsWithSmartRotation: vi.fn(),
  prismaMock: {
    weeklyPlan: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    weeklyPlanEntry: {
      upsert: vi.fn(),
    },
    meal: {
      findMany: vi.fn(),
    },
    mealHistory: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    mealDaySignal: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/actions/shopping-list", () => ({
  regenerateShoppingListForUser: mockRegenerateShoppingListForUser,
}));

vi.mock("@/lib/planning/selection", () => ({
  selectMeals: mockSelectMeals,
  selectMealsWithSmartRotation: mockSelectMealsWithSmartRotation,
}));

import { generateWeeklyPlan } from "@/lib/actions/plans";

function makeMeals(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `m${index + 1}`,
    name: `Meal ${index + 1}`,
    defaultServings: 4,
  }));
}

function getLocalWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function subtractDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

describe("generateWeeklyPlan API contract (smart rotation)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19T12:00:00.000Z"));
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    mockRegenerateShoppingListForUser.mockResolvedValue({ success: true });
    mockSelectMeals.mockImplementation((allMeals: unknown[], count: number) => allMeals.slice(0, count));
    mockSelectMealsWithSmartRotation.mockImplementation((allMeals: unknown[], count: number) => ({
      selectedMeals: allMeals.slice(0, count),
      repeatedLastWeekCombination: false,
    }));

    prismaMock.$transaction.mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops as Promise<unknown>[]);
      }
      if (typeof ops === "function") {
        return ops(prismaMock);
      }
      return null;
    });

    prismaMock.weeklyPlan.findUnique.mockResolvedValue(null);
    prismaMock.weeklyPlan.upsert.mockResolvedValue({ id: "plan_1" });
    prismaMock.meal.findMany.mockResolvedValue(makeMeals(6));
    prismaMock.mealHistory.findMany.mockResolvedValue([]);
    prismaMock.mealHistory.createMany.mockResolvedValue({ count: 5 });
    prismaMock.weeklyPlanEntry.upsert.mockResolvedValue({});
    prismaMock.mealDaySignal.upsert.mockResolvedValue({});
  });

  it("returns unauthorized error when no current user exists", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await generateWeeklyPlan();

    expect(result).toEqual({ error: "Ej behörig" });
    expect(prismaMock.weeklyPlan.findUnique).not.toHaveBeenCalled();
  });

  it("returns existing current-week plan when force is not set", async () => {
    const existing = {
      id: "existing_plan",
      monday: "Meal A",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
      entries: [],
    };
    prismaMock.weeklyPlan.findUnique.mockResolvedValue(existing);

    const result = await generateWeeklyPlan();

    expect(result).toEqual({ success: true, plan: existing, warning: undefined });
    expect(prismaMock.meal.findMany).not.toHaveBeenCalled();
    expect(mockSelectMealsWithSmartRotation).not.toHaveBeenCalled();
  });

  it("continues generation when force is true even if plan already exists", async () => {
    prismaMock.weeklyPlan.findUnique
      .mockResolvedValueOnce({ id: "existing_plan", entries: [] })
      .mockResolvedValueOnce({ id: "plan_1", entries: [] });

    const result = await generateWeeklyPlan({ force: true, revalidate: false });

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.meal.findMany).toHaveBeenCalledTimes(1);
    expect(mockSelectMealsWithSmartRotation).toHaveBeenCalledTimes(1);
  });

  it("passes 4-week history context to smart rotation selector", async () => {
    prismaMock.weeklyPlan.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "plan_1", entries: [] });

    const weekStart = getLocalWeekStart();
    const previousWeek = subtractDays(weekStart, 7);
    const twoWeeksAgo = subtractDays(weekStart, 14);
    const threeWeeksAgo = subtractDays(weekStart, 21);
    prismaMock.mealHistory.findMany.mockResolvedValue([
      { mealId: "m1", weekStartDate: previousWeek },
      { mealId: "m1", weekStartDate: previousWeek },
      { mealId: "m2", weekStartDate: twoWeeksAgo },
      { mealId: "m2", weekStartDate: threeWeeksAgo },
      { mealId: "m3", weekStartDate: threeWeeksAgo },
    ]);

    await generateWeeklyPlan({ force: true, revalidate: false });

    const historyQuery = prismaMock.mealHistory.findMany.mock.calls[0][0];
    expect(historyQuery.where.userId).toBe("user_1");
    const gte = historyQuery.where.weekStartDate.gte as Date;
    const lt = historyQuery.where.weekStartDate.lt as Date;
    expect(lt.getTime() - gte.getTime()).toBe(28 * 24 * 60 * 60 * 1000);

    const historyArg = mockSelectMealsWithSmartRotation.mock.calls[0][2];
    expect(Array.from(historyArg.lastWeekMealIds)).toEqual(["m1"]);
    expect(Array.from(historyArg.twoWeeksAgoMealIds)).toEqual(["m2"]);
    expect(historyArg.occurrencesLast4Weeks.get("m1")).toBe(2);
    expect(historyArg.occurrencesLast4Weeks.get("m2")).toBe(2);
    expect(historyArg.occurrencesLast4Weeks.get("m3")).toBe(1);
  });

  it("writes weekly entries and MealHistory with monday-to-friday assignment dates", async () => {
    prismaMock.weeklyPlan.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "plan_1", entries: [] });

    const result = await generateWeeklyPlan();

    expect(result).toMatchObject({ success: true, warning: undefined });
    expect(prismaMock.weeklyPlanEntry.upsert).toHaveBeenCalledTimes(5);
    expect(prismaMock.mealHistory.createMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.mealDaySignal.upsert).toHaveBeenCalledTimes(5);

    const weekUpsertPayload = prismaMock.weeklyPlan.upsert.mock.calls[0][0];
    const weekStart = weekUpsertPayload.create.weekStartDate as Date;
    const payload = prismaMock.mealHistory.createMany.mock.calls[0][0];
    const assigned = payload.data.map((row: { dateAssigned: Date }) => row.dateAssigned.getTime());

    expect(assigned).toHaveLength(5);
    assigned.forEach((timestamp: number, index: number) => {
      const expected = weekStart.getTime() + index * 24 * 60 * 60 * 1000;
      expect(timestamp).toBe(expected);
    });
  });

  it("returns warning when selector reports repeated last-week combination", async () => {
    prismaMock.weeklyPlan.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "plan_1", entries: [] });
    mockSelectMealsWithSmartRotation.mockImplementation((allMeals: unknown[], count: number) => ({
      selectedMeals: allMeals.slice(0, count),
      repeatedLastWeekCombination: true,
    }));

    const result = await generateWeeklyPlan({ revalidate: false });

    expect(result).toMatchObject({
      success: true,
      warning: "Vi kunde inte undvika samma veckokombination som förra veckan. Lägg till fler måltider för mer variation.",
    });
  });

  it("returns a minimum-meals error when fewer than 5 meals exist", async () => {
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce(null);
    prismaMock.meal.findMany.mockResolvedValueOnce(makeMeals(4));
    mockSelectMealsWithSmartRotation.mockImplementation((allMeals: unknown[]) => ({
      selectedMeals: allMeals,
      repeatedLastWeekCombination: false,
    }));

    const result = await generateWeeklyPlan({ revalidate: false });

    expect(result).toEqual({
      error: "Du behöver minst 5 rätter i din lista för att kunna skapa en plan. Lägg till fler rätter.",
    });
    expect(prismaMock.weeklyPlan.upsert).not.toHaveBeenCalled();
    expect(prismaMock.mealHistory.createMany).not.toHaveBeenCalled();
  });

  it("still succeeds when shopping-list regeneration fails", async () => {
    prismaMock.weeklyPlan.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "plan_1", entries: [] });
    mockRegenerateShoppingListForUser.mockRejectedValueOnce(new Error("shopping failed"));

    const result = await generateWeeklyPlan({ revalidate: false });

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.mealHistory.createMany).toHaveBeenCalledTimes(1);
  });
});
