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
}: {
  plan: WeeklyPlan;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  mealImageByName?: Record<string, string>;
}) {
  const normalizeMealName = (value: string | null) => (value ?? "").trim().toLowerCase();

  return (
    <div className="w-full md:mx-auto md:max-w-6xl">
      <div className="flex snap-y snap-mandatory flex-col gap-3 px-0 pb-4 md:snap-none md:flex-row md:flex-wrap md:justify-center md:gap-8 md:pb-8">
        {DAYS.map(({ key, label }) => {
          const meal = plan[key];

          return (
            <div key={key} className="h-full w-full md:w-auto">
              <MealCard
                day={key}
                dayLabel={label}
                mealName={meal}
                mealImageByName={mealImageByName}
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
