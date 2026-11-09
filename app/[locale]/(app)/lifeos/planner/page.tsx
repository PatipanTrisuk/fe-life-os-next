"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GregorianCalendar, today, getLocalTimeZone, toCalendar } from "@internationalized/date";
import { useLocale, useTranslations } from "next-intl";
import { Heading, type DateValue, type Key } from "react-aria-components";
import { Calendar, CheckCircle, DotsVertical, Edit01, Plus, Trash01 } from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Dialog, Modal, ModalOverlay, MODAL_EXIT_MS } from "@/components/application/modals/modal";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { lifeosApi, toApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { createPlannerSchema, type PlannerFormInput } from "@/lib/schemas";
import type { PlannerPriority, PlannerStatus, PlannerTask } from "@/lib/types";
import { cx } from "@/utils/cx";

type DialogState =
    | { type: "none" }
    | { type: "form"; mode: "create" | "edit"; task?: PlannerTask }
    | { type: "delete"; task: PlannerTask };

const PRIORITIES: PlannerPriority[] = ["low", "medium", "high"];
const STATUSES: PlannerStatus[] = ["todo", "done", "skipped"];

function emptyForm(): PlannerFormInput {
    return {
        title: "",
        notes: "",
        status: "todo",
        priority: "medium",
        start_time: "",
        end_time: "",
    };
}

function toDateString(value: DateValue) {
    const gregorian = toCalendar(value, new GregorianCalendar());
    return `${gregorian.year}-${String(gregorian.month).padStart(2, "0")}-${String(gregorian.day).padStart(2, "0")}`;
}

function onSelectKey(key: Key | null, onChange: (value: string) => void) {
    if (key == null) return;
    onChange(String(key));
}

function priorityColor(priority: PlannerPriority): "error" | "warning" | "gray" {
    if (priority === "high") return "error";
    if (priority === "medium") return "warning";
    return "gray";
}

export default function DailyPlannerPage() {
    const locale = useLocale();
    const t = useTranslations("planner");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();

    const [selectedDate, setSelectedDate] = useState<DateValue>(() => today(getLocalTimeZone()));
    const dateKey = toDateString(selectedDate);

    useEffect(() => {
        const year = toCalendar(selectedDate, new GregorianCalendar()).year;
        if (year < 2000 || year > 2100) {
            setSelectedDate(today(getLocalTimeZone()));
        }
    }, [selectedDate]);

    const [dialog, setDialog] = useState<DialogState>({ type: "none" });
    const [panelOpen, setPanelOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const schema = useMemo(() => createPlannerSchema(tValidation), [tValidation]);
    const form = useForm<PlannerFormInput>({
        resolver: zodResolver(schema),
        defaultValues: emptyForm(),
    });

    const listQuery = useQuery({
        queryKey: queryKeys.planner(dateKey),
        queryFn: async () => {
            const res = await lifeosApi.listPlanner(dateKey);
            return res.data ?? [];
        },
    });

    const statsQuery = useQuery({
        queryKey: queryKeys.plannerStats(dateKey),
        queryFn: async () => {
            const res = await lifeosApi.plannerStats(dateKey);
            return res.data;
        },
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
            queryClient.invalidateQueries({ queryKey: queryKeys.planner(dateKey) }),
            queryClient.invalidateQueries({ queryKey: queryKeys.plannerStats(dateKey) }),
            queryClient.invalidateQueries({ queryKey: queryKeys.lifeAnalytics }),
        ]);
    };

    const saveMutation = useMutation({
        mutationFn: async (values: PlannerFormInput) => {
            const current = dialog;
            if (current.type !== "form") throw new Error("invalid dialog");
            if (current.mode === "create") {
                return lifeosApi.createPlannerTask({
                    plan_date: dateKey,
                    title: values.title.trim(),
                    notes: values.notes.trim(),
                    status: values.status,
                    priority: values.priority,
                    start_time: values.start_time.trim(),
                    end_time: values.end_time.trim(),
                });
            }
            if (!current.task) throw new Error("missing task");
            return lifeosApi.updatePlannerTask(current.task.id, {
                title: values.title.trim(),
                notes: values.notes.trim(),
                status: values.status,
                priority: values.priority,
                start_time: values.start_time.trim(),
                end_time: values.end_time.trim(),
            });
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("save"));
            closeDialog(true);
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const submitForm = form.handleSubmit((values) => saveMutation.mutate(values));

    const toggleMutation = useMutation({
        mutationFn: (id: string) => lifeosApi.togglePlannerTask(id),
        onSuccess: async () => {
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (dialog.type !== "delete") throw new Error("invalid dialog");
            return lifeosApi.deletePlannerTask(dialog.task.id);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("deleted"));
            closeDialog(true);
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const items = listQuery.data ?? [];
    const stats = statsQuery.data;
    const loading = listQuery.isLoading;

    const dateLabel = new Date(`${dateKey}T00:00:00`).toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-display-xs font-semibold text-primary">{t("title")}</h1>
                    <p className="mt-1 text-md text-tertiary">{t("subtitle")}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <DatePicker
                        aria-label={t("dateLabel")}
                        value={selectedDate}
                        onChange={(value) => {
                            if (value) setSelectedDate(value);
                        }}
                    />
                    <Button
                        size="sm"
                        iconLeading={Plus}
                        onPress={() => {
                            form.reset(emptyForm());
                            openDialog({ type: "form", mode: "create" });
                        }}
                    >
                        {t("create")}
                    </Button>
                </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: t("statsTotal"), value: stats?.total ?? "—" },
                    { label: t("statsDone"), value: stats?.done ?? "—" },
                    { label: t("statsTodo"), value: stats?.todo ?? "—" },
                    { label: t("statsCompletion"), value: stats ? `${stats.completion}%` : "—" },
                ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-primary px-4 py-3 shadow-xs ring-1 ring-secondary">
                        <p className="text-xs font-medium text-tertiary">{item.label}</p>
                        <p className="mt-1 text-xl font-semibold text-primary">{item.value}</p>
                    </div>
                ))}
            </div>

            <section className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                <div className="flex items-center justify-between gap-3 border-b border-secondary px-4 py-4 sm:px-6">
                    <div>
                        <h2 className="text-md font-semibold text-primary">{dateLabel}</h2>
                        <p className="text-sm text-tertiary">{t("listDescription")}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <LoadingIndicator label={t("loading")} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex justify-center px-6 py-16">
                        <EmptyState size="md">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={Calendar} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{t("emptyTitle")}</EmptyState.Title>
                                <EmptyState.Description>{t("emptyDescription")}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button
                                    size="md"
                                    iconLeading={Plus}
                                    onPress={() => {
                                        form.reset(emptyForm());
                                        openDialog({ type: "form", mode: "create" });
                                    }}
                                >
                                    {t("create")}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    <ul className="divide-y divide-secondary">
                        {items.map((task) => (
                            <li key={task.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                                <Checkbox
                                    isSelected={task.status === "done"}
                                    isDisabled={toggleMutation.isPending}
                                    onChange={() => toggleMutation.mutate(task.id)}
                                    aria-label={t("toggleDone")}
                                    className="mt-1"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p
                                            className={cx(
                                                "font-medium text-primary",
                                                task.status === "done" && "text-tertiary line-through",
                                            )}
                                        >
                                            {task.title}
                                        </p>
                                        <BadgeWithDot color={priorityColor(task.priority)} size="sm">
                                            {t(`priority.${task.priority}`)}
                                        </BadgeWithDot>
                                        {task.status === "skipped" ? (
                                            <BadgeWithDot color="gray" size="sm">
                                                {t("status.skipped")}
                                            </BadgeWithDot>
                                        ) : null}
                                    </div>
                                    {(task.start_time || task.end_time) && (
                                        <p className="mt-1 text-sm text-tertiary">
                                            {[task.start_time, task.end_time].filter(Boolean).join(" – ")}
                                        </p>
                                    )}
                                    {task.notes ? <p className="mt-1 line-clamp-2 text-sm text-tertiary">{task.notes}</p> : null}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <ButtonUtility
                                        size="xs"
                                        color="secondary"
                                        icon={Edit01}
                                        tooltip={t("edit")}
                                        onPress={() => {
                                            form.reset({
                                                title: task.title,
                                                notes: task.notes,
                                                status: task.status,
                                                priority: task.priority,
                                                start_time: task.start_time,
                                                end_time: task.end_time,
                                            });
                                            openDialog({ type: "form", mode: "edit", task });
                                        }}
                                    />
                                    <Dropdown.Root>
                                        <ButtonUtility size="xs" color="secondary" icon={DotsVertical} aria-label={t("actionMenu")} />
                                        <Dropdown.Popover className="w-min">
                                            <Dropdown.Menu
                                                onAction={(key) => {
                                                    if (key === "delete") openDialog({ type: "delete", task });
                                                    if (key === "done") toggleMutation.mutate(task.id);
                                                }}
                                            >
                                                <Dropdown.Item id="done" icon={CheckCircle} label={t("toggleDone")} />
                                                <Dropdown.Item id="delete" icon={Trash01} label={t("delete")} />
                                            </Dropdown.Menu>
                                        </Dropdown.Popover>
                                    </Dropdown.Root>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

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
                                onSubmit={submitForm}
                            >
                                <Heading slot="title" className="text-lg font-semibold text-primary">
                                    {dialog.mode === "create" ? t("create") : t("edit")}
                                </Heading>
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
                                        name="notes"
                                        render={({ field, fieldState }) => (
                                            <TextArea
                                                label={t("notesLabel")}
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
                                            name="priority"
                                            render={({ field, fieldState }) => (
                                                <Select
                                                    label={t("priorityLabel")}
                                                    selectedKey={field.value}
                                                    onSelectionChange={(key) => onSelectKey(key, field.onChange)}
                                                    items={PRIORITIES.map((p) => ({ id: p, label: t(`priority.${p}`) }))}
                                                    isInvalid={fieldState.invalid}
                                                    hint={fieldState.error?.message}
                                                >
                                                    {(item) => <Select.Item id={item.id} label={item.label} />}
                                                </Select>
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="status"
                                            render={({ field, fieldState }) => (
                                                <Select
                                                    label={t("statusLabel")}
                                                    selectedKey={field.value}
                                                    onSelectionChange={(key) => onSelectKey(key, field.onChange)}
                                                    items={STATUSES.map((s) => ({ id: s, label: t(`status.${s}`) }))}
                                                    isInvalid={fieldState.invalid}
                                                    hint={fieldState.error?.message}
                                                >
                                                    {(item) => <Select.Item id={item.id} label={item.label} />}
                                                </Select>
                                            )}
                                        />
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Controller
                                            control={form.control}
                                            name="start_time"
                                            render={({ field }) => (
                                                <Input
                                                    label={t("startTimeLabel")}
                                                    placeholder="09:00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                />
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="end_time"
                                            render={({ field }) => (
                                                <Input
                                                    label={t("endTimeLabel")}
                                                    placeholder="10:00"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 border-t border-secondary pt-4">
                                    <Button type="button" color="secondary" isDisabled={saveMutation.isPending} onPress={() => closeDialog(true)}>
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button type="button" isLoading={saveMutation.isPending} onPress={() => void submitForm()}>
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
                                    <Button color="secondary" isDisabled={deleteMutation.isPending} onPress={() => closeDialog(true)}>
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button color="primary-destructive" isLoading={deleteMutation.isPending} onPress={() => deleteMutation.mutate()}>
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
