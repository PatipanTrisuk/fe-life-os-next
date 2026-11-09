import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { DocumentLocale } from "@/components/base/document-locale/document-locale";
import { AriaLocaleProvider } from "@/providers/aria-locale-provider";
import { LocaleApiSync } from "@/providers/locale-api-sync";
import { routing } from "@/i18n/routing";

/** Locale layout reads request-time intl config under Cache Components. */
export const instant = false;

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages();

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <AriaLocaleProvider>
                <DocumentLocale locale={locale} />
                <LocaleApiSync />
                {children}
            </AriaLocaleProvider>
        </NextIntlClientProvider>
    );
}
