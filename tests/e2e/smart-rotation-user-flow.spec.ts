import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TEST_USER_ID = process.env.E2E_TEST_USER_ID ?? "e2e_smart_rotation_user";
const PREVIOUS_WEEK_MEALS = ["E2E Meal 1", "E2E Meal 2", "E2E Meal 3", "E2E Meal 4", "E2E Meal 5"];
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;

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

function isDeadlockError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("code: \"40P01\"") || error.message.includes("deadlock detected");
}

async function withDeadlockRetry<T>(operation: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isDeadlockError(error) || attempt === maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 100));
    }
  }

  throw lastError;
}

async function cleanupUserData(userId: string) {
  await withDeadlockRetry(async () => {
    await prisma.shoppingList.deleteMany({ where: { userId } });
    await prisma.weeklyPlan.deleteMany({ where: { userId } });
    await prisma.mealHistory.deleteMany({ where: { userId } });
    await prisma.usageHistory.deleteMany({ where: { userId } });
    await prisma.mealDaySignal.deleteMany({ where: { userId } });
    await prisma.meal.deleteMany({ where: { userId } });
  });
}

async function seedSmartRotationScenario(userId: string) {
  await cleanupUserData(userId);

  await prisma.meal.createMany({
    data: Array.from({ length: 6 }, (_, index) => ({
      userId,
      name: `E2E Meal ${index + 1}`,
      complexity: "MEDIUM",
    })),
  });

  const meals = await prisma.meal.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });

  await prisma.mealIngredient.createMany({
    data: meals.map((meal, index) => ({
      mealId: meal.id,
      position: 0,
      name: `E2E Ingredient ${index + 1}`,
      canonicalName: `e2e_ingredient_${index + 1}`,
      amount: 1,
      unit: "st",
    })),
  });

  const byName = new Map(meals.map((meal) => [meal.name, meal.id]));
  const weekStart = getWeekStart();
  const previousWeek = subtractDays(weekStart, 7);

  await prisma.mealHistory.createMany({
    data: PREVIOUS_WEEK_MEALS.map((name, index) => ({
      userId,
      mealId: byName.get(name)!,
      weekStartDate: previousWeek,
      dateAssigned: addDays(previousWeek, index),
    })),
  });
}

test.describe("Smart Rotation user flow", () => {
  test.beforeEach(async () => {
    await seedSmartRotationScenario(TEST_USER_ID);
  });

  test.afterAll(async () => {
    await cleanupUserData(TEST_USER_ID);
    await prisma.$disconnect();
  });

  test("shows a varied week with no duplicates and avoids previous-week exact combination", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Veckans middagsplan" }),
    ).toBeVisible();

    const mealNames: string[] = [];
    for (const day of DAYS) {
      const locator = page.getByTestId(`meal-name-${day}`);
      await expect(locator).toBeVisible();
      const text = (await locator.textContent())?.trim();
      if (text) {
        mealNames.push(text);
      }
    }

    expect(mealNames).toHaveLength(5);
    expect(new Set(mealNames).size).toBe(5);
    expect(mealNames).toContain("E2E Meal 6");
    expect(new Set(mealNames)).not.toEqual(new Set(PREVIOUS_WEEK_MEALS));
  });

  test("quick swap keeps week unique for the user", async ({ page }) => {
    await page.goto("/");

    const mondayMeal = page.getByTestId("meal-name-monday");
    await expect(mondayMeal).toBeVisible();
    const before = (await mondayMeal.textContent())?.trim() ?? "";

    const mondaySwap = page.getByTestId("swap-button-monday");
    await mondaySwap.click();

    await expect(mondayMeal).not.toHaveText(before, { timeout: 10_000 });

    const namesAfterSwap = await Promise.all(
      DAYS.map(async (day) => ((await page.getByTestId(`meal-name-${day}`).textContent()) ?? "").trim())
    );
    expect(new Set(namesAfterSwap).size).toBe(5);
  });

  test("blocking a day disables swap and removes that day from shopping list until unblocked", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Veckans middagsplan" }),
    ).toBeVisible();

    const mondayMealText =
      ((await page.getByTestId("meal-name-monday").textContent()) ?? "").trim();
    const mondayMealMatch = mondayMealText.match(/E2E Meal (\d+)/);
    expect(mondayMealMatch).not.toBeNull();
    const mondayIngredient = `E2E Ingredient ${mondayMealMatch![1]}`;

    await page.getByRole("button", { name: /Inköp/i }).click();
    await expect(page.getByRole("heading", { name: "Inköpslista" })).toBeVisible();
    await expect(page.getByText(mondayIngredient)).toBeVisible();
    await page.locator("div[aria-hidden='false'] > button.absolute.inset-0").click();
    await expect(page.getByRole("heading", { name: "Inköpslista" })).toBeHidden();

    await page.getByTestId("block-button-monday").click();
    await expect(page.getByTestId("block-button-monday")).toHaveAttribute(
      "aria-label",
      "Ta med igen",
    );
    await expect(page.getByTestId("swap-button-monday")).toBeDisabled();
    await expect(page.getByText("Överhoppad")).toBeVisible();

    await expect(page.getByText(mondayIngredient)).toHaveCount(0);

    await page.getByTestId("block-button-monday").click();
    await expect(page.getByTestId("block-button-monday")).toHaveAttribute(
      "aria-label",
      "Hoppa över dag",
    );
    await expect(page.getByTestId("swap-button-monday")).toBeEnabled();

    await page.getByRole("button", { name: /Inköp/i }).click();
    await expect(page.getByRole("heading", { name: "Inköpslista" })).toBeVisible();
    await expect(page.getByText(mondayIngredient)).toBeVisible();
  });
});
