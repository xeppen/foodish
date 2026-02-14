"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { aggregateShoppingIngredients } from "@/lib/shopping/aggregate";
import { normalizeIngredientName } from "@/lib/shopping/normalize";
import { revalidatePath } from "next/cache";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getWeekStart(date: Date = new Date()): Date {
  const monday = getMonday(date);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export async function getCurrentWeekShoppingList() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const weekStart = getWeekStart();
  const list = await prisma.shoppingList.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
      },
    },
  });

  return list;
}

export async function toggleShoppingListItem(itemId: string, checked: boolean) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const item = await prisma.shoppingListItem.findUnique({
    where: { id: itemId },
    include: { shoppingList: true },
  });

  if (!item || item.shoppingList.userId !== user.id) {
    return { error: "Listobjektet hittades inte" };
  }

  await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: { isChecked: checked },
  });

  revalidatePath("/");
  return { success: true };
}

export async function generateCurrentWeekShoppingList() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const weekStart = getWeekStart();
  const plan = await prisma.weeklyPlan.findUnique({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    include: {
      entries: {
        include: {
          meal: {
            include: {
              mealIngredients: {
                orderBy: { position: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!plan) {
    return { error: "Ingen veckoplan hittades" };
  }

  let meals = plan.entries.map((entry) => entry.meal);
  if (meals.length === 0) {
    const mealNames = [plan.monday, plan.tuesday, plan.wednesday, plan.thursday, plan.friday].filter(
      (value): value is string => Boolean(value)
    );
    meals = await prisma.meal.findMany({
      where: {
        userId: user.id,
        name: { in: mealNames },
      },
      include: {
        mealIngredients: {
          orderBy: { position: "asc" },
        },
      },
    });
  }

  const ingredientRows = meals.flatMap((meal) => {
    if (meal.mealIngredients.length > 0) {
      return meal.mealIngredients.map((ingredient) => ({
        mealId: meal.id,
        mealName: meal.name,
        name: ingredient.name,
        canonicalName: ingredient.canonicalName,
        amount: ingredient.amount,
        unit: ingredient.unit,
      }));
    }

    const fallbackRaw = Array.isArray(meal.ingredients) ? meal.ingredients : [];
    return fallbackRaw
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((name) => ({
        mealId: meal.id,
        mealName: meal.name,
        name: name.trim(),
        canonicalName: normalizeIngredientName(name),
        amount: null,
        unit: null,
      }));
  });

  const aggregated = aggregateShoppingIngredients(ingredientRows);

  const shoppingList = await prisma.shoppingList.upsert({
    where: {
      userId_weekStartDate: {
        userId: user.id,
        weekStartDate: weekStart,
      },
    },
    create: {
      userId: user.id,
      weekStartDate: weekStart,
      weeklyPlanId: plan.id,
      status: "READY",
    },
    update: {
      weeklyPlanId: plan.id,
      status: "READY",
      updatedAt: new Date(),
    },
  });

  await prisma.$transaction([
    prisma.shoppingListItem.deleteMany({ where: { shoppingListId: shoppingList.id } }),
    ...(aggregated.length > 0
      ? [
          prisma.shoppingListItem.createMany({
            data: aggregated.map((item, index) => ({
              shoppingListId: shoppingList.id,
              canonicalName: item.canonicalName,
              displayName: item.displayName,
              amount: item.amount,
              unit: item.unit,
              unresolved: item.unresolved,
              sourceMealIds: item.sourceMealIds,
              sourceMealNames: item.sourceMealNames,
              sortOrder: index,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/");
  return { success: true, listId: shoppingList.id, itemCount: aggregated.length };
}
