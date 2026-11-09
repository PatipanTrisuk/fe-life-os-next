"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/base/buttons/button";
import { LocaleSwitcher } from "@/components/base/locale-switcher/locale-switcher";
import { ThemeToggle } from "@/components/base/theme-toggle/theme-toggle";
import { Link, useRouter } from "@/i18n/navigation";

type LandingNavProps = {
    brand?: string;
};

export function LandingNav({ brand }: LandingNavProps) {
    const t = useTranslations();
    const router = useRouter();

    return (
        <header className="sticky top-0 z-40 border-b border-secondary/60 bg-primary/80 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <Link href="/" className="text-lg font-semibold tracking-tight text-primary">
                    {brand ?? t("app.name")}
                </Link>

                <div className="flex h-10 items-center gap-2 sm:gap-3">
                    <LocaleSwitcher className="hidden sm:inline-flex" />
                    <ThemeToggle />
                    <Button color="tertiary" size="md" className="hidden sm:inline-flex" onPress={() => router.push("/login")}>
                        {t("home.navLogin")}
                    </Button>
                    <Button size="md" onPress={() => router.push("/register")}>
                        {t("home.navGetStarted")}
                    </Button>
                </div>
            </div>
        </header>
    );
}
