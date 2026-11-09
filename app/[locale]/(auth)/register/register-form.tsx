"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle, Mail01, User01 } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { AuthShell } from "@/components/marketing/auth-shell";
import { LocaleSwitcher } from "@/components/base/locale-switcher/locale-switcher";
import { ThemeToggle } from "@/components/base/theme-toggle/theme-toggle";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { toApiError } from "@/lib/api";
import { notify } from "@/lib/notify";
import { createRegisterSchema, type RegisterInput } from "@/lib/schemas";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";

export function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations();
    const { register: registerUser } = useAuth();
    const schema = useMemo(() => createRegisterSchema(t), [t]);
    const registered = searchParams.get("registered") === "1";

    const {
        control,
        handleSubmit,
        formState: { isSubmitting },
        setValue,
    } = useForm<RegisterInput>({
        resolver: zodResolver(schema),
        mode: "onSubmit",
        reValidateMode: "onChange",
        defaultValues: { username: "", email: "", password: "" },
    });

    const onSubmit = handleSubmit(async (values) => {
        try {
            await registerUser(values.username.trim(), values.email.trim(), values.password);
            setValue("password", "");
            router.replace("/register?registered=1");
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

    if (registered) {
        return (
            <AuthShell
                title={t("register.successTitle")}
                description={t("register.successDescription")}
                footer={
                    <>
                        {t("register.hasAccount")}{" "}
                        <Link href="/login" className="font-semibold text-brand-secondary hover:text-brand-secondary_hover">
                            {t("register.login")}
                        </Link>
                    </>
                }
            >
                {toolbar}
                <EmptyState size="sm" className="max-w-none">
                    <EmptyState.Header pattern="none">
                        <EmptyState.FeaturedIcon color="success" theme="light" icon={CheckCircle} />
                    </EmptyState.Header>
                    <EmptyState.Content>
                        <EmptyState.Title>{t("register.successTitle")}</EmptyState.Title>
                        <EmptyState.Description>{t("register.successDescription")}</EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer className="w-full">
                        <Button size="lg" className="w-full" onPress={() => router.push("/login")}>
                            {t("register.login")}
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title={t("register.title")}
            description={t("register.description")}
            footer={
                <>
                    {t("register.hasAccount")}{" "}
                    <Link href="/login" className="font-semibold text-brand-secondary hover:text-brand-secondary_hover">
                        {t("register.login")}
                    </Link>
                </>
            }
        >
            {toolbar}

            <form className="flex flex-col gap-5" noValidate onSubmit={onSubmit}>
                <Controller
                    name="username"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Input
                            name={field.name}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            ref={field.ref}
                            isRequired
                            label={t("register.username")}
                            placeholder={t("common.enterData")}
                            hint={fieldState.error?.message ?? t("register.usernameHint")}
                            icon={User01}
                            isInvalid={Boolean(fieldState.error)}
                            autoComplete="username"
                        />
                    )}
                />
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
                            label={t("register.email")}
                            type="email"
                            placeholder={t("common.enterData")}
                            icon={Mail01}
                            isInvalid={Boolean(fieldState.error)}
                            hint={fieldState.error?.message}
                            autoComplete="email"
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
                            label={t("register.password")}
                            type="password"
                            placeholder={t("common.enterData")}
                            hint={fieldState.error?.message ?? t("register.passwordHint")}
                            isInvalid={Boolean(fieldState.error)}
                            autoComplete="new-password"
                        />
                    )}
                />

                <Button type="submit" size="lg" className="w-full" isLoading={isSubmitting} isDisabled={isSubmitting}>
                    {t("register.submit")}
                </Button>
            </form>
        </AuthShell>
    );
}
