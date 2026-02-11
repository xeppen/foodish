"use client";

import { generateWeeklyPlan } from "@/lib/actions/plans";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "./loading-spinner";
import { ErrorMessage } from "./error-message";

export function GeneratePlanButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const result = await generateWeeklyPlan();

      if (result.error) {
        setError(result.error);
        setLoading(false);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError("Kunde inte skapa planen. Försök igen.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center gap-2 mx-auto"
      >
        {loading && <LoadingSpinner size="sm" />}
        {loading ? "Genererar..." : "Skapa veckans plan"}
      </button>
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
