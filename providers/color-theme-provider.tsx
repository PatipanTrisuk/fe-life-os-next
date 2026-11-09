"use client";

import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import {
    DEFAULT_COLOR_THEME,
    DEFAULT_CUSTOM_COLOR,
    persistColorTheme,
    readStoredColorTheme,
    readStoredCustomColor,
    type ColorThemeId,
} from "@/lib/color-theme";

type ColorThemeContextValue = {
    colorTheme: ColorThemeId;
    customColor: string;
    setColorTheme: (theme: ColorThemeId) => void;
    setCustomColor: (hex: string) => void;
    mounted: boolean;
};

const ColorThemeContext = createContext<ColorThemeContextValue | null>(null);

export function ColorThemeProvider({ children }: PropsWithChildren) {
    const [colorTheme, setColorThemeState] = useState<ColorThemeId>(DEFAULT_COLOR_THEME);
    const [customColor, setCustomColorState] = useState(DEFAULT_CUSTOM_COLOR);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedTheme = readStoredColorTheme();
        const storedCustom = readStoredCustomColor();
        setColorThemeState(storedTheme);
        setCustomColorState(storedCustom);
        persistColorTheme(storedTheme, storedCustom);
        setMounted(true);
    }, []);

    const setColorTheme = (theme: ColorThemeId) => {
        setColorThemeState(theme);
        persistColorTheme(theme, customColor);
    };

    const setCustomColor = (hex: string) => {
        setCustomColorState(hex);
        setColorThemeState("custom");
        persistColorTheme("custom", hex);
    };

    const value = useMemo(
        () => ({
            colorTheme,
            customColor,
            setColorTheme,
            setCustomColor,
            mounted,
        }),
        [colorTheme, customColor, mounted],
    );

    return <ColorThemeContext.Provider value={value}>{children}</ColorThemeContext.Provider>;
}

export function useColorTheme() {
    const ctx = useContext(ColorThemeContext);
    if (!ctx) {
        throw new Error("useColorTheme must be used within ColorThemeProvider");
    }
    return ctx;
}
