import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_EMAIL, listCommonMeals } from "@/lib/common-meals";
import { AdminCommonMealsPanel } from "@/components/admin-common-meals-panel";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    notFound();
  }

  const meals = await listCommonMeals();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <AdminCommonMealsPanel initialMeals={meals} />
    </main>
  );
}
