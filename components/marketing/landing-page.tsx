"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
    BarChart01,
    Bell01,
    Calendar,
    CalendarDate,
    CheckCircle,
    CoinsStacked01,
    File06,
    Flag06,
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { LandingNav } from "@/components/marketing/landing-nav";
import { LifeOsHeroVisual } from "@/components/marketing/lifeos-hero-visual";
import { Grid } from "@/components/shared-assets/background-patterns/grid";
import { useRouter } from "@/i18n/navigation";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const features = [
    { icon: Calendar, titleKey: "featurePlannerTitle", descriptionKey: "featurePlannerDescription" },
    { icon: Flag06, titleKey: "featureGoalsTitle", descriptionKey: "featureGoalsDescription" },
    { icon: CheckCircle, titleKey: "featureHabitsTitle", descriptionKey: "featureHabitsDescription" },
    { icon: CalendarDate, titleKey: "featureCalendarTitle", descriptionKey: "featureCalendarDescription" },
    { icon: File06, titleKey: "featureNotesTitle", descriptionKey: "featureNotesDescription" },
    { icon: CoinsStacked01, titleKey: "featureFinanceTitle", descriptionKey: "featureFinanceDescription" },
    { icon: Bell01, titleKey: "featureRemindersTitle", descriptionKey: "featureRemindersDescription" },
    { icon: BarChart01, titleKey: "featureAnalyticsTitle", descriptionKey: "featureAnalyticsDescription" },
] as const;

/** Mirrors the seeded Free plan caps; Pro is unlimited. */
const pricingRows = [
    { labelKey: "pricingFeatureGoals", free: 5 },
    { labelKey: "pricingFeatureHabits", free: 5 },
    { labelKey: "pricingFeaturePlanner", free: 20 },
    { labelKey: "pricingFeatureCalendar", free: 30 },
    { labelKey: "pricingFeatureNotes", free: 30 },
    { labelKey: "pricingFeatureFinance", free: 50 },
    { labelKey: "pricingFeatureReminders", free: 15 },
] as const;

