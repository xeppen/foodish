import { describe, expect, it } from "vitest";
import {
  selectMeals,
  selectMealsByDay,
  selectMealsWithSmartRotation,
  selectMealsWithConstraints,
  type CandidateMeal,
  type DayAwareCandidateMeal,
} from "@/lib/planning/selection";

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

describe("selectMealsByDay", () => {
  it("biases meals toward preferred weekdays", () => {
    const dayMeals: DayAwareCandidateMeal[] = [
      { id: "fancy", name: "Fancy Friday", preferredDays: ["FRIDAY"] },
      { id: "quick", name: "Quick Monday", preferredDays: ["MONDAY"] },
      { id: "neutral-a", name: "Neutral A", preferredDays: [] },
      { id: "neutral-b", name: "Neutral B", preferredDays: [] },
      { id: "neutral-c", name: "Neutral C", preferredDays: [] },
    ];

    let seed = 0;
    const pseudoRandom = () => {
      seed += 1;
      return ((seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    };

    let quickOnMonday = 0;
    let fancyOnFriday = 0;

    for (let run = 0; run < 300; run++) {
      const result = selectMealsByDay(
        dayMeals,
        ["monday"],
        new Set<string>(),
        new Set<string>(),
        new Map(),
        pseudoRandom
      );

      if (result.selectedMeals[0]?.id === "quick") {
        quickOnMonday += 1;
      }
    }

    for (let run = 0; run < 300; run++) {
      const result = selectMealsByDay(
        dayMeals,
        ["friday"],
        new Set<string>(),
        new Set<string>(),
        new Map(),
        pseudoRandom
      );

      if (result.selectedMeals[0]?.id === "fancy") {
        fancyOnFriday += 1;
      }
    }

    expect(quickOnMonday).toBeGreaterThan(120);
    expect(fancyOnFriday).toBeGreaterThan(120);
  });

  it("uses adaptive day signals to de-prioritize swapped-away meals", () => {
    const dayMeals: DayAwareCandidateMeal[] = [
      { id: "a", name: "Meal A", preferredDays: [] },
      { id: "b", name: "Meal B", preferredDays: [] },
      { id: "c", name: "Meal C", preferredDays: [] },
      { id: "d", name: "Meal D", preferredDays: [] },
      { id: "e", name: "Meal E", preferredDays: [] },
    ];

    const signals = new Map([
      ["a:friday", { shownCount: 6, swappedAwayCount: 5, selectedCount: 0 }],
      ["b:friday", { shownCount: 2, swappedAwayCount: 0, selectedCount: 1 }],
    ]);

    const result = selectMealsByDay(
      dayMeals,
      ["monday", "tuesday", "wednesday", "thursday", "friday"],
      new Set<string>(),
      new Set<string>(),
      signals,
      () => 0
    );

    expect(result.selectedMeals).toHaveLength(5);
    expect(result.selectedMeals[4].id).not.toBe("a");
  });
});

describe("selectMealsWithSmartRotation", () => {
  const rotationMeals: CandidateMeal[] = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" },
    { id: "d", name: "D" },
    { id: "e", name: "E" },
    { id: "f", name: "F" },
  ];

  it("applies recency + frequency penalties and keeps picks unique", () => {
    let seed = 0;
    const pseudoRandom = () => {
      seed += 1;
      return ((seed * 9301 + 49297) % 233280) / 233280;
    };

    const counts = new Map<string, number>([
      ["a", 6],
      ["b", 3],
      ["c", 1],
      ["d", 0],
      ["e", 0],
      ["f", 0],
    ]);

    const picks: Record<string, number> = {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      f: 0,
    };

    for (let run = 0; run < 500; run++) {
      const result = selectMealsWithSmartRotation(
        rotationMeals,
        1,
        {
          lastWeekMealIds: new Set(["a"]),
          twoWeeksAgoMealIds: new Set(["b"]),
          occurrencesLast4Weeks: counts,
        },
        pseudoRandom
      );
      picks[result.selectedMeals[0].id] += 1;
    }

    expect(picks.a).toBeLessThan(picks.b);
    expect(picks.b).toBeLessThan(picks.d + picks.e + picks.f);
  });

  it("retries to avoid repeating last week's exact combination when alternatives exist", () => {
    const result = selectMealsWithSmartRotation(
      rotationMeals,
      5,
      {
        lastWeekMealIds: new Set(["a", "b", "c", "d", "e"]),
        twoWeeksAgoMealIds: new Set(),
        occurrencesLast4Weeks: new Map(),
        previousWeekMealIds: new Set(["a", "b", "c", "d", "e"]),
      },
      () => 0
    );

    const selectedIds = new Set(result.selectedMeals.map((meal) => meal.id));
    expect(selectedIds.size).toBe(5);
    expect(selectedIds).not.toEqual(new Set(["a", "b", "c", "d", "e"]));
    expect(result.repeatedLastWeekCombination).toBe(false);
  });
});
