import { MealCard } from "./meal-card";

type WeeklyPlan = {
  id: string;
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
};

type WeekInfo = {
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
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
  weekInfo,
}: {
  plan: WeeklyPlan;
  weekInfo: WeekInfo;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 text-white px-2"></div>

      {/* Responsive Grid/Scroll Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 pb-4">
        {DAYS.map(({ key, label }) => {
          const meal = plan[key];
          const date = weekInfo[key];

          return (
            <div key={key} className="h-full">
              <MealCard day={key} dateStr={date} mealName={meal} />
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
        <p className="text-sm text-[var(--cream)] font-medium">
          💡 Tips: Klicka på &quot;Byt&quot; för att direkt ersätta en rätt med ett annat
          slumpat alternativ från din lista.
        </p>
      </div>
    </div>
  );
}
