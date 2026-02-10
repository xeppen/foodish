"use client";

import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";
import { ReactNode } from "react";

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  return <ClerkProviderBase>{children}</ClerkProviderBase>;
}
