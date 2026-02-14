"use client";

import { addMeal } from "@/lib/actions/meals";
import { Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type EnrichmentResult = {
  tags: string[];
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  ingredients: string[];
};

const COMPLEXITY_LABEL: Record<EnrichmentResult["complexity"], string> = {
  SIMPLE: "Enkel",
  MEDIUM: "Medium",
  COMPLEX: "Avancerad",
};

export function MagicMealInput() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = value.trim();
    if (!name || loading) {
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("name", name);
      const response = await addMeal(formData);

      if (response.error) {
        setError(response.error);
        return;
      }

      setValue("");
      setResult((response.enrichment as EnrichmentResult) ?? null);
      router.refresh();
    } catch {
      setError("Kunde inte skapa måltiden. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit}>
        <label htmlFor="magic-input" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">
          Magic Input
        </label>
        <div className="relative">
          <input
            id="magic-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Skriv en rätt, t.ex. Korv stroganoff"
            disabled={loading}
            className="pr-11"
          />
          <Sparkles className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${loading ? "animate-pulse text-amber-500" : "text-[var(--warm-gray)]"}`} />
        </div>
        <p className="mt-2 text-xs text-[var(--warm-gray)]">
          Tryck Enter. Foodish fyller i komplexitet, taggar och ingredienser automatiskt.
        </p>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {result && (
        <div className="rounded-lg border border-[var(--cream-dark)] bg-white p-3 text-xs text-[var(--charcoal)]">
          <p className="mb-1 font-semibold">AI-forslag</p>
          <p className="mb-1">Komplexitet: {COMPLEXITY_LABEL[result.complexity]}</p>
          <p className="mb-1">Taggar: {result.tags.join(" ")}</p>
          <p>Ingredienser: {result.ingredients.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
