"use client";

import { deleteMeal, updateMeal } from "@/lib/actions/meals";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Meal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  createdAt: Date | string;
};

export function MealList({ meals }: { meals: Meal[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editComplexity, setEditComplexity] = useState<Meal["complexity"]>("MEDIUM");
  const router = useRouter();

  function startEditing(meal: Meal) {
    setEditingId(meal.id);
    setEditValue(meal.name);
    setEditComplexity(meal.complexity);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValue("");
    setEditComplexity("MEDIUM");
  }

  async function handleUpdate(id: string) {
    const formData = new FormData();
    formData.append("name", editValue);
    formData.append("complexity", editComplexity);
    const result = await updateMeal(id, formData);
    if (result.error) {
      return;
    }
    setEditingId(null);
    setEditValue("");
    setEditComplexity("MEDIUM");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (confirm("Är du säker på att du vill ta bort den här måltiden?")) {
      const result = await deleteMeal(id);
      if (!result.error) {
        router.refresh();
      }
    }
  }

  return (
    <ul className="divide-y divide-[var(--cream-dark)] rounded-xl border border-[var(--cream-dark)] bg-white">
      {meals.map((meal, index) => (
        <li
          key={meal.id}
          className="group animate-slide-in-right"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {editingId === meal.id ? (
            <div className="space-y-2 px-3 py-2.5">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate(meal.id);
                  if (e.key === "Escape") cancelEditing();
                }}
              />
              <div className="flex items-center gap-2">
                <select
                  value={editComplexity}
                  onChange={(e) => setEditComplexity(e.target.value as Meal["complexity"])}
                  className="w-full text-sm"
                >
                  <option value="SIMPLE">Enkel</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="COMPLEX">Avancerad</option>
                </select>
                <button
                  onClick={() => handleUpdate(meal.id)}
                  className="btn-primary px-3 py-1.5 text-sm"
                >
                  Spara
                </button>
                <button
                  onClick={cancelEditing}
                  className="btn-secondary px-3 py-1.5 text-sm"
                >
                  Avbryt
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-[var(--cream)]/60">
              <button
                type="button"
                onClick={() => startEditing(meal)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--sage)]" />
                <span className="text-sm font-medium text-[var(--charcoal)]">{meal.name}</span>
              </button>
              <div className="flex gap-1.5">
                <button
                  onClick={() => startEditing(meal)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--terracotta)] hover:bg-[var(--terracotta)]/10 transition-colors"
                >
                  Redigera
                </button>
                <button
                  onClick={() => handleDelete(meal.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-[var(--warm-gray)] hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  Ta bort
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
