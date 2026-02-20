import { beforeEach, describe, expect, it, vi } from "vitest";

type MealSeed = {
  id: string;
  name: string;
  userId: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  thumbsUpCount: number;
  thumbsDownCount: number;
  preferredDays: never[];
  mealIngredients: Array<{
    name: string;
    canonicalName: string;
    amount: number | null;
    unit: string | null;
  }>;
};

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;
const dayToEnum = {
  monday: "MONDAY",
  tuesday: "TUESDAY",
  wednesday: "WEDNESDAY",
  thursday: "THURSDAY",
  friday: "FRIDAY",
} as const;

const { mockGetCurrentUser, mockRevalidatePath, prismaMock, state } = vi.hoisted(() => {
  const state = {
    meals: [] as MealSeed[],
    plan: null as null | {
      id: string;
      userId: string;
      weekStartDate: Date;
      monday: string | null;
      tuesday: string | null;
      wednesday: string | null;
      thursday: string | null;
      friday: string | null;
    },
    entries: new Map<string, string>(), // day enum -> mealId
    shoppingItems: [] as Array<Record<string, unknown>>,
  };

  const prismaMock = {
    weeklyPlan: {
      findUnique: vi.fn(async (args?: any) => {
        if (!state.plan) return null;
        if (args?.include?.entries) {
          return {
            ...state.plan,
            entries: Array.from(state.entries.entries()).map(([day, mealId]) => {
              const meal = state.meals.find((m) => m.id === mealId)!;
              return {
                day,
                mealId,
                meal: {
                  id: meal.id,
                  name: meal.name,
                  ingredients: meal.mealIngredients.map((i) => i.name),
                  mealIngredients: meal.mealIngredients.map((i, idx) => ({ ...i, position: idx })),
                },
              };
            }),
          };
        }
        return state.plan;
      }),
      upsert: vi.fn(async (args: any) => {
        const payload = args.create ?? args.update;
        state.plan = {
          id: "plan_1",
          userId: payload.userId,
          weekStartDate: payload.weekStartDate,
          monday: payload.monday,
          tuesday: payload.tuesday,
          wednesday: payload.wednesday,
          thursday: payload.thursday,
          friday: payload.friday,
        };
        return state.plan;
      }),
      update: vi.fn(async (args: any) => {
        if (!state.plan) throw new Error("no plan");
        state.plan = { ...state.plan, ...args.data };
        return state.plan;
      }),
    },
    weeklyPlanEntry: {
      deleteMany: vi.fn(async () => {
        state.entries.clear();
        return { count: 0 };
      }),
      createMany: vi.fn(async (args: any) => {
        for (const row of args.data) state.entries.set(row.day, row.mealId);
        return { count: args.data.length };
      }),
      upsert: vi.fn(async (args: any) => {
        const day = args.where.weeklyPlanId_day.day;
        const mealId = args.update?.mealId ?? args.create.mealId;
        state.entries.set(day, mealId);
        return {};
      }),
    },
    meal: {
      findMany: vi.fn(async (args?: any) => {
        let meals = state.meals.filter((m) => !args?.where?.userId || m.userId === args.where.userId);
        if (args?.where?.name?.in) {
          meals = meals.filter((m) => args.where.name.in.includes(m.name));
        }
        return meals.map((meal) => ({
          id: meal.id,
          name: meal.name,
          complexity: meal.complexity,
          thumbsUpCount: meal.thumbsUpCount,
          thumbsDownCount: meal.thumbsDownCount,
          preferredDays: meal.preferredDays,
        }));
      }),
      findUnique: vi.fn(async (args: any) => {
        const meal = state.meals.find((m) => m.id === args.where.id);
        return meal ? { id: meal.id, name: meal.name, userId: meal.userId } : null;
      }),
      findFirst: vi.fn(async (args: any) => {
        const meal = state.meals.find((m) => m.userId === args.where.userId && m.name === args.where.name);
        return meal ? { id: meal.id } : null;
      }),
    },
    mealHistory: {
      findMany: vi.fn(async () => []),
      createMany: vi.fn(async () => ({ count: 5 })),
      create: vi.fn(async () => ({ id: "u1" })),
    },
    mealDaySignal: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(async () => ({})),
    },
    shoppingList: {
      upsert: vi.fn(async () => ({ id: "sl_1" })),
      findUnique: vi.fn(async () => null),
    },
    shoppingListItem: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async (args: any) => {
        state.shoppingItems = args.data;
        return { count: args.data.length };
      }),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (arg: any) => {
      if (typeof arg === "function") return arg(prismaMock as any);
      return Promise.all(arg);
    }),
  };

  return {
    mockGetCurrentUser: vi.fn(),
    mockRevalidatePath: vi.fn(),
    prismaMock,
    state,
  };
});

