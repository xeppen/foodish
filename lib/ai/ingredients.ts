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

function normalizeDraft(dishName: string, draft: IngredientDraft): IngredientDraft {
  return {
    ...draft,
    dishName,
    ingredients: draft.ingredients.map((item) => ({
      ...item,
      name: item.name.trim(),
      amount: item.amount ?? null,
      unit: normalizeUnit(item.unit ?? null),
      note: item.note?.trim() || null,
      optional: item.optional ?? false,
      confidence: item.confidence ?? null,
      needsReview:
        item.needsReview ??
        (item.confidence == null ||
          item.confidence < 0.7 ||
          item.amount == null ||
          normalizeUnit(item.unit ?? null) == null),
    })),
  };
}

async function fromOpenAI(dishName: string): Promise<IngredientDraft | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_500);
  let response: Response;
  try {
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
              "You generate concise shopping ingredient drafts for Swedish home-cooked meals. Return strict JSON with key ingredients array. Include amount and unit when likely. Use null if unknown. Add confidence between 0 and 1.",
          },
          {
            role: "user",
            content: `Dish: ${dishName}. Return JSON: {\"ingredients\":[{\"name\":string,\"amount\":number|null,\"unit\":string|null,\"note\":string|null,\"optional\":boolean,\"confidence\":number}]}`,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return null;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const validation = ingredientDraftSchema.safeParse({
    dishName,
    ingredients: (parsed as { ingredients?: unknown })?.ingredients,
    model: process.env.INGREDIENT_DRAFT_MODEL || "gpt-4o-mini",
  });
  if (!validation.success) {
    return null;
  }

  return {
    ...validation.data,
    cached: false,
  };
}

export async function generateIngredientDraft(dishNameInput: string): Promise<IngredientDraft> {
  const dishName = dishNameInput.trim();
  const cacheKey = dishName.toLowerCase();

  const cached = draftCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      cached: true,
    };
  }

  const ai = await fromOpenAI(dishName);
  const draft = normalizeDraft(dishName, ai ?? heuristicDraft(dishName));
  draftCache.set(cacheKey, draft);
  return draft;
}
