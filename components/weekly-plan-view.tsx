"use client";

import { MealCard } from "./meal-card";

type WeeklyPlan = {
  id: string;
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
};

const DAYS = [
  { key: "monday", label: "Måndag" },
  { key: "tuesday", label: "Tisdag" },
  { key: "wednesday", label: "Onsdag" },
  { key: "thursday", label: "Torsdag" },
  { key: "friday", label: "Fredag" },
] as const;

export function WeeklyPlanView({
  plan,
  isAuthenticated,
  onAuthRequired,
  mealImageByName,
  mealMetaByName,
}: {
  plan: WeeklyPlan;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  mealImageByName?: Record<string, string>;
  mealMetaByName?: Record<
    string,
    {
      complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
      thumbsUpCount: number;
      thumbsDownCount: number;
    }
  >;
}) {
  const normalizeMealName = (value: string | null) => (value ?? "").trim().toLowerCase();

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-3 px-0 pb-2 sm:grid-cols-2 sm:gap-6 sm:px-0 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {DAYS.map(({ key, label }) => {
          const meal = plan[key];
          const normalized = normalizeMealName(meal);
          const imageSrc = mealImageByName?.[normalized];
          const meta = mealMetaByName?.[normalized];

          return (
            <div key={key} className="h-full">
              <MealCard
                day={key}
                dayLabel={label}
                mealName={meal}
                imageSrc={imageSrc}
                complexity={meta?.complexity ?? "MEDIUM"}
                thumbsUpCount={meta?.thumbsUpCount ?? 0}
                thumbsDownCount={meta?.thumbsDownCount ?? 0}
                isAuthenticated={isAuthenticated}
                onAuthRequired={onAuthRequired}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
