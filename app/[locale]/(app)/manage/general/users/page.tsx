"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { DialogTrigger, Heading, Popover, type SortDescriptor } from "react-aria-components";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import {
    CheckVerified01,
    ChevronDown,
    CreditCard01,
    DotsVertical,
    Download01,
    Edit01,
    FilterLines,
    Key01,
    LogOut01,
    Mail01,
    Plus,
    RefreshCcw01,
    SearchLg,
    Trash01,
    Users01,
} from "@untitledui/icons";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Table, TableCard } from "@/components/application/table/table";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Dialog, Modal, ModalOverlay, MODAL_EXIT_MS } from "@/components/application/modals/modal";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { adminApi } from "@/lib/api";
import { formatDate } from "@/lib/date";
import { notify } from "@/lib/notify";
import { queryKeys } from "@/lib/query-keys";
import {
    adminSearchSchema,
    createAdminResetPasswordSchema,
    createAdminUserSchema,
    type AdminResetPasswordInput,
    type AdminSearchInput,
    type AdminUserInput,
} from "@/lib/schemas";
import { Permission } from "@/lib/permissions";
import type { BillingPlanCode, User } from "@/lib/types";
import { useRequireAuth } from "@/providers/auth-provider";
import type { FC } from "react";
import { cx } from "@/utils/cx";

function roleBadgeColor(role: string): "brand" | "success" | "gray" {
    switch (role.toLowerCase()) {
        case "admin":
            return "brand";
        case "moderator":
            return "success";
        default:
            return "gray";
    }
}

function planBadgeColor(plan: string): "brand" | "gray" {
    return plan.toLowerCase() === "pro" ? "brand" : "gray";
}

function planLabel(plan: string | undefined, t: (key: "planFree" | "planPro") => string) {
    return plan?.toLowerCase() === "pro" ? t("planPro") : t("planFree");
}

type AdminFilters = {
    role: string;
    auth_provider: string;
    deleted_status: string;
    created_from: string;
    created_to: string;
    updated_from: string;
    updated_to: string;
};

const emptyFilters: AdminFilters = {
    role: "",
    auth_provider: "",
    deleted_status: "active",
    created_from: "",
    created_to: "",
    updated_from: "",
    updated_to: "",
};

function countActiveFilters(filters: AdminFilters) {
    return Object.entries(filters).filter(([key, value]) => {
        if (!value) return false;
        if (key === "deleted_status" && value === "active") return false;
        return true;
    }).length;
}

type ConfirmAction = "kick" | "delete" | "restore" | "verifyEmail" | "sendReset";
type ActionKey = ConfirmAction | "setPassword" | "edit" | "setPlan";

type DialogState =
    | { type: "none" }
    | { type: "plan"; user: User }
    | { type: "confirm"; action: ConfirmAction; user: User }
    | { type: "reset"; user: User }
    | { type: "confirmReset"; user: User; values: AdminResetPasswordInput }
    | { type: "form"; mode: "create" | "edit"; user?: User }
    | { type: "confirmForm"; mode: "create" | "edit"; user?: User; values: AdminUserInput };

type UserAction = {
    id: ActionKey;
    label: string;
    icon: FC<{ className?: string }>;
};

const VISIBLE_ACTION_LIMIT = 2;

function getUserActions(
    user: User,
    currentUserId: string | undefined,
    t: (key: string) => string,
    can: (permission: string) => boolean,
): UserAction[] {
    const isSelf = user.id === currentUserId;
    const isDeleted = Boolean(user.deleted_at);
    const verified = Boolean(user.email_verified_at);

    if (isDeleted) {
        if (isSelf || !can(Permission.UsersRestore)) return [];
        return [{ id: "restore", label: t("restore"), icon: RefreshCcw01 }];
    }

    const actions: UserAction[] = [];

    if (can(Permission.UsersUpdate)) {
        actions.push({ id: "edit", label: t("edit"), icon: Edit01 });
    }
    if (can(Permission.UsersResetPassword)) {
        actions.push({ id: "sendReset", label: t("sendReset"), icon: Mail01 });
        if (!isSelf) {
            actions.push({ id: "setPassword", label: t("setPassword"), icon: Key01 });
        }
    }
    if (!verified && can(Permission.UsersVerifyEmail)) {
        actions.push({ id: "verifyEmail", label: t("verifyEmail"), icon: CheckVerified01 });
    }
    if (can(Permission.UsersUpdate)) {
        actions.push({ id: "setPlan", label: t("setPlan"), icon: CreditCard01 });
    }
    if (!isSelf && can(Permission.UsersKick)) {
        actions.push({ id: "kick", label: t("kick"), icon: LogOut01 });
    }
    if (!isSelf && can(Permission.UsersDelete)) {
        actions.push({ id: "delete", label: t("delete"), icon: Trash01 });
    }

    return actions;
}

