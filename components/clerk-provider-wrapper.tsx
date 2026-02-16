"use client";

import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";
import { svSE } from "@clerk/localizations";
import { ReactNode } from "react";

export function ClerkProviderWrapper({ children }: { children: ReactNode }) {
  return <ClerkProviderBase localization={svSE}>{children}</ClerkProviderBase>;
}
