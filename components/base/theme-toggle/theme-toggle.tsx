"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor01, Moon01, Sun } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import type { AppTheme } from "@/components/base/theme-toggle/theme-selector";
import { cx } from "@/utils/cx";

const THEME_ICONS = {
    light: Sun,
    dark: Moon01,
    system: Monitor01,
} as const;

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const t = useTranslations("theme");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const current = (mounted ? (theme ?? "light") : "light") as AppTheme;
    const LeadingIcon =
        current === "system"
            ? resolvedTheme === "dark"
                ? Moon01
                : Sun
            : THEME_ICONS[current];

    return (
        <Dropdown.Root>
            <Button
                color="secondary"
                size="md"
                className={cx("size-10 shrink-0", className)}
                aria-label={t("label")}
                iconLeading={LeadingIcon}
                isDisabled={!mounted}
            />
            <Dropdown.Popover placement="bottom end" className="w-48">
                <Dropdown.Menu
                    selectionMode="single"
                    selectedKeys={new Set([current])}
                    onSelectionChange={(keys) => {
                        const [value] = Array.from(keys);
                        if (typeof value === "string") setTheme(value);
                    }}
                >
                    <Dropdown.Item id="light" label={t("light")} icon={Sun} />
                    <Dropdown.Item id="dark" label={t("dark")} icon={Moon01} />
                    <Dropdown.Item id="system" label={t("system")} icon={Monitor01} />
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
}
