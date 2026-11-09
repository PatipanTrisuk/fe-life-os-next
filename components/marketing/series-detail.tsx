"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Calendar, Clock, Tv01, Users01 } from "@untitledui/icons";
import { Breadcrumbs } from "@/components/application/breadcrumbs/breadcrumbs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import {
    getRelatedSeries,
    SERIES_POSTER_TONES,
    toSeriesCardItem,
    type SeriesItem,
} from "@/components/marketing/series-data";
import { SeriesCard } from "@/components/marketing/series-card";
import { SeriesShell } from "@/components/marketing/series-shell";
import { useRouter } from "@/i18n/navigation";
import { cx } from "@/utils/cx";

type SeriesDetailProps = {
    item: SeriesItem;
};

export function SeriesDetail({ item }: SeriesDetailProps) {
    const t = useTranslations("seriesMockup");
    const router = useRouter();
    const related = getRelatedSeries(item.slug).map(toSeriesCardItem);

    const facts = [
        item.cast ? { icon: Users01, label: t("detailCast"), value: item.cast } : null,
        item.airDate ? { icon: Calendar, label: t("detailAirDate"), value: item.airDate } : null,
        item.channel ? { icon: Tv01, label: t("detailChannel"), value: item.channel } : null,
        item.runtime ? { icon: Clock, label: t("detailRuntime"), value: item.runtime } : null,
    ].filter(Boolean) as Array<{
        icon: typeof Users01;
        label: string;
        value: string;
    }>;

    return (
        <SeriesShell>
            <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
                <div className="mb-6 flex flex-col gap-4">
                    <Breadcrumbs type="text" aria-label={t("detailBreadcrumb")}>
                        <Breadcrumbs.Item id="series" href="/series">
                            {t("title")}
                        </Breadcrumbs.Item>
                        <Breadcrumbs.Item id="current">{item.poster.headline}</Breadcrumbs.Item>
                    </Breadcrumbs>

                    <Button
                        color="link-gray"
                        size="md"
                        iconLeading={ArrowLeft}
                        className="w-fit"
                        onPress={() => router.push("/series")}
                    >
                        {t("detailBack")}
                    </Button>
                </div>

                <article className="overflow-hidden rounded-2xl bg-primary shadow-xs ring-1 ring-secondary">
                    <div className="relative aspect-[16/9] overflow-hidden sm:aspect-[21/9]">
                        <div
                            className={cx("absolute inset-0 bg-linear-to-br", SERIES_POSTER_TONES[item.poster.tone])}
                            aria-hidden
                        />
                        <div
                            className="absolute inset-0 opacity-40 mix-blend-overlay"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5), transparent 42%), linear-gradient(120deg, transparent 35%, rgba(0,0,0,0.35) 100%)",
                            }}
                            aria-hidden
                        />
                        <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-8">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge color={item.categoryColor} size="md" type="pill-color">
                                    {item.category}
                                </Badge>
                                <Badge color="gray" size="md" type="modern">
                                    {item.poster.eyebrow}
                                </Badge>
                            </div>
                            <div className="max-w-3xl">
                                <p className="text-display-sm font-semibold text-white drop-shadow-md sm:text-display-md">
                                    {item.poster.headline}
                                </p>
                                <p className="mt-2 text-lg font-medium text-white/90 drop-shadow-sm">{item.poster.sub}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
                        <div className="space-y-5">
                            <div className="space-y-3">
                                <h1 className="text-display-xs font-semibold tracking-tight text-primary sm:text-display-sm">
                                    {item.title}
                                </h1>
                                <div className="flex flex-wrap gap-2">
                                    {item.tags.map((tag) => (
                                        <Badge key={tag} color="gray" size="sm" type="modern">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <section className="space-y-2">
                                <h2 className="text-lg font-semibold text-primary">{t("detailSynopsis")}</h2>
                                <p className="text-md leading-7 text-tertiary">{item.synopsis}</p>
                            </section>
                        </div>

                        <aside className="h-fit space-y-4 rounded-xl bg-secondary p-4 ring-1 ring-secondary sm:p-5">
                            <h2 className="text-md font-semibold text-primary">{t("detailInfo")}</h2>
                            <ul className="space-y-4">
                                {facts.map((fact) => (
                                    <li key={fact.label} className="flex gap-3">
                                        <FeaturedIcon icon={fact.icon} color="brand" theme="light" size="sm" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold tracking-wide text-quaternary uppercase">
                                                {fact.label}
                                            </p>
                                            <p className="mt-0.5 text-sm font-medium text-secondary">{fact.value}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    </div>
                </article>

                {related.length > 0 ? (
                    <section className="mt-10 space-y-5">
                        <div className="space-y-1">
                            <h2 className="text-display-xs font-semibold text-primary">{t("detailRelated")}</h2>
                            <p className="text-md text-tertiary">{t("detailRelatedSubtitle")}</p>
                        </div>
                        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
                            {related.map((card) => (
                                <li key={card.id}>
                                    <SeriesCard item={card} />
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}
            </main>
        </SeriesShell>
    );
}
