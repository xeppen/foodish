type DishImageResponse = {
  imageUrl?: string;
  wasGenerated?: boolean;
  status?: "pending";
  error?: string;
  message?: string;
};

export async function generateDishImageUrl(dishName: string): Promise<{
  imageUrl: string;
  wasGenerated: boolean;
}> {
  const response = await fetch("/api/dish-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ dishName }),
  });

  const payload = (await response.json().catch(() => ({}))) as DishImageResponse;
  if (response.status === 202 || payload.status === "pending") {
    throw new Error("Bildgenerering pågår. Försök igen om en stund.");
  }
  if (!response.ok || !payload.imageUrl) {
    throw new Error(payload.error ?? payload.message ?? "Kunde inte generera bild");
  }

  return {
    imageUrl: payload.imageUrl,
    wasGenerated: Boolean(payload.wasGenerated),
  };
}

