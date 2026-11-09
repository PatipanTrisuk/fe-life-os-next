"use client";

import type { PropsWithChildren } from "react";
import { useTranslations } from "next-intl";
import { Clapperboard, Menu01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { LocaleSwitcher } from "@/components/base/locale-switcher/locale-switcher";
import { ThemeToggle } from "@/components/base/theme-toggle/theme-toggle";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Link, useRouter } from "@/i18n/navigation";

export function SeriesShell({ children }: PropsWithChildren) {
    const t = useTranslations("seriesMockup");
    const router = useRouter();

    return (
        <div className="min-h-dvh bg-primary text-primary">
            <header className="sticky top-0 z-40 border-b border-secondary/60 bg-primary/80 backdrop-blur-md">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Link href="/series" className="flex items-center gap-3">
                        <FeaturedIcon icon={Clapperboard} color="brand" theme="light" size="md" />
                        <span className="text-lg font-semibold tracking-tight text-primary">{t("brand")}</span>
                    </Link>

                    <div className="flex h-10 items-center gap-2 sm:gap-3">
                        <LocaleSwitcher className="hidden sm:inline-flex" />
                        <ThemeToggle />
                        <Button
                            color="tertiary"
                            size="md"
                            className="hidden sm:inline-flex"
                            onPress={() => router.push("/")}
                        >
                            {t("backHome")}
                        </Button>
                        <ButtonUtility tooltip={t("menu")} icon={Menu01} size="sm" color="secondary" />
                    </div>
                </div>
            </header>

            {children}

            <footer className="border-t border-secondary bg-secondary">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-8 sm:px-6">
                    <p className="text-sm font-semibold text-brand-secondary">{t("brand")}</p>
                    <p className="text-sm text-tertiary">{t("footerNote")}</p>
                </div>
            </footer>
        </div>
    );
}
