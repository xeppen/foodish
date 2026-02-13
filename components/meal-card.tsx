"use client";

import { useCallback, useEffect, useState } from "react";
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

const COMPLEXITY_TIME_LABEL: Record<Complexity, string> = {
  SIMPLE: "20 min",
  MEDIUM: "30 min",
  COMPLEX: "45 min",
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
  const [currentMeal, setCurrentMeal] = useState(mealName);
  const [currentComplexity, setCurrentComplexity] = useState<Complexity>("MEDIUM");

  useEffect(() => {
    setCurrentMeal(mealName);
  }, [mealName]);

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

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void preloadSwapCandidates();
  }, [isAuthenticated, preloadSwapCandidates]);

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
    const previousComplexity = currentComplexity;
    setCurrentMeal(option.name);
    setCurrentComplexity(option.complexity);
    setLoading(true);
    try {
      const result = await swapDayMealWithChoice(day, option.id);
      if ("error" in result) {
        setCurrentMeal(previousMeal);
        setCurrentComplexity(previousComplexity);
      } else if (result.newMeal) {
        setCurrentMeal(result.newMeal);
      }
    } catch (error) {
      console.error("Kunde inte byta måltid", error);
      setCurrentMeal(previousMeal);
      setCurrentComplexity(previousComplexity);
    } finally {
      setLoading(false);
      void preloadSwapCandidates();
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
    <div className="group relative mx-0 w-full aspect-[16/9] overflow-hidden rounded-none bg-black shadow-lg transition-shadow duration-500 md:aspect-[4/5] xl:aspect-[3/4] md:rounded-2xl">
      <img
        src={resolvedImage}
        alt={currentMeal || "Meal"}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          setResolvedImage(
            `/api/meal-image?meal=${encodeURIComponent(currentMeal || dayLabel)}&style=warm-home-cooked-top-down`
          );
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      <div className="absolute left-4 top-4">
        <p className="inline-block rounded-full bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white drop-shadow-sm backdrop-blur-sm">
          {dayLabel}
        </p>
      </div>

      <div className="absolute right-4 top-4">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>{COMPLEXITY_TIME_LABEL[currentComplexity]}</span>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 pr-20 md:pr-24">
        <h3 className="mb-1 max-w-[85%] text-xl font-bold leading-tight text-white drop-shadow-sm md:text-2xl">
          {currentMeal || "Ingen måltid planerad"}
        </h3>
      </div>

      <div className="absolute bottom-0 right-0 p-4">
        <button
          onClick={handleQuickSwap}
          disabled={loading}
          aria-label={loading ? "Byter måltid" : "Byt måltid"}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-opacity duration-300 ${loading ? "opacity-100" : "opacity-70 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"} disabled:cursor-not-allowed`}
        >
          <svg
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
