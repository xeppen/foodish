import { prisma } from "@/lib/prisma";
import { type Complexity } from "@prisma/client";

type SeedCommonMeal = {
  name: string;
  complexity?: Complexity;
  imageUrl?: string | null;
};

export const ADMIN_EMAIL = "xeppen@gmail.com";

export const DEFAULT_COMMON_MEALS: SeedCommonMeal[] = [
  { name: "Köttbullar med potatis och brunsås" },
  { name: "Pasta med köttfärssås" },
  { name: "Tacos" },
  { name: "Falukorv i ugn med potatismos" },
  { name: "Makaroner och köttbullar" },
  { name: "Korv stroganoff med ris" },
  { name: "Fiskpinnar med potatis och remouladsås" },
  { name: "Pannkakor med sylt" },
  { name: "Ugnsstekt kyckling med ris" },
  { name: "Spaghetti med köttbullar" },
  { name: "Hamburgare med bröd" },
  { name: "Kycklingnuggets med pommes" },
  { name: "Lasagne" },
  { name: "Köttfärslimpa med potatis" },
  { name: "Pytt i panna med ägg" },
  { name: "Grillad korv med bröd" },
  { name: "Pasta med skinksås" },
  { name: "Stekt lax med potatis" },
  { name: "Köttfärssoppa" },
  { name: "Hemmagjord pizza" },
];

export async function listCommonMeals() {
  let meals = await prisma.commonMeal.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (meals.length === 0) {
    await prisma.commonMeal.createMany({
      data: DEFAULT_COMMON_MEALS.map((meal, index) => ({
        name: meal.name,
        complexity: meal.complexity ?? "MEDIUM",
        imageUrl: meal.imageUrl ?? null,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });

    meals = await prisma.commonMeal.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  return meals;
}
