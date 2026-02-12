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

export function MagicMealInput() {
  const [value, setValue] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!value.trim()) {
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("name", value.trim());
      if (imageFile) {
        formData.append("image", imageFile);
      }
      const response = await addMeal(formData);

      if (response.error) {
        setError(response.error);
        return;
      }

      setValue("");
      setImageFile(null);
      setResult((response.enrichment as EnrichmentResult) ?? null);
      router.refresh();
    } catch {
      setError("Kunde inte skapa måltiden. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="magic-input" className="block text-xs font-semibold uppercase tracking-wide text-[var(--warm-gray)]">
          Magic Input
        </label>
        <div className="relative">
          <input
            id="magic-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Spicy Chicken Curry with Rice"
            disabled={loading}
            className="pr-10"
          />
          <Sparkles className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${loading ? "animate-pulse text-amber-500" : "text-[var(--warm-gray)]"}`} />
        </div>
        <input
          type="file"
          accept="image/*"
          disabled={loading}
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
        {imageFile && <p className="text-xs text-[var(--warm-gray)]">Vald bild: {imageFile.name}</p>}
      </form>

      {loading && <p className="text-xs text-[var(--warm-gray)]">AI tänker...</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {result && (
        <div className="rounded-lg border border-[var(--cream-dark)] bg-white/80 p-2 text-xs text-[var(--charcoal)]">
          <p className="font-semibold">AI-förslag</p>
          <p>Taggar: {result.tags.join(" ")}</p>
          <p>Komplexitet: {result.complexity}</p>
          <p>Ingredienser: {result.ingredients.join(", ")}</p>
        </div>
      )}
    </div>
  );
}
