import { describe, expect, it } from "vitest";
import { aggregateShoppingIngredients } from "@/lib/shopping/aggregate";

describe("aggregateShoppingIngredients", () => {
  it("merges compatible mass units", () => {
    const result = aggregateShoppingIngredients([
      { mealId: "m1", mealName: "A", name: "Potatis", amount: 1, unit: "kg" },
      { mealId: "m2", mealName: "B", name: "Potatis", amount: 500, unit: "g" },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ canonicalName: "potatis", amount: 1500, unit: "g" });
  });

  it("marks unresolved rows when amount or unit is missing", () => {
    const result = aggregateShoppingIngredients([
      { mealId: "m1", mealName: "A", name: "Salt", amount: null, unit: null },
    ]);

    expect(result[0]).toMatchObject({ unresolved: true, amount: null, unit: null });
  });

  it("merges unresolved duplicate into quantified ingredient when canonical matches", () => {
    const result = aggregateShoppingIngredients([
      { mealId: "m1", mealName: "A", name: "Kyckling", amount: 500, unit: "g" },
      { mealId: "m2", mealName: "B", name: "Chicken", amount: null, unit: null },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      canonicalName: "kyckling",
      amount: 500,
      unit: "g",
      unresolved: true,
    });
    expect(result[0].sourceMealNames).toEqual(expect.arrayContaining(["A", "B"]));
  });
});
