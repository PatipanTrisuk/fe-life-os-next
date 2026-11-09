"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ProgressBarBase } from "@/components/base/progress-indicators/progress-indicators";
import { billingApi, toApiError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import type { SubscriptionSnapshot } from "@/lib/types";
import { cx } from "@/utils/cx";

const FEATURE_KEYS = [
    "goals",
    "habits",
    "planner_per_day",
    "calendar",
    "notes",
    "finance",
    "reminders",
] as const;

function featureSlug(key: string) {
    return key.replace(/^limit\./, "");
}

export default function ProfileBillingPage() {
    const t = useTranslations("billing");
    const locale = useLocale();
    const queryClient = useQueryClient();

    const subscriptionQuery = useQuery({
        queryKey: queryKeys.billingSubscription,
        queryFn: async () => (await billingApi.subscription()).data,
    });

    const plansQuery = useQuery({
        queryKey: queryKeys.billingPlans,
        queryFn: async () => (await billingApi.plans()).data ?? [],
    });

    const featureLabel = (key: string) => {
        const slug = featureSlug(key);
        return (FEATURE_KEYS as readonly string[]).includes(slug) ? t(`features.${slug}`) : slug;
    };

    const limitLabel = (limit: number) => (limit < 0 ? t("unlimited") : String(limit));

    const onSuccess = (message: string) => async (res: { message?: string; data: SubscriptionSnapshot }) => {
        queryClient.setQueryData(queryKeys.billingSubscription, res.data);
        await queryClient.invalidateQueries({ queryKey: ["billing"] });
        notify.success(res.message || message);
    };

    const upgradeMutation = useMutation({
        mutationFn: () => billingApi.upgrade(),
        onSuccess: onSuccess(t("upgradeSuccess")),
    });

    const downgradeMutation = useMutation({
        mutationFn: () => billingApi.downgrade(),
        onSuccess: onSuccess(t("downgradeSuccess")),
    });

    const busy = upgradeMutation.isPending || downgradeMutation.isPending;

    if (subscriptionQuery.isLoading || plansQuery.isLoading) {
        return (
            <div className="flex justify-center py-16">
                <LoadingIndicator size="md" label={t("loading")} />
            </div>
        );
    }

    const error = subscriptionQuery.error
        ? toApiError(subscriptionQuery.error).message
        : plansQuery.error
          ? toApiError(plansQuery.error).message
          : null;

    if (error || !subscriptionQuery.data) {
        return <p className="text-sm text-error-primary">{error ?? t("loadFailed")}</p>;
    }

    const snapshot = subscriptionQuery.data;
    const plans = (plansQuery.data ?? []).filter((plan) => plan.is_active);
    const isPro = snapshot.plan_code === "pro";
    return (
        <div className="space-y-8">
            <section className="rounded-xl bg-primary p-5 ring-1 ring-secondary sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-tertiary">{t("currentPlan")}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h2 className="text-display-xs font-semibold text-primary">{snapshot.plan_name}</h2>
                            <Badge color={isPro ? "brand" : "gray"} size="sm">
                                {snapshot.plan_code}
                            </Badge>
                            <Badge color={snapshot.status === "active" ? "success" : "warning"} size="sm">
                                {snapshot.status}
                            </Badge>
                        </div>
                        <p className="mt-1 text-sm text-tertiary">
                            {t("startedAt", { date: formatDate(snapshot.started_at, { locale }) })}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {isPro ? (
                            <Button
                                color="secondary"
                                isLoading={downgradeMutation.isPending}
                                isDisabled={busy}
                                onPress={() => {
                                    if (window.confirm(t("downgradeConfirm"))) downgradeMutation.mutate();
                                }}
                            >
                                {t("downgrade")}
                            </Button>
                        ) : (
                            <Button
                                isLoading={upgradeMutation.isPending}
                                isDisabled={busy}
                                onPress={() => {
                                    if (window.confirm(t("upgradeConfirm"))) upgradeMutation.mutate();
                                }}
                            >
                                {t("upgrade")}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mt-6 border-t border-secondary pt-5">
                    <h3 className="text-md font-semibold text-primary">{t("usage")}</h3>
                    <p className="mt-0.5 text-sm text-tertiary">{t("usageHint")}</p>
                    <ul className="mt-4 grid gap-5 sm:grid-cols-2">
                        {snapshot.usage.map((item) => {
                            const unlimited = item.limit < 0;
                            const percent = unlimited || item.limit === 0 ? 0 : Math.min(100, (item.usage / item.limit) * 100);
                            const atLimit = !unlimited && item.limit > 0 && item.usage >= item.limit;
                            return (
                                <li key={item.feature}>
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="font-medium text-secondary">{featureLabel(item.feature)}</span>
                                        <span className={cx("tabular-nums", atLimit ? "text-error-primary" : "text-tertiary")}>
                                            {unlimited
                                                ? t("usageUnlimited", { usage: item.usage })
                                                : t("usageOf", { usage: item.usage, limit: item.limit })}
                                        </span>
                                    </div>
                                    <ProgressBarBase
                                        className="mt-2"
                                        value={unlimited ? 0 : percent}
                                        progressClassName={atLimit ? "bg-error-solid" : undefined}
                                    />
                                    {atLimit ? <p className="mt-1 text-xs text-error-primary">{t("limitReached")}</p> : null}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold text-primary">{t("plansTitle")}</h2>
                <p className="mt-0.5 text-sm text-tertiary">{t("plansSubtitle")}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {plans.map((plan) => {
                        const current = plan.code === snapshot.plan_code;
                        return (
                            <div
                                key={plan.code}
                                className={cx(
                                    "rounded-xl bg-primary p-5 ring-1",
                                    current ? "ring-2 ring-brand" : "ring-secondary",
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-md font-semibold text-primary">{plan.name}</h3>
                                    {current ? (
                                        <Badge color="brand" size="sm">
                                            {t("currentBadge")}
                                        </Badge>
                                    ) : null}
                                </div>
                                {plan.description ? (
                                    <p className="mt-1 text-sm text-tertiary">{plan.description}</p>
                                ) : null}
                                <ul className="mt-4 space-y-2 text-sm">
                                    {plan.entitlements.map((e) => (
                                        <li key={e.feature_key} className="flex justify-between gap-3">
                                            <span className="text-tertiary">{featureLabel(e.feature_key)}</span>
                                            <span className="font-medium text-primary tabular-nums">
                                                {limitLabel(e.limit_value)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
                {plans.length === 0 ? (
                    <p className="mt-4 text-sm text-tertiary">{t("noPlans")}</p>
                ) : null}
            </section>
        </div>
    );
}
