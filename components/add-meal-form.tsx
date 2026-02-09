"use client";

import { addMeal } from "@/lib/actions/meals";
import { useRef, useState } from "react";

export function AddMealForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await addMeal(formData);

    if (result.error) {
      setError(result.error);
    } else {
      formRef.current?.reset();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Meal Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="e.g., Spaghetti Bolognese"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        Add Meal
      </button>
    </form>
  );
}
