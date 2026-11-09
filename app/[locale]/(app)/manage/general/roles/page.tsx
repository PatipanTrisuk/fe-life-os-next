"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button as AriaButton, DialogTrigger, Heading, Popover } from "react-aria-components";
import {
    ChevronDown,
    DotsVertical,
    Edit01,
    FilterLines,
    Plus,
    RefreshCcw01,
    SearchLg,
    Trash01,
} from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Table, TableCard } from "@/components/application/table/table";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Dialog, Modal, ModalOverlay, MODAL_EXIT_MS } from "@/components/application/modals/modal";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { adminApi, toApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { Permission } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { adminSearchSchema, createAdminRoleSchema, type AdminRoleInput, type AdminSearchInput } from "@/lib/schemas";
import type { PermissionItem, RoleItem } from "@/lib/types";
import { useRequireAuth } from "@/providers/auth-provider";
import { cx } from "@/utils/cx";

type DialogState =
    | { type: "none" }
    | { type: "form"; mode: "create" | "edit"; role?: RoleItem }
    | { type: "confirmForm"; mode: "create" | "edit"; role?: RoleItem; values: AdminRoleInput }
    | { type: "delete"; role: RoleItem };

type RoleFilters = {
    type: string;
};

const emptyFilters: RoleFilters = {
    type: "",
};

function countActiveFilters(filters: RoleFilters) {
    return Object.values(filters).filter(Boolean).length;
}

type PermissionGroup = {
    key: string;
    items: PermissionItem[];
};

function groupPermissions(items: PermissionItem[]): PermissionGroup[] {
    const map = new Map<string, PermissionItem[]>();
    for (const item of items) {
        const key = item.code.includes(".") ? item.code.split(".")[0]! : "other";
        const list = map.get(key) ?? [];
        list.push(item);
        map.set(key, list);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, grouped]) => ({
            key,
            items: grouped.sort((a, b) => a.code.localeCompare(b.code)),
        }));
}

