import { prisma } from "@/lib/prisma";

type SimilarDishHit = {
  imageUrl: string;
  normalizedName: string;
};

// Placeholder hook for future embedding-based similarity lookup.
// Enabled by env flag but currently falls back to exact matching only.
export async function findSimilarDishImage(_dishName: string): Promise<SimilarDishHit | null> {
  if (process.env.DISH_IMAGE_SIMILARITY_ENABLED !== "true") {
    return null;
  }

  // TODO: Replace with embedding generation + vector similarity query.
  // Keeping a deterministic fallback query shape for future migration.
  const latestReady = await prisma.generatedDishImage.findFirst({
    where: {
      status: "READY",
      imageUrl: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      normalizedName: true,
      imageUrl: true,
    },
  });

  if (!latestReady?.imageUrl) {
    return null;
  }

  return {
    normalizedName: latestReady.normalizedName,
    imageUrl: latestReady.imageUrl,
  };
}

