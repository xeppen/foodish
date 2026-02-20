import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCurrentUser,
  mockRevalidatePath,
  mockRegenerateShoppingListForUser,
  prismaMock,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockRegenerateShoppingListForUser: vi.fn(),
  prismaMock: {
    weeklyPlan: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    weeklyPlanEntry: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      upsert: vi.fn(),
    },
    meal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    mealHistory: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      create: vi.fn(),
    },
    mealDaySignal: {
      findMany: vi.fn(),
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

import {
  generateWeeklyPlan,
  getSwapOptions,
  setDayServings,
  swapDayMeal,
  swapDayMealWithChoice,
} from "@/lib/actions/plans";

describe("plans actions (phase 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegenerateShoppingListForUser.mockResolvedValue({ success: true, listId: "sl_1", itemCount: 5 });
    prismaMock.$transaction.mockImplementation(async (ops: unknown) => {
      if (typeof ops === "function") {
        return ops(prismaMock);
      }
      if (Array.isArray(ops)) {
        return Promise.all(ops as Promise<unknown>[]);
      }
      return null;
    });
    prismaMock.weeklyPlanEntry.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.weeklyPlanEntry.createMany.mockResolvedValue({ count: 5 });
    prismaMock.weeklyPlanEntry.upsert.mockResolvedValue({});
  });

  it("generateWeeklyPlan writes MealHistory entries for selected meals", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce(null);
    prismaMock.mealHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.mealDaySignal.findMany.mockResolvedValueOnce([]);
    prismaMock.meal.findMany.mockResolvedValueOnce([
      { id: "m1", name: "Meal 1" },
      { id: "m2", name: "Meal 2" },
      { id: "m3", name: "Meal 3" },
      { id: "m4", name: "Meal 4" },
      { id: "m5", name: "Meal 5" },
    ]);
    prismaMock.weeklyPlan.upsert.mockResolvedValueOnce({ id: "p1" });
    prismaMock.mealHistory.createMany.mockResolvedValueOnce({ count: 5 });

    const result = await generateWeeklyPlan();

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.mealHistory.createMany).toHaveBeenCalledTimes(1);
    const payload = prismaMock.mealHistory.createMany.mock.calls[0][0];
    expect(payload.data).toHaveLength(5);
    expect(prismaMock.meal.updateMany).not.toHaveBeenCalled();
  });

  it("returns error when meal library is too small for a unique week", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce(null);
    prismaMock.mealHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.mealDaySignal.findMany.mockResolvedValueOnce([]);
    prismaMock.meal.findMany.mockResolvedValueOnce([
      { id: "m1", name: "Meal 1" },
      { id: "m2", name: "Meal 2" },
    ]);
    prismaMock.weeklyPlan.upsert.mockResolvedValueOnce({ id: "p1" });
    prismaMock.mealHistory.createMany.mockResolvedValueOnce({ count: 5 });

    const result = await generateWeeklyPlan();

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(prismaMock.weeklyPlan.upsert).not.toHaveBeenCalled();
  });

  it("swapDayMeal logs selected replacement to MealHistory", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce({
      id: "p1",
      monday: "Meal A",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
    });
    prismaMock.mealHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.meal.findMany
      .mockResolvedValueOnce([
        { id: "mA", name: "Meal A" },
        { id: "mB", name: "Meal B" },
        { id: "mC", name: "Meal C" },
        { id: "mD", name: "Meal D" },
        { id: "mE", name: "Meal E" },
      ])
      .mockResolvedValueOnce([
        { id: "mA", name: "Meal A" },
        { id: "mB", name: "Meal B" },
        { id: "mC", name: "Meal C" },
        { id: "mD", name: "Meal D" },
        { id: "mE", name: "Meal E" },
        { id: "mF", name: "Meal F" },
      ]);
    prismaMock.weeklyPlan.update.mockResolvedValueOnce({ id: "p1" });
    prismaMock.mealHistory.create.mockResolvedValueOnce({ id: "u1" });

    const result = await swapDayMeal("monday");

    expect(result).toMatchObject({ success: true, newMeal: "Meal F" });
    expect(prismaMock.mealHistory.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.meal.updateMany).not.toHaveBeenCalled();
  });

  it("getSwapOptions returns filtered options with counts", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce({
      id: "p1",
      monday: "Meal A",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
    });
    prismaMock.mealHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.meal.findMany.mockResolvedValueOnce([
      { id: "mA", name: "Meal A", complexity: "SIMPLE", thumbsUpCount: 3, thumbsDownCount: 0 },
      { id: "mF", name: "Meal F", complexity: "SIMPLE", thumbsUpCount: 3, thumbsDownCount: 0 },
      { id: "mG", name: "Meal G", complexity: "COMPLEX", thumbsUpCount: 1, thumbsDownCount: 1 },
    ]);

    const result = await getSwapOptions("monday", {
      complexity: "SIMPLE",
      rating: "THUMBS_UP",
      limit: 4,
    });

    expect(result.options).toHaveLength(1);
    expect(result.options[0]).toMatchObject({ id: "mF", complexity: "SIMPLE", thumbsUpCount: 3, thumbsDownCount: 0 });
    expect(result.fallbackUsed).toBe(false);
    expect(result.counts.simple).toBeGreaterThanOrEqual(1);
  });

  it("swapDayMealWithChoice updates plan and writes meal history", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce({
      id: "p1",
      monday: "Meal A",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
    });
    prismaMock.meal.findUnique.mockResolvedValueOnce({
      id: "mZ",
      name: "Meal Z",
      userId: "user_1",
    });
    prismaMock.weeklyPlan.update.mockResolvedValueOnce({ id: "p1" });
    prismaMock.mealHistory.create.mockResolvedValueOnce({ id: "u1" });
    prismaMock.meal.findFirst.mockResolvedValueOnce({ id: "mA" });
    prismaMock.mealDaySignal.upsert.mockResolvedValue({});

    const result = await swapDayMealWithChoice("monday", "mZ");

    expect(result).toMatchObject({ success: true, newMeal: "Meal Z", mealId: "mZ" });
    expect(prismaMock.weeklyPlan.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.mealHistory.create).toHaveBeenCalledTimes(1);
  });

  it("swapDayMealWithChoice rejects selecting a meal already assigned on another day by id", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce({
      id: "p1",
      monday: "Old Meal A Name",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
      entries: [
        { day: "MONDAY", mealId: "mA" },
        { day: "TUESDAY", mealId: "mB" },
      ],
    });
    prismaMock.meal.findUnique.mockResolvedValueOnce({
      id: "mA",
      name: "Meal A (Renamed)",
      userId: "user_1",
      defaultServings: 4,
    });

    const result = await swapDayMealWithChoice("tuesday", "mA");

    expect(result).toEqual({ error: "Måltiden finns redan i veckoplanen" });
    expect(prismaMock.weeklyPlan.update).not.toHaveBeenCalled();
    expect(prismaMock.mealHistory.create).not.toHaveBeenCalled();
  });

  it("getSwapOptions returns fallback options when filters have zero matches", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce({
      monday: "Meal A",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
    });
    prismaMock.mealHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.meal.findMany.mockResolvedValueOnce([
      { id: "mA", name: "Meal A", complexity: "SIMPLE", thumbsUpCount: 3, thumbsDownCount: 0 },
      { id: "mF", name: "Meal F", complexity: "MEDIUM", thumbsUpCount: 1, thumbsDownCount: 1 },
      { id: "mG", name: "Meal G", complexity: "COMPLEX", thumbsUpCount: 0, thumbsDownCount: 2 },
    ]);
    prismaMock.mealDaySignal.findMany.mockResolvedValueOnce([]);

    const result = await getSwapOptions("monday", {
      complexity: "SIMPLE",
      recency: "FRESH_ONLY",
      limit: 4,
    });

    expect(result.options).toHaveLength(0);
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackOptions.length).toBeGreaterThan(0);
  });

  it("getSwapOptions excludes meals already assigned in entries even if plan names are stale", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce({
      id: "p1",
      monday: "Old Meal A Name",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
      entries: [
        { day: "MONDAY", mealId: "mA" },
        { day: "TUESDAY", mealId: "mB" },
      ],
    });
    prismaMock.mealHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.meal.findMany.mockResolvedValueOnce([
      { id: "mA", name: "Meal A (Renamed)", complexity: "SIMPLE", thumbsUpCount: 0, thumbsDownCount: 0 },
      { id: "mF", name: "Meal F", complexity: "MEDIUM", thumbsUpCount: 0, thumbsDownCount: 0 },
    ]);

    const result = await getSwapOptions("wednesday", { limit: 8 });

    expect(result.options.map((option) => option.id)).toEqual(["mF"]);
  });

  it("setDayServings updates servings for a specific day", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce({
      id: "p1",
      monday: "Meal A",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
    });
    prismaMock.meal.findFirst.mockResolvedValueOnce({ id: "mA" });
    prismaMock.weeklyPlanEntry.upsert.mockResolvedValueOnce({});

    const result = await setDayServings("monday", 6);

    expect(result).toMatchObject({ success: true, servings: 6 });
    expect(prismaMock.weeklyPlanEntry.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ servings: 6 }),
        create: expect.objectContaining({ servings: 6 }),
      })
    );
  });
});
