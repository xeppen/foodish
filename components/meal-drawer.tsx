"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Sparkles, X } from "lucide-react";
import { MealList } from "@/components/meal-list";
import { LoginButton } from "@/components/login-button";
import { SignOutButton } from "@/components/sign-out-button";
import { addStarterMealToUserMeals, bulkGenerateMealIngredients, resetMealLearning } from "@/lib/actions/meals";
import { useRouter } from "next/navigation";
import { MealEditorSheet } from "@/components/meal-editor-sheet";

type Meal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  preferredDays: ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY")[];
  thumbsUpCount: number;
  thumbsDownCount: number;
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
  createdAt: Date | string;
};

type MealDrawerProps = {
  isOpen: boolean;
  isAuthenticated: boolean;
  meals: Meal[];
  starterMeals: Array<{
    id: string;
    name: string;
    complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
    locale: string;
    cuisine: string | null;
  }>;
  commonMealImageByName?: Record<string, string>;
  onClose: () => void;
  onAuthRequired: () => void;
  openMealEditorForId?: string | null;
  onMealEditorRequestConsumed?: () => void;
  onMealSaved?: () => void;
};

export function MealDrawer({
  isOpen,
  isAuthenticated,
  meals,
  starterMeals,
  commonMealImageByName,
  onClose,
  onAuthRequired,
  openMealEditorForId,
  onMealEditorRequestConsumed,
  onMealSaved,
}: MealDrawerProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [starterMessage, setStarterMessage] = useState<string | null>(null);
  const [pendingStarterId, setPendingStarterId] = useState<string | null>(null);
  const [addedStarterIds, setAddedStarterIds] = useState<Set<string>>(new Set());
  const [editorMode, setEditorMode] = useState<{ type: "create" } | { type: "edit"; meal: Meal } | null>(null);
  const router = useRouter();
  const mealsMissingIngredientsCount = meals.filter((meal) => (meal.mealIngredients?.length ?? 0) === 0).length;
  const importedMealNames = useMemo(
    () => new Set(meals.map((meal) => meal.name.trim().toLowerCase())),
    [meals],
  );

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !openMealEditorForId) return;
    const meal = meals.find((candidate) => candidate.id === openMealEditorForId);
    if (meal) setEditorMode({ type: "edit", meal });
    onMealEditorRequestConsumed?.();
  }, [isOpen, meals, onMealEditorRequestConsumed, openMealEditorForId]);

  async function handleResetLearning() {
    if (!confirm("Detta nollställer lärda dagspreferenser. Fortsätta?")) return;
    setIsResetting(true);
    try {
      const result = await resetMealLearning();
      if (!result.error) router.refresh();
    } finally {
      setIsResetting(false);
    }
  }

  async function handleBulkGenerateIngredients() {
    if (mealsMissingIngredientsCount === 0) {
      setBulkMessage("Alla måltider har redan ingredienser.");
      return;
    }
    if (!confirm(`Generera ingrediensförslag för ${mealsMissingIngredientsCount} måltider? Detta kan ta en stund.`)) return;
    setIsBulkGenerating(true);
    setBulkMessage(null);
    try {
      const result = await bulkGenerateMealIngredients({ overwrite: false });
      if (result.error) {
        setBulkMessage(result.error);
        return;
      }
      setBulkMessage(`Klart: ${result.updated} uppdaterade, ${result.skipped} hoppades över.`);
      router.refresh();
    } finally {
      setIsBulkGenerating(false);
    }
  }

  async function handleAddStarterMeal(starterMeal: MealDrawerProps["starterMeals"][number]) {
    if (!isAuthenticated) {
      onAuthRequired();
      return;
    }
    setStarterMessage(null);
    setPendingStarterId(starterMeal.id);
    try {
      const result = await addStarterMealToUserMeals(starterMeal.id);
      if (result.error) {
        setStarterMessage(result.error);
        return;
      }
      setAddedStarterIds((current) => {
        const next = new Set(current);
        next.add(starterMeal.id);
        return next;
      });
      if (!result.alreadyAdded) setStarterMessage(`"${starterMeal.name}" lades till.`);
      router.refresh();
    } finally {
      setPendingStarterId(null);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] transition-all duration-300 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Stäng"
        className={`absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`absolute bottom-0 left-0 right-0 h-[100dvh] border border-white/[0.06] bg-[#111111] shadow-2xl transition-transform duration-300 ease-out sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[42vw] sm:max-w-[560px] sm:rounded-none sm:rounded-l-3xl ${
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Måltidshanterare"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.45em] text-white/25">Foodish</p>
              <h2 className="text-xl font-bold text-white">
                {isAuthenticated ? `Måltider · ${meals.length}` : "Måltider"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/8 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Body */}
          <div className="relative flex-1 overflow-y-auto px-4 py-5">
            {isAuthenticated ? (
              <div className="space-y-7">
                {/* Add new meal */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setEditorMode({ type: "create" })}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--terracotta)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--terracotta)]/20 transition hover:bg-[var(--terracotta-dark)]"
                  >
                    <Plus className="h-4 w-4" />
                    Ny måltid
                  </button>

                  {mealsMissingIngredientsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleBulkGenerateIngredients()}
                      disabled={isBulkGenerating}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] px-4 py-2.5 text-xs font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:opacity-40"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isBulkGenerating
                        ? `Genererar (${mealsMissingIngredientsCount} kvar)…`
                        : `Autofyll ingredienser · ${mealsMissingIngredientsCount} saknar`}
                    </button>
                  )}

                  {bulkMessage && (
                    <p className="px-1 text-xs text-white/35">{bulkMessage}</p>
                  )}
                </div>

                {/* Starter meals */}
                {starterMeals.length > 0 && (
                  <section>
                    <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.4em] text-white/25">
                      Utforska starträtter
                    </p>
                    <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
                      {starterMeals.map((starterMeal, index) => {
                        const alreadyImported =
                          importedMealNames.has(starterMeal.name.trim().toLowerCase()) ||
                          addedStarterIds.has(starterMeal.id);

                        return (
                          <div
                            key={starterMeal.id}
                            className={`flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-white/[0.04] ${
                              index > 0 ? "border-t border-white/[0.05]" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white/75">
                                {starterMeal.name}
                              </p>
                              {starterMeal.cuisine && (
                                <p className="text-[11px] text-white/25">{starterMeal.cuisine}</p>
                              )}
                            </div>
                            {alreadyImported ? (
                              <span className="shrink-0 text-xs font-semibold text-emerald-400">✓</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleAddStarterMeal(starterMeal)}
                                disabled={pendingStarterId === starterMeal.id}
                                className="shrink-0 rounded-full border border-white/[0.12] px-3 py-1 text-[11px] font-semibold text-white/50 transition hover:border-white/25 hover:text-white disabled:opacity-40"
                              >
                                {pendingStarterId === starterMeal.id ? "…" : "+ Lägg till"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {starterMessage && (
                      <p className="mt-2 px-1 text-xs text-white/35">{starterMessage}</p>
                    )}
                  </section>
                )}

                {/* Your meals */}
                <section>
                  <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.4em] text-white/25">
                    Dina måltider
                  </p>
                  {meals.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-10 text-center">
                      <p className="text-sm font-medium text-white/25">Inga måltider än</p>
                      <p className="mt-1 text-xs text-white/15">Lägg till din första ovan</p>
                    </div>
                  ) : (
                    <MealList
                      meals={meals}
                      commonMealImageByName={commonMealImageByName}
                      onEditMeal={(meal) => setEditorMode({ type: "edit", meal })}
                    />
                  )}
                </section>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-5 py-12">
                <p className="max-w-[220px] text-center text-sm font-medium text-white/40">
                  Logga in för att kurera din egna middagslista
                </p>
                <LoginButton className="rounded-full bg-[var(--terracotta)] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--terracotta)]/25 transition hover:bg-[var(--terracotta-dark)]">
                  Logga in
                </LoginButton>
              </div>
            )}
          </div>

          {/* Footer */}
          {isAuthenticated && (
            <footer className="shrink-0 border-t border-white/[0.06] px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleResetLearning()}
                  disabled={isResetting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-2.5 text-xs font-semibold text-white/35 transition hover:bg-white/5 hover:text-white/60 disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  {isResetting ? "Nollställer…" : "Nollställ preferenser"}
                </button>
                <SignOutButton className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/[0.15] py-2.5 text-xs font-semibold text-red-400/60 transition hover:bg-red-500/[0.08] hover:text-red-400" />
              </div>
            </footer>
          )}
        </div>

        {editorMode && (
          <MealEditorSheet
            mode={editorMode}
            isOpen={Boolean(editorMode)}
            onClose={() => setEditorMode(null)}
            onSaved={onMealSaved}
          />
        )}
      </aside>
    </div>
  );
}
