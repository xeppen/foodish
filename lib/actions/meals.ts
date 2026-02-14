"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { listCommonMeals } from "@/lib/common-meals";
import { resetUserMealDaySignals } from "@/lib/planning/day-signals";
import { normalizeIngredientName } from "@/lib/shopping/normalize";
import { Prisma } from "@prisma/client";
import { UTApi } from "uploadthing/server";
import { z } from "zod";

const weekdaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

const mealSchema = z.object({
  name: z
    .string()
    .min(1, "Måltidsnamnet är obligatoriskt")
    .max(140, "Måltidsnamnet är för långt"),
  complexity: z.enum(["SIMPLE", "MEDIUM", "COMPLEX"]).optional(),
  preferredDays: z.array(weekdaySchema).max(7).default([]),
});

const ingredientDraftSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z
    .union([z.number().positive().max(10000), z.null(), z.undefined()])
    .transform((value) => (value == null ? null : Number(value))),
  unit: z
    .union([z.string().trim().max(20), z.null(), z.undefined()])
    .transform((value) => (value == null || value === "" ? null : value)),
  note: z
    .union([z.string().trim().max(120), z.null(), z.undefined()])
    .transform((value) => (value == null || value === "" ? null : value)),
  optional: z.boolean().optional().default(false),
  confidence: z
    .union([z.number().min(0).max(1), z.null(), z.undefined()])
    .transform((value) => (value == null ? null : Number(value))),
  needsReview: z.boolean().optional().default(false),
});

const ingredientsInputSchema = z.array(ingredientDraftSchema).max(80);

type MealIngredientInput = {
  position: number;
  name: string;
  canonicalName: string;
  amount: number | null;
  unit: string | null;
  note: string | null;
  optional: boolean;
  confidence: number | null;
  needsReview: boolean;
};

const voteSchema = z.object({
  direction: z.enum(["up", "down"]),
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const imageUrlSchema = z.string().trim().url("Bild-URL är ogiltig");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getUploadedFileUrl(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }

  const sdkResult = result as {
    _tag?: string;
    right?: { ufsUrl?: string; url?: string };
    left?: { message?: string };
    data?: { ufsUrl?: string; url?: string };
    error?: { message?: string };
  };

  if (sdkResult._tag === "Left") {
    throw new Error(sdkResult.left?.message ?? "Bilduppladdning misslyckades");
  }

  if (sdkResult._tag === "Right") {
    return sdkResult.right?.ufsUrl ?? sdkResult.right?.url ?? null;
  }

  if (sdkResult.error) {
    throw new Error(sdkResult.error.message ?? "Bilduppladdning misslyckades");
  }

  if (sdkResult.data) {
    return sdkResult.data.ufsUrl ?? sdkResult.data.url ?? null;
  }

  return null;
}

async function uploadImageToUploadThing(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Bilden måste vara en bildfil");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Bilden får vara max 5MB");
  }

  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    throw new Error("Bilduppladdning är inte konfigurerad");
  }

  const utapi = new UTApi({ token });
  const result = await utapi.uploadFiles(file, { contentDisposition: "inline" });
  const url = getUploadedFileUrl(result);

  if (!url) {
    throw new Error("Bilduppladdning misslyckades");
  }

  return url;
}

function parseExternalImageUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = imageUrlSchema.safeParse(trimmed);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const protocol = new URL(parsed.data).protocol;
  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error("Bild-URL måste börja med http:// eller https://");
  }

  return parsed.data;
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

function inferStructuredIngredients(name: string): MealIngredientInput[] {
  return inferIngredients(name).map((ingredient, index) => ({
    position: index,
    name: ingredient,
    canonicalName: normalizeIngredientName(ingredient),
    amount: null,
    unit: null,
    note: null,
    optional: false,
    confidence: null,
    needsReview: false,
  }));
}

function buildImagePrompt(name: string): string {
  return `Vertical food photography of ${name}, dark moody lighting, realistic home-cooked plating, editorial magazine look`;
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
    structuredIngredients: inferStructuredIngredients(name),
    imagePrompt: buildImagePrompt(name),
    imageUrl: buildImageUrl(name),
  };
}

