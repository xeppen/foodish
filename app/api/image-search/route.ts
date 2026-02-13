import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { buildEnglishImageSearchQuery } from "@/lib/image-search/query";
import { searchPexelsMealImages } from "@/lib/image-search/pexels";
import { searchUnsplashMealImages } from "@/lib/image-search/unsplash";
import { mergeImageCandidates } from "@/lib/image-search/merge";
import { type ImageSearchCandidate } from "@/lib/image-search/types";

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 120;
const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const FETCH_TIMEOUT_MS = 7000;

const queryCache = new Map<string, { expiresAt: number; candidates: ImageSearchCandidate[] }>();
const requestBuckets = new Map<string, number[]>();

function cleanupCache(now: number) {
  for (const [key, entry] of queryCache.entries()) {
    if (entry.expiresAt <= now) {
      queryCache.delete(key);
    }
  }
}

function cleanupBuckets(now: number) {
  const threshold = now - RATE_LIMIT_WINDOW_MS;
  for (const [key, timestamps] of requestBuckets.entries()) {
    const fresh = timestamps.filter((stamp) => stamp > threshold);
    if (fresh.length === 0) {
      requestBuckets.delete(key);
    } else {
      requestBuckets.set(key, fresh);
    }
  }
}

function hitRateLimit(bucket: string, now: number): boolean {
  cleanupBuckets(now);
  const existing = requestBuckets.get(bucket) ?? [];
  const fresh = existing.filter((stamp) => stamp > now - RATE_LIMIT_WINDOW_MS);
  if (fresh.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestBuckets.set(bucket, fresh);
    return true;
  }

  fresh.push(now);
  requestBuckets.set(bucket, fresh);
  return false;
}

function withTimeout(signal: AbortSignal, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  signal.addEventListener("abort", () => {
    clearTimeout(timeout);
    controller.abort();
  });

  return controller.signal;
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return "unknown-ip";
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const query = rawQuery.trim().replace(/\s+/g, " ");

  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Sökfrågan måste vara mellan 3 och 120 tecken." },
      { status: 400 }
    );
  }

  const { userId } = await auth();
  const bucket = userId ? `user:${userId}` : `ip:${getClientIp(request)}`;
  const now = Date.now();
  if (hitRateLimit(bucket, now)) {
    return NextResponse.json({ error: "För många bildsökningar. Vänta en stund och försök igen." }, { status: 429 });
  }

  cleanupCache(now);
  const cacheKey = query.toLowerCase();
  const cacheHit = queryCache.get(cacheKey);
  if (cacheHit && cacheHit.expiresAt > now) {
    return NextResponse.json({
      query,
      candidates: cacheHit.candidates.slice(0, 3),
    });
  }

  try {
    const hasPexels = Boolean(process.env.PEXELS_API_KEY);
    const hasUnsplash = Boolean(process.env.UNSPLASH_ACCESS_KEY);
    if (!hasPexels && !hasUnsplash) {
      return NextResponse.json(
        { error: "Bildsökning är inte konfigurerad. Lägg till PEXELS_API_KEY eller UNSPLASH_ACCESS_KEY." },
        { status: 502 }
      );
    }

    const translatedQuery = buildEnglishImageSearchQuery(query);
    const signal = withTimeout(request.signal, FETCH_TIMEOUT_MS);
    const [pexelsCandidates, unsplashCandidates] = await Promise.allSettled([
      searchPexelsMealImages(translatedQuery, signal),
      searchUnsplashMealImages(translatedQuery, signal),
    ]);

    const pexels =
      pexelsCandidates.status === "fulfilled"
        ? pexelsCandidates.value
        : [];
    const unsplash =
      unsplashCandidates.status === "fulfilled"
        ? unsplashCandidates.value
        : [];
    const candidates = mergeImageCandidates(pexels, unsplash, 3);

    if (pexelsCandidates.status === "rejected" && unsplashCandidates.status === "rejected") {
      throw new Error("All image providers failed");
    }

    queryCache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      candidates,
    });

    return NextResponse.json({ query, candidates });
  } catch (error) {
    console.error("Image search failed", { query, error });
    return NextResponse.json({ error: "Bildsökningen misslyckades. Försök igen." }, { status: 502 });
  }
}
