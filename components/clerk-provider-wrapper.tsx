"use client";

import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";
import { ReactNode } from "react";

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  // @ts-expect-error - Clerk v6 type issue with async components
  return <ClerkProviderBase>{children}</ClerkProviderBase>;
}
