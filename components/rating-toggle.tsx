"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";

export type MealRating = "THUMBS_DOWN" | "NEUTRAL" | "THUMBS_UP";

type RatingToggleProps = {
  rating: MealRating;
  onChange: (rating: MealRating) => void;
  disabled?: boolean;
};

export function RatingToggle({ rating, onChange, disabled = false }: RatingToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[var(--cream-dark)] bg-white p-0.5">
      <button
        type="button"
        aria-label="Tumme ner"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange("THUMBS_DOWN");
        }}
        className={`rounded-md p-1 transition-colors ${
          rating === "THUMBS_DOWN"
            ? "bg-rose-100 text-rose-700"
            : "text-[var(--warm-gray)] hover:bg-[var(--cream)]"
        }`}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Neutral"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange("NEUTRAL");
        }}
        className={`rounded-md px-1.5 py-1 text-[10px] font-semibold leading-none transition-colors ${
          rating === "NEUTRAL"
            ? "bg-slate-100 text-slate-700"
            : "text-[var(--warm-gray)] hover:bg-[var(--cream)]"
        }`}
      >
        -
      </button>
      <button
        type="button"
        aria-label="Tumme upp"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onChange("THUMBS_UP");
        }}
        className={`rounded-md p-1 transition-colors ${
          rating === "THUMBS_UP"
            ? "bg-emerald-100 text-emerald-700"
            : "text-[var(--warm-gray)] hover:bg-[var(--cream)]"
        }`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
