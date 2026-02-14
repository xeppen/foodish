"use client";

import { addMeal } from "@/lib/actions/meals";
import { Sparkles } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateDishImageUrl } from "@/lib/image-generation/client";
import { resolveMealImageUrl } from "@/lib/meal-image-url";
import { generateIngredientDraftClient, type IngredientDraftItem } from "@/lib/ai/ingredients-client";

type EnrichmentResult = {
  tags: string[];
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  ingredients: IngredientDraftItem[];
};

const COMPLEXITY_LABEL: Record<EnrichmentResult["complexity"], string> = {
  SIMPLE: "Enkel",
  MEDIUM: "Medium",
  COMPLEX: "Avancerad",
};

const DAY_OPTIONS = [
  { value: "MONDAY", short: "M", label: "Måndag" },
  { value: "TUESDAY", short: "T", label: "Tisdag" },
  { value: "WEDNESDAY", short: "O", label: "Onsdag" },
  { value: "THURSDAY", short: "T", label: "Torsdag" },
  { value: "FRIDAY", short: "F", label: "Fredag" },
  { value: "SATURDAY", short: "L", label: "Lördag" },
  { value: "SUNDAY", short: "S", label: "Söndag" },
] as const;

type PreferredDay = (typeof DAY_OPTIONS)[number]["value"];

