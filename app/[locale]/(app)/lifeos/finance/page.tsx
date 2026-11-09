"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { DialogTrigger, Heading, Popover, type Key } from "react-aria-components";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CoinsStacked01,
    DotsVertical,
    Edit01,
    FilterLines,
    Plus,
    RefreshCcw01,
    SearchLg,
    Trash01,
} from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { lifeosApi, toApiError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { fromDateString, localDateString, toDateString } from "@/lib/lifeos-dates";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { adminSearchSchema, createFinanceSchema, type AdminSearchInput, type FinanceFormInput } from "@/lib/schemas";
import type { FinanceKind, FinanceTransaction } from "@/lib/types";
import { useModalState } from "@/lib/use-modal-state";
import { cx } from "@/utils/cx";

type DialogState =
    | { type: "form"; mode: "create" | "edit"; item?: FinanceTransaction }
    | { type: "delete"; item: FinanceTransaction };

type FinanceFilters = {
    kind: string;
};

const KINDS: FinanceKind[] = ["income", "expense"];
const DEFAULT_CURRENCY = "THB";
const emptyFilters: FinanceFilters = { kind: "" };

function emptyForm(kind: FinanceKind = "expense"): FinanceFormInput {
    return {
        kind,
        amount: "",
        currency: DEFAULT_CURRENCY,
        category: "",
        note: "",
        occurred_on: localDateString(new Date()),
    };
}

function onSelectKey(key: Key | null, onChange: (value: string) => void) {
    if (key == null) return;
    onChange(String(key));
}

function formatMoney(value: number, currency: string, locale: string) {
    try {
        return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
    } catch {
        return `${value.toLocaleString(locale, { minimumFractionDigits: 2 })} ${currency}`;
    }
}

function countActiveFilters(filters: FinanceFilters) {
    return Object.values(filters).filter(Boolean).length;
}

export default function FinancePage() {
    const locale = useLocale();
    const t = useTranslations("finance");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();

    const [cursor, setCursor] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [appliedSearch, setAppliedSearch] = useState("");
    const [appliedFilters, setAppliedFilters] = useState<FinanceFilters>(emptyFilters);
    const [draftFilters, setDraftFilters] = useState<FinanceFilters>(emptyFilters);
    const [filterOpen, setFilterOpen] = useState(false);

    const { dialog, open, openDialog, closeDialog } = useModalState<DialogState>();

    const from = localDateString(new Date(cursor.year, cursor.month, 1));
    const to = localDateString(new Date(cursor.year, cursor.month + 1, 0));
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

    const schema = useMemo(() => createFinanceSchema(tValidation), [tValidation]);
    const form = useForm<FinanceFormInput>({
        resolver: zodResolver(schema),
        defaultValues: emptyForm(),
    });

    const listParams = useMemo(
        () => ({
            page,
            limit: pageSize,
            kind: appliedFilters.kind,
            category: appliedSearch,
            from,
            to,
        }),
        [page, pageSize, appliedFilters.kind, appliedSearch, from, to],
    );

    const listQuery = useQuery({
        queryKey: queryKeys.finance(listParams),
        queryFn: () => lifeosApi.listFinance(listParams),
        placeholderData: keepPreviousData,
    });

    const statsQuery = useQuery({
        queryKey: queryKeys.financeStats(from, to),
        queryFn: async () => {
            const res = await lifeosApi.financeStats({ from, to });
            return res.data;
        },
    });

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.financeAll });
    };

    const saveMutation = useMutation({
        mutationFn: async (values: FinanceFormInput) => {
            if (!dialog || dialog.type !== "form") throw new Error("invalid dialog");
            const payload = {
                kind: values.kind,
                amount: Number(values.amount),
                currency: values.currency.trim().toUpperCase(),
                category: values.category.trim(),
                note: values.note.trim(),
                occurred_on: values.occurred_on,
            };
            if (dialog.mode === "create") return lifeosApi.createFinance(payload);
            if (!dialog.item) throw new Error("missing transaction");
            return lifeosApi.updateFinance(dialog.item.id, payload);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("save"));
            closeDialog();
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!dialog || dialog.type !== "delete") throw new Error("invalid dialog");
            return lifeosApi.deleteFinance(dialog.item.id);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("deleted"));
            closeDialog();
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const submitForm = form.handleSubmit((values) => saveMutation.mutate(values));
    const busy = saveMutation.isPending || deleteMutation.isPending;

    const items = listQuery.data?.data ?? [];
    const total = listQuery.data?.meta?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const stats = statsQuery.data;
    const hasQuery = Boolean(appliedSearch) || activeFilterCount > 0;
    const loading = listQuery.isLoading;

    const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
    });

    const shiftMonth = (delta: number) => {
        const next = new Date(cursor.year, cursor.month + delta, 1);
        setCursor({ year: next.getFullYear(), month: next.getMonth() });
        setPage(1);
    };

    const openCreate = () => {
        form.reset(emptyForm(appliedFilters.kind === "income" ? "income" : "expense"));
        openDialog({ type: "form", mode: "create" });
    };

    const openEdit = (item: FinanceTransaction) => {
        form.reset({
            kind: item.kind,
            amount: String(item.amount),
            currency: item.currency || DEFAULT_CURRENCY,
            category: item.category,
            note: item.note,
            occurred_on: item.occurred_on.slice(0, 10),
        });
        openDialog({ type: "form", mode: "edit", item });
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

    const summary = [
        {
            label: t("statsIncome"),
            value: stats ? formatMoney(stats.income, DEFAULT_CURRENCY, locale) : "—",
            tone: "text-success-primary",
        },
        {
            label: t("statsExpense"),
            value: stats ? formatMoney(stats.expense, DEFAULT_CURRENCY, locale) : "—",
            tone: "text-error-primary",
        },
        {
            label: t("statsNet"),
            value: stats ? formatMoney(stats.net, DEFAULT_CURRENCY, locale) : "—",
            tone: stats && stats.net < 0 ? "text-error-primary" : "text-primary",
        },
        { label: t("statsCount"), value: stats?.count ?? "—", tone: "text-primary" },
    ];

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <ButtonUtility
                        size="xs"
                        color="secondary"
                        icon={ChevronLeft}
                        tooltip={t("prevMonth")}
                        onPress={() => shiftMonth(-1)}
                    />
                    <span className="min-w-36 text-center text-sm font-semibold text-primary">{monthLabel}</span>
                    <ButtonUtility
                        size="xs"
                        color="secondary"
                        icon={ChevronRight}
                        tooltip={t("nextMonth")}
                        onPress={() => shiftMonth(1)}
                    />
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summary.map((item) => (
                    <div key={item.label} className="rounded-xl bg-primary px-4 py-3 shadow-xs ring-1 ring-secondary">
                        <p className="text-xs font-medium text-tertiary">{item.label}</p>
                        <p className={cx("mt-1 text-xl font-semibold", item.tone)}>{item.value}</p>
                    </div>
                ))}
            </div>

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
                                    aria-label={t("categoryFilter")}
                                    placeholder={t("categoryFilter")}
                                    icon={SearchLg}
                                    className="min-w-0 w-full flex-1"
                                />
                            )}
                        />
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <DialogTrigger
                            isOpen={filterOpen}
                            onOpenChange={(next) => {
                                setFilterOpen(next);
                                if (next) setDraftFilters(appliedFilters);
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
                                            label={t("filterKind")}
                                            selectedKey={draftFilters.kind || "__all__"}
                                            onSelectionChange={(key) =>
                                                setDraftFilters({
                                                    kind: !key || key === "__all__" ? "" : String(key),
                                                })
                                            }
                                            items={[
                                                { id: "__all__", label: t("filterAll") },
                                                ...KINDS.map((k) => ({ id: k, label: t(`kind.${k}`) })),
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
                                    icon={hasQuery ? SearchLg : CoinsStacked01}
                                    color="gray"
                                    theme="modern"
                                />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>
                                    {hasQuery ? t("emptyFilteredTitle") : t("emptyTitle")}
                                </EmptyState.Title>
                                <EmptyState.Description>
                                    {hasQuery ? t("emptyFilteredDescription") : t("emptyDescription")}
                                </EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                {hasQuery ? (
                                    <Button size="md" color="secondary" onPress={clearFilters}>
                                        {t("clearFilters")}
                                    </Button>
                                ) : (
                                    <Button size="md" iconLeading={Plus} onPress={openCreate}>
                                        {t("create")}
                                    </Button>
                                )}
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    <Table aria-label={t("tableTitle")} size="sm" className="min-w-[56rem]">
                        <Table.Header>
                            <Table.Head id="category" label={t("colCategory")} isRowHeader />
                            <Table.Head id="kind" label={t("colKind")} />
                            <Table.Head id="amount" label={t("colAmount")} />
                            <Table.Head id="occurred_on" label={t("colDate")} />
                            <Table.Head id="note" label={t("colNote")} />
                            <Table.Head
                                label={t("actions")}
                                className="sticky right-0 z-20 border-l border-secondary bg-secondary [&>div]:justify-center"
                            />
                        </Table.Header>
                        <Table.Body items={items}>
                            {(item) => (
                                <Table.Row id={item.id} className="group/row">
                                    <Table.Cell>
                                        <p className="font-medium text-primary">
                                            {item.category || t("uncategorized")}
                                        </p>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <BadgeWithDot
                                            color={item.kind === "income" ? "success" : "error"}
                                            size="sm"
                                        >
                                            {t(`kind.${item.kind}`)}
                                        </BadgeWithDot>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <span
                                            className={cx(
                                                "font-semibold",
                                                item.kind === "income"
                                                    ? "text-success-primary"
                                                    : "text-error-primary",
                                            )}
                                        >
                                            {item.kind === "income" ? "+" : "−"}
                                            {formatMoney(
                                                item.amount,
                                                item.currency || DEFAULT_CURRENCY,
                                                locale,
                                            )}
                                        </span>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {formatDate(`${item.occurred_on.slice(0, 10)}T00:00:00`, { locale })}
                                    </Table.Cell>
                                    <Table.Cell>
                                        {item.note ? (
                                            <p className="line-clamp-1 text-sm text-tertiary">{item.note}</p>
                                        ) : (
                                            <span className="text-sm text-tertiary">—</span>
                                        )}
                                    </Table.Cell>
                                    <Table.Cell className="sticky right-0 z-10 border-l border-secondary bg-primary group-hover/row:bg-secondary">
                                        <div className="flex items-center justify-center gap-1">
                                            <ButtonUtility
                                                size="xs"
                                                color="secondary"
                                                icon={Edit01}
                                                tooltip={t("edit")}
                                                onPress={() => openEdit(item)}
                                            />
                                            <Dropdown.Root>
                                                <ButtonUtility
                                                    size="xs"
                                                    color="secondary"
                                                    icon={DotsVertical}
                                                    aria-label={t("actionMenu")}
                                                />
                                                <Dropdown.Popover className="w-min">
                                                    <Dropdown.Menu
                                                        onAction={(key) => {
                                                            if (key === "delete") {
                                                                openDialog({ type: "delete", item });
                                                            }
                                                        }}
                                                    >
                                                        <Dropdown.Item
                                                            id="delete"
                                                            icon={Trash01}
                                                            label={t("delete")}
                                                        />
                                                    </Dropdown.Menu>
                                                </Dropdown.Popover>
                                            </Dropdown.Root>
                                        </div>
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
                isOpen={open}
                onOpenChange={(next) => {
                    if (!next && !busy) closeDialog();
                }}
                isDismissable={!busy}
            >
                <Modal className={dialog?.type === "form" ? "max-w-lg" : "max-w-md"}>
                    <Dialog
                        className={cx(
                            "p-6 sm:p-8",
                            dialog?.type === "form" && "flex max-h-[inherit] flex-col !overflow-hidden",
                        )}
                    >
                        {dialog?.type === "form" ? (
                            <form className="flex min-h-0 flex-1 flex-col gap-5" noValidate onSubmit={submitForm}>
                                <Heading slot="title" className="text-lg font-semibold text-primary">
                                    {dialog.mode === "create" ? t("create") : t("edit")}
                                </Heading>
                                <div className="scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                                    <Controller
                                        control={form.control}
                                        name="kind"
                                        render={({ field, fieldState }) => (
                                            <Select
                                                label={t("kindLabel")}
                                                selectedKey={field.value}
                                                onSelectionChange={(key) => onSelectKey(key, field.onChange)}
                                                items={KINDS.map((k) => ({ id: k, label: t(`kind.${k}`) }))}
                                                isInvalid={fieldState.invalid}
                                                hint={fieldState.error?.message}
                                            >
                                                {(item) => <Select.Item id={item.id} label={item.label} />}
                                            </Select>
                                        )}
                                    />
                                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
                                        <Controller
                                            control={form.control}
                                            name="amount"
                                            render={({ field, fieldState }) => (
                                                <Input
                                                    label={t("amountLabel")}
                                                    placeholder="0.00"
                                                    inputMode="decimal"
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
                                            name="currency"
                                            render={({ field, fieldState }) => (
                                                <Input
                                                    label={t("currencyLabel")}
                                                    placeholder={DEFAULT_CURRENCY}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    isInvalid={fieldState.invalid}
                                                    hint={fieldState.error?.message}
                                                />
                                            )}
                                        />
                                    </div>
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
                                    <Controller
                                        control={form.control}
                                        name="occurred_on"
                                        render={({ field, fieldState }) => (
                                            <div className="flex flex-col gap-1.5">
                                                <DatePicker
                                                    label={t("occurredOnLabel")}
                                                    value={fromDateString(field.value)}
                                                    onChange={(value) =>
                                                        field.onChange(value ? toDateString(value) : "")
                                                    }
                                                />
                                                {fieldState.error ? (
                                                    <p className="text-sm text-error-primary">
                                                        {fieldState.error.message}
                                                    </p>
                                                ) : null}
                                            </div>
                                        )}
                                    />
                                    <Controller
                                        control={form.control}
                                        name="note"
                                        render={({ field, fieldState }) => (
                                            <TextArea
                                                label={t("noteLabel")}
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
                                </div>
                                <div className="flex justify-end gap-3 border-t border-secondary pt-4">
                                    <Button
                                        type="button"
                                        color="secondary"
                                        isDisabled={busy}
                                        onPress={() => closeDialog()}
                                    >
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button
                                        type="button"
                                        isLoading={saveMutation.isPending}
                                        onPress={() => void submitForm()}
                                    >
                                        {t("save")}
                                    </Button>
                                </div>
                            </form>
                        ) : dialog?.type === "delete" ? (
                            <div className="space-y-5">
                                <Heading slot="title" className="text-lg font-semibold text-primary">
                                    {t("delete")}
                                </Heading>
                                <p className="text-sm text-tertiary">{t("deleteConfirm")}</p>
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" isDisabled={busy} onPress={() => closeDialog()}>
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
