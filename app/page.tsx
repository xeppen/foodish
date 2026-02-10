import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const previewMeals = [
    { day: "Monday", meal: "Taco Dinner" },
    { day: "Tuesday", meal: "Roast Chicken" },
    { day: "Wednesday", meal: "Pasta Night" },
    { day: "Thursday", meal: "Tomato Soup" },
    { day: "Friday", meal: "Homemade Pizza" },
    { day: "Saturday", meal: "Pancakes" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/hero-dinner.png"
          alt="Family dinner table"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="absolute inset-0 bg-zinc-700/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-800/35 via-zinc-900/45 to-zinc-900/70" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-end px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/15 bg-zinc-500/35 p-4 shadow-2xl backdrop-blur-md sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-center gap-3 sm:justify-end">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
              Preview mode
            </span>
            <Link
              href="/auth/sign-in"
              className="rounded-full bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-800 transition hover:bg-zinc-100"
            >
              Log in
            </Link>
          </div>

          <h1 className="mb-7 text-center text-3xl font-semibold uppercase tracking-[0.08em] text-white sm:text-4xl lg:text-5xl">
            Your Weekly Meal Planner
          </h1>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {previewMeals.map((item) => (
              <article
                key={item.day}
                className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white/90 px-3 py-3 shadow-md"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                  <Image
                    src="/hero-dinner.png"
                    alt={`${item.meal} preview`}
                    fill
                    className="object-cover object-center"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-zinc-600">
                    {item.day}
                  </p>
                  <p className="truncate text-lg font-semibold text-zinc-800">
                    {item.meal}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-lime-300 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-zinc-700"
                >
                  Swap
                </button>
              </article>
            ))}
          </div>

          <div className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="h-1.5 w-40 rounded-full bg-white/50" />
            <Link
              href="/auth/sign-in"
              className="rounded-full border border-white/30 bg-white/20 px-6 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-white/30"
            >
              View Full Menu
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
