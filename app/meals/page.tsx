import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMeals, initializeStarterMeals } from "@/lib/actions/meals";
import { SignOutButton } from "@/components/sign-out-button";
import { AddMealForm } from "@/components/add-meal-form";
import { MealList } from "@/components/meal-list";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";

export default async function MealsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Initialize starter meals if first time
  await initializeStarterMeals();

  const meals = await getMeals();

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
                  className="text-blue-600 font-medium"
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
          <h1 className="text-3xl font-bold mb-2">My Meals</h1>
          <p className="text-gray-600">
            Manage your personal meal list. These meals will be used to generate your weekly plans.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Your Meals ({meals.length})</h2>
              {meals.length === 0 ? (
                <EmptyState
                  title="No meals yet"
                  description="Add your first meal using the form on the right. We've pre-filled some common meals to get you started!"
                />
              ) : (
                <MealList meals={meals} />
              )}
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Add New Meal</h2>
              <AddMealForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
