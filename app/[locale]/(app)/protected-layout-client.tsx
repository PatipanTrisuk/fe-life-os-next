"use client";

import { useTranslations } from "next-intl";
import { AppShell } from "@/components/application/app-shell";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { useRequireAuth } from "@/providers/auth-provider";

export function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
    const { isLoading, isAuthenticated } = useRequireAuth();
    const t = useTranslations("app");

    if (isLoading || !isAuthenticated) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-primary">
                <LoadingIndicator size="md" label={t("loading")} />
            </div>
        );
    }

    return <AppShell>{children}</AppShell>;
}
