"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { parseDate } from "@internationalized/date";
import { useLocale, useTranslations } from "next-intl";
import { Heading, type DateValue } from "react-aria-components";
import { ArrowLeft, CheckCircle, Plus, Trash01 } from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Dialog, Modal, ModalOverlay, MODAL_EXIT_MS } from "@/components/application/modals/modal";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { Link, useRouter } from "@/i18n/navigation";
import { lifeosApi, toApiError } from "@/lib/api";
import { formatDate } from "@/lib/date";
import {
    GOAL_PRIORITIES,
    GOAL_STATUSES,
    formToUpdatePayload,
    goalToForm,
    priorityBadgeColor,
    statusBadgeColor,
} from "@/lib/goals";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import { createGoalSchema, createMilestoneSchema, type GoalFormInput, type MilestoneFormInput } from "@/lib/schemas";
import { cx } from "@/utils/cx";

type Props = {
    params: Promise<{ id: string }>;
};

export default function GoalDetailPage({ params }: Props) {
    const { id } = use(params);
    const locale = useLocale();
    const router = useRouter();
    const t = useTranslations("goals");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const goalQuery = useQuery({
        queryKey: queryKeys.goal(id),
        queryFn: async () => {
            const res = await lifeosApi.getGoal(id);
            return res.data;
        },
    });

    const goalSchema = useMemo(() => createGoalSchema(tValidation), [tValidation]);
    const milestoneSchema = useMemo(() => createMilestoneSchema(tValidation), [tValidation]);

    const form = useForm<GoalFormInput>({
        resolver: zodResolver(goalSchema),
        defaultValues: goalToForm({
            id,
            title: "",
            description: "",
            status: "active",
            priority: "medium",
            category: "",
            progress: 0,
            current_value: 0,
            unit: "",
            created_at: "",
            updated_at: "",
        }),
    });

    const milestoneForm = useForm<MilestoneFormInput>({
        resolver: zodResolver(milestoneSchema),
        defaultValues: { title: "" },
    });

    useEffect(() => {
        if (goalQuery.data) {
            form.reset(goalToForm(goalQuery.data));
        }
    }, [goalQuery.data, form]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const invalidate = async (goalId = id) => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.goal(goalId) }),
            queryClient.invalidateQueries({ queryKey: ["lifeos", "goals"] }),
            queryClient.invalidateQueries({ queryKey: queryKeys.goalsStats }),
            queryClient.invalidateQueries({ queryKey: queryKeys.goalsDashboard }),
        ]);
    };

    const saveMutation = useMutation({
        mutationFn: async (values: GoalFormInput) => {
            if (!goalQuery.data) throw new Error("missing goal");
            return lifeosApi.updateGoal(id, formToUpdatePayload(values, goalQuery.data));
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("save"));
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const deleteMutation = useMutation({
        mutationFn: () => lifeosApi.deleteGoal(id),
        onSuccess: async (res) => {
            notify.success(res.message || t("deleted"));
            setModalOpen(false);
            await invalidate();
            router.push("/lifeos/goals");
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const addMilestoneMutation = useMutation({
        mutationFn: (values: MilestoneFormInput) => lifeosApi.addMilestone(id, { title: values.title.trim() }),
        onSuccess: async (res) => {
            notify.success(res.message || t("addMilestone"));
            milestoneForm.reset({ title: "" });
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const toggleMilestoneMutation = useMutation({
        mutationFn: ({ milestoneId, isCompleted }: { milestoneId: string; isCompleted: boolean }) =>
            lifeosApi.updateMilestone(id, milestoneId, { is_completed: isCompleted }),
        onSuccess: async () => {
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const deleteMilestoneMutation = useMutation({
        mutationFn: (milestoneId: string) => lifeosApi.deleteMilestone(id, milestoneId),
        onSuccess: async (res) => {
            notify.success(res.message || t("milestones"));
            await invalidate();
        },
        onError: (error) => notify.error(toApiError(error).message),
    });

    const openDelete = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setDeleteOpen(true);
        setModalOpen(true);
    };

    const closeDelete = (afterExit = false) => {
        setModalOpen(false);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(
            () => {
                setDeleteOpen(false);
                closeTimerRef.current = null;
            },
            afterExit ? MODAL_EXIT_MS : 0,
        );
    };

    if (goalQuery.isLoading) {
        return (
            <div className="flex justify-center py-20">
                <LoadingIndicator label={t("detailLoading")} />
            </div>
        );
    }

    if (goalQuery.isError || !goalQuery.data) {
        return (
            <div className="space-y-4 rounded-2xl bg-primary p-8 shadow-xs ring-1 ring-secondary">
                <h1 className="text-display-xs font-semibold text-primary">{t("notFound")}</h1>
                <Button color="secondary" iconLeading={ArrowLeft} onPress={() => router.push("/lifeos/goals")}>
                    {t("backToList")}
                </Button>
            </div>
        );
    }

    const goal = goalQuery.data;
    const milestones = goal.milestones ?? [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-3">
                    <Link
                        href="/lifeos/goals"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-tertiary hover:text-secondary"
                    >
                        <ArrowLeft className="size-4" />
                        {t("backToList")}
                    </Link>
                    <div>
                        <h1 className="text-display-xs font-semibold text-primary">{goal.title}</h1>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <BadgeWithDot size="sm" color={statusBadgeColor(goal.status)}>
                                {t(`status.${goal.status}`)}
                            </BadgeWithDot>
                            <BadgeWithDot size="sm" color={priorityBadgeColor(goal.priority)}>
                                {t(`priority.${goal.priority}`)}
                            </BadgeWithDot>
                            {goal.category ? (
                                <BadgeWithDot size="sm" color="gray">
                                    {goal.category}
                                </BadgeWithDot>
                            ) : null}
                        </div>
                    </div>
                </div>
                <Button color="primary-destructive" size="md" iconLeading={Trash01} onPress={openDelete}>
                    {t("delete")}
                </Button>
            </div>

            <div className="rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary sm:p-6">
                <p className="text-sm font-medium text-secondary">{t("progressLabel")}</p>
                <div className="mt-3">
                    <ProgressBar value={goal.progress} labelPosition="right" />
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                        <dt className="text-tertiary">{t("startDateLabel")}</dt>
                        <dd className="mt-1 font-medium text-primary">
                            {goal.start_date ? formatDate(goal.start_date, { locale }) : "—"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-tertiary">{t("targetDateLabel")}</dt>
                        <dd className="mt-1 font-medium text-primary">
                            {goal.target_date ? formatDate(goal.target_date, { locale }) : "—"}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-tertiary">{t("targetValueLabel")}</dt>
                        <dd className="mt-1 font-medium text-primary">
                            {goal.target_value != null
                                ? `${goal.current_value}/${goal.target_value}${goal.unit ? ` ${goal.unit}` : ""}`
                                : "—"}
                        </dd>
                    </div>
                </dl>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <form
                    className="rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary sm:p-6"
                    onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
                >
                    <h2 className="text-lg font-semibold text-primary">{t("edit")}</h2>
                    <div className="mt-5 space-y-4">
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
                                    rows={4}
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
                    <div className="mt-6 flex justify-end">
                        <Button type="submit" isLoading={saveMutation.isPending}>
                            {t("save")}
                        </Button>
                    </div>
                </form>

                <section className="rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-primary">{t("milestones")}</h2>
                        <span className="text-sm text-tertiary">
                            {milestones.filter((m) => m.is_completed).length}/{milestones.length}
                        </span>
                    </div>

                    <form
                        className="mt-4 flex gap-2"
                        onSubmit={milestoneForm.handleSubmit((values) => addMilestoneMutation.mutate(values))}
                    >
                        <div className="min-w-0 flex-1">
                            <Controller
                                control={milestoneForm.control}
                                name="title"
                                render={({ field, fieldState }) => (
                                    <Input
                                        aria-label={t("milestonePlaceholder")}
                                        placeholder={tCommon("enterData")}
                                        value={field.value}
                                        onChange={field.onChange}
                                        isInvalid={fieldState.invalid}
                                        hint={fieldState.error?.message}
                                    />
                                )}
                            />
                        </div>
                        <Button
                            type="submit"
                            iconLeading={Plus}
                            isLoading={addMilestoneMutation.isPending}
                            className="shrink-0 self-start"
                        >
                            {t("addMilestone")}
                        </Button>
                    </form>

                    <ul className="mt-5 space-y-2">
                        {milestones.length === 0 ? (
                            <li className="rounded-xl bg-secondary px-4 py-6 text-center text-sm text-tertiary">
                                {t("milestonesEmpty")}
                            </li>
                        ) : (
                            milestones.map((m) => (
                                <li
                                    key={m.id}
                                    className={cx(
                                        "flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-secondary",
                                        m.is_completed ? "bg-secondary/60" : "bg-primary",
                                    )}
                                >
                                    <Checkbox
                                        isSelected={m.is_completed}
                                        onChange={(checked) =>
                                            toggleMilestoneMutation.mutate({
                                                milestoneId: m.id,
                                                isCompleted: checked,
                                            })
                                        }
                                        aria-label={m.title}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={cx(
                                                "truncate text-sm font-medium",
                                                m.is_completed ? "text-tertiary line-through" : "text-primary",
                                            )}
                                        >
                                            {m.title}
                                        </p>
                                        {m.is_completed && m.completed_at ? (
                                            <p className="mt-0.5 flex items-center gap-1 text-xs text-quaternary">
                                                <CheckCircle className="size-3.5" />
                                                {formatDate(m.completed_at, { locale, withTime: true })}
                                            </p>
                                        ) : null}
                                    </div>
                                    <Button
                                        size="sm"
                                        color="tertiary"
                                        iconLeading={Trash01}
                                        aria-label={t("delete")}
                                        onPress={() => deleteMilestoneMutation.mutate(m.id)}
                                    />
                                </li>
                            ))
                        )}
                    </ul>
                </section>
            </div>

            <ModalOverlay
                isOpen={modalOpen}
                onOpenChange={(open) => {
                    if (!open && !deleteMutation.isPending) closeDelete(true);
                }}
                isDismissable={!deleteMutation.isPending}
            >
                <Modal className="max-w-md">
                    <Dialog className="p-6 sm:p-8">
                        {deleteOpen ? (
                            <div className="space-y-5">
                                <div>
                                    <Heading slot="title" className="text-lg font-semibold text-primary">
                                        {t("delete")}
                                    </Heading>
                                    <p className="mt-2 text-sm text-tertiary">{t("deleteConfirm")}</p>
                                    <p className="mt-3 text-sm font-medium text-primary">{goal.title}</p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button
                                        color="secondary"
                                        onPress={() => closeDelete(true)}
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
