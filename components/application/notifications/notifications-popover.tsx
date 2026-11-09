"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
    Dialog as AriaDialog,
    DialogTrigger as AriaDialogTrigger,
    Heading,
    Popover as AriaPopover,
} from "react-aria-components";
import { AlertCircle, Bell01, CheckCircle, Download01, InfoCircle } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Link } from "@/i18n/navigation";
import { adminApi, authApi, toApiError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { notify } from "@/lib/notify";
import { Permission } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import type { AppNotification } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { cx } from "@/utils/cx";

function notificationTone(type: string): "brand" | "success" | "error" | "gray" {
    switch (type) {
        case "export_ready":
            return "success";
        case "export_failed":
            return "error";
        case "export_queued":
        case "reminder_due":
            return "brand";
        default:
            return "gray";
    }
}

function notificationIcon(type: string) {
    switch (type) {
        case "export_ready":
            return CheckCircle;
        case "export_failed":
            return AlertCircle;
        case "reminder_due":
            return Bell01;
        default:
            return InfoCircle;
    }
}

export function NotificationsPopover({ className }: { className?: string }) {
    const locale = useLocale();
    const t = useTranslations("notifications");
    const tNav = useTranslations("nav");
    const { user, hasPermission } = useAuth();
    const canDownloadExport = hasPermission(Permission.UsersExport);
    const queryClient = useQueryClient();

    const unreadQuery = useQuery({
        queryKey: queryKeys.notificationsUnread,
        queryFn: async () => {
            const res = await authApi.notificationsUnreadCount();
            return res.data?.unread_count ?? 0;
        },
        enabled: Boolean(user),
        refetchInterval: 20_000,
    });
    const unreadCount = unreadQuery.data ?? 0;

    const listQuery = useQuery({
        queryKey: queryKeys.notifications,
        queryFn: async () => {
            const res = await authApi.notifications();
            return {
                items: res.data ?? [],
                unreadCount: res.meta?.unread_count ?? 0,
            };
        },
        enabled: Boolean(user),
        refetchInterval: 15_000,
    });

    const invalidate = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
            queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
        ]);
    };

    const markAllMutation = useMutation({
        mutationFn: () => authApi.markAllNotificationsRead(),
        onSuccess: async () => {
            await invalidate();
        },
        onError: (error) => {
            notify.error(toApiError(error).message);
        },
    });

    const markReadMutation = useMutation({
        mutationFn: (id: string) => authApi.markNotificationRead(id),
        onSuccess: async () => {
            await invalidate();
        },
        onError: (error) => {
            notify.error(toApiError(error).message);
        },
    });

    const downloadMutation = useMutation({
        mutationFn: async (item: AppNotification) => {
            if (!item.ref_id) throw new Error(t("types.unknown.description"));
            const blob = await adminApi.downloadExportJob(item.ref_id);
            const fileName =
                (typeof item.meta.file_name === "string" && item.meta.file_name) ||
                `export-${item.ref_id}.csv`;
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            if (!item.read_at) {
                await authApi.markNotificationRead(item.id);
            }
        },
        onSuccess: async () => {
            await invalidate();
        },
        onError: (error) => {
            notify.error(toApiError(error).message);
        },
    });

    const titleFor = (item: AppNotification) => {
        if (item.type === "export_queued" || item.type === "export_ready" || item.type === "export_failed" || item.type === "reminder_due") {
            return t(`types.${item.type}.title`);
        }
        return t("types.unknown.title");
    };

    const descriptionFor = (item: AppNotification) => {
        if (item.type === "export_ready") {
            return t("types.export_ready.description", {
                fileName: (item.meta.file_name as string) || "export.csv",
            });
        }
        if (item.type === "export_failed") {
            return t("types.export_failed.description", {
                error: (item.meta.error_message as string) || "—",
            });
        }
        if (item.type === "reminder_due") {
            return typeof item.meta.title === "string" && item.meta.title
                ? t("types.reminder_due.description", { title: item.meta.title })
                : t("types.reminder_due.descriptionFallback");
        }
        if (item.type === "export_queued") {
            return t("types.export_queued.description");
        }
        return t("types.unknown.description");
    };

    const items = listQuery.data?.items ?? [];
    const error = listQuery.error ? toApiError(listQuery.error).message : null;

    return (
        <div className={cx("relative shrink-0", className)}>
            <AriaDialogTrigger>
                <Button
                    color="secondary"
                    size="md"
                    className="size-10 shrink-0"
                    aria-label={tNav("notifications")}
                    iconLeading={Bell01}
                />

                <AriaPopover
                    placement="bottom end"
                    offset={8}
                    className={(state) =>
                        cx(
                            "w-[min(24rem,calc(100vw-2rem))] origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-primary shadow-lg ring-1 ring-secondary_alt outline-hidden will-change-transform",
                            state.isEntering &&
                                "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5 placement-top:slide-in-from-bottom-0.5",
                            state.isExiting &&
                                "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5 placement-top:slide-out-to-bottom-0.5",
                        )
                    }
                >
                    <AriaDialog className="flex flex-col outline-hidden">
                        <div className="flex items-center justify-between gap-3 border-b border-secondary px-4 py-3">
                            <div className="min-w-0">
                                <Heading slot="title" className="text-sm font-semibold text-primary">
                                    {t("title")}
                                </Heading>
                                {unreadCount > 0 ? (
                                    <p className="mt-0.5 text-xs text-tertiary">
                                        {t("unreadBadge", { count: unreadCount })}
                                    </p>
                                ) : null}
                            </div>
                            {unreadCount > 0 ? (
                                <Button
                                    color="link-color"
                                    size="sm"
                                    isDisabled={markAllMutation.isPending}
                                    onPress={() => markAllMutation.mutate()}
                                >
                                    {t("markAllRead")}
                                </Button>
                            ) : null}
                        </div>

                        <div className="scrollbar max-h-96 overflow-y-auto">
                            {listQuery.isLoading ? (
                                <div className="flex justify-center py-10">
                                    <LoadingIndicator size="sm" label={t("loading")} />
                                </div>
                            ) : null}

                            {error ? <p className="px-4 py-6 text-sm text-error-primary">{error}</p> : null}

                            {!listQuery.isLoading && !error && items.length === 0 ? (
                                <div className="px-4 py-8">
                                    <EmptyState size="sm">
                                        <EmptyState.Header pattern="none">
                                            <EmptyState.FeaturedIcon color="gray" theme="modern" icon={Bell01} />
                                        </EmptyState.Header>
                                        <EmptyState.Content className="mb-0!">
                                            <EmptyState.Title>{t("emptyTitle")}</EmptyState.Title>
                                            <EmptyState.Description>{t("emptyDescription")}</EmptyState.Description>
                                        </EmptyState.Content>
                                    </EmptyState>
                                </div>
                            ) : null}

                            {!listQuery.isLoading && items.length > 0 ? (
                                <ul className="divide-y divide-secondary">
                                    {items.map((item) => {
                                        const unread = !item.read_at;
                                        const tone = notificationTone(item.type);
                                        const Icon = notificationIcon(item.type);
                                        const canDownload =
                                            canDownloadExport && item.type === "export_ready" && Boolean(item.ref_id);

                                        return (
                                            <li
                                                key={item.id}
                                                className={cx(
                                                    "flex flex-col gap-2 px-4 py-3",
                                                    unread ? "bg-brand-primary/40" : "bg-primary",
                                                )}
                                            >
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <FeaturedIcon
                                                        color={tone}
                                                        theme="outline"
                                                        size="sm"
                                                        icon={Icon}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-semibold text-primary">
                                                                {titleFor(item)}
                                                            </p>
                                                            {unread ? (
                                                                <span
                                                                    className="size-1.5 rounded-full bg-brand-solid"
                                                                    aria-hidden
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <p className="mt-0.5 text-sm text-tertiary">
                                                            {descriptionFor(item)}
                                                        </p>
                                                        <p className="mt-1.5 text-xs text-quaternary">
                                                            {formatDate(item.created_at, {
                                                                locale,
                                                                withTime: true,
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {(canDownload || unread) && (
                                                    <div className="flex flex-wrap items-center gap-2 pl-10">
                                                        {canDownload ? (
                                                            <Button
                                                                color="secondary"
                                                                size="sm"
                                                                iconLeading={Download01}
                                                                isDisabled={downloadMutation.isPending}
                                                                onPress={() => downloadMutation.mutate(item)}
                                                            >
                                                                {t("download")}
                                                            </Button>
                                                        ) : null}
                                                        {unread ? (
                                                            <Button
                                                                color="tertiary"
                                                                size="sm"
                                                                isDisabled={markReadMutation.isPending}
                                                                onPress={() => markReadMutation.mutate(item.id)}
                                                            >
                                                                {t("markRead")}
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : null}
                        </div>

                        <div className="border-t border-secondary px-4 py-2.5">
                            <Link
                                href="/notifications"
                                className="block text-center text-sm font-semibold text-brand-secondary transition hover:text-brand-secondary_hover"
                            >
                                {t("viewAll")}
                            </Link>
                        </div>
                    </AriaDialog>
                </AriaPopover>
            </AriaDialogTrigger>

            {unreadCount > 0 ? (
                <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-fg-error-primary text-[11px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                </span>
            ) : null}
        </div>
    );
}
