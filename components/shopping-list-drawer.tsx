"use client";

import { generateCurrentWeekShoppingList, toggleShoppingListItem } from "@/lib/actions/shopping-list";
import { setDayServings } from "@/lib/actions/plans";
import { ChevronDown, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ShoppingItem = {
  id: string;
  displayName: string;
  amount: number | null;
  unit: string | null;
  isChecked: boolean;
  unresolved: boolean;
  sourceMealIds?: unknown;
  sourceMealNames?: unknown;
};

type ShoppingListPayload = {
  id: string;
  items: ShoppingItem[];
} | null;

type DayEnum = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
type PlanDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
type SortMode = "grouped" | "alpha";

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
      day: DayEnum;
      servings: number | null;
    }>;
  };
  mealNameById?: Record<string, string>;
  onRequestEditMeal?: (mealId: string) => void;
};

function formatAmount(value: number | null, unit: string | null) {
  if (value == null) {
    return "";
  }
  return `${value % 1 === 0 ? value.toFixed(0) : value} ${unit ?? ""}`.trim();
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractBreakdownLines(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}

function parseBreakdownLine(line: string): { mealName: string; amount: number | null; unit: string | null } | null {
  const separator = line.indexOf(":");
  if (separator === -1) {
    return null;
  }

  const mealName = line.slice(0, separator).trim();
  if (!mealName) {
    return null;
  }

  const rawValue = line.slice(separator + 1).trim();
  if (!rawValue || rawValue.toLowerCase() === "valfri mängd") {
    return { mealName, amount: null, unit: null };
  }

  const match = rawValue.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(.*)$/);
  if (!match) {
    return { mealName, amount: null, unit: null };
  }

  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) {
    return { mealName, amount: null, unit: null };
  }

  const unit = match[2]?.trim() || null;
  return { mealName, amount, unit };
}

function formatBreakdownLine(mealName: string, amount: number | null, unit: string | null): string {
  if (amount == null) {
    return `${mealName}: valfri mängd`;
  }
  const normalized = amount % 1 === 0 ? amount.toFixed(0) : String(roundAmount(amount));
  const suffix = unit ? ` ${unit}` : "";
  return `${mealName}: ${normalized}${suffix}`;
}

function mapServingsByDay(planEntries: Props["plan"]["entries"]): Record<string, number> {
  return (planEntries ?? []).reduce<Record<string, number>>((acc, entry) => {
    const key = entry.day.toLowerCase();
    if (typeof entry.servings === "number" && Number.isFinite(entry.servings) && entry.servings > 0) {
      acc[key] = entry.servings;
    }
    return acc;
  }, {});
}

function adjustListForDayServings(
  list: ShoppingListPayload,
  mealName: string | null,
  currentServings: number,
  nextServings: number
): ShoppingListPayload {
  if (!list || !mealName || currentServings <= 0 || nextServings <= 0 || currentServings === nextServings) {
    return list;
  }

  const ratio = nextServings / currentServings;
  const nextItems = list.items.map((item) => {
    const lines = extractBreakdownLines(item.sourceMealNames);
    if (lines.length === 0) {
      return item;
    }

    let contributionIndex = -1;
    let contributionAmount: number | null = null;
    let contributionUnit: string | null = null;

    for (let index = 0; index < lines.length; index += 1) {
      const parsed = parseBreakdownLine(lines[index]);
      if (!parsed || parsed.mealName !== mealName) {
        continue;
      }
      contributionIndex = index;
      contributionAmount = parsed.amount;
      contributionUnit = parsed.unit;
      break;
    }

    if (contributionIndex === -1 || contributionAmount == null || item.amount == null) {
      return item;
    }

    const scaledContribution = roundAmount(contributionAmount * ratio);
    const nextAmount = roundAmount(Math.max(0, item.amount - contributionAmount + scaledContribution));
    const nextLines = [...lines];
    nextLines[contributionIndex] = formatBreakdownLine(mealName, scaledContribution, contributionUnit ?? item.unit ?? null);

    return {
      ...item,
      amount: nextAmount,
      sourceMealNames: nextLines,
    };
  });

  return {
    ...list,
    items: nextItems,
  };
}

const DAY_LABELS = {
  monday: "Måndag",
  tuesday: "Tisdag",
  wednesday: "Onsdag",
  thursday: "Torsdag",
  friday: "Fredag",
} as const;

const PLAN_DAYS: PlanDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const CATEGORY_ORDER = [
  "Frukt & grönt",
  "Mejeri & ägg",
  "Kött, fisk & vegoprotein",
  "Bröd & bageri",
  "Torrvaror",
  "Konserver & burkar",
  "Kryddor, såser & oljor",
  "Fryst",
  "Övrigt",
] as const;

