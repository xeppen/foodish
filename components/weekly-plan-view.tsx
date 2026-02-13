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
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between px-0 text-white"></div>

      {/* Responsive Grid/Scroll Container */}
      <div className="grid grid-cols-1 gap-3 px-0 pb-4 sm:grid-cols-2 sm:gap-6 sm:px-4 lg:grid-cols-3 lg:px-0 xl:grid-cols-4 2xl:grid-cols-5">
        {DAYS.map(({ key, label }) => {
          const meal = plan[key];
          const imageSrc = mealImageByName?.[normalizeMealName(meal)];

          return (
            <div key={key} className="h-full">
              <MealCard
                day={key}
                dayLabel={label}
                mealName={meal}
                imageSrc={imageSrc}
                isAuthenticated={isAuthenticated}
                onAuthRequired={onAuthRequired}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
        <p className="text-sm text-[var(--cream)] font-medium">
          {isAuthenticated
            ? "Tips: Klicka på \"Byt\" för att ersätta en rätt direkt från din lista."
            : "Demo-lage: Klicka på \"Byt\" eller \"Logga in\" for att kurera dina egna maltider."}
        </p>
      </div>
    </div>
  );
}
