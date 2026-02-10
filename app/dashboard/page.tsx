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
                  className="px-4 py-2 rounded-lg font-semibold text-[var(--terracotta)] bg-[var(--terracotta)]/10"
                >
                  Dashboard
                </Link>
                <Link
                  href="/meals"
                  className="px-4 py-2 rounded-lg font-medium text-[var(--warm-gray)] hover:text-[var(--terracotta)] hover:bg-[var(--terracotta)]/5 transition-colors"
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
        <div className="mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-[var(--charcoal)]">
            Welcome back, <span className="text-[var(--terracotta)] italic">{user.name?.split(' ')[0] || user.name}</span>!
          </h1>
          <p className="text-lg text-[var(--warm-gray)]">Your weekly dinner planning dashboard</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/meals" className="block animate-scale-in delay-100 group">
            <div className="card p-8 relative overflow-hidden">
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--terracotta)]/10 to-transparent rounded-full -mr-16 -mt-16"></div>

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--terracotta)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-[var(--terracotta)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <span className="badge">{meals.length} meals</span>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--charcoal)]">My Meals</h2>
                <p className="text-[var(--warm-gray)] mb-6">
                  Manage your personal meal collection
                </p>
                <div className="flex items-center gap-2 text-[var(--terracotta)] font-semibold group-hover:gap-3 transition-all">
                  <span>View meals</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/plan" className="block animate-scale-in delay-200 group">
            <div className="card p-8 relative overflow-hidden">
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--sage)]/20 to-transparent rounded-full -mr-16 -mt-16"></div>

              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--sage)]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-[var(--olive)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  {currentPlan ? (
                    <span className="badge bg-[var(--sage-light)] text-[var(--olive)]">✓ Ready</span>
                  ) : (
                    <span className="badge bg-[var(--cream-dark)] text-[var(--warm-gray)]">Not started</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--charcoal)]">Weekly Plan</h2>
                <p className="text-[var(--warm-gray)] mb-6">
                  {currentPlan ? '5 meals planned for this week' : 'Generate your weekly dinner plan'}
                </p>
                <div className="flex items-center gap-2 text-[var(--olive)] font-semibold group-hover:gap-3 transition-all">
                  <span>{currentPlan ? 'View plan' : 'Create plan'}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick tips section */}
        <div className="card p-8 animate-fade-in-up delay-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--terracotta)]/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[var(--terracotta)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-[var(--charcoal)]">Getting Started</h3>
              <p className="text-[var(--warm-gray)] mb-3">
                {meals.length === 0
                  ? "Start by adding meals to your list. We've included 18 starter meals to get you going!"
                  : currentPlan
                  ? "Your week is planned! View your plan to see what's cooking, or swap any meal you're not feeling."
                  : "You're all set! Head to Weekly Plan to generate your personalized 5-day dinner schedule."}
              </p>
              {meals.length === 0 && (
                <Link href="/meals" className="inline-flex items-center gap-2 text-[var(--terracotta)] font-semibold hover:gap-3 transition-all">
                  Go to meals
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