vi.mock("@/lib/auth", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/planning/selection", async () => {
  const actual = await vi.importActual<any>("@/lib/planning/selection");
  return {
    ...actual,
    selectMealsByDay: (allMeals: any[], dayOrder: string[]) => ({
      selectedMeals: allMeals.slice(0, dayOrder.length),
      warnings: [],
    }),
    selectMealsWithSmartRotation: (allMeals: any[], count: number) => ({
      selectedMeals: allMeals.slice(0, count),
      repeatedLastWeekCombination: false,
    }),
    selectMealsWithDayAwareSmartRotation: (allMeals: any[], dayOrder: string[]) => ({
      selectedMeals: allMeals.slice(0, dayOrder.length),
      warnings: [],
      repeatedLastWeekCombination: false,
    }),
    selectMeals: (allMeals: any[], count: number) => allMeals.slice(0, count),
  };
});
vi.mock("@/lib/ai/ingredients", () => ({
  generateIngredientDraft: vi.fn(async (dishName: string) => ({
    dishName,
    ingredients: [{ name: "Lök", amount: 1, unit: "st", optional: false, confidence: 0.8, needsReview: false }],
    model: "mock",
    cached: false,
  })),
}));

import { generateWeeklyPlan, swapDayMealWithChoice } from "@/lib/actions/plans";
import { generateCurrentWeekShoppingList } from "@/lib/actions/shopping-list";

describe("user scenario: plan -> swaps -> shopping list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue({ id: "user_1", name: "Scenario User" });
    state.plan = null;
    state.entries.clear();
    state.shoppingItems = [];

    state.meals = [
      {
        id: "m1",
        name: "Köttbullar med potatis",
        userId: "user_1",
        complexity: "MEDIUM",
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        preferredDays: [],
        mealIngredients: [
          { name: "Potatis", canonicalName: "potatis", amount: 1, unit: "kg" },
          { name: "Köttbullar", canonicalName: "köttbullar", amount: 600, unit: "g" },
        ],
      },
      {
        id: "m2",
        name: "Fiskpinnar med potatis",
        userId: "user_1",
        complexity: "SIMPLE",
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        preferredDays: [],
        mealIngredients: [
          { name: "Potatis", canonicalName: "potatis", amount: 500, unit: "g" },
          { name: "Fiskpinnar", canonicalName: "fiskpinnar", amount: 400, unit: "g" },
        ],
      },
      {
        id: "m3",
        name: "Pannkakor med sylt",
        userId: "user_1",
        complexity: "SIMPLE",
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        preferredDays: [],
        mealIngredients: [
          { name: "Mjöl", canonicalName: "mjöl", amount: 3, unit: "dl" },
          { name: "Sylt", canonicalName: "sylt", amount: null, unit: null },
        ],
      },
      {
        id: "m4",
        name: "Kyckling med ris",
        userId: "user_1",
        complexity: "MEDIUM",
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        preferredDays: [],
        mealIngredients: [
          { name: "Kyckling", canonicalName: "kyckling", amount: 700, unit: "g" },
          { name: "Ris", canonicalName: "ris", amount: 4, unit: "dl" },
        ],
      },
      {
        id: "m5",
        name: "Tacos",
        userId: "user_1",
        complexity: "MEDIUM",
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        preferredDays: [],
        mealIngredients: [
          { name: "Köttfärs", canonicalName: "köttfärs", amount: 500, unit: "g" },
        ],
      },
      {
        id: "m6",
        name: "Lasagne",
        userId: "user_1",
        complexity: "COMPLEX",
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        preferredDays: [],
        mealIngredients: [{ name: "Nötfärs", canonicalName: "nötfärs", amount: 500, unit: "g" }],
      },
      {
        id: "m7",
        name: "Pytt i panna",
        userId: "user_1",
        complexity: "SIMPLE",
        thumbsUpCount: 0,
        thumbsDownCount: 0,
        preferredDays: [],
        mealIngredients: [
          { name: "Potatis", canonicalName: "potatis", amount: 400, unit: "g" },
          { name: "Ägg", canonicalName: "ägg", amount: 4, unit: "st" },
        ],
      },
    ];
  });

  it("keeps shopping list accurate after user swaps with no duplicates", async () => {
    const planResult = await generateWeeklyPlan({ force: true, revalidate: false });
    expect(planResult).toMatchObject({ success: true });

    const mondaySwap = await swapDayMealWithChoice("monday", "m6");
    expect(mondaySwap).toMatchObject({ success: true, mealId: "m6" });

    const fridaySwap = await swapDayMealWithChoice("friday", "m7");
    expect(fridaySwap).toMatchObject({ success: true, mealId: "m7" });

    const listResult = await generateCurrentWeekShoppingList();
    expect(listResult).toMatchObject({ success: true });

    const items = state.shoppingItems as Array<{
      canonicalName: string;
      displayName: string;
      amount: number | null;
      unit: string | null;
    }>;
    if (process.env.SHOW_SCENARIO_OUTPUT === "1") {
      console.log(
        "[scenario-shopping-items]",
        items.map((item) => ({
          name: item.displayName,
          canonical: item.canonicalName,
          amount: item.amount,
          unit: item.unit,
        }))
      );
    }

    const canonicalNames = items.map((i) => i.canonicalName);
    expect(new Set(canonicalNames).size).toBe(canonicalNames.length);

    const potatis = items.find((i) => i.canonicalName === "potatis");
    expect(potatis).toBeDefined();
    expect(potatis?.amount).toBe(900);
    expect(potatis?.unit).toBe("g");
  });
});
