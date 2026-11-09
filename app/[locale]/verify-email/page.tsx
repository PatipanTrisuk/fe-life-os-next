import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { VerifyEmailClient } from "./verify-email-client";

export const instant = false;

type PageProps = {
    params: Promise<{ locale: string }>;
};

export default async function VerifyEmailPage({ params }: PageProps) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("app");

    return (
        <Suspense
            fallback={
                <div className="flex min-h-dvh items-center justify-center bg-primary">
                    <LoadingIndicator size="md" label={t("loading")} />
                </div>
            }
        >
            <VerifyEmailClient />
        </Suspense>
    );
}
