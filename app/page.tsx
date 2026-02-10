import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const sampleMeals = [
    { day: "Måndag", meal: "Taco Dinner", image: "/food-plate-1.png" },
    { day: "Tisdag", meal: "Pasta Carbonara", image: "/food-plate-2.png" },
    { day: "Onsdag", meal: "Grilled Salmon", image: "/food-plate-3.png" },
    { day: "Torsdag", meal: "Chicken Curry", image: "/food-plate-1.png" },
    { day: "Fredag", meal: "Pizza Night", image: "/food-plate-2.png" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Full-screen Hero Background */}
      <div className="absolute inset-0">
        <Image
          src="/hero-dinner.png"
          alt="Family dinner table"
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* Grey Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Gradient Overlay - darker at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />

      {/* Content Container */}
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-end px-4 py-8 sm:px-6 lg:px-8">
        {/* Frosted Bottom Overlay with Meal Cards */}
        <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:p-6 lg:p-8">
          {/* Header with Login Button */}
          <div className="mb-6 flex items-center justify-between">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-white/90">
              Preview Mode
            </span>
            <Link
              href="/auth/sign-in"
              className="rounded-full bg-white px-6 py-2 text-sm font-bold uppercase tracking-wide text-zinc-800 transition hover:bg-zinc-100"
            >
              Log In
            </Link>
          </div>

          {/* Title */}
          <h1 className="mb-8 text-center text-3xl font-bold uppercase tracking-wide text-white sm:text-4xl lg:text-5xl">
            Your Weekly Meal Planner
          </h1>

          {/* 5 Meal Cards - Swedish Weekdays */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {sampleMeals.map((item) => (
              <article
                key={item.day}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/95 p-3 shadow-lg backdrop-blur-sm"
              >
                {/* Meal Image */}
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-200">
                  <Image
                    src={item.image}
                    alt={item.meal}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Day and Meal Info */}
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                    {item.day}
                  </p>
                  <p className="mt-1 text-base font-semibold text-zinc-800">
                    {item.meal}
                  </p>
                </div>

                {/* Swap Button */}
                <button
                  type="button"
                  className="rounded-lg bg-[var(--sage)] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[var(--olive)]"
                >
                  Swap
                </button>
              </article>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="h-1 w-32 rounded-full bg-white/30" />
            <Link
              href="/auth/sign-in"
              className="rounded-full border border-white/30 bg-white/20 px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/30"
            >
              View Full Menu
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
