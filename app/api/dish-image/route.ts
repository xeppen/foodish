import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrGenerateDishImage } from "@/lib/image-generation/orchestrator";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const requestBuckets = new Map<string, number[]>();

const payloadSchema = z.object({
  dishName: z
    .string()
    .trim()
    .min(2, "Måltidsnamnet är för kort")
    .max(120, "Måltidsnamnet är för långt")
    .regex(/^[a-zA-Z0-9\såäöÅÄÖ.,'/-]+$/, "Måltidsnamnet innehåller ogiltiga tecken"),
});

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

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return "unknown-ip";
  }
  return forwarded.split(",")[0]?.trim() || "unknown-ip";
}

export async function POST(request: NextRequest) {
  const parsedBody = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Ogiltig förfrågan" },
      { status: 400 }
    );
  }

  const { userId } = await auth();
  const bucket = userId ? `user:${userId}` : `ip:${getClientIp(request)}`;
  const now = Date.now();
  if (hitRateLimit(bucket, now)) {
    return NextResponse.json({ error: "För många bildgenereringar. Vänta en stund och försök igen." }, { status: 429 });
  }

  const result = await getOrGenerateDishImage(parsedBody.data.dishName, request.signal);

  if (result.status === "ready") {
    return NextResponse.json({ imageUrl: result.imageUrl, wasGenerated: result.wasGenerated });
  }
  if (result.status === "pending") {
    return NextResponse.json(
      { status: "pending", message: "Bildgenerering pågår. Försök igen om en stund." },
      { status: 202 }
    );
  }
  return NextResponse.json(
    { imageUrl: result.imageUrl, wasGenerated: false, error: result.message },
    { status: 503 }
  );
}

