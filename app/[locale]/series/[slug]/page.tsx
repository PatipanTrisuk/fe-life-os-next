"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { getSeriesBySlug } from "@/components/marketing/series-data";
import { SeriesDetail } from "@/components/marketing/series-detail";
import { SeriesShell } from "@/components/marketing/series-shell";
import { useRouter } from "@/i18n/navigation";

type Props = {
    params: Promise<{ slug: string }>;
};

export default function SeriesDetailPage({ params }: Props) {
    const { slug } = use(params);
    const item = getSeriesBySlug(slug);
    const t = useTranslations("seriesMockup");
    const router = useRouter();

    if (!item) {
        return (
            <SeriesShell>
                <main className="mx-auto flex w-full max-w-6xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
                    <h1 className="text-display-xs font-semibold text-primary">{t("detailNotFound")}</h1>
                    <p className="text-md text-tertiary">{t("detailNotFoundSubtitle")}</p>
                    <Button color="secondary" size="md" iconLeading={ArrowLeft} onPress={() => router.push("/series")}>
                        {t("detailBack")}
                    </Button>
                </main>
            </SeriesShell>
        );
    }

    return <SeriesDetail item={item} />;
}
