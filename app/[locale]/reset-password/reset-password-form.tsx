"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle, AlertCircle } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { AuthShell } from "@/components/marketing/auth-shell";
import { LocaleSwitcher } from "@/components/base/locale-switcher/locale-switcher";
import { ThemeToggle } from "@/components/base/theme-toggle/theme-toggle";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { authApi, toApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { createResetPasswordSchema, type ResetPasswordInput } from "@/lib/schemas";
import { Link, useRouter } from "@/i18n/navigation";

export function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [success, setSuccess] = useState(false);
    const schema = useMemo(() => createResetPasswordSchema(t), [t]);

    const {
        control,
        handleSubmit,
        reset,
    } = useForm<ResetPasswordInput>({
        resolver: zodResolver(schema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: { password: "", confirmPassword: "" },
    });

    const mutation = useMutation({
        mutationFn: (password: string) => authApi.resetPassword({ token, password }, locale),
    });

    const onSubmit = handleSubmit(async (values) => {
        if (!token) {
            notify.error(t("resetPassword.missingToken"));
            return;
        }

        try {
            await mutation.mutateAsync(values.password);
            reset({ password: "", confirmPassword: "" });
            setSuccess(true);
        } catch (err) {
            notify.error(toApiError(err).message);
        }
    });

    const toolbar = (
        <div className="mb-5 flex h-10 items-center justify-end gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
        </div>
    );

    if (!token) {
        return (
            <AuthShell
                title={t("resetPassword.invalidLinkTitle")}
                description={t("resetPassword.invalidLinkDescription")}
                footer={
                    <Link href="/login" className="font-semibold text-brand-secondary hover:text-brand-secondary_hover">
                        {t("common.backToLogin")}
                    </Link>
                }
            >
                {toolbar}
                <EmptyState size="sm" className="max-w-none">
                    <EmptyState.Header pattern="none">
                        <EmptyState.FeaturedIcon color="warning" theme="light" icon={AlertCircle} />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>{t("resetPassword.invalidLinkTitle")}</EmptyState.Title>
                        <EmptyState.Description>{t("resetPassword.invalidLinkDescription")}</EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer className="w-full">
                        <Button size="lg" className="w-full" onPress={() => router.push("/forgot-password")}>
                            {t("resetPassword.requestNewLink")}
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            </AuthShell>
        );
    }

    if (success) {
        return (
            <AuthShell
                title={t("resetPassword.successTitle")}
                description={t("resetPassword.successDescription")}
                footer={
                    <Link href="/login" className="font-semibold text-brand-secondary hover:text-brand-secondary_hover">
                        {t("common.backToLogin")}
                    </Link>
                }
            >
                {toolbar}
                <EmptyState size="sm" className="max-w-none">
                    <EmptyState.Header pattern="none">
                        <EmptyState.FeaturedIcon color="success" theme="light" icon={CheckCircle} />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>{t("resetPassword.successTitle")}</EmptyState.Title>
                        <EmptyState.Description>{t("resetPassword.successDescription")}</EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer className="w-full">
                        <Button size="lg" className="w-full" onPress={() => router.push("/login")}>
                            {t("resetPassword.goToLogin")}
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title={t("resetPassword.title")}
            description={t("resetPassword.description")}
            footer={
                <Link href="/login" className="font-semibold text-brand-secondary hover:text-brand-secondary_hover">
                    {t("common.backToLogin")}
                </Link>
            }
        >
            {toolbar}

            <form className="flex flex-col gap-5" noValidate onSubmit={onSubmit}>
                <Controller
                    name="password"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Input
                            name={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            isRequired
                            label={t("resetPassword.password")}
                            type="password"
                            placeholder={t("common.enterData")}
                            isInvalid={Boolean(fieldState.error)}
                            hint={fieldState.error?.message}
                            autoComplete="new-password"
                        />
                    )}
                />
                <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Input
                            name={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            isRequired
                            label={t("resetPassword.confirmPassword")}
                            type="password"
                            placeholder={t("common.enterData")}
                            isInvalid={Boolean(fieldState.error)}
                            hint={fieldState.error?.message}
                            autoComplete="new-password"
                        />
                    )}
                />

                <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    isLoading={mutation.isPending}
                    isDisabled={mutation.isPending}
                >
                    {t("resetPassword.submit")}
                </Button>
            </form>
        </AuthShell>
    );
}
