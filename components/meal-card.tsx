"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSwapOptions,
  swapDayMealWithChoice,
  toggleDayBlocked,
} from "@/lib/actions/plans";
import { useRouter } from "next/navigation";

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
  isBlocked?: boolean;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  mealImageByName?: Record<string, string>;
}

export function MealCard({
  day,
  dayLabel,
  mealName,
  isBlocked = false,
  isAuthenticated,
  onAuthRequired,
  mealImageByName,
}: MealCardProps) {
  const [loading, setLoading] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [preloadedOptions, setPreloadedOptions] = useState<SwapOption[]>([]);
  const [currentMeal, setCurrentMeal] = useState(mealName);
  const [currentBlocked, setCurrentBlocked] = useState(isBlocked);
  const [currentComplexity, setCurrentComplexity] = useState<Complexity>("MEDIUM");
  const router = useRouter();

  useEffect(() => {
    setCurrentMeal(mealName);
  }, [mealName]);
  useEffect(() => {
    setCurrentBlocked(isBlocked);
  }, [isBlocked]);

  const preloadSwapCandidates = useCallback(async (): Promise<SwapOption[]> => {
    if (!isAuthenticated || currentBlocked) {
      return [];
    }
    const result = await getSwapOptions(day, { limit: 4 });
    if ("error" in result) {
      return [];
    }
    const options = result.options as SwapOption[];
    setPreloadedOptions(options);
    return options;
  }, [currentBlocked, day, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || currentBlocked) {
      setPreloadedOptions([]);
      return;
    }
    void preloadSwapCandidates();
  }, [currentBlocked, isAuthenticated, preloadSwapCandidates]);

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
    if (currentBlocked) {
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

  async function handleToggleBlocked() {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }

    const previous = currentBlocked;
    const next = !previous;
    setBlocking(true);
    setCurrentBlocked(next);
    if (next) {
      setPreloadedOptions([]);
    }
    try {
      const result = await toggleDayBlocked(day, next);
      if ("error" in result) {
        setCurrentBlocked(previous);
      } else {
        void router.refresh();
      }
    } catch (error) {
      console.error("Kunde inte blockera dagen", error);
      setCurrentBlocked(previous);
    } finally {
      setBlocking(false);
    }
  }

  return (
    <div
      data-testid={`meal-card-${day}`}
      className="group relative mx-0 w-full snap-start aspect-[16/9] overflow-hidden rounded-none bg-black ring-1 ring-white/10 shadow-2xl shadow-black/80 transition-all duration-500 group-hover:ring-white/30 group-hover:shadow-black md:w-[320px] md:aspect-[3/4] md:rounded-2xl lg:w-[340px]"
    >
      <img
        src={resolvedImage}
        alt={currentMeal || "Meal"}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out ${currentBlocked ? "grayscale opacity-60" : "group-hover:scale-105"}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          setResolvedImage(
            `/api/meal-image?meal=${encodeURIComponent(currentMeal || dayLabel)}&style=vertical-food-photography-dark-moody-lighting`
          );
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
      {currentBlocked && <div className="absolute inset-0 bg-black/35" />}

      <div className="absolute left-4 top-4 flex items-center gap-2">
        <p className="inline-block rounded-full bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-white drop-shadow-sm backdrop-blur-sm">
          {dayLabel}
        </p>
        {currentBlocked && (
          <span className="inline-flex rounded-full border border-white/25 bg-black/50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/90">
            Överhoppad
          </span>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 pr-24">
        <h3
          data-testid={`meal-name-${day}`}
          className="mb-1 line-clamp-3 text-2xl font-bold leading-tight text-white drop-shadow-sm md:text-3xl lg:text-[1.75rem]"
        >
          {currentMeal || "Ingen måltid planerad"}
        </h3>
      </div>

      <div className="absolute bottom-0 right-0 p-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleToggleBlocked()}
          disabled={blocking || loading}
          aria-label={currentBlocked ? "Ta med igen" : "Hoppa över dag"}
          title={currentBlocked ? "Ta med igen" : "Hoppa över dag"}
          data-testid={`block-button-${day}`}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70 ${
            currentBlocked
              ? "opacity-100 hover:bg-black/50"
              : "opacity-70 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          }`}
        >
          {blocking ? (
            <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : currentBlocked ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
        </button>

        <button
          onClick={handleQuickSwap}
          disabled={loading || currentBlocked || blocking}
          aria-label={loading ? "Byter måltid" : "Byt måltid"}
          title="Byt måltid"
          data-testid={`swap-button-${day}`}
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur-sm transition-all duration-300 ${loading ? "opacity-100" : "opacity-70 hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"} disabled:cursor-not-allowed`}
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
