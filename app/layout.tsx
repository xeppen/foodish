import type { Metadata } from "next";
import "./globals.css";
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";
import { SWRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  title: "Vad blir det till middag?",
  description: "Veckoplanering av middagar på under en minut",
  manifest: "/manifest.webmanifest",
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
        <SWRegister />
      </body>
    </html>
  );
}
