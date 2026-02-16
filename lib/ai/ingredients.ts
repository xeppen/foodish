import { normalizeUnit } from "@/lib/shopping/normalize";
import { z } from "zod";

export const ingredientDraftItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  amount: z.number().positive().max(10000).nullable().optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  note: z.string().trim().max(120).nullable().optional(),
  optional: z.boolean().optional().default(false),
  confidence: z.number().min(0).max(1).nullable().optional(),
  needsReview: z.boolean().optional().default(false),
});

export const ingredientDraftSchema = z.object({
  dishName: z.string().trim().min(1).max(140),
  ingredients: z.array(ingredientDraftItemSchema).min(1).max(40),
  model: z.string().optional(),
  cached: z.boolean().optional(),
});

export type IngredientDraft = z.infer<typeof ingredientDraftSchema>;

const draftCache = new Map<string, IngredientDraft>();
const draftDebugEnabled =
  process.env.INGREDIENT_DRAFT_DEBUG === "1" ||
  process.env.INGREDIENT_DRAFT_DEBUG === "true" ||
  process.env.NODE_ENV !== "production";
const draftCacheDisabled =
  process.env.INGREDIENT_DRAFT_DISABLE_CACHE === "1" ||
  process.env.INGREDIENT_DRAFT_DISABLE_CACHE === "true";
const draftTimeoutMs = Math.max(1000, Number(process.env.INGREDIENT_DRAFT_TIMEOUT_MS ?? 15000));
const draftRetryCount = Math.max(0, Number(process.env.INGREDIENT_DRAFT_RETRY_COUNT ?? 2));
const strictAiMode =
  process.env.NODE_ENV !== "test" &&
  (process.env.INGREDIENT_DRAFT_STRICT_AI === undefined ||
    process.env.INGREDIENT_DRAFT_STRICT_AI === "1" ||
    process.env.INGREDIENT_DRAFT_STRICT_AI === "true");

