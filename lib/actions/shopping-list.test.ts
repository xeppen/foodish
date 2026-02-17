import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCurrentUser, mockRevalidatePath, prismaMock } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
  prismaMock: {
    weeklyPlan: {
      findUnique: vi.fn(),
    },
    meal: {
      findMany: vi.fn(),
    },
    shoppingList: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    shoppingListItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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

import { generateCurrentWeekShoppingList, toggleShoppingListItem } from "@/lib/actions/shopping-list";
import { getCurrentWeekShoppingList, regenerateShoppingListForUser } from "@/lib/actions/shopping-list";

describe("shopping list actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: "user_1" });
    prismaMock.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
    prismaMock.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.shoppingListItem.createMany.mockResolvedValue({ count: 2 });
  });

  it("generates shopping list from plan entries", async () => {
    prismaMock.weeklyPlan.findUnique.mockResolvedValue({
      id: "p1",
      monday: "Meal A",
      entries: [
        {
          servings: 8,
          meal: {
            id: "m1",
            name: "Meal A",
            ingredients: null,
            defaultServings: 4,
            mealIngredients: [
              { name: "Potatis", canonicalName: "potatis", amount: 1, unit: "kg" },
              { name: "Salt", canonicalName: "salt", amount: null, unit: null },
            ],
          },
        },
      ],
    });
    prismaMock.shoppingList.upsert.mockResolvedValue({ id: "sl1" });

    const result = await generateCurrentWeekShoppingList();

    expect(result).toMatchObject({ success: true, listId: "sl1" });
    expect(prismaMock.shoppingListItem.createMany).toHaveBeenCalledTimes(1);
    const payload = prismaMock.shoppingListItem.createMany.mock.calls[0][0];
    const potatis = payload.data.find((row: any) => row.canonicalName === "potatis");
    expect(potatis).toMatchObject({ amount: 2000, unit: "g" });
  });

  it("toggles checked state for shopping item", async () => {
    prismaMock.shoppingListItem.findUnique.mockResolvedValue({
      id: "item1",
      shoppingList: { userId: "user_1" },
    });
    prismaMock.shoppingListItem.update.mockResolvedValue({ id: "item1", isChecked: true });

    const result = await toggleShoppingListItem("item1", true);

    expect(result).toEqual({ success: true });
    expect(prismaMock.shoppingListItem.update).toHaveBeenCalledWith({
      where: { id: "item1" },
      data: { isChecked: true },
    });
  });

  it("getCurrentWeekShoppingList returns null for unauthenticated user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await getCurrentWeekShoppingList();

    expect(result).toBeNull();
    expect(prismaMock.shoppingList.findUnique).not.toHaveBeenCalled();
  });

  it("toggleShoppingListItem returns not found for foreign item", async () => {
    prismaMock.shoppingListItem.findUnique.mockResolvedValue({
      id: "item1",
      shoppingList: { userId: "other_user" },
    });

    const result = await toggleShoppingListItem("item1", true);

    expect(result).toEqual({ error: "Listobjektet hittades inte" });
    expect(prismaMock.shoppingListItem.update).not.toHaveBeenCalled();
  });

  it("generateCurrentWeekShoppingList returns auth error when user is missing", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await generateCurrentWeekShoppingList();

    expect(result).toEqual({ error: "Ej behörig" });
  });

  it("regenerateShoppingListForUser returns error when no plan exists", async () => {
    prismaMock.shoppingList.findUnique.mockResolvedValue(null);
    prismaMock.weeklyPlan.findUnique.mockResolvedValue(null);

    const result = await regenerateShoppingListForUser("user_1", new Date("2025-01-06T00:00:00.000Z"), {
      revalidate: false,
    });

    expect(result).toEqual({ error: "Ingen veckoplan hittades" });
  });

  it("regenerateShoppingListForUser falls back to weekday meal names and preserves checked items", async () => {
    prismaMock.shoppingList.findUnique.mockResolvedValue({
      id: "sl1",
      items: [{ canonicalName: "salt", isChecked: true }],
    });
    prismaMock.weeklyPlan.findUnique.mockResolvedValue({
      id: "p1",
      monday: "Meal A",
      tuesday: "Meal B",
      wednesday: null,
      thursday: null,
      friday: null,
      entries: [],
    });
    prismaMock.meal.findMany.mockResolvedValue([
      {
        id: "m1",
        name: "Meal A",
        ingredients: ["Salt"],
        defaultServings: 4,
        mealIngredients: [],
      },
      {
        id: "m2",
        name: "Meal B",
        ingredients: ["Peppar"],
        defaultServings: 4,
        mealIngredients: [],
      },
    ]);
    prismaMock.shoppingList.upsert.mockResolvedValue({ id: "sl1" });

    const result = await regenerateShoppingListForUser("user_1", new Date("2025-01-06T00:00:00.000Z"), {
      revalidate: false,
    });

    expect(result).toMatchObject({ success: true, listId: "sl1" });
    expect(prismaMock.meal.findMany).toHaveBeenCalledTimes(1);
    const createManyCall = prismaMock.shoppingListItem.createMany.mock.calls[0][0];
    const saltRow = createManyCall.data.find((row: any) => row.canonicalName === "salt");
    expect(saltRow?.isChecked).toBe(true);
  });
});
