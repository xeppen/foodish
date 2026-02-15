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
          meal: {
            id: "m1",
            name: "Meal A",
            ingredients: null,
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
});
