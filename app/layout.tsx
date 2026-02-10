import type { Metadata } from "next";
import "./globals.css";
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";

export const metadata: Metadata = {
  title: "What's for Dinner?",
  description: "Weekly dinner planning in under 60 seconds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProviderWrapper>{children}</ClerkProviderWrapper>
      </body>
    </html>
  );
}
