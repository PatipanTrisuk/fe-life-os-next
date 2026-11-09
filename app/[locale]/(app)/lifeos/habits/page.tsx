"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { DialogTrigger, Heading, Popover } from "react-aria-components";
import {
    CheckCircle,
    ChevronDown,
    DotsVertical,
    Edit01,
    Eye,
    FilterLines,
    LayoutGrid01,
    Plus,
    RefreshCcw01,
    Rows01,
    SearchLg,
    Trash01,
} from "@untitledui/icons";
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
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { useRouter } from "@/i18n/navigation";
import { lifeosApi, toApiError } from "@/lib/api";
import {
    HABIT_FREQUENCIES,
    HABIT_STATUSES,
    emptyHabitForm,
    formToCreateHabitPayload,
    formToUpdateHabitPayload,
    habitStatusBadgeColor,
    habitToForm,
} from "@/lib/habits";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { adminSearchSchema, createHabitSchema, type AdminSearchInput, type HabitFormInput } from "@/lib/schemas";
import type { Habit } from "@/lib/types";
import { cx } from "@/utils/cx";

type DialogState =
    | { type: "none" }
    | { type: "form"; mode: "create" | "edit"; habit?: Habit }
    | { type: "delete"; habit: Habit };

type ViewMode = "card" | "table";

type HabitFilters = {
    status: string;
};

const emptyFilters: HabitFilters = { status: "" };

function countActiveFilters(filters: HabitFilters) {
    return Object.values(filters).filter(Boolean).length;
}

