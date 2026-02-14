import { createHash } from "node:crypto";
import { type ImageSearchCandidate } from "@/lib/image-search/types";

type PexelsPhoto = {
  id: number;
  width?: number;
  height?: number;
  url?: string;
  src?: {
    medium?: string;
    large?: string;
    large2x?: string;
    original?: string;
  };
};

type PexelsResponse = {
  photos?: PexelsPhoto[];
};

const PEXELS_ENDPOINT = "https://api.pexels.com/v1/search";

function hashId(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function toCandidate(photo: PexelsPhoto): ImageSearchCandidate | null {
  const thumbUrl = photo.src?.medium ?? photo.src?.large ?? photo.src?.large2x;
  const fullUrl = photo.src?.large2x ?? photo.src?.original ?? photo.src?.large ?? photo.src?.medium;
  const pageUrl = photo.url;
  if (!thumbUrl || !fullUrl || !pageUrl) {
    return null;
  }

  return {
    id: hashId(`pexels-${photo.id}-${fullUrl}`),
    thumbUrl,
    fullUrl,
    pageUrl,
    width: photo.width,
    height: photo.height,
    source: "pexels",
  };
}

export async function searchPexelsMealImages(query: string, signal?: AbortSignal): Promise<ImageSearchCandidate[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    query,
    per_page: "8",
    orientation: "landscape",
    size: "large",
  });

  const response = await fetch(`${PEXELS_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    signal,
    headers: {
      Authorization: apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Pexels search failed with ${response.status}`);
  }

  const payload = (await response.json()) as PexelsResponse;
  return (payload.photos ?? [])
    .map(toCandidate)
    .filter((item): item is ImageSearchCandidate => item !== null);
}

