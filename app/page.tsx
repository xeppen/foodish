import Image from "next/image";
import { LoginButton } from "@/components/login-button";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? null;
  const sampleMeals = [
    { day: "Måndag", meal: "Tacomiddag", image: "/food-plate-1.png" },
    { day: "Tisdag", meal: "Pasta carbonara", image: "/food-plate-2.png" },
    { day: "Onsdag", meal: "Grillad lax", image: "/food-plate-3.png" },
    { day: "Torsdag", meal: "Kycklingcurry", image: "/food-plate-1.png" },
    { day: "Fredag", meal: "Pizzakväll", image: "/food-plate-2.png" },
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
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Grey Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Gradient Overlay - darker at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />

      {/* Content Container */}
      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
        {/* Frosted Bottom Overlay with Meal Cards */}
        <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:p-6 lg:p-8">
          {/* Header with Login Button */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wider text-white/90">
              {user
                ? `Välkommen tillbaka${firstName ? `, ${firstName}` : ""}`
                : "Förhandsläge"}
            </span>
            <LoginButton className="rounded-full bg-white px-6 py-2 text-center text-sm font-bold uppercase tracking-wide text-zinc-800 transition hover:bg-zinc-100">
              {user ? "Öppna översikten" : "Logga in"}
            </LoginButton>
          </div>

          {/* Title */}
          <h1 className="mb-4 text-center text-3xl font-bold uppercase tracking-wide text-white sm:text-4xl lg:text-5xl">
            Din veckoplan för middagar
          </h1>
          {user ? (
            <p className="mb-8 text-center text-base font-medium text-white/80">
              Du är inloggad – gå till översikten för att fortsätta planera middagar.
            </p>
          ) : (
            <p className="mb-8 text-center text-base font-medium text-white/80">
              Logga in för att spara din plan och låsa upp automatiska middagstips.
            </p>
          )}

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
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
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
                  Byt
                </button>
              </article>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="h-1 w-32 rounded-full bg-white/30" />
            <LoginButton className="rounded-full border border-white/30 bg-white/20 px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-white/30">
              {user ? "Gå till översikten" : "Visa hela menyn"}
            </LoginButton>
          </div>
        </div>
      </section>
    </main>
  );
}
