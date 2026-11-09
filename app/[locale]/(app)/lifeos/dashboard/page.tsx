"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { BarChart01, CheckCircle, Download01, Flag06, RefreshCcw01 } from "@untitledui/icons";
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
import { Tabs } from "@/components/application/tabs/tabs";
import { Button } from "@/components/base/buttons/button";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Link } from "@/i18n/navigation";
import { lifeosApi, toApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";

const STATUS_COLORS = [
    "text-utility-brand-600",
    "text-utility-brand-400",
    "text-utility-green-500",
    "text-utility-yellow-500",
    "text-utility-neutral-400",
];

const PRIORITY_COLORS = ["text-utility-red-500", "text-utility-yellow-500", "text-utility-brand-500"];

const CATEGORY_COLORS = [
    "text-utility-brand-700",
    "text-utility-brand-500",
    "text-utility-brand-400",
    "text-utility-brand-300",
    "text-utility-blue-500",
    "text-utility-neutral-400",
];

type DashboardTab = "goals" | "habits";

function ChartCard({
    title,
    description,
    children,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
}) {
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

function StatCards({ items }: { items: { label: string; value: string | number }[] }) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {items.map((item) => (
                <div key={item.label} className="rounded-xl bg-primary px-4 py-3 shadow-xs ring-1 ring-secondary">
                    <p className="text-xs font-medium text-tertiary">{item.label}</p>
                    <p className="mt-1 text-xl font-semibold text-primary">{item.value}</p>
                </div>
            ))}
        </div>
    );
}