export function MagicMealInput() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [complexity, setComplexity] = useState<EnrichmentResult["complexity"]>("MEDIUM");
  const [preferredDays, setPreferredDays] = useState<PreferredDay[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [ingredients, setIngredients] = useState<IngredientDraftItem[]>([]);
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  function applyDayPreset(preset: "weekday" | "friday" | "weekend") {
    if (preset === "weekday") {
      setPreferredDays(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"]);
      return;
    }
    if (preset === "friday") {
      setPreferredDays(["FRIDAY"]);
      return;
    }
    setPreferredDays(["SATURDAY", "SUNDAY"]);
  }

  async function handleGenerateImage() {
    const name = value.trim();
    if (!name || generationLoading || loading) {
      return;
    }

    setError(null);
    setGenerationLoading(true);
    try {
      const generated = await generateDishImageUrl(name);
      setImageUrl(generated.imageUrl);
      setImageFile(null);
      setShowUrlInput(false);
      setPreviewError(false);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Kunde inte generera bild.");
    } finally {
      setGenerationLoading(false);
    }
  }

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
      formData.append("complexity", complexity);
      for (const day of preferredDays) {
        formData.append("preferredDays", day);
      }
      if (imageFile) {
        formData.append("image", imageFile);
      } else if (imageUrl.trim()) {
        formData.append("imageUrl", imageUrl.trim());
      }
      const cleanedIngredients = ingredients
        .map((ingredient) => ({
          ...ingredient,
          name: ingredient.name.trim(),
        }))
        .filter((ingredient) => ingredient.name.length > 0);
      if (cleanedIngredients.length > 0) {
        formData.append("ingredients", JSON.stringify(cleanedIngredients));
      }
      const response = await addMeal(formData);

      if (response.error) {
        setError(response.error);
        return;
      }

      setValue("");
      setComplexity("MEDIUM");
      setPreferredDays([]);
      setImageUrl("");
      setImageFile(null);
      setShowUrlInput(false);
      setPreviewError(false);
      setIngredients([]);
      setResult((response.enrichment as EnrichmentResult) ?? null);
      router.refresh();
    } catch {
      setError("Kunde inte skapa måltiden. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateIngredients() {
    const dishName = value.trim();
    if (!dishName || ingredientLoading) {
      return;
    }

    setIngredientLoading(true);
    setError(null);
    try {
      const draft = await generateIngredientDraftClient(dishName);
      setIngredients(draft.ingredients);
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Kunde inte generera ingredienser.");
    } finally {
      setIngredientLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit}>
        <label htmlFor="magic-input" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">
          Ny måltid
        </label>
        <div className="relative">
          <input
            id="magic-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Skriv en rätt, t.ex. Korv stroganoff"
            disabled={loading}
            className="pr-11 text-lg font-bold"
          />
          <Sparkles className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${loading ? "animate-pulse text-amber-500" : "text-[var(--warm-gray)]"}`} />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Komplexitet</p>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/75 p-1">
            {[
              { value: "SIMPLE", label: "🟢 Enkel" },
              { value: "MEDIUM", label: "🟡 Medium" },
              { value: "COMPLEX", label: "🔴 Avancerad" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setComplexity(option.value as EnrichmentResult["complexity"])}
                className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  complexity === option.value
                    ? "bg-[var(--charcoal)] text-white shadow-sm"
                    : "text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Passar bäst...</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {DAY_OPTIONS.map((dayOption) => {
              const active = preferredDays.includes(dayOption.value);
              return (
                <button
                  key={dayOption.value}
                  type="button"
                  aria-label={dayOption.label}
                  onClick={() =>
                    setPreferredDays((current) =>
                      current.includes(dayOption.value)
                        ? current.filter((day) => day !== dayOption.value)
                        : [...current, dayOption.value]
                    )
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                    active
                      ? "border-[var(--terracotta)] bg-[var(--terracotta)] text-white"
                      : "border-[var(--cream-dark)] bg-white text-[var(--warm-gray)]"
                  }`}
                >
                  {dayOption.short}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--warm-gray)]">
            <button type="button" onClick={() => applyDayPreset("friday")} className="hover:text-[var(--charcoal)]">
              Fredagsmys
            </button>
            <button type="button" onClick={() => applyDayPreset("weekday")} className="hover:text-[var(--charcoal)]">
              Vardag
            </button>
            <button type="button" onClick={() => applyDayPreset("weekend")} className="hover:text-[var(--charcoal)]">
              Helg
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-[var(--cream-dark)] bg-white/70 p-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Bild</p>
          <button
            type="button"
            onClick={() => void handleGenerateImage()}
            disabled={generationLoading || loading || !value.trim()}
            className="mb-2 w-full rounded-md bg-[var(--charcoal)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generationLoading ? "Genererar bild..." : "✨ Generera ny"}
          </button>

          {previewUrl || imageUrl.trim() ? (
            <div className="overflow-hidden rounded-lg border border-[var(--cream-dark)] bg-black/5">
              {!previewError ? (
                <img
                  src={previewUrl ?? resolveMealImageUrl(imageUrl, value || "Meal")}
                  alt={value || "Meal preview"}
                  className="h-32 w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <p className="px-2 py-3 text-xs text-rose-600">Kunde inte ladda förhandsvisning av bilden.</p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--cream-dark)] px-3 py-4 text-center text-xs text-[var(--warm-gray)]">
              Ingen bild vald ännu.
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowUrlInput((current) => !current)}
              className="text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
            >
              {showUrlInput ? "Dölj URL" : "Ändra URL manuellt"}
            </button>
            <label className="cursor-pointer text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]">
              Ladda upp
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  setImageFile(event.target.files?.[0] ?? null);
                  setImageUrl("");
                  setPreviewError(false);
                }}
                className="hidden"
              />
            </label>
          </div>

          {showUrlInput && (
            <input
              type="url"
              value={imageUrl}
              onChange={(event) => {
                setImageUrl(event.target.value);
                setImageFile(null);
                setPreviewError(false);
              }}
              placeholder="https://example.com/meal.jpg"
              className="mt-2 w-full"
            />
          )}
        </div>

        <div className="mt-4 rounded-md border border-[var(--cream-dark)] bg-white/70 p-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Ingredienser</p>
            <button
              type="button"
              onClick={() => void handleGenerateIngredients()}
              disabled={ingredientLoading || !value.trim()}
              className="text-xs font-semibold text-[var(--charcoal)] disabled:opacity-60"
            >
              {ingredientLoading ? "Genererar..." : "✨ AI-förslag"}
            </button>
          </div>

          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div key={`${ingredient.name}-${index}`} className="grid grid-cols-[1fr_72px_68px] gap-2">
                <input
                  value={ingredient.name}
                  onChange={(event) =>
                    setIngredients((state) =>
                      state.map((item, rowIndex) =>
                        rowIndex === index ? { ...item, name: event.target.value } : item
                      )
                    )
                  }
                  placeholder="Ingrediens"
                  className="text-sm"
                />
                <input
                  type="number"
                  step="0.1"
                  value={ingredient.amount ?? ""}
                  onChange={(event) =>
                    setIngredients((state) =>
                      state.map((item, rowIndex) =>
                        rowIndex === index
                          ? { ...item, amount: event.target.value ? Number(event.target.value) : null }
                          : item
                      )
                    )
                  }
                  placeholder="Mängd"
                  className="text-sm"
                />
                <input
                  value={ingredient.unit ?? ""}
                  onChange={(event) =>
                    setIngredients((state) =>
                      state.map((item, rowIndex) =>
                        rowIndex === index ? { ...item, unit: event.target.value || null } : item
                      )
                    )
                  }
                  placeholder="Enhet"
                  className="text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setIngredients((state) => [...state, { name: "", amount: null, unit: null }])}
              className="text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
            >
              + Lägg till rad
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="mt-4 w-full rounded-md bg-[var(--terracotta)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sparar..." : "Lägg till måltid"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {result && (
        <div className="rounded-lg border border-[var(--cream-dark)] bg-white p-3 text-xs text-[var(--charcoal)]">
          <p className="mb-1 font-semibold">AI-forslag</p>
          <p className="mb-1">Komplexitet: {COMPLEXITY_LABEL[result.complexity]}</p>
          <p className="mb-1">Taggar: {result.tags.join(" ")}</p>
          <p>
            Ingredienser: {result.ingredients.map((ingredient) => ingredient.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
