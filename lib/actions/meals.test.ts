import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCurrentUser, mockRevalidatePath, mockGenerateIngredientDraft, prismaMock } = vi.hoisted(
  () => ({
    mockGetCurrentUser: vi.fn(),
    mockRevalidatePath: vi.fn(),
    mockGenerateIngredientDraft: vi.fn(),
    prismaMock: {
      meal: {
        count: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      commonMeal: {
        findUnique: vi.fn(),
      },
      mealIngredient: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      mealDaySignal: {
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  })
);

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/ai/ingredients", () => ({
  generateIngredientDraft: mockGenerateIngredientDraft,
}));

import {
  addMeal,
  addStarterMealToUserMeals,
  bulkGenerateMealIngredients,
  resetMealLearning,
  updateMeal,
  voteMeal,
} from "@/lib/actions/meals";
import { deleteMeal } from "@/lib/actions/meals";

describe("meals actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
    mockGenerateIngredientDraft.mockResolvedValue({
      dishName: "Default",
      ingredients: [{ name: "Lök", amount: 1, unit: "st", optional: false, confidence: 0.8, needsReview: false }],
      model: "test",
      cached: false,
    });
    prismaMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === "function") {
        return arg(prismaMock);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[]);
      }
      return null;
    });
  });

  it("addMeal enriches meal metadata and stores defaults", async () => {
    prismaMock.meal.create.mockResolvedValue({ id: "m1" });

    const formData = new FormData();
    formData.append("name", "Spicy Chicken Curry with Rice");

    const result = await addMeal(formData);

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.meal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Spicy Chicken Curry with Rice",
          userId: "user_1",
          complexity: expect.any(String),
          tags: expect.any(Array),
          ingredients: expect.any(Array),
          imagePrompt: expect.any(String),
          imageUrl: expect.stringContaining("/api/meal-image?meal="),
          preferredDays: [],
          defaultServings: 4,
        }),
      })
    );
  });

  it("updateMeal updates name and complexity", async () => {
    prismaMock.meal.findUnique.mockResolvedValue({ id: "m1", userId: "user_1" });
    prismaMock.meal.update.mockResolvedValue({ id: "m1" });

    const formData = new FormData();
    formData.append("name", "Kycklinggryta");
    formData.append("complexity", "SIMPLE");

    const result = await updateMeal("m1", formData);

    expect(result).toEqual({ success: true });
    expect(prismaMock.meal.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: {
        name: "Kycklinggryta",
        complexity: "SIMPLE",
        preferredDays: [],
        defaultServings: 4,
      },
    });
  });

  it("voteMeal increments thumbs-up count", async () => {
    prismaMock.meal.findUnique.mockResolvedValue({ id: "m1", userId: "user_1" });
    prismaMock.meal.update.mockResolvedValue({
      id: "m1",
      thumbsUpCount: 3,
      thumbsDownCount: 1,
    });

    const result = await voteMeal("m1", "up");

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.meal.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { thumbsUpCount: { increment: 1 } },
      select: {
        id: true,
        thumbsUpCount: true,
        thumbsDownCount: true,
      },
    });
  });

  it("addMeal uses provided image URL when present", async () => {
    prismaMock.meal.create.mockResolvedValue({ id: "m2" });

    const formData = new FormData();
    formData.append("name", "Tomatpasta");
    formData.append("imageUrl", "https://images.example.com/tomatpasta.jpg");

    const result = await addMeal(formData);

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.meal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          imageUrl: "https://images.example.com/tomatpasta.jpg",
        }),
      })
    );
  });

  it("addMeal stores preferred days from form data", async () => {
    prismaMock.meal.create.mockResolvedValue({ id: "m3" });

    const formData = new FormData();
    formData.append("name", "Tacos");
    formData.append("preferredDays", "FRIDAY");
    formData.append("preferredDays", "SATURDAY");

    const result = await addMeal(formData);

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.meal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          preferredDays: ["FRIDAY", "SATURDAY"],
        }),
      })
    );
  });

  it("updateMeal persists preferred days changes", async () => {
    prismaMock.meal.findUnique.mockResolvedValue({ id: "m1", userId: "user_1" });
    prismaMock.meal.update.mockResolvedValue({ id: "m1" });

    const formData = new FormData();
    formData.append("name", "Pasta");
    formData.append("complexity", "MEDIUM");
    formData.append("preferredDays", "MONDAY");
    formData.append("preferredDays", "THURSDAY");

    const result = await updateMeal("m1", formData);

    expect(result).toEqual({ success: true });
    expect(prismaMock.meal.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: {
        name: "Pasta",
        complexity: "MEDIUM",
        preferredDays: ["MONDAY", "THURSDAY"],
        defaultServings: 4,
      },
    });
  });

  it("resetMealLearning clears day signals", async () => {
    prismaMock.mealDaySignal.deleteMany.mockResolvedValue({ count: 2 });

    const result = await resetMealLearning();

    expect(result).toEqual({ success: true });
    expect(prismaMock.mealDaySignal.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
  });

  it("bulkGenerateMealIngredients fills meals missing ingredient rows", async () => {
    prismaMock.meal.findMany.mockResolvedValue([
      { id: "m1", name: "Tacos", mealIngredients: [] },
      { id: "m2", name: "Pasta", mealIngredients: [{ id: "i1" }] },
    ]);
    prismaMock.meal.update.mockResolvedValue({ id: "m1" });
    prismaMock.mealIngredient.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.mealIngredient.createMany.mockResolvedValue({ count: 1 });

    const result = await bulkGenerateMealIngredients({ overwrite: false });

    expect(result).toMatchObject({ success: true, updated: 1, skipped: 1, failed: 0, total: 2 });
    expect(mockGenerateIngredientDraft).toHaveBeenCalledWith("Tacos");
    expect(prismaMock.mealIngredient.createMany).toHaveBeenCalledTimes(1);
  });

  it("addMeal returns auth error when user is missing", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const formData = new FormData();
    formData.append("name", "Tacos");
    const result = await addMeal(formData);

    expect(result).toEqual({ error: "Ej behörig" });
    expect(prismaMock.meal.create).not.toHaveBeenCalled();
  });

  it("addMeal rejects malformed ingredients payload", async () => {
    const formData = new FormData();
    formData.append("name", "Tacos");
    formData.append("ingredients", "{invalid}");

    const result = await addMeal(formData);

    expect(result).toEqual({ error: "Ingredienslistan är ogiltig" });
    expect(prismaMock.meal.create).not.toHaveBeenCalled();
  });

  it("addMeal rejects image URL with unsupported protocol", async () => {
    const formData = new FormData();
    formData.append("name", "Tacos");
    formData.append("imageUrl", "ftp://images.example.com/tacos.jpg");

    const result = await addMeal(formData);

    expect(result).toEqual({ error: "Bild-URL måste börja med http:// eller https://" });
    expect(prismaMock.meal.create).not.toHaveBeenCalled();
  });

  it("updateMeal returns not found for meal owned by another user", async () => {
    prismaMock.meal.findUnique.mockResolvedValue({ id: "m1", userId: "other_user" });
    const formData = new FormData();
    formData.append("name", "Pasta");

    const result = await updateMeal("m1", formData);

    expect(result).toEqual({ error: "Måltiden hittades inte" });
    expect(prismaMock.meal.update).not.toHaveBeenCalled();
  });

  it("deleteMeal removes owned meal", async () => {
    prismaMock.meal.findUnique.mockResolvedValue({ id: "m1", userId: "user_1" });
    prismaMock.meal.delete.mockResolvedValue({ id: "m1" });

    const result = await deleteMeal("m1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.meal.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
  });

  it("deleteMeal returns not found when meal is missing", async () => {
    prismaMock.meal.findUnique.mockResolvedValue(null);

    const result = await deleteMeal("m1");

    expect(result).toEqual({ error: "Måltiden hittades inte" });
    expect(prismaMock.meal.delete).not.toHaveBeenCalled();
  });

  it("voteMeal increments thumbs-down count", async () => {
    prismaMock.meal.findUnique.mockResolvedValue({ id: "m1", userId: "user_1" });
    prismaMock.meal.update.mockResolvedValue({
      id: "m1",
      thumbsUpCount: 1,
      thumbsDownCount: 2,
    });

    const result = await voteMeal("m1", "down");

    expect(result).toMatchObject({ success: true });
    expect(prismaMock.meal.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { thumbsDownCount: { increment: 1 } },
      select: {
        id: true,
        thumbsUpCount: true,
        thumbsDownCount: true,
      },
    });
  });

  it("bulkGenerateMealIngredients reports failures for empty AI drafts", async () => {
    prismaMock.meal.findMany.mockResolvedValue([{ id: "m1", name: "Soup", mealIngredients: [] }]);
    mockGenerateIngredientDraft.mockResolvedValue({
      dishName: "Soup",
      ingredients: [],
      model: "test",
      cached: false,
    });

    const result = await bulkGenerateMealIngredients({ overwrite: true });

    expect(result).toMatchObject({ success: true, updated: 0, skipped: 0, failed: 1, total: 1 });
  });

  it("addStarterMealToUserMeals rejects unauthenticated users", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await addStarterMealToUserMeals("cm_1");

    expect(result).toEqual({ error: "Ej behörig" });
  });

  it("addStarterMealToUserMeals returns error when starter meal is missing", async () => {
    prismaMock.commonMeal.findUnique.mockResolvedValue(null);

    const result = await addStarterMealToUserMeals("cm_missing");

    expect(result).toEqual({ error: "Startmåltiden hittades inte" });
  });

  it("addStarterMealToUserMeals returns existing meal when starter source is already linked", async () => {
    prismaMock.commonMeal.findUnique.mockResolvedValue({
      id: "cm_1",
      name: "Köttbullar med potatismos",
      complexity: "MEDIUM",
      imageUrl: null,
    });
    prismaMock.meal.findFirst.mockResolvedValue({ id: "m_existing" });
    prismaMock.meal.findUnique.mockResolvedValue({
      id: "m_existing",
      name: "Köttbullar med potatismos",
      complexity: "MEDIUM",
      sourceCommonMealId: "cm_1",
      imageUrl: null,
      defaultServings: 4,
      preferredDays: [],
      ingredients: ["Köttbullar"],
      thumbsUpCount: 0,
      thumbsDownCount: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      mealIngredients: [],
    });

    const result = await addStarterMealToUserMeals("cm_1");

    expect(result).toMatchObject({
      success: true,
      alreadyAdded: true,
      mealId: "m_existing",
      meal: expect.objectContaining({
        id: "m_existing",
        name: "Köttbullar med potatismos",
      }),
    });
    expect(prismaMock.meal.create).not.toHaveBeenCalled();
  });

  it("addStarterMealToUserMeals reports name conflict instead of silently linking by name", async () => {
    prismaMock.commonMeal.findUnique.mockResolvedValue({
      id: "cm_1",
      name: "Köttbullar med potatismos",
      complexity: "MEDIUM",
      imageUrl: null,
    });
    prismaMock.meal.findFirst.mockResolvedValue(null);
    prismaMock.meal.findMany.mockResolvedValue([
      { id: "m_conflict", name: "KÖTTBULLAR MED POTATISMOS", sourceCommonMealId: null },
    ]);
    prismaMock.meal.findUnique.mockResolvedValue({
      id: "m_conflict",
      name: "Köttbullar med potatismos",
      complexity: "MEDIUM",
      sourceCommonMealId: null,
      imageUrl: null,
      defaultServings: 4,
      preferredDays: [],
      ingredients: ["Köttbullar"],
      thumbsUpCount: 0,
      thumbsDownCount: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      mealIngredients: [],
    });

    const result = await addStarterMealToUserMeals("cm_1");

    expect(result).toMatchObject({
      success: true,
      alreadyAdded: false,
      nameConflict: true,
      mealId: "m_conflict",
      meal: expect.objectContaining({
        id: "m_conflict",
        name: "Köttbullar med potatismos",
      }),
    });
    expect(prismaMock.meal.create).not.toHaveBeenCalled();
  });

  it("addStarterMealToUserMeals creates user meal from starter library", async () => {
    prismaMock.commonMeal.findUnique.mockResolvedValue({
      id: "cm_2",
      name: "Tacos med nötfärs",
      complexity: "SIMPLE",
      imageUrl: "https://images.example.com/tacos.jpg",
    });
    prismaMock.meal.findFirst.mockResolvedValue(null);
    prismaMock.meal.findMany.mockResolvedValue([]);
    prismaMock.meal.create.mockResolvedValue({
      id: "m_new",
      name: "Tacos med nötfärs",
      complexity: "SIMPLE",
      sourceCommonMealId: "cm_2",
      imageUrl: "https://images.example.com/tacos.jpg",
      defaultServings: 4,
      preferredDays: [],
      ingredients: ["Tacoskal"],
      thumbsUpCount: 0,
      thumbsDownCount: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      mealIngredients: [],
    });

    const result = await addStarterMealToUserMeals("cm_2");

    expect(result).toMatchObject({
      success: true,
      alreadyAdded: false,
      mealId: "m_new",
      meal: expect.objectContaining({
        id: "m_new",
        name: "Tacos med nötfärs",
      }),
    });
    expect(prismaMock.meal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Tacos med nötfärs",
          userId: "user_1",
          sourceCommonMealId: "cm_2",
          complexity: "SIMPLE",
          imageUrl: "https://images.example.com/tacos.jpg",
        }),
        select: expect.objectContaining({
          id: true,
          mealIngredients: expect.any(Object),
        }),
      }),
    );
  });
});
