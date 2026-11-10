"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
    BarChart01,
    Bell01,
    Calendar,
    CalendarDate,
    CheckCircle,
    CoinsStacked01,
    Colors,
    File06,
    Flag06,
    Key01,
    LayoutAlt01,
    LineChartUp01,
    Users01,
} from "@untitledui/icons";
import { AppNavAccountCard } from "@/components/application/app-navigation/base-components/app-nav-account-card";
import type { NavItemType } from "@/components/application/app-navigation/config";
import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { AppBreadcrumbs } from "@/components/application/breadcrumbs/app-breadcrumbs";
import { NotificationsPopover } from "@/components/application/notifications/notifications-popover";
import { LocaleSwitcher } from "@/components/base/locale-switcher/locale-switcher";
import { ThemeToggle } from "@/components/base/theme-toggle/theme-toggle";
import { LifePlusLogo } from "@/components/foundations/logo/life-plus-logo";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";

const DASHBOARD_HREF = "/lifeos/dashboard" as const;
const GOALS_HREF = "/lifeos/goals" as const;
const HABITS_HREF = "/lifeos/habits" as const;
const PLANNER_HREF = "/lifeos/planner" as const;
const CALENDAR_HREF = "/lifeos/calendar" as const;
const NOTES_HREF = "/lifeos/notes" as const;
const FINANCE_HREF = "/lifeos/finance" as const;
const REMINDERS_HREF = "/lifeos/reminders" as const;
const ANALYTICS_HREF = "/lifeos/analytics" as const;
const USERS_HREF = "/manage/general/users" as const;
const ROLES_HREF = "/manage/general/roles" as const;
const THEME_HREF = "/manage/general/theme" as const;
const PROFILE_HREF = "/profile" as const;

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const t = useTranslations();
    const { canManage, hasPermission } = useAuth();
    const canReadUsers = hasPermission("users.read");
    const canReadRoles = hasPermission("roles.read");

    const activeUrl = pathname.startsWith("/admin") ? USERS_HREF : pathname;

    const items = useMemo(() => {
        const next: NavItemType[] = [
            {
                label: t("nav.lifeos"),
                icon: Flag06,
                items: [
                    { label: t("nav.dashboard"), href: DASHBOARD_HREF, icon: BarChart01 },
                    { label: t("nav.goals"), href: GOALS_HREF, icon: Flag06 },
                    { label: t("nav.habits"), href: HABITS_HREF, icon: CheckCircle },
                    { label: t("nav.planner"), href: PLANNER_HREF, icon: Calendar },
                    { label: t("nav.calendar"), href: CALENDAR_HREF, icon: CalendarDate },
                    { label: t("nav.notes"), href: NOTES_HREF, icon: File06 },
                    { label: t("nav.finance"), href: FINANCE_HREF, icon: CoinsStacked01 },
                    { label: t("nav.reminders"), href: REMINDERS_HREF, icon: Bell01 },
                    { label: t("nav.analytics"), href: ANALYTICS_HREF, icon: LineChartUp01 },
                ],
            },
        ];

        if (canManage) {
            const generalItems: NonNullable<NavItemType["items"]> = [];
            if (canReadUsers) {
                generalItems.push({ label: t("nav.userAccounts"), href: USERS_HREF, icon: Users01 });
            }
            if (canReadRoles) {
                generalItems.push({ label: t("nav.roles"), href: ROLES_HREF, icon: Key01 });
            }
            generalItems.push({ label: t("nav.theme"), href: THEME_HREF, icon: Colors });

            next.push({
                label: t("nav.manage"),
                icon: LayoutAlt01,
                items: generalItems,
            });
        }

        return next;
    }, [canManage, canReadRoles, canReadUsers, t]);

    const brand = (
        <Link href={PROFILE_HREF} aria-label={t("app.name")} className="inline-flex items-center">
            <LifePlusLogo className="h-7" />
        </Link>
    );

    return (
        <div className="flex min-h-dvh flex-col bg-secondary lg:flex-row">
            <SidebarNavigationSimple
                activeUrl={activeUrl}
                items={items}
                hideSearch
                showAccountCard={false}
                logo={brand}
                accountCard={<AppNavAccountCard />}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 border-b border-secondary/70 bg-primary/75 backdrop-blur-xl">
                    <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
                        <div className="hidden min-w-0 flex-1 lg:block">
                            <AppBreadcrumbs />
                        </div>

                        <div className="ml-auto flex h-10 items-center gap-2 sm:gap-3">
                            <NotificationsPopover />
                            <LocaleSwitcher />
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                <main className="relative w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_0%_0%,color-mix(in_oklab,var(--color-bg-brand-primary)_28%,transparent),transparent_60%)]"
                        aria-hidden
                    />
                    <div className="relative">
                        <AppBreadcrumbs className="mb-4 lg:hidden" />
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
