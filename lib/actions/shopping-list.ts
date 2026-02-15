"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateIngredientDraft } from "@/lib/ai/ingredients";
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

function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
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
            select: {
              id: true,
              name: true,
              ingredients: true,
              defaultServings: true,
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

  type MealWithRows = {
    id: string;
    name: string;
    ingredients: unknown;
    defaultServings: number;
    mealIngredients: Array<{
      name: string;
      canonicalName: string;
      amount: number | null;
      unit: string | null;
      position?: number;
      note?: string | null;
      optional?: boolean;
      confidence?: number | null;
      needsReview?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
    }>;
  };

  let planMeals: Array<{ meal: MealWithRows; servings: number | null }> = plan.entries.map((entry) => ({
    meal: entry.meal,
    servings: entry.servings ?? null,
  }));
  if (planMeals.length === 0) {
    const mealNames = [plan.monday, plan.tuesday, plan.wednesday, plan.thursday, plan.friday].filter(
      (value): value is string => Boolean(value)
    );
    const meals = await prisma.meal.findMany({
      where: {
        userId: user.id,
        name: { in: mealNames },
      },
      select: {
        id: true,
        name: true,
        ingredients: true,
        defaultServings: true,
        mealIngredients: {
          orderBy: { position: "asc" },
        },
      },
    });
    planMeals = meals.map((meal) => ({ meal, servings: null }));
  }

  const mealsWithIngredients = await Promise.all(
    planMeals.map(async ({ meal, servings }) => {
      const hasStructured = meal.mealIngredients.length > 0;
      const legacyRaw = Array.isArray(meal.ingredients) ? meal.ingredients : [];
      const hasLegacy = legacyRaw.some((value) => typeof value === "string" && value.trim().length > 0);

      if (hasStructured || hasLegacy) {
        return { meal, servings };
      }

      try {
        const draft = await generateIngredientDraft(meal.name);
        if (!draft.ingredients || draft.ingredients.length === 0) {
          return { meal, servings };
        }

        const generatedRows = draft.ingredients
          .map((row, index) => ({
            mealId: meal.id,
            position: index,
            name: row.name.trim(),
            canonicalName: normalizeIngredientName(row.name),
            amount: row.amount ?? null,
            unit: row.unit ?? null,
            note: row.note ?? null,
            optional: row.optional ?? false,
            confidence: row.confidence ?? null,
            needsReview: row.needsReview ?? true,
          }))
          .filter((row) => row.name.length > 0);

        if (generatedRows.length === 0) {
          return { meal, servings };
        }

        await prisma.$transaction(async (tx) => {
          await tx.mealIngredient.deleteMany({ where: { mealId: meal.id } });
          await tx.mealIngredient.createMany({ data: generatedRows });
          await tx.meal.update({
            where: { id: meal.id },
            data: { ingredients: generatedRows.map((row) => row.name) },
          });
        });

        return {
          meal: {
            ...meal,
            mealIngredients: generatedRows.map((row) => ({
              ...row,
              createdAt: new Date(),
              updatedAt: new Date(),
            })),
            ingredients: generatedRows.map((row) => row.name),
          },
          servings,
        };
      } catch {
        return { meal, servings };
      }
    })
  );

  const ingredientRows = mealsWithIngredients.flatMap(({ meal, servings }) => {
    const baseline = meal.defaultServings > 0 ? meal.defaultServings : 4;
    const targetServings = servings && servings > 0 ? servings : baseline;
    const servingsFactor = targetServings / baseline;

    if (meal.mealIngredients.length > 0) {
      return meal.mealIngredients.map((ingredient) => ({
        mealId: meal.id,
        mealName: meal.name,
        name: ingredient.name,
        canonicalName: ingredient.canonicalName,
        amount:
          typeof ingredient.amount === "number" && Number.isFinite(ingredient.amount)
            ? roundAmount(ingredient.amount * servingsFactor)
            : null,
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
              sourceMealNames: item.sourceMealBreakdown,
              sortOrder: index,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/");
  return { success: true, listId: shoppingList.id, itemCount: aggregated.length };
}
