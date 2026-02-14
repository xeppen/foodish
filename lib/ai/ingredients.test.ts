import { describe, expect, it } from "vitest";
import { generateIngredientDraft } from "@/lib/ai/ingredients";

describe("generateIngredientDraft", () => {
  it("returns structured ingredients with review flags", async () => {
    const result = await generateIngredientDraft("Korv stroganoff med ris");

    expect(result.ingredients.length).toBeGreaterThan(0);
    expect(result.ingredients[0]).toEqual(
      expect.objectContaining({
        name: expect.any(String),
      })
    );
    expect(result.ingredients.some((row) => row.needsReview)).toBe(true);
  });
});
