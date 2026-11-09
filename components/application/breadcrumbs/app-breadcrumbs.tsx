"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/application/breadcrumbs/breadcrumbs";
import { usePathname } from "@/i18n/navigation";

type Crumb = {
    id: string;
    label: string;
    href?: string;
};

export function AppBreadcrumbs({ className }: { className?: string }) {
    const pathname = usePathname();
    const t = useTranslations("nav");

    const items = useMemo((): Crumb[] => {
        if (pathname.startsWith("/lifeos/goals/")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "goals", label: t("goals"), href: "/lifeos/goals" },
                { id: "goal-detail", label: t("goals") },
            ];
        }

        if (pathname.startsWith("/lifeos/goals")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "goals", label: t("goals"), href: "/lifeos/goals" },
            ];
        }

        if (pathname.startsWith("/lifeos/dashboard")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "dashboard", label: t("dashboard"), href: "/lifeos/dashboard" },
            ];
        }

        if (pathname.startsWith("/lifeos/habits/")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "habits", label: t("habits"), href: "/lifeos/habits" },
                { id: "habit-detail", label: t("habits") },
            ];
        }

        if (pathname.startsWith("/lifeos/habits")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "habits", label: t("habits"), href: "/lifeos/habits" },
            ];
        }

        if (pathname.startsWith("/lifeos/planner")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "planner", label: t("planner"), href: "/lifeos/planner" },
            ];
        }

        if (pathname.startsWith("/lifeos/calendar")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "calendar", label: t("calendar"), href: "/lifeos/calendar" },
            ];
        }

        if (pathname.startsWith("/lifeos/notes")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "notes", label: t("notes"), href: "/lifeos/notes" },
            ];
        }

        if (pathname.startsWith("/lifeos/finance")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "finance", label: t("finance"), href: "/lifeos/finance" },
            ];
        }

        if (pathname.startsWith("/lifeos/reminders")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "reminders", label: t("reminders"), href: "/lifeos/reminders" },
            ];
        }

        if (pathname.startsWith("/lifeos/analytics")) {
            return [
                { id: "lifeos", label: t("lifeos") },
                { id: "analytics", label: t("analytics"), href: "/lifeos/analytics" },
            ];
        }

        if (pathname.startsWith("/manage/general/users") || pathname.startsWith("/admin")) {
            return [
                { id: "manage", label: t("manage") },
                { id: "general", label: t("general") },
                { id: "users", label: t("userAccounts"), href: "/manage/general/users" },
            ];
        }

        if (pathname.startsWith("/manage/general/roles")) {
            return [
                { id: "manage", label: t("manage") },
                { id: "general", label: t("general") },
                { id: "roles", label: t("roles"), href: "/manage/general/roles" },
            ];
        }

        if (pathname.startsWith("/manage/general/theme")) {
            return [
                { id: "manage", label: t("manage") },
                { id: "general", label: t("general") },
                { id: "theme", label: t("theme"), href: "/manage/general/theme" },
            ];
        }

        if (pathname.startsWith("/profile/devices") || pathname.startsWith("/devices")) {
            return [
                { id: "profile", label: t("profile"), href: "/profile" },
                { id: "devices", label: t("devices"), href: "/profile/devices" },
            ];
        }

        if (pathname.startsWith("/profile/billing")) {
            return [
                { id: "profile", label: t("profile"), href: "/profile" },
                { id: "billing", label: t("billing"), href: "/profile/billing" },
            ];
        }

        if (pathname === "/profile" || pathname.startsWith("/profile/")) {
            return [{ id: "profile", label: t("profile"), href: "/profile" }];
        }

        if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
            return [{ id: "notifications", label: t("notifications"), href: "/notifications" }];
        }

        return [];
    }, [pathname, t]);

    if (items.length === 0) return null;

    return (
        <Breadcrumbs type="text" divider="chevron" className={className} aria-label={t("breadcrumb")}>
            {items.map((item) => (
                <Breadcrumbs.Item key={item.id} id={item.id} href={item.href}>
                    {item.label}
                </Breadcrumbs.Item>
            ))}
        </Breadcrumbs>
    );
}
