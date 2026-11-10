"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { AuthShell } from "@/components/marketing/auth-shell";
import { authApi, getGoogleRedirectUri, toApiError } from "@/lib/api";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";

function GoogleCallbackContent() {
    const searchParams = useSearchParams();
    const { loginWithOAuthSession } = useAuth();
    const t = useTranslations("google");
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
                const res = await authApi.google({
                    code,
                    redirectUri: getGoogleRedirectUri(),
                });
                if (!cancelled) loginWithOAuthSession(res.data);
            } catch (err) {
                if (!cancelled) {
                    setError(toApiError(err).message);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [searchParams, loginWithOAuthSession, t]);

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

export function GoogleCallbackClient() {
    const t = useTranslations("google");

    return (
        <Suspense
            fallback={
                <div className="flex min-h-dvh items-center justify-center bg-primary">
                    <LoadingIndicator size="md" label={t("signingIn")} />
                </div>
            }
        >
            <GoogleCallbackContent />
        </Suspense>
    );
}
