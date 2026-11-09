"use client";

import { PlayCircle } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import type { BadgeColors } from "@/components/base/badges/badge-types";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { SERIES_POSTER_TONES, type SeriesPosterTone } from "@/components/marketing/series-data";
import { Link, useRouter } from "@/i18n/navigation";
import { cx } from "@/utils/cx";

export type SeriesCardItem = {
    id: string;
    href: string;
    category: string;
    categoryColor?: BadgeColors;
    categoryHref?: string;
    title: string;
    excerpt: string;
    poster: {
        tone: SeriesPosterTone;
        eyebrow: string;
        headline: string;
        sub: string;
    };
};

type SeriesCardProps = {
    item: SeriesCardItem;
};

export function SeriesCard({ item }: SeriesCardProps) {
    const router = useRouter();
    const categoryColor = item.categoryColor ?? "brand";

    return (
        <article
            className={cx(
                "group flex h-full flex-col overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary",
                "transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-lg",
            )}
        >
            <Link
                href={item.href}
                className="relative block aspect-[3/2] overflow-hidden outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
                aria-label={item.title}
            >
                <div
                    className={cx(
                        "absolute inset-0 bg-linear-to-br transition-transform duration-500 ease-out group-hover:scale-[1.04]",
                        SERIES_POSTER_TONES[item.poster.tone],
                    )}
                    aria-hidden
                />
                <div
                    className="absolute inset-0 opacity-40 mix-blend-overlay"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.55), transparent 40%), linear-gradient(120deg, transparent 40%, rgba(0,0,0,0.22) 100%)",
                    }}
                    aria-hidden
                />
                <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                        <Badge color="gray" size="sm" type="modern">
                            {item.poster.eyebrow}
                        </Badge>
                        <FeaturedIcon
                            icon={PlayCircle}
                            color="gray"
                            theme="modern"
                            size="md"
                            className="bg-primary/90 text-fg-brand-primary backdrop-blur-sm"
                        />
                    </div>
                    <div>
                        <p className="max-w-[14ch] text-display-xs leading-tight font-semibold text-white drop-shadow-md sm:text-display-sm">
                            {item.poster.headline}
                        </p>
                        <p className="mt-2 max-w-[28ch] text-sm font-medium text-white/90 drop-shadow-sm">{item.poster.sub}</p>
                    </div>
                </div>
            </Link>

            <div className="flex flex-1 flex-col gap-3 px-5 py-5 sm:px-6">
                <div className="flex justify-center">
                    {item.categoryHref ? (
                        <Link href={item.categoryHref}>
                            <Badge color={categoryColor} size="sm" type="pill-color">
                                {item.category}
                            </Badge>
                        </Link>
                    ) : (
                        <Badge color={categoryColor} size="sm" type="pill-color">
                            {item.category}
                        </Badge>
                    )}
                </div>

                <h2 className="text-center text-lg font-semibold text-primary sm:text-xl">
                    <Button
                        color="link-color"
                        size="lg"
                        className="!h-auto !whitespace-normal text-center font-semibold text-primary hover:text-fg-brand-primary"
                        onPress={() => router.push(item.href)}
                    >
                        {item.title}
                    </Button>
                </h2>

                <p className="line-clamp-3 text-md text-tertiary">{item.excerpt}</p>
            </div>
        </article>
    );
}
