"use client";

import { swapDayMeal } from "@/lib/actions/plans";
import { useState } from "react";

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";

export function SwapMealButton({ day }: { day: Day }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSwap() {
    setLoading(true);
    setError(null);

    try {
      const result = await swapDayMeal(day);

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError("Kunde inte byta måltiden. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleSwap}
        disabled={loading}
        className="text-blue-600 hover:text-blue-800 disabled:text-blue-400 text-sm font-medium"
      >
        {loading ? "Byter..." : "Byt"}
      </button>
      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}
    </div>
  );
}