export default function HabitsPage() {
    const router = useRouter();
    const t = useTranslations("habits");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [appliedSearch, setAppliedSearch] = useState("");
    const [appliedFilters, setAppliedFilters] = useState<HabitFilters>(emptyFilters);
    const [draftFilters, setDraftFilters] = useState<HabitFilters>(emptyFilters);
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
        queryKey: queryKeys.habits(listParams),
        queryFn: async () => {
            const res = await lifeosApi.listHabits(listParams);
            return { items: res.data ?? [], meta: res.meta };
        },
    });

    const habitSchema = useMemo(() => createHabitSchema(tValidation), [tValidation]);
    const form = useForm<HabitFormInput>({
        resolver: zodResolver(habitSchema),
        defaultValues: emptyHabitForm(),
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
            queryClient.invalidateQueries({ queryKey: ["lifeos", "habits"] }),
            queryClient.invalidateQueries({ queryKey: queryKeys.habitsStats }),
        ]);
    };

    const saveMutation = useMutation({
        mutationFn: async (values: HabitFormInput) => {
            if (dialog.type !== "form") throw new Error("invalid dialog");
            if (dialog.mode === "create") {
                return lifeosApi.createHabit(formToCreateHabitPayload(values));
            }
            if (!dialog.habit) throw new Error("missing habit");
            return lifeosApi.updateHabit(dialog.habit.id, formToUpdateHabitPayload(values));
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
            return lifeosApi.deleteHabit(dialog.habit.id);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("deleted"));
            closeDialog(true);
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const checkInMutation = useMutation({
        mutationFn: async (habit: Habit) =>
            lifeosApi.checkInHabit(habit.id, { done: !habit.completed_today }),
        onSuccess: async (res) => {
            notify.success(res.message || t("checkedIn"));
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const openCreate = () => {
        form.reset(emptyHabitForm());
        openDialog({ type: "form", mode: "create" });
    };

    const openEdit = (habit: Habit) => {
        form.reset(habitToForm(habit));
        openDialog({ type: "form", mode: "edit", habit });
    };

    const applySearch = (nextSearch = getSearchValues("search"), nextFilters = draftFilters) => {
        setPage(1);
        setAppliedSearch(nextSearch.trim());
        setAppliedFilters(nextFilters);
        setFilterOpen(false);
    };

    const clearFilters = () => {
        setDraftFilters(emptyFilters);
        setAppliedFilters(emptyFilters);
        setAppliedSearch("");
        resetSearchForm({ search: "" });
        setPage(1);
        setFilterOpen(false);
    };

    const onSearch = handleSearchSubmit((values) => applySearch(values.search, draftFilters));

    const items = listQuery.data?.items ?? [];
    const total = listQuery.data?.meta.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const loading = listQuery.isLoading;
    const hasQuery = Boolean(appliedSearch) || activeFilterCount > 0;

    const habitActions = (habit: Habit) => (
        <div className="flex items-center gap-1">
            <ButtonUtility
                size="xs"
                color="secondary"
                icon={CheckCircle}
                tooltip={habit.completed_today ? t("uncheckToday") : t("checkToday")}
                className={habit.completed_today ? "text-fg-success-primary" : undefined}
                isDisabled={habit.status !== "active" || checkInMutation.isPending}
                onPress={() => checkInMutation.mutate(habit)}
            />
            <ButtonUtility
                size="xs"
                color="secondary"
                icon={Eye}
                tooltip={t("view")}
                onPress={() => router.push(`/lifeos/habits/${habit.id}`)}
            />
            <ButtonUtility size="xs" color="secondary" icon={Edit01} tooltip={t("edit")} onPress={() => openEdit(habit)} />
            <Dropdown.Root>
                <ButtonUtility size="xs" color="secondary" icon={DotsVertical} aria-label={t("actionMenu")} />
                <Dropdown.Popover className="w-min">
                    <Dropdown.Menu
                        onAction={(key) => {
                            if (key === "delete") openDialog({ type: "delete", habit });
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
                                <Button color="secondary" size="sm" iconLeading={DotsVertical} aria-label={t("actionMenu")} />
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

                <form className="flex flex-wrap gap-3 border-b border-secondary px-4 py-3 md:px-6" onSubmit={onSearch}>
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
                                        "w-[min(100vw-2rem,20rem)] origin-(--trigger-anchor-point) overflow-auto rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary_alt outline-hidden",
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
                                        <Select
                                            size="sm"
                                            label={t("filterStatus")}
                                            selectedKey={draftFilters.status || "__all__"}
                                            onSelectionChange={(key) =>
                                                setDraftFilters({
                                                    status: !key || key === "__all__" ? "" : String(key),
                                                })
                                            }
                                            items={[
                                                { id: "__all__", label: t("filterAll") },
                                                ...HABIT_STATUSES.map((s) => ({ id: s, label: t(`status.${s}`) })),
                                            ]}
                                        >
                                            {(item) => <Select.Item id={item.id} label={item.label} />}
                                        </Select>
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
                                    icon={hasQuery ? SearchLg : CheckCircle}
                                />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>
                                    {hasQuery ? t("emptyTitle") : t("emptyNoHabitsTitle")}
                                </EmptyState.Title>
                                <EmptyState.Description>
                                    {hasQuery ? t("emptyDescription") : t("emptyNoHabitsDescription")}
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
                        {items.map((habit) => (
                            <article
                                key={habit.id}
                                className="flex flex-col gap-4 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary transition hover:ring-brand/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <button
                                            type="button"
                                            className="text-left font-semibold text-primary hover:text-brand-secondary"
                                            onClick={() => router.push(`/lifeos/habits/${habit.id}`)}
                                        >
                                            {habit.title}
                                        </button>
                                        {habit.description ? (
                                            <p className="mt-1 line-clamp-2 text-sm text-tertiary">{habit.description}</p>
                                        ) : null}
                                    </div>
                                    {habitActions(habit)}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <BadgeWithDot color={habitStatusBadgeColor(habit.status)} size="sm">
                                        {t(`status.${habit.status}`)}
                                    </BadgeWithDot>
                                    <BadgeWithDot color="gray" size="sm">
                                        {t(`frequency.${habit.frequency}`)}
                                    </BadgeWithDot>
                                    {habit.completed_today ? (
                                        <BadgeWithDot color="success" size="sm">
                                            {t("doneToday")}
                                        </BadgeWithDot>
                                    ) : null}
                                </div>

                                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-secondary pt-3 text-sm text-tertiary">
                                    <span>{habit.category || "—"}</span>
                                    <span>
                                        {t("streak")}: {habit.current_streak} · {t("best")}: {habit.best_streak}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <Table aria-label={t("tableTitle")} size="sm" className="min-w-[52rem]">
                        <Table.Header>
                            <Table.Head id="title" label={t("colHabit")} isRowHeader />
                            <Table.Head id="status" label={t("colStatus")} />
                            <Table.Head id="frequency" label={t("colFrequency")} />
                            <Table.Head id="streak" label={t("colStreak")} />
                            <Table.Head id="today" label={t("colToday")} />
                            <Table.Head
                                label={t("actions")}
                                className="sticky right-0 z-20 border-l border-secondary bg-secondary [&>div]:justify-center"
                            />
                        </Table.Header>
                        <Table.Body items={items}>
                            {(habit) => (
                                <Table.Row id={habit.id} className="group/row">
                                    <Table.Cell>
                                        <div>
                                            <p className="font-medium text-primary">{habit.title}</p>
                                            {habit.description ? (
                                                <p className="line-clamp-1 text-sm text-tertiary">{habit.description}</p>
                                            ) : null}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <BadgeWithDot color={habitStatusBadgeColor(habit.status)} size="sm">
                                            {t(`status.${habit.status}`)}
                                        </BadgeWithDot>
                                    </Table.Cell>
                                    <Table.Cell>{t(`frequency.${habit.frequency}`)}</Table.Cell>
                                    <Table.Cell>
                                        {habit.current_streak} / {habit.best_streak}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {habit.completed_today ? t("doneToday") : t("pendingToday")}
                                    </Table.Cell>
                                    <Table.Cell className="sticky right-0 z-10 border-l border-secondary bg-primary group-hover/row:bg-secondary">
                                        <div className="flex justify-center">{habitActions(habit)}</div>
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
                    <Dialog className={cx("p-6 sm:p-8", dialog.type === "form" && "flex max-h-[inherit] flex-col !overflow-hidden")}>
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
                                                    items={HABIT_STATUSES.map((s) => ({ id: s, label: t(`status.${s}`) }))}
                                                >
                                                    {(item) => <Select.Item id={item.id} label={item.label} />}
                                                </Select>
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="frequency"
                                            render={({ field }) => (
                                                <Select
                                                    label={t("frequencyLabel")}
                                                    selectedKey={field.value}
                                                    onSelectionChange={(key) => field.onChange(String(key))}
                                                    items={HABIT_FREQUENCIES.map((f) => ({
                                                        id: f,
                                                        label: t(`frequency.${f}`),
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
                                            name="target_count"
                                            render={({ field, fieldState }) => (
                                                <Input
                                                    label={t("targetCountLabel")}
                                                    type="number"
                                                    value={String(field.value)}
                                                    onChange={(v) => field.onChange(Number(v) || 1)}
                                                    onBlur={field.onBlur}
                                                    isInvalid={fieldState.invalid}
                                                    hint={fieldState.error?.message || t("targetCountHint")}
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="category"
                                            render={({ field, fieldState }) => (
                                                <Input
                                                    label={t("categoryLabel")}
                                                    placeholder={tCommon("enterData")}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    isInvalid={fieldState.invalid}
                                                    hint={fieldState.error?.message}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex shrink-0 justify-end gap-3 border-t border-secondary pt-4">
                                    <Button
                                        type="button"
                                        color="secondary"
                                        isDisabled={saveMutation.isPending}
                                        onPress={() => closeDialog(true)}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button type="submit" isLoading={saveMutation.isPending}>
                                        {t("save")}
                                    </Button>
                                </div>
                            </form>
                        ) : dialog.type === "delete" ? (
                            <div className="space-y-5">
                                <Heading slot="title" className="text-lg font-semibold text-primary">
                                    {t("delete")}
                                </Heading>
                                <p className="text-sm text-tertiary">{t("deleteConfirm")}</p>
                                <div className="flex justify-end gap-3">
                                    <Button
                                        color="secondary"
                                        isDisabled={deleteMutation.isPending}
                                        onPress={() => closeDialog(true)}
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
