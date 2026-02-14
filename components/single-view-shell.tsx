"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { List, ShoppingBasket } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { WeeklyPlanView } from "@/components/weekly-plan-view";
import { MealDrawer } from "@/components/meal-drawer";
import { LoginButton } from "@/components/login-button";
import { resolveMealImageUrl } from "@/lib/meal-image-url";
import { ShoppingListDrawer } from "@/components/shopping-list-drawer";

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
  preferredDays: ("MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY")[];
  thumbsUpCount: number;
  thumbsDownCount: number;
  imageUrl: string | null;
  ingredients?: unknown;
  mealIngredients?: Array<{
    name: string;
    amount: number | null;
    unit: string | null;
    note: string | null;
    optional: boolean;
    confidence: number | null;
    needsReview: boolean;
  }>;
  createdAt: Date | string;
};

type CommonMeal = {
  id: string;
  name: string;
  complexity: "SIMPLE" | "MEDIUM" | "COMPLEX";
  imageUrl: string | null;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type SingleViewShellProps = {
  plan: WeeklyPlan;
  weekInfo: WeekInfo;
  isAuthenticated: boolean;
  meals: Meal[];
  commonMeals?: CommonMeal[];
  planNotice?: string;
  shoppingList?: {
    id: string;
    items: Array<{
      id: string;
      displayName: string;
      amount: number | null;
      unit: string | null;
      isChecked: boolean;
      unresolved: boolean;
    }>;
  } | null;
};

export function SingleViewShell({
  plan,
  weekInfo,
  isAuthenticated,
  meals,
  commonMeals,
  planNotice,
  shoppingList,
}: SingleViewShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);
  const { openSignIn } = useClerk();
  const mealImageByName = useMemo(() => {
    const commonImageByName = (commonMeals ?? []).reduce<Record<string, string>>((acc, meal) => {
      const key = meal.name.trim().toLowerCase();
      if (meal.imageUrl?.trim()) {
        acc[key] = meal.imageUrl.trim();
      }
      return acc;
    }, {});

    return meals.reduce<Record<string, string>>((acc, meal) => {
      const key = meal.name.trim().toLowerCase();
      const preferredImage = meal.imageUrl?.trim() || commonImageByName[key] || null;
      acc[key] = resolveMealImageUrl(preferredImage, meal.name);
      return acc;
    }, {});
  }, [commonMeals, meals]);
  const shoppingCount = shoppingList?.items.length ?? 0;

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
    <div className="relative min-h-screen overflow-hidden bg-black md:h-screen md:overflow-hidden">
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
            className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/40 px-3 py-2 text-sm font-semibold text-white backdrop-blur-md hover:bg-black/55 md:fixed md:right-6 md:top-6 md:z-30"
          >
            <List className="h-4 w-4" />
            <span>Måltider</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-start px-0 pb-10 pt-12 sm:px-6 lg:px-8 md:h-[calc(100vh-96px)] md:min-h-0 md:overflow-hidden">
        <section className="w-full">
          <div className="mb-6 px-4 text-center sm:mb-10 sm:px-0">
            <h1 className="text-5xl font-bold text-white drop-shadow-lg sm:text-6xl">Veckans middagsplan</h1>
          </div>

          {!isAuthenticated && (
            <div className="mx-4 mb-6 flex flex-col items-center gap-3 rounded-2xl border border-[var(--terracotta)]/40 bg-black/45 px-4 py-3 text-center backdrop-blur-md sm:mx-auto sm:max-w-xl sm:flex-row sm:justify-center sm:text-left">
              <p className="text-sm font-semibold text-white">
                {authPrompt ?? "Login to Save"}
              </p>
              <LoginButton className="rounded-lg bg-[var(--terracotta)] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-[var(--terracotta-dark)]">
                Logga in
              </LoginButton>
            </div>
          )}

          {planNotice && isAuthenticated && (
            <div className="mx-4 mb-6 rounded-2xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-center backdrop-blur-md sm:mx-auto sm:max-w-3xl">
              <p className="text-sm font-medium text-amber-100">{planNotice}</p>
            </div>
          )}

          <WeeklyPlanView
            plan={plan}
            isAuthenticated={isAuthenticated}
            onAuthRequired={promptLogin}
            mealImageByName={mealImageByName}
          />
        </section>
      </main>

      <button
        type="button"
        onClick={() => setIsShoppingOpen((current) => !current)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-3 text-sm font-semibold text-white shadow-xl backdrop-blur-md hover:bg-black/70 md:bottom-6 md:right-6"
      >
        <ShoppingBasket className="h-4 w-4" />
        <span>Inköp</span>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--terracotta)] px-1.5 text-[11px] font-bold text-white">
          {shoppingCount}
        </span>
      </button>
      <ShoppingListDrawer
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        isAuthenticated={isAuthenticated}
        initialList={shoppingList ?? null}
      />

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
