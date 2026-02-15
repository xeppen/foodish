import { SingleViewShell } from "@/components/single-view-shell";
import { getCurrentUser } from "@/lib/auth";
import { getDemoWeeklyPlan } from "@/lib/demo-plan";
import { getMeals } from "@/lib/actions/meals";
import { generateWeeklyPlan, getCurrentWeekPlan, getWeekInfo } from "@/lib/actions/plans";
import { getCurrentWeekShoppingList } from "@/lib/actions/shopping-list";
import { listCommonMeals } from "@/lib/common-meals";

export default async function HomePage() {
  const user = await getCurrentUser();
  const weekInfo = await getWeekInfo();
  const demoPlan = await getDemoWeeklyPlan(weekInfo.weekStart);
  const commonMeals = await listCommonMeals();
  let planNotice: string | undefined;

  if (!user) {
    return (
      <SingleViewShell
        plan={demoPlan}
        weekInfo={weekInfo}
        isAuthenticated={false}
        commonMeals={commonMeals}
        meals={commonMeals.map((meal) => ({
          id: `common-${meal.id}`,
          name: meal.name,
          complexity: meal.complexity,
          preferredDays: [],
          thumbsUpCount: 0,
          thumbsDownCount: 0,
          imageUrl: meal.imageUrl,
          createdAt: meal.createdAt,
        }))}
      />
    );
  }

  const meals = await getMeals();
  const shoppingList = await getCurrentWeekShoppingList();
  const forceRegenerateOnLoad =
    process.env.FORCE_REGENERATE_WEEKLY_PLAN_ON_LOAD === "1" ||
    process.env.FORCE_REGENERATE_WEEKLY_PLAN_ON_LOAD === "true" ||
    process.env.NODE_ENV !== "production";

  let plan = forceRegenerateOnLoad ? null : await getCurrentWeekPlan();
  if (!plan || forceRegenerateOnLoad) {
    const result = await generateWeeklyPlan({ force: true, revalidate: false });
    if (result.success && result.plan) {
      plan = result.plan;
      planNotice = result.warning;
    }
  }

  return (
    <SingleViewShell
      plan={plan ?? demoPlan}
      weekInfo={weekInfo}
      isAuthenticated={true}
      commonMeals={commonMeals}
      meals={meals}
      planNotice={planNotice}
      shoppingList={shoppingList}
    />
  );
}
