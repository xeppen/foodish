"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

type LoginButtonProps = {
  children: ReactNode;
  className?: string;
  redirectUrl?: string;
};

export function LoginButton({
  children,
  className = "",
  redirectUrl = "/",
}: LoginButtonProps) {
  const { openSignIn } = useClerk();
  const { isSignedIn } = useUser();
  const router = useRouter();

  function handleClick() {
    if (isSignedIn) {
      router.push(redirectUrl);
      return;
    }

    // Prefer Clerk's modal; fall back to the dedicated sign-in route if unavailable.
    if (openSignIn) {
      void openSignIn({ redirectUrl });
      return;
    }

    if (typeof window !== "undefined") {
      window.location.href = "/auth/sign-in";
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
