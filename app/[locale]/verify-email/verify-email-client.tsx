"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AlertCircle, CheckCircle } from "@untitledui/icons";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { AuthShell } from "@/components/marketing/auth-shell";
import { LocaleSwitcher } from "@/components/base/locale-switcher/locale-switcher";
import { ThemeToggle } from "@/components/base/theme-toggle/theme-toggle";
import { Button } from "@/components/base/buttons/button";
import { authApi, toApiError } from "@/lib/api";
import { Link, useRouter } from "@/i18n/navigation";

type Status = "loading" | "success" | "error" | "missing";

export function VerifyEmailClient() {
    const searchParams = useSearchParams();
    const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [status, setStatus] = useState<Status>(token ? "loading" : "missing");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await authApi.verifyEmail(token, locale);
                if (cancelled) return;
                setMessage(res.message);
                setStatus("success");
            } catch (err) {
                if (cancelled) return;
                setMessage(toApiError(err).message);
                setStatus("error");
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token, locale]);

    const toolbar = (
        <div className="mb-5 flex h-10 items-center justify-end gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
        </div>
    );

    if (status === "missing") {
        return (
            <AuthShell
                title={t("verifyEmail.invalidLinkTitle")}
                description={t("verifyEmail.invalidLinkDescription")}
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
                        <EmptyState.Title>{t("verifyEmail.invalidLinkTitle")}</EmptyState.Title>
                        <EmptyState.Description>{t("verifyEmail.missingToken")}</EmptyState.Description>
                    </EmptyState.Content>
                </EmptyState>
            </AuthShell>
        );
    }

    if (status === "loading") {
        return (
            <AuthShell title={t("verifyEmail.title")} description={t("verifyEmail.verifying")}>
                {toolbar}
                <div className="flex justify-center py-10">
                    <LoadingIndicator size="md" label={t("verifyEmail.verifying")} />
                </div>
            </AuthShell>
        );
    }

    if (status === "success") {
        return (
            <AuthShell
                title={t("verifyEmail.successTitle")}
                description={message || t("verifyEmail.successDescription")}
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
                        <EmptyState.Title>{t("verifyEmail.successTitle")}</EmptyState.Title>
                        <EmptyState.Description>
                            {message || t("verifyEmail.successDescription")}
                        </EmptyState.Description>
                    </EmptyState.Content>
                    <EmptyState.Footer className="w-full">
                        <Button size="lg" className="w-full" onPress={() => router.push("/login")}>
                            {t("verifyEmail.goToLogin")}
                        </Button>
                    </EmptyState.Footer>
                </EmptyState>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title={t("verifyEmail.invalidLinkTitle")}
            description={message || t("verifyEmail.invalidLinkDescription")}
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
                    <EmptyState.Title>{t("verifyEmail.invalidLinkTitle")}</EmptyState.Title>
                    <EmptyState.Description>
                        {message || t("verifyEmail.invalidLinkDescription")}
                    </EmptyState.Description>
                </EmptyState.Content>
                <EmptyState.Footer className="w-full">
                    <Button size="lg" className="w-full" onPress={() => router.push("/login")}>
                        {t("verifyEmail.goToLogin")}
                    </Button>
                </EmptyState.Footer>
            </EmptyState>
        </AuthShell>
    );
}
