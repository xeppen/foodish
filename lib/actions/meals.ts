"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { STARTER_MEALS } from "@/lib/starter-meals";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const mealSchema = z.object({
  name: z
    .string()
    .min(1, "Måltidsnamnet är obligatoriskt")
    .max(100, "Måltidsnamnet är för långt"),
  complexity: z.enum(["SIMPLE", "MEDIUM", "COMPLEX"]).optional(),
});

export async function initializeStarterMeals() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  // Check if user already has meals
  const existingMeals = await prisma.meal.count({
    where: { userId: user.id },
  });

  if (existingMeals > 0) {
    return { success: true, message: "Måltider finns redan" };
  }

  // Create starter meals
  await prisma.meal.createMany({
    data: STARTER_MEALS.map((name) => ({
      name,
      userId: user.id,
    })),
  });

  revalidatePath("/");
  revalidatePath("/meals");
  return { success: true, message: "Startmåltider har lagts till" };
}

export async function getMeals() {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  try {
    let meals = await prisma.meal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // Bootstrap starter meals for authenticated users with empty libraries.
    if (meals.length === 0) {
      await prisma.meal.createMany({
        data: STARTER_MEALS.map((name) => ({
          name,
          userId: user.id,
        })),
      });

      meals = await prisma.meal.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
    }

    return meals;
  } catch (error) {
    const prismaError =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? {
            code: error.code,
            message: error.message,
            meta: error.meta,
          }
        : null;

    console.error("Failed to load meals", {
      userId: user.id,
      error,
      prismaError,
    });
    return [];
  }
}

export async function addMeal(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const name = formData.get("name") as string;
  const complexity = formData.get("complexity");
  const validation = mealSchema.safeParse({
    name,
    complexity: typeof complexity === "string" && complexity.length > 0 ? complexity : undefined,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  await prisma.meal.create({
    data: {
      name: validation.data.name,
      userId: user.id,
      complexity: validation.data.complexity ?? "MEDIUM",
    },
  });

  revalidatePath("/");
  revalidatePath("/meals");
  return { success: true };
}

export async function updateMeal(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const name = formData.get("name") as string;
  const complexity = formData.get("complexity");
  const validation = mealSchema.safeParse({
    name,
    complexity: typeof complexity === "string" && complexity.length > 0 ? complexity : undefined,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  // Verify ownership
  const meal = await prisma.meal.findUnique({
    where: { id },
  });

  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  await prisma.meal.update({
    where: { id },
    data: {
      name: validation.data.name,
      ...(validation.data.complexity ? { complexity: validation.data.complexity } : {}),
    },
  });

  revalidatePath("/");
  revalidatePath("/meals");
  return { success: true };
}

export async function deleteMeal(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  // Verify ownership
  const meal = await prisma.meal.findUnique({
    where: { id },
  });

  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  await prisma.meal.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/meals");
  return { success: true };
}
