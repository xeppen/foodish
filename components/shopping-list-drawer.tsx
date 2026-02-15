"use client";

import { generateCurrentWeekShoppingList, toggleShoppingListItem } from "@/lib/actions/shopping-list";
import { setDayServings } from "@/lib/actions/plans";
import { Loader2, ShoppingBasket, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type ShoppingItem = {
  id: string;
  displayName: string;
  amount: number | null;
  unit: string | null;
  isChecked: boolean;
  unresolved: boolean;
  sourceMealNames?: unknown;
};

type ShoppingListPayload = {
  id: string;
  items: ShoppingItem[];
} | null;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  initialList: ShoppingListPayload;
  plan: {
    monday: string | null;
    tuesday: string | null;
    wednesday: string | null;
    thursday: string | null;
    friday: string | null;
    entries?: Array<{
      day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
      servings: number | null;
    }>;
  };
};

function formatAmount(value: number | null, unit: string | null) {
  if (value == null) {
    return "";
  }
  return `${value % 1 === 0 ? value.toFixed(0) : value} ${unit ?? ""}`.trim();
}

function extractBreakdownLines(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}

const DAY_LABELS = {
  monday: "Måndag",
  tuesday: "Tisdag",
  wednesday: "Onsdag",
  thursday: "Torsdag",
  friday: "Fredag",
} as const;

const PLAN_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"] as const;

export function ShoppingListDrawer({ isOpen, onClose, isAuthenticated, initialList, plan }: Props) {
  const [loading, setLoading] = useState(false);
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<string | null>(null);
  const router = useRouter();
  const servingsByDay = (plan.entries ?? []).reduce<Record<string, number>>((acc, entry) => {
    const key = entry.day.toLowerCase();
    if (typeof entry.servings === "number" && Number.isFinite(entry.servings) && entry.servings > 0) {
      acc[key] = entry.servings;
    }
    return acc;
  }, {});

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateCurrentWeekShoppingList();
      if (!result.error) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(item: ShoppingItem) {
    setPendingItem(item.id);
    try {
      const result = await toggleShoppingListItem(item.id, !item.isChecked);
      if (!result.error) {
        router.refresh();
      }
    } finally {
      setPendingItem(null);
    }
  }

  async function handleUpdateDayServings(day: (typeof PLAN_DAYS)[number], next: number) {
    const normalized = Math.max(1, Math.min(12, Math.round(next)));
    setPendingDay(day);
    try {
      const setResult = await setDayServings(day, normalized);
      if (!setResult || "error" in setResult) {
        return;
      }
      await generateCurrentWeekShoppingList();
      router.refresh();
    } finally {
      setPendingDay(null);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[70] transition-all duration-300 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`absolute bottom-0 left-0 right-0 h-[80dvh] rounded-t-2xl border border-white/20 bg-black/75 p-4 text-white backdrop-blur-xl transition-transform duration-300 sm:bottom-0 sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:w-[32vw] sm:max-w-md sm:rounded-none sm:rounded-l-2xl ${
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Inköpslista</h3>
            <p className="text-xs text-white/70">För veckans middagsplan</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/20 p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isAuthenticated ? (
          <p className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm">Logga in för att skapa och spara inköpslista.</p>
        ) : (
          <>
            <div className="mb-4 space-y-2 rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Portioner per dag</p>
              {PLAN_DAYS.map((day) => {
                const mealName = plan[day];
                if (!mealName) {
                  return null;
                }
                const current = servingsByDay[day] ?? 4;
                const disabled = pendingDay === day || loading;
                return (
                  <div key={day} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white/80">{DAY_LABELS[day]}</p>
                      <p className="truncate text-xs text-white/65">{mealName}</p>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={disabled || current <= 1}
                        onClick={() => void handleUpdateDayServings(day, current - 1)}
                        className="h-7 w-7 rounded-md border border-white/20 text-sm font-bold text-white disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="min-w-14 text-center text-xs font-semibold text-white">{current} pers</span>
                      <button
                        type="button"
                        disabled={disabled || current >= 12}
                        onClick={() => void handleUpdateDayServings(day, current + 1)}
                        className="h-7 w-7 rounded-md border border-white/20 text-sm font-bold text-white disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={loading || pendingDay !== null}
              className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-black disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBasket className="h-4 w-4" />}
              {initialList ? "Regenerera lista" : "Generera inköpslista"}
            </button>

            <ul className="space-y-2 overflow-y-auto pr-1">
              {!initialList || initialList.items.length === 0 ? (
                <li className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70">Ingen lista ännu.</li>
              ) : (
                initialList.items.map((item) => (
                  <li key={item.id} className="group relative rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`truncate text-sm ${item.isChecked ? "line-through text-white/45" : "text-white"}`}>{item.displayName}</p>
                        <p className="text-xs text-white/70">{formatAmount(item.amount, item.unit)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggle(item)}
                        disabled={pendingItem === item.id}
                        className={`h-7 w-7 shrink-0 rounded-md border text-xs font-bold transition ${
                          item.isChecked
                            ? "border-emerald-300 bg-emerald-500/25 text-emerald-100"
                            : "border-white/25 bg-black/25 text-white/80 hover:bg-black/35"
                        }`}
                        aria-label={item.isChecked ? "Markera som inte klar" : "Markera som klar"}
                      >
                        {item.isChecked ? "✓" : ""}
                      </button>
                    </div>
                    {item.unresolved && <p className="mt-1 text-[11px] text-amber-300">Kontrollera mängd/enhet</p>}
                    {extractBreakdownLines(item.sourceMealNames).length > 0 && (
                      <div className="pointer-events-none absolute left-2 right-2 top-full z-20 mt-1 rounded-md border border-white/20 bg-black/90 p-2 text-[11px] text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
                        <p className="mb-1 font-semibold text-white/80">Från måltider:</p>
                        <ul className="space-y-0.5">
                          {extractBreakdownLines(item.sourceMealNames).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
