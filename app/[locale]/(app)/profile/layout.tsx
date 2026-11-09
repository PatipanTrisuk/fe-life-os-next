"use client";

import { useTranslations } from "next-intl";
import { CreditCard01, Monitor01, Settings01, User01 } from "@untitledui/icons";
import { Link, usePathname } from "@/i18n/navigation";
import { cx } from "@/utils/cx";

const tabs = [
    { href: "/profile" as const, labelKey: "overview" as const, icon: User01, exact: true },
    { href: "/profile/settings" as const, labelKey: "settings" as const, icon: Settings01, exact: false },
    { href: "/profile/billing" as const, labelKey: "billing" as const, icon: CreditCard01, exact: false },
    { href: "/profile/devices" as const, labelKey: "devices" as const, icon: Monitor01, exact: false },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const t = useTranslations("profile");
    const tNav = useTranslations("nav");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-display-xs font-semibold text-primary">{t("title")}</h1>
                <p className="mt-1 text-md text-tertiary">{t("subtitle")}</p>
            </div>

            <div className="flex gap-1 border-b border-secondary">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = tab.exact
                        ? pathname === tab.href
                        : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                    const label =
                        tab.labelKey === "devices"
                            ? tNav("devices")
                            : tab.labelKey === "billing"
                              ? tNav("billing")
                              : tab.labelKey === "settings"
                                ? t("settings")
                                : t("overview");

                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={cx(
                                "inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition",
                                active
                                    ? "border-brand text-brand-secondary"
                                    : "border-transparent text-tertiary hover:text-secondary",
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            {label}
                        </Link>
                    );
                })}
            </div>

            {children}
        </div>
    );
}
