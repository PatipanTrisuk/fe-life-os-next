"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Heading, type Key } from "react-aria-components";
import { CalendarDate, DotsVertical, Edit01, Plus, ChevronLeft, ChevronRight, Trash01 } from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { lifeosApi, toApiError } from "@/lib/api";
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
import { createCalendarSchema, type CalendarFormInput } from "@/lib/schemas";
import type { CalendarEvent } from "@/lib/types";
import { useModalState } from "@/lib/use-modal-state";
import { cx } from "@/utils/cx";

type DialogState =
    | { type: "form"; mode: "create" | "edit"; event?: CalendarEvent }
    | { type: "delete"; event: CalendarEvent };

const COLORS: Record<string, string> = {
    blue: "#2563eb",
    green: "#16a34a",
    red: "#dc2626",
    amber: "#d97706",
    purple: "#9333ea",
    gray: "#6b7280",
};
const COLOR_KEYS = Object.keys(COLORS);

function resolveColor(color: string) {
    if (!color) return COLORS.blue;
    if (color.startsWith("#")) return color;
    return COLORS[color] ?? COLORS.blue;
}

function emptyForm(day: string): CalendarFormInput {
    return {
        title: "",
        description: "",
        location: "",
        color: "blue",
        all_day: false,
        start_date: day,
        start_time: "09:00",
        end_date: day,
        end_time: "10:00",
    };
}

function onSelectKey(key: Key | null, onChange: (value: string) => void) {
    if (key == null) return;
    onChange(String(key));
}

function buildPayload(values: CalendarFormInput) {
    const endDate = values.end_date || values.start_date;
    if (values.all_day) {
        return {
            title: values.title.trim(),
            description: values.description.trim(),
            location: values.location.trim(),
            color: values.color,
            all_day: true,
            starts_at: toRfc3339(combineLocal(values.start_date, "00:00")),
            ends_at: toRfc3339(combineLocal(endDate, "23:59")),
        };
    }
    return {
        title: values.title.trim(),
        description: values.description.trim(),
        location: values.location.trim(),
        color: values.color,
        all_day: false,
        starts_at: toRfc3339(combineLocal(values.start_date, values.start_time)),
        ends_at: toRfc3339(combineLocal(endDate, values.end_time || values.start_time)),
    };
}

function formFromEvent(event: CalendarEvent): CalendarFormInput {
    const start = new Date(event.starts_at);
    const end = new Date(event.ends_at || event.starts_at);
    return {
        title: event.title,
        description: event.description,
        location: event.location,
        color: event.color || "blue",
        all_day: event.all_day,
        start_date: localDateString(start),
        start_time: localTimeString(start),
        end_date: localDateString(end),
        end_time: localTimeString(end),
    };
}

