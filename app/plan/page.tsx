import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentWeekPlan, getWeekInfo } from "@/lib/actions/plans";
import { SignOutButton } from "@/components/sign-out-button";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { WeeklyPlanView } from "@/components/weekly-plan-view";
import Link from "next/link";

export default async function PlanPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const plan = await getCurrentWeekPlan();
  const weekInfo = await getWeekInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold">
                What&apos;s for Dinner?
              </Link>
              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/meals"
                  className="text-gray-600 hover:text-gray-900"
                >
                  My Meals
                </Link>
                <Link
                  href="/plan"
                  className="text-blue-600 font-medium"
                >
                  Weekly Plan
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.name}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Weekly Dinner Plan</h1>
          <p className="text-gray-600">
            Week of {weekInfo.weekStart} to {weekInfo.weekEnd}
          </p>
        </div>

        {!plan ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-xl font-semibold mb-4">No plan for this week yet</h2>
            <p className="text-gray-600 mb-6">
              Generate your weekly dinner plan with one click. We&apos;ll automatically select 5 meals from your list.
            </p>
            <GeneratePlanButton />
          </div>
        ) : (
          <WeeklyPlanView plan={plan} weekInfo={weekInfo} />
        )}
      </main>
    </div>
  );
}
