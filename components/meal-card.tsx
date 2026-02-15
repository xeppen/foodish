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

interface MealCardProps {
  day: Day;
  dayLabel: string;
  mealName: string | null;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  mealImageByName?: Record<string, string>;
}

export function MealCard({
  day,
  dayLabel,
  mealName,
  isAuthenticated,
  onAuthRequired,
  mealImageByName,
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

  const currentMealKey = (currentMeal ?? "").trim().toLowerCase();
  const mappedImage = mealImageByName?.[currentMealKey];
  const displayImage =
    mappedImage ||
    `/api/meal-image?meal=${encodeURIComponent(currentMeal || dayLabel)}&style=vertical-food-photography-dark-moody-lighting`;
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
    <div className="group relative mx-0 w-full snap-start aspect-[16/9] overflow-hidden rounded-none bg-black ring-1 ring-white/10 shadow-2xl shadow-black/80 transition-all duration-500 group-hover:ring-white/30 group-hover:shadow-black md:w-[320px] md:aspect-[3/4] md:rounded-2xl lg:w-[340px]">
      <img
        src={resolvedImage}
        alt={currentMeal || "Meal"}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          setResolvedImage(
            `/api/meal-image?meal=${encodeURIComponent(currentMeal || dayLabel)}&style=vertical-food-photography-dark-moody-lighting`
          );
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

      <div className="absolute left-4 top-4">
        <p className="inline-block rounded-full bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white drop-shadow-sm backdrop-blur-sm">
          {dayLabel}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 pr-20 md:pr-24">
        <h3 className="mb-1 line-clamp-3 max-w-[85%] text-2xl font-bold leading-tight text-white drop-shadow-sm md:text-3xl lg:text-[1.75rem]">
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
