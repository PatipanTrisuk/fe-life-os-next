"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Mail01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { AuthShell } from "@/components/marketing/auth-shell";
import { LocaleSwitcher } from "@/components/base/locale-switcher/locale-switcher";
import { ThemeToggle } from "@/components/base/theme-toggle/theme-toggle";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { authApi, toApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { createForgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas";
import { Link, useRouter } from "@/i18n/navigation";

export function ForgotPasswordForm() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const searchParams = useSearchParams();
    const sentEmail = searchParams.get("sent");
    const schema = useMemo(() => createForgotPasswordSchema(t), [t]);

    const {
        control,
        handleSubmit,
        setValue,
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(schema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: { email: sentEmail ?? "" },
    });

    const mutation = useMutation({
        mutationFn: (email: string) => authApi.forgotPassword(email, locale),
    });

    const sendReset = async (email: string) => {
        try {
            await mutation.mutateAsync(email);
            router.replace(`/forgot-password?sent=${encodeURIComponent(email)}`);
        } catch (err) {
            notify.error(toApiError(err).message);
        }
    };

    const onSubmit = handleSubmit(async (values) => {
        await sendReset(values.email.trim());
    });

    return (
        <AuthShell
            title={sentEmail ? t("forgotPassword.sentTitle") : t("forgotPassword.title")}
            description={
                sentEmail
                    ? t("forgotPassword.sentDescription", { email: sentEmail })
                    : t("forgotPassword.description")
            }
            footer={
                <Link href="/login" className="font-semibold text-brand-secondary hover:text-brand-secondary_hover">
                    {t("common.backToLogin")}
                </Link>
            }
        >
            <div className="mb-5 flex h-10 items-center justify-end gap-2">
                <LocaleSwitcher />
                <ThemeToggle />
            </div>

            {sentEmail ? (
                <EmptyState size="sm" className="max-w-none">
                    <EmptyState.Header pattern="none">
                        <EmptyState.FeaturedIcon color="brand" theme="light" icon={Mail01} />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>{t("forgotPassword.sentTitle")}</EmptyState.Title>
                        <EmptyState.Description>{t("forgotPassword.sentHint")}</EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer className="flex w-full flex-col gap-3">
                        <Button
                            size="lg"
                            className="w-full"
                            isLoading={mutation.isPending}
                            isDisabled={mutation.isPending}
                            onPress={() => void sendReset(sentEmail)}
                        >
                            {t("forgotPassword.sendAgain")}
                        </Button>
                        <Button
                            size="lg"
                            color="secondary"
                            className="w-full"
                            onPress={() => {
                                setValue("email", "");
                                router.replace("/forgot-password");
                            }}
                        >
                            {t("forgotPassword.useAnotherEmail")}
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            ) : (
                <form className="flex flex-col gap-5" noValidate onSubmit={onSubmit}>
                    <Controller
                        name="email"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Input
                                name={field.name}
                                value={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                ref={field.ref}
                                isRequired
                                label={t("forgotPassword.email")}
                                type="email"
                                placeholder={t("common.enterData")}
                                icon={Mail01}
                                isInvalid={Boolean(fieldState.error)}
                                hint={fieldState.error?.message}
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
                        {t("forgotPassword.submit")}
                    </Button>
                </form>
            )}
        </AuthShell>
    );
}
