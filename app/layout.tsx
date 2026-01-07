import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeShortcut } from "@/components/theme/theme-shortcut";
import { Toaster } from "@/components/ui/sonner";
import { PageFooter } from "@/components/layout/footer/page-footer";
import { PlatformProvider } from "@/components/providers/platform-provider";
import { platformFromUserAgent } from "@/lib/platform";
import { parsePreferences } from "@/lib/preferences";
import { PREFERENCES_COOKIE_NAME } from "@/lib/types";
import { DEFAULT_APPEARANCE } from "@/lib/appearance-config";
import "./globals.css";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "crapdash",
  description: "dashboard for u",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const ua = headersList.get("user-agent");
  const platformDefault = platformFromUserAgent(ua);
  const cookieHeader = headersList.get("cookie") ?? "";
  const prefValue = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${PREFERENCES_COOKIE_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const initialPreferences = parsePreferences(prefValue);
  const initialAppearance = initialPreferences.appearance ?? DEFAULT_APPEARANCE;

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        data-appearance={initialAppearance === DEFAULT_APPEARANCE ? undefined : initialAppearance}
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PlatformProvider value={platformDefault}>
          <ThemeProvider>
            <ThemeShortcut />
            {children}
            <PageFooter />
            <Toaster />
          </ThemeProvider>
        </PlatformProvider>
      </body>
    </html>
  );
}
