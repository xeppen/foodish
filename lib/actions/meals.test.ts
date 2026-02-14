import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCurrentUser, mockRevalidatePath, prismaMock } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
  prismaMock: {
    meal: {
      count: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mealDaySignal: {
      deleteMany: vi.fn(),
    },
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

import { addMeal, resetMealLearning, updateMeal, voteMeal } from "@/lib/actions/meals";

describe("meals actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
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

  it("resetMealLearning clears day signals", async () => {
    prismaMock.mealDaySignal.deleteMany.mockResolvedValue({ count: 2 });

    const result = await resetMealLearning();

    expect(result).toEqual({ success: true });
    expect(prismaMock.mealDaySignal.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" },
    });
  });
});
