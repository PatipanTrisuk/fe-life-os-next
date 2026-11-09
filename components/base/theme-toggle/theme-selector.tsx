"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor01, Moon01, Sun } from "@untitledui/icons";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { cx } from "@/utils/cx";

export type AppTheme = "light" | "dark" | "system";

const THEME_OPTIONS: {
    value: AppTheme;
    icon: typeof Sun;
    labelKey: "light" | "dark" | "system";
    hintKey: "lightHint" | "darkHint" | "systemHint";
}[] = [
    { value: "light", icon: Sun, labelKey: "light", hintKey: "lightHint" },
    { value: "dark", icon: Moon01, labelKey: "dark", hintKey: "darkHint" },
    { value: "system", icon: Monitor01, labelKey: "system", hintKey: "systemHint" },
];

export function ThemeSelector({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();
    const t = useTranslations("theme");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const selected = (mounted ? (theme ?? "light") : "light") as AppTheme;

    return (
        <RadioGroup
            aria-label={t("label")}
            value={selected}
            onChange={(value) => setTheme(value)}
            className={cx("gap-3", className)}
            size="md"
            isDisabled={!mounted}
        >
            {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                    <RadioButton
                        key={option.value}
                        value={option.value}
                        label={
                            <span className="inline-flex items-center gap-2">
                                <Icon className="size-4 shrink-0 text-fg-quaternary" />
                                {t(option.labelKey)}
                            </span>
                        }
                        hint={t(option.hintKey)}
                    />
                );
            })}
        </RadioGroup>
    );
}