function categorizeIngredient(displayName: string): (typeof CATEGORY_ORDER)[number] {
  const value = displayName.trim().toLowerCase();

  if (/(krossade tomater|tomatpuré|burk|konserv|kokosmjölk)/.test(value)) {
    return "Konserver & burkar";
  }
  if (
    /(tomat|gurk|sallad|spenat|morot|broccoli|blomkål|paprika|lök|vitlök|potatis|zucchini|aubergine|svamp|avokado|äpple|banan|citron|lime|persilja|koriander|dill|basilika)/.test(
      value
    )
  ) {
    return "Frukt & grönt";
  }
  if (/(mjölk|grädde|yoghurt|fil|ost|smör|kvarg|crème fraiche|creme fraiche|ägg)/.test(value)) {
    return "Mejeri & ägg";
  }
  if (/(kyckling|kött|färs|korv|lax|fisk|räk|tofu|tempeh|bacon|skinka)/.test(value)) {
    return "Kött, fisk & vegoprotein";
  }
  if (/(bröd|fralla|tortilla|wrap|pitabröd|hamburgerbröd|knäckebröd)/.test(value)) {
    return "Bröd & bageri";
  }
  if (/(ris|pasta|nudel|mjöl|gryn|linser|bönor|havre|socker|bulgur|quinoa)/.test(value)) {
    return "Torrvaror";
  }
  if (/(salt|peppar|paprika|oregano|timjan|curry|spiskummin|olja|vinäger|soja|senap|ketchup|majonnäs|fond|buljong)/.test(value)) {
    return "Kryddor, såser & oljor";
  }
  if (/(fryst|ärtor|wokmix|glass)/.test(value)) {
    return "Fryst";
  }
  return "Övrigt";
}

