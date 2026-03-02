"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { ShoppingBasket, UtensilsCrossed } from "lucide-react";
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
  entries?: Array<{
    day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    servings: number | null;
    blocked: boolean;
  }>;
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
  locale: string;
  cuisine: string | null;
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
      sourceMealIds?: unknown;
      sourceMealNames?: unknown;
    }>;
  } | null;
};

const SWEDISH_MONTHS = [
  "jan", "feb", "mar", "apr", "maj", "jun",
  "jul", "aug", "sep", "okt", "nov", "dec",
];

function formatWeekRange(weekInfo: WeekInfo): string {
  const [, , mDayStr] = weekInfo.monday.split("-");
  const [fYearStr, fMonthStr, fDayStr] = weekInfo.friday.split("-");
  const mDay = parseInt(mDayStr, 10);
  const fDay = parseInt(fDayStr, 10);
  const fMonth = parseInt(fMonthStr, 10) - 1;
  const fYear = parseInt(fYearStr, 10);
  return `${mDay}–${fDay} ${SWEDISH_MONTHS[fMonth].toUpperCase()} ${fYear}`;
}

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
  const [requestedMealEditorId, setRequestedMealEditorId] = useState<string | null>(null);
  const [returnToShoppingAfterEdit, setReturnToShoppingAfterEdit] = useState(false);
  const { openSignIn } = useClerk();

  const commonImageByName = useMemo(
    () =>
      (commonMeals ?? []).reduce<Record<string, string>>((acc, meal) => {
        const key = meal.name.trim().toLowerCase();
        if (meal.imageUrl?.trim()) {
          acc[key] = meal.imageUrl.trim();
        }
        return acc;
      }, {}),
    [commonMeals],
  );

  const mealImageByName = useMemo(() => {
    return meals.reduce<Record<string, string>>((acc, meal) => {
      const key = meal.name.trim().toLowerCase();
      const preferredImage = meal.imageUrl?.trim() || commonImageByName[key] || null;
      acc[key] = resolveMealImageUrl(preferredImage, meal.name);
      return acc;
    }, {});
  }, [commonImageByName, meals]);

  const shoppingCount = shoppingList?.items.length ?? 0;

  const mealNameById = useMemo(
    () =>
      meals.reduce<Record<string, string>>((acc, meal) => {
        acc[meal.id] = meal.name;
        return acc;
      }, {}),
    [meals],
  );

  const promptLogin = useCallback(() => {
    setAuthPrompt("Logga in för att spara din plan");
    if (openSignIn) {
      void openSignIn({ redirectUrl: "/" });
    }
  }, [openSignIn]);

  function openManager() {
    setAuthPrompt(null);
    setIsDrawerOpen(true);
  }

  function handleRequestEditMealFromShopping(mealId: string) {
    setRequestedMealEditorId(mealId);
    setReturnToShoppingAfterEdit(true);
    setIsShoppingOpen(false);
    setIsDrawerOpen(true);
  }

  function handleMealEditorRequestConsumed() {
    setRequestedMealEditorId(null);
  }

  function handleMealSaved() {
    if (!returnToShoppingAfterEdit) return;
    setIsDrawerOpen(false);
    setIsShoppingOpen(true);
    setReturnToShoppingAfterEdit(false);
  }

  const weekRange = formatWeekRange(weekInfo);

  return (
    <div className="relative min-h-screen bg-black overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/hero-dinner.png"
          alt="Dinner table background"
          fill
          className="object-cover opacity-45"
          quality={100}
          priority
          sizes="100vw"
        />
        {/* Cinematic gradient: dark top, clear middle, dark bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-black/85" />
      </div>

      {/* Top navigation */}
      <header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between px-5 py-5 sm:px-8">
        {/* Wordmark */}
        <span className="select-none text-[10px] font-bold uppercase tracking-[0.45em] text-white/50">
          Foodish
        </span>

        {/* Meals button */}
        <button
          type="button"
          onClick={openManager}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/75 backdrop-blur-md transition-all duration-200 hover:bg-white/10 hover:text-white"
        >
          <UtensilsCrossed className="h-3.5 w-3.5" />
          Måltider
        </button>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex min-h-screen flex-col">
        {/* Hero title section */}
        <div className="flex-none px-5 pb-6 pt-24 text-center sm:pb-10 sm:pt-28">
          {/* Week range label */}
          <p
            className="animate-fade-up mb-5 text-[10px] font-semibold uppercase tracking-[0.5em] text-white/35"
            style={{ opacity: 0 }}
          >
            {weekRange}
          </p>

          {/* Display title */}
          <div className="animate-fade-up animate-fade-up-delay-1 space-y-0" style={{ opacity: 0 }}>
            <h1
              className="font-fraunces block text-[17vw] font-light leading-[0.85] text-white sm:text-[9rem] lg:text-[10rem]"
            >
              Veckans
            </h1>
            <p className="mt-2 text-[5vw] font-light uppercase tracking-[0.3em] text-white/55 sm:text-2xl lg:text-3xl">
              middagsplan
            </p>
          </div>

          {/* Thin rule */}
          <div
            className="animate-fade-up animate-fade-up-delay-2 mx-auto mt-7 h-px w-16 bg-white/15"
            style={{ opacity: 0 }}
          />

          {/* Auth notice */}
          {!isAuthenticated && (
            <div
              className="animate-fade-up animate-fade-up-delay-3 mt-6 inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/45 px-5 py-2.5 backdrop-blur-md"
              style={{ opacity: 0 }}
            >
              <p className="text-xs font-medium text-white/60">
                {authPrompt ?? "Logga in för att spara din plan"}
              </p>
              <LoginButton className="rounded-full bg-[var(--terracotta)] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[var(--terracotta-dark)]">
                Logga in
              </LoginButton>
            </div>
          )}

          {/* Plan notice */}
          {planNotice && isAuthenticated && (
            <div className="animate-fade-up animate-fade-up-delay-3 mt-5 inline-flex rounded-full border border-amber-400/25 bg-amber-500/10 px-5 py-2 backdrop-blur-md" style={{ opacity: 0 }}>
              <p className="text-xs font-medium text-amber-200/80">{planNotice}</p>
            </div>
          )}
        </div>

        {/* Plan cards */}
        <div className="flex-1 pb-28">
          <WeeklyPlanView
            plan={plan}
            isAuthenticated={isAuthenticated}
            onAuthRequired={promptLogin}
            mealImageByName={mealImageByName}
          />
        </div>
      </main>

      {/* Shopping list button */}
      <button
        type="button"
        onClick={() => setIsShoppingOpen((current) => !current)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-2xl shadow-black/50 backdrop-blur-md transition-all duration-200 hover:bg-black/70"
      >
        <ShoppingBasket className="h-4 w-4" />
        <span>Inköp</span>
        {shoppingCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--terracotta)] px-1.5 text-[10px] font-bold text-white">
            {shoppingCount}
          </span>
        )}
      </button>

      <ShoppingListDrawer
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        isAuthenticated={isAuthenticated}
        initialList={shoppingList ?? null}
        plan={plan}
        mealNameById={mealNameById}
        onRequestEditMeal={handleRequestEditMealFromShopping}
      />

      <MealDrawer
        isOpen={isDrawerOpen}
        isAuthenticated={isAuthenticated}
        meals={meals}
        starterMeals={commonMeals ?? []}
        commonMealImageByName={commonImageByName}
        onClose={() => setIsDrawerOpen(false)}
        onAuthRequired={promptLogin}
        openMealEditorForId={requestedMealEditorId}
        onMealEditorRequestConsumed={handleMealEditorRequestConsumed}
        onMealSaved={handleMealSaved}
      />
    </div>
  );
}
