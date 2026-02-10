"use client";

import Image from "next/image";
import { useState } from "react";
import { swapDayMeal } from "@/lib/actions/plans";

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

interface MealCardProps {
  day: Day;
  dateStr?: string; // e.g. "Oct 24"
  mealName: string | null;
  imageSrc?: string; // Optional override
}

// Deterministic generic image based on day/meal name length
const GENERIC_IMAGES = [
  "/food-plate-1.png",
  "/food-plate-2.png",
  "/food-plate-3.png",
];

export function MealCard({ day, dateStr, mealName, imageSrc }: MealCardProps) {
  const [loading, setLoading] = useState(false);
  const [currentMeal, setCurrentMeal] = useState(mealName);

  // Simple deterministic image selection
  const imageIndex = (mealName?.length || 0) % GENERIC_IMAGES.length;
  const displayImage = imageSrc || GENERIC_IMAGES[imageIndex];

  async function handleSwap() {
    setLoading(true);
    try {
      // Optimistic update could go here, but for now we wait
      // In a real app we'd probably want to revalidate the path
      // This button component might be better as a server component wrapping a client button
      // But for the specific "swap" action which is server-side,
      // we can call the action.
      // NOTE: The server action revalidates path, so router.refresh() might be needed
      // or just rely on Next.js to update if it's a server component parent.
      // For this UI component, let's just trigger the action.

      await swapDayMeal(day);
      // The parent page (Dashboard) is a Server Component and should re-render
      // if using router.refresh() or if the action revalidates '/dashboard'
    } catch (error) {
      console.error("Swap failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-[var(--cream-dark)] overflow-hidden flex flex-col h-full">
      {/* Image Area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <Image
          src={displayImage}
          alt={currentMeal || "Meal"}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {/* Day Overlay */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-[var(--terracotta)] shadow-sm">
          {day}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-playfair font-bold text-lg text-[var(--charcoal)] mb-1 line-clamp-2 min-h-[3.5rem]">
          {currentMeal || "No meal planned"}
        </h3>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--warm-gray)]">
            {dateStr}
          </span>

          <button
            onClick={handleSwap}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--cream)] hover:bg-[var(--terracotta)/10 text-[var(--terracotta)] text-sm font-semibold transition-colors disabled:opacity-50"
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
            Swap
          </button>
        </div>
      </div>
    </div>
  );
}
