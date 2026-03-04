import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TEST_USER_ID = process.env.E2E_TEST_USER_ID ?? "e2e_smart_rotation_user";
const STARTER_MEAL_NAME = "E2E Starter Review Meal";

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

async function seedStarterScenario() {
  await cleanupUserData(TEST_USER_ID);
  await prisma.commonMeal.upsert({
    where: { name: STARTER_MEAL_NAME },
    update: {
      locale: "sv",
      cuisine: "E2E",
      complexity: "MEDIUM",
      imageUrl: null,
      sortOrder: -100,
    },
    create: {
      name: STARTER_MEAL_NAME,
      locale: "sv",
      cuisine: "E2E",
      complexity: "MEDIUM",
      imageUrl: null,
      sortOrder: -100,
    },
  });
}

async function openStarterMealsPanel(page: import("@playwright/test").Page) {
  const starterPanel = page.getByTestId("starter-meals-panel");
  const starterPanelVisible = await starterPanel.isVisible().catch(() => false);
  if (starterPanelVisible) {
    return;
  }

  const drawerOpenButton = page.getByRole("button", { name: "Måltider", exact: true });
  const drawerOpenButtonVisible = await drawerOpenButton.isVisible().catch(() => false);
  if (drawerOpenButtonVisible) {
    await drawerOpenButton.click();
  }

  const openStarterButton = page.getByTestId("open-starter-meals-panel-button").last();
  await expect(openStarterButton).toBeVisible();
  await openStarterButton.scrollIntoViewIfNeeded();
  await openStarterButton.click({ timeout: 5000 }).catch(async () => {
    await openStarterButton.click({ force: true });
  });
}

test.describe("Starter meal import review flow", () => {
  test.beforeEach(async () => {
    await seedStarterScenario();
  });

  test.afterAll(async () => {
    await cleanupUserData(TEST_USER_ID);
    await prisma.commonMeal.deleteMany({ where: { name: STARTER_MEAL_NAME } });
    await prisma.$disconnect();
  });

  test("add to my meals opens review editor and marks meal as added", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /Veckans/i })).toBeVisible();

    const starterPanel = page.getByTestId("starter-meals-panel");
    await openStarterMealsPanel(page);
    await expect(starterPanel).toBeVisible();

    const starterRow = page
      .locator('[data-testid^="starter-row-"]')
      .filter({ hasText: STARTER_MEAL_NAME })
      .first();
    await expect(starterRow).toBeVisible();
    await starterRow.getByRole("button", { name: "Lägg till i mina måltider" }).click();

    await expect(starterPanel).toHaveCount(0);
    await expect(page.getByText(/Granska .*innan du sparar/i)).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: STARTER_MEAL_NAME })).toBeVisible();
    await expect(page.getByPlaceholder("Måltidsnamn")).toHaveValue(STARTER_MEAL_NAME);
    const saveButton = page.getByRole("button", { name: /Spara/i });
    await expect(saveButton).toBeVisible();

    await saveButton.click();
    await expect(page.getByRole("heading", { level: 3, name: STARTER_MEAL_NAME })).toHaveCount(0);
    await expect(page.getByText(STARTER_MEAL_NAME)).toBeVisible();

    await openStarterMealsPanel(page);
    await expect(starterPanel).toBeVisible();
    await expect(starterRow.getByText("Tillagd")).toBeVisible();
  });
});