export default function UserAccountsPage() {
    const auth = useRequireAuth({ permission: Permission.UsersRead });
    const locale = useLocale();
    const t = useTranslations("admin");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();
    const can = auth.hasPermission;

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [appliedSearch, setAppliedSearch] = useState("");
    const [appliedFilters, setAppliedFilters] = useState<AdminFilters>(emptyFilters);
    const [draftFilters, setDraftFilters] = useState<AdminFilters>(emptyFilters);
    const [dateRange, setDateRange] = useState<{ start: DateValue; end: DateValue } | null>(null);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "created_at",
        direction: "descending",
    });

    const sortBy = String(sortDescriptor.column ?? "created_at");
    const sortDir = sortDescriptor.direction === "ascending" ? "asc" : "desc";
    const [dialog, setDialog] = useState<DialogState>({ type: "none" });
    const [planChoice, setPlanChoice] = useState<BillingPlanCode>("free");
    const [modalOpen, setModalOpen] = useState(false);
    const closeDialogTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (closeDialogTimerRef.current) clearTimeout(closeDialogTimerRef.current);
        };
    }, []);

    const activeFilterCount = countActiveFilters(appliedFilters);

    const updateDraftFilter = <K extends keyof AdminFilters>(key: K, value: AdminFilters[K]) => {
        setDraftFilters((prev) => ({ ...prev, [key]: value }));
    };

    const { control, handleSubmit, reset: resetSearchForm, getValues } = useForm<AdminSearchInput>({
        resolver: zodResolver(adminSearchSchema),
        defaultValues: { search: "" },
    });

    const resetSchema = useMemo(() => createAdminResetPasswordSchema(tValidation), [tValidation]);
    const resetForm = useForm<AdminResetPasswordInput>({
        resolver: zodResolver(resetSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: { password: "", confirmPassword: "" },
    });

    const userSchema = useMemo(() => createAdminUserSchema(tValidation), [tValidation]);
    const userForm = useForm<AdminUserInput>({
        resolver: zodResolver(userSchema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: { username: "", email: "", role_id: "" },
    });

    const usersQuery = useQuery({
        queryKey: queryKeys.adminUsers({
            page,
            limit: pageSize,
            search: appliedSearch,
            ...appliedFilters,
            sort_by: sortBy,
            sort_dir: sortDir,
        }),
        queryFn: async () =>
            adminApi.users({
                page,
                limit: pageSize,
                search: appliedSearch || undefined,
                role: appliedFilters.role || undefined,
                auth_provider: appliedFilters.auth_provider || undefined,
                deleted_status: appliedFilters.deleted_status || undefined,
                created_from: appliedFilters.created_from || undefined,
                created_to: appliedFilters.created_to || undefined,
                updated_from: appliedFilters.updated_from || undefined,
                updated_to: appliedFilters.updated_to || undefined,
                sort_by: sortBy,
                sort_dir: sortDir,
            }),
    });

    const rolesQuery = useQuery({
        queryKey: queryKeys.adminRoles,
        queryFn: async () => {
            const res = await adminApi.roles();
            return res.data ?? [];
        },
        enabled: can(Permission.UsersRead) || can(Permission.UsersCreate) || can(Permission.UsersUpdate),
    });

    const roleOptions = useMemo(
        () =>
            (rolesQuery.data ?? []).map((role) => ({
                id: role.id,
                label: role.name,
            })),
        [rolesQuery.data],
    );

    const defaultRoleId = useMemo(() => {
        const userRole = (rolesQuery.data ?? []).find((role) => role.name.toLowerCase() === "user");
        return userRole?.id ?? roleOptions[0]?.id ?? "";
    }, [rolesQuery.data, roleOptions]);

    const invalidateUsers = async () => {
        await queryClient.invalidateQueries({ queryKey: ["admin"] });
    };

    const exportMutation = useMutation({
        mutationFn: async () => {
            const queued = await adminApi.exportUsers({
                search: appliedSearch || undefined,
                role: appliedFilters.role || undefined,
                auth_provider: appliedFilters.auth_provider || undefined,
                deleted_status: appliedFilters.deleted_status || undefined,
                created_from: appliedFilters.created_from || undefined,
                created_to: appliedFilters.created_to || undefined,
                updated_from: appliedFilters.updated_from || undefined,
                updated_to: appliedFilters.updated_to || undefined,
                sort_by: sortBy,
                sort_dir: sortDir,
            });

            const jobId = queued.data.id;
            await queryClient.invalidateQueries({ queryKey: ["notifications"] });
            const loadingToastId = notify.info(t("exportQueuedDescription"), {
                title: t("exportQueued"),
                duration: Infinity,
                hideDismissLabel: true,
            });

            const startedAt = Date.now();
            const timeoutMs = 2 * 60 * 1000;

            while (Date.now() - startedAt < timeoutMs) {
                await new Promise((resolve) => window.setTimeout(resolve, 1000));
                const statusRes = await adminApi.getExportJob(jobId);
                const job = statusRes.data;

                if (job.status === "completed") {
                    notify.dismiss(loadingToastId);
                    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    notify.success(t("exportReadyDescription"), {
                        title: t("exportReady"),
                        confirmLabel: t("exportDownload"),
                        duration: 20000,
                        onConfirm: () => {
                            void (async () => {
                                const blob = await adminApi.downloadExportJob(jobId);
                                const url = URL.createObjectURL(blob);
                                const anchor = document.createElement("a");
                                anchor.href = url;
                                anchor.download = job.file_name || `users-${jobId}.csv`;
                                document.body.appendChild(anchor);
                                anchor.click();
                                anchor.remove();
                                URL.revokeObjectURL(url);
                            })();
                        },
                    });
                    return job;
                }

                if (job.status === "failed") {
                    notify.dismiss(loadingToastId);
                    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    throw new Error(job.error_message || t("exportFailed"));
                }
            }

            notify.dismiss(loadingToastId);
            await queryClient.invalidateQueries({ queryKey: ["notifications"] });
            throw new Error(t("exportFailed"));
        },
        onError: (error) => {
            notify.error(error instanceof Error ? error.message : t("exportFailedDescription"), {
                title: t("exportFailed"),
            });
        },
    });

    const actionMutation = useMutation({
        mutationFn: async () => {
            if (dialog.type !== "confirm") throw new Error("invalid dialog");
            const { action, user } = dialog;
            switch (action) {
                case "kick":
                    return adminApi.kickUser(user.id);
                case "delete":
                    return adminApi.deleteUser(user.id);
                case "restore":
                    return adminApi.restoreUser(user.id);
                case "verifyEmail":
                    return adminApi.verifyEmail(user.id);
                case "sendReset":
                    return adminApi.sendResetPassword(user.id);
            }
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("actionSuccess"));
            closeDialog(true);
            await invalidateUsers();
        },
    });

    const resetMutation = useMutation({
        mutationFn: async () => {
            if (dialog.type !== "confirmReset") throw new Error("invalid dialog");
            return adminApi.resetPassword(dialog.user.id, dialog.values.password);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("actionSuccess"));
            resetForm.reset();
            closeDialog(true);
            await invalidateUsers();
        },
    });

    const userMutation = useMutation({
        mutationFn: async () => {
            if (dialog.type !== "confirmForm") throw new Error("invalid dialog");
            if (dialog.mode === "create") {
                return adminApi.createUser(dialog.values);
            }
            if (!dialog.user) throw new Error("missing user");
            return adminApi.updateUser(dialog.user.id, dialog.values);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("actionSuccess"));
            userForm.reset({ username: "", email: "", role_id: defaultRoleId });
            closeDialog(true);
            await invalidateUsers();
        },
    });

    const planMutation = useMutation({
        mutationFn: async () => {
            if (dialog.type !== "plan") throw new Error("invalid dialog");
            return adminApi.updateUserSubscription(dialog.user.id, { plan_code: planChoice });
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("actionSuccess"));
            closeDialog(true);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["billing"] }),
                invalidateUsers(),
            ]);
        },
    });

    const applySearch = (searchValue?: string) => {
        setPage(1);
        setAppliedSearch((searchValue ?? getValues("search") ?? "").trim());
        setAppliedFilters(draftFilters);
        setFilterOpen(false);
    };

    const onSearch = handleSubmit((values) => {
        applySearch(values.search);
    });

    const clearFilters = () => {
        setPage(1);
        setAppliedSearch("");
        setAppliedFilters(emptyFilters);
        setDraftFilters(emptyFilters);
        setDateRange(null);
        resetSearchForm({ search: "" });
        setFilterOpen(false);
    };

    const applyDateRange = () => {
        setPage(1);
        const created_from = dateRange?.start.toString() ?? "";
        const created_to = dateRange?.end.toString() ?? "";
        setAppliedFilters((prev) => ({ ...prev, created_from, created_to }));
        setDraftFilters((prev) => ({ ...prev, created_from, created_to }));
    };

    const openDialog = (next: Exclude<DialogState, { type: "none" }>) => {
        if (closeDialogTimerRef.current) {
            clearTimeout(closeDialogTimerRef.current);
            closeDialogTimerRef.current = null;
        }
        setDialog(next);
        setModalOpen(true);
    };

    const openConfirm = (action: ConfirmAction, user: User) => {
        openDialog({ type: "confirm", action, user });
    };

    const openReset = (user: User) => {
        resetForm.reset({ password: "", confirmPassword: "" });
        openDialog({ type: "reset", user });
    };

    const openCreate = () => {
        userForm.reset({ username: "", email: "", role_id: defaultRoleId });
        openDialog({ type: "form", mode: "create" });
    };

    const openPlan = (user: User) => {
        setPlanChoice(user.plan_code === "pro" ? "pro" : "free");
        openDialog({ type: "plan", user });
    };

    const openEdit = (user: User) => {
        userForm.reset({
            username: user.username,
            email: user.email,
            role_id: user.role_id || defaultRoleId,
        });
        openDialog({ type: "form", mode: "edit", user });
    };

    const closeDialog = (force = false) => {
        if (
            !force
            && (actionMutation.isPending || resetMutation.isPending || userMutation.isPending || planMutation.isPending)
        ) {
            return;
        }
        setModalOpen(false);
        if (closeDialogTimerRef.current) clearTimeout(closeDialogTimerRef.current);
        // Keep dialog content mounted until exit animation finishes.
        closeDialogTimerRef.current = setTimeout(() => {
            setDialog({ type: "none" });
            closeDialogTimerRef.current = null;
        }, MODAL_EXIT_MS);
    };

    const confirmMessage = (() => {
        if (dialog.type !== "confirm") return "";
        const name = dialog.user.username;
        switch (dialog.action) {
            case "kick":
                return t("confirmKick", { name });
            case "delete":
                return t("confirmDelete", { name });
            case "restore":
                return t("confirmRestore", { name });
            case "verifyEmail":
                return t("confirmVerify", { name });
            case "sendReset":
                return t("confirmSendReset", { email: dialog.user.email });
        }
    })();

    const backToForm = () => {
        if (dialog.type === "confirmForm") {
            openDialog({ type: "form", mode: dialog.mode, user: dialog.user });
            return;
        }
        if (dialog.type === "confirmReset") {
            openDialog({ type: "reset", user: dialog.user });
        }
    };

    const users = usersQuery.data?.data ?? [];
    const totalPages = usersQuery.data?.meta.totalPages || 1;
    const total = usersQuery.data?.meta.total || 0;
    const loading = usersQuery.isLoading;
    const currentUserId = auth.user?.id;

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
            <TableCard.Root className="flex flex-1 flex-col">
                <TableCard.Header
                    title={t("users")}
                    badge={`${total}`}
                    description={t("tableDescription")}
                    contentTrailing={
                        <div className="flex items-center gap-3">
                            {can(Permission.UsersExport) ? (
                                <Button
                                    color="secondary"
                                    size="sm"
                                    iconLeading={Download01}
                                    isLoading={exportMutation.isPending}
                                    onPress={() => exportMutation.mutate()}
                                >
                                    {t("exportCsv")}
                                </Button>
                            ) : null}
                            {can(Permission.UsersCreate) ? (
                                <Button size="sm" iconLeading={Plus} onPress={openCreate}>
                                    {t("addUser")}
                                </Button>
                            ) : null}
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
                                            if (key === "refresh") void usersQuery.refetch();
                                        }}
                                    >
                                        <Dropdown.Item
                                            id="refresh"
                                            icon={RefreshCcw01}
                                            label={tCommon("refresh")}
                                        />
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
                            control={control}
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
                        <DateRangePicker
                            aria-label={t("selectDates")}
                            placeholder={t("selectDates")}
                            size="sm"
                            className="max-md:hidden"
                            value={dateRange}
                            onChange={setDateRange}
                            onApply={applyDateRange}
                            onCancel={() => {
                                if (appliedFilters.created_from && appliedFilters.created_to) {
                                    try {
                                        setDateRange({
                                            start: parseDate(appliedFilters.created_from),
                                            end: parseDate(appliedFilters.created_to),
                                        });
                                    } catch {
                                        setDateRange(null);
                                    }
                                } else {
                                    setDateRange(null);
                                }
                            }}
                        />
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
                                                label={t("filterRole")}
                                                selectedKey={draftFilters.role || "__all__"}
                                                onSelectionChange={(key) =>
                                                    updateDraftFilter("role", !key || key === "__all__" ? "" : String(key))
                                                }
                                                items={[
                                                    { id: "__all__", label: t("filterAll") },
                                                    ...roleOptions,
                                                ]}
                                            >
                                                {(item) => <Select.Item id={item.id} label={item.label} />}
                                            </Select>
                                            <Select
                                                size="sm"
                                                label={t("filterProvider")}
                                                selectedKey={draftFilters.auth_provider || "__all__"}
                                                onSelectionChange={(key) =>
                                                    updateDraftFilter(
                                                        "auth_provider",
                                                        !key || key === "__all__" ? "" : String(key),
                                                    )
                                                }
                                                items={[
                                                    { id: "__all__", label: t("filterAll") },
                                                    { id: "local", label: t("providerLocal") },
                                                    { id: "discord", label: t("providerDiscord") },
                                                    { id: "google", label: t("providerGoogle") },
                                                ]}
                                            >
                                                {(item) => <Select.Item id={item.id} label={item.label} />}
                                            </Select>
                                            <Select
                                                size="sm"
                                                label={t("filterStatus")}
                                                selectedKey={draftFilters.deleted_status || "active"}
                                                onSelectionChange={(key) =>
                                                    updateDraftFilter("deleted_status", String(key ?? "active"))
                                                }
                                                items={[
                                                    { id: "active", label: t("statusActive") },
                                                    { id: "deleted", label: t("statusDeleted") },
                                                    { id: "all", label: t("statusAll") },
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
                ) : users.length === 0 ? (
                    <div className="flex min-h-[min(28rem,60dvh)] w-full flex-1 items-center justify-center px-8 py-12">
                        <EmptyState size="md">
                            <EmptyState.Header>
                                <EmptyState.FeaturedIcon
                                    color="gray"
                                    theme="modern"
                                    icon={appliedSearch || activeFilterCount > 0 ? SearchLg : Users01}
                                />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>
                                    {appliedSearch || activeFilterCount > 0 ? t("emptyTitle") : t("emptyNoUsersTitle")}
                                </EmptyState.Title>
                                <EmptyState.Description>
                                    {appliedSearch
                                        ? t("emptySearchDescription", { query: appliedSearch })
                                        : activeFilterCount > 0
                                          ? t("emptyDescription")
                                          : t("emptyNoUsersDescription")}
                                </EmptyState.Description>
                            </EmptyState.Content>
                            <EmptyState.Footer>
                                {appliedSearch || activeFilterCount > 0 ? (
                                    <Button size="md" color="secondary" onPress={clearFilters}>
                                        {t("clearSearch")}
                                    </Button>
                                ) : can(Permission.UsersCreate) ? (
                                    <Button size="md" iconLeading={Plus} onPress={openCreate}>
                                        {t("addUser")}
                                    </Button>
                                ) : null}
                            </EmptyState.Footer>
                        </EmptyState>
                    </div>
                ) : (
                    <Table
                        aria-label={t("tableTitle")}
                        size="sm"
                        className="min-w-[64rem]"
                        sortDescriptor={sortDescriptor}
                        onSortChange={(next) => {
                            setPage(1);
                            setSortDescriptor(next);
                        }}
                    >
                        <Table.Header>
                            <Table.Head id="username" label={t("user")} isRowHeader allowsSorting />
                            <Table.Head id="role" label={t("role")} allowsSorting />
                            <Table.Head id="plan_code" label={t("plan")} allowsSorting />
                            <Table.Head id="auth_provider" label={t("provider")} allowsSorting />
                            <Table.Head id="email_verified_at" label={t("emailStatus")} allowsSorting />
                            <Table.Head id="created_at" label={t("created")} allowsSorting />
                            <Table.Head id="updated_at" label={t("updated")} allowsSorting />
                            <Table.Head
                                label={t("actions")}
                                className="sticky right-0 z-20 border-l border-secondary bg-secondary [&>div]:justify-center"
                            />
                        </Table.Header>
                        <Table.Body items={users}>
                            {(user) => {
                                const isSelf = user.id === currentUserId;
                                const verified = Boolean(user.email_verified_at);
                                const actions = getUserActions(user, currentUserId, t, can);
                                const visibleActions = actions.slice(0, VISIBLE_ACTION_LIMIT);
                                const overflowActions = actions.slice(VISIBLE_ACTION_LIMIT);

                                const runAction = (key: ActionKey) => {
                                    switch (key) {
                                        case "edit":
                                            openEdit(user);
                                            break;
                                        case "sendReset":
                                            openConfirm("sendReset", user);
                                            break;
                                        case "setPlan":
                                            openPlan(user);
                                            break;
                                        case "setPassword":
                                            openReset(user);
                                            break;
                                        case "verifyEmail":
                                            openConfirm("verifyEmail", user);
                                            break;
                                        case "kick":
                                            openConfirm("kick", user);
                                            break;
                                        case "delete":
                                            openConfirm("delete", user);
                                            break;
                                        case "restore":
                                            openConfirm("restore", user);
                                            break;
                                    }
                                };

                                const isDeleted = Boolean(user.deleted_at);

                                return (
                                    <Table.Row id={user.id} className="group/row">
                                        <Table.Cell>
                                            <div>
                                                <p className="font-medium text-primary">
                                                    {user.username}
                                                    {isSelf ? (
                                                        <span className="ml-2 text-xs font-normal text-tertiary">
                                                            ({t("you")})
                                                        </span>
                                                    ) : null}
                                                    {isDeleted ? (
                                                        <span className="ml-2">
                                                            <Badge color="error" size="sm">
                                                                {t("deleted")}
                                                            </Badge>
                                                        </span>
                                                    ) : null}
                                                </p>
                                                <p className="text-sm text-tertiary">{user.email}</p>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <BadgeWithDot color={roleBadgeColor(user.role)} size="sm">
                                                {user.role}
                                            </BadgeWithDot>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <BadgeWithDot color={planBadgeColor(user.plan_code || "free")} size="sm">
                                                {planLabel(user.plan_code, t)}
                                            </BadgeWithDot>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <BadgeWithDot color="blue" size="sm">
                                                {user.auth_provider}
                                            </BadgeWithDot>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <BadgeWithDot color={verified ? "success" : "warning"} size="sm">
                                                {verified ? t("verified") : t("unverified")}
                                            </BadgeWithDot>
                                        </Table.Cell>
                                        <Table.Cell>{formatDate(user.created_at, { locale })}</Table.Cell>
                                        <Table.Cell>{formatDate(user.updated_at, { locale })}</Table.Cell>
                                        <Table.Cell className="sticky right-0 z-10 border-l border-secondary bg-primary group-hover/row:bg-secondary">
                                            <div className="flex items-center justify-center gap-1">
                                                {visibleActions.map((action) => (
                                                    <ButtonUtility
                                                        key={action.id}
                                                        size="xs"
                                                        color="secondary"
                                                        icon={action.icon}
                                                        tooltip={action.label}
                                                        onPress={() => runAction(action.id)}
                                                    />
                                                ))}
                                                {overflowActions.length > 0 ? (
                                                    <Dropdown.Root>
                                                        <ButtonUtility
                                                            size="xs"
                                                            color="secondary"
                                                            icon={DotsVertical}
                                                            aria-label={t("actionMenu")}
                                                        />
                                                        <Dropdown.Popover className="w-min">
                                                            <Dropdown.Menu
                                                                onAction={(key) => runAction(String(key) as ActionKey)}
                                                            >
                                                                {overflowActions.flatMap((action) => {
                                                                    const item = (
                                                                        <Dropdown.Item
                                                                            key={action.id}
                                                                            id={action.id}
                                                                            icon={action.icon}
                                                                            label={action.label}
                                                                        />
                                                                    );
                                                                    if (action.id === "delete") {
                                                                        return [
                                                                            <Dropdown.Separator key={`${action.id}-sep`} />,
                                                                            item,
                                                                        ];
                                                                    }
                                                                    return [item];
                                                                })}
                                                            </Dropdown.Menu>
                                                        </Dropdown.Popover>
                                                    </Dropdown.Root>
                                                ) : null}
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                );
                            }}
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
                isOpen={modalOpen}
                onOpenChange={(open) => {
                    if (!open) closeDialog();
                }}
                isDismissable={
                    !actionMutation.isPending
                    && !resetMutation.isPending
                    && !userMutation.isPending
                    && !planMutation.isPending
                }
            >
                <Modal className="max-w-md">
                    <Dialog className="p-6 sm:p-8">
                        {dialog.type === "plan" ? (
                            <div className="space-y-5">
                                <div>
                                    <Heading slot="title" className="text-lg font-semibold text-primary">
                                        {t("setPlanTitle", { name: dialog.user.username })}
                                    </Heading>
                                    <p className="mt-1 text-sm text-tertiary">{t("setPlanDescription")}</p>
                                </div>
                                <Select
                                    label={t("plan")}
                                    selectedKey={planChoice}
                                    onSelectionChange={(key) => {
                                        if (key === "free" || key === "pro") setPlanChoice(key);
                                    }}
                                    items={[
                                        { id: "free", label: t("planFree") },
                                        { id: "pro", label: t("planPro") },
                                    ]}
                                >
                                    {(item) => <Select.Item id={item.id} label={item.label} />}
                                </Select>
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onPress={() => closeDialog()} isDisabled={planMutation.isPending}>
                                        {t("cancel")}
                                    </Button>
                                    <Button onPress={() => planMutation.mutate()} isLoading={planMutation.isPending}>
                                        {t("save")}
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {dialog.type === "confirm" ? (
                            <div className="space-y-5">
                                <Heading slot="title" className="text-lg font-semibold text-primary">
                                    {t("confirm")}
                                </Heading>
                                <p className="text-sm text-tertiary">{confirmMessage}</p>
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onPress={() => closeDialog()} isDisabled={actionMutation.isPending}>
                                        {t("cancel")}
                                    </Button>
                                    <Button
                                        color={dialog.action === "delete" ? "primary-destructive" : "primary"}
                                        onPress={() => actionMutation.mutate()}
                                        isLoading={actionMutation.isPending}
                                    >
                                        {t("confirm")}
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {dialog.type === "confirmForm" ? (
                            <div className="space-y-5">
                                <Heading slot="title" className="text-lg font-semibold text-primary">
                                    {dialog.mode === "create" ? t("confirmCreateTitle") : t("confirmUpdateTitle")}
                                </Heading>
                                <p className="text-sm text-tertiary">
                                    {dialog.mode === "create"
                                        ? t("confirmCreateUser", { name: dialog.values.username })
                                        : t("confirmUpdateUser", {
                                              name: dialog.user?.username ?? dialog.values.username,
                                          })}
                                </p>
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onPress={backToForm} isDisabled={userMutation.isPending}>
                                        {t("back")}
                                    </Button>
                                    <Button onPress={() => userMutation.mutate()} isLoading={userMutation.isPending}>
                                        {t("confirm")}
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {dialog.type === "confirmReset" ? (
                            <div className="space-y-5">
                                <Heading slot="title" className="text-lg font-semibold text-primary">
                                    {t("confirmResetTitle")}
                                </Heading>
                                <p className="text-sm text-tertiary">
                                    {t("confirmSetPassword", { name: dialog.user.username })}
                                </p>
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onPress={backToForm} isDisabled={resetMutation.isPending}>
                                        {t("back")}
                                    </Button>
                                    <Button onPress={() => resetMutation.mutate()} isLoading={resetMutation.isPending}>
                                        {t("confirm")}
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {dialog.type === "reset" ? (
                            <form
                                className="space-y-5"
                                noValidate
                                onSubmit={resetForm.handleSubmit((values) =>
                                    openDialog({ type: "confirmReset", user: dialog.user, values }),
                                )}
                            >
                                <div>
                                    <Heading slot="title" className="text-lg font-semibold text-primary">
                                        {t("resetTitle", { name: dialog.user.username })}
                                    </Heading>
                                    <p className="mt-1 text-sm text-tertiary">{t("resetDescription")}</p>
                                </div>
                                <Controller
                                    name="password"
                                    control={resetForm.control}
                                    render={({ field, fieldState }) => (
                                        <Input
                                            name={field.name}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            ref={field.ref}
                                            type="password"
                                            label={t("password")}
                                            placeholder={tCommon("enterData")}
                                            isInvalid={Boolean(fieldState.error)}
                                            hint={fieldState.error?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="confirmPassword"
                                    control={resetForm.control}
                                    render={({ field, fieldState }) => (
                                        <Input
                                            name={field.name}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            ref={field.ref}
                                            type="password"
                                            label={t("confirmPassword")}
                                            placeholder={tCommon("enterData")}
                                            isInvalid={Boolean(fieldState.error)}
                                            hint={fieldState.error?.message}
                                        />
                                    )}
                                />
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onPress={() => closeDialog()} isDisabled={resetMutation.isPending}>
                                        {t("cancel")}
                                    </Button>
                                    <Button type="submit" isLoading={resetMutation.isPending}>
                                        {t("save")}
                                    </Button>
                                </div>
                            </form>
                        ) : null}

                        {dialog.type === "form" ? (
                            <form
                                className="space-y-5"
                                noValidate
                                onSubmit={userForm.handleSubmit((values) =>
                                    openDialog({
                                        type: "confirmForm",
                                        mode: dialog.mode,
                                        user: dialog.user,
                                        values,
                                    }),
                                )}
                            >
                                <div>
                                    <Heading slot="title" className="text-lg font-semibold text-primary">
                                        {dialog.mode === "create"
                                            ? t("createTitle")
                                            : t("editTitle", { name: dialog.user?.username ?? "" })}
                                    </Heading>
                                    <p className="mt-1 text-sm text-tertiary">{t("formDescription")}</p>
                                </div>
                                <Controller
                                    name="username"
                                    control={userForm.control}
                                    render={({ field, fieldState }) => (
                                        <Input
                                            name={field.name}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            ref={field.ref}
                                            isRequired
                                            label={t("username")}
                                            placeholder={tCommon("enterData")}
                                            isInvalid={Boolean(fieldState.error)}
                                            hint={fieldState.error?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="email"
                                    control={userForm.control}
                                    render={({ field, fieldState }) => (
                                        <Input
                                            name={field.name}
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            ref={field.ref}
                                            isRequired
                                            type="email"
                                            label={t("email")}
                                            placeholder={tCommon("enterData")}
                                            isInvalid={Boolean(fieldState.error)}
                                            hint={fieldState.error?.message}
                                        />
                                    )}
                                />
                                <Controller
                                    name="role_id"
                                    control={userForm.control}
                                    render={({ field, fieldState }) => (
                                        <Select
                                            label={t("role")}
                                            isRequired
                                            selectedKey={field.value || null}
                                            onSelectionChange={(key) => field.onChange(key ? String(key) : "")}
                                            items={roleOptions}
                                            isInvalid={Boolean(fieldState.error)}
                                            hint={fieldState.error?.message}
                                            placeholder={tCommon("enterData")}
                                        >
                                            {(item) => <Select.Item id={item.id} label={item.label} />}
                                        </Select>
                                    )}
                                />
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onPress={() => closeDialog()} isDisabled={userMutation.isPending}>
                                        {t("cancel")}
                                    </Button>
                                    <Button type="submit" isLoading={userMutation.isPending}>
                                        {dialog.mode === "create" ? t("createUser") : t("saveUser")}
                                    </Button>
                                </div>
                            </form>
                        ) : null}
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </div>
    );
}
