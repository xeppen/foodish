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
    <div className="min-h-screen texture-overlay">
      <nav className="sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-2xl font-bold text-[var(--charcoal)] hover:text-[var(--terracotta)] transition-colors">
                What&apos;s for <span className="italic text-[var(--terracotta)]">Dinner?</span>
              </Link>
              <div className="hidden md:flex gap-1">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg font-medium text-[var(--warm-gray)] hover:text-[var(--terracotta)] hover:bg-[var(--terracotta)]/5 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/meals"
                  className="px-4 py-2 rounded-lg font-semibold text-[var(--terracotta)] bg-[var(--terracotta)]/10"
                >
                  My Meals
                </Link>
                <Link
                  href="/plan"
                  className="px-4 py-2 rounded-lg font-medium text-[var(--warm-gray)] hover:text-[var(--terracotta)] hover:bg-[var(--terracotta)]/5 transition-colors"
                >
                  Weekly Plan
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-[var(--cream-dark)]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--terracotta)] to-[var(--terracotta-dark)] flex items-center justify-center text-white font-bold text-sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium text-[var(--charcoal)]">{user.name}</span>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--terracotta)]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--terracotta)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[var(--charcoal)]">My Meals</h1>
              <p className="text-[var(--warm-gray)] mt-1">
                Build your personal collection • <span className="font-semibold text-[var(--terracotta)]">{meals.length} meals</span>
              </p>
            </div>
          </div>
          <p className="text-[var(--warm-gray)] max-w-2xl">
            These meals will be used to generate your weekly plans. Add your favorites, and we'll help you decide what's for dinner.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 animate-scale-in delay-100">
            <div className="card p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--charcoal)]">Your Collection</h2>
                <span className="badge">{meals.length} total</span>
              </div>
              {meals.length === 0 ? (
                <EmptyState
                  title="No meals yet"
                  description="Add your first meal using the form on the right. We've included 18 starter meals to get you going!"
                />
              ) : (
                <MealList meals={meals} />
              )}
            </div>
          </div>

          <div className="animate-scale-in delay-200">
            <div className="card p-6 sticky top-28">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--sage)]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[var(--olive)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[var(--charcoal)]">Add New Meal</h2>
              </div>
              <AddMealForm />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
