"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { LineChartUp01, RefreshCcw01 } from "@untitledui/icons";
import {
    Bar,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    BarChart as RechartsBarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { ChartLegendContent, ChartTooltipContent } from "@/components/application/charts/charts-base";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Button } from "@/components/base/buttons/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Link } from "@/i18n/navigation";
import { lifeosApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

const COLORS = [
    "text-utility-brand-600",
    "text-utility-brand-400",
    "text-utility-green-500",
    "text-utility-yellow-500",
    "text-utility-neutral-400",
];

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary">
            <div className="mb-4">
                <h2 className="text-md font-semibold text-primary">{title}</h2>
                <p className="mt-0.5 text-sm text-tertiary">{description}</p>
            </div>
            {children}
        </section>
    );
}

export default function LifeAnalyticsPage() {
    const locale = useLocale();
    const t = useTranslations("analytics");
    const isDesktop = useBreakpoint("lg");

    const analyticsQuery = useQuery({
        queryKey: queryKeys.lifeAnalytics,
        queryFn: async () => {
            const res = await lifeosApi.lifeAnalytics();
            return res.data;
        },
    });

    const data = analyticsQuery.data;
    const overview = data?.overview;

    const weeklyData = useMemo(() => {
        if (!data) return [];
        return data.weekly_activity.map((item) => {
            const label = new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, {
                weekday: "short",
                day: "numeric",
            });
            return {
                label,
                [t("seriesHabits")]: item.habits_completed,
                [t("seriesPlanner")]: item.planner_done,
            };
        });
    }, [data, locale, t]);

    const plannerTrend = useMemo(() => {
        if (!data) return [];
        return data.planner_trend.map((item) => {
            const label = new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
            });
            return { label, [t("seriesPlanner")]: item.count };
        });
    }, [data, locale, t]);

    const goalsStatusData = useMemo(() => {
        if (!data) return [];
        const map: Record<string, string> = {
            draft: t("goalStatus.draft"),
            active: t("goalStatus.active"),
            completed: t("goalStatus.completed"),
            cancelled: t("goalStatus.cancelled"),
            archived: t("goalStatus.archived"),
        };
        return data.goals_by_status.map((item, index) => ({
            name: map[item.key] ?? item.key,
            value: item.count,
            className: COLORS[index % COLORS.length],
        }));
    }, [data, t]);

    const habitsStatusData = useMemo(() => {
        if (!data) return [];
        const map: Record<string, string> = {
            active: t("habitStatus.active"),
            paused: t("habitStatus.paused"),
            archived: t("habitStatus.archived"),
        };
        return data.habits_by_status.map((item, index) => ({
            name: map[item.key] ?? item.key,
            value: item.count,
            className: COLORS[index % COLORS.length],
        }));
    }, [data, t]);

    const habitsKey = t("seriesHabits");
    const plannerKey = t("seriesPlanner");

    if (analyticsQuery.isLoading) {
        return (
            <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
                <LoadingIndicator label={t("loading")} />
            </div>
        );
    }

    const empty =
        !overview ||
        (overview.goals_total === 0 && overview.habits_active === 0 && overview.planner_total_today === 0);

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-display-xs font-semibold text-primary">{t("title")}</h1>
                    <p className="mt-1 text-md text-tertiary">{t("subtitle")}</p>
                </div>
                <Button color="secondary" size="sm" iconLeading={RefreshCcw01} onPress={() => void analyticsQuery.refetch()}>
                    {t("refresh")}
                </Button>
            </header>

            {empty ? (
                <EmptyState size="md">
                    <EmptyState.Header>
                        <EmptyState.FeaturedIcon icon={LineChartUp01} color="gray" theme="modern" />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>{t("emptyTitle")}</EmptyState.Title>
                        <EmptyState.Description>{t("emptyDescription")}</EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer>
                        <div className="flex flex-wrap gap-2">
                            <Button href="/lifeos/goals" size="md">
                                {t("goGoals")}
                            </Button>
                            <Button href="/lifeos/habits" size="md" color="secondary">
                                {t("goHabits")}
                            </Button>
                            <Button href="/lifeos/planner" size="md" color="secondary">
                                {t("goPlanner")}
                            </Button>
                        </div>
                    </EmptyState.Footer>
                </EmptyState>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: t("focusScore"), value: overview.focus_score },
                            { label: t("goalsActive"), value: overview.goals_active },
                            { label: t("habitsDoneToday"), value: overview.habits_done_today },
                            { label: t("plannerCompletion"), value: `${overview.planner_completion_today}%` },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl bg-primary px-4 py-3 shadow-xs ring-1 ring-secondary">
                                <p className="text-xs font-medium text-tertiary">{item.label}</p>
                                <p className="mt-1 text-xl font-semibold text-primary">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: t("goalsProgress"), value: `${overview.goals_avg_progress}%` },
                            { label: t("habitsPending"), value: overview.habits_pending_today },
                            { label: t("habitsBestStreak"), value: overview.habits_best_streak },
                            {
                                label: t("plannerToday"),
                                value: `${overview.planner_done_today}/${overview.planner_total_today}`,
                            },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl bg-primary px-4 py-3 shadow-xs ring-1 ring-secondary">
                                <p className="text-xs font-medium text-tertiary">{item.label}</p>
                                <p className="mt-1 text-xl font-semibold text-primary">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                        <ChartCard title={t("weeklyTitle")} description={t("weeklyDescription")}>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                    <RechartsBarChart data={weeklyData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }} barGap={4} maxBarSize={isDesktop ? 28 : 18}>
                                        <CartesianGrid vertical={false} stroke="currentColor" className="text-border-secondary" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                        <Tooltip content={<ChartTooltipContent />} formatter={(value) => Number(value).toLocaleString(locale)} cursor={{ className: "fill-utility-neutral-100 dark:fill-utility-neutral-800/40" }} />
                                        <Legend verticalAlign="top" align="right" content={<ChartLegendContent />} />
                                        <Bar dataKey={habitsKey} fill="currentColor" className="text-utility-brand-600" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey={plannerKey} fill="currentColor" className="text-utility-green-500" radius={[6, 6, 0, 0]} />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        <ChartCard title={t("plannerTrendTitle")} description={t("plannerTrendDescription")}>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                    <RechartsBarChart data={plannerTrend} margin={{ left: 4, right: 8, top: 8, bottom: 0 }} maxBarSize={isDesktop ? 22 : 14}>
                                        <CartesianGrid vertical={false} stroke="currentColor" className="text-border-secondary" />
                                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-tertiary" interval="preserveStartEnd" />
                                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                        <Tooltip content={<ChartTooltipContent />} formatter={(value) => Number(value).toLocaleString(locale)} cursor={{ className: "fill-utility-neutral-100 dark:fill-utility-neutral-800/40" }} />
                                        <Bar dataKey={plannerKey} fill="currentColor" className="text-utility-brand-500" radius={[6, 6, 0, 0]} />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        <ChartCard title={t("goalsStatusTitle")} description={t("goalsStatusDescription")}>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                    <PieChart>
                                        <Legend verticalAlign="middle" align="right" layout="vertical" content={<ChartLegendContent />} />
                                        <Tooltip content={<ChartTooltipContent isPieChart />} formatter={(value) => Number(value).toLocaleString(locale)} />
                                        <Pie
                                            data={goalsStatusData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx={isDesktop ? "40%" : "50%"}
                                            cy="50%"
                                            innerRadius={isDesktop ? 58 : 48}
                                            outerRadius={isDesktop ? 88 : 72}
                                            paddingAngle={2}
                                            strokeWidth={2}
                                            stroke="currentColor"
                                            className="stroke-bg-primary"
                                        >
                                            {goalsStatusData.map((entry) => (
                                                <Cell key={entry.name} fill="currentColor" className={entry.className} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>

                        <ChartCard title={t("habitsStatusTitle")} description={t("habitsStatusDescription")}>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                    <PieChart>
                                        <Legend verticalAlign="middle" align="right" layout="vertical" content={<ChartLegendContent />} />
                                        <Tooltip content={<ChartTooltipContent isPieChart />} formatter={(value) => Number(value).toLocaleString(locale)} />
                                        <Pie
                                            data={habitsStatusData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx={isDesktop ? "40%" : "50%"}
                                            cy="50%"
                                            innerRadius={isDesktop ? 58 : 48}
                                            outerRadius={isDesktop ? 88 : 72}
                                            paddingAngle={2}
                                            strokeWidth={2}
                                            stroke="currentColor"
                                            className="stroke-bg-primary"
                                        >
                                            {habitsStatusData.map((entry) => (
                                                <Cell key={entry.name} fill="currentColor" className={entry.className} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </ChartCard>
                    </div>

                    <p className="text-sm text-tertiary">
                        <Link href="/lifeos/dashboard" className="font-medium text-brand-secondary hover:underline">
                            {t("goDashboard")}
                        </Link>
                    </p>
                </>
            )}
        </div>
    );
}
