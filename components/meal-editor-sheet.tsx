"use client";

import { addMeal, updateMeal } from "@/lib/actions/meals";
import { generateIngredientDraftClient, type IngredientDraftItem } from "@/lib/ai/ingredients-client";
import { generateDishImageUrl } from "@/lib/image-generation/client";
import { resolveMealImageUrl } from "@/lib/meal-image-url";
import { Loader2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Meal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  defaultServings?: number;
  preferredDays: ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY")[];
  imageUrl: string | null;
  ingredients?: unknown;
  mealIngredients?: Array<{
    name: string;
    amount: number | null;
    unit: string | null;
    note: string | null;
    optional: boolean;
    confidence: number | null;
    needsReview: boolean;
  }>;
};

type EditorMode =
  | { type: "create" }
  | {
      type: "edit";
      meal: Meal;
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

function mapMealIngredients(meal?: Meal): IngredientDraftItem[] {
  if (!meal) {
    return [];
  }

  if (!meal?.mealIngredients || meal.mealIngredients.length === 0) {
    const legacy = Array.isArray(meal?.ingredients)
      ? meal.ingredients
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((name) => ({
            name: name.trim(),
            amount: null,
            unit: null,
            note: null,
            optional: false,
            confidence: null,
            needsReview: true,
          }))
      : [];
    return legacy;
  }
  return meal.mealIngredients.map((ingredient) => ({
    name: ingredient.name,
    amount: ingredient.amount,
    unit: ingredient.unit,
    note: ingredient.note,
    optional: ingredient.optional,
    confidence: ingredient.confidence,
    needsReview: ingredient.needsReview,
  }));
}

export function MealEditorSheet({
  mode,
  isOpen,
  onClose,
  onSaved,
}: {
  mode: EditorMode;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [complexity, setComplexity] = useState<Meal["complexity"]>("MEDIUM");
  const [defaultServings, setDefaultServings] = useState(4);
  const [preferredDays, setPreferredDays] = useState<PreferredDay[]>([]);
  const [ingredients, setIngredients] = useState<IngredientDraftItem[]>([]);
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlExpanded, setImageUrlExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ingredientLoading, setIngredientLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode.type === "create") {
      setName("");
      setComplexity("MEDIUM");
      setDefaultServings(4);
      setPreferredDays([]);
      setIngredients([]);
      setImageMode("upload");
      setImageFile(null);
      setImageUrl("");
    } else {
      setName(mode.meal.name);
      setComplexity(mode.meal.complexity);
      setDefaultServings(Math.max(1, Math.min(12, Math.round(mode.meal.defaultServings ?? 4))));
      setPreferredDays(mode.meal.preferredDays);
      setIngredients(mapMealIngredients(mode.meal));
      setImageMode(mode.meal.imageUrl ? "url" : "upload");
      setImageFile(null);
      setImageUrl(mode.meal.imageUrl ?? "");
    }

    setImageUrlExpanded(false);
    setError(null);
    setPreviewError(false);
  }, [isOpen, mode]);

  const title = mode.type === "create" ? "Ny måltid" : "Redigera måltid";
  const submitLabel = mode.type === "create" ? "Lägg till" : "Spara";

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }

    const blobUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
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

  async function handleGenerateIngredients() {
    const dishName = name.trim();
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

  async function handleGenerateImage() {
    const dishName = name.trim();
    if (!dishName || imageLoading) {
      return;
    }

    setImageLoading(true);
    setError(null);
    try {
      const generated = await generateDishImageUrl(dishName);
      setImageMode("url");
      setImageFile(null);
      setImageUrl(generated.imageUrl);
      setPreviewError(false);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Kunde inte generera bild.");
    } finally {
      setImageLoading(false);
    }
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("name", trimmedName);
      formData.append("complexity", complexity);
      formData.append("defaultServings", String(defaultServings));
      for (const day of preferredDays) {
        formData.append("preferredDays", day);
      }

      const cleanedIngredients = ingredients
        .map((ingredient) => ({ ...ingredient, name: ingredient.name.trim() }))
        .filter((ingredient) => ingredient.name.length > 0);
      if (cleanedIngredients.length > 0) {
        formData.append("ingredients", JSON.stringify(cleanedIngredients));
      }

      if (imageMode === "upload" && imageFile) {
        formData.append("image", imageFile);
      }
      if (imageMode === "url" && imageUrl.trim()) {
        formData.append("imageUrl", imageUrl.trim());
      }

      const result =
        mode.type === "create" ? await addMeal(formData) : await updateMeal(mode.meal.id, formData);

      if (result.error) {
        setError(result.error);
        return;
      }

      onSaved?.();
      onClose();
      router.refresh();
    } catch {
      setError("Kunde inte spara måltiden. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`absolute inset-0 z-20 bg-white transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      aria-hidden={!isOpen}
    >
      <div className="flex h-full flex-col">
        <header className="border-b border-[var(--cream-dark)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-[var(--charcoal)]">{title}</h3>
              <p className="text-xs text-[var(--warm-gray)]">Finjustera grund, ingredienser och bild.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--cream-dark)] p-1.5 text-[var(--warm-gray)]"
              aria-label="Stäng editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 pb-24">
          <div className="space-y-5">
            <section className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Grund</p>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full border-none bg-transparent p-0 text-2xl font-bold text-[var(--charcoal)] focus:ring-0"
                placeholder="Måltidsnamn"
              />

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Komplexitet</p>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-[var(--cream)]/70 p-1">
                  {[
                    { value: "SIMPLE", label: "🟢 Enkel" },
                    { value: "MEDIUM", label: "🟡 Medium" },
                    { value: "COMPLEX", label: "🔴 Avancerad" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setComplexity(option.value as Meal["complexity"])}
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

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Portioner</p>
                <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--cream-dark)] bg-white px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setDefaultServings((current) => Math.max(1, current - 1))}
                    className="h-7 w-7 rounded-md border border-[var(--cream-dark)] text-sm font-bold text-[var(--charcoal)]"
                  >
                    -
                  </button>
                  <span className="min-w-16 text-center text-sm font-semibold text-[var(--charcoal)]">{defaultServings} pers</span>
                  <button
                    type="button"
                    onClick={() => setDefaultServings((current) => Math.min(12, current + 1))}
                    className="h-7 w-7 rounded-md border border-[var(--cream-dark)] text-sm font-bold text-[var(--charcoal)]"
                  >
                    +
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[var(--warm-gray)]">Ingredienserna gäller för denna mängd.</p>
              </div>

              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Passar bäst...</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {DAY_OPTIONS.map((dayOption) => {
                    const selected = preferredDays.includes(dayOption.value);
                    return (
                      <button
                        key={dayOption.value}
                        aria-label={dayOption.label}
                        type="button"
                        onClick={() =>
                          setPreferredDays((current) =>
                            current.includes(dayOption.value)
                              ? current.filter((day) => day !== dayOption.value)
                              : [...current, dayOption.value]
                          )
                        }
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition ${
                          selected
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
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Ingredienser</p>
                <button
                  type="button"
                  onClick={() => void handleGenerateIngredients()}
                  disabled={ingredientLoading || !name.trim()}
                  className="text-xs font-semibold text-[var(--charcoal)] disabled:opacity-60"
                >
                  {ingredientLoading ? "Genererar..." : "✨ Generera förslag"}
                </button>
              </div>

              <div className="grid grid-cols-[1fr_72px_68px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--warm-gray)]">
                <span>Ingrediens</span>
                <span>Mängd</span>
                <span>Enhet</span>
              </div>

              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="grid grid-cols-[1fr_72px_68px_auto] gap-2">
                    <input
                      value={ingredient.name}
                      onChange={(event) =>
                        setIngredients((state) =>
                          state.map((item, rowIndex) => (rowIndex === index ? { ...item, name: event.target.value } : item))
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
                    <button
                      type="button"
                      onClick={() =>
                        setIngredients((state) => state.filter((_, rowIndex) => rowIndex !== index))
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--cream-dark)] text-[var(--warm-gray)] hover:bg-[var(--cream)] hover:text-[var(--charcoal)]"
                      aria-label={`Ta bort ingrediensrad ${index + 1}`}
                      title="Ta bort rad"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {(ingredient.needsReview || !ingredient.amount || !ingredient.unit) && (
                      <p className="col-span-4 pl-1 text-[11px] text-amber-600">Behöver review</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIngredients((state) => [...state, { name: "", amount: null, unit: null }])}
                  className="text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
                >
                  + Lägg till rad
                </button>
                {ingredients.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIngredients([])}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Rensa alla
                  </button>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Bild</p>
                <button
                  type="button"
                  onClick={() => void handleGenerateImage()}
                  disabled={imageLoading || !name.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--charcoal)] px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {imageLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {imageLoading ? "Genererar..." : "✨ Generera ny"}
                </button>
              </div>

              {(imageMode === "url" && imageUrl.trim()) || imageFile ? (
                <div className="overflow-hidden rounded-lg border border-[var(--cream-dark)] bg-black/5">
                  {!previewError ? (
                    <img
                      src={previewUrl ?? resolveMealImageUrl(imageUrl, name || "Meal preview")}
                      alt={name || "Meal preview"}
                      className="h-40 w-full object-cover"
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

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setImageUrlExpanded((current) => !current)}
                  className="text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
                >
                  {imageUrlExpanded ? "Dölj URL" : "Ändra URL manuellt"}
                </button>
                <label className="cursor-pointer text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]">
                  Ladda upp
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      setImageMode("upload");
                      setImageFile(event.target.files?.[0] ?? null);
                      setPreviewError(false);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {imageUrlExpanded && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => {
                    setImageMode("url");
                    setImageFile(null);
                    setImageUrl(event.target.value);
                    setPreviewError(false);
                  }}
                  placeholder="https://example.com/meal.jpg"
                  className="w-full"
                />
              )}
            </section>
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </div>

        <footer className="sticky bottom-0 border-t border-[var(--cream-dark)] bg-white/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-[var(--cream-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--warm-gray)]"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !name.trim()}
              className="rounded-md bg-[var(--terracotta)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Sparar..." : submitLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
