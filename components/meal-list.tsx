"use client";

import { deleteMeal, voteMeal } from "@/lib/actions/meals";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildFallbackMealImageUrl, resolveMealImageUrl } from "@/lib/meal-image-url";

type Meal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  preferredDays: ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY")[];
  thumbsUpCount: number;
  thumbsDownCount: number;
  imageUrl: string | null;
  mealIngredients?: Array<{
    name: string;
    amount: number | null;
    unit: string | null;
    note: string | null;
    optional: boolean;
    confidence: number | null;
    needsReview: boolean;
  }>;
  createdAt: Date | string;
};

const DOT_COLOR: Record<Meal["complexity"], string> = {
  SIMPLE: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  COMPLEX: "bg-red-500",
};

const DAY_OPTIONS: Array<{ value: Meal["preferredDays"][number]; short: string }> = [
  { value: "MONDAY", short: "M" },
  { value: "TUESDAY", short: "T" },
  { value: "WEDNESDAY", short: "O" },
  { value: "THURSDAY", short: "T" },
  { value: "FRIDAY", short: "F" },
  { value: "SATURDAY", short: "L" },
  { value: "SUNDAY", short: "S" },
];

export function MealList({
  meals,
  onEditMeal,
}: {
  meals: Meal[];
  onEditMeal: (meal: Meal) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, { up: number; down: number }>>(
    Object.fromEntries(meals.map((meal) => [meal.id, { up: meal.thumbsUpCount, down: meal.thumbsDownCount }]))
  );
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const router = useRouter();

  async function handleVote(id: string, direction: "up" | "down") {
    const current = votes[id] ?? { up: 0, down: 0 };
    const optimistic = direction === "up" ? { up: current.up + 1, down: current.down } : { up: current.up, down: current.down + 1 };

    setVotes((state) => ({ ...state, [id]: optimistic }));
    setPendingVoteId(id);

    const result = await voteMeal(id, direction);
    if (result.error) {
      setVotes((state) => ({ ...state, [id]: current }));
    } else {
      setVotes((state) => ({
        ...state,
        [id]: {
          up: result.meal?.thumbsUpCount ?? optimistic.up,
          down: result.meal?.thumbsDownCount ?? optimistic.down,
        },
      }));
    }

    setPendingVoteId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Är du säker på att du vill ta bort den här måltiden?")) {
      return;
    }

    const result = await deleteMeal(id);
    if (!result.error) {
      router.refresh();
    }
  }

  return (
    <ul className="divide-y divide-[var(--cream-dark)] rounded-xl border border-[var(--cream-dark)] bg-white">
      {meals.map((meal) => {
        const mealVotes = votes[meal.id] ?? { up: meal.thumbsUpCount, down: meal.thumbsDownCount };
        const imageSrc = resolveMealImageUrl(meal.imageUrl, meal.name);

        return (
          <li key={meal.id} className="relative px-2 py-2">
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
              <div className="relative h-10 w-10 overflow-hidden rounded-md">
                <img
                  src={imageSrc}
                  alt={meal.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    const fallback = buildFallbackMealImageUrl(meal.name);
                    if (event.currentTarget.src !== new URL(fallback, window.location.origin).toString()) {
                      event.currentTarget.src = fallback;
                    }
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${DOT_COLOR[meal.complexity]}`} />
                  <p className="truncate text-sm font-medium text-[var(--charcoal)]">{meal.name}</p>
                </div>
                {meal.preferredDays.length > 0 && (
                  <p className="truncate text-[11px] text-[var(--warm-gray)]">
                    {meal.preferredDays
                      .map((day) => DAY_OPTIONS.find((option) => option.value === day)?.short)
                      .filter((value): value is string => Boolean(value))
                      .join(", ")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleVote(meal.id, "up")}
                  disabled={pendingVoteId === meal.id}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                >
                  👍 {mealVotes.up}
                </button>
                <button
                  type="button"
                  onClick={() => void handleVote(meal.id, "down")}
                  disabled={pendingVoteId === meal.id}
                  className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                >
                  👎 {mealVotes.down}
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenuId((current) => (current === meal.id ? null : meal.id))}
                  className="rounded-md p-1 text-[var(--warm-gray)] hover:bg-[var(--cream)]"
                  aria-label="Meny"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {openMenuId === meal.id && (
                  <div className="absolute right-0 top-7 z-20 w-28 rounded-md border border-[var(--cream-dark)] bg-white shadow-md">
                    <button
                      type="button"
                      onClick={() => {
                        onEditMeal(meal);
                        setOpenMenuId(null);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--charcoal)] hover:bg-[var(--cream)]"
                    >
                      Redigera
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        void handleDelete(meal.id);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Ta bort
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
