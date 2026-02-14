import { auth } from "@clerk/nextjs/server";
import { generateIngredientDraft } from "@/lib/ai/ingredients";
import { NextResponse } from "next/server";
import { z } from "zod";

const payloadSchema = z.object({
  dishName: z.string().trim().min(2).max(140),
});

const requestsPerMinute = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identity: string, now = Date.now()): boolean {
  const entry = requestsPerMinute.get(identity);
  if (!entry || entry.resetAt <= now) {
    requestsPerMinute.set(identity, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 20) {
    return false;
  }

  entry.count += 1;
  requestsPerMinute.set(identity, entry);
  return true;
}

export async function POST(request: Request) {
  const body = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.issues[0]?.message ?? "Ogiltig indata" }, { status: 400 });
  }

  const { userId } = await auth();
  const identity = userId ?? request.headers.get("x-forwarded-for") ?? "anonymous";
  if (!checkRateLimit(identity)) {
    return NextResponse.json({ error: "För många förfrågningar. Försök igen om en minut." }, { status: 429 });
  }

  try {
    const draft = await generateIngredientDraft(body.data.dishName);
    return NextResponse.json({
      dishName: draft.dishName,
      model: draft.model,
      cached: draft.cached,
      ingredients: draft.ingredients,
    });
  } catch (error) {
    console.error("Ingredient draft failed", error);
    return NextResponse.json({ error: "Kunde inte generera ingredienser just nu." }, { status: 500 });
  }
}
