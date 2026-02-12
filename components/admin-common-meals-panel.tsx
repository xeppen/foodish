"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addCommonMeal,
  deleteCommonMeal,
  updateCommonMeal,
} from "@/lib/actions/common-meals";

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
  const [newSortOrder, setNewSortOrder] = useState(
    String(initialMeals.length > 0 ? Math.max(...initialMeals.map((meal) => meal.sortOrder)) + 1 : 0)
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

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
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[var(--cream)]">
            <tr>
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