export function LandingPage() {
    const t = useTranslations("home");
    const router = useRouter();
    const rootRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            if (reduced) {
                gsap.set("[data-animate]", { clearProps: "all", autoAlpha: 1, y: 0 });
                gsap.set("[data-hero-grid]", { autoAlpha: 0.28, scale: 1.2 });
                gsap.set("[data-hero-visual]", { autoAlpha: 1 });
                gsap.set("[data-hero-layer]", { autoAlpha: 1 });
                return;
            }

            gsap.set("[data-animate]", { autoAlpha: 0, y: 28 });
            gsap.set("[data-hero-visual]", { autoAlpha: 0 });
            gsap.set("[data-hero-layer]", { autoAlpha: 0 });

            const hero = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.85 } });
            hero.to("[data-animate='nav']", { autoAlpha: 1, y: 0, duration: 0.6 })
                .to("[data-animate='hero-brand']", { autoAlpha: 1, y: 0 }, "-=0.25")
                .to("[data-animate='hero-title']", { autoAlpha: 1, y: 0 }, "-=0.55")
                .to("[data-animate='hero-subtitle']", { autoAlpha: 1, y: 0 }, "-=0.55")
                .to("[data-animate='hero-cta']", { autoAlpha: 1, y: 0 }, "-=0.5");

            gsap.fromTo(
                "[data-hero-grid]",
                { autoAlpha: 0, scale: 1.06 },
                { autoAlpha: 0.28, scale: 1.2, duration: 1.4, ease: "power2.out", delay: 0.1 },
            );

            gsap.to("[data-hero-visual]", {
                autoAlpha: 1,
                duration: 1.1,
                ease: "power2.out",
                delay: 0.2,
            });

            gsap.to("[data-hero-layer]", {
                autoAlpha: 1,
                duration: 0.9,
                stagger: 0.12,
                ease: "power3.out",
                delay: 0.35,
            });

            gsap.to("[data-hero-visual]", {
                yPercent: -6,
                ease: "none",
                scrollTrigger: {
                    trigger: "[data-section='hero']",
                    start: "top top",
                    end: "bottom top",
                    scrub: true,
                },
            });

            const revealSection = (trigger: string, targets: string) => {
                gsap.to(targets, {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.75,
                    stagger: 0.1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger,
                        start: "top 82%",
                        once: true,
                        invalidateOnRefresh: true,
                    },
                });
            };

            revealSection("[data-section='features']", "[data-animate='features-intro'], [data-animate='feature-item']");
            revealSection("[data-section='pricing']", "[data-animate='pricing-intro'], [data-animate='pricing-table']");
            revealSection("[data-section='final-cta']", "[data-animate='final-cta']");

            requestAnimationFrame(() => ScrollTrigger.refresh());
        },
        { scope: rootRef },
    );

    return (
        <div ref={rootRef} className="min-h-dvh bg-primary text-primary">
            <div data-animate="nav">
                <LandingNav brand={t("brand")} />
            </div>

            <section data-section="hero" className="relative isolate min-h-[calc(100dvh-4rem)] overflow-hidden">
                <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,color-mix(in_oklab,var(--color-bg-brand-primary)_48%,transparent),transparent_52%),radial-gradient(ellipse_at_88%_18%,color-mix(in_oklab,var(--color-bg-secondary)_92%,transparent),transparent_48%),linear-gradient(180deg,var(--color-bg-secondary),var(--color-bg-primary)_78%)]"
                    aria-hidden
                />
                <div
                    data-hero-grid
                    className="pointer-events-none absolute inset-0 text-fg-quaternary opacity-0"
                    aria-hidden
                    suppressHydrationWarning
                >
                    <Grid size="md" className="h-full w-full" />
                </div>

                <LifeOsHeroVisual />

                <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
                    <p
                        data-animate="hero-brand"
                        className="text-display-sm font-semibold tracking-tight text-primary sm:text-display-md"
                    >
                        {t("brand")}
                    </p>
                    <h1
                        data-animate="hero-title"
                        className="mt-4 max-w-2xl text-display-md font-semibold tracking-tight text-primary sm:text-display-lg"
                    >
                        {t("heroTitle")}
                    </h1>
                    <p data-animate="hero-subtitle" className="mt-5 max-w-lg text-lg text-tertiary sm:text-xl">
                        {t("heroSubtitle")}
                    </p>
                    <div data-animate="hero-cta" className="mt-10 flex flex-wrap items-center gap-3">
                        <Button size="xl" onPress={() => router.push("/register")}>
                            {t("ctaPrimary")}
                        </Button>
                        <Button color="secondary" size="xl" onPress={() => router.push("/login")}>
                            {t("ctaSecondary")}
                        </Button>
                    </div>
                </div>
            </section>

            <section data-section="features" className="border-t border-secondary bg-secondary">
                <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
                    <p
                        data-animate="features-intro"
                        className="text-sm font-semibold tracking-wide text-brand-tertiary uppercase"
                    >
                        {t("featuresEyebrow")}
                    </p>
                    <h2
                        data-animate="features-intro"
                        className="mt-3 max-w-2xl text-display-xs font-semibold text-primary sm:text-display-sm"
                    >
                        {t("featuresTitle")}
                    </h2>
                    <p data-animate="features-intro" className="mt-4 max-w-2xl text-md text-tertiary sm:text-lg">
                        {t("featuresSubtitle")}
                    </p>

                    <ul className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                        {features.map(({ icon: Icon, titleKey, descriptionKey }) => (
                            <li key={titleKey} data-animate="feature-item">
                                <Icon className="size-6 text-fg-brand-primary" />
                                <h3 className="mt-4 text-lg font-semibold text-primary">{t(titleKey)}</h3>
                                <p className="mt-2 text-md text-tertiary">{t(descriptionKey)}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            <section data-section="pricing" className="border-t border-secondary bg-primary">
                <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
                    <div>
                        <p
                            data-animate="pricing-intro"
                            className="text-sm font-semibold tracking-wide text-brand-tertiary uppercase"
                        >
                            {t("pricingEyebrow")}
                        </p>
                        <h2
                            data-animate="pricing-intro"
                            className="mt-3 text-display-xs font-semibold text-primary sm:text-display-sm"
                        >
                            {t("pricingTitle")}
                        </h2>
                        <p data-animate="pricing-intro" className="mt-4 text-md text-tertiary sm:text-lg">
                            {t("pricingSubtitle")}
                        </p>
                        <div data-animate="pricing-intro" className="mt-8">
                            <Button size="lg" onPress={() => router.push("/register")}>
                                {t("pricingCta")}
                            </Button>
                        </div>
                    </div>

                    <div data-animate="pricing-table" className="overflow-x-auto">
                        <table className="w-full min-w-[20rem] border-collapse text-left">
                            <thead>
                                <tr className="border-b border-secondary">
                                    <th scope="col" className="py-3 pr-4 text-sm font-medium text-tertiary">
                                        <span className="sr-only">{t("pricingFeatureColumn")}</span>
                                    </th>
                                    <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-primary">
                                        {t("pricingFreeName")}
                                    </th>
                                    <th
                                        scope="col"
                                        className="py-3 pl-4 text-right text-sm font-semibold text-brand-secondary"
                                    >
                                        {t("pricingProName")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {pricingRows.map((row) => (
                                    <tr key={row.labelKey} className="border-b border-secondary">
                                        <th scope="row" className="py-3.5 pr-4 text-md font-normal text-secondary">
                                            {t(row.labelKey)}
                                        </th>
                                        <td className="px-4 py-3.5 text-right text-md text-tertiary tabular-nums">
                                            {row.free}
                                        </td>
                                        <td className="py-3.5 pl-4 text-right text-md font-medium text-primary">
                                            {t("pricingUnlimited")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <p className="mt-4 text-sm text-quaternary">{t("pricingNote")}</p>
                    </div>
                </div>
            </section>

            <section data-section="final-cta" className="border-t border-secondary bg-secondary">
                <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 sm:py-24">
                    <h2
                        data-animate="final-cta"
                        className="max-w-2xl text-display-xs font-semibold text-primary sm:text-display-sm"
                    >
                        {t("finalCtaTitle")}
                    </h2>
                    <p data-animate="final-cta" className="max-w-xl text-md text-tertiary sm:text-lg">
                        {t("finalCtaSubtitle")}
                    </p>
                    <div data-animate="final-cta" className="flex flex-wrap items-center gap-3">
                        <Button size="xl" onPress={() => router.push("/register")}>
                            {t("ctaPrimary")}
                        </Button>
                        <Button color="secondary" size="xl" onPress={() => router.push("/login")}>
                            {t("ctaSecondary")}
                        </Button>
                    </div>
                </div>
            </section>

            <footer className="border-t border-secondary bg-secondary">
                <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-8 sm:px-6">
                    <p className="text-sm font-semibold text-tertiary">{t("footerBrand")}</p>
                </div>
            </footer>
        </div>
    );
}
