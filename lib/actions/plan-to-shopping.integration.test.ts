import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_USER_ID = "integration_shopping_user";
const TEST_DEFAULT_USER_ID = "integration_default_meals_user";

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

vi.mock("@/lib/ai/ingredients", () => ({
  generateIngredientDraft: vi.fn(async (dishName: string) => ({
    dishName,
    ingredients: [
      { name: "Lök", amount: 1, unit: "st", optional: false, confidence: 0.9, needsReview: false },
      { name: "Salt", amount: null, unit: null, optional: false, confidence: 0.6, needsReview: true },
    ],
    model: "integration-mock",
    cached: false,
  })),
}));

import { prisma } from "@/lib/prisma";
import { initializeStarterMeals } from "@/lib/actions/meals";
import { generateWeeklyPlan } from "@/lib/actions/plans";
import { generateCurrentWeekShoppingList, getCurrentWeekShoppingList } from "@/lib/actions/shopping-list";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

async function cleanupTestData(userId: string) {
  await prisma.shoppingList.deleteMany({ where: { userId } });
  await prisma.weeklyPlan.deleteMany({ where: { userId } });
  await prisma.usageHistory.deleteMany({ where: { userId } });
  await prisma.mealDaySignal.deleteMany({ where: { userId } });
  await prisma.meal.deleteMany({ where: { userId } });
}

describeIfDatabase("plan -> shopping list integration (live DB)", () => {
  beforeEach(async () => {
    mockGetCurrentUser.mockResolvedValue({ id: TEST_USER_ID, name: "Integration User" });
    await cleanupTestData(TEST_USER_ID);

    await prisma.meal.createMany({
      data: [
        { name: "Köttbullar med potatis", userId: TEST_USER_ID, complexity: "MEDIUM" },
        { name: "Fiskpinnar med potatis", userId: TEST_USER_ID, complexity: "SIMPLE" },
        { name: "Pannkakor med sylt", userId: TEST_USER_ID, complexity: "SIMPLE" },
        { name: "Kyckling med ris", userId: TEST_USER_ID, complexity: "MEDIUM" },
        { name: "Tacos", userId: TEST_USER_ID, complexity: "MEDIUM" },
      ],
    });

    const meals = await prisma.meal.findMany({ where: { userId: TEST_USER_ID } });
    const byName = Object.fromEntries(meals.map((meal) => [meal.name, meal.id]));

    await prisma.mealIngredient.createMany({
      data: [
        { mealId: byName["Köttbullar med potatis"], position: 0, name: "Potatis", canonicalName: "potatis", amount: 1, unit: "kg" },
        { mealId: byName["Köttbullar med potatis"], position: 1, name: "Köttbullar", canonicalName: "köttbullar", amount: 600, unit: "g" },

        { mealId: byName["Fiskpinnar med potatis"], position: 0, name: "Potatis", canonicalName: "potatis", amount: 500, unit: "g" },
        { mealId: byName["Fiskpinnar med potatis"], position: 1, name: "Fiskpinnar", canonicalName: "fiskpinnar", amount: 400, unit: "g" },

        { mealId: byName["Pannkakor med sylt"], position: 0, name: "Sylt", canonicalName: "sylt", amount: null, unit: null },
        { mealId: byName["Pannkakor med sylt"], position: 1, name: "Mjöl", canonicalName: "mjöl", amount: 3, unit: "dl" },

        { mealId: byName["Kyckling med ris"], position: 0, name: "Kyckling", canonicalName: "kyckling", amount: 700, unit: "g" },
        { mealId: byName["Kyckling med ris"], position: 1, name: "Ris", canonicalName: "ris", amount: 4, unit: "dl" },
      ],
    });

    await prisma.meal.update({
      where: { id: byName["Tacos"] },
      data: { ingredients: ["Köttfärs", "Tacokrydda"] },
    });
  });

  afterAll(async () => {
    await cleanupTestData(TEST_USER_ID);
  });

  it("generates weekly plan and aggregates shopping list with correct totals", async () => {
    const planResult = await generateWeeklyPlan({ force: true, revalidate: false });
    expect(planResult).toMatchObject({ success: true });

    const listResult = await generateCurrentWeekShoppingList();
    expect(listResult).toMatchObject({ success: true });

    const list = await getCurrentWeekShoppingList();
    expect(list).not.toBeNull();
    if (!list) return;

    const potatis = list.items.find((item) => item.canonicalName === "potatis");
    expect(potatis).toBeDefined();
    expect(potatis?.amount).toBe(1500);
    expect(potatis?.unit).toBe("g");

    const sylt = list.items.find((item) => item.canonicalName === "sylt");
    expect(sylt).toBeDefined();
    expect(sylt?.unresolved).toBe(true);

    const nullItem = list.items.find((item) => item.displayName.toLowerCase() === "null");
    expect(nullItem).toBeUndefined();
  });

  it("is idempotent for same week (single list per user/week)", async () => {
    const weekStart = getWeekStart();

    await generateWeeklyPlan({ force: true, revalidate: false });
    const first = await generateCurrentWeekShoppingList();
    const second = await generateCurrentWeekShoppingList();

    expect(first).toMatchObject({ success: true });
    expect(second).toMatchObject({ success: true });

    const lists = await prisma.shoppingList.findMany({
      where: {
        userId: TEST_USER_ID,
        weekStartDate: weekStart,
      },
    });

    expect(lists).toHaveLength(1);
  });
});

describeIfDatabase("starter-pack user integration (live DB)", () => {
  beforeEach(async () => {
    mockGetCurrentUser.mockResolvedValue({ id: TEST_DEFAULT_USER_ID, name: "Default Integration User" });
    await cleanupTestData(TEST_DEFAULT_USER_ID);
  });

  afterAll(async () => {
    await cleanupTestData(TEST_DEFAULT_USER_ID);
  });

  it("initializes starter meals and can generate plan + shopping list", async () => {
    const starterResult = await initializeStarterMeals();
    expect(starterResult).toMatchObject({ success: true });

    const mealCount = await prisma.meal.count({ where: { userId: TEST_DEFAULT_USER_ID } });
    expect(mealCount).toBeGreaterThanOrEqual(18);

    const planResult = await generateWeeklyPlan({ force: true, revalidate: false });
    expect(planResult).toMatchObject({ success: true });

    const listResult = await generateCurrentWeekShoppingList();
    expect(listResult).toMatchObject({ success: true });
    expect((listResult as { itemCount?: number }).itemCount).toBeGreaterThan(0);
  });
});
