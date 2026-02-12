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
    .max(140, "Måltidsnamnet är för långt"),
  complexity: z.enum(["SIMPLE", "MEDIUM", "COMPLEX"]).optional(),
});

const voteSchema = z.object({
  direction: z.enum(["up", "down"]),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function getUploadedImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Bilden måste vara en bildfil");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Bilden får vara max 5MB");
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

function inferComplexity(name: string): "SIMPLE" | "MEDIUM" | "COMPLEX" {
  const value = name.toLowerCase();
  const complexHints = ["långkok", "lasagne", "roast", "stew", "gryta", "bakad", "slow"];
  const simpleHints = ["toast", "omelett", "sallad", "nudlar", "wok", "pasta", "wrap"];

  if (complexHints.some((hint) => value.includes(hint))) {
    return "COMPLEX";
  }
  if (simpleHints.some((hint) => value.includes(hint))) {
    return "SIMPLE";
  }
  return "MEDIUM";
}

function inferTags(name: string): string[] {
  const value = name.toLowerCase();
  const tagMap: Array<[string, string]> = [
    ["kyckling", "#Chicken"],
    ["chicken", "#Chicken"],
    ["curry", "#Curry"],
    ["spicy", "#Spicy"],
    ["stark", "#Spicy"],
    ["lax", "#Fish"],
    ["fisk", "#Fish"],
    ["veg", "#Veggie"],
    ["pasta", "#Pasta"],
    ["ris", "#Rice"],
  ];

  const tags = tagMap.filter(([needle]) => value.includes(needle)).map(([, tag]) => tag);
  return tags.length > 0 ? Array.from(new Set(tags)) : ["#HomeCooked"];
}

function inferIngredients(name: string): string[] {
  const value = name.toLowerCase();
  const ingredients: string[] = [];

  if (value.includes("kyckling") || value.includes("chicken")) ingredients.push("Kyckling");
  if (value.includes("ris")) ingredients.push("Ris");
  if (value.includes("curry")) ingredients.push("Currypasta");
  if (value.includes("pasta")) ingredients.push("Pasta");
  if (value.includes("lax") || value.includes("fisk")) ingredients.push("Fisk");
  if (value.includes("spicy") || value.includes("stark")) ingredients.push("Chili");

  if (ingredients.length === 0) {
    ingredients.push("Lök", "Vitlök", "Olja", "Salt");
  }

  return ingredients;
}

function buildImagePrompt(name: string): string {
  return `Warm, home-cooked, top-down photography of ${name}, cozy dinner table, natural light`;
}

function buildImageUrl(name: string): string {
  const prompt = buildImagePrompt(name);
  return `/api/meal-image?meal=${encodeURIComponent(name)}&style=${encodeURIComponent(prompt)}`;
}

async function enrichMeal(name: string) {
  // Mocked AI enrichment latency for "magic input" feel.
  if (process.env.NODE_ENV !== "test") {
    await new Promise((resolve) => setTimeout(resolve, 450));
  }

  return {
    complexity: inferComplexity(name),
    tags: inferTags(name),
    ingredients: inferIngredients(name),
    imagePrompt: buildImagePrompt(name),
    imageUrl: buildImageUrl(name),
  };
}

export async function initializeStarterMeals() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const existingMeals = await prisma.meal.count({ where: { userId: user.id } });
  if (existingMeals > 0) {
    return { success: true, message: "Måltider finns redan" };
  }

  const starterData = await Promise.all(
    STARTER_MEALS.map(async (name) => {
      const enriched = await enrichMeal(name);
      return {
        name,
        userId: user.id,
        complexity: enriched.complexity,
        tags: enriched.tags,
        ingredients: enriched.ingredients,
        imagePrompt: enriched.imagePrompt,
        imageUrl: enriched.imageUrl,
      };
    })
  );

  await prisma.meal.createMany({ data: starterData });

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

    if (meals.length === 0) {
      await initializeStarterMeals();
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

  const name = (formData.get("name") as string) ?? "";
  const complexity = formData.get("complexity");
  const image = formData.get("image");
  const validation = mealSchema.safeParse({
    name,
    complexity: typeof complexity === "string" && complexity.length > 0 ? complexity : undefined,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const enriched = await enrichMeal(validation.data.name);
  let uploadedImageUrl: string | undefined;

  if (image instanceof File && image.size > 0) {
    try {
      uploadedImageUrl = await getUploadedImageDataUrl(image);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Ogiltig bild" };
    }
  }

  await prisma.meal.create({
    data: {
      name: validation.data.name,
      userId: user.id,
      complexity: validation.data.complexity ?? enriched.complexity,
      tags: enriched.tags,
      ingredients: enriched.ingredients,
      imagePrompt: enriched.imagePrompt,
      imageUrl: uploadedImageUrl ?? enriched.imageUrl,
    },
  });

  revalidatePath("/");
  revalidatePath("/meals");
  return {
    success: true,
    enrichment: {
      tags: enriched.tags,
      complexity: enriched.complexity,
      ingredients: enriched.ingredients,
    },
  };
}

export async function updateMeal(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const name = (formData.get("name") as string) ?? "";
  const complexity = formData.get("complexity");
  const image = formData.get("image");
  const validation = mealSchema.safeParse({
    name,
    complexity: typeof complexity === "string" && complexity.length > 0 ? complexity : undefined,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  let uploadedImageUrl: string | undefined;
  if (image instanceof File && image.size > 0) {
    try {
      uploadedImageUrl = await getUploadedImageDataUrl(image);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Ogiltig bild" };
    }
  }

  await prisma.meal.update({
    where: { id },
    data: {
      name: validation.data.name,
      ...(validation.data.complexity ? { complexity: validation.data.complexity } : {}),
      ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
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

  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  await prisma.meal.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/meals");
  return { success: true };
}

export async function voteMeal(id: string, direction: "up" | "down") {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  const validation = voteSchema.safeParse({ direction });
  if (!validation.success) {
    return { error: "Ogiltig röst" };
  }

  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  const data =
    validation.data.direction === "up"
      ? { thumbsUpCount: { increment: 1 } }
      : { thumbsDownCount: { increment: 1 } };

  const updated = await prisma.meal.update({
    where: { id },
    data,
    select: {
      id: true,
      thumbsUpCount: true,
      thumbsDownCount: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/meals");
  return { success: true, meal: updated };
}
