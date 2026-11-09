"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Table, TableCard } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { authApi, toApiError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";

export default function ProfileDevicesPage() {
    const locale = useLocale();
    const t = useTranslations("devices");
    const queryClient = useQueryClient();
    const { logout } = useAuth();

    const devicesQuery = useQuery({
        queryKey: queryKeys.devices,
        queryFn: async () => {
            const res = await authApi.devices();
            return res.data ?? [];
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (id: string) => authApi.revokeDevice(id),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: queryKeys.devices });
        },
    });

    const revokeAllMutation = useMutation({
        mutationFn: () => authApi.revokeAllSessions(),
        onSuccess: async () => {
            await logout();
        },
    });

    const error = devicesQuery.error ? toApiError(devicesQuery.error).message : null;

    if (devicesQuery.isLoading) {
        return (
            <div className="flex justify-center py-16">
                <LoadingIndicator size="md" label={t("loading")} />
            </div>
        );
    }

    if (error) {
        return <p className="text-sm text-error-primary">{error}</p>;
    }

    if (!devicesQuery.data?.length) {
        return (
            <EmptyState size="md">
                <EmptyState.Header>
                    <EmptyState.FeaturedIcon color="gray" />
                </EmptyState.Header>
                <EmptyState.Content>
                    <EmptyState.Title>{t("emptyTitle")}</EmptyState.Title>
                    <EmptyState.Description>{t("emptyDescription")}</EmptyState.Description>
                </EmptyState.Content>
            </EmptyState>
        );
    }

    return (
        <TableCard.Root>
            <TableCard.Header
                title={t("tableTitle")}
                badge={`${devicesQuery.data.length}`}
                description={t("subtitle")}
                contentTrailing={
                    <Button
                        color="secondary-destructive"
                        size="sm"
                        isLoading={revokeAllMutation.isPending}
                        isDisabled={revokeAllMutation.isPending || revokeMutation.isPending}
                        onPress={() => {
                            if (window.confirm(t("revokeAllConfirm"))) {
                                revokeAllMutation.mutate();
                            }
                        }}
                    >
                        {t("revokeAll")}
                    </Button>
                }
            />
            <Table aria-label={t("tableTitle")}>
                <Table.Header>
                    <Table.Head isRowHeader>{t("name")}</Table.Head>
                    <Table.Head>{t("ip")}</Table.Head>
                    <Table.Head>{t("lastSeen")}</Table.Head>
                    <Table.Head>{t("userAgent")}</Table.Head>
                    <Table.Head>{t("actions")}</Table.Head>
                </Table.Header>
                <Table.Body items={devicesQuery.data}>
                    {(device) => (
                        <Table.Row id={device.id}>
                            <Table.Cell>
                                <div>
                                    <p className="font-medium text-primary">{device.name || t("unnamed")}</p>
                                    <p className="text-xs text-tertiary">{device.deviceKey}</p>
                                </div>
                            </Table.Cell>
                            <Table.Cell>{device.ipAddress || "—"}</Table.Cell>
                            <Table.Cell>{formatDate(device.lastSeenAt, { locale, withTime: true })}</Table.Cell>
                            <Table.Cell>
                                <span className="line-clamp-2 max-w-xs text-xs text-tertiary">{device.userAgent}</span>
                            </Table.Cell>
                            <Table.Cell>
                                <Button
                                    color="secondary"
                                    size="sm"
                                    isLoading={revokeMutation.isPending && revokeMutation.variables === device.id}
                                    isDisabled={revokeMutation.isPending || revokeAllMutation.isPending}
                                    onPress={() => {
                                        if (window.confirm(t("revokeConfirm"))) {
                                            revokeMutation.mutate(device.id);
                                        }
                                    }}
                                >
                                    {t("revoke")}
                                </Button>
                            </Table.Cell>
                        </Table.Row>
                    )}
                </Table.Body>
            </Table>
        </TableCard.Root>
    );
}
