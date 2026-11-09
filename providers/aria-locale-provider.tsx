"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { I18nProvider, RouterProvider } from "react-aria-components";
import { useRouter } from "@/i18n/navigation";

/** Keep UI language from next-intl, but force Gregorian so DatePicker values stay API-safe (YYYY-MM-DD). */
function ariaLocale(locale: string) {
    const base = locale.toLowerCase().startsWith("th") ? "th-TH" : "en-US";
    return `${base}-u-ca-gregory`;
}

/** Sync next-intl locale into React Aria and wire client-side navigation for AriaLink. */
export function AriaLocaleProvider({ children }: { children: ReactNode }) {
    const locale = useLocale();
    const router = useRouter();

    return (
        <I18nProvider locale={ariaLocale(locale)}>
            <RouterProvider navigate={(href) => router.push(href)}>{children}</RouterProvider>
        </I18nProvider>
    );
}
