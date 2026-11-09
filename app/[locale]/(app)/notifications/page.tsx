"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, Bell01, CheckCircle, Download01, InfoCircle } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
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

export default function NotificationsPage() {
    const locale = useLocale();
    const t = useTranslations("notifications");
    const { hasPermission } = useAuth();
    const canDownloadExport = hasPermission(Permission.UsersExport);
    const queryClient = useQueryClient();

    const listQuery = useQuery({
        queryKey: queryKeys.notifications,
        queryFn: async () => {
            const res = await authApi.notifications();
            return {
                items: res.data ?? [],
                unreadCount: res.meta?.unread_count ?? 0,
            };
        },
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

    const error = listQuery.error ? toApiError(listQuery.error).message : null;
    const items = listQuery.data?.items ?? [];
    const unreadCount = listQuery.data?.unreadCount ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-display-xs font-semibold text-primary">{t("title")}</h1>
                    <p className="mt-1 text-md text-tertiary">{t("subtitle")}</p>
                </div>
                {unreadCount > 0 ? (
                    <Button
                        color="secondary"
                        size="md"
                        isDisabled={markAllMutation.isPending}
                        onPress={() => markAllMutation.mutate()}
                    >
                        {t("markAllRead")}
                    </Button>
                ) : null}
            </div>

            {listQuery.isLoading ? (
                <div className="flex justify-center py-16">
                    <LoadingIndicator size="md" label={t("loading")} />
                </div>
            ) : null}

            {error ? <p className="text-sm text-error-primary">{error}</p> : null}

            {!listQuery.isLoading && !error && items.length === 0 ? (
                <div className="flex min-h-[min(28rem,60dvh)] w-full items-center justify-center py-10">
                    <EmptyState size="md" className="mx-auto">
                        <EmptyState.Header className="flex justify-center">
                            <EmptyState.FeaturedIcon color="gray" icon={Bell01} />
                        </EmptyState.Header>
                        <EmptyState.Content className="text-center">
                            <EmptyState.Title className="text-center">{t("emptyTitle")}</EmptyState.Title>
                            <EmptyState.Description>{t("emptyDescription")}</EmptyState.Description>
                        </EmptyState.Content>
                    </EmptyState>
                </div>
            ) : null}

            {!listQuery.isLoading && items.length > 0 ? (
                <ul className="divide-y divide-secondary overflow-hidden rounded-2xl bg-primary ring-1 ring-secondary">
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
                                    "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5",
                                    unread ? "bg-brand-primary/40" : "bg-primary",
                                )}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <FeaturedIcon color={tone} theme="outline" size="md" icon={Icon} />
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-primary">{titleFor(item)}</p>
                                            {unread ? (
                                                <span className="size-1.5 rounded-full bg-brand-solid" aria-hidden />
                                            ) : null}
                                        </div>
                                        <p className="mt-1 text-sm text-tertiary">{descriptionFor(item)}</p>
                                        <p className="mt-2 text-xs text-quaternary">
                                            {formatDate(item.created_at, { locale, withTime: true })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">
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
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}
