"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PaginationPageDefault } from "@/components/application/pagination/pagination";
import { Badge } from "@/components/base/badges/badges";
import { MOCK_SERIES, toSeriesCardItem } from "@/components/marketing/series-data";
import { SeriesCard } from "@/components/marketing/series-card";
import { SeriesShell } from "@/components/marketing/series-shell";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CARD_ITEMS = MOCK_SERIES.map(toSeriesCardItem);

export function SeriesRecommendMockup() {
    const t = useTranslations("seriesMockup");
    const rootRef = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(1);

    useGSAP(
        () => {
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (reduced) {
                gsap.set("[data-animate]", { clearProps: "all", opacity: 1, y: 0 });
                return;
            }

            gsap.set("[data-animate]", { opacity: 0, y: 24 });

            gsap.timeline({ defaults: { ease: "power3.out" } }).to("[data-animate='intro']", {
                opacity: 1,
                y: 0,
                duration: 0.65,
                stagger: 0.08,
            });

            gsap.to("[data-animate='card']", {
                opacity: 1,
                y: 0,
                duration: 0.7,
                stagger: 0.08,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: "[data-section='grid']",
                    start: "top 82%",
                    once: true,
                },
            });
        },
        { scope: rootRef },
    );

    return (
        <SeriesShell>
            <main ref={rootRef} className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
                <div className="mb-8 flex flex-col gap-3 sm:mb-10">
                    <div data-animate="intro" className="opacity-0">
                        <Badge color="brand" size="md" type="pill-color">
                            {t("eyebrow")}
                        </Badge>
                    </div>
                    <h1
                        data-animate="intro"
                        className="text-display-xs font-semibold tracking-tight text-primary opacity-0 sm:text-display-sm"
                    >
                        {t("title")}
                    </h1>
                    <p data-animate="intro" className="max-w-2xl text-md text-tertiary opacity-0 sm:text-lg">
                        {t("subtitle")}
                    </p>
                </div>

                <section data-section="grid">
                    <ul className="grid gap-5 sm:grid-cols-2 sm:gap-6">
                        {CARD_ITEMS.map((item) => (
                            <li key={item.id} data-animate="card" className="opacity-0">
                                <SeriesCard item={item} />
                            </li>
                        ))}
                    </ul>
                </section>

                <PaginationPageDefault page={page} total={6} className="mt-8" onPageChange={setPage} />
            </main>
        </SeriesShell>
    );
}
