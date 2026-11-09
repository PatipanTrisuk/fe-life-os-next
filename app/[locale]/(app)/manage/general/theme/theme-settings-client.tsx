"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/base/buttons/button";
import { ColorThemeSelector } from "@/components/base/theme-toggle/color-theme-selector";
import { ThemeSelector } from "@/components/base/theme-toggle/theme-selector";
import { useRequireAuth } from "@/providers/auth-provider";

export default function ThemeSettingsClient() {
    useRequireAuth();
    const t = useTranslations("themePage");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-display-xs font-semibold text-primary">{t("title")}</h1>
                <p className="mt-1 text-md text-tertiary">{t("description")}</p>
            </div>

            <div className="rounded-2xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
                <h2 className="text-lg font-semibold text-primary">{t("colorTitle")}</h2>
                <p className="mt-1 text-sm text-tertiary">{t("colorHint")}</p>
                <div className="mt-5">
                    <ColorThemeSelector />
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-secondary p-4 ring-1 ring-secondary">
                    <p className="text-sm text-tertiary">{t("previewLabel")}</p>
                    <Button size="sm">{t("previewPrimary")}</Button>
                    <Button size="sm" color="secondary">
                        {t("previewSecondary")}
                    </Button>
                    <span className="rounded-md bg-brand-primary px-2.5 py-1 text-xs font-semibold text-brand-secondary">
                        {t("previewBadge")}
                    </span>
                </div>
            </div>

            <div className="rounded-2xl bg-primary p-6 shadow-xs ring-1 ring-secondary sm:max-w-lg">
                <h2 className="text-lg font-semibold text-primary">{t("appearance")}</h2>
                <p className="mt-1 text-sm text-tertiary">{t("appearanceHint")}</p>
                <div className="mt-5">
                    <ThemeSelector />
                </div>
            </div>
        </div>
    );
}
