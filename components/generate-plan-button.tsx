"use client";

import { generateWeeklyPlan } from "@/lib/actions/plans";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function GeneratePlanButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    const result = await generateWeeklyPlan();

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-md font-medium transition-colors"
      >
        {loading ? "Generating..." : "Generate This Week's Plan"}
      </button>
      {error && (
        <p className="mt-4 text-red-600">{error}</p>
      )}
    </div>
  );
}
