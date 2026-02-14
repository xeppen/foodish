import { type ImageSearchResponse } from "@/lib/image-search/types";

export async function searchMealImages(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/image-search?${params.toString()}`, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Kunde inte söka efter bilder");
  }

  return (await response.json()) as ImageSearchResponse;
}

