"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const mealSchema = z.object({
  name: z.string().min(1, "Meal name is required").max(100, "Meal name too long"),
});

// Starter pack meals for first-time users
const STARTER_MEALS = [
  "Pasta with tomato sauce",
  "Chicken stir-fry with rice",
  "Tacos",
  "Pizza (homemade or takeout)",
  "Grilled chicken with vegetables",
  "Spaghetti carbonara",
  "Fried rice",
  "Burgers",
  "Fish with roasted potatoes",
  "Chicken curry with rice",
  "Quesadillas",
  "Lasagna",
  "Salmon with vegetables",
  "Chicken fajitas",
  "Stir-fry noodles",
  "Meatballs with pasta",
  "Baked chicken with rice",
  "Vegetable soup with bread",
];

export async function initializeStarterMeals() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if user already has meals
  const existingMeals = await prisma.meal.count({
    where: { userId: user.id },
  });

  if (existingMeals > 0) {
    return { success: true, message: "Meals already initialized" };
  }

  // Create starter meals
  await prisma.meal.createMany({
    data: STARTER_MEALS.map((name) => ({
      name,
      userId: user.id,
    })),
  });

  revalidatePath("/meals");
  return { success: true, message: "Starter meals added" };
}

export async function getMeals() {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  const meals = await prisma.meal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return meals;
}

export async function addMeal(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const validation = mealSchema.safeParse({ name });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  await prisma.meal.create({
    data: {
      name: validation.data.name,
      userId: user.id,
    },
  });

  revalidatePath("/meals");
  return { success: true };
}

export async function updateMeal(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const validation = mealSchema.safeParse({ name });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  // Verify ownership
  const meal = await prisma.meal.findUnique({
    where: { id },
  });

  if (!meal || meal.userId !== user.id) {
    return { error: "Meal not found" };
  }

  await prisma.meal.update({
    where: { id },
    data: { name: validation.data.name },
  });

  revalidatePath("/meals");
  return { success: true };
}

export async function deleteMeal(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership
  const meal = await prisma.meal.findUnique({
    where: { id },
  });

  if (!meal || meal.userId !== user.id) {
    return { error: "Meal not found" };
  }

  await prisma.meal.delete({
    where: { id },
  });

  revalidatePath("/meals");
  return { success: true };
}
