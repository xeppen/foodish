"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSwapOptions, swapDayMealWithChoice } from "@/lib/actions/plans";

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
type Complexity = "SIMPLE" | "MEDIUM" | "COMPLEX";

type SwapOption = {
  id: string;
  name: string;
  complexity: Complexity;
  thumbsUpCount: number;
  thumbsDownCount: number;
};

type FilterState = {
  complexity: "ALL" | Complexity;
  rating: "ALL" | "THUMBS_UP";
  recency: "ALL" | "FRESH_ONLY";
};

interface MealCardProps {
  day: Day;
  dayLabel: string;
  mealName: string | null;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  imageSrc?: string; // Optional override
}

export function MealCard({
  day,
  dayLabel,
  mealName,
  isAuthenticated,
  onAuthRequired,
  imageSrc,
}: MealCardProps) {
  const [loading, setLoading] = useState(false);
  const [preloadedOptions, setPreloadedOptions] = useState<SwapOption[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterOptions, setFilterOptions] = useState<SwapOption[]>([]);
  const [fallbackOptions, setFallbackOptions] = useState<SwapOption[]>([]);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [counts, setCounts] = useState({
    simple: 0,
    medium: 0,
    complex: 0,
    thumbsUp: 0,
    fresh: 0,
    total: 0,
  });
  const [filters, setFilters] = useState<FilterState>({
    complexity: "ALL",
    rating: "ALL",
    recency: "ALL",
  });
  const [currentMeal, setCurrentMeal] = useState(mealName);

  useEffect(() => {
    setCurrentMeal(mealName);
  }, [mealName]);

  const swapFilters = useMemo(
    (): {
      complexity?: Complexity;
      rating?: "THUMBS_UP";
      recency?: "FRESH_ONLY";
    } => ({
      complexity: filters.complexity === "ALL" ? undefined : filters.complexity,
      rating: filters.rating === "ALL" ? undefined : "THUMBS_UP",
      recency: filters.recency === "ALL" ? undefined : "FRESH_ONLY",
    }),
    [filters]
  );

  const preloadSwapCandidates = useCallback(async (): Promise<SwapOption[]> => {
    if (!isAuthenticated) {
      return [];
    }
    const result = await getSwapOptions(day, { limit: 4 });
    if ("error" in result) {
      return [];
    }
    const options = result.options as SwapOption[];
    setPreloadedOptions(options);
    return options;
  }, [day, isAuthenticated]);

  const refreshFilteredOptions = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setFilterLoading(true);
    try {
      const result = await getSwapOptions(day, {
        ...swapFilters,
        limit: 8,
      });
      if ("error" in result) {
        return;
      }
      setFilterOptions(result.options as SwapOption[]);
      setFallbackOptions((result.fallbackOptions ?? []) as SwapOption[]);
      setFallbackUsed(result.fallbackUsed);
      setCounts(result.counts);
    } finally {
      setFilterLoading(false);
    }
  }, [day, isAuthenticated, swapFilters]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void preloadSwapCandidates();
  }, [isAuthenticated, preloadSwapCandidates]);

  useEffect(() => {
    if (!isFilterOpen || !isAuthenticated) {
      return;
    }
    void refreshFilteredOptions();
  }, [isFilterOpen, isAuthenticated, refreshFilteredOptions]);

  const displayImage =
    imageSrc ||
    `/api/meal-image?meal=${encodeURIComponent(currentMeal || dayLabel)}&style=warm-home-cooked-top-down`;
  const [resolvedImage, setResolvedImage] = useState(displayImage);

  useEffect(() => {
    setResolvedImage(displayImage);
  }, [displayImage]);

  async function applySwap(option: SwapOption) {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    const previousMeal = currentMeal;
    setCurrentMeal(option.name);
    setLoading(true);
    try {
      const result = await swapDayMealWithChoice(day, option.id);
      if ("error" in result) {
        setCurrentMeal(previousMeal);
      } else if (result.newMeal) {
        setCurrentMeal(result.newMeal);
      }
    } catch (error) {
      console.error("Kunde inte byta måltid", error);
      setCurrentMeal(previousMeal);
    } finally {
      setLoading(false);
      void preloadSwapCandidates();
      if (isFilterOpen) {
        void refreshFilteredOptions();
      }
    }
  }

  async function handleQuickSwap() {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    let candidates = preloadedOptions;
    if (candidates.length === 0) {
      candidates = await preloadSwapCandidates();
    }

    const selected = candidates[0];
    if (!selected) {
      return;
    }

    setPreloadedOptions((existing) => existing.slice(1));
    await applySwap(selected);
  }

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-[var(--cream-dark)] overflow-hidden flex flex-col h-full">
      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <img
          src={resolvedImage}
          alt={currentMeal || "Meal"}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            setResolvedImage(
              `/api/meal-image?meal=${encodeURIComponent(currentMeal || dayLabel)}&style=warm-home-cooked-top-down`
            );
          }}
        />
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-grow">
        <p className="mb-2 text-lg font-bold uppercase tracking-[0.12em] text-[var(--terracotta)]">
          {dayLabel}
        </p>
        <h3 className="font-playfair font-bold text-lg text-[var(--charcoal)] mb-1 line-clamp-2 min-h-[3.5rem]">
          {currentMeal || "Ingen måltid planerad"}
        </h3>

        <div className="mt-auto pt-4 space-y-2">
          <button
            onClick={handleQuickSwap}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--cream)] px-3 py-1.5 text-sm font-semibold text-[var(--terracotta)] transition-colors hover:bg-[var(--terracotta)]/10 disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {loading ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              )}
            </svg>
            {loading ? "Byter..." : "Byt"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                onAuthRequired();
                return;
              }
              setIsFilterOpen((open) => !open);
            }}
            className="w-full rounded-lg border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--charcoal)] transition-colors hover:bg-[var(--cream)]"
          >
            {isFilterOpen ? "Stäng filter" : "Byt med filter"}
          </button>

          {isFilterOpen && (
            <div className="rounded-lg border border-[var(--cream-dark)] bg-[var(--cream)]/40 p-2.5">
              <div className="mb-2 grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    setFilters((state) => ({
                      ...state,
                      complexity: state.complexity === "SIMPLE" ? "ALL" : "SIMPLE",
                    }))
                  }
                  className={`rounded-md px-2 py-1 ${filters.complexity === "SIMPLE" ? "bg-emerald-100 text-emerald-700" : "bg-white text-[var(--warm-gray)]"}`}
                >
                  Enkel ({counts.simple})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((state) => ({
                      ...state,
                      complexity: state.complexity === "MEDIUM" ? "ALL" : "MEDIUM",
                    }))
                  }
                  className={`rounded-md px-2 py-1 ${filters.complexity === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-white text-[var(--warm-gray)]"}`}
                >
                  Medium ({counts.medium})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((state) => ({
                      ...state,
                      complexity: state.complexity === "COMPLEX" ? "ALL" : "COMPLEX",
                    }))
                  }
                  className={`rounded-md px-2 py-1 ${filters.complexity === "COMPLEX" ? "bg-orange-100 text-orange-700" : "bg-white text-[var(--warm-gray)]"}`}
                >
                  Avancerad ({counts.complex})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((state) => ({
                      ...state,
                      rating: state.rating === "THUMBS_UP" ? "ALL" : "THUMBS_UP",
                    }))
                  }
                  className={`rounded-md px-2 py-1 ${filters.rating === "THUMBS_UP" ? "bg-emerald-100 text-emerald-700" : "bg-white text-[var(--warm-gray)]"}`}
                >
                  Favoriter ({counts.thumbsUp})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((state) => ({
                      ...state,
                      recency: state.recency === "FRESH_ONLY" ? "ALL" : "FRESH_ONLY",
                    }))
                  }
                  className={`col-span-2 rounded-md px-2 py-1 ${filters.recency === "FRESH_ONLY" ? "bg-sky-100 text-sky-700" : "bg-white text-[var(--warm-gray)]"}`}
                >
                  Ej nyligen ({counts.fresh})
                </button>
              </div>

              {filterLoading ? (
                <p className="text-xs text-[var(--warm-gray)]">Laddar alternativ...</p>
              ) : filterOptions.length > 0 ? (
                <div className="space-y-1">
                  {filterOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => applySwap(option)}
                      className="flex w-full items-center justify-between rounded-md bg-white px-2 py-1.5 text-left text-xs hover:bg-[var(--cream)]"
                    >
                      <span className="truncate pr-2 text-[var(--charcoal)]">{option.name}</span>
                      <span className="text-[10px] text-[var(--warm-gray)]">
                        👍 {option.thumbsUpCount} / 👎 {option.thumbsDownCount}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-[var(--warm-gray)]">
                    Inga träffar med valda filter. Visar förslag utan filter:
                  </p>
                  {fallbackUsed && fallbackOptions.length > 0 && (
                    <div className="space-y-1">
                      {fallbackOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => applySwap(option)}
                          className="flex w-full items-center justify-between rounded-md bg-white px-2 py-1.5 text-left text-xs hover:bg-[var(--cream)]"
                        >
                          <span className="truncate pr-2 text-[var(--charcoal)]">{option.name}</span>
                          <span className="text-[10px] text-[var(--warm-gray)]">
                            👍 {option.thumbsUpCount} / 👎 {option.thumbsDownCount}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
