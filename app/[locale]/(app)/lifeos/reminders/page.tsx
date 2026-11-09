"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Heading } from "react-aria-components";
import { Bell01, CheckCircle, DotsVertical, Edit01, Plus, Trash01 } from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { lifeosApi, toApiError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import {
    combineLocal,
    fromDateString,
    localDateString,
    localTimeString,
    toDateString,
    toRfc3339,
} from "@/lib/lifeos-dates";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { createReminderSchema, type ReminderFormInput } from "@/lib/schemas";
import type { Reminder, ReminderStatus } from "@/lib/types";
import { useModalState } from "@/lib/use-modal-state";
import { cx } from "@/utils/cx";

type DialogState =
    | { type: "form"; mode: "create" | "edit"; reminder?: Reminder }
    | { type: "delete"; reminder: Reminder };

function emptyForm(): ReminderFormInput {
    const due = new Date(Date.now() + 60 * 60 * 1000);
    return {
        title: "",
        body: "",
        due_date: localDateString(due),
        due_time: localTimeString(due),
    };
}

function statusColor(status: ReminderStatus): "warning" | "success" | "gray" {
    if (status === "pending") return "warning";
    if (status === "done") return "success";
    return "gray";
}

export default function RemindersPage() {
    const locale = useLocale();
    const t = useTranslations("reminders");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();

    const [status, setStatus] = useState<string>("pending");
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);
    const { dialog, open, openDialog, closeDialog } = useModalState<DialogState>();

    const schema = useMemo(() => createReminderSchema(tValidation), [tValidation]);
    const form = useForm<ReminderFormInput>({
        resolver: zodResolver(schema),
        defaultValues: emptyForm(),
    });

    const checkedRef = useRef(false);
    useEffect(() => {
        if (checkedRef.current) return;
        checkedRef.current = true;
        void (async () => {
            try {
                await lifeosApi.checkReminders();
            } catch {
                /* non-blocking: list still loads */
            }
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
                queryClient.invalidateQueries({ queryKey: queryKeys.remindersAll }),
            ]);
        })();
    }, [queryClient]);

    const listQuery = useQuery({
        queryKey: queryKeys.reminders(status),
        queryFn: async () => {
            const res = await lifeosApi.listReminders(status);
            return res.data ?? [];
        },
    });

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.remindersAll });
    };

    const saveMutation = useMutation({
        mutationFn: async (values: ReminderFormInput) => {
            if (!dialog || dialog.type !== "form") throw new Error("invalid dialog");
            const payload = {
                title: values.title.trim(),
                body: values.body.trim(),
                due_at: toRfc3339(combineLocal(values.due_date, values.due_time)),
            };
            if (dialog.mode === "create") return lifeosApi.createReminder(payload);
            if (!dialog.reminder) throw new Error("missing reminder");
            return lifeosApi.updateReminder(dialog.reminder.id, payload);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("save"));
            closeDialog();
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const doneMutation = useMutation({
        mutationFn: (id: string) => lifeosApi.markReminderDone(id),
        onSuccess: async (res) => {
            notify.success(res.message || t("markedDone"));
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (!dialog || dialog.type !== "delete") throw new Error("invalid dialog");
            return lifeosApi.deleteReminder(dialog.reminder.id);
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
    const items = listQuery.data ?? [];

    const openCreate = () => {
        form.reset(emptyForm());
        openDialog({ type: "form", mode: "create" });
    };

    const tabs = [
        { id: "pending", label: t("filterPending") },
        { id: "done", label: t("filterDone") },
        { id: "", label: t("filterAll") },
    ];

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col gap-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-display-xs font-semibold text-primary">{t("title")}</h1>
                    <p className="mt-1 text-md text-tertiary">{t("subtitle")}</p>
                </div>
                <Button size="sm" iconLeading={Plus} onPress={openCreate}>
                    {t("create")}
                </Button>
            </header>

            <section className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-secondary px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id || "all"}
                                type="button"
                                onClick={() => setStatus(tab.id)}
                                className={cx(
                                    "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                                    status === tab.id
                                        ? "bg-primary text-primary shadow-xs"
                                        : "text-tertiary hover:text-secondary",
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <p className="text-sm text-tertiary">{t("listDescription")}</p>
                </div>

                {listQuery.isLoading ? (
                    <div className="flex justify-center py-16">
                        <LoadingIndicator label={t("loading")} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex justify-center px-6 py-16">
                        <EmptyState size="md">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon icon={Bell01} color="gray" theme="modern" />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>{t("emptyTitle")}</EmptyState.Title>
                                <EmptyState.Description>{t("emptyDescription")}</EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                <Button size="md" iconLeading={Plus} onPress={openCreate}>
                                    {t("create")}
                                </Button>
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    <ul className="divide-y divide-secondary">
                        {items.map((reminder) => {
                            const overdue =
                                reminder.status === "pending" && new Date(reminder.due_at).getTime() < now;
                            return (
                                <li key={reminder.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p
                                                className={cx(
                                                    "font-medium text-primary",
                                                    reminder.status !== "pending" && "text-tertiary line-through",
                                                )}
                                            >
                                                {reminder.title}
                                            </p>
                                            <BadgeWithDot color={statusColor(reminder.status)} size="sm">
                                                {t(`status.${reminder.status}`)}
                                            </BadgeWithDot>
                                            {overdue ? (
                                                <BadgeWithDot color="error" size="sm">
                                                    {t("overdue")}
                                                </BadgeWithDot>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 text-sm text-tertiary">
                                            {formatDate(reminder.due_at, { locale, withTime: true })}
                                        </p>
                                        {reminder.body ? (
                                            <p className="mt-1 line-clamp-2 text-sm text-tertiary">{reminder.body}</p>
                                        ) : null}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        {reminder.status === "pending" ? (
                                            <ButtonUtility
                                                size="xs"
                                                color="secondary"
                                                icon={CheckCircle}
                                                tooltip={t("markDone")}
                                                isDisabled={doneMutation.isPending}
                                                onPress={() => doneMutation.mutate(reminder.id)}
                                            />
                                        ) : null}
                                        <ButtonUtility
                                            size="xs"
                                            color="secondary"
                                            icon={Edit01}
                                            tooltip={t("edit")}
                                            onPress={() => {
                                                const due = new Date(reminder.due_at);
                                                form.reset({
                                                    title: reminder.title,
                                                    body: reminder.body,
                                                    due_date: localDateString(due),
                                                    due_time: localTimeString(due),
                                                });
                                                openDialog({ type: "form", mode: "edit", reminder });
                                            }}
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
                                                        if (key === "delete") openDialog({ type: "delete", reminder });
                                                    }}
                                                >
                                                    <Dropdown.Item id="delete" icon={Trash01} label={t("delete")} />
                                                </Dropdown.Menu>
                                            </Dropdown.Popover>
                                        </Dropdown.Root>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

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
                                        name="body"
                                        render={({ field, fieldState }) => (
                                            <TextArea
                                                label={t("bodyLabel")}
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
                                            name="due_date"
                                            render={({ field, fieldState }) => (
                                                <div className="flex flex-col gap-1.5">
                                                    <DatePicker
                                                        label={t("dueDateLabel")}
                                                        value={fromDateString(field.value)}
                                                        onChange={(value) => field.onChange(value ? toDateString(value) : "")}
                                                    />
                                                    {fieldState.error ? (
                                                        <p className="text-sm text-error-primary">{fieldState.error.message}</p>
                                                    ) : null}
                                                </div>
                                            )}
                                        />
                                        <Controller
                                            control={form.control}
                                            name="due_time"
                                            render={({ field, fieldState }) => (
                                                <Input
                                                    label={t("dueTimeLabel")}
                                                    placeholder="09:00"
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
                                <div className="flex justify-end gap-3 border-t border-secondary pt-4">
                                    <Button type="button" color="secondary" isDisabled={busy} onPress={() => closeDialog()}>
                                        {tCommon("cancel")}
                                    </Button>
                                    <Button type="button" isLoading={saveMutation.isPending} onPress={() => void submitForm()}>
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
