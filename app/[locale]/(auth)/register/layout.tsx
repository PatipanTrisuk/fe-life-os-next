import type { Metadata } from "next";
import type { ReactNode } from "react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

type Props = {
    children: ReactNode;
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale: localeParam } = await params;
    if (!hasLocale(routing.locales, localeParam)) {
        return {};
    }

    const locale = localeParam as AppLocale;
    const t = await getTranslations({ locale, namespace: "seo" });

    return buildPageMetadata({
        locale,
        title: t("registerTitle"),
        description: t("registerDescription"),
        path: "/register",
    });
}

export default async function RegisterLayout({ children, params }: Props) {
    const { locale } = await params;
    if (hasLocale(routing.locales, locale)) {
        setRequestLocale(locale);
    }
    return children;
}
