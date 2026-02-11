"use client";

import { deleteMeal, updateMeal } from "@/lib/actions/meals";
import { useState } from "react";

type Meal = {
  id: string;
  name: string;
  createdAt: Date;
};

export function MealList({ meals }: { meals: Meal[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startEditing(meal: Meal) {
    setEditingId(meal.id);
    setEditValue(meal.name);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValue("");
  }

  async function handleUpdate(id: string) {
    const formData = new FormData();
    formData.append("name", editValue);
    await updateMeal(id, formData);
    setEditingId(null);
    setEditValue("");
  }

  async function handleDelete(id: string) {
    if (confirm("Är du säker på att du vill ta bort den här måltiden?")) {
      await deleteMeal(id);
    }
  }

  return (
    <ul className="space-y-3">
      {meals.map((meal, index) => (
        <li
          key={meal.id}
          className="group animate-slide-in-right"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          {editingId === meal.id ? (
            <div className="flex gap-2 p-4 bg-white border-2 border-[var(--terracotta)] rounded-xl">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdate(meal.id);
                  if (e.key === "Escape") cancelEditing();
                }}
              />
              <button
                onClick={() => handleUpdate(meal.id)}
                className="btn-primary px-4 py-2 text-sm"
              >
                Spara
              </button>
              <button
                onClick={cancelEditing}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Avbryt
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-white/60 hover:bg-white border border-[var(--cream-dark)] rounded-xl hover:border-[var(--terracotta)]/30 transition-all hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--sage)]"></div>
                <span className="font-medium text-[var(--charcoal)]">{meal.name}</span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditing(meal)}
                  className="px-3 py-1.5 text-sm font-semibold text-[var(--terracotta)] hover:bg-[var(--terracotta)]/10 rounded-lg transition-colors"
                >
                  Redigera
                </button>
                <button
                  onClick={() => handleDelete(meal.id)}
                  className="px-3 py-1.5 text-sm font-semibold text-[var(--warm-gray)] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
