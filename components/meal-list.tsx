"use client";

import { deleteMeal, updateMeal, voteMeal } from "@/lib/actions/meals";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { buildFallbackMealImageUrl, resolveMealImageUrl } from "@/lib/meal-image-url";
import { generateDishImageUrl } from "@/lib/image-generation/client";
import { generateIngredientDraftClient, type IngredientDraftItem } from "@/lib/ai/ingredients-client";

type Meal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  preferredDays: ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY")[];
  thumbsUpCount: number;
  thumbsDownCount: number;
  imageUrl: string | null;
  mealIngredients?: Array<{
    name: string;
    amount: number | null;
    unit: string | null;
    note: string | null;
    optional: boolean;
    confidence: number | null;
    needsReview: boolean;
  }>;
  createdAt: Date | string;
};

const DOT_COLOR: Record<Meal["complexity"], string> = {
  SIMPLE: "bg-emerald-500",
  MEDIUM: "bg-amber-500",
  COMPLEX: "bg-red-500",
};

const DAY_OPTIONS: Array<{ value: Meal["preferredDays"][number]; label: string; short: string }> = [
  { value: "MONDAY", label: "Måndag", short: "M" },
  { value: "TUESDAY", label: "Tisdag", short: "T" },
  { value: "WEDNESDAY", label: "Onsdag", short: "O" },
  { value: "THURSDAY", label: "Torsdag", short: "T" },
  { value: "FRIDAY", label: "Fredag", short: "F" },
  { value: "SATURDAY", label: "Lördag", short: "L" },
  { value: "SUNDAY", label: "Söndag", short: "S" },
];

