"use client";

type Complexity = "SIMPLE" | "MEDIUM" | "COMPLEX";

const COMPLEXITY_STYLES: Record<Complexity, string> = {
  SIMPLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLEX: "bg-orange-50 text-orange-700 border-orange-200",
};

const COMPLEXITY_LABELS: Record<Complexity, string> = {
  SIMPLE: "Enkel",
  MEDIUM: "Medium",
  COMPLEX: "Avancerad",
};

export function ComplexityBadge({ complexity }: { complexity: Complexity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${COMPLEXITY_STYLES[complexity]}`}
    >
      {COMPLEXITY_LABELS[complexity]}
    </span>
  );
}
