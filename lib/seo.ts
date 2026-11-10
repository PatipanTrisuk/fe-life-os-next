import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";

export const SITE_NAME = "LIFE+";

const DEFAULT_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, "");

    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel) {
        const host = vercel.replace(/^https?:\/\//, "").replace(/\/$/, "");
        return `https://${host}`;
    }

    return DEFAULT_SITE_URL;
}

export function localePath(locale: AppLocale, path = "/"): string {
    const normalized = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
    return `/${locale}${normalized}`;
}

export function absoluteUrl(locale: AppLocale, path = "/"): string {
    return `${getSiteUrl()}${localePath(locale, path)}`;
}

export function languageAlternates(path = "/"): Record<string, string> {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
        languages[locale] = absoluteUrl(locale, path);
    }
    languages["x-default"] = absoluteUrl(routing.defaultLocale, path);
    return languages;
}

type BuildPageMetadataInput = {
    locale: AppLocale;
    title: string;
    description: string;
    path?: string;
    keywords?: string[];
    noIndex?: boolean;
};

export function buildPageMetadata({
    locale,
    title,
    description,
    path = "/",
    keywords,
    noIndex = false,
}: BuildPageMetadataInput): Metadata {
    const url = absoluteUrl(locale, path);
    const fullTitle = title === SITE_NAME ? SITE_NAME : title;

    return {
        // Absolute avoids "%s | LIFE+" double-branding when titles already include LIFE+.
        title: {
            absolute: fullTitle,
        },
        description,
        keywords,
        alternates: {
            canonical: url,
            languages: languageAlternates(path),
        },
        openGraph: {
            type: "website",
            siteName: SITE_NAME,
            locale: locale === "th" ? "th_TH" : "en_US",
            url,
            title: fullTitle,
            description,
        },
        twitter: {
            card: "summary_large_image",
            title: fullTitle,
            description,
        },
        robots: noIndex
            ? {
                  index: false,
                  follow: false,
              }
            : {
                  index: true,
                  follow: true,
              },
    };
}
