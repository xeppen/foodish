import { describe, expect, it } from "vitest";
import { selectMeals, selectMealsWithConstraints, type CandidateMeal } from "@/lib/planning/selection";

const meals: CandidateMeal[] = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
  { id: "c", name: "C" },
  { id: "d", name: "D" },
];

describe("selectMeals", () => {
  it("excludes recent meals when there are enough alternatives", () => {
    const selected = selectMeals(meals, 2, new Set(["a", "b"]), () => 0);
    expect(selected.map((meal) => meal.id)).toEqual(["d", "c"]);
  });

  it("falls back to full pool when exclusions leave too few options", () => {
    const selected = selectMeals(meals, 3, new Set(["a", "b", "c"]), () => 0);
    expect(selected).toHaveLength(3);
  });

  it("cycles meals when requested count exceeds available pool", () => {
    const selected = selectMeals(meals.slice(0, 2), 5, new Set(), () => 0.5);
    expect(selected.map((meal) => meal.id)).toEqual(["a", "b", "a", "b", "a"]);
  });
});

describe("selectMealsWithConstraints", () => {
  it("prioritizes non-recent and non-blocked meals", () => {
    const result = selectMealsWithConstraints(
      meals,
      2,
      new Set(["a"]),
      new Set(["b"]),
      () => 0
    );
    expect(result.selectedMeals.map((meal) => meal.id)).toEqual(["c", "d"]);
    expect(result.warnings).toEqual([]);
  });

  it("relaxes recent constraint before favorite-streak constraint", () => {
    const result = selectMealsWithConstraints(
      meals,
      3,
      new Set(["a", "b"]),
      new Set(["c"]),
      () => 0
    );
    expect(result.selectedMeals).toHaveLength(3);
    expect(result.warnings).toContain("included_recent_meal");
    expect(result.warnings).not.toContain("relaxed_favorite_streak");
  });

  it("repeats meals only when library has fewer than requested unique meals", () => {
    const result = selectMealsWithConstraints(
      meals.slice(0, 2),
      5,
      new Set(),
      new Set(),
      () => 0.5
    );
    expect(result.selectedMeals.map((meal) => meal.id)).toEqual(["a", "b", "a", "b", "a"]);
    expect(result.warnings).toContain("repeated_meal_due_to_small_library");
  });

  it("biases thumbs-up meals above thumbs-down meals over many runs", () => {
    const ratedMeals: CandidateMeal[] = [
      { id: "up", name: "Up", thumbsUpCount: 4, thumbsDownCount: 0 },
      { id: "neutral", name: "Neutral", thumbsUpCount: 0, thumbsDownCount: 0 },
      { id: "down", name: "Down", thumbsUpCount: 0, thumbsDownCount: 3 },
    ];

    let i = 0;
    const pseudoRandom = () => {
      i += 1;
      return ((i * 9301 + 49297) % 233280) / 233280;
    };

    const picks = { up: 0, neutral: 0, down: 0 };
    for (let run = 0; run < 600; run++) {
      const result = selectMealsWithConstraints(
        ratedMeals,
        1,
        new Set<string>(),
        new Set<string>(),
        pseudoRandom
      );
      picks[result.selectedMeals[0].id as "up" | "neutral" | "down"] += 1;
    }

    expect(picks.up).toBeGreaterThan(picks.neutral);
    expect(picks.neutral).toBeGreaterThan(picks.down);
    expect(picks.down).toBeGreaterThan(0);
  });
});
