import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { DocumentLocale } from "@/components/base/document-locale/document-locale";
import { SiteJsonLd } from "@/components/marketing/json-ld";
import { AriaLocaleProvider } from "@/providers/aria-locale-provider";
import { LocaleApiSync } from "@/providers/locale-api-sync";
import { routing, type AppLocale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

/** Locale layout reads request-time intl config under Cache Components. */
export const instant = false;

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

type Props = {
    children: React.ReactNode;
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
        title: t("homeTitle"),
        description: t("homeDescription"),
        path: "/",
        keywords: t("keywords")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    });
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages();
    const t = await getTranslations({ locale, namespace: "seo" });

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <AriaLocaleProvider>
                <DocumentLocale locale={locale} />
                <LocaleApiSync />
                <SiteJsonLd locale={locale} name={t("defaultTitle")} description={t("defaultDescription")} />
                {children}
            </AriaLocaleProvider>
        </NextIntlClientProvider>
    );
}
