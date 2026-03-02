"use client";

import { deleteMeal, voteMeal } from "@/lib/actions/meals";
import { MoreHorizontal, ThumbsDown, ThumbsUp } from "lucide-react";
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
  ingredients?: unknown;
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

const COMPLEXITY_CONFIG: Record<Meal["complexity"], { label: string; color: string; dot: string }> = {
  SIMPLE:  { label: "Enkel",     color: "text-emerald-400", dot: "bg-emerald-400" },
  MEDIUM:  { label: "Medium",    color: "text-amber-400",   dot: "bg-amber-400"   },
  COMPLEX: { label: "Avancerad", color: "text-red-400",     dot: "bg-red-400"     },
};

const DAY_SHORTS: Record<Meal["preferredDays"][number], string> = {
  MONDAY: "M", TUESDAY: "T", WEDNESDAY: "O",
  THURSDAY: "T", FRIDAY: "F", SATURDAY: "L", SUNDAY: "S",
};

export function MealList({
  meals,
  commonMealImageByName,
  onEditMeal,
}: {
  meals: Meal[];
  commonMealImageByName?: Record<string, string>;
  onEditMeal: (meal: Meal) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, { up: number; down: number }>>(
    Object.fromEntries(meals.map((meal) => [meal.id, { up: meal.thumbsUpCount, down: meal.thumbsDownCount }])),
  );
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const router = useRouter();

  async function handleVote(id: string, direction: "up" | "down") {
    const current = votes[id] ?? { up: 0, down: 0 };
    const optimistic =
      direction === "up"
        ? { up: current.up + 1, down: current.down }
        : { up: current.up, down: current.down + 1 };
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
    if (!confirm("Är du säker på att du vill ta bort den här måltiden?")) return;
    const result = await deleteMeal(id);
    if (!result.error) router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
      {meals.map((meal, index) => {
        const mealVotes = votes[meal.id] ?? { up: meal.thumbsUpCount, down: meal.thumbsDownCount };
        const commonImageUrl = commonMealImageByName?.[meal.name.trim().toLowerCase()] ?? null;
        const imageSrc = resolveMealImageUrl(meal.imageUrl ?? commonImageUrl, meal.name);
        const cfg = COMPLEXITY_CONFIG[meal.complexity];

        return (
          <div
            key={meal.id}
            className={`flex items-center gap-3 px-3 py-3 transition hover:bg-white/[0.03] ${
              index > 0 ? "border-t border-white/[0.05]" : ""
            }`}
          >
            {/* Thumbnail */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
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

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white/85">{meal.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={`flex items-center gap-1 text-[11px] font-medium ${cfg.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                {meal.preferredDays.length > 0 && (
                  <span className="text-[11px] text-white/25">
                    {meal.preferredDays
                      .map((day) => DAY_SHORTS[day])
                      .join(" ")}
                  </span>
                )}
              </div>
            </div>

            {/* Votes */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void handleVote(meal.id, "up")}
                disabled={pendingVoteId === meal.id}
                className="flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-xs font-semibold text-white/40 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-40"
              >
                <ThumbsUp className="h-3 w-3" />
                {mealVotes.up}
              </button>
              <button
                type="button"
                onClick={() => void handleVote(meal.id, "down")}
                disabled={pendingVoteId === meal.id}
                className="flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.04] px-2 py-1 text-xs font-semibold text-white/40 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
              >
                <ThumbsDown className="h-3 w-3" />
                {mealVotes.down}
              </button>
            </div>

            {/* Context menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setOpenMenuId((current) => (current === meal.id ? null : meal.id))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.07] hover:text-white/60"
                aria-label="Meny"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {openMenuId === meal.id && (
                <div className="absolute right-0 top-9 z-20 w-28 overflow-hidden rounded-xl border border-white/[0.1] bg-[#1a1a1a] shadow-2xl shadow-black/60">
                  <button
                    type="button"
                    onClick={() => {
                      onEditMeal(meal);
                      setOpenMenuId(null);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Redigera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuId(null);
                      void handleDelete(meal.id);
                    }}
                    className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-red-400/70 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    Ta bort
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
