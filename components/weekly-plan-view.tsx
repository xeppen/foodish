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
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
] as const;

export function WeeklyPlanView({
  plan,
  weekInfo,
}: {
  plan: WeeklyPlan;
  weekInfo: WeekInfo;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 bg-blue-50 border-b border-blue-100">
        <h2 className="text-xl font-semibold text-blue-900">Your Weekly Plan</h2>
        <p className="text-sm text-blue-700 mt-1">5 weekday dinners ready to go</p>
      </div>

      <div className="divide-y divide-gray-200">
        {DAYS.map(({ key, label }) => {
          const meal = plan[key];
          const date = weekInfo[key];

          return (
            <div key={key} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{label}</h3>
                    <span className="text-sm text-gray-500">{date}</span>
                  </div>
                  <p className="text-gray-900 mt-2 text-lg">{meal || "No meal"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          Your plan is automatically saved and will persist across sessions.
        </p>
      </div>
    </div>
  );
}
