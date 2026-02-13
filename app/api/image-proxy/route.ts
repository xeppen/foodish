import { NextRequest, NextResponse } from "next/server";
import { buildFallbackMealImageUrl } from "@/lib/meal-image-url";

const FETCH_TIMEOUT_MS = 7000;

function withTimeout(signal: AbortSignal, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  signal.addEventListener("abort", () => {
    clearTimeout(timeout);
    controller.abort();
  });

  return controller.signal;
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  const meal = request.nextUrl.searchParams.get("meal") || "Meal";
  const fallback = buildFallbackMealImageUrl(meal);

  if (!src) {
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  try {
    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: withTimeout(request.signal, FETCH_TIMEOUT_MS),
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; FoodishImageProxy/1.0)",
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.redirect(new URL(fallback, request.url));
    }

    const body = await response.arrayBuffer();

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.redirect(new URL(fallback, request.url));
  }
}
