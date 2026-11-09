"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/base/buttons/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cx } from "@/utils/cx";

export function LocaleSwitcher({ className }: { className?: string }) {
    const t = useTranslations("locale");
    const locale = useLocale() as AppLocale;
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    function switchLocale(next: AppLocale) {
        if (next === locale) return;
        // Keep query string (e.g. ?registered=1) across locale changes.
        const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
        const href = query ? `${pathname}?${query}` : pathname;
        startTransition(() => {
            router.replace(href, { locale: next });
        });
    }

    return (
        <div
            className={cx(
                "inline-flex h-10 items-center gap-0.5 rounded-lg bg-secondary p-0.5 ring-1 ring-secondary",
                className,
            )}
            aria-label={t("label")}
        >
            {routing.locales.map((item) => {
                const active = item === locale;
                return (
                    <Button
                        key={item}
                        size="sm"
                        color={active ? "primary" : "tertiary"}
                        className="h-full min-w-0 flex-1 justify-center rounded-md px-2.5 py-0"
                        isDisabled={isPending}
                        onPress={() => switchLocale(item)}
                        aria-pressed={active}
                    >
                        {t(item)}
                    </Button>
                );
            })}
        </div>
    );
}
