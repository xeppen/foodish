import { prisma } from "@/lib/prisma";
import { type Complexity } from "@prisma/client";
import starterCommonMealsSv from "@/prisma/starter-common-meals.sv.json";

type SeedCommonMeal = {
  name: string;
  complexity?: Complexity;
  imageUrl?: string | null;
  locale?: string;
  cuisine?: string | null;
};

export const ADMIN_EMAIL = "xeppen@gmail.com";

const starterCommonMealsSvData = starterCommonMealsSv as Array<{
  name: string;
  complexity?: string;
  imageUrl?: string | null;
  locale?: string;
  cuisine?: string | null;
}>;

function normalizeComplexity(value: string | undefined): Complexity {
  if (value === "SIMPLE" || value === "MEDIUM" || value === "COMPLEX") {
    return value;
  }
  return "MEDIUM";
}

export const DEFAULT_COMMON_MEALS: SeedCommonMeal[] = starterCommonMealsSvData.map((meal) => ({
  name: meal.name,
  complexity: normalizeComplexity(meal.complexity),
  imageUrl: meal.imageUrl ?? null,
  locale: meal.locale ?? "sv",
  cuisine: meal.cuisine ?? null,
}));

function buildFallbackCommonMeals() {
  const now = new Date();
  return DEFAULT_COMMON_MEALS.map((meal, index) => ({
    id: `fallback-common-${index}`,
    name: meal.name,
    complexity: meal.complexity ?? "MEDIUM",
    imageUrl: meal.imageUrl ?? null,
    locale: meal.locale ?? "sv",
    cuisine: meal.cuisine ?? null,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function listCommonMeals(locale = "sv") {
  try {
    let meals = await prisma.commonMeal.findMany({
      where: { locale },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (meals.length === 0) {
      const localeMeals = DEFAULT_COMMON_MEALS.filter((meal) => (meal.locale ?? "sv") === locale);
      await prisma.commonMeal.createMany({
        data: localeMeals.map((meal, index) => ({
          name: meal.name,
          complexity: meal.complexity ?? "MEDIUM",
          imageUrl: meal.imageUrl ?? null,
          locale: meal.locale ?? "sv",
          cuisine: meal.cuisine ?? null,
          sortOrder: index,
        })),
        skipDuplicates: true,
      });

      meals = await prisma.commonMeal.findMany({
        where: { locale },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }

    return meals;
  } catch (error) {
    console.error("listCommonMeals fallback: database unavailable", error);
    return buildFallbackCommonMeals();
  }
}
