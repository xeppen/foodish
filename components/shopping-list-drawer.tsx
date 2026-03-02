"use client";

import { generateCurrentWeekShoppingList, toggleShoppingListItem } from "@/lib/actions/shopping-list";
import { setDayServings } from "@/lib/actions/plans";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
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
      blocked: boolean;
    }>;
  };
  mealNameById?: Record<string, string>;
  onRequestEditMeal?: (mealId: string) => void;
};

function formatAmount(value: number | null, unit: string | null) {
  if (value == null) return "";
  return `${value % 1 === 0 ? value.toFixed(0) : value} ${unit ?? ""}`.trim();
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

function extractBreakdownLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}

function parseBreakdownLine(line: string): { mealName: string; amount: number | null; unit: string | null } | null {
  const separator = line.indexOf(":");
  if (separator === -1) return null;
  const mealName = line.slice(0, separator).trim();
  if (!mealName) return null;
  const rawValue = line.slice(separator + 1).trim();
  if (!rawValue || rawValue.toLowerCase() === "valfri mängd") return { mealName, amount: null, unit: null };
  const match = rawValue.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(.*)$/);
  if (!match) return { mealName, amount: null, unit: null };
  const amount = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return { mealName, amount: null, unit: null };
  const unit = match[2]?.trim() || null;
  return { mealName, amount, unit };
}