export default function RolesPage() {
    const auth = useRequireAuth({ permission: Permission.RolesRead });
    const t = useTranslations("rolesPage");
    const tCommon = useTranslations("common");
    const tValidation = useTranslations();
    const queryClient = useQueryClient();
    const can = auth.hasPermission;

    const permissionLabel = (code: string) => {
        const key = `permissionLabels.${code}` as Parameters<typeof t>[0];
        if (t.has(key)) {
            return t(key);
        }
        return code;
    };

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [appliedSearch, setAppliedSearch] = useState("");
    const [appliedFilters, setAppliedFilters] = useState<RoleFilters>(emptyFilters);
    const [draftFilters, setDraftFilters] = useState<RoleFilters>(emptyFilters);
    const [filterOpen, setFilterOpen] = useState(false);
    const [dialog, setDialog] = useState<DialogState>({ type: "none" });
    const [modalOpen, setModalOpen] = useState(false);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const permissionsScrollRef = useRef<HTMLDivElement>(null);

    const {
        control: searchControl,
        handleSubmit: handleSearchSubmit,
        getValues: getSearchValues,
        reset: resetSearchForm,
    } = useForm<AdminSearchInput>({
        resolver: zodResolver(adminSearchSchema),
        defaultValues: { search: "" },
    });

    const activeFilterCount = countActiveFilters(appliedFilters);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const rolesQuery = useQuery({
        queryKey: queryKeys.adminRoles,
        queryFn: async () => {
            const res = await adminApi.roles();
            return res.data ?? [];
        },
    });

    const permissionsQuery = useQuery({
        queryKey: queryKeys.adminPermissions,
        queryFn: async () => {
            const res = await adminApi.permissions();
            return res.data ?? [];
        },
        enabled: can(Permission.RolesCreate) || can(Permission.RolesUpdate),
    });

    const roleSchema = useMemo(() => createAdminRoleSchema(tValidation), [tValidation]);
    const form = useForm<AdminRoleInput>({
        resolver: zodResolver(roleSchema),
        defaultValues: { name: "", description: "", permissions: [] },
    });

    const openDialog = (next: Exclude<DialogState, { type: "none" }>) => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setDialog(next);
        setModalOpen(true);
    };

    const closeDialog = (afterExit = false) => {
        setModalOpen(false);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(
            () => {
                setDialog({ type: "none" });
                closeTimerRef.current = null;
            },
            afterExit ? MODAL_EXIT_MS : 0,
        );
    };

    const openCreate = () => {
        form.reset({ name: "", description: "", permissions: [] });
        openDialog({ type: "form", mode: "create" });
    };

    const openEdit = (role: RoleItem) => {
        form.reset({
            name: role.name,
            description: role.description ?? "",
            permissions: [...(role.permissions ?? [])],
        });
        openDialog({ type: "form", mode: "edit", role });
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            if (dialog.type !== "confirmForm") throw new Error("invalid dialog");
            if (dialog.mode === "create") {
                return adminApi.createRole(dialog.values);
            }
            if (!dialog.role) throw new Error("missing role");
            return adminApi.updateRole(dialog.role.id, {
                name: dialog.role.is_system ? dialog.role.name : dialog.values.name,
                description: dialog.values.description,
                permissions: dialog.values.permissions,
            });
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("save"));
            closeDialog(true);
            await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles });
            await auth.refreshProfile();
        },
        onError: (error) => {
            notify.error(toApiError(error).message);
        },
    });

    const backToForm = () => {
        if (dialog.type !== "confirmForm") return;
        openDialog({ type: "form", mode: dialog.mode, role: dialog.role });
    };

    const deleteMutation = useMutation({
        mutationFn: async () => {
            if (dialog.type !== "delete") throw new Error("invalid dialog");
            return adminApi.deleteRole(dialog.role.id);
        },
        onSuccess: async (res) => {
            notify.success(res.message || t("delete"));
            closeDialog(true);
            await queryClient.invalidateQueries({ queryKey: queryKeys.adminRoles });
        },
        onError: (error) => {
            notify.error(toApiError(error).message);
        },
    });

    const roles = rolesQuery.data ?? [];
    const filteredRoles = useMemo(() => {
        const q = appliedSearch.trim().toLowerCase();
        return roles.filter((role) => {
            if (appliedFilters.type === "system" && !role.is_system) return false;
            if (appliedFilters.type === "custom" && role.is_system) return false;
            if (!q) return true;
            const name = role.name.toLowerCase();
            const description = (role.description ?? "").toLowerCase();
            const typeLabel = role.is_system ? "system" : "custom";
            const perms = (role.permissions ?? [])
                .map((code) => `${code} ${permissionLabel(code)}`.toLowerCase())
                .join(" ");
            return name.includes(q) || description.includes(q) || typeLabel.includes(q) || perms.includes(q);
        });
    }, [roles, appliedSearch, appliedFilters, t]);

    const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
    const pagedRoles = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRoles.slice(start, start + pageSize);
    }, [filteredRoles, page, pageSize]);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const applySearch = (searchValue?: string) => {
        setPage(1);
        setAppliedSearch((searchValue ?? getSearchValues("search") ?? "").trim());
        setAppliedFilters(draftFilters);
        setFilterOpen(false);
    };

    const clearFilters = () => {
        setPage(1);
        setAppliedSearch("");
        setAppliedFilters(emptyFilters);
        setDraftFilters(emptyFilters);
        resetSearchForm({ search: "" });
        setFilterOpen(false);
    };

    const onSearch = handleSearchSubmit((values) => {
        applySearch(values.search);
    });

    const permissionCatalog = permissionsQuery.data ?? [];
    const permissionGroups = useMemo(() => groupPermissions(permissionCatalog), [permissionCatalog]);
    const selectedPermissions = form.watch("permissions") ?? [];
    const selectedSet = useMemo(() => new Set(selectedPermissions), [selectedPermissions]);
    const isSystemEdit = dialog.type === "form" && dialog.mode === "edit" && Boolean(dialog.role?.is_system);
    const isBusy = saveMutation.isPending || deleteMutation.isPending;

    useEffect(() => {
        if (!modalOpen || dialog.type !== "form") return;
        const el = permissionsScrollRef.current;
        if (!el) return;

        const onWheel = (event: WheelEvent) => {
            if (el.scrollHeight <= el.clientHeight) return;
            event.preventDefault();
            event.stopPropagation();
            el.scrollTop += event.deltaY;
        };

        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [modalOpen, dialog.type, permissionGroups.length]);

    const setPermissions = (next: string[]) => {
        form.setValue("permissions", next, { shouldDirty: true, shouldValidate: true });
    };

    const togglePermission = (code: string, checked: boolean) => {
        const current = new Set(form.getValues("permissions") ?? []);
        if (checked) current.add(code);
        else current.delete(code);
        setPermissions(Array.from(current));
    };

    const toggleGroup = (group: PermissionGroup, checked: boolean) => {
        const current = new Set(form.getValues("permissions") ?? []);
        for (const item of group.items) {
            if (checked) current.add(item.code);
            else current.delete(item.code);
        }
        setPermissions(Array.from(current));
    };

    const groupState = (group: PermissionGroup) => {
        const selectedCount = group.items.filter((item) => selectedSet.has(item.code)).length;
        return {
            selectedCount,
            allSelected: selectedCount === group.items.length && group.items.length > 0,
            someSelected: selectedCount > 0 && selectedCount < group.items.length,
        };
    };

    const groupTitle = (key: string) => {
        if (key === "users" || key === "roles" || key === "admin" || key === "other") {
            return t(`groups.${key}`);
        }
        return key;
    };

    return (
        <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
            <TableCard.Root className="flex flex-1 flex-col">
                <TableCard.Header
                    title={t("title")}
                    badge={`${filteredRoles.length}`}
                    description={t("description")}
                    contentTrailing={
                        <div className="flex items-center gap-3">
                            {can(Permission.RolesCreate) ? (
                                <Button size="sm" iconLeading={Plus} onPress={openCreate}>
                                    {t("addRole")}
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
                                            if (key === "refresh") void rolesQuery.refetch();
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
                                            label={t("type")}
                                            selectedKey={draftFilters.type || "__all__"}
                                            onSelectionChange={(key) =>
                                                setDraftFilters((prev) => ({
                                                    ...prev,
                                                    type: !key || key === "__all__" ? "" : String(key),
                                                }))
                                            }
                                            items={[
                                                { id: "__all__", label: t("filterAll") },
                                                { id: "system", label: t("system") },
                                                { id: "custom", label: t("custom") },
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

                {rolesQuery.isLoading ? (
                    <div className="flex flex-1 items-center justify-center py-16">
                        <LoadingIndicator label={t("loading")} />
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center px-8 py-12">
                        <EmptyState size="sm">
                            <EmptyState.Header pattern="none">
                                <EmptyState.FeaturedIcon color="gray" theme="modern" icon={SearchLg} />
                            </EmptyState.Header>
                            <EmptyState.Content>
                                <EmptyState.Title>
                                    {appliedSearch || activeFilterCount > 0 ? t("emptySearch") : t("empty")}
                                </EmptyState.Title>
                            </EmptyState.Content>
                            {appliedSearch || activeFilterCount > 0 ? (
                                <EmptyState.Footer>
                                    <Button size="md" color="secondary" onPress={clearFilters}>
                                        {t("filterClear")}
                                    </Button>
                                </EmptyState.Footer>
                            ) : null}
                        </EmptyState>
                    </div>
                ) : (
                    <Table aria-label={t("title")} size="sm" className="min-w-[48rem]">
                        <Table.Header>
                            <Table.Head id="name" label={t("name")} isRowHeader />
                            <Table.Head id="description" label={t("descriptionLabel")} />
                            <Table.Head id="permissions" label={t("permissions")} />
                            <Table.Head id="type" label={t("type")} />
                            <Table.Head
                                label={t("actions")}
                                className="sticky right-0 z-20 border-l border-secondary bg-secondary [&>div]:justify-center"
                            />
                        </Table.Header>
                        <Table.Body items={pagedRoles}>
                            {(role) => {
                                const preview = (role.permissions ?? []).slice(0, 3);
                                const extra = Math.max((role.permissions?.length ?? 0) - preview.length, 0);
                                return (
                                    <Table.Row id={role.id} className="group/row">
                                        <Table.Cell>
                                            <span className="font-medium text-primary">{role.name}</span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <span className="line-clamp-2 text-sm text-tertiary">
                                                {role.description || "—"}
                                            </span>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {preview.length === 0 ? (
                                                    <span className="text-sm text-quaternary">—</span>
                                                ) : (
                                                    preview.map((code) => (
                                                        <Badge key={code} size="sm" color="gray" type="color">
                                                            {permissionLabel(code)}
                                                        </Badge>
                                                    ))
                                                )}
                                                {extra > 0 ? (
                                                    <DialogTrigger>
                                                        <AriaButton
                                                            aria-label={t("morePermissions", { count: extra })}
                                                            className={cx(
                                                                "inline-flex size-max cursor-pointer items-center whitespace-nowrap rounded-md bg-utility-neutral-50 px-1.5 py-0.5 text-xs font-medium text-utility-neutral-700 ring-1 ring-utility-neutral-200 ring-inset outline-focus-ring",
                                                                "hover:bg-utility-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2",
                                                            )}
                                                        >
                                                            +{extra}
                                                        </AriaButton>
                                                        <Popover
                                                            placement="bottom start"
                                                            offset={8}
                                                            className={({ isEntering, isExiting }) =>
                                                                cx(
                                                                    "w-[min(100vw-2rem,20rem)] origin-(--trigger-anchor-point) overflow-hidden rounded-xl bg-primary p-3 shadow-lg ring-1 ring-secondary_alt outline-hidden",
                                                                    isEntering &&
                                                                        "duration-150 ease-out animate-in fade-in placement-bottom:slide-in-from-top-0.5",
                                                                    isExiting &&
                                                                        "duration-100 ease-in animate-out fade-out placement-bottom:slide-out-to-top-0.5",
                                                                )
                                                            }
                                                        >
                                                            <Dialog className="outline-hidden">
                                                                <div className="space-y-2">
                                                                    <p className="text-xs font-semibold text-secondary">
                                                                        {t("permissionCount", {
                                                                            count: role.permissions?.length ?? 0,
                                                                        })}
                                                                    </p>
                                                                    <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto [scrollbar-width:auto]">
                                                                        {(role.permissions ?? []).map((code) => (
                                                                            <Badge
                                                                                key={code}
                                                                                size="sm"
                                                                                color="gray"
                                                                                type="color"
                                                                            >
                                                                                {permissionLabel(code)}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </Dialog>
                                                        </Popover>
                                                    </DialogTrigger>
                                                ) : null}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <BadgeWithDot
                                                color={role.is_system ? "brand" : "gray"}
                                                size="sm"
                                            >
                                                {role.is_system ? t("system") : t("custom")}
                                            </BadgeWithDot>
                                        </Table.Cell>
                                        <Table.Cell className="sticky right-0 z-10 border-l border-secondary bg-primary group-hover/row:bg-secondary">
                                            <div className="flex items-center justify-center gap-1">
                                                {can(Permission.RolesUpdate) ? (
                                                    <ButtonUtility
                                                        size="xs"
                                                        color="secondary"
                                                        tooltip={t("edit")}
                                                        icon={Edit01}
                                                        onPress={() => openEdit(role)}
                                                    />
                                                ) : null}
                                                {can(Permission.RolesDelete) && !role.is_system ? (
                                                    <ButtonUtility
                                                        size="xs"
                                                        color="secondary"
                                                        tooltip={t("delete")}
                                                        icon={Trash01}
                                                        onPress={() => openDialog({ type: "delete", role })}
                                                    />
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
                    total={totalPages}
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
                    if (!open && !isBusy) closeDialog(true);
                }}
                isDismissable={!isBusy}
            >
                <Modal className={dialog.type === "form" ? "max-w-2xl" : "max-w-md"}>
                    <Dialog
                        className={cx(
                            "p-6 sm:p-8",
                            dialog.type === "form" && "flex max-h-[inherit] flex-col !overflow-hidden",
                        )}
                    >
                        {dialog.type === "confirmForm" ? (
                            <div className="space-y-5">
                                <div>
                                    <Heading slot="title" className="text-lg font-semibold text-primary">
                                        {dialog.mode === "create" ? t("confirmCreateTitle") : t("confirmUpdateTitle")}
                                    </Heading>
                                    <p className="mt-2 text-sm text-tertiary">
                                        {dialog.mode === "create"
                                            ? t("confirmCreateBody", { name: dialog.values.name })
                                            : t("confirmUpdateBody", {
                                                  name: dialog.role?.name ?? dialog.values.name,
                                              })}
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button color="secondary" onPress={backToForm} isDisabled={saveMutation.isPending}>
                                        {t("back")}
                                    </Button>
                                    <Button onPress={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
                                        {t("confirm")}
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {dialog.type === "form" ? (
                            <form
                                className="flex min-h-0 flex-1 flex-col gap-5"
                                noValidate
                                onSubmit={form.handleSubmit((values) =>
                                    openDialog({
                                        type: "confirmForm",
                                        mode: dialog.mode,
                                        role: dialog.role,
                                        values,
                                    }),
                                )}
                            >
                                <div className="shrink-0 space-y-5">
                                    <div>
                                        <Heading slot="title" className="text-lg font-semibold text-primary">
                                            {dialog.mode === "create"
                                                ? t("createTitle")
                                                : t("editTitle", { name: dialog.role?.name ?? "" })}
                                        </Heading>
                                        <p className="mt-1 text-sm text-tertiary">{t("formDescription")}</p>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Controller
                                            name="name"
                                            control={form.control}
                                            render={({ field, fieldState }) => (
                                                <Input
                                                    name={field.name}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    ref={field.ref}
                                                    isRequired
                                                    isDisabled={isSystemEdit}
                                                    label={t("name")}
                                                    placeholder={tCommon("enterData")}
                                                    hint={fieldState.error?.message || (isSystemEdit ? undefined : t("nameHint"))}
                                                    isInvalid={Boolean(fieldState.error)}
                                                />
                                            )}
                                        />

                                        <Controller
                                            name="description"
                                            control={form.control}
                                            render={({ field, fieldState }) => (
                                                <Input
                                                    name={field.name}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    onBlur={field.onBlur}
                                                    ref={field.ref}
                                                    label={t("descriptionLabel")}
                                                    placeholder={tCommon("enterData")}
                                                    isInvalid={Boolean(fieldState.error)}
                                                    hint={fieldState.error?.message}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-secondary">{t("permissions")}</p>
                                            <p className="text-xs text-tertiary">
                                                {t("permissionSelected", { count: selectedPermissions.length })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                color="link-gray"
                                                onPress={() =>
                                                    setPermissions(permissionCatalog.map((item) => item.code))
                                                }
                                            >
                                                {t("selectAll")}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                color="link-gray"
                                                onPress={() => setPermissions([])}
                                            >
                                                {t("clearAll")}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    ref={permissionsScrollRef}
                                    className="min-h-[12rem] max-h-[min(24rem,45vh)] flex-1 space-y-3 overflow-y-scroll overscroll-contain rounded-xl bg-secondary p-3 ring-1 ring-secondary [scrollbar-gutter:stable] [scrollbar-width:auto]"
                                >
                                    {permissionGroups.length === 0 ? (
                                        <EmptyState size="sm" className="py-6">
                                            <EmptyState.Content className="mb-0!">
                                                <EmptyState.Title className="text-sm font-medium text-tertiary">
                                                    {t("permissionsEmpty")}
                                                </EmptyState.Title>
                                            </EmptyState.Content>
                                        </EmptyState>
                                    ) : (
                                        permissionGroups.map((group) => {
                                            const state = groupState(group);
                                            return (
                                                <section
                                                    key={group.key}
                                                    className="rounded-lg bg-primary ring-1 ring-secondary"
                                                >
                                                    <div className="flex items-center justify-between gap-3 border-b border-secondary px-3 py-2.5">
                                                        <Checkbox
                                                            isSelected={state.allSelected}
                                                            isIndeterminate={state.someSelected}
                                                            onChange={(checked) => toggleGroup(group, checked)}
                                                            label={groupTitle(group.key)}
                                                        />
                                                        <span className="text-xs text-quaternary">
                                                            {state.selectedCount}/{group.items.length}
                                                        </span>
                                                    </div>
                                                    <div className="grid gap-1 p-2 sm:grid-cols-2">
                                                        {group.items.map((perm) => (
                                                            <div
                                                                key={perm.code}
                                                                className={cx(
                                                                    "rounded-md px-2 py-2 transition",
                                                                    selectedSet.has(perm.code) && "bg-brand-primary/50",
                                                                )}
                                                            >
                                                                <Checkbox
                                                                    isSelected={selectedSet.has(perm.code)}
                                                                    onChange={(checked) =>
                                                                        togglePermission(perm.code, checked)
                                                                    }
                                                                    label={permissionLabel(perm.code)}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </section>
                                            );
                                        })
                                    )}
                                </div>

                                <div className="flex shrink-0 justify-end gap-3">
                                    <Button color="secondary" onPress={() => closeDialog()} isDisabled={saveMutation.isPending}>
                                        {t("cancel")}
                                    </Button>
                                    <Button type="submit" isLoading={saveMutation.isPending}>
                                        {dialog.mode === "create" ? t("create") : t("save")}
                                    </Button>
                                </div>
                            </form>
                        ) : null}

                        {dialog.type === "delete" ? (
                            <div className="space-y-5">
                                <div>
                                    <Heading slot="title" className="text-lg font-semibold text-primary">
                                        {t("confirmDeleteTitle")}
                                    </Heading>
                                    <p className="mt-2 text-sm text-tertiary">
                                        {t("confirmDeleteBody", { name: dialog.role.name })}
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button
                                        color="secondary"
                                        onPress={() => closeDialog()}
                                        isDisabled={deleteMutation.isPending}
                                    >
                                        {t("cancel")}
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