export default function CalendarPage() {
    const locale = useLocale();
    const t = useTranslations("calendar");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();

    const todayStr = localDateString(new Date());
    const [selectedDay, setSelectedDay] = useState(todayStr);
    const [cursor, setCursor] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });

    const { dialog, open, openDialog, closeDialog } = useModalState<DialogState>();

    const schema = useMemo(() => createCalendarSchema(tValidation), [tValidation]);
    const form = useForm<CalendarFormInput>({
        resolver: zodResolver(schema),
        defaultValues: emptyForm(todayStr),
    });
    const allDay = useWatch({ control: form.control, name: "all_day" });

    const rangeFrom = toRfc3339(new Date(cursor.year, cursor.month, 1));
    const rangeTo = toRfc3339(new Date(new Date(cursor.year, cursor.month + 1, 1).getTime() - 1000));

    const listQuery = useQuery({
        queryKey: queryKeys.calendar(rangeFrom, rangeTo),
        queryFn: async () => {
            const res = await lifeosApi.listCalendar({ from: rangeFrom, to: rangeTo });
            return res.data ?? [];
        },
    });

    const statsQuery = useQuery({
        queryKey: queryKeys.calendarStats(rangeFrom, rangeTo),
        queryFn: async () => {
            const res = await lifeosApi.calendarStats({ from: rangeFrom, to: rangeTo });
            return res.data;
        },
    });

    const events = useMemo(() => listQuery.data ?? [], [listQuery.data]);

    const eventsByDay = useMemo(() => {
        const map = new Map<string, CalendarEvent[]>();
        for (const event of events) {
            const start = new Date(event.starts_at);
            const end = new Date(event.ends_at || event.starts_at);
            const cursorDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
            for (let i = 0; i < 62 && cursorDay <= last; i++) {
                const key = localDateString(cursorDay);
                const list = map.get(key);
                if (list) list.push(event);
                else map.set(key, [event]);
                cursorDay.setDate(cursorDay.getDate() + 1);
            }
        }
        for (const list of map.values()) {
            list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        }
        return map;
    }, [events]);

    const dayEvents = eventsByDay.get(selectedDay) ?? [];

    const weekdays = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) =>
                new Date(2024, 0, 7 + i).toLocaleDateString(locale, { weekday: "short" }),
            ),
        [locale],
    );

    const cells = useMemo(() => {
        const first = new Date(cursor.year, cursor.month, 1);
        const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
        const list: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
        for (let d = 1; d <= daysInMonth; d++) {
            list.push(localDateString(new Date(cursor.year, cursor.month, d)));
        }
        return list;
    }, [cursor]);

    const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
    });
    const selectedLabel = new Date(`${selectedDay}T00:00:00`).toLocaleDateString(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const goToDay = (day: string) => {
        setSelectedDay(day);
        const [y, m] = day.split("-").map(Number);
        setCursor({ year: y, month: m - 1 });
    };

    const shiftMonth = (delta: number) => {
        const next = new Date(cursor.year, cursor.month + delta, 1);
        setCursor({ year: next.getFullYear(), month: next.getMonth() });
        const now = new Date();
        const isCurrent = next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth();
        setSelectedDay(isCurrent ? localDateString(now) : localDateString(next));
    };

    const openCreate = () => {
        form.reset(emptyForm(selectedDay));
        openDialog({ type: "form", mode: "create" });
    };

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.calendarAll });
    };

    const saveMutation = useMutation({
        mutationFn: async (values: CalendarFormInput) => {
            if (!dialog || dialog.type !== "form") throw new Error("invalid dialog");
            const payload = buildPayload(values);
            if (dialog.mode === "create") return lifeosApi.createCalendarEvent(payload);
            if (!dialog.event) throw new Error("missing event");
            return lifeosApi.updateCalendarEvent(dialog.event.id, payload);
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
            return lifeosApi.deleteCalendarEvent(dialog.event.id);
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

    const stats = statsQuery.data;
    const timeFmt: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };

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
                        value={fromDateString(selectedDay)}
                        onChange={(value) => {
                            if (value) goToDay(toDateString(value));
                        }}
                    />
                    <Button size="sm" iconLeading={Plus} onPress={openCreate}>
                        {t("create")}
                    </Button>
                </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    { label: t("statsTotal"), value: stats?.total ?? "—" },
                    { label: t("statsUpcoming"), value: stats?.upcoming ?? "—" },
                    { label: t("statsAllDay"), value: stats?.all_day ?? "—" },
                ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-primary px-4 py-3 shadow-xs ring-1 ring-secondary">
                        <p className="text-xs font-medium text-tertiary">{item.label}</p>
                        <p className="mt-1 text-xl font-semibold text-primary">{item.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
                <section className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                    <div className="flex items-center justify-between gap-3 border-b border-secondary px-4 py-4 sm:px-6">
                        <h2 className="text-md font-semibold text-primary">{monthLabel}</h2>
                        <div className="flex items-center gap-2">
                            <Button size="sm" color="secondary" onPress={() => goToDay(todayStr)}>
                                {t("today")}
                            </Button>
                            <ButtonUtility
                                size="xs"
                                color="secondary"
                                icon={ChevronLeft}
                                tooltip={t("prevMonth")}
                                onPress={() => shiftMonth(-1)}
                            />
                            <ButtonUtility
                                size="xs"
                                color="secondary"
                                icon={ChevronRight}
                                tooltip={t("nextMonth")}
                                onPress={() => shiftMonth(1)}
                            />
                        </div>
                    </div>
                    <div className="p-3 sm:p-4">
                        <div className="grid grid-cols-7 gap-1 pb-2">
                            {weekdays.map((w) => (
                                <p key={w} className="text-center text-xs font-medium text-tertiary">
                                    {w}
                                </p>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {cells.map((day, index) => {
                                if (!day) return <div key={`empty-${index}`} />;
                                const list = eventsByDay.get(day) ?? [];
                                const selected = day === selectedDay;
                                const isToday = day === todayStr;
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => setSelectedDay(day)}
                                        className={cx(
                                            "flex min-h-14 flex-col items-center gap-1 rounded-lg px-1 py-2 text-sm outline-focus-ring transition focus-visible:outline-2",
                                            selected
                                                ? "bg-brand-solid text-white"
                                                : "text-primary hover:bg-secondary",
                                            !selected && isToday && "ring-1 ring-brand",
                                        )}
                                    >
                                        <span className="font-medium">{Number(day.slice(8))}</span>
                                        {list.length > 0 ? (
                                            <span className="flex items-center gap-0.5">
                                                {list.slice(0, 3).map((event) => (
                                                    <span
                                                        key={event.id}
                                                        className="size-1.5 rounded-full"
                                                        style={{
                                                            backgroundColor: selected
                                                                ? "#ffffff"
                                                                : resolveColor(event.color),
                                                        }}
                                                    />
                                                ))}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
                    <div className="border-b border-secondary px-4 py-4 sm:px-6">
                        <h2 className="text-md font-semibold text-primary">{selectedLabel}</h2>
                        <p className="text-sm text-tertiary">{t("listDescription")}</p>
                    </div>

                    {listQuery.isLoading ? (
                        <div className="flex justify-center py-16">
                            <LoadingIndicator label={t("loading")} />
                        </div>
                    ) : dayEvents.length === 0 ? (
                        <div className="flex justify-center px-6 py-12">
                            <EmptyState size="md">
                                <EmptyState.Header>
                                    <EmptyState.FeaturedIcon icon={CalendarDate} color="gray" theme="modern" />
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
                            {dayEvents.map((event) => (
                                <li key={event.id} className="flex items-start gap-3 px-4 py-4 sm:px-6">
                                    <span
                                        className="mt-1.5 size-2.5 shrink-0 rounded-full"
                                        style={{ backgroundColor: resolveColor(event.color) }}
                                        aria-hidden
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-medium text-primary">{event.title}</p>
                                            {event.all_day ? (
                                                <BadgeWithDot color="brand" size="sm">
                                                    {t("allDay")}
                                                </BadgeWithDot>
                                            ) : null}
                                        </div>
                                        {!event.all_day ? (
                                            <p className="mt-1 text-sm text-tertiary">
                                                {new Date(event.starts_at).toLocaleTimeString(locale, timeFmt)}
                                                {event.ends_at && event.ends_at !== event.starts_at
                                                    ? ` – ${new Date(event.ends_at).toLocaleTimeString(locale, timeFmt)}`
                                                    : ""}
                                            </p>
                                        ) : null}
                                        {event.location ? (
                                            <p className="mt-1 text-sm text-tertiary">{event.location}</p>
                                        ) : null}
                                        {event.description ? (
                                            <p className="mt-1 line-clamp-2 text-sm text-tertiary">
                                                {event.description}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <ButtonUtility
                                            size="xs"
                                            color="secondary"
                                            icon={Edit01}
                                            tooltip={t("edit")}
                                            onPress={() => {
                                                form.reset(formFromEvent(event));
                                                openDialog({ type: "form", mode: "edit", event });
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
                                                        if (key === "delete") openDialog({ type: "delete", event });
                                                    }}
                                                >
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
            </div>

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
                                        name="all_day"
                                        render={({ field }) => (
                                            <Checkbox
                                                isSelected={field.value}
                                                onChange={field.onChange}
                                                label={t("allDayLabel")}
                                            />
                                        )}
                                    />
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Controller
                                            control={form.control}
                                            name="start_date"
                                            render={({ field, fieldState }) => (
                                                <div className="flex flex-col gap-1.5">
                                                    <DatePicker
                                                        label={t("startDateLabel")}
                                                        value={fromDateString(field.value)}
                                                        onChange={(value) => field.onChange(value ? toDateString(value) : "")}
                                                    />
                                                    {fieldState.error ? (
                                                        <p className="text-sm text-error-primary">{fieldState.error.message}</p>
                                                    ) : null}
                                                </div>
                                            )}
                                        />
                                        {!allDay ? (
                                            <Controller
                                                control={form.control}
                                                name="start_time"
                                                render={({ field, fieldState }) => (
                                                    <Input
                                                        label={t("startTimeLabel")}
                                                        placeholder="09:00"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        onBlur={field.onBlur}
                                                        isInvalid={fieldState.invalid}
                                                        hint={fieldState.error?.message}
                                                    />
                                                )}
                                            />
                                        ) : null}
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Controller
                                            control={form.control}
                                            name="end_date"
                                            render={({ field, fieldState }) => (
                                                <div className="flex flex-col gap-1.5">
                                                    <DatePicker
                                                        label={t("endDateLabel")}
                                                        value={fromDateString(field.value)}
                                                        onChange={(value) => field.onChange(value ? toDateString(value) : "")}
                                                    />
                                                    {fieldState.error ? (
                                                        <p className="text-sm text-error-primary">{fieldState.error.message}</p>
                                                    ) : null}
                                                </div>
                                            )}
                                        />
                                        {!allDay ? (
                                            <Controller
                                                control={form.control}
                                                name="end_time"
                                                render={({ field, fieldState }) => (
                                                    <Input
                                                        label={t("endTimeLabel")}
                                                        placeholder="10:00"
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        onBlur={field.onBlur}
                                                        isInvalid={fieldState.invalid}
                                                        hint={fieldState.error?.message}
                                                    />
                                                )}
                                            />
                                        ) : null}
                                    </div>
                                    <Controller
                                        control={form.control}
                                        name="location"
                                        render={({ field, fieldState }) => (
                                            <Input
                                                label={t("locationLabel")}
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
                                        name="color"
                                        render={({ field }) => (
                                            <Select
                                                label={t("colorLabel")}
                                                selectedKey={COLOR_KEYS.includes(field.value) ? field.value : "blue"}
                                                onSelectionChange={(key) => onSelectKey(key, field.onChange)}
                                                items={COLOR_KEYS.map((c) => ({ id: c, label: t(`colors.${c}`) }))}
                                            >
                                                {(item) => <Select.Item id={item.id} label={item.label} />}
                                            </Select>
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
