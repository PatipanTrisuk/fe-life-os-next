import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { ForgotPasswordForm } from "./forgot-password-form";

export const instant = false;

type PageProps = {
    params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({ params }: PageProps) {
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
            <ForgotPasswordForm />
        </Suspense>
    );
}
