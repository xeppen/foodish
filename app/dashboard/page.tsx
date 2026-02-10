import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getMeals } from "@/lib/actions/meals";
import { getCurrentWeekPlan } from "@/lib/actions/plans";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const meals = await getMeals();
  const currentPlan = await getCurrentWeekPlan();

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
                  className="text-blue-600 font-medium"
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
                  className="text-gray-600 hover:text-gray-900"
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}!</h1>
          <p className="text-gray-600">Your weekly dinner planning tool is ready.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/meals" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">My Meals</h2>
              <p className="text-gray-600 mb-4">
                Manage your personal meal list
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">{meals.length}</span>
                <span className="text-sm text-gray-500">meals in your list</span>
              </div>
            </div>
          </Link>

          <Link href="/plan" className="block">
            <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold mb-2">Weekly Plan</h2>
              <p className="text-gray-600 mb-4">
                Auto-generated weekly dinner plan
              </p>
              <div className="flex items-center justify-between">
                {currentPlan ? (
                  <>
                    <span className="text-green-600 font-medium">Plan ready</span>
                    <span className="text-sm text-gray-500">5 meals planned</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500 font-medium">No plan yet</span>
                    <span className="text-sm text-gray-500">Click to generate</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
