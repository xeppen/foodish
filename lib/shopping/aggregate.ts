import { normalizeIngredientName, normalizeUnit } from "@/lib/shopping/normalize";

export type IngredientForAggregation = {
  mealId: string;
  mealName: string;
  name: string;
  canonicalName?: string | null;
  amount?: number | null;
  unit?: string | null;
};

export type AggregatedShoppingItem = {
  canonicalName: string;
  displayName: string;
  amount: number | null;
  unit: string | null;
  unresolved: boolean;
  sourceMealIds: string[];
  sourceMealNames: string[];
  sourceMealBreakdown: string[];
};

const MASS_TO_GRAMS: Record<string, number> = { g: 1, kg: 1000 };
const VOLUME_TO_ML: Record<string, number> = { ml: 1, l: 1000 };

function maybeConvert(amount: number, unit: string): { amount: number; unit: string } {
  if (unit in MASS_TO_GRAMS) {
    return { amount: amount * MASS_TO_GRAMS[unit], unit: "g" };
  }
  if (unit in VOLUME_TO_ML) {
    return { amount: amount * VOLUME_TO_ML[unit], unit: "ml" };
  }
  return { amount, unit };
}

function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function formatAmount(amount: number | null, unit: string | null): string {
  if (amount == null) {
    return "valfri mängd";
  }
  const normalized = amount % 1 === 0 ? amount.toFixed(0) : String(roundAmount(amount));
  return `${normalized}${unit ? ` ${unit}` : ""}`.trim();
}

export function aggregateShoppingIngredients(input: IngredientForAggregation[]): AggregatedShoppingItem[] {
  const bucket = new Map<string, AggregatedShoppingItem>();
  const invalidTokens = new Set(["null", "undefined", "none", "n/a", "na", "okänd", "unknown", "-"]);

  for (const row of input) {
    const canonical = normalizeIngredientName(row.canonicalName?.trim() || row.name);
    const display = row.name.trim();
    if (!display) {
      continue;
    }
    if (invalidTokens.has(display.toLowerCase()) || invalidTokens.has(canonical.toLowerCase())) {
      continue;
    }
    const normalizedUnit = normalizeUnit(row.unit);
    const hasNumericAmount = typeof row.amount === "number" && Number.isFinite(row.amount);

    let keyUnit = normalizedUnit;
    let keyAmount = row.amount ?? null;
    if (hasNumericAmount && normalizedUnit) {
      const converted = maybeConvert(row.amount as number, normalizedUnit);
      keyUnit = converted.unit;
      keyAmount = converted.amount;
    }

    const key = `${canonical}::${keyUnit ?? "none"}`;
    const existing = bucket.get(key);

    if (!existing) {
      bucket.set(key, {
        canonicalName: canonical,
        displayName: display,
        amount: hasNumericAmount ? (keyAmount as number) : null,
        unit: keyUnit,
        unresolved: !hasNumericAmount || !keyUnit,
        sourceMealIds: [row.mealId],
        sourceMealNames: [row.mealName],
        sourceMealBreakdown: [`${row.mealName}: ${formatAmount(hasNumericAmount ? (keyAmount as number) : null, keyUnit)}`],
      });
      continue;
    }

    if (!existing.sourceMealIds.includes(row.mealId)) {
      existing.sourceMealIds.push(row.mealId);
    }
    if (!existing.sourceMealNames.includes(row.mealName)) {
      existing.sourceMealNames.push(row.mealName);
    }
    const sourceLine = `${row.mealName}: ${formatAmount(hasNumericAmount ? (keyAmount as number) : null, keyUnit)}`;
    if (!existing.sourceMealBreakdown.includes(sourceLine)) {
      existing.sourceMealBreakdown.push(sourceLine);
    }

    if (hasNumericAmount && existing.amount !== null) {
      existing.amount = existing.amount + (keyAmount as number);
    } else {
      existing.unresolved = true;
    }
  }

  return Array.from(bucket.values())
    .map((item) => ({
      ...item,
      amount: typeof item.amount === "number" ? roundAmount(item.amount) : null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "sv"));
}
