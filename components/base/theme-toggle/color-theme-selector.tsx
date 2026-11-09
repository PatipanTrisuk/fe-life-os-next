"use client";

import { useTranslations } from "next-intl";
import { Check } from "@untitledui/icons";
import { ColorPicker, useHexColorPicker } from "@/components/base/color-picker/color-picker";
import "@/components/base/color-picker/color-picker.css";
import { COLOR_THEMES, type ColorThemeId } from "@/lib/color-theme";
import { useColorTheme } from "@/providers/color-theme-provider";
import { cx } from "@/utils/cx";

export function ColorThemeSelector({ className }: { className?: string }) {
    const t = useTranslations("themePage");
    const { colorTheme, customColor, setColorTheme, setCustomColor, mounted } = useColorTheme();
    const customPicker = useHexColorPicker(customColor, setCustomColor);

    return (
        <div className={cx("space-y-5", className)}>
            <div
                role="radiogroup"
                aria-label={t("colorLabel")}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            >
                {COLOR_THEMES.map((theme) => {
                    const selected = mounted && colorTheme === theme.id;
                    const isCustom = theme.id === "custom";
                    const swatch = isCustom ? customColor : theme.swatch;
                    const preview = isCustom ? customColor : theme.preview;

                    return (
                        <button
                            key={theme.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={!mounted}
                            onClick={() => setColorTheme(theme.id as ColorThemeId)}
                            className={cx(
                                "group relative flex flex-col gap-3 rounded-xl bg-primary p-3 text-left ring-1 transition",
                                selected
                                    ? "ring-2 ring-brand outline-hidden"
                                    : "ring-secondary hover:bg-primary_hover hover:ring-secondary",
                                !mounted && "opacity-60",
                            )}
                        >
                            <span className="flex items-center gap-1.5">
                                <span
                                    className="size-8 rounded-full ring-1 ring-black/5 ring-inset"
                                    style={{ backgroundColor: swatch }}
                                    aria-hidden
                                />
                                <span
                                    className="size-5 rounded-full ring-1 ring-black/5 ring-inset"
                                    style={{ backgroundColor: preview }}
                                    aria-hidden
                                />
                                <span
                                    className="size-3 rounded-full ring-1 ring-black/5 ring-inset"
                                    style={{ backgroundColor: preview, opacity: 0.55 }}
                                    aria-hidden
                                />
                            </span>
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-secondary">
                                    {t(`colors.${theme.id}`)}
                                </span>
                                {selected ? <Check className="size-4 shrink-0 text-fg-brand-primary" /> : null}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div
                className={cx(
                    "rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary transition sm:max-w-md",
                    colorTheme === "custom" && "ring-2 ring-brand",
                )}
            >
                <div className="mb-3">
                    <p className="text-sm font-semibold text-secondary">{t("customPicker")}</p>
                    <p className="mt-0.5 text-xs text-tertiary">{t("customHint")}</p>
                </div>
                <ColorPicker.Root
                    variant="panel"
                    value={customPicker.color}
                    onChange={customPicker.onChange}
                />
            </div>
        </div>
    );
}
