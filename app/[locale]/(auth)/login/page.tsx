"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Mail01 } from "@untitledui/icons";
import { AuthShell } from "@/components/marketing/auth-shell";
import { LocaleSwitcher } from "@/components/base/locale-switcher/locale-switcher";
import { ThemeToggle } from "@/components/base/theme-toggle/theme-toggle";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { authApi, getDiscordAuthorizeUrl, toApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { createLoginSchema, type LoginInput } from "@/lib/schemas";
import { getRememberedEmail, getRememberMe } from "@/lib/token-storage";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function LoginPage() {
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();
    const discordUrl = getDiscordAuthorizeUrl();
    const schema = useMemo(() => createLoginSchema(t), [t]);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [resending, setResending] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { isSubmitting },
        reset,
        getValues,
    } = useForm<LoginInput>({
        resolver: zodResolver(schema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: { email: "", password: "", rememberMe: true },
    });

    useEffect(() => {
        reset({
            email: getRememberedEmail(),
            password: "",
            rememberMe: getRememberMe(),
        });
    }, [reset]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace("/profile");
        }
    }, [authLoading, isAuthenticated, router]);

    const onSubmit = handleSubmit(async (values) => {
        setNeedsVerification(false);
        try {
            await login(values.email.trim(), values.password, { rememberMe: values.rememberMe });
        } catch (err) {
            const apiErr = toApiError(err);
            if (apiErr.code === "auth.email_not_verified") {
                setNeedsVerification(true);
            }
            notify.error(apiErr.message);
        }
    });

    const onResend = async () => {
        const email = getValues("email").trim();
        if (!email) return;
        setResending(true);
        try {
            const res = await authApi.resendVerification(email, locale);
            notify.success(res.message);
        } catch (err) {
            notify.error(toApiError(err).message);
        } finally {
            setResending(false);
        }
    };

    return (
        <AuthShell
            title={t("login.title")}
            description={t("login.description")}
            footer={
                <>
                    {t("login.noAccount")}{" "}
                    <Link href="/register" className="font-semibold text-brand-secondary hover:text-brand-secondary_hover">
                        {t("login.createAccount")}
                    </Link>
                </>
            }
        >
            <div className="mb-5 flex h-10 items-center justify-end gap-2">
                <LocaleSwitcher />
                <ThemeToggle />
            </div>

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
                            label={t("login.email")}
                            type="email"
                            placeholder={t("common.enterData")}
                            icon={Mail01}
                            isInvalid={Boolean(fieldState.error)}
                            hint={fieldState.error?.message}
                        />
                    )}
                />
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
                            label={t("login.password")}
                            type="password"
                            placeholder={t("common.enterData")}
                            isInvalid={Boolean(fieldState.error)}
                            hint={
                                fieldState.error?.message ?? (
                                    <Link
                                        href="/forgot-password"
                                        className="font-semibold text-brand-secondary hover:text-brand-secondary_hover"
                                    >
                                        {t("login.forgotPassword")}
                                    </Link>
                                )
                            }
                        />
                    )}
                />

                <Controller
                    name="rememberMe"
                    control={control}
                    render={({ field }) => (
                        <Checkbox
                            isSelected={field.value}
                            onChange={field.onChange}
                            name={field.name}
                            label={t("login.rememberMe")}
                            hint={t("login.rememberMeHint")}
                        />
                    )}
                />

                {needsVerification ? (
                    <Button
                        type="button"
                        color="secondary"
                        size="sm"
                        className="w-full"
                        isLoading={resending}
                        isDisabled={resending}
                        onPress={onResend}
                    >
                        {t("login.resendVerification")}
                    </Button>
                ) : null}

                <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting} isDisabled={isSubmitting}>
                    {t("login.submit")}
                </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border-secondary" />
                <span className="text-sm text-tertiary">{t("common.or")}</span>
                <div className="h-px flex-1 bg-border-secondary" />
            </div>

            <Button
                size="lg"
                color="secondary"
                className="w-full"
                isDisabled={!discordUrl}
                onPress={() => {
                    if (discordUrl) window.location.href = discordUrl;
                }}
            >
                {t("login.discord")}
            </Button>
            {!discordUrl ? <p className="mt-2 text-center text-xs text-tertiary">{t("login.discordMissing")}</p> : null}
        </AuthShell>
    );
}