function logDraft(message: string, payload?: unknown) {
  if (!draftDebugEnabled) {
    return;
  }
  if (payload === undefined) {
    console.log(`[ingredient-draft] ${message}`);
    return;
  }
  console.log(`[ingredient-draft] ${message}`, payload);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function localizeIngredientName(name: string): string {
  const value = name.trim().toLowerCase();
  const map: Record<string, string> = {
    chicken: "Kyckling",
    rice: "Ris",
    pasta: "Pasta",
    sausage: "Korv",
    onion: "Lök",
    garlic: "Vitlök",
    oil: "Olja",
    salt: "Salt",
    pepper: "Peppar",
    tomato: "Tomat",
    tomatoes: "Tomat",
    "minced beef": "Köttfärs",
    "ground beef": "Köttfärs",
    "beef mince": "Köttfärs",
    cream: "Grädde",
    milk: "Mjölk",
    butter: "Smör",
    potato: "Potatis",
    potatoes: "Potatis",
    cheese: "Ost",
    tortillas: "Tortillabröd",
    tortilla: "Tortillabröd",
  };

  const localized = map[value];
  if (localized) {
    return localized;
  }

  return name.trim().charAt(0).toUpperCase() + name.trim().slice(1);
}

function heuristicDraft(dishName: string): IngredientDraft {
  const value = dishName.toLowerCase();
  const rows: IngredientDraft["ingredients"] = [];

  if (value.includes("kyckling") || value.includes("chicken")) {
    rows.push({ name: "Kyckling", amount: 600, unit: "g", confidence: 0.78, optional: false, needsReview: false });
  }
  if (value.includes("ris")) {
    rows.push({ name: "Ris", amount: 4, unit: "dl", confidence: 0.71, optional: false, needsReview: true });
  }
  if (value.includes("pasta")) {
    rows.push({ name: "Pasta", amount: 400, unit: "g", confidence: 0.74, optional: false, needsReview: false });
  }
  if (value.includes("korv")) {
    rows.push({ name: "Korv", amount: 500, unit: "g", confidence: 0.73, optional: false, needsReview: false });
  }
  if (value.includes("taco")) {
    rows.push({ name: "Tacobröd", amount: 8, unit: "st", confidence: 0.8, optional: false, needsReview: false });
    rows.push({ name: "Köttfärs", amount: 500, unit: "g", confidence: 0.79, optional: false, needsReview: false });
  }

  rows.push({ name: "Lök", amount: 1, unit: "st", confidence: 0.62, optional: false, needsReview: true });
  rows.push({ name: "Vitlök", amount: 2, unit: "klyfta", confidence: 0.56, optional: true, needsReview: true });
  rows.push({ name: "Olja", amount: 1, unit: "msk", confidence: 0.65, optional: false, needsReview: false });
  rows.push({ name: "Salt", amount: null, unit: null, confidence: 0.48, optional: false, needsReview: true });

  return {
    dishName,
    ingredients: rows
      .slice(0, 14)
      .map((row) => ({
        ...row,
        unit: normalizeUnit(row.unit),
      })),
    model: "heuristic-v1",
    cached: false,
  };
}

type AmountUnitSuggestion = {
  amount: number;
  unit: string;
  confidence: number;
};

function suggestAmountUnit(name: string): AmountUnitSuggestion | null {
  const value = name.trim().toLowerCase();
  if (!value) {
    return null;
  }

  const grams = (amount: number): AmountUnitSuggestion => ({ amount, unit: "g", confidence: 0.58 });
  const liters = (amount: number): AmountUnitSuggestion => ({ amount, unit: "dl", confidence: 0.58 });
  const pieces = (amount: number): AmountUnitSuggestion => ({ amount, unit: "st", confidence: 0.58 });

  if (value.includes("kyckling")) return grams(600);
  if (value.includes("köttfärs")) return grams(500);
  if (value.includes("nötfärs")) return grams(500);
  if (value.includes("fläskfärs")) return grams(500);
  if (value.includes("korv")) return grams(500);
  if (value.includes("pasta")) return grams(400);
  if (value.includes("ris")) return liters(4);
  if (value.includes("potatis")) return grams(900);
  if (value.includes("tomat")) return pieces(2);
  if (value.includes("lök")) return pieces(1);
  if (value.includes("vitlök")) return { amount: 2, unit: "klyfta", confidence: 0.56 };
  if (value.includes("grädde")) return liters(3);
  if (value.includes("mjölk")) return liters(3);
  if (value.includes("ost")) return grams(150);
  if (value.includes("smör")) return grams(25);
  if (value.includes("olja")) return { amount: 1, unit: "msk", confidence: 0.62 };
  if (value.includes("salt")) return { amount: 1, unit: "tsk", confidence: 0.5 };
  if (value.includes("peppar")) return { amount: 0.5, unit: "tsk", confidence: 0.5 };
  if (value.includes("buljong")) return { amount: 1, unit: "tärning", confidence: 0.52 };
  if (value.includes("tortilla")) return pieces(8);
  if (value.includes("bröd")) return pieces(8);
  return null;
}

function normalizeDraft(dishName: string, draft: IngredientDraft): IngredientDraft {
  return {
    ...draft,
    dishName,
    ingredients: draft.ingredients.map((item) => {
      const localizedName = localizeIngredientName(item.name);
      const normalizedUnit = normalizeUnit(item.unit ?? null);
      const suggestion = item.amount == null || normalizedUnit == null ? suggestAmountUnit(localizedName) : null;
      const amount = item.amount ?? suggestion?.amount ?? null;
      const unit = normalizedUnit ?? normalizeUnit(suggestion?.unit ?? null);
      const confidence =
        item.confidence == null
          ? suggestion?.confidence ?? null
          : suggestion
            ? Math.max(item.confidence, suggestion.confidence)
            : item.confidence;

      return {
        ...item,
        name: localizedName,
        amount,
        unit,
        note: item.note?.trim() || null,
        optional: item.optional ?? false,
        confidence,
        needsReview:
          item.needsReview ??
          (confidence == null || confidence < 0.7 || amount == null || unit == null),
      };
    }),
  };
}

async function fromOpenAI(dishName: string): Promise<IngredientDraft | null> {
  if (process.env.NODE_ENV === "test") {
    return null;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logDraft("OPENAI_API_KEY missing, using heuristic fallback");
    return null;
  }

  for (let attempt = 0; attempt <= draftRetryCount; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), draftTimeoutMs);
    let response: Response;
    try {
      logDraft("calling OpenAI", {
        dishName,
        model: process.env.INGREDIENT_DRAFT_MODEL || "gpt-4o-mini",
        timeoutMs: draftTimeoutMs,
        attempt: attempt + 1,
        maxAttempts: draftRetryCount + 1,
      });
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.INGREDIENT_DRAFT_MODEL || "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You generate shopping ingredient drafts for Swedish home-cooked meals. Return ONLY Swedish ingredient names and Swedish units. Allowed units: g, kg, ml, dl, cl, l, st, msk, tsk, krm, klyfta, skiva, förp, pkt. Use null when unknown. Return strict JSON with key ingredients array and confidence 0..1.",
            },
            {
              role: "user",
              content: `Rätt: ${dishName}. Returnera JSON: {\"ingredients\":[{\"name\":string,\"amount\":number|null,\"unit\":string|null,\"note\":string|null,\"optional\":boolean,\"confidence\":number}]}. Ingrediensnamn och note ska vara på svenska.`,
            },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      logDraft("OpenAI request failed", {
        dishName,
        attempt: attempt + 1,
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt < draftRetryCount) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      logDraft("OpenAI non-OK response", {
        dishName,
        attempt: attempt + 1,
        status: response.status,
        body,
      });
      if (attempt < draftRetryCount && (response.status === 429 || response.status >= 500)) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) {
      logDraft("OpenAI response had no content", { dishName, payload });
      if (attempt < draftRetryCount) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      return null;
    }
    logDraft("OpenAI raw response content", { dishName, raw });

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      logDraft("OpenAI response JSON parse failed", {
        dishName,
        error: error instanceof Error ? error.message : String(error),
        raw,
      });
      if (attempt < draftRetryCount) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      return null;
    }

    const validation = ingredientDraftSchema.safeParse({
      dishName,
      ingredients: (parsed as { ingredients?: unknown })?.ingredients,
      model: process.env.INGREDIENT_DRAFT_MODEL || "gpt-4o-mini",
    });
    if (!validation.success) {
      logDraft("OpenAI response failed schema validation", {
        dishName,
        attempt: attempt + 1,
        issues: validation.error.issues,
        parsed,
      });
      if (attempt < draftRetryCount) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      return null;
    }

    logDraft("OpenAI draft accepted", {
      dishName,
      ingredientCount: validation.data.ingredients.length,
      attempt: attempt + 1,
    });
    return {
      ...validation.data,
      cached: false,
    };
  }

  return null;
}

export async function generateIngredientDraft(dishNameInput: string): Promise<IngredientDraft> {
  const dishName = dishNameInput.trim();
  const cacheKey = dishName.toLowerCase();
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);

  if (!draftCacheDisabled) {
    const cached = draftCache.get(cacheKey);
    if (cached) {
      logDraft("cache hit", { dishName, model: cached.model });
      return {
        ...cached,
        cached: true,
      };
    }
  }

  const ai = await fromOpenAI(dishName);
  if (!ai && hasOpenAiKey && strictAiMode) {
    logDraft("AI strict mode enabled: refusing heuristic fallback", { dishName });
    throw new Error("AI kunde inte generera ingredienser just nu. Försök igen.");
  }

  const usedFallback = ai == null;
  const draft = normalizeDraft(dishName, ai ?? heuristicDraft(dishName));
  if (!draftCacheDisabled) {
    draftCache.set(cacheKey, draft);
  }
  logDraft("draft generated", {
    dishName,
    source: usedFallback ? "heuristic-fallback" : "openai",
    model: draft.model,
    ingredientCount: draft.ingredients.length,
  });
  return draft;
}
