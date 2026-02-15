import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCurrentUser,
  mockRevalidatePath,
  prismaMock,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
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
    usageHistory: {
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

  it("generateWeeklyPlan writes UsageHistory entries for selected meals", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce(null);
    prismaMock.usageHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.usageHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.mealDaySignal.findMany.mockResolvedValueOnce([]);
    prismaMock.meal.findMany.mockResolvedValueOnce([
      { id: "m1", name: "Meal 1" },
      { id: "m2", name: "Meal 2" },
      { id: "m3", name: "Meal 3" },
      { id: "m4", name: "Meal 4" },
      { id: "m5", name: "Meal 5" },
    ]);
    prismaMock.weeklyPlan.upsert.mockResolvedValueOnce({ id: "p1" });
    prismaMock.usageHistory.createMany.mockResolvedValueOnce({ count: 5 });

    const result = await generateWeeklyPlan();

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.usageHistory.createMany).toHaveBeenCalledTimes(1);
    const payload = prismaMock.usageHistory.createMany.mock.calls[0][0];
    expect(payload.data).toHaveLength(5);
    expect(prismaMock.meal.updateMany).not.toHaveBeenCalled();
  });

  it("returns warning when meal library is too small and repeats are required", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce(null);
    prismaMock.usageHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.usageHistory.findMany.mockResolvedValueOnce([]);
    prismaMock.mealDaySignal.findMany.mockResolvedValueOnce([]);
    prismaMock.meal.findMany.mockResolvedValueOnce([
      { id: "m1", name: "Meal 1" },
      { id: "m2", name: "Meal 2" },
    ]);
    prismaMock.weeklyPlan.upsert.mockResolvedValueOnce({ id: "p1" });
    prismaMock.usageHistory.createMany.mockResolvedValueOnce({ count: 5 });

    const result = await generateWeeklyPlan();

    expect(result).toMatchObject({ success: true });
    expect(result.warning).toBeDefined();
  });

  it("swapDayMeal logs selected replacement to UsageHistory", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    prismaMock.weeklyPlan.findUnique.mockResolvedValueOnce({
      id: "p1",
      monday: "Meal A",
      tuesday: "Meal B",
      wednesday: "Meal C",
      thursday: "Meal D",
      friday: "Meal E",
    });
    prismaMock.usageHistory.findMany.mockResolvedValueOnce([]);
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
    prismaMock.usageHistory.create.mockResolvedValueOnce({ id: "u1" });

    const result = await swapDayMeal("monday");

    expect(result).toMatchObject({ success: true, newMeal: "Meal F" });
    expect(prismaMock.usageHistory.create).toHaveBeenCalledTimes(1);
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
    prismaMock.usageHistory.findMany.mockResolvedValueOnce([]);
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

  it("swapDayMealWithChoice updates plan and writes usage history", async () => {
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
    prismaMock.usageHistory.create.mockResolvedValueOnce({ id: "u1" });
    prismaMock.meal.findFirst.mockResolvedValueOnce({ id: "mA" });
    prismaMock.mealDaySignal.upsert.mockResolvedValue({});

    const result = await swapDayMealWithChoice("monday", "mZ");

    expect(result).toMatchObject({ success: true, newMeal: "Meal Z", mealId: "mZ" });
    expect(prismaMock.weeklyPlan.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.usageHistory.create).toHaveBeenCalledTimes(1);
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
    prismaMock.usageHistory.findMany.mockResolvedValueOnce([]);
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
