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

  it("suggests amount and unit for common ingredients when missing", async () => {
    const result = await generateIngredientDraft("Pasta med kyckling");

    const chicken = result.ingredients.find((row) => row.name.toLowerCase().includes("kyckling"));
    const pasta = result.ingredients.find((row) => row.name.toLowerCase().includes("pasta"));

    expect(chicken).toEqual(
      expect.objectContaining({
        amount: expect.any(Number),
        unit: expect.any(String),
      })
    );
    expect(pasta).toEqual(
      expect.objectContaining({
        amount: expect.any(Number),
        unit: expect.any(String),
      })
    );
  });
});
