"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseDate } from "@internationalized/date";
import { useLocale, useTranslations } from "next-intl";
import { DialogTrigger, Heading, Popover, type DateValue } from "react-aria-components";
import {
    ChevronDown,
    DotsVertical,
    Edit01,
    Eye,
    FilterLines,
    Flag06,
    LayoutGrid01,
    Plus,
    RefreshCcw01,
    Rows01,
    SearchLg,
    Trash01,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Dialog, Modal, ModalOverlay, MODAL_EXIT_MS } from "@/components/application/modals/modal";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { useRouter } from "@/i18n/navigation";
import { lifeosApi, toApiError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import {
    GOAL_PRIORITIES,
    GOAL_STATUSES,
    emptyGoalForm,
    formToCreatePayload,
    formToUpdatePayload,
    goalToForm,
    priorityBadgeColor,
    statusBadgeColor,
} from "@/lib/goals";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { adminSearchSchema, createGoalSchema, type AdminSearchInput, type GoalFormInput } from "@/lib/schemas";
import type { Goal } from "@/lib/types";
import { cx } from "@/utils/cx";

type DialogState =
    | { type: "none" }
    | { type: "form"; mode: "create" | "edit"; goal?: Goal }
    | { type: "delete"; goal: Goal };

type ViewMode = "card" | "table";

type GoalFilters = {
    status: string;
    priority: string;
};

const emptyFilters: GoalFilters = {
    status: "",
    priority: "",
};

function countActiveFilters(filters: GoalFilters) {
    return Object.values(filters).filter(Boolean).length;
}

export default function GoalsPage() {
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations("goals");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [appliedSearch, setAppliedSearch] = useState("");
    const [appliedFilters, setAppliedFilters] = useState<GoalFilters>(emptyFilters);
    const [draftFilters, setDraftFilters] = useState<GoalFilters>(emptyFilters);
    const [filterOpen, setFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("card");
    const [dialog, setDialog] = useState<DialogState>({ type: "none" });
    const [panelOpen, setPanelOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const listParams = useMemo(
        () => ({
            page,
            limit: pageSize,
            status: appliedFilters.status,
            priority: appliedFilters.priority,
            category: "",
            q: appliedSearch,
        }),
        [page, pageSize, appliedFilters, appliedSearch],
    );

    const activeFilterCount = countActiveFilters(appliedFilters);

    const {
        control: searchControl,
        handleSubmit: handleSearchSubmit,
        getValues: getSearchValues,
        reset: resetSearchForm,
    } = useForm<AdminSearchInput>({
        resolver: zodResolver(adminSearchSchema),
        defaultValues: { search: "" },
    });

    const listQuery = useQuery({
        queryKey: queryKeys.goals(listParams),
        queryFn: async () => {
            const res = await lifeosApi.listGoals(listParams);
            return { items: res.data ?? [], meta: res.meta };
        },
    });

    const goalSchema = useMemo(() => createGoalSchema(tValidation), [tValidation]);
    const form = useForm<GoalFormInput>({
        resolver: zodResolver(goalSchema),
        defaultValues: emptyGoalForm(),
    });

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const openDialog = (next: Exclude<DialogState, { type: "none" }>) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setDialog(next);
        setPanelOpen(true);
    };

    const closeDialog = (afterExit = false) => {
        setPanelOpen(false);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(
            () => {
                setDialog({ type: "none" });
                closeTimerRef.current = null;
            },
            afterExit ? MODAL_EXIT_MS : 0,
        );
    };

    const invalidate = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["lifeos", "goals"] }),
            queryClient.invalidateQueries({ queryKey: queryKeys.goalsDashboard }),
        ]);
    };

    const saveMutation = useMutation({
        mutationFn: async (values: GoalFormInput) => {
            if (dialog.type !== "form") throw new Error("invalid dialog");
            if (dialog.mode === "create") {
                return lifeosApi.createGoal(formToCreatePayload(values));
            }
            if (!dialog.goal) throw new Error("missing goal");
            return lifeosApi.updateGoal(dialog.goal.id, formToUpdatePayload(values, dialog.goal));
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("save"));
            closeDialog(true);
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (dialog.type !== "delete") throw new Error("invalid dialog");
            return lifeosApi.deleteGoal(dialog.goal.id);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("deleted"));
            closeDialog(true);
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const openCreate = () => {
        form.reset(emptyGoalForm());
        openDialog({ type: "form", mode: "create" });
    };

    const openEdit = (goal: Goal) => {
        form.reset(goalToForm(goal));
        openDialog({ type: "form", mode: "edit", goal });
    };

    const applySearch = (nextSearch = getSearchValues("search"), nextFilters = draftFilters) => {
        setPage(1);
        setAppliedSearch(nextSearch.trim());
        setAppliedFilters(nextFilters);
        setFilterOpen(false);
    };

    const clearFilters = () => {
        resetSearchForm({ search: "" });
        setDraftFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
        setAppliedSearch("");
        setPage(1);
        setFilterOpen(false);
    };

    const onSearch = handleSearchSubmit((values) => applySearch(values.search, draftFilters));

    const items = listQuery.data?.items ?? [];
    const total = listQuery.data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const loading = listQuery.isLoading;
    const hasQuery = Boolean(appliedSearch) || activeFilterCount > 0;

    const goalActions = (goal: Goal) => (
        <div className="flex shrink-0 items-center gap-1">
            <ButtonUtility
                size="xs"
                color="secondary"
                icon={Eye}
                tooltip={t("view")}
                onPress={() => router.push(`/lifeos/goals/${goal.id}`)}
            />
            <ButtonUtility
                size="xs"
                color="secondary"
                icon={Edit01}
                tooltip={t("edit")}
                onPress={() => openEdit(goal)}
            />
            <Dropdown.Root>
                <ButtonUtility size="xs" color="secondary" icon={DotsVertical} aria-label={t("actionMenu")} />
                <Dropdown.Popover className="w-min">
                    <Dropdown.Menu
                        onAction={(key) => {
                            if (key === "delete") openDialog({ type: "delete", goal });
                        }}
                    >
                        <Dropdown.Item id="delete" icon={Trash01} label={t("delete")} />
                    </Dropdown.Menu>
                </Dropdown.Popover>
            </Dropdown.Root>
        </div>
    );

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6">
            <TableCard.Root className="flex flex-1 flex-col">
                <TableCard.Header
                    title={t("tableTitle")}
                    badge={`${total}`}
                    description={t("tableDescription")}
                    contentTrailing={
                        <div className="flex items-center gap-3">
                            <Button size="sm" iconLeading={Plus} onPress={openCreate}>
                                {t("create")}
                            </Button>
                            <Dropdown.Root>
                                <Button
                                    color="secondary"
                                    size="sm"
                                    iconLeading={DotsVertical}
                                    aria-label={t("actionMenu")}
                                />
                                <Dropdown.Popover className="w-min">
                                    <Dropdown.Menu
                                        onAction={(key) => {
                                            if (key === "refresh") void listQuery.refetch();
                                        }}
                                    >
                                        <Dropdown.Item id="refresh" icon={RefreshCcw01} label={tCommon("refresh")} />
                                    </Dropdown.Menu>
                                </Dropdown.Popover>
                            </Dropdown.Root>
                        </div>
                    }
                />

                <form
                    className="flex flex-wrap gap-3 border-b border-secondary px-4 py-3 md:px-6"
                    onSubmit={onSearch}
                >
                    <div className="flex min-w-0 flex-1 flex-wrap gap-3">
                        <Controller
                            name="search"
                            control={searchControl}
                            render={({ field }) => (
                                <Input
                                    {...field}
                                    shortcut
                                    size="sm"
                                    aria-label={t("searchPlaceholder")}
                                    placeholder={tCommon("search")}
                                    icon={SearchLg}
                                    className="min-w-0 w-full flex-1"
                                />
                            )}
                        />
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <ButtonGroup
                            size="sm"
                            aria-label={t("viewMode")}
                            disallowEmptySelection
                            selectedKeys={new Set([viewMode])}
                            onSelectionChange={(keys) => {
                                const next = [...keys][0];
                                if (next === "card" || next === "table") setViewMode(next);
                            }}
                        >
                            <ButtonGroupItem id="card" iconLeading={LayoutGrid01} aria-label={t("viewCard")} />
                            <ButtonGroupItem id="table" iconLeading={Rows01} aria-label={t("viewTable")} />
                        </ButtonGroup>
                        <DialogTrigger
                            isOpen={filterOpen}
                            onOpenChange={(open) => {
                                setFilterOpen(open);
                                if (open) setDraftFilters(appliedFilters);
                            }}
                        >
                            <Button
                                type="button"
                                color="secondary"
                                size="sm"
                                iconLeading={FilterLines}
                                iconTrailing={ChevronDown}
                                className={cx(activeFilterCount > 0 && "ring-2 ring-brand")}
                            >
                                {activeFilterCount > 0 ? `${t("filters")} (${activeFilterCount})` : t("filters")}
                            </Button>
                            <Popover
                                placement="bottom end"
                                offset={8}
                                className={({ isEntering, isExiting }) =>
                                    cx(
                                        "w-[min(100vw-2rem,24rem)] origin-(--trigger-anchor-point) overflow-auto rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary_alt outline-hidden",
                                        isEntering &&
                                            "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
                                        isExiting &&
                                            "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
                                    )
                                }
                            >
                                <Dialog className="outline-hidden">
                                    <div className="space-y-3">
                                        <Heading slot="title" className="text-sm font-semibold text-primary">
                                            {t("filters")}
                                        </Heading>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <Select
                                                size="sm"
                                                label={t("filterStatus")}
                                                selectedKey={draftFilters.status || "__all__"}
                                                onSelectionChange={(key) =>
                                                    setDraftFilters((prev) => ({
                                                        ...prev,
                                                        status: !key || key === "__all__" ? "" : String(key),
                                                    }))
                                                }
                                                items={[
                                                    { id: "__all__", label: t("filterAll") },
                                                    ...GOAL_STATUSES.map((s) => ({
                                                        id: s,
                                                        label: t(`status.${s}`),
                                                    })),
                                                ]}
                                            >
                                                {(item) => <Select.Item id={item.id} label={item.label} />}
                                            </Select>
                                            <Select
                                                size="sm"
                                                label={t("filterPriority")}
                                                selectedKey={draftFilters.priority || "__all__"}
                                                onSelectionChange={(key) =>
                                                    setDraftFilters((prev) => ({
                                                        ...prev,
                                                        priority: !key || key === "__all__" ? "" : String(key),
                                                    }))
                                                }
                                                items={[
                                                    { id: "__all__", label: t("filterAll") },
                                                    ...GOAL_PRIORITIES.map((p) => ({
                                                        id: p,
                                                        label: t(`priority.${p}`),
                                                    })),
                                                ]}
                                            >
                                                {(item) => <Select.Item id={item.id} label={item.label} />}
                                            </Select>
                                        </div>
                                        <div className="flex justify-between gap-2 pt-1">
                                            <Button type="button" color="link-gray" size="sm" onPress={clearFilters}>
                                                {t("filterClear")}
                                            </Button>
                                            <Button type="button" size="sm" onPress={() => applySearch()}>
                                                {tCommon("search")}
                                            </Button>
                                        </div>
                                    </div>
                                </Dialog>
                            </Popover>
                        </DialogTrigger>
                    </div>
                </form>

                {loading ? (
                    <div className="flex flex-1 items-center justify-center py-16">
                        <LoadingIndicator size="md" label={t("loading")} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex min-h-[min(28rem,60dvh)] w-full flex-1 items-center justify-center px-8 py-12">
                        <EmptyState size="md">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon
                                    color="gray"
                                    theme="modern"
                                    icon={hasQuery ? SearchLg : Flag06}
                                />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>
                                    {hasQuery ? t("emptyTitle") : t("emptyNoGoalsTitle")}
                                </EmptyState.Title>
                                <EmptyState.Description>
                                    {hasQuery ? t("emptyDescription") : t("emptyNoGoalsDescription")}
                                </EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                {hasQuery ? (
                                    <Button size="md" color="secondary" onPress={clearFilters}>
                                        {t("clearSearch")}
                                    </Button>
                                ) : (
                                    <Button size="md" iconLeading={Plus} onPress={openCreate}>
                                        {t("create")}
                                    </Button>
                                )}
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : viewMode === "card" ? (
                    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                        {items.map((goal) => (
                            <article
                                key={goal.id}
                                className="flex flex-col gap-4 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary transition hover:ring-brand/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <button
                                            type="button"
                                            className="text-left font-semibold text-primary hover:text-brand-secondary"
                                            onClick={() => router.push(`/lifeos/goals/${goal.id}`)}
                                        >
                                            {goal.title}
                                        </button>
                                        {goal.description ? (
                                            <p className="mt-1 line-clamp-2 text-sm text-tertiary">{goal.description}</p>
                                        ) : null}
                                    </div>
                                    {goalActions(goal)}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <BadgeWithDot color={statusBadgeColor(goal.status)} size="sm">
                                        {t(`status.${goal.status}`)}
                                    </BadgeWithDot>
                                    <BadgeWithDot color={priorityBadgeColor(goal.priority)} size="sm">
                                        {t(`priority.${goal.priority}`)}
                                    </BadgeWithDot>
                                </div>

                                <div className="space-y-1.5">
                                    {goal.target_value != null ? (
                                        <p className="text-xs text-tertiary">
                                            {goal.current_value}/{goal.target_value}
                                            {goal.unit ? ` ${goal.unit}` : ""}
                                        </p>
                                    ) : null}
                                    <ProgressBar value={goal.progress} labelPosition="right" />
                                </div>

                                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-secondary pt-3 text-sm text-tertiary">
                                    <span>{goal.category || "—"}</span>
                                    <span>
                                        {goal.target_date ? formatDate(goal.target_date, { locale }) : "—"}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <Table aria-label={t("tableTitle")} size="sm" className="min-w-[56rem]">
                        <Table.Header>
                            <Table.Head id="title" label={t("colGoal")} isRowHeader />
                            <Table.Head id="status" label={t("colStatus")} />
                            <Table.Head id="priority" label={t("colPriority")} />
                            <Table.Head id="progress" label={t("colProgress")} />
                            <Table.Head id="category" label={t("colCategory")} />
                            <Table.Head id="target_date" label={t("colTargetDate")} />
                            <Table.Head
                                label={t("actions")}
                                className="sticky right-0 z-20 border-l border-secondary bg-secondary [&>div]:justify-center"
                            />
                        </Table.Header>
                        <Table.Body items={items}>
                            {(goal) => (
                                <Table.Row id={goal.id} className="group/row">
                                    <Table.Cell>
                                        <div>
                                            <p className="font-medium text-primary">{goal.title}</p>
                                            {goal.description ? (
                                                <p className="line-clamp-1 text-sm text-tertiary">{goal.description}</p>
                                            ) : null}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <BadgeWithDot color={statusBadgeColor(goal.status)} size="sm">
                                            {t(`status.${goal.status}`)}
                                        </BadgeWithDot>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <BadgeWithDot color={priorityBadgeColor(goal.priority)} size="sm">
                                            {t(`priority.${goal.priority}`)}
                                        </BadgeWithDot>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <div className="min-w-36 space-y-1">
                                            {goal.target_value != null ? (
                                                <p className="text-xs text-tertiary">
                                                    {goal.current_value}/{goal.target_value}
                                                    {goal.unit ? ` ${goal.unit}` : ""}
                                                </p>
                                            ) : null}
                                            <ProgressBar
                                                value={goal.progress}
                                                labelPosition="right"
                                                className="min-w-24"
                                            />
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span className="text-sm text-tertiary">{goal.category || "—"}</span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {goal.target_date ? formatDate(goal.target_date, { locale }) : "—"}
                                    </Table.Cell>
                                    <Table.Cell className="sticky right-0 z-10 border-l border-secondary bg-primary group-hover/row:bg-secondary">
                                        <div className="flex items-center justify-center">{goalActions(goal)}</div>
                                    </Table.Cell>
                                </Table.Row>
                            )}
                        </Table.Body>
                    </Table>
                )}

                <PaginationCardMinimal
                    page={page}
                    total={Math.max(totalPages, 1)}
                    pageSize={pageSize}
                    align="left"
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                    }}
                />
            </TableCard.Root>

            <ModalOverlay
                isOpen={panelOpen}
                onOpenChange={(open) => {
                    if (!open && !saveMutation.isPending && !deleteMutation.isPending) closeDialog(true);
                }}
                isDismissable={!saveMutation.isPending && !deleteMutation.isPending}
            >
                <Modal className={dialog.type === "form" ? "max-w-lg" : "max-w-md"}>
                    <Dialog
                        className={cx(
                            "p-6 sm:p-8",
                            dialog.type === "form" && "flex max-h-[inherit] flex-col !overflow-hidden",
                        )}
                    >
                        {dialog.type === "form" ? (
                            <form
                                className="flex min-h-0 flex-1 flex-col gap-5"
                                noValidate
                                onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
                            >
                                <div className="shrink-0">
                                    <Heading slot="title" className="text-lg font-semibold text-primary">
                                        {dialog.mode === "create" ? t("create") : t("edit")}
                                    </Heading>
                                </div>

                                <div className="scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                                    <Controller
                                        control={form.control}
                                        name="title"
                                        render={({ field, fieldState }) => (
                                            <Input
                                                label={t("titleLabel")}
                                                placeholder={tCommon("enterData")}
                                                value={field.value}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                isInvalid={fieldState.invalid}
                                                hint={fieldState.error?.message}
                                                isRequired
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="description"
                                        render={({ field, fieldState }) => (
                                            <TextArea
                                                label={t("descriptionLabel")}
                                                placeholder={tCommon("enterData")}
                                                value={field.value}
                                                onChange={field.onChange}
                                                onBlur={field.onBlur}
                                                isInvalid={fieldState.invalid}
                                                hint={fieldState.error?.message}
                                                rows={3}
                                            />
                                        )}
                                    />
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Controller
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <Select
                                                    label={t("statusLabel")}
                                                    selectedKey={field.value}
                                                    onSelectionChange={(key) => field.onChange(String(key))}
                                                    items={GOAL_STATUSES.map((s) => ({
                                                        id: s,
                                                        label: t(`status.${s}`),
                                                    }))}
                                                >
                                                    {(item) => <Select.Item id={item.id} label={item.label} />}
                                                </Select>
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="priority"
                                            render={({ field }) => (
                                                <Select
                                                    label={t("priorityLabel")}
                                                    selectedKey={field.value}
                                                    onSelectionChange={(key) => field.onChange(String(key))}
                                                    items={GOAL_PRIORITIES.map((p) => ({
                                                        id: p,
                                                        label: t(`priority.${p}`),
                                                    }))}
                                                >
                                                    {(item) => <Select.Item id={item.id} label={item.label} />}
                                                </Select>
                                            )}
                                        />
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Controller
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <Input
                                                    label={t("categoryLabel")}
                                                    placeholder={tCommon("enterData")}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="progress"
                                            render={({ field, fieldState }) => (
                                                <Input
                                                    label={t("progressLabel")}
                                                    placeholder={tCommon("enterData")}
                                                    type="number"
                                                    value={String(field.value)}
                                                    onChange={(v) => field.onChange(Number(v) || 0)}
                                                    isInvalid={fieldState.invalid}
                                                    hint={fieldState.error?.message}
                                                />
                                            )}
                                        />
                                    </div>
                                    <p className="text-xs text-tertiary">{t("valuesHint")}</p>
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <Controller
                                            control={form.control}
                                            name="current_value"
                                            render={({ field }) => (
                                                <Input
                                                    label={t("currentValueLabel")}
                                                    placeholder={tCommon("enterData")}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="target_value"
                                            render={({ field }) => (
                                                <Input
                                                    label={t("targetValueLabel")}
                                                    placeholder={tCommon("enterData")}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="unit"
                                            render={({ field }) => (
                                                <Input
                                                    label={t("unitLabel")}
                                                    placeholder={tCommon("enterData")}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Controller
                                            control={form.control}
                                            name="start_date"
                                            render={({ field }) => (
                                                <DatePicker
                                                    label={t("startDateLabel")}
                                                    value={field.value ? parseDate(field.value) : null}
                                                    onChange={(value: DateValue | null) =>
                                                        field.onChange(value ? value.toString() : "")
                                                    }
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="target_date"
                                            render={({ field }) => (
                                                <DatePicker
                                                    label={t("targetDateLabel")}
                                                    value={field.value ? parseDate(field.value) : null}
                                                    onChange={(value: DateValue | null) =>
                                                        field.onChange(value ? value.toString() : "")
                                                    }
                                                />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex shrink-0 justify-end gap-3">
                                    <Button
                                        type="button"
                                        color="secondary"
                                        onPress={() => closeDialog(true)}
                                        isDisabled={saveMutation.isPending}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button type="submit" isLoading={saveMutation.isPending}>
                                        {t("save")}
                                    </Button>
                                </div>
                            </form>
                        ) : null}

                        {dialog.type === "delete" ? (
                            <div className="space-y-5">
                                <div>
                                    <Heading slot="title" className="text-lg font-semibold text-primary">
                                        {t("delete")}
                                    </Heading>
                                    <p className="mt-2 text-sm text-tertiary">{t("deleteConfirm")}</p>
                                    <p className="mt-3 text-sm font-medium text-primary">{dialog.goal.title}</p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button
                                        color="secondary"
                                        onPress={() => closeDialog(true)}
                                        isDisabled={deleteMutation.isPending}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        color="primary-destructive"
                                        isLoading={deleteMutation.isPending}
                                        onPress={() => deleteMutation.mutate()}
                                    >
                                        {t("delete")}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </div>
    );
}
