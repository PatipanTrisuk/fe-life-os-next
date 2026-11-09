"use client";

import { use, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, CheckCircle, Edit01 } from "@untitledui/icons";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Link, useRouter } from "@/i18n/navigation";
import { lifeosApi, toApiError } from "@/lib/api";
import { habitStatusBadgeColor } from "@/lib/habits";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { cx } from "@/utils/cx";

type Props = {
    params: Promise<{ id: string }>;
};

function lastNDates(n: number) {
    const out: string[] = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        out.push(d.toISOString().slice(0, 10));
    }
    return out;
}

export default function HabitDetailPage({ params }: Props) {
    const { id } = use(params);
    const router = useRouter();
    const t = useTranslations("habits");
    const queryClient = useQueryClient();

    const habitQuery = useQuery({
        queryKey: queryKeys.habit(id),
        queryFn: async () => {
            const res = await lifeosApi.getHabit(id);
            return res.data;
        },
    });

    const checkInMutation = useMutation({
        mutationFn: async (done: boolean) => lifeosApi.checkInHabit(id, { done }),
        onSuccess: async (res) => {
            notify.success(res.message || t("checkedIn"));
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.habit(id) }),
                queryClient.invalidateQueries({ queryKey: ["lifeos", "habits"] }),
                queryClient.invalidateQueries({ queryKey: queryKeys.habitsStats }),
            ]);
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const habit = habitQuery.data;
    const logMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const log of habit?.logs ?? []) {
            map.set(log.log_date, log.count);
        }
        return map;
    }, [habit?.logs]);

    const days = useMemo(() => lastNDates(42), []);

    if (habitQuery.isLoading) {
        return (
            <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
                <LoadingIndicator label={t("detailLoading")} />
            </div>
        );
    }

    if (!habit) {
        return (
            <div className="flex min-h-[calc(100dvh-8rem)] flex-col items-center justify-center gap-4">
                <p className="text-md text-tertiary">{t("notFound")}</p>
                <Button href="/lifeos/habits" color="secondary" iconLeading={ArrowLeft}>
                    {t("backToList")}
                </Button>
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Button color="link-gray" size="sm" iconLeading={ArrowLeft} href="/lifeos/habits">
                        {t("backToList")}
                    </Button>
                    <h1 className="mt-2 text-display-xs font-semibold text-primary">{habit.title}</h1>
                    {habit.description ? <p className="mt-1 text-md text-tertiary">{habit.description}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <BadgeWithDot color={habitStatusBadgeColor(habit.status)} size="sm">
                            {t(`status.${habit.status}`)}
                        </BadgeWithDot>
                        <BadgeWithDot color="gray" size="sm">
                            {t(`frequency.${habit.frequency}`)}
                        </BadgeWithDot>
                        {habit.category ? (
                            <BadgeWithDot color="brand" size="sm">
                                {habit.category}
                            </BadgeWithDot>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        color={habit.completed_today ? "secondary" : "primary"}
                        iconLeading={CheckCircle}
                        isDisabled={habit.status !== "active" || checkInMutation.isPending}
                        isLoading={checkInMutation.isPending}
                        onPress={() => checkInMutation.mutate(!habit.completed_today)}
                    >
                        {habit.completed_today ? t("uncheckToday") : t("checkToday")}
                    </Button>
                    <Button
                        size="sm"
                        color="secondary"
                        iconLeading={Edit01}
                        onPress={() => router.push("/lifeos/habits")}
                    >
                        {t("edit")}
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    { label: t("streak"), value: habit.current_streak },
                    { label: t("best"), value: habit.best_streak },
                    {
                        label: t("colToday"),
                        value: habit.completed_today ? t("doneToday") : t("pendingToday"),
                    },
                ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-primary px-4 py-3 shadow-xs ring-1 ring-secondary">
                        <p className="text-xs font-medium text-tertiary">{item.label}</p>
                        <p className="mt-1 text-xl font-semibold text-primary">{item.value}</p>
                    </div>
                ))}
            </div>

            <section className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
                <h2 className="text-md font-semibold text-primary">{t("historyTitle")}</h2>
                <p className="mt-0.5 text-sm text-tertiary">{t("historyDescription")}</p>
                <div className="mt-4 grid grid-cols-7 gap-2">
                    {days.map((day) => {
                        const count = logMap.get(day) ?? 0;
                        const done = count >= habit.target_count;
                        const isToday = day === new Date().toISOString().slice(0, 10);
                        return (
                            <button
                                key={day}
                                type="button"
                                title={`${day}${count ? ` · ${count}` : ""}`}
                                className={cx(
                                    "aspect-square rounded-lg text-[10px] font-medium transition",
                                    done
                                        ? "bg-brand-solid text-white"
                                        : count > 0
                                          ? "bg-brand-primary text-brand-secondary"
                                          : "bg-secondary text-quaternary ring-1 ring-secondary",
                                    isToday && "ring-2 ring-brand",
                                )}
                                disabled={!isToday || habit.status !== "active" || checkInMutation.isPending}
                                onClick={() => {
                                    if (!isToday || habit.status !== "active") return;
                                    checkInMutation.mutate(!habit.completed_today);
                                }}
                            >
                                {Number(day.slice(-2))}
                            </button>
                        );
                    })}
                </div>
            </section>

            <p className="text-sm text-tertiary">
                <Link href="/lifeos/habits" className="font-medium text-brand-secondary hover:underline">
                    {t("backToList")}
                </Link>
            </p>
        </div>
    );
}
