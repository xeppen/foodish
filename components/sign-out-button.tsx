"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useClerk();
  const router = useRouter();

  return (
    <button
      onClick={() => signOut(() => router.push("/"))}
      className={className ?? "btn-secondary text-sm"}
    >
      <span className="inline-flex items-center gap-2">
        <LogOut className="h-4 w-4" />
        Logga ut
      </span>
    </button>
  );
}
