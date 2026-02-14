"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { MagicMealInput } from "@/components/magic-meal-input";
import { MealList } from "@/components/meal-list";
import { EmptyState } from "@/components/empty-state";
import { LoginButton } from "@/components/login-button";
import { SignOutButton } from "@/components/sign-out-button";

type Meal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  thumbsUpCount: number;
  thumbsDownCount: number;
  imageUrl: string | null;
  createdAt: Date | string;
};

type MealDrawerProps = {
  isOpen: boolean;
  isAuthenticated: boolean;
  meals: Meal[];
  onClose: () => void;
  onAuthRequired: () => void;
};

export function MealDrawer({
  isOpen,
  isAuthenticated,
  meals,
  onClose,
  onAuthRequired,
}: MealDrawerProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-[60] transition-all duration-300 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        aria-label="Stang"
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`absolute bottom-0 left-0 right-0 h-[100dvh] border border-white/30 bg-white/95 shadow-2xl transition-transform duration-300 ease-out sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-[33vw] sm:max-w-md sm:rounded-none sm:rounded-l-3xl ${
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Meal Manager"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-[var(--cream-dark)] px-5 py-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--charcoal)]">Måltider</h2>
              <p className="text-sm text-[var(--warm-gray)]">
                {isAuthenticated
                  ? "Skriv en rätt och hantera listan."
                  : "Logga in för att kurera din egen lista."}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-[var(--cream-dark)] p-2 text-[var(--warm-gray)] hover:bg-[var(--cream)] hover:text-[var(--charcoal)]"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {isAuthenticated ? (
              <div className="space-y-6">
                <section className="rounded-2xl bg-[var(--cream)]/70 p-4">
                  <MagicMealInput />
                </section>

                <section>
                  {meals.length === 0 ? (
                    <EmptyState
                      title="Inga måltider än"
                      description="Lägg till din första måltid för att skapa personliga veckoplaner."
                    />
                  ) : (
                    <MealList meals={meals} />
                  )}
                </section>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--cream-dark)] bg-[var(--cream)]/70 p-6 text-center">
                <p className="mb-4 text-base font-medium text-[var(--charcoal)]">
                  Login to curate your own meals
                </p>
                <LoginButton className="btn-primary w-full">Logga in</LoginButton>
              </div>
            )}
          </div>

          <footer className="border-t border-[var(--cream-dark)] px-5 py-4">
            {isAuthenticated ? (
              <div className="flex">
                <SignOutButton className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/60 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100/80" />
              </div>
            ) : (
              <button
                type="button"
                className="w-full rounded-xl border border-[var(--cream-dark)] bg-white px-4 py-2 text-sm font-semibold text-[var(--charcoal)] hover:bg-[var(--cream)]"
                onClick={onAuthRequired}
              >
                Login to curate your own meals
              </button>
            )}
          </footer>
        </div>
      </aside>
    </div>
  );
}
