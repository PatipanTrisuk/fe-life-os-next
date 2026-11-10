import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Prompt } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { AuthProvider } from "@/providers/auth-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ColorThemeProvider } from "@/providers/color-theme-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { COLOR_THEME_BOOT_SCRIPT } from "@/lib/color-theme";
import enMessages from "@/messages/en.json";
import "@/styles/globals.css";

const prompt = Prompt({
    subsets: ["latin", "thai"],
    weight: ["300", "400", "500", "600", "700"],
    display: "swap",
    variable: "--font-prompt",
});

/** Root providers may touch client runtime during Cache Components prerender. */
export const instant = false;

export const metadata: Metadata = {
    title: "LIFE+",
    description: "Plan your day. Shape your life with LIFE+.",
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    ],
    colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={`${prompt.variable} scroll-smooth`} suppressHydrationWarning>
            <body className={`${prompt.className} bg-primary text-primary antialiased`}>
                <Script id="color-theme-boot" strategy="beforeInteractive">
                    {COLOR_THEME_BOOT_SCRIPT}
                </Script>
                <NextIntlClientProvider locale="en" messages={enMessages}>
                    <ThemeProvider>
                        <ColorThemeProvider>
                            <QueryProvider>
                                <NotificationProvider>
                                    <AuthProvider>{children}</AuthProvider>
                                </NotificationProvider>
                            </QueryProvider>
                        </ColorThemeProvider>
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
