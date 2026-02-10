import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">What&apos;s for Dinner?</h1>
          <p className="text-gray-600 mb-8">
            Weekly dinner planning in under 60 seconds
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-md",
            },
          }}
        />
      </div>
    </div>
  );
}