export function MealList({ meals }: { meals: Meal[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editComplexity, setEditComplexity] = useState<Meal["complexity"]>("MEDIUM");
  const [editPreferredDays, setEditPreferredDays] = useState<Meal["preferredDays"]>([]);
  const [editImageMode, setEditImageMode] = useState<"upload" | "url">("upload");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editImageUrlExpanded, setEditImageUrlExpanded] = useState(false);
  const [editGenerationLoading, setEditGenerationLoading] = useState(false);
  const [editIngredientLoading, setEditIngredientLoading] = useState(false);
  const [editGenerationError, setEditGenerationError] = useState<string | null>(null);
  const [editIngredients, setEditIngredients] = useState<IngredientDraftItem[]>([]);
  const [editPreviewError, setEditPreviewError] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, { up: number; down: number }>>(
    Object.fromEntries(meals.map((meal) => [meal.id, { up: meal.thumbsUpCount, down: meal.thumbsDownCount }]))
  );
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const router = useRouter();

  function startEdit(meal: Meal) {
    setEditingId(meal.id);
    setEditName(meal.name);
    setEditComplexity(meal.complexity);
    setEditPreferredDays(meal.preferredDays ?? []);
    setEditImageFile(null);
    setEditImageMode(meal.imageUrl ? "url" : "upload");
    setEditImageUrl(meal.imageUrl ?? "");
    setEditImageUrlExpanded(false);
    setEditGenerationLoading(false);
    setEditGenerationError(null);
    setEditIngredients(
      (meal.mealIngredients ?? []).map((ingredient) => ({
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        note: ingredient.note,
        optional: ingredient.optional,
        confidence: ingredient.confidence,
        needsReview: ingredient.needsReview,
      }))
    );
    setEditPreviewError(false);
    setOpenMenuId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditComplexity("MEDIUM");
    setEditPreferredDays([]);
    setEditImageMode("upload");
    setEditImageFile(null);
    setEditImageUrl("");
    setEditImageUrlExpanded(false);
    setEditGenerationLoading(false);
    setEditIngredientLoading(false);
    setEditGenerationError(null);
    setEditIngredients([]);
    setEditPreviewError(false);
  }

  async function handleGenerateEditImage() {
    const dishName = editName.trim();
    if (!dishName) {
      setEditGenerationError("Skriv ett måltidsnamn först.");
      return;
    }

    setEditGenerationError(null);
    setEditGenerationLoading(true);

    try {
      const result = await generateDishImageUrl(dishName);
      setEditImageMode("url");
      setEditImageFile(null);
      setEditImageUrl(result.imageUrl);
      setEditPreviewError(false);
    } catch (error) {
      setEditGenerationError(error instanceof Error ? error.message : "Kunde inte generera bild");
    } finally {
      setEditGenerationLoading(false);
    }
  }

  async function handleVote(id: string, direction: "up" | "down") {
    const current = votes[id] ?? { up: 0, down: 0 };
    const optimistic = direction === "up" ? { up: current.up + 1, down: current.down } : { up: current.up, down: current.down + 1 };

    setVotes((state) => ({ ...state, [id]: optimistic }));
    setPendingVoteId(id);

    const result = await voteMeal(id, direction);
    if (result.error) {
      setVotes((state) => ({ ...state, [id]: current }));
    } else {
      setVotes((state) => ({
        ...state,
        [id]: {
          up: result.meal?.thumbsUpCount ?? optimistic.up,
          down: result.meal?.thumbsDownCount ?? optimistic.down,
        },
      }));
    }

    setPendingVoteId(null);
  }

  async function handleGenerateEditIngredients() {
    const dishName = editName.trim();
    if (!dishName || editIngredientLoading) {
      return;
    }
    setEditIngredientLoading(true);
    setEditGenerationError(null);
    try {
      const result = await generateIngredientDraftClient(dishName);
      setEditIngredients(result.ingredients);
    } catch (error) {
      setEditGenerationError(error instanceof Error ? error.message : "Kunde inte generera ingredienser");
    } finally {
      setEditIngredientLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Är du säker på att du vill ta bort den här måltiden?")) {
      return;
    }

    const result = await deleteMeal(id);
    if (!result.error) {
      router.refresh();
    }
  }

  async function handleEditSave(id: string) {
    const formData = new FormData();
    formData.append("name", editName.trim());
    formData.append("complexity", editComplexity);
    for (const day of editPreferredDays) {
      formData.append("preferredDays", day);
    }
    if (editImageMode === "upload" && editImageFile) {
      formData.append("image", editImageFile);
    }
    if (editImageMode === "url" && editImageUrl.trim()) {
      formData.append("imageUrl", editImageUrl.trim());
    }
    const cleanedIngredients = editIngredients
      .map((ingredient) => ({ ...ingredient, name: ingredient.name.trim() }))
      .filter((ingredient) => ingredient.name.length > 0);
    if (cleanedIngredients.length > 0) {
      formData.append("ingredients", JSON.stringify(cleanedIngredients));
    }
    const result = await updateMeal(id, formData);
    if (!result.error) {
      cancelEdit();
      router.refresh();
    }
  }

  function applyDayPreset(preset: "weekday" | "friday" | "weekend") {
    if (preset === "weekday") {
      setEditPreferredDays(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"]);
      return;
    }
    if (preset === "friday") {
      setEditPreferredDays(["FRIDAY"]);
      return;
    }
    setEditPreferredDays(["SATURDAY", "SUNDAY"]);
  }

  return (
    <ul className="divide-y divide-[var(--cream-dark)] rounded-xl border border-[var(--cream-dark)] bg-white">
      {meals.map((meal) => {
        const mealVotes = votes[meal.id] ?? { up: meal.thumbsUpCount, down: meal.thumbsDownCount };
        const imageSrc = resolveMealImageUrl(meal.imageUrl, meal.name);

        return (
          <li key={meal.id} className="relative px-2 py-2">
            {editingId === meal.id ? (
              <div className="space-y-5 rounded-xl border border-[var(--cream-dark)] bg-[var(--cream)]/60 p-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full border-none bg-transparent p-0 text-xl font-bold text-[var(--charcoal)] focus:ring-0"
                  autoFocus
                />

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">
                    Komplexitet
                  </p>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/75 p-1">
                    {[
                      { value: "SIMPLE", label: "🟢 Enkel" },
                      { value: "MEDIUM", label: "🟡 Medium" },
                      { value: "COMPLEX", label: "🔴 Avancerad" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setEditComplexity(option.value as Meal["complexity"])}
                        className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                          editComplexity === option.value
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
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">
                    Passar bäst...
                  </p>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((dayOption) => {
                      const selected = editPreferredDays.includes(dayOption.value);
                      return (
                        <button
                          key={dayOption.value}
                          aria-label={dayOption.label}
                          type="button"
                          onClick={() =>
                            setEditPreferredDays((current) =>
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

                <div className="rounded-md border border-[var(--cream-dark)] bg-white/70 p-2">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Bild</p>

                  <button
                    type="button"
                    onClick={() => void handleGenerateEditImage()}
                    disabled={editGenerationLoading || !editName.trim()}
                    className="mb-2 w-full rounded-md bg-[var(--charcoal)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editGenerationLoading ? "Genererar bild..." : "✨ Generera ny"}
                  </button>
                  {editGenerationError && <p className="mb-2 text-xs text-red-600">{editGenerationError}</p>}

                  {(editImageMode === "url" && editImageUrl.trim()) || editImageFile ? (
                    <div className="overflow-hidden rounded-lg border border-[var(--cream-dark)] bg-black/5">
                      {!editPreviewError ? (
                        <img
                          src={resolveMealImageUrl(editImageUrl || meal.imageUrl || "", editName || "Meal")}
                          alt={editName || "Meal preview"}
                          className="h-32 w-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={() => setEditPreviewError(true)}
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
                      onClick={() => setEditImageUrlExpanded((current) => !current)}
                      className="text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
                    >
                      {editImageUrlExpanded ? "Dölj URL" : "Ändra URL manuellt"}
                    </button>
                    <label className="cursor-pointer text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]">
                      Ladda upp
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          setEditImageMode("upload");
                          setEditImageFile(e.target.files?.[0] ?? null);
                          setEditPreviewError(false);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {editImageUrlExpanded && (
                    <input
                      type="url"
                      value={editImageUrl}
                      onChange={(e) => {
                        setEditImageMode("url");
                        setEditImageFile(null);
                        setEditImageUrl(e.target.value);
                        setEditPreviewError(false);
                      }}
                      placeholder="https://example.com/meal.jpg"
                      className="mt-2 w-full"
                    />
                  )}
                </div>

                <div className="rounded-md border border-[var(--cream-dark)] bg-white/70 p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--warm-gray)]">Ingredienser</p>
                    <button
                      type="button"
                      onClick={() => void handleGenerateEditIngredients()}
                      disabled={editIngredientLoading || !editName.trim()}
                      className="text-xs font-semibold text-[var(--charcoal)] disabled:opacity-60"
                    >
                      {editIngredientLoading ? "Genererar..." : "✨ AI-förslag"}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editIngredients.map((ingredient, index) => (
                      <div key={`${ingredient.name}-${index}`} className="grid grid-cols-[1fr_72px_68px] gap-2">
                        <input
                          value={ingredient.name}
                          onChange={(event) =>
                            setEditIngredients((state) =>
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
                            setEditIngredients((state) =>
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
                            setEditIngredients((state) =>
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
                      onClick={() => setEditIngredients((state) => [...state, { name: "", amount: null, unit: null }])}
                      className="text-xs font-semibold text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
                    >
                      + Lägg till rad
                    </button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-md border border-[var(--cream-dark)] px-2 py-1 text-xs font-semibold text-[var(--warm-gray)]"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleEditSave(meal.id)}
                    className="rounded-md bg-[var(--terracotta)] px-2 py-1 text-xs font-semibold text-white"
                  >
                    Spara
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
              <div className="relative h-10 w-10 overflow-hidden rounded-md">
                <img
                  src={imageSrc}
                  alt={meal.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    const fallback = buildFallbackMealImageUrl(meal.name);
                    if (event.currentTarget.src !== new URL(fallback, window.location.origin).toString()) {
                      event.currentTarget.src = fallback;
                    }
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${DOT_COLOR[meal.complexity]}`} />
                  <p className="truncate text-sm font-medium text-[var(--charcoal)]">{meal.name}</p>
                </div>
                {meal.preferredDays.length > 0 && (
                  <p className="truncate text-[11px] text-[var(--warm-gray)]">
                    {meal.preferredDays
                      .map((day) => DAY_OPTIONS.find((option) => option.value === day)?.short)
                      .filter((value): value is string => Boolean(value))
                      .join(", ")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleVote(meal.id, "up")}
                  disabled={pendingVoteId === meal.id}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                >
                  👍 {mealVotes.up}
                </button>
                <button
                  type="button"
                  onClick={() => handleVote(meal.id, "down")}
                  disabled={pendingVoteId === meal.id}
                  className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                >
                  👎 {mealVotes.down}
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenuId((current) => (current === meal.id ? null : meal.id))}
                  className="rounded-md p-1 text-[var(--warm-gray)] hover:bg-[var(--cream)]"
                  aria-label="Meny"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {openMenuId === meal.id && (
                  <div className="absolute right-0 top-7 z-20 w-28 rounded-md border border-[var(--cream-dark)] bg-white shadow-md">
                    <button
                      type="button"
                      onClick={() => {
                        startEdit(meal);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--charcoal)] hover:bg-[var(--cream)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        void handleDelete(meal.id);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
