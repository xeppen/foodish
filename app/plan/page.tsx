import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentWeekPlan, getWeekInfo } from "@/lib/actions/plans";
import { SignOutButton } from "@/components/sign-out-button";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { WeeklyPlanView } from "@/components/weekly-plan-view";
import Link from "next/link";
import Image from "next/image";

export default async function PlanPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const plan = await getCurrentWeekPlan();
  const weekInfo = await getWeekInfo();

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-black">
      {/* Hero Background - Shared with Landing */}
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

      {/* Nav - Transparent Glass */}
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
                  className="px-4 py-2 rounded-lg font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
                  className="px-4 py-2 rounded-lg font-bold text-white bg-white/20 backdrop-blur-md border border-white/10 shadow-lg"
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

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-start pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl">
          {/* Header */}
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white drop-shadow-lg">
              Weekly Dinner Plan
            </h1>
            <p className="text-lg text-white/80 font-medium drop-shadow-md">
              Week of {weekInfo.weekStart} to {weekInfo.weekEnd}
            </p>
          </div>

          {!plan ? (
            <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-12 text-center shadow-2xl animate-fade-in-up">
              <div className="w-20 h-20 bg-[var(--terracotta)]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-[var(--terracotta-light)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4 text-white">
                Let&apos;s plan your week
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-lg mx-auto">
                Generate your personalized 5-day dinner schedule instantly.
                We&apos;ll pick meals you haven&apos;t had recently.
              </p>
              <div className="flex justify-center">
                <GeneratePlanButton />
              </div>
            </div>
          ) : (
            <div className="animate-fade-in-up delay-100">
              <WeeklyPlanView plan={plan} weekInfo={weekInfo} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
