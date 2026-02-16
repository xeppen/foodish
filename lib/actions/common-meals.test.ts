import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { mockGetCurrentUser, mockRevalidatePath, mockListCommonMeals, prismaMock } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockListCommonMeals: vi.fn(),
  prismaMock: {
    commonMeal: {
      create: vi.fn(),
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

vi.mock("@/lib/common-meals", () => ({
  ADMIN_EMAIL: "admin@example.com",
  listCommonMeals: mockListCommonMeals,
}));

import {
  addCommonMeal,
  deleteCommonMeal,
  getCommonMealsForAdmin,
  updateCommonMeal,
} from "@/lib/actions/common-meals";

function adminUser() {
  return { id: "u_admin", email: "admin@example.com" };
}

function validFormData() {
  const formData = new FormData();
  formData.append("name", "Köttfärssås");
  formData.append("complexity", "MEDIUM");
  formData.append("imageUrl", "https://images.example.com/meal.jpg");
  formData.append("sortOrder", "2");
  return formData;
}

function makeP2002Error() {
  const err = new Error("duplicate") as Error & { code: string };
  err.code = "P2002";
  Object.setPrototypeOf(err, Prisma.PrismaClientKnownRequestError.prototype);
  return err;
}

describe("common meals actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser());
  });

  it("getCommonMealsForAdmin returns list for admin user", async () => {
    mockListCommonMeals.mockResolvedValue([{ id: "cm_1", name: "Pasta", complexity: "SIMPLE", sortOrder: 0 }]);

    const result = await getCommonMealsForAdmin();

    expect(result).toHaveLength(1);
    expect(mockListCommonMeals).toHaveBeenCalledTimes(1);
  });

  it("getCommonMealsForAdmin throws for non-admin user", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "u_2", email: "user@example.com" });

    await expect(getCommonMealsForAdmin()).rejects.toThrow("Ej behörig");
  });

  it("addCommonMeal returns validation error for invalid URL", async () => {
    const formData = validFormData();
    formData.set("imageUrl", "ftp://bad-url");

    const result = await addCommonMeal(formData);

    expect(result).toEqual({ error: "Bild-URL måste börja med http:// eller https://" });
    expect(prismaMock.commonMeal.create).not.toHaveBeenCalled();
  });

  it("addCommonMeal creates row and revalidates pages", async () => {
    prismaMock.commonMeal.create.mockResolvedValue({ id: "cm_1" });

    const result = await addCommonMeal(validFormData());

    expect(result).toEqual({ success: true });
    expect(prismaMock.commonMeal.create).toHaveBeenCalledWith({
      data: {
        name: "Köttfärssås",
        complexity: "MEDIUM",
        imageUrl: "https://images.example.com/meal.jpg",
        sortOrder: 2,
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("addCommonMeal handles duplicate name constraint", async () => {
    prismaMock.commonMeal.create.mockRejectedValue(makeP2002Error());

    const result = await addCommonMeal(validFormData());

    expect(result).toEqual({ error: "Det finns redan en standardmåltid med samma namn" });
  });

  it("updateCommonMeal updates row and normalizes empty image URL", async () => {
    prismaMock.commonMeal.update.mockResolvedValue({ id: "cm_1" });
    const formData = validFormData();
    formData.set("imageUrl", "");

    const result = await updateCommonMeal("cm_1", formData);

    expect(result).toEqual({ success: true });
    expect(prismaMock.commonMeal.update).toHaveBeenCalledWith({
      where: { id: "cm_1" },
      data: {
        name: "Köttfärssås",
        complexity: "MEDIUM",
        imageUrl: null,
        sortOrder: 2,
      },
    });
  });

  it("updateCommonMeal returns generic error for unknown failure", async () => {
    prismaMock.commonMeal.update.mockRejectedValue(new Error("boom"));

    const result = await updateCommonMeal("cm_1", validFormData());

    expect(result).toEqual({ error: "Kunde inte uppdatera standardmåltiden" });
  });

  it("deleteCommonMeal deletes row and revalidates pages", async () => {
    prismaMock.commonMeal.delete.mockResolvedValue({ id: "cm_1" });

    const result = await deleteCommonMeal("cm_1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.commonMeal.delete).toHaveBeenCalledWith({ where: { id: "cm_1" } });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("deleteCommonMeal returns error when delete fails", async () => {
    prismaMock.commonMeal.delete.mockRejectedValue(new Error("cannot delete"));

    const result = await deleteCommonMeal("cm_1");

    expect(result).toEqual({ error: "Kunde inte ta bort standardmåltiden" });
  });
});
