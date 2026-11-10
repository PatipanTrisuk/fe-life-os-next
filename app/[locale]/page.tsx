"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { LandingPage } from "@/components/marketing/landing-page";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function HomePage() {
    const router = useRouter();
    const t = useTranslations("home");
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;
        if (isAuthenticated) {
            router.replace("/profile");
        }
    }, [isAuthenticated, isLoading, router]);

    // Keep the marketing page visible while auth resolves so crawlers get real content.
    if (isAuthenticated) {
        return (
            <div className="flex min-h-dvh items-center justify-center bg-primary">
                <LoadingIndicator size="md" label={t("redirecting")} />
            </div>
        );
    }

    return <LandingPage />;
}
