"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { List } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { WeeklyPlanView } from "@/components/weekly-plan-view";
import { MealDrawer } from "@/components/meal-drawer";
import { LoginButton } from "@/components/login-button";

type WeeklyPlan = {
  id: string;
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
};

type WeekInfo = {
  weekStart: string;
  weekEnd: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
};

type Meal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  thumbsUpCount: number;
  thumbsDownCount: number;
  imageUrl: string | null;
  createdAt: Date | string;
};

type SingleViewShellProps = {
  plan: WeeklyPlan;
  weekInfo: WeekInfo;
  isAuthenticated: boolean;
  meals: Meal[];
  planNotice?: string;
};

export function SingleViewShell({
  plan,
  weekInfo,
  isAuthenticated,
  meals,
  planNotice,
}: SingleViewShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const { openSignIn } = useClerk();

  const promptLogin = useCallback(() => {
    setAuthPrompt("Login to curate your own meals");
    if (openSignIn) {
      void openSignIn({ redirectUrl: "/" });
    }
  }, [openSignIn]);

  function openManager() {
    setAuthPrompt(null);
    setIsDrawerOpen(true);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <div className="fixed inset-0 z-0">
        <Image
          src="/hero-dinner.png"
          alt="Dinner table background"
          fill
          className="object-cover opacity-60"
          quality={100}
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60" />
      </div>

      <header className="relative z-20 px-4 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-end">
          <button
            type="button"
            onClick={openManager}
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/40 px-3 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/55"
          >
            <List className="h-4 w-4" />
            <span>Måltider</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <section className="w-full rounded-3xl border border-white/20 bg-black/35 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="text-4xl font-bold text-white drop-shadow-md sm:text-5xl">
              Veckans middagsplan
            </h2>
          </div>

          {!isAuthenticated && (
            <div className="mx-auto mb-6 flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-[var(--terracotta)]/40 bg-black/45 px-4 py-3 text-center backdrop-blur-md sm:flex-row sm:justify-center sm:text-left">
              <p className="text-sm font-semibold text-white">
                {authPrompt ?? "Login to Save your weekly plan and votes"}
              </p>
              <LoginButton className="rounded-lg bg-[var(--terracotta)] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[var(--terracotta-dark)]">
                Logga in
              </LoginButton>
            </div>
          )}

          {planNotice && isAuthenticated && (
            <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-center backdrop-blur-md">
              <p className="text-sm font-medium text-amber-100">{planNotice}</p>
            </div>
          )}

          <WeeklyPlanView
            plan={plan}
            isAuthenticated={isAuthenticated}
            onAuthRequired={promptLogin}
          />
        </section>
      </main>

      <MealDrawer
        isOpen={isDrawerOpen}
        isAuthenticated={isAuthenticated}
        meals={meals}
        onClose={() => setIsDrawerOpen(false)}
        onAuthRequired={promptLogin}
      />
    </div>
  );
}