function parseIngredientsFromFormData(formData: FormData): MealIngredientInput[] | null {
  const payload = formData.get("ingredients");
  if (typeof payload !== "string" || payload.trim().length === 0) {
    return null;
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    throw new Error("Ingredienslistan är ogiltig");
  }

  const parsed = ingredientsInputSchema.safeParse(parsedPayload);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Ingredienslistan är ogiltig");
  }

  return parsed.data.map((ingredient, index): MealIngredientInput => ({
    ...ingredient,
    position: index,
    canonicalName: normalizeIngredientName(ingredient.name),
  }));
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

  const commonMeals = await listCommonMeals();
  await prisma.$transaction(
    commonMeals.map((commonMeal) =>
      prisma.meal.create({
        data: {
          name: commonMeal.name,
          userId: user.id,
          complexity: commonMeal.complexity,
          tags: inferTags(commonMeal.name),
          ingredients: inferIngredients(commonMeal.name),
          imagePrompt: buildImagePrompt(commonMeal.name),
          imageUrl: commonMeal.imageUrl ?? buildImageUrl(commonMeal.name),
          mealIngredients: {
            create: inferStructuredIngredients(commonMeal.name),
          },
        },
      })
    )
  );

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
      include: {
        mealIngredients: {
          orderBy: { position: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (meals.length === 0) {
      await initializeStarterMeals();
      meals = await prisma.meal.findMany({
        where: { userId: user.id },
        include: {
          mealIngredients: {
            orderBy: { position: "asc" },
          },
        },
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
  const preferredDaysInput = formData.getAll("preferredDays");
  const image = formData.get("image");
  const imageUrlInput = (formData.get("imageUrl") as string) ?? "";
  const validation = mealSchema.safeParse({
    name,
    complexity: typeof complexity === "string" && complexity.length > 0 ? complexity : undefined,
    preferredDays: preferredDaysInput,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const enriched = await enrichMeal(validation.data.name);
  let structuredIngredients: MealIngredientInput[];
  try {
    structuredIngredients = parseIngredientsFromFormData(formData) ?? enriched.structuredIngredients;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ogiltig ingredienslista" };
  }
  let uploadedImageUrl: string | undefined;
  let providedImageUrl: string | undefined;

  try {
    providedImageUrl = parseExternalImageUrl(imageUrlInput);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ogiltig bild-URL" };
  }

  if (image instanceof File && image.size > 0) {
    try {
      uploadedImageUrl = await uploadImageToUploadThing(image);
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
      ingredients: structuredIngredients.map((ingredient) => ingredient.name),
      imagePrompt: enriched.imagePrompt,
      preferredDays: validation.data.preferredDays,
      imageUrl: uploadedImageUrl ?? providedImageUrl ?? enriched.imageUrl,
      mealIngredients: {
        create: structuredIngredients,
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/meals");
  return {
    success: true,
    enrichment: {
      tags: enriched.tags,
      complexity: enriched.complexity,
      ingredients: structuredIngredients,
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
  const preferredDaysInput = formData.getAll("preferredDays");
  const image = formData.get("image");
  const imageUrlInput = (formData.get("imageUrl") as string) ?? "";
  const validation = mealSchema.safeParse({
    name,
    complexity: typeof complexity === "string" && complexity.length > 0 ? complexity : undefined,
    preferredDays: preferredDaysInput,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const meal = await prisma.meal.findUnique({ where: { id } });
  if (!meal || meal.userId !== user.id) {
    return { error: "Måltiden hittades inte" };
  }

  let structuredIngredients: MealIngredientInput[] | null = null;
  try {
    structuredIngredients = parseIngredientsFromFormData(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ogiltig ingredienslista" };
  }

  let uploadedImageUrl: string | undefined;
  let providedImageUrl: string | undefined;
  try {
    providedImageUrl = parseExternalImageUrl(imageUrlInput);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ogiltig bild-URL" };
  }

  if (image instanceof File && image.size > 0) {
    try {
      uploadedImageUrl = await uploadImageToUploadThing(image);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Ogiltig bild" };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.meal.update({
      where: { id },
      data: {
        name: validation.data.name,
        ...(validation.data.complexity ? { complexity: validation.data.complexity } : {}),
        preferredDays: validation.data.preferredDays,
        ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
        ...(!uploadedImageUrl && providedImageUrl ? { imageUrl: providedImageUrl } : {}),
        ...(structuredIngredients
          ? {
              ingredients: structuredIngredients.map((ingredient) => ingredient.name),
            }
          : {}),
      },
    });

    if (structuredIngredients) {
      await tx.mealIngredient.deleteMany({ where: { mealId: id } });
      if (structuredIngredients.length > 0) {
        await tx.mealIngredient.createMany({
          data: structuredIngredients.map((ingredient) => ({
            mealId: id,
            ...ingredient,
          })),
        });
      }
    }
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

export async function resetMealLearning() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Ej behörig" };
  }

  await resetUserMealDaySignals(user.id);
  revalidatePath("/");
  revalidatePath("/meals");
  return { success: true };
}
