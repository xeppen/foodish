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
    if (confirm("Are you sure you want to delete this meal?")) {
      await deleteMeal(id);
    }
  }

  return (
    <ul className="space-y-2">
      {meals.map((meal) => (
        <li
          key={meal.id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
        >
          {editingId === meal.id ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded"
                autoFocus
              />
              <button
                onClick={() => handleUpdate(meal.id)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={cancelEditing}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="text-gray-900">{meal.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => startEditing(meal)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(meal.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
