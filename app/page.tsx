import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen texture-overlay">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, var(--terracotta) 0%, transparent 70%)' }}></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, var(--sage) 0%, transparent 70%)' }}></div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-[var(--terracotta)]/20 mb-8 animate-fade-in-up">
            <svg className="w-4 h-4 text-[var(--terracotta)]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-semibold text-[var(--charcoal)]">Plan dinners in under 60 seconds</span>
          </div>

          {/* Hero heading */}
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-[var(--charcoal)] leading-[1.1] animate-fade-in-up delay-100">
            What&apos;s for <br />
            <span className="text-[var(--terracotta)] italic">Dinner?</span>
          </h1>

          <p className="text-xl md:text-2xl text-[var(--warm-gray)] mb-6 max-w-2xl mx-auto font-medium animate-fade-in-up delay-200">
            Stop overthinking meals. Get your personalized weekly dinner plan instantly.
          </p>

          <p className="text-base md:text-lg text-[var(--warm-gray)]/80 mb-10 max-w-xl mx-auto animate-fade-in-up delay-300">
            Maintain your meal list, auto-generate plans, and swap dinners with one click. No more decision fatigue.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-400">
            <Link href="/auth/sign-in" className="btn-primary inline-flex items-center gap-2 group">
              Get Started Free
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <span className="text-sm text-[var(--warm-gray)]">No credit card required</span>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-3xl mx-auto">
            <div className="card p-6 text-left animate-scale-in delay-200">
              <div className="w-12 h-12 rounded-xl bg-[var(--terracotta)]/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--terracotta)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Build Your List</h3>
              <p className="text-[var(--warm-gray)] text-sm">Start with 18 pre-filled meals or add your own favorites</p>
            </div>

            <div className="card p-6 text-left animate-scale-in delay-300">
              <div className="w-12 h-12 rounded-xl bg-[var(--sage)]/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--olive)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Auto-Generate</h3>
              <p className="text-[var(--warm-gray)] text-sm">Get a 5-day plan instantly, avoiding recent meals</p>
            </div>

            <div className="card p-6 text-left animate-scale-in delay-400">
              <div className="w-12 h-12 rounded-xl bg-[var(--terracotta)]/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--terracotta)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Easy Swaps</h3>
              <p className="text-[var(--warm-gray)] text-sm">Not feeling Monday's meal? Swap it with one click</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
