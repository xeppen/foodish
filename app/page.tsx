import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-5xl font-bold mb-6">What&apos;s for Dinner?</h1>
        <p className="text-xl text-gray-600 mb-8">
          Weekly dinner planning in under 60 seconds
        </p>
        <p className="text-gray-500 mb-8">
          Stop overthinking dinner. Maintain your personal meal list, get auto-generated weekly plans, and swap meals with one click.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md font-medium transition-colors"
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}
