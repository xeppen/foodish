"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addCommonMeal,
  deleteCommonMeal,
  updateCommonMeal,
} from "@/lib/actions/common-meals";
import { buildFallbackMealImageUrl, resolveMealImageUrl } from "@/lib/meal-image-url";
import { searchMealImages } from "@/lib/image-search/client";
import { type ImageSearchCandidate } from "@/lib/image-search/types";
import { generateDishImageUrl } from "@/lib/image-generation/client";

type CommonMeal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  imageUrl: string | null;
  sortOrder: number;
};

type Props = {
  initialMeals: CommonMeal[];
};

export function AdminCommonMealsPanel({ initialMeals }: Props) {
  const [meals, setMeals] = useState(initialMeals);
  const [newMealName, setNewMealName] = useState("");
  const [newComplexity, setNewComplexity] = useState<CommonMeal["complexity"]>("MEDIUM");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImagePreviewError, setNewImagePreviewError] = useState(false);
  const [newSortOrder, setNewSortOrder] = useState(
    String(initialMeals.length > 0 ? Math.max(...initialMeals.map((meal) => meal.sortOrder)) + 1 : 0)
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newImageCandidates, setNewImageCandidates] = useState<ImageSearchCandidate[]>([]);
  const [newImageSearchLoading, setNewImageSearchLoading] = useState(false);
  const [newImageSearchError, setNewImageSearchError] = useState<string | null>(null);
  const [newImageGenerationLoading, setNewImageGenerationLoading] = useState(false);
  const [newImageGenerationError, setNewImageGenerationError] = useState<string | null>(null);
  const [rowImageCandidates, setRowImageCandidates] = useState<Record<string, ImageSearchCandidate[]>>({});
  const [rowImageSearchLoading, setRowImageSearchLoading] = useState<Record<string, boolean>>({});
  const [rowImageSearchError, setRowImageSearchError] = useState<Record<string, string | null>>({});
  const [rowImageGenerationLoading, setRowImageGenerationLoading] = useState<Record<string, boolean>>({});
  const [rowImageGenerationError, setRowImageGenerationError] = useState<Record<string, string | null>>({});
  const rowNameSnapshotRef = useRef<Record<string, string>>({});
  const initializedRowsRef = useRef(false);
  const newSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newSearchAbortRef = useRef<AbortController | null>(null);
  const rowSearchDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rowSearchAbortRef = useRef<Record<string, AbortController>>({});
  const router = useRouter();

  async function runRowImageSearch(mealId: string, query: string) {
    if (rowSearchAbortRef.current[mealId]) {
      rowSearchAbortRef.current[mealId].abort();
      delete rowSearchAbortRef.current[mealId];
    }

    const controller = new AbortController();
    rowSearchAbortRef.current[mealId] = controller;
    setRowImageSearchLoading((state) => ({ ...state, [mealId]: true }));
    setRowImageSearchError((state) => ({ ...state, [mealId]: null }));
    try {
      const result = await searchMealImages(query, controller.signal);
      setRowImageCandidates((state) => ({ ...state, [mealId]: result.candidates }));
      if (result.candidates.length === 0) {
        setRowImageSearchError((state) => ({
          ...state,
          [mealId]: "Inga bilder hittades. Klistra in en bild-URL manuellt.",
        }));
      }
    } catch (searchErr) {
      if (controller.signal.aborted) {
        return;
      }
      setRowImageCandidates((state) => ({ ...state, [mealId]: [] }));
      setRowImageSearchError((state) => ({
        ...state,
        [mealId]: searchErr instanceof Error ? searchErr.message : "Kunde inte söka efter bilder",
      }));
    } finally {
      if (!controller.signal.aborted) {
        setRowImageSearchLoading((state) => ({ ...state, [mealId]: false }));
      }
    }
  }

  useEffect(() => {
    const query = newMealName.trim();
    if (newSearchDebounceRef.current) {
      clearTimeout(newSearchDebounceRef.current);
      newSearchDebounceRef.current = null;
    }
    if (newSearchAbortRef.current) {
      newSearchAbortRef.current.abort();
      newSearchAbortRef.current = null;
    }

    if (query.length < 3) {
      setNewImageCandidates([]);
      setNewImageSearchError(null);
      setNewImageSearchLoading(false);
      return;
    }

    newSearchDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      newSearchAbortRef.current = controller;
      setNewImageSearchLoading(true);
      setNewImageSearchError(null);
      try {
        const result = await searchMealImages(query, controller.signal);
        setNewImageCandidates(result.candidates);
        if (result.candidates.length === 0) {
          setNewImageSearchError("Inga bilder hittades. Klistra in en bild-URL manuellt.");
        }
      } catch (searchErr) {
        if (controller.signal.aborted) {
          return;
        }
        setNewImageCandidates([]);
        setNewImageSearchError(searchErr instanceof Error ? searchErr.message : "Kunde inte söka efter bilder");
      } finally {
        if (!controller.signal.aborted) {
          setNewImageSearchLoading(false);
        }
      }
    }, 450);

    return () => {
      if (newSearchDebounceRef.current) {
        clearTimeout(newSearchDebounceRef.current);
      }
    };
  }, [newMealName]);

  useEffect(() => {
    setNewImagePreviewError(false);
  }, [newImageUrl, newMealName]);

  async function handleGenerateNewImage() {
    const dishName = newMealName.trim();
    if (!dishName) {
      setNewImageGenerationError("Skriv ett måltidsnamn först.");
      return;
    }

    setNewImageGenerationError(null);
    setNewImageGenerationLoading(true);
    try {
      const result = await generateDishImageUrl(dishName);
      setNewImageUrl(result.imageUrl);
    } catch (error) {
      setNewImageGenerationError(error instanceof Error ? error.message : "Kunde inte generera bild");
    } finally {
      setNewImageGenerationLoading(false);
    }
  }

  async function handleGenerateRowImage(mealId: string, dishName: string) {
    const value = dishName.trim();
    if (!value) {
      setRowImageGenerationError((state) => ({ ...state, [mealId]: "Skriv ett måltidsnamn först." }));
      return;
    }

    setRowImageGenerationError((state) => ({ ...state, [mealId]: null }));
    setRowImageGenerationLoading((state) => ({ ...state, [mealId]: true }));
    try {
      const result = await generateDishImageUrl(value);
      setMeals((state) => state.map((item) => (item.id === mealId ? { ...item, imageUrl: result.imageUrl } : item)));
    } catch (error) {
      setRowImageGenerationError((state) => ({
        ...state,
        [mealId]: error instanceof Error ? error.message : "Kunde inte generera bild",
      }));
    } finally {
      setRowImageGenerationLoading((state) => ({ ...state, [mealId]: false }));
    }
  }

  useEffect(() => {
    if (!initializedRowsRef.current) {
      rowNameSnapshotRef.current = meals.reduce<Record<string, string>>((acc, meal) => {
        acc[meal.id] = meal.name.trim();
        return acc;
      }, {});
      initializedRowsRef.current = true;
      return;
    }

    for (const meal of meals) {
      const current = meal.name.trim();
      const previous = rowNameSnapshotRef.current[meal.id];
      if (current === previous) {
        continue;
      }

      rowNameSnapshotRef.current[meal.id] = current;
      if (rowSearchDebounceRef.current[meal.id]) {
        clearTimeout(rowSearchDebounceRef.current[meal.id]);
        delete rowSearchDebounceRef.current[meal.id];
      }
      if (rowSearchAbortRef.current[meal.id]) {
        rowSearchAbortRef.current[meal.id].abort();
        delete rowSearchAbortRef.current[meal.id];
      }

      if (current.length < 3) {
        setRowImageCandidates((state) => ({ ...state, [meal.id]: [] }));
        setRowImageSearchError((state) => ({ ...state, [meal.id]: null }));
        setRowImageSearchLoading((state) => ({ ...state, [meal.id]: false }));
        continue;
      }

      rowSearchDebounceRef.current[meal.id] = setTimeout(() => {
        void runRowImageSearch(meal.id, current);
      }, 450);
    }
  }, [meals]);

  useEffect(() => {
    const rowDebounceTimers = rowSearchDebounceRef.current;
    const rowAbortControllers = rowSearchAbortRef.current;
    return () => {
      if (newSearchDebounceRef.current) {
        clearTimeout(newSearchDebounceRef.current);
      }
      if (newSearchAbortRef.current) {
        newSearchAbortRef.current.abort();
      }
      for (const timer of Object.values(rowDebounceTimers)) {
        clearTimeout(timer);
      }
      for (const controller of Object.values(rowAbortControllers)) {
        controller.abort();
      }
    };
  }, []);

  async function handleAdd() {
    setError(null);
    setSuccess(null);
    setSaving("new");
    const formData = new FormData();
    formData.append("name", newMealName);
    formData.append("complexity", newComplexity);
    formData.append("imageUrl", newImageUrl);
    formData.append("sortOrder", newSortOrder);
    const result = await addCommonMeal(formData);
    setSaving(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess("Standardmåltid tillagd");
    setNewMealName("");
    setNewImageUrl("");
    setNewImageCandidates([]);
    setNewImageSearchError(null);
    setNewComplexity("MEDIUM");
    router.refresh();
  }

  async function handleSave(meal: CommonMeal) {
    setError(null);
    setSuccess(null);
    setSaving(meal.id);
    const formData = new FormData();
    formData.append("name", meal.name);
    formData.append("complexity", meal.complexity);
    formData.append("imageUrl", meal.imageUrl ?? "");
    formData.append("sortOrder", String(meal.sortOrder));
    const result = await updateCommonMeal(meal.id, formData);
    setSaving(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess("Standardmåltid uppdaterad");
    router.refresh();
  }

  async function handleDelete(mealId: string) {
    if (!confirm("Ta bort denna standardmåltid?")) {
      return;
    }
    setError(null);
    setSuccess(null);
    setSaving(mealId);
    const result = await deleteCommonMeal(mealId);
    setSaving(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMeals((state) => state.filter((meal) => meal.id !== mealId));
    setSuccess("Standardmåltid borttagen");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">Admin: Standardmåltider</h1>
      <p className="text-sm text-[var(--warm-gray)]">
        Denna lista används för demo-plan (ej inloggad) och som startlista för nya användare.
      </p>

      <section className="rounded-xl border border-[var(--cream-dark)] bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Lägg till måltid</h2>
        <div className="grid gap-2 md:grid-cols-4">
          <input
            type="text"
            value={newMealName}
            onChange={(event) => setNewMealName(event.target.value)}
            placeholder="Måltidsnamn"
          />
          <select
            value={newComplexity}
            onChange={(event) => setNewComplexity(event.target.value as CommonMeal["complexity"])}
            className="rounded-xl border-2 border-[var(--cream-dark)] px-3 py-2"
          >
            <option value="SIMPLE">Enkel</option>
            <option value="MEDIUM">Medium</option>
            <option value="COMPLEX">Avancerad</option>
          </select>
          <input
            type="url"
            value={newImageUrl}
            onChange={(event) => setNewImageUrl(event.target.value)}
            placeholder="https://..."
          />
          <input
            type="number"
            min={0}
            value={newSortOrder}
            onChange={(event) => setNewSortOrder(event.target.value)}
            placeholder="Sortering"
          />
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => void handleGenerateNewImage()}
            disabled={newImageGenerationLoading || !newMealName.trim()}
            className="rounded-md border border-[var(--cream-dark)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {newImageGenerationLoading ? "Genererar bild..." : "Generera bild"}
          </button>
          {newImageGenerationError && <p className="mt-1 text-xs text-rose-600">{newImageGenerationError}</p>}
        </div>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-[var(--warm-gray)]">
            Bildsökning sker automatiskt när namnet är 3+ tecken.
          </p>
          {newImageSearchLoading && <p className="text-xs text-[var(--warm-gray)]">Söker bilder...</p>}
          {newImageSearchError && <p className="text-xs text-rose-600">{newImageSearchError}</p>}
          {newImageCandidates.length > 0 && (
            <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
              {newImageCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => setNewImageUrl(candidate.fullUrl)}
                  className={`overflow-hidden rounded-md border ${newImageUrl === candidate.fullUrl ? "border-[var(--terracotta)] ring-2 ring-[var(--terracotta)]/30" : "border-[var(--cream-dark)]"}`}
                >
                  <img src={candidate.thumbUrl} alt="Bildförslag" className="h-16 w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          {newImageUrl.trim() && (
            <div className="max-w-xs overflow-hidden rounded-md border border-[var(--cream-dark)] bg-white">
              <img
                src={resolveMealImageUrl(newImageUrl, newMealName || "Ny måltid")}
                alt="Förhandsvisning"
                className="h-24 w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  const fallback = buildFallbackMealImageUrl(newMealName || "Ny måltid");
                  if (event.currentTarget.src !== new URL(fallback, window.location.origin).toString()) {
                    event.currentTarget.src = fallback;
                  }
                  setNewImagePreviewError(true);
                }}
              />
            </div>
          )}
          {newImagePreviewError && (
            <p className="text-[11px] text-rose-600">Kunde inte läsa bilden från URL:en. Kontrollera länken.</p>
          )}
          <p className="text-[11px] text-[var(--warm-gray)]">
            Genom att välja en bild ansvarar du för att användningen följer källans villkor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={saving === "new"}
          className="mt-3 rounded-lg bg-[var(--terracotta)] px-4 py-2 text-sm font-semibold text-white"
        >
          {saving === "new" ? "Sparar..." : "Lägg till"}
        </button>
      </section>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

      <section className="overflow-x-auto rounded-xl border border-[var(--cream-dark)] bg-white">
        <div className="border-b border-[var(--cream-dark)] bg-[var(--cream)]/60 px-3 py-2 text-[11px] text-[var(--warm-gray)]">
          Genom att välja en bild ansvarar du för att användningen följer källans villkor.
        </div>
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[var(--cream)]">
            <tr>
              <th className="px-3 py-2 text-left">Bild</th>
              <th className="px-3 py-2 text-left">Namn</th>
              <th className="px-3 py-2 text-left">Komplexitet</th>
              <th className="px-3 py-2 text-left">Bild-URL</th>
              <th className="px-3 py-2 text-left">Sortering</th>
              <th className="px-3 py-2 text-left">Åtgärd</th>
            </tr>
          </thead>
          <tbody>
            {meals.map((meal, index) => (
              <tr key={meal.id} className="border-t border-[var(--cream-dark)]">
                <td className="px-3 py-2">
                  <div className="h-12 w-12 overflow-hidden rounded-md border border-[var(--cream-dark)] bg-white">
                    <img
                      src={resolveMealImageUrl(meal.imageUrl, meal.name)}
                      alt={meal.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(event) => {
                        const fallback = buildFallbackMealImageUrl(meal.name);
                        if (event.currentTarget.src !== new URL(fallback, window.location.origin).toString()) {
                          event.currentTarget.src = fallback;
                        }
                      }}
                    />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={meal.name}
                    onChange={(event) =>
                      setMeals((state) =>
                        state.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={meal.complexity}
                    onChange={(event) =>
                      setMeals((state) =>
                        state.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                complexity: event.target.value as CommonMeal["complexity"],
                              }
                            : item
                        )
                      )
                    }
                    className="rounded-xl border-2 border-[var(--cream-dark)] px-3 py-2"
                  >
                    <option value="SIMPLE">Enkel</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="COMPLEX">Avancerad</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="url"
                    value={meal.imageUrl ?? ""}
                    placeholder="https://..."
                    onChange={(event) =>
                      setMeals((state) =>
                        state.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, imageUrl: event.target.value } : item
                        )
                      )
                    }
                  />
                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => void handleGenerateRowImage(meal.id, meal.name)}
                      disabled={Boolean(rowImageGenerationLoading[meal.id]) || meal.name.trim().length < 2}
                      className="rounded-md border border-[var(--cream-dark)] px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
                    >
                      {rowImageGenerationLoading[meal.id] ? "Genererar..." : "Generera bild"}
                    </button>
                    {rowImageGenerationError[meal.id] && (
                      <p className="text-[11px] text-rose-600">{rowImageGenerationError[meal.id]}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => void runRowImageSearch(meal.id, meal.name.trim())}
                      disabled={meal.name.trim().length < 3 || Boolean(rowImageSearchLoading[meal.id])}
                      className="rounded-md border border-[var(--cream-dark)] px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
                    >
                      Sök bilder
                    </button>
                    {rowImageSearchLoading[meal.id] && <p className="text-[11px] text-[var(--warm-gray)]">Söker bilder...</p>}
                    {rowImageSearchError[meal.id] && (
                      <p className="text-[11px] text-rose-600">{rowImageSearchError[meal.id]}</p>
                    )}
                    {(rowImageCandidates[meal.id]?.length ?? 0) > 0 && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {rowImageCandidates[meal.id].map((candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            onClick={() =>
                              setMeals((state) =>
                                state.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, imageUrl: candidate.fullUrl } : item
                                )
                              )
                            }
                            className={`overflow-hidden rounded-md border ${meal.imageUrl === candidate.fullUrl ? "border-[var(--terracotta)] ring-2 ring-[var(--terracotta)]/30" : "border-[var(--cream-dark)]"}`}
                          >
                            <img src={candidate.thumbUrl} alt="Bildförslag" className="h-12 w-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={meal.sortOrder}
                    onChange={(event) =>
                      setMeals((state) =>
                        state.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, sortOrder: Number(event.target.value) } : item
                        )
                      )
                    }
                  />
                </td>
                <td className="space-x-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => void handleSave(meal)}
                    disabled={saving === meal.id}
                    className="rounded-md border border-[var(--cream-dark)] px-3 py-1 font-semibold"
                  >
                    Spara
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(meal.id)}
                    disabled={saving === meal.id}
                    className="rounded-md border border-rose-300 px-3 py-1 font-semibold text-rose-700"
                  >
                    Ta bort
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
