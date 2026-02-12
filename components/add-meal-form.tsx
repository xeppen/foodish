"use client";

import { addMeal } from "@/lib/actions/meals";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorMessage } from "./error-message";

export function AddMealForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    try {
      const result = await addMeal(formData);

      if (result.error) {
        setError(result.error);
      } else {
        formRef.current?.reset();
        router.refresh();
      }
    } catch (err) {
      setError("Kunde inte lägga till måltiden. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-semibold text-[var(--charcoal)] mb-2">
          Namn på måltid
        </label>
        <input
          type="text"
          id="name"
          name="name"
          placeholder="t.ex. Spaghetti Bolognese"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="complexity" className="block text-sm font-semibold text-[var(--charcoal)] mb-2">
          Komplexitet
        </label>
        <select id="complexity" name="complexity" defaultValue="MEDIUM" disabled={loading}>
          <option value="SIMPLE">Enkel</option>
          <option value="MEDIUM">Medium</option>
          <option value="COMPLEX">Avancerad</option>
        </select>
        <p className="mt-2 text-xs text-[var(--warm-gray)]">
          Enkel: under 30 min, Medium: 30-60 min, Avancerad: over 60 min.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Lägger till...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Lägg till måltid</span>
          </>
        )}
      </button>
    </form>
  );
}