function formatBreakdownLine(mealName: string, amount: number | null, unit: string | null): string {
  if (amount == null) return `${mealName}: valfri mängd`;
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

function mapBlockedByDay(planEntries: Props["plan"]["entries"]): Record<string, boolean> {
  return (planEntries ?? []).reduce<Record<string, boolean>>((acc, entry) => {
    acc[entry.day.toLowerCase()] = Boolean(entry.blocked);
    return acc;
  }, {});
}

function adjustListForDayServings(
  list: ShoppingListPayload,
  mealName: string | null,
  currentServings: number,
  nextServings: number,
): ShoppingListPayload {
  if (!list || !mealName || currentServings <= 0 || nextServings <= 0 || currentServings === nextServings) {
    return list;
  }
  const ratio = nextServings / currentServings;
  const nextItems = list.items.map((item) => {
    const lines = extractBreakdownLines(item.sourceMealNames);
    if (lines.length === 0) return item;
    let contributionIndex = -1;
    let contributionAmount: number | null = null;
    let contributionUnit: string | null = null;
    for (let index = 0; index < lines.length; index += 1) {
      const parsed = parseBreakdownLine(lines[index]);
      if (!parsed || parsed.mealName !== mealName) continue;
      contributionIndex = index;
      contributionAmount = parsed.amount;
      contributionUnit = parsed.unit;
      break;
    }
    if (contributionIndex === -1 || contributionAmount == null || item.amount == null) return item;
    const scaledContribution = roundAmount(contributionAmount * ratio);
    const nextAmount = roundAmount(Math.max(0, item.amount - contributionAmount + scaledContribution));
    const nextLines = [...lines];
    nextLines[contributionIndex] = formatBreakdownLine(mealName, scaledContribution, contributionUnit ?? item.unit ?? null);
    return { ...item, amount: nextAmount, sourceMealNames: nextLines };
  });
  return { ...list, items: nextItems };
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
  if (/(krossade tomater|tomatpuré|burk|konserv|kokosmjölk)/.test(value)) return "Konserver & burkar";
  if (/(tomat|gurk|sallad|spenat|morot|broccoli|blomkål|paprika|lök|vitlök|potatis|zucchini|aubergine|svamp|avokado|äpple|banan|citron|lime|persilja|koriander|dill|basilika)/.test(value)) return "Frukt & grönt";
  if (/(mjölk|grädde|yoghurt|fil|ost|smör|kvarg|crème fraiche|creme fraiche|ägg)/.test(value)) return "Mejeri & ägg";
  if (/(kyckling|kött|färs|korv|lax|fisk|räk|tofu|tempeh|bacon|skinka)/.test(value)) return "Kött, fisk & vegoprotein";
  if (/(bröd|fralla|tortilla|wrap|pitabröd|hamburgerbröd|knäckebröd)/.test(value)) return "Bröd & bageri";
  if (/(ris|pasta|nudel|mjöl|gryn|linser|bönor|havre|socker|bulgur|quinoa)/.test(value)) return "Torrvaror";
  if (/(salt|peppar|paprika|oregano|timjan|curry|spiskummin|olja|vinäger|soja|senap|ketchup|majonnäs|fond|buljong)/.test(value)) return "Kryddor, såser & oljor";
  if (/(fryst|ärtor|wokmix|glass)/.test(value)) return "Fryst";
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
  const [localBlockedByDay, setLocalBlockedByDay] = useState<Record<string, boolean>>(mapBlockedByDay(plan.entries));
  const [chooserMealIds, setChooserMealIds] = useState<string[] | null>(null);
  const [attemptedAutoGenerate, setAttemptedAutoGenerate] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("grouped");
  const router = useRouter();

  useEffect(() => { setLocalList(initialList); }, [initialList]);

  useEffect(() => {
    setLocalServingsByDay(mapServingsByDay(plan.entries));
    setLocalBlockedByDay(mapBlockedByDay(plan.entries));
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
      return [{ title: "A–Ö", items: [...items].sort((a, b) => a.displayName.localeCompare(b.displayName, "sv")) }];
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

  const totalCount = localList?.items.length ?? 0;
  const checkedCount = localList?.items.filter((item) => item.isChecked).length ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsPortionsExpanded(false);
      setSyncError(null);
      setChooserMealIds(null);
      setAttemptedAutoGenerate(false);
      return;
    }
    if (!isAuthenticated || localList || loading || attemptedAutoGenerate) return;
    let canceled = false;
    setLoading(true);
    setSyncError(null);
    setAttemptedAutoGenerate(true);
    void generateCurrentWeekShoppingList()
      .then((result) => {
        if (canceled) return;
        if (!result || "error" in result) { setSyncError("Kunde inte skapa inköpslistan just nu."); return; }
        router.refresh();
      })
      .catch(() => { if (!canceled) setSyncError("Kunde inte skapa inköpslistan just nu."); })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [attemptedAutoGenerate, isOpen, isAuthenticated, localList, loading, router]);

  async function handleToggle(item: ShoppingItem) {
    setPendingItem(item.id);
    setSyncError(null);
    const previous = localList;
    setLocalList((current) => {
      if (!current) return current;
      return { ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, isChecked: !entry.isChecked } : entry) };
    });
    try {
      const result = await toggleShoppingListItem(item.id, !item.isChecked);
      if (!result || "error" in result) { setLocalList(previous); setSyncError("Kunde inte uppdatera listan. Försök igen."); return; }
      router.refresh();
    } finally {
      setPendingItem(null);
    }
  }

  async function handleUpdateDayServings(day: PlanDay, next: number) {
    if (localBlockedByDay[day]) return;
    const normalized = Math.max(1, Math.min(12, Math.round(next)));
    const current = localServingsByDay[day] ?? 4;
    const mealName = plan[day];
    const previousServings = localServingsByDay;
    const previousList = localList;
    setSyncError(null);
    setPendingDay(day);
    setLocalServingsByDay((existing) => ({ ...existing, [day]: normalized }));
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
    if (!onRequestEditMeal) return;
    const mealIds = Array.isArray(item.sourceMealIds) ? item.sourceMealIds.filter((id) => typeof id === "string") : [];
    if (mealIds.length === 0) { setSyncError("Kunde inte hitta källmåltid att redigera."); return; }
    if (mealIds.length === 1) { onRequestEditMeal(mealIds[0]); return; }
    setChooserMealIds(mealIds);
  }

  return (
    <div
      className={`fixed inset-0 z-[70] transition-all duration-300 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`absolute bottom-0 left-0 right-0 flex h-[100dvh] w-full flex-col bg-[#FAF8F4] transition-transform duration-300 sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:w-[32vw] sm:max-w-md sm:rounded-none sm:rounded-l-3xl sm:border sm:border-[var(--cream-dark)] ${
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
        }`}
      >
        {/* Progress bar */}
        <div className="h-1 w-full shrink-0 bg-[var(--cream-dark)]">
          <div
            className="h-full bg-[var(--terracotta)] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--cream-dark)] px-5 py-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.45em] text-[var(--warm-gray)]/50">Foodish</p>
            <div className="flex items-baseline gap-2.5">
              <h3 className="text-xl font-bold text-[var(--charcoal)]">Inköpslista</h3>
              {totalCount > 0 && (
                <span className="text-sm font-semibold text-[var(--warm-gray)]">
                  {checkedCount}<span className="text-[var(--warm-gray)]/40">/{totalCount}</span>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--warm-gray)] transition hover:bg-[var(--cream-dark)] hover:text-[var(--charcoal)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Body */}
        {!isAuthenticated ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <p className="text-sm font-medium text-[var(--warm-gray)]">
              Logga in för att skapa och spara din inköpslista.
            </p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Sync error */}
            {syncError && (
              <div className="mx-4 mt-3 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
                <p className="text-xs font-medium text-amber-700">{syncError}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {/* Portioner per dag */}
              <div className="mb-5 overflow-hidden rounded-2xl border border-[var(--cream-dark)] bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsPortionsExpanded((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--warm-gray)]">
                    Portioner per dag
                  </p>
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--warm-gray)] transition-transform duration-200 ${isPortionsExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {isPortionsExpanded && (
                  <div className="divide-y divide-[var(--cream-dark)] border-t border-[var(--cream-dark)]">
                    {PLAN_DAYS.map((day) => {
                      const mealName = plan[day];
                      if (!mealName) return null;
                      const current = localServingsByDay[day] ?? 4;
                      const isBlocked = localBlockedByDay[day] ?? false;
                      const disabled = pendingDay === day || loading || isBlocked;
                      return (
                        <div key={day} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--charcoal)]">{DAY_LABELS[day]}</p>
                            <p className="truncate text-xs text-[var(--warm-gray)]">{mealName}</p>
                            {isBlocked && (
                              <p className="text-[10px] font-semibold text-amber-600">Överhoppad dag</p>
                            )}
                          </div>
                          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--cream-dark)] bg-[var(--cream)] px-2 py-1.5">
                            <button
                              type="button"
                              disabled={disabled || current <= 1}
                              onClick={() => void handleUpdateDayServings(day, current - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--cream-dark)] text-xs font-bold text-[var(--charcoal)] transition hover:bg-white disabled:opacity-30"
                            >
                              −
                            </button>
                            <span className="min-w-[3.5rem] text-center text-xs font-semibold text-[var(--charcoal)]">
                              {current} pers
                            </span>
                            <button
                              type="button"
                              disabled={disabled || current >= 12}
                              onClick={() => void handleUpdateDayServings(day, current + 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--cream-dark)] text-xs font-bold text-[var(--charcoal)] transition hover:bg-white disabled:opacity-30"
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

              {/* Sort toggle */}
              <div className="mb-5 flex items-center gap-3">
                <div className="inline-flex rounded-full border border-[var(--cream-dark)] bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setSortMode("grouped")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      sortMode === "grouped"
                        ? "bg-[var(--terracotta)] text-white shadow-sm"
                        : "text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
                    }`}
                  >
                    Kategorier
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode("alpha")}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      sortMode === "alpha"
                        ? "bg-[var(--terracotta)] text-white shadow-sm"
                        : "text-[var(--warm-gray)] hover:text-[var(--charcoal)]"
                    }`}
                  >
                    A–Ö
                  </button>
                </div>
                {totalCount > 0 && checkedCount === totalCount && (
                  <p className="text-xs font-semibold text-[var(--terracotta)]">Allt klart! 🎉</p>
                )}
              </div>

              {/* List */}
              {loading && !localList ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--cream-dark)] bg-white px-5 py-5">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--warm-gray)]" />
                  <p className="text-sm text-[var(--warm-gray)]">Skapar inköpslista…</p>
                </div>
              ) : !localList || localList.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--cream-dark)] px-5 py-10 text-center">
                  <p className="text-sm font-medium text-[var(--warm-gray)]">Ingen lista ännu</p>
                  <p className="mt-1 text-xs text-[var(--warm-gray)]/60">Listan genereras automatiskt från veckans plan</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedItems.map((section) => (
                    <div key={section.title}>
                      {/* Category header */}
                      <div className="mb-2 flex items-center gap-3">
                        <p className="shrink-0 text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--terracotta)]">
                          {section.title}
                        </p>
                        <div className="h-px flex-1 bg-[var(--cream-dark)]" />
                      </div>

                      {/* Items */}
                      <div className="space-y-0.5">
                        {section.items.map((item) => {
                          const breakdownLines = extractBreakdownLines(item.sourceMealNames);
                          const amount = formatAmount(item.amount, item.unit);
                          return (
                            <div
                              key={item.id}
                              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white"
                            >
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={() => void handleToggle(item)}
                                disabled={pendingItem === item.id}
                                aria-label={item.isChecked ? "Markera som inte klar" : "Markera som klar"}
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                                  item.isChecked
                                    ? "border-[var(--terracotta)] bg-[var(--terracotta)] shadow-sm shadow-[var(--terracotta)]/20"
                                    : "border-[var(--cream-dark)] hover:border-[var(--terracotta)]"
                                }`}
                              >
                                {pendingItem === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin text-[var(--warm-gray)]" />
                                ) : item.isChecked ? (
                                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                                ) : null}
                              </button>

                              {/* Name */}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-medium transition-colors ${
                                    item.isChecked
                                      ? "text-[var(--warm-gray)] line-through decoration-[var(--warm-gray)]/40"
                                      : "text-[var(--charcoal)]"
                                  }`}
                                >
                                  {item.displayName}
                                </p>
                                {item.unresolved && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditFromUnresolved(item)}
                                    className="mt-0.5 text-[10px] font-semibold text-amber-600 transition hover:underline"
                                  >
                                    Kontrollera mängd/enhet
                                  </button>
                                )}
                              </div>

                              {/* Amount */}
                              {amount && (
                                <p
                                  className={`shrink-0 text-xs font-semibold transition-colors ${
                                    item.isChecked ? "text-[var(--warm-gray)]/40" : "text-[var(--warm-gray)]"
                                  }`}
                                >
                                  {amount}
                                </p>
                              )}

                              {/* Hover tooltip: breakdown per meal */}
                              {breakdownLines.length > 0 && (
                                <div className="pointer-events-none absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-[var(--cream-dark)] bg-white px-3 py-2.5 shadow-lg opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.3em] text-[var(--warm-gray)]">
                                    Från måltider
                                  </p>
                                  <ul className="space-y-0.5">
                                    {breakdownLines.map((line) => (
                                      <li key={line} className="text-xs text-[var(--charcoal)]">{line}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Meal chooser modal */}
      {chooserMealIds && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-[var(--cream-dark)] bg-[#FAF8F4] shadow-2xl">
            <div className="border-b border-[var(--cream-dark)] px-5 py-4">
              <p className="font-bold text-[var(--charcoal)]">Välj måltid</p>
              <p className="mt-0.5 text-xs text-[var(--warm-gray)]">Den här ingrediensen kommer från flera rätter.</p>
            </div>
            <div className="divide-y divide-[var(--cream-dark)] px-2 py-2">
              {chooserItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onRequestEditMeal?.(item.id);
                    setChooserMealIds(null);
                  }}
                  className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-[var(--charcoal)] transition hover:bg-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="border-t border-[var(--cream-dark)] px-4 py-3">
              <button
                type="button"
                onClick={() => setChooserMealIds(null)}
                className="w-full rounded-xl border border-[var(--cream-dark)] bg-white py-2.5 text-sm font-semibold text-[var(--warm-gray)] transition hover:text-[var(--charcoal)]"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