export default function LifeOSDashboardPage() {
    const locale = useLocale();
    const t = useTranslations("dashboard");
    const isDesktop = useBreakpoint("lg");
    const [tab, setTab] = useState<DashboardTab>("goals");
    const [exporting, setExporting] = useState(false);

    const goalsQuery = useQuery({
        queryKey: queryKeys.goalsDashboard,
        queryFn: async () => {
            const res = await lifeosApi.dashboard();
            return res.data;
        },
    });

    const habitsQuery = useQuery({
        queryKey: queryKeys.habitsDashboard,
        queryFn: async () => {
            const res = await lifeosApi.habitsDashboard();
            return res.data;
        },
    });

    const goals = goalsQuery.data;
    const habits = habitsQuery.data;
    const loading = goalsQuery.isLoading || habitsQuery.isLoading;

    const exportPdf = async () => {
        setExporting(true);
        try {
            const { blob, fileName } = await lifeosApi.exportDashboardPdf(tab);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            notify.success(t("exportPdfSuccess"));
        } catch (error) {
            notify.error(toApiError(error).message || t("exportPdfFailed"));
        } finally {
            setExporting(false);
        }
    };

    const canExport =
        tab === "goals" ? Boolean(goals?.stats.total) : Boolean(habits?.stats.total);

    const refresh = () => {
        void goalsQuery.refetch();
        void habitsQuery.refetch();
    };

    const goalStatusData = useMemo(() => {
        if (!goals) return [];
        const map: Record<string, string> = {
            draft: t("status.draft"),
            active: t("status.active"),
            completed: t("status.completed"),
            cancelled: t("status.cancelled"),
            archived: t("status.archived"),
        };
        return goals.by_status.map((item, index) => ({
            name: map[item.key] ?? item.key,
            value: item.count,
            className: STATUS_COLORS[index % STATUS_COLORS.length],
        }));
    }, [goals, t]);

    const goalPriorityData = useMemo(() => {
        if (!goals) return [];
        const map: Record<string, string> = {
            low: t("priority.low"),
            medium: t("priority.medium"),
            high: t("priority.high"),
        };
        return goals.by_priority.map((item, index) => ({
            name: map[item.key] ?? item.key,
            value: item.count,
            className: PRIORITY_COLORS[index % PRIORITY_COLORS.length],
        }));
    }, [goals, t]);

    const goalCategoryData = useMemo(() => {
        if (!goals) return [];
        return goals.by_category.map((item, index) => ({
            name: item.key === "uncategorized" ? t("uncategorized") : item.key,
            count: item.count,
            className: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }));
    }, [goals, t]);

    const goalTrendData = useMemo(() => {
        if (!goals) return [];
        return goals.created_trend.map((item) => {
            const [year, month] = item.month.split("-").map(Number);
            const label = new Date(year, (month || 1) - 1, 1).toLocaleDateString(locale, {
                month: "short",
                year: "2-digit",
            });
            return {
                label,
                [t("seriesCreated")]: item.created,
                [t("seriesCompleted")]: item.completed,
            };
        });
    }, [goals, locale, t]);

    const goalProgressData = useMemo(() => {
        if (!goals) return [];
        return goals.progress_buckets.map((item) => ({
            bucket: item.bucket,
            [t("seriesCount")]: item.count,
        }));
    }, [goals, t]);

    const habitStatusData = useMemo(() => {
        if (!habits) return [];
        const map: Record<string, string> = {
            active: t("status.active"),
            paused: t("status.paused"),
            archived: t("status.archived"),
        };
        return habits.by_status.map((item, index) => ({
            name: map[item.key] ?? item.key,
            value: item.count,
            className: STATUS_COLORS[index % STATUS_COLORS.length],
        }));
    }, [habits, t]);

    const habitFrequencyData = useMemo(() => {
        if (!habits) return [];
        const map: Record<string, string> = {
            daily: t("frequency.daily"),
            weekly: t("frequency.weekly"),
        };
        return habits.by_frequency.map((item, index) => ({
            name: map[item.key] ?? item.key,
            value: item.count,
            className: PRIORITY_COLORS[index % PRIORITY_COLORS.length],
        }));
    }, [habits, t]);

    const habitCategoryData = useMemo(() => {
        if (!habits) return [];
        return habits.by_category.map((item, index) => ({
            name: item.key === "uncategorized" ? t("uncategorized") : item.key,
            count: item.count,
            className: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }));
    }, [habits, t]);

    const habitTrendData = useMemo(() => {
        if (!habits) return [];
        return habits.checkin_trend.map((item) => {
            const label = new Date(`${item.date}T00:00:00`).toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
            });
            return {
                label,
                [t("seriesCheckins")]: item.count,
            };
        });
    }, [habits, locale, t]);

    const habitStreakData = useMemo(() => {
        if (!habits) return [];
        return habits.streak_buckets.map((item) => ({
            bucket: item.bucket,
            [t("seriesCount")]: item.count,
        }));
    }, [habits, t]);

    const createdKey = t("seriesCreated");
    const completedKey = t("seriesCompleted");
    const countKey = t("seriesCount");
    const checkinsKey = t("seriesCheckins");

    if (loading) {
        return (
            <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
                <LoadingIndicator label={t("loading")} />
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-display-xs font-semibold text-primary">{t("title")}</h1>
                    <p className="mt-1 text-md text-tertiary">{t("subtitle")}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        color="secondary"
                        size="sm"
                        iconLeading={Download01}
                        isDisabled={exporting || !canExport}
                        isLoading={exporting}
                        onPress={() => void exportPdf()}
                    >
                        {t("exportPdf")}
                    </Button>
                    <Button color="secondary" size="sm" iconLeading={RefreshCcw01} onPress={refresh}>
                        {t("refresh")}
                    </Button>
                    <Button
                        href={tab === "habits" ? "/lifeos/habits" : "/lifeos/goals"}
                        size="sm"
                        iconLeading={tab === "habits" ? CheckCircle : Flag06}
                    >
                        {tab === "habits" ? t("goToHabits") : t("goToGoals")}
                    </Button>
                </div>
            </header>

            <Tabs
                selectedKey={tab}
                onSelectionChange={(key) => {
                    if (key === "goals" || key === "habits") setTab(key);
                }}
                className="gap-6"
            >
                <Tabs.List
                    type="button-border"
                    size="sm"
                    items={[
                        { id: "goals", label: t("tabGoals"), icon: Flag06, badge: goals?.stats.total },
                        { id: "habits", label: t("tabHabits"), icon: CheckCircle, badge: habits?.stats.total },
                    ]}
                >
                    {(item) => <Tabs.Item {...item} />}
                </Tabs.List>

                <Tabs.Panel id="goals" className="flex flex-col gap-6">
                    {!goals || goals.stats.total === 0 ? (
                        <EmptyState size="md">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={BarChart01} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{t("emptyTitle")}</EmptyState.Title>
                                <EmptyState.Description>{t("emptyDescription")}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button href="/lifeos/goals" size="md" iconLeading={Flag06}>
                                    {t("goToGoals")}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    ) : (
                        <>
                            <StatCards
                                items={[
                                    { label: t("statsTotal"), value: goals.stats.total },
                                    { label: t("statsActive"), value: goals.stats.active },
                                    { label: t("statsCompleted"), value: goals.stats.completed },
                                    { label: t("statsOverdue"), value: goals.stats.overdue },
                                    { label: t("statsAvg"), value: `${goals.stats.avg_progress}%` },
                                ]}
                            />

                            <div className="grid gap-4 xl:grid-cols-2">
                                <ChartCard title={t("trendTitle")} description={t("trendDescription")}>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                            <RechartsBarChart
                                                data={goalTrendData}
                                                margin={{ left: isDesktop ? 4 : 0, right: 8, top: 8, bottom: 0 }}
                                                barGap={4}
                                                maxBarSize={isDesktop ? 28 : 18}
                                            >
                                                <CartesianGrid vertical={false} stroke="currentColor" className="text-border-secondary" />
                                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                                <Tooltip content={<ChartTooltipContent />} formatter={(value) => Number(value).toLocaleString(locale)} cursor={{ className: "fill-utility-neutral-100 dark:fill-utility-neutral-800/40" }} />
                                                <Legend verticalAlign="top" align="right" content={<ChartLegendContent />} />
                                                <Bar dataKey={createdKey} fill="currentColor" className="text-utility-brand-600" radius={[6, 6, 0, 0]} />
                                                <Bar dataKey={completedKey} fill="currentColor" className="text-utility-green-500" radius={[6, 6, 0, 0]} />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard title={t("progressTitle")} description={t("progressDescription")}>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                            <RechartsBarChart data={goalProgressData} margin={{ left: isDesktop ? 4 : 0, right: 8, top: 8, bottom: 0 }} maxBarSize={isDesktop ? 36 : 24}>
                                                <CartesianGrid vertical={false} stroke="currentColor" className="text-border-secondary" />
                                                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                                <Tooltip content={<ChartTooltipContent />} formatter={(value) => Number(value).toLocaleString(locale)} cursor={{ className: "fill-utility-neutral-100 dark:fill-utility-neutral-800/40" }} />
                                                <Bar dataKey={countKey} fill="currentColor" className="text-utility-brand-500" radius={[6, 6, 0, 0]} />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard title={t("statusTitle")} description={t("statusDescription")}>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                            <PieChart>
                                                <Legend verticalAlign="middle" align="right" layout="vertical" content={<ChartLegendContent />} />
                                                <Tooltip content={<ChartTooltipContent isPieChart />} formatter={(value) => Number(value).toLocaleString(locale)} />
                                                <Pie
                                                    data={goalStatusData}
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
                                                    {goalStatusData.map((entry) => (
                                                        <Cell key={entry.name} fill="currentColor" className={entry.className} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard title={t("priorityTitle")} description={t("priorityDescription")}>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                            <PieChart>
                                                <Legend verticalAlign="middle" align="right" layout="vertical" content={<ChartLegendContent />} />
                                                <Tooltip content={<ChartTooltipContent isPieChart />} formatter={(value) => Number(value).toLocaleString(locale)} />
                                                <Pie
                                                    data={goalPriorityData}
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
                                                    {goalPriorityData.map((entry) => (
                                                        <Cell key={entry.name} fill="currentColor" className={entry.className} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>
                            </div>

                            <ChartCard title={t("categoryTitle")} description={t("categoryDescription")}>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                        <RechartsBarChart layout="vertical" data={goalCategoryData} margin={{ left: 8, right: 16, top: 8, bottom: 0 }} maxBarSize={22}>
                                            <CartesianGrid horizontal={false} stroke="currentColor" className="text-border-secondary" />
                                            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                            <YAxis type="category" dataKey="name" width={isDesktop ? 120 : 88} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                            <Tooltip content={<ChartTooltipContent />} formatter={(value) => Number(value).toLocaleString(locale)} cursor={{ className: "fill-utility-neutral-100 dark:fill-utility-neutral-800/40" }} />
                                            <Bar dataKey="count" name={countKey} radius={[0, 6, 6, 0]}>
                                                {goalCategoryData.map((entry) => (
                                                    <Cell key={entry.name} fill="currentColor" className={entry.className} />
                                                ))}
                                            </Bar>
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartCard>

                            <p className="text-sm text-tertiary">
                                <Link href="/lifeos/goals" className="font-medium text-brand-secondary hover:underline">
                                    {t("goToGoals")}
                                </Link>
                            </p>
                        </>
                    )}
                </Tabs.Panel>

                <Tabs.Panel id="habits" className="flex flex-col gap-6">
                    {!habits || habits.stats.total === 0 ? (
                        <EmptyState size="md">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={CheckCircle} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{t("emptyHabitsTitle")}</EmptyState.Title>
                                <EmptyState.Description>{t("emptyHabitsDescription")}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button href="/lifeos/habits" size="md" iconLeading={CheckCircle}>
                                    {t("goToHabits")}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    ) : (
                        <>
                            <StatCards
                                items={[
                                    { label: t("habitStatsActive"), value: habits.stats.active },
                                    { label: t("habitStatsDoneToday"), value: habits.stats.completed_today },
                                    { label: t("habitStatsPendingToday"), value: habits.stats.pending_today },
                                    { label: t("habitStatsAvgStreak"), value: habits.stats.avg_streak },
                                    { label: t("habitStatsBestStreak"), value: habits.stats.best_streak },
                                ]}
                            />

                            <div className="grid gap-4 xl:grid-cols-2">
                                <ChartCard title={t("habitCheckinTitle")} description={t("habitCheckinDescription")}>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                            <RechartsBarChart data={habitTrendData} margin={{ left: isDesktop ? 4 : 0, right: 8, top: 8, bottom: 0 }} maxBarSize={isDesktop ? 22 : 14}>
                                                <CartesianGrid vertical={false} stroke="currentColor" className="text-border-secondary" />
                                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-tertiary" interval="preserveStartEnd" />
                                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                                <Tooltip content={<ChartTooltipContent />} formatter={(value) => Number(value).toLocaleString(locale)} cursor={{ className: "fill-utility-neutral-100 dark:fill-utility-neutral-800/40" }} />
                                                <Bar dataKey={checkinsKey} fill="currentColor" className="text-utility-brand-600" radius={[6, 6, 0, 0]} />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard title={t("habitStreakTitle")} description={t("habitStreakDescription")}>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                            <RechartsBarChart data={habitStreakData} margin={{ left: isDesktop ? 4 : 0, right: 8, top: 8, bottom: 0 }} maxBarSize={isDesktop ? 36 : 24}>
                                                <CartesianGrid vertical={false} stroke="currentColor" className="text-border-secondary" />
                                                <XAxis dataKey="bucket" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={32} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                                <Tooltip content={<ChartTooltipContent />} formatter={(value) => Number(value).toLocaleString(locale)} cursor={{ className: "fill-utility-neutral-100 dark:fill-utility-neutral-800/40" }} />
                                                <Bar dataKey={countKey} fill="currentColor" className="text-utility-green-500" radius={[6, 6, 0, 0]} />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard title={t("habitStatusTitle")} description={t("habitStatusDescription")}>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                            <PieChart>
                                                <Legend verticalAlign="middle" align="right" layout="vertical" content={<ChartLegendContent />} />
                                                <Tooltip content={<ChartTooltipContent isPieChart />} formatter={(value) => Number(value).toLocaleString(locale)} />
                                                <Pie
                                                    data={habitStatusData}
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
                                                    {habitStatusData.map((entry) => (
                                                        <Cell key={entry.name} fill="currentColor" className={entry.className} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>

                                <ChartCard title={t("habitFrequencyTitle")} description={t("habitFrequencyDescription")}>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                            <PieChart>
                                                <Legend verticalAlign="middle" align="right" layout="vertical" content={<ChartLegendContent />} />
                                                <Tooltip content={<ChartTooltipContent isPieChart />} formatter={(value) => Number(value).toLocaleString(locale)} />
                                                <Pie
                                                    data={habitFrequencyData}
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
                                                    {habitFrequencyData.map((entry) => (
                                                        <Cell key={entry.name} fill="currentColor" className={entry.className} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </ChartCard>
                            </div>

                            <ChartCard title={t("habitCategoryTitle")} description={t("habitCategoryDescription")}>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                                        <RechartsBarChart layout="vertical" data={habitCategoryData} margin={{ left: 8, right: 16, top: 8, bottom: 0 }} maxBarSize={22}>
                                            <CartesianGrid horizontal={false} stroke="currentColor" className="text-border-secondary" />
                                            <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                            <YAxis type="category" dataKey="name" width={isDesktop ? 120 : 88} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "currentColor" }} className="text-tertiary" />
                                            <Tooltip content={<ChartTooltipContent />} formatter={(value) => Number(value).toLocaleString(locale)} cursor={{ className: "fill-utility-neutral-100 dark:fill-utility-neutral-800/40" }} />
                                            <Bar dataKey="count" name={countKey} radius={[0, 6, 6, 0]}>
                                                {habitCategoryData.map((entry) => (
                                                    <Cell key={entry.name} fill="currentColor" className={entry.className} />
                                                ))}
                                            </Bar>
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </ChartCard>

                            <p className="text-sm text-tertiary">
                                <Link href="/lifeos/habits" className="font-medium text-brand-secondary hover:underline">
                                    {t("goToHabits")}
                                </Link>
                            </p>
                        </>
                    )}
                </Tabs.Panel>
            </Tabs>
        </div>
    );
}
