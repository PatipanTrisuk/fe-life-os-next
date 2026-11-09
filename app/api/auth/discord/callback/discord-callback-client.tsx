"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { AuthShell } from "@/components/marketing/auth-shell";
import { authApi, getDiscordRedirectUri, toApiError } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";

function DiscordCallbackContent() {
    const searchParams = useSearchParams();
    const { loginWithDiscordSession } = useAuth();
    const t = useTranslations("discord");
    const tCommon = useTranslations("common");
    const locale = useLocale();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const code = searchParams.get("code");
        const oauthError = searchParams.get("error");

        if (oauthError) {
            setError(searchParams.get("error_description") || oauthError);
            return;
        }
        if (!code) {
            setError(t("missingCode"));
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await authApi.discord({
                    code,
                    redirectUri: getDiscordRedirectUri(),
                });
                if (!cancelled) loginWithDiscordSession(res.data);
            } catch (err) {
                if (!cancelled) {
                    setError(toApiError(err).message);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [searchParams, loginWithDiscordSession, t]);

    if (error) {
        return (
            <AuthShell
                title={t("failedTitle")}
                description={error}
                footer={
                    <Link href="/login" locale={locale} className="font-semibold text-brand-secondary hover:text-brand-secondary_hover">
                        {tCommon("backToLogin")}
                    </Link>
                }
            >
                <p className="text-sm text-tertiary">{t("tryAgain")}</p>
            </AuthShell>
        );
    }

    return (
        <div className="flex min-h-dvh items-center justify-center bg-primary">
            <LoadingIndicator size="md" label={t("signingIn")} />
        </div>
    );
}

export function DiscordCallbackClient() {
    const t = useTranslations("discord");

    return (
        <Suspense
            fallback={
                <div className="flex min-h-dvh items-center justify-center bg-primary">
                    <LoadingIndicator size="md" label={t("signingIn")} />
                </div>
            }
        >
            <DiscordCallbackContent />
        </Suspense>
    );
}
