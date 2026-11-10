import type { MetadataRoute } from "next";
import { MOCK_SERIES } from "@/components/marketing/series-data";
import { routing } from "@/i18n/routing";
import { absoluteUrl } from "@/lib/seo";

type PublicPath = {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
};

const PUBLIC_PATHS: PublicPath[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/login", changeFrequency: "monthly", priority: 0.6 },
    { path: "/register", changeFrequency: "monthly", priority: 0.7 },
    { path: "/series", changeFrequency: "weekly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    const entries: MetadataRoute.Sitemap = [];

    for (const locale of routing.locales) {
        for (const item of PUBLIC_PATHS) {
            entries.push({
                url: absoluteUrl(locale, item.path),
                lastModified: now,
                changeFrequency: item.changeFrequency,
                priority: item.priority,
                alternates: {
                    languages: Object.fromEntries(
                        routing.locales.map((alt) => [alt, absoluteUrl(alt, item.path)]),
                    ),
                },
            });
        }

        for (const series of MOCK_SERIES) {
            const path = `/series/${series.slug}`;
            entries.push({
                url: absoluteUrl(locale, path),
                lastModified: now,
                changeFrequency: "monthly",
                priority: 0.4,
                alternates: {
                    languages: Object.fromEntries(
                        routing.locales.map((alt) => [alt, absoluteUrl(alt, path)]),
                    ),
                },
            });
        }
    }

    return entries;
}
