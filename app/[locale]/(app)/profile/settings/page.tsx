"use client";

import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { ColorThemeSelector } from "@/components/base/theme-toggle/color-theme-selector";
import { ThemeSelector } from "@/components/base/theme-toggle/theme-selector";
import { authApi } from "@/lib/api";
import { notify } from "@/lib/notify";
import {
    createChangePasswordSchema,
    createUpdateUsernameSchema,
    type ChangePasswordInput,
    type UpdateUsernameInput,
} from "@/lib/schemas";
import { useAuth } from "@/providers/auth-provider";

export default function ProfileSettingsPage() {
    const t = useTranslations();
    const { user, setProfile, logout } = useAuth();

    const usernameSchema = useMemo(() => createUpdateUsernameSchema(t), [t]);
    const passwordSchema = useMemo(() => createChangePasswordSchema(t), [t]);

    const usernameForm = useForm<UpdateUsernameInput>({
        resolver: zodResolver(usernameSchema),
        defaultValues: { username: user?.username ?? "" },
        values: { username: user?.username ?? "" },
    });

    const passwordForm = useForm<ChangePasswordInput>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const updateUsername = useMutation({
        mutationFn: (username: string) => authApi.updateProfile({ username }),
        onSuccess: (res) => {
            setProfile(res.data);
            notify.success(res.message);
        },
    });

    const changePassword = useMutation({
        mutationFn: (values: ChangePasswordInput) =>
            authApi.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            }),
        onSuccess: async (res) => {
            passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
            notify.success(res.message);
            await logout();
        },
    });

    if (!user) return null;

    const hasLocalPassword = user.auth_provider === "local";

    return (
        <div className="space-y-6">
            <div className="rounded-2xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
                <h2 className="text-lg font-semibold text-primary">{t("profile.appearanceTitle")}</h2>
                <p className="mt-1 text-sm text-tertiary">{t("profile.appearanceDescription")}</p>
                <div className="mt-5">
                    <ColorThemeSelector />
                </div>
                <div className="mt-6 sm:max-w-md">
                    <p className="mb-3 text-sm font-medium text-secondary">{t("themePage.appearance")}</p>
                    <ThemeSelector />
                </div>
            </div>

            <div className="rounded-2xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
                <h2 className="text-lg font-semibold text-primary">{t("profile.username")}</h2>
                <form
                    className="mt-4 flex flex-col gap-4 sm:max-w-md"
                    noValidate
                    onSubmit={usernameForm.handleSubmit(async (values) => {
                        try {
                            await updateUsername.mutateAsync(values.username.trim());
                        } catch {
                            // Backend error toast comes from the HTTP interceptor.
                        }
                    })}
                >
                    <Controller
                        name="username"
                        control={usernameForm.control}
                        render={({ field, fieldState }) => (
                            <Input
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                isRequired
                                label={t("profile.username")}
                                placeholder={t("common.enterData")}
                                isInvalid={Boolean(fieldState.error)}
                                hint={fieldState.error?.message}
                            />
                        )}
                    />
                    <Button
                        type="submit"
                        size="md"
                        className="w-fit"
                        isLoading={updateUsername.isPending}
                        isDisabled={updateUsername.isPending}
                    >
                        {t("profile.saveUsername")}
                    </Button>
                </form>
            </div>

            <div className="rounded-2xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
                <h2 className="text-lg font-semibold text-primary">{t("profile.changePasswordTitle")}</h2>
                <p className="mt-1 text-sm text-tertiary">{t("profile.changePasswordDescription")}</p>

                {!hasLocalPassword ? (
                    <p className="mt-4 text-sm text-tertiary">{t("profile.passwordNotSetHint")}</p>
                ) : (
                    <form
                        className="mt-4 flex flex-col gap-4 sm:max-w-md"
                        noValidate
                        onSubmit={passwordForm.handleSubmit(async (values) => {
                            try {
                                await changePassword.mutateAsync(values);
                            } catch {
                                // Backend error toast comes from the HTTP interceptor.
                            }
                        })}
                    >
                        <Controller
                            name="currentPassword"
                            control={passwordForm.control}
                            render={({ field, fieldState }) => (
                                <Input
                                    name={field.name}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    isRequired
                                    type="password"
                                    label={t("profile.currentPassword")}
                                    placeholder={t("common.enterData")}
                                    autoComplete="current-password"
                                    isInvalid={Boolean(fieldState.error)}
                                    hint={fieldState.error?.message}
                                />
                            )}
                        />
                        <Controller
                            name="newPassword"
                            control={passwordForm.control}
                            render={({ field, fieldState }) => (
                                <Input
                                    name={field.name}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    isRequired
                                    type="password"
                                    label={t("profile.newPassword")}
                                    placeholder={t("common.enterData")}
                                    autoComplete="new-password"
                                    isInvalid={Boolean(fieldState.error)}
                                    hint={fieldState.error?.message}
                                />
                            )}
                        />
                        <Controller
                            name="confirmPassword"
                            control={passwordForm.control}
                            render={({ field, fieldState }) => (
                                <Input
                                    name={field.name}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    ref={field.ref}
                                    isRequired
                                    type="password"
                                    label={t("profile.confirmPassword")}
                                    placeholder={t("common.enterData")}
                                    autoComplete="new-password"
                                    isInvalid={Boolean(fieldState.error)}
                                    hint={fieldState.error?.message}
                                />
                            )}
                        />
                        <Button
                            type="submit"
                            size="md"
                            className="w-fit"
                            isLoading={changePassword.isPending}
                            isDisabled={changePassword.isPending}
                        >
                            {t("profile.changePassword")}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
