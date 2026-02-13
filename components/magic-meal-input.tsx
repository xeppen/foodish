"use client";

import { addMeal } from "@/lib/actions/meals";
import { Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchMealImages } from "@/lib/image-search/client";
import { type ImageSearchCandidate } from "@/lib/image-search/types";
import { buildFallbackMealImageUrl, resolveMealImageUrl } from "@/lib/meal-image-url";
import { generateDishImageUrl } from "@/lib/image-generation/client";

type EnrichmentResult = {
  tags: string[];
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  ingredients: string[];
};

export function MagicMealInput() {
  const [value, setValue] = useState("");
  const [imageMode, setImageMode] = useState<"upload" | "url" | "search">("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [searchCandidates, setSearchCandidates] = useState<ImageSearchCandidate[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (imageMode !== "search") {
      setSearchCandidates([]);
      setSearchError(null);
      setSearchLoading(false);
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
        searchAbortRef.current = null;
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
      return;
    }

    const query = value.trim();
    if (query.length < 3) {
      setSearchCandidates([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }

      const controller = new AbortController();
      searchAbortRef.current = controller;
      setSearchLoading(true);
      setSearchError(null);
      try {
        const result = await searchMealImages(query, controller.signal);
        setSearchCandidates(result.candidates);
        if (result.candidates.length === 0) {
          setSearchError("Inga bilder hittades. Klistra in en bild-URL manuellt.");
        } else {
          setSearchError(null);
        }
      } catch (searchErr) {
        if (controller.signal.aborted) {
          return;
        }
        setSearchCandidates([]);
        setSearchError(searchErr instanceof Error ? searchErr.message : "Kunde inte söka efter bilder");
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 450);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [value, imageMode]);

  useEffect(() => {
    return () => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setImagePreviewError(false);
  }, [imageUrl, value, imageMode]);

  async function handleGenerateImage() {
    const dishName = value.trim();
    if (!dishName) {
      setGenerationError("Skriv ett måltidsnamn först.");
      return;
    }

    setGenerationError(null);
    setGenerationLoading(true);
    try {
      const result = await generateDishImageUrl(dishName);
      setImageMode("url");
      setImageFile(null);
      setImageUrl(result.imageUrl);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Kunde inte generera bild");
    } finally {
      setGenerationLoading(false);
    }
  }

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
      if (imageMode === "upload" && imageFile) {
        formData.append("image", imageFile);
      }
      if ((imageMode === "url" || imageMode === "search") && imageUrl.trim()) {
        formData.append("imageUrl", imageUrl.trim());
      }
      const response = await addMeal(formData);

      if (response.error) {
        setError(response.error);
        return;
      }

      setValue("");
      setImageFile(null);
      setImageUrl("");
      setImageMode("upload");
      setSearchCandidates([]);
      setSearchError(null);
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
        <button
          type="button"
          onClick={() => void handleGenerateImage()}
          disabled={loading || generationLoading || !value.trim()}
          className="w-full rounded-md border border-[var(--cream-dark)] bg-white px-3 py-2 text-sm font-semibold text-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generationLoading ? "Genererar bild..." : "Generera bild"}
        </button>
        {generationError && <p className="text-xs text-red-600">{generationError}</p>}
        <div className="rounded-lg border border-[var(--cream-dark)] bg-white/70 p-2">
          <div className="mb-2 grid grid-cols-3 gap-1 rounded-md bg-[var(--cream)] p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setImageMode("upload");
                setImageUrl("");
              }}
              className={`rounded-md px-2 py-1 transition ${imageMode === "upload" ? "bg-white text-[var(--charcoal)] shadow-sm" : "text-[var(--warm-gray)]"}`}
            >
              Ladda upp
            </button>
            <button
              type="button"
              onClick={() => {
                setImageMode("url");
                setImageFile(null);
              }}
              className={`rounded-md px-2 py-1 transition ${imageMode === "url" ? "bg-white text-[var(--charcoal)] shadow-sm" : "text-[var(--warm-gray)]"}`}
            >
              Bild-URL
            </button>
            <button
              type="button"
              onClick={() => {
                setImageMode("search");
                setImageFile(null);
              }}
              className={`rounded-md px-2 py-1 transition ${imageMode === "search" ? "bg-white text-[var(--charcoal)] shadow-sm" : "text-[var(--warm-gray)]"}`}
            >
              Sök bild
            </button>
          </div>

          {imageMode === "upload" ? (
            <>
              <input
                type="file"
                accept="image/*"
                disabled={loading}
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
              {imageFile && <p className="mt-1 text-xs text-[var(--warm-gray)]">Vald bild: {imageFile.name}</p>}
            </>
          ) : imageMode === "url" ? (
            <div className="space-y-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/meal.jpg"
                disabled={loading}
              />
              {imageUrl.trim() && (
                <div className="overflow-hidden rounded-md border border-[var(--cream-dark)] bg-white">
                  <img
                    src={resolveMealImageUrl(imageUrl, value || "Meal")}
                    alt="Förhandsvisning"
                    className="h-28 w-full object-cover"
                    loading="lazy"
                    onError={(event) => {
                      const fallback = buildFallbackMealImageUrl(value || "Meal");
                      if (event.currentTarget.src !== new URL(fallback, window.location.origin).toString()) {
                        event.currentTarget.src = fallback;
                      }
                      setImagePreviewError(true);
                    }}
                  />
                </div>
              )}
              {imagePreviewError && (
                <p className="text-[11px] text-red-600">Kunde inte läsa bilden från URL:en. Kontrollera länken.</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[var(--warm-gray)]">
                Vi söker automatiskt när måltidsnamnet är 3+ tecken.
              </p>
              {searchLoading && <p className="text-xs text-[var(--warm-gray)]">Söker bilder...</p>}
              {searchError && <p className="text-xs text-red-600">{searchError}</p>}
              {searchCandidates.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {searchCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => setImageUrl(candidate.fullUrl)}
                      className={`relative overflow-hidden rounded-md border ${imageUrl === candidate.fullUrl ? "border-[var(--terracotta)] ring-2 ring-[var(--terracotta)]/30" : "border-[var(--cream-dark)]"}`}
                    >
                      <img src={candidate.thumbUrl} alt="Bildförslag" className="h-20 w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/meal.jpg"
                disabled={loading}
              />
              {imageUrl.trim() && (
                <div className="overflow-hidden rounded-md border border-[var(--cream-dark)] bg-white">
                  <img
                    src={resolveMealImageUrl(imageUrl, value || "Meal")}
                    alt="Förhandsvisning"
                    className="h-28 w-full object-cover"
                    loading="lazy"
                    onError={(event) => {
                      const fallback = buildFallbackMealImageUrl(value || "Meal");
                      if (event.currentTarget.src !== new URL(fallback, window.location.origin).toString()) {
                        event.currentTarget.src = fallback;
                      }
                      setImagePreviewError(true);
                    }}
                  />
                </div>
              )}
              {imagePreviewError && (
                <p className="text-[11px] text-red-600">Kunde inte läsa bilden från URL:en. Kontrollera länken.</p>
              )}
              <p className="text-[11px] text-[var(--warm-gray)]">
                Genom att välja en bild ansvarar du för att användningen följer källans villkor.
              </p>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="w-full rounded-lg bg-[var(--terracotta)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sparar..." : "Lägg till måltid"}
        </button>
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
