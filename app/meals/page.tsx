import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMeals, initializeStarterMeals } from "@/lib/actions/meals";
import { SignOutButton } from "@/components/sign-out-button";
import { AddMealForm } from "@/components/add-meal-form";
import { MealList } from "@/components/meal-list";
import { EmptyState } from "@/components/empty-state";
import Link from "next/link";
import Image from "next/image";

export default async function MealsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  // Initialize starter meals if first time
  await initializeStarterMeals();

  const meals = await getMeals();

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
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60" />
      </div>

      <nav className="relative z-50 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-8">
              <Link
                href="/dashboard"
                className="text-2xl font-bold text-white hover:text-[var(--terracotta-light)] transition-colors drop-shadow-md"
              >
                Vad blir det till{" "}
                <span className="italic text-[var(--terracotta)]">middag?</span>
              </Link>
              <div className="hidden md:flex gap-1">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-lg font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Översikt
                </Link>
                <Link
                  href="/meals"
                  className="px-4 py-2 rounded-lg font-bold text-white bg-white/20 backdrop-blur-md border border-white/10 shadow-lg"
                >
                  Mina måltider
                </Link>
                <Link
                  href="/plan"
                  className="px-4 py-2 rounded-lg font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Veckoplan
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
        <div className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--terracotta)]/20 flex items-center justify-center text-white">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                Mina måltider
              </h1>
              <p className="text-white/80 mt-1">
                Bygg din personliga samling •{" "}
                <span className="font-semibold text-[var(--terracotta-light)]">
                  {meals.length} måltider
                </span>
              </p>
            </div>
          </div>
          <p className="text-white/70 max-w-2xl">
            Dessa rätter används för att skapa dina veckoplaner. Lägg till dina
            favoriter så hjälper vi dig att bestämma vad ni ska äta.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 animate-scale-in delay-100">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[var(--charcoal)]">
                  Din samling
                </h2>
                <span className="badge">{meals.length} totalt</span>
              </div>
              {meals.length === 0 ? (
                <EmptyState
                  title="Inga måltider ännu"
                  description="Lägg till din första rätt med formuläret till höger. Vi har lagt in 18 förslag för att få igång dig!"
                />
              ) : (
                <MealList meals={meals} />
              )}
            </div>
          </div>

          <div className="animate-scale-in delay-200">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl sticky top-28 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[var(--sage)]/20 flex items-center justify-center text-white">
                  <svg
                    className="w-5 h-5 text-[var(--sage-light)]"
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
                <h2 className="text-xl font-bold text-white">Lägg till ny rätt</h2>
              </div>
              <div className="bg-white/5 rounded-2xl p-2">
                <div className="bg-white rounded-xl p-4 shadow-inner">
                  <AddMealForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
