import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { getMeals } from "@/lib/actions/meals";
import { getCurrentWeekPlan } from "@/lib/actions/plans";
import Link from "next/link";
import Image from "next/image";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const meals = await getMeals();
  const currentPlan = await getCurrentWeekPlan();

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-black">
      {/* Hero Background - Shared */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/hero-dinner.png"
          alt="Background"
          fill
          className="object-cover opacity-60"
          quality={100}
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60" />
      </div>

      {/* Nav */}
      <nav className="relative z-50 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-8">
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-white hover:text-[var(--terracotta-light)] transition-colors drop-shadow-md"
              >
                What&apos;s for{" "}
                <span className="italic text-[var(--terracotta)]">Dinner?</span>
              </Link>
              <div className="hidden md:flex gap-1">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg font-bold text-white bg-white/20 backdrop-blur-md border border-white/10 shadow-lg"
                >
                  Dashboard
                </Link>
                <Link
                  href="/meals"
                  className="px-4 py-2 rounded-lg font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  My Meals
                </Link>
                <Link
                  href="/plan"
                  className="px-4 py-2 rounded-lg font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Weekly Plan
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white">
                <div className="w-8 h-8 rounded-full bg-[var(--terracotta)] flex items-center justify-center font-bold text-sm">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-sm font-medium">{user.name}</span>
              </div>
              <div className="text-white/80 hover:text-white">
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="mb-12 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white drop-shadow-lg">
            Welcome back,{" "}
            <span className="text-[var(--terracotta)] italic">
              {user.name?.split(" ")[0] || user.name}
            </span>
            !
          </h1>
          <p className="text-lg text-white/80 drop-shadow-md">
            Your weekly dinner planning dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Link
            href="/meals"
            className="block animate-scale-in delay-100 group"
          >
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:bg-white/20 hover:scale-[1.02] hover:shadow-2xl group-hover:border-[var(--terracotta)]/50">
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--terracotta)]/20 rounded-full -mr-16 -mt-16 blur-xl"></div>

              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--terracotta)]/20 flex items-center justify-center group-hover:scale-110 transition-transform text-white">
                    <svg
                      className="w-8 h-8 text-[var(--terracotta-light)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-black/40 text-white/90 text-sm font-medium border border-white/10">
                    {meals.length} meals
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">My Meals</h2>
                <p className="text-white/70 mb-6">
                  Manage your personal meal collection
                </p>
                <div className="flex items-center gap-2 text-[var(--terracotta-light)] font-semibold group-hover:gap-3 transition-all">
                  <span>View meals</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/plan" className="block animate-scale-in delay-200 group">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl relative overflow-hidden transition-all duration-300 hover:bg-white/20 hover:scale-[1.02] hover:shadow-2xl group-hover:border-[var(--sage)]/50">
              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--sage)]/20 rounded-full -mr-16 -mt-16 blur-xl"></div>

              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-[var(--sage)]/20 flex items-center justify-center group-hover:scale-110 transition-transform text-white">
                    <svg
                      className="w-8 h-8 text-[var(--sage-light)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  {currentPlan ? (
                    <span className="px-3 py-1 rounded-full bg-[var(--sage)]/30 text-[var(--sage-light)] text-sm font-medium border border-[var(--sage)]/20">
                      ✓ Ready
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white/60 text-sm font-medium border border-white/5">
                      Not started
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">
                  Weekly Plan
                </h2>
                <p className="text-white/70 mb-6">
                  {currentPlan
                    ? "5 meals planned for this week"
                    : "Generate your weekly dinner plan"}
                </p>
                <div className="flex items-center gap-2 text-[var(--sage-light)] font-semibold group-hover:gap-3 transition-all">
                  <span>{currentPlan ? "View plan" : "Create plan"}</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick tips section */}
        <div className="bg-black/30 backdrop-blur-md border border-white/10 p-8 rounded-3xl animate-fade-in-up delay-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--terracotta)]/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-[var(--terracotta-light)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2 text-white">
                Getting Started
              </h3>
              <p className="text-white/70 mb-3">
                {meals.length === 0
                  ? "Start by adding meals to your list. We've included 18 starter meals to get you going!"
                  : currentPlan
                    ? "Your week is planned! View your plan to see what's cooking, or swap any meal you're not feeling."
                    : "You're all set! Head to Weekly Plan to generate your personalized 5-day dinner schedule."}
              </p>
              {meals.length === 0 && (
                <Link
                  href="/meals"
                  className="inline-flex items-center gap-2 text-[var(--terracotta-light)] font-semibold hover:gap-3 transition-all"
                >
                  Go to meals
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
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
