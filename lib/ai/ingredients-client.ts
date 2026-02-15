export type IngredientDraftItem = {
  name: string;
  amount: number | null;
  unit: string | null;
  note?: string | null;
  optional?: boolean;
  confidence?: number | null;
  needsReview?: boolean;
};

export async function generateIngredientDraftClient(dishName: string): Promise<{
  ingredients: IngredientDraftItem[];
  model?: string;
  cached?: boolean;
}> {
  const response = await fetch("/api/meal-ingredients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dishName }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    ingredients?: IngredientDraftItem[];
    model?: string;
    cached?: boolean;
  };

  if (!response.ok || !payload.ingredients) {
    throw new Error(payload.error ?? "Kunde inte generera ingredienser.");
  }

  return {
    ingredients: payload.ingredients,
    model: payload.model,
    cached: payload.cached,
  };
}