export function ShoppingListDrawer({
  isOpen,
  onClose,
  isAuthenticated,
  initialList,
  plan,
  mealNameById,
  onRequestEditMeal,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [pendingDay, setPendingDay] = useState<string | null>(null);
  const [isPortionsExpanded, setIsPortionsExpanded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [localList, setLocalList] = useState<ShoppingListPayload>(initialList);
  const [localServingsByDay, setLocalServingsByDay] = useState<Record<string, number>>(mapServingsByDay(plan.entries));
  const [chooserMealIds, setChooserMealIds] = useState<string[] | null>(null);
  const [attemptedAutoGenerate, setAttemptedAutoGenerate] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("grouped");
  const router = useRouter();

  useEffect(() => {
    setLocalList(initialList);
  }, [initialList]);

  useEffect(() => {
    setLocalServingsByDay(mapServingsByDay(plan.entries));
  }, [plan.entries]);

  const chooserItems = useMemo(() => {
    return (chooserMealIds ?? []).map((mealId) => ({
      id: mealId,
      label: mealNameById?.[mealId] ?? mealId,
    }));
  }, [chooserMealIds, mealNameById]);

  const groupedItems = useMemo(() => {
    const items = localList?.items ?? [];
    if (sortMode === "alpha") {
      return [
        {
          title: "A–Ö",
          items: [...items].sort((a, b) => a.displayName.localeCompare(b.displayName, "sv")),
        },
      ];
    }

    const byCategory = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const category = categorizeIngredient(item.displayName);
      const existing = byCategory.get(category) ?? [];
      existing.push(item);
      byCategory.set(category, existing);
    }

    return CATEGORY_ORDER.map((title) => ({
      title,
      items: (byCategory.get(title) ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName, "sv")),
    })).filter((section) => section.items.length > 0);
  }, [localList?.items, sortMode]);

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

  useEffect(() => {
    if (!isOpen) {
      setIsPortionsExpanded(false);
      setSyncError(null);
      setChooserMealIds(null);
      setAttemptedAutoGenerate(false);
      return;
    }

    if (!isAuthenticated || localList || loading || attemptedAutoGenerate) {
      return;
    }

    let canceled = false;
    setLoading(true);
    setSyncError(null);
    setAttemptedAutoGenerate(true);

    void generateCurrentWeekShoppingList()
      .then((result) => {
        if (canceled) {
          return;
        }
        if (!result || "error" in result) {
          setSyncError("Kunde inte skapa inköpslistan just nu.");
          return;
        }
        router.refresh();
      })
      .catch(() => {
        if (!canceled) {
          setSyncError("Kunde inte skapa inköpslistan just nu.");
        }
      })
      .finally(() => {
        if (!canceled) {
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [attemptedAutoGenerate, isOpen, isAuthenticated, localList, loading, router]);

  async function handleToggle(item: ShoppingItem) {
    setPendingItem(item.id);
    setSyncError(null);
    const previous = localList;

    setLocalList((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        items: current.items.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                isChecked: !entry.isChecked,
              }
            : entry
        ),
      };
    });

    try {
      const result = await toggleShoppingListItem(item.id, !item.isChecked);
      if (!result || "error" in result) {
        setLocalList(previous);
        setSyncError("Kunde inte uppdatera listan. Försök igen.");
        return;
      }
      router.refresh();
    } finally {
      setPendingItem(null);
    }
  }

  async function handleUpdateDayServings(day: PlanDay, next: number) {
    const normalized = Math.max(1, Math.min(12, Math.round(next)));
    const current = localServingsByDay[day] ?? 4;
    const mealName = plan[day];

    const previousServings = localServingsByDay;
    const previousList = localList;

    setSyncError(null);
    setPendingDay(day);
    setLocalServingsByDay((existing) => ({
      ...existing,
      [day]: normalized,
    }));
    setLocalList((existing) => adjustListForDayServings(existing, mealName, current, normalized));

    try {
      const setResult = await setDayServings(day, normalized);
      if (!setResult || "error" in setResult) {
        setLocalServingsByDay(previousServings);
        setLocalList(previousList);
        setSyncError("Kunde inte uppdatera portionerna. Försök igen.");
        return;
      }
      router.refresh();
    } finally {
      setPendingDay(null);
    }
  }

  function handleEditFromUnresolved(item: ShoppingItem) {
    if (!onRequestEditMeal) {
      return;
    }

    const mealIds = Array.isArray(item.sourceMealIds) ? item.sourceMealIds.filter((id) => typeof id === "string") : [];
    if (mealIds.length === 0) {
      setSyncError("Kunde inte hitta källmåltid att redigera.");
      return;
    }

    if (mealIds.length === 1) {
      onRequestEditMeal(mealIds[0]);
      return;
    }

    setChooserMealIds(mealIds);
  }

  function closeChooser() {
    setChooserMealIds(null);
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
        className={`absolute inset-0 flex h-[100dvh] w-full flex-col bg-black/80 p-4 text-white backdrop-blur-xl transition-transform duration-300 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[32vw] sm:max-w-md sm:rounded-none sm:rounded-l-2xl sm:border sm:border-white/20 ${
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
            {syncError && (
              <div className="mb-3 rounded-lg border border-amber-300/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-100">
                {syncError}
              </div>
            )}

            <div className="mb-4 rounded-xl border border-white/15 bg-white/5 p-3">
              <button
                type="button"
                onClick={() => setIsPortionsExpanded((current) => !current)}
                className="flex w-full items-center justify-between"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Portioner per dag</p>
                <ChevronDown
                  className={`h-4 w-4 text-white/70 transition-transform duration-200 ${isPortionsExpanded ? "rotate-180" : ""}`}
                />
              </button>
              {isPortionsExpanded && (
                <div className="mt-3 space-y-2">
                  {PLAN_DAYS.map((day) => {
                    const mealName = plan[day];
                    if (!mealName) {
                      return null;
                    }
                    const current = localServingsByDay[day] ?? 4;
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
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="mb-3 inline-flex rounded-lg border border-white/15 bg-white/5 p-1 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setSortMode("grouped")}
                  className={`rounded-md px-2 py-1 ${sortMode === "grouped" ? "bg-white text-black" : "text-white/75"}`}
                >
                  Butikskategorier
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode("alpha")}
                  className={`rounded-md px-2 py-1 ${sortMode === "alpha" ? "bg-white text-black" : "text-white/75"}`}
                >
                  A–Ö
                </button>
              </div>

              {loading && !localList ? (
                <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-4 text-sm text-white/70">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uppdaterar inköpslista...
                  </span>
                </div>
              ) : (
                <ul className="space-y-2">
                  {!localList || localList.items.length === 0 ? (
                    <li className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70">Ingen lista ännu.</li>
                  ) : (
                    groupedItems.map((section) => (
                      <li key={section.title} className="space-y-2">
                        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60">{section.title}</p>
                        <ul className="space-y-2">
                          {section.items.map((item) => (
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
                              {item.unresolved && (
                                <button
                                  type="button"
                                  onClick={() => handleEditFromUnresolved(item)}
                                  className="mt-1 text-[11px] font-semibold text-amber-300 underline underline-offset-2"
                                >
                                  Kontrollera mängd/enhet
                                </button>
                              )}
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
                          ))}
                        </ul>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </>
        )}
      </aside>

      {chooserMealIds && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/20 bg-black/90 p-4 text-white shadow-xl">
            <p className="text-sm font-semibold">Välj måltid att redigera</p>
            <p className="mt-1 text-xs text-white/70">Den här ingrediensen kommer från flera rätter.</p>
            <div className="mt-3 space-y-2">
              {chooserItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onRequestEditMeal?.(item.id);
                    closeChooser();
                  }}
                  className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-left text-sm hover:bg-white/20"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={closeChooser}
              className="mt-3 w-full rounded-md border border-white/20 px-3 py-2 text-sm text-white/80"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
