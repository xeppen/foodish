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

import { addMeal, updateMeal } from "@/lib/actions/meals";

describe("meals actions (phase 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Test User" });
  });

  it("addMeal defaults complexity to MEDIUM when not provided", async () => {
    prismaMock.meal.create.mockResolvedValue({ id: "m1" });

    const formData = new FormData();
    formData.append("name", "Pasta");

    const result = await addMeal(formData);

    expect(result).toEqual({ success: true });
    expect(prismaMock.meal.create).toHaveBeenCalledWith({
      data: {
        name: "Pasta",
        userId: "user_1",
        complexity: "MEDIUM",
      },
    });
  });

  it("addMeal persists explicit complexity", async () => {
    prismaMock.meal.create.mockResolvedValue({ id: "m1" });

    const formData = new FormData();
    formData.append("name", "Långkok");
    formData.append("complexity", "COMPLEX");

    await addMeal(formData);

    expect(prismaMock.meal.create).toHaveBeenCalledWith({
      data: {
        name: "Långkok",
        userId: "user_1",
        complexity: "COMPLEX",
      },
    });
  });

  it("updateMeal updates name and complexity", async () => {
    prismaMock.meal.findUnique.mockResolvedValue({
      id: "m1",
      userId: "user_1",
    });
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
      },
    });
  });
});
