"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL, listCommonMeals } from "@/lib/common-meals";
import { type Complexity, Prisma } from "@prisma/client";

const commonMealSchema = z.object({
  name: z.string().trim().min(1, "Namn krävs").max(140, "Namnet är för långt"),
  complexity: z.enum(["SIMPLE", "MEDIUM", "COMPLEX"]).default("MEDIUM"),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => !value || /^https?:\/\//.test(value), "Bild-URL måste börja med http:// eller https://"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Ej behörig");
  }
  return user;
}

function invalidateCommonMealPages() {
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function getCommonMealsForAdmin() {
  await requireAdmin();
  return listCommonMeals();
}

export async function addCommonMeal(formData: FormData) {
  await requireAdmin();

  const parsed = commonMealSchema.safeParse({
    name: formData.get("name"),
    complexity: formData.get("complexity"),
    imageUrl: formData.get("imageUrl"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltig data" };
  }

  try {
    await prisma.commonMeal.create({
      data: {
        name: parsed.data.name,
        complexity: parsed.data.complexity as Complexity,
        imageUrl: parsed.data.imageUrl ?? null,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Det finns redan en standardmåltid med samma namn" };
    }
    return { error: "Kunde inte skapa standardmåltiden" };
  }

  invalidateCommonMealPages();
  return { success: true };
}

export async function updateCommonMeal(id: string, formData: FormData) {
  await requireAdmin();

  const parsed = commonMealSchema.safeParse({
    name: formData.get("name"),
    complexity: formData.get("complexity"),
    imageUrl: formData.get("imageUrl"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ogiltig data" };
  }

  try {
    await prisma.commonMeal.update({
      where: { id },
      data: {
        name: parsed.data.name,
        complexity: parsed.data.complexity as Complexity,
        imageUrl: parsed.data.imageUrl ?? null,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Det finns redan en standardmåltid med samma namn" };
    }
    return { error: "Kunde inte uppdatera standardmåltiden" };
  }

  invalidateCommonMealPages();
  return { success: true };
}

export async function deleteCommonMeal(id: string) {
  await requireAdmin();

  try {
    await prisma.commonMeal.delete({
      where: { id },
    });
  } catch {
    return { error: "Kunde inte ta bort standardmåltiden" };
  }

  invalidateCommonMealPages();
  return { success: true };
}
