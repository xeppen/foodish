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

  // TODO: Implement embedding/vector similarity. Until then, never reuse by "similarity".
  return null;
}
