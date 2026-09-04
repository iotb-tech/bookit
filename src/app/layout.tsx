import type { Metadata } from "next";
import type { ReactNode } from "react";

import ThemeInitializer from "@/components/theme/ThemeInitializer";
import SessionExpiryGuard from "@/components/auth/SessionExpiryGuard";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BookIt",
    template: "%s | BookIt",
  },
  description:
    "Book mentors, join study groups, and manage learning sessions without scheduling conflicts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-white antialiased">
        <ThemeInitializer />
        <SessionExpiryGuard />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
