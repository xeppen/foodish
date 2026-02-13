import { Prisma } from "@prisma/client";
import { mapDishName, normalizeDishName } from "@/lib/dish-mapping";
import { prisma } from "@/lib/prisma";
import { generateDishImage } from "@/lib/image-generation/provider";
import { uploadGeneratedDishImage } from "@/lib/image-generation/storage";
import { buildFallbackMealImageUrl } from "@/lib/meal-image-url";

const PENDING_WAIT_TIMEOUT_MS = 10000;
const PENDING_POLL_INTERVAL_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type DishImageResult =
  | { status: "ready"; imageUrl: string; wasGenerated: boolean }
  | { status: "pending" }
  | { status: "error"; message: string; imageUrl: string };

async function waitForPendingResolution(normalizedName: string): Promise<DishImageResult> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < PENDING_WAIT_TIMEOUT_MS) {
    const current = await prisma.generatedDishImage.findUnique({
      where: { normalizedName },
    });
    if (!current) {
      await sleep(PENDING_POLL_INTERVAL_MS);
      continue;
    }
    if (current.status === "READY" && current.imageUrl) {
      return { status: "ready", imageUrl: current.imageUrl, wasGenerated: false };
    }
    if (current.status === "FAILED") {
      return {
        status: "error",
        message: "Kunde inte generera bild just nu.",
        imageUrl: buildFallbackMealImageUrl(current.originalName),
      };
    }
    await sleep(PENDING_POLL_INTERVAL_MS);
  }

  return { status: "pending" };
}

export async function getOrGenerateDishImage(rawDishName: string, signal?: AbortSignal): Promise<DishImageResult> {
  const mapped = mapDishName(rawDishName);
  const normalizedName = normalizeDishName(mapped.canonicalSv);

  const existing = await prisma.generatedDishImage.findUnique({
    where: { normalizedName },
  });
  if (existing?.status === "READY" && existing.imageUrl) {
    return { status: "ready", imageUrl: existing.imageUrl, wasGenerated: false };
  }
  if (existing?.status === "FAILED") {
    return {
      status: "error",
      message: "Kunde inte generera bild just nu.",
      imageUrl: buildFallbackMealImageUrl(existing.originalName),
    };
  }
  if (existing?.status === "PENDING") {
    return waitForPendingResolution(normalizedName);
  }

  try {
    await prisma.generatedDishImage.create({
      data: {
        normalizedName,
        canonicalName: mapped.canonicalSv,
        originalName: rawDishName.trim(),
        status: "PENDING",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return waitForPendingResolution(normalizedName);
    }
    throw error;
  }

  try {
    const generated = await generateDishImage(mapped.canonicalEn, signal);
    const uploadedUrl = await uploadGeneratedDishImage(mapped.slug, generated.image);

    await prisma.generatedDishImage.update({
      where: { normalizedName },
      data: {
        imageUrl: uploadedUrl,
        generationPrompt: generated.prompt,
        generationVersion: generated.promptVersion,
        generationModel: generated.model,
        status: "READY",
        errorCode: null,
      },
    });

    return { status: "ready", imageUrl: uploadedUrl, wasGenerated: true };
  } catch (error) {
    await prisma.generatedDishImage.update({
      where: { normalizedName },
      data: {
        status: "FAILED",
        errorCode: error instanceof Error ? error.message.slice(0, 120) : "GENERATION_ERROR",
      },
    });
    return {
      status: "error",
      message: "Kunde inte generera bild just nu.",
      imageUrl: buildFallbackMealImageUrl(mapped.canonicalSv),
    };
  }
}

