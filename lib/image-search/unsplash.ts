import { createHash } from "node:crypto";
import { type ImageSearchCandidate } from "@/lib/image-search/types";

type UnsplashPhoto = {
  id: string;
  width?: number;
  height?: number;
  urls?: {
    thumb?: string;
    small?: string;
    regular?: string;
    full?: string;
  };
  links?: {
    html?: string;
  };
};

type UnsplashResponse = {
  results?: UnsplashPhoto[];
};

const UNSPLASH_ENDPOINT = "https://api.unsplash.com/search/photos";

function hashId(value: string) {
  return createHash("sha1").update(value).digest("hex").slice(0, 16);
}

function toCandidate(photo: UnsplashPhoto): ImageSearchCandidate | null {
  const thumbUrl = photo.urls?.thumb ?? photo.urls?.small;
  const fullUrl = photo.urls?.regular ?? photo.urls?.full ?? photo.urls?.small;
  const pageUrl = photo.links?.html;
  if (!thumbUrl || !fullUrl || !pageUrl) {
    return null;
  }

  return {
    id: hashId(`unsplash-${photo.id}-${fullUrl}`),
    thumbUrl,
    fullUrl,
    pageUrl,
    width: photo.width,
    height: photo.height,
    source: "unsplash",
  };
}

export async function searchUnsplashMealImages(query: string, signal?: AbortSignal): Promise<ImageSearchCandidate[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return [];
  }

  const params = new URLSearchParams({
    query,
    per_page: "8",
    orientation: "landscape",
    content_filter: "high",
  });

  const response = await fetch(`${UNSPLASH_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    signal,
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Unsplash search failed with ${response.status}`);
  }

  const payload = (await response.json()) as UnsplashResponse;
  return (payload.results ?? [])
    .map(toCandidate)
    .filter((item): item is ImageSearchCandidate => item !== null);
}

