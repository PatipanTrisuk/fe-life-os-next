export const COLOR_THEME_STORAGE_KEY = "app.colorTheme";
export const CUSTOM_COLOR_STORAGE_KEY = "app.customColor";

export const COLOR_THEMES = [
    { id: "neutral", swatch: "var(--color-neutral-950)", preview: "var(--color-neutral-500)" },
    { id: "blue", swatch: "var(--color-blue-600)", preview: "var(--color-blue-500)" },
    { id: "indigo", swatch: "var(--color-indigo-600)", preview: "var(--color-indigo-500)" },
    { id: "sky", swatch: "var(--color-sky-600)", preview: "var(--color-sky-500)" },
    { id: "emerald", swatch: "var(--color-emerald-600)", preview: "var(--color-emerald-500)" },
    { id: "teal", swatch: "var(--color-teal-600)", preview: "var(--color-teal-500)" },
    { id: "amber", swatch: "var(--color-amber-600)", preview: "var(--color-amber-500)" },
    { id: "orange", swatch: "var(--color-orange-600)", preview: "var(--color-orange-500)" },
    { id: "rose", swatch: "var(--color-rose-600)", preview: "var(--color-rose-500)" },
    { id: "pink", swatch: "var(--color-pink-600)", preview: "var(--color-pink-500)" },
    { id: "fuchsia", swatch: "var(--color-fuchsia-600)", preview: "var(--color-fuchsia-500)" },
    { id: "purple", swatch: "var(--color-purple-600)", preview: "var(--color-purple-500)" },
    { id: "custom", swatch: "var(--color-brand-600)", preview: "var(--color-brand-500)" },
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

export const DEFAULT_COLOR_THEME: ColorThemeId = "neutral";
export const DEFAULT_CUSTOM_COLOR = "#2563eb";

export const BRAND_SHADE_KEYS = [
    "50",
    "100",
    "200",
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
    "950",
] as const;

export type BrandShade = (typeof BRAND_SHADE_KEYS)[number];

const PRESET_THEME_IDS = COLOR_THEMES.map((theme) => theme.id).filter((id) => id !== "custom");

type Hsl = { h: number; s: number; l: number };

export function isColorThemeId(value: string | null | undefined): value is ColorThemeId {
    return COLOR_THEMES.some((theme) => theme.id === value);
}

export function normalizeHexColor(value: string | null | undefined): string | null {
    if (!value) return null;
    const raw = value.trim();
    const short = /^#([0-9a-fA-F]{3})$/.exec(raw);
    if (short) {
        const [r, g, b] = short[1].split("");
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    const full = /^#([0-9a-fA-F]{6})$/.exec(raw);
    if (!full) return null;
    return `#${full[1].toLowerCase()}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalized = normalizeHexColor(hex);
    if (!normalized) return null;
    return {
        r: Number.parseInt(normalized.slice(1, 3), 16),
        g: Number.parseInt(normalized.slice(3, 5), 16),
        b: Number.parseInt(normalized.slice(5, 7), 16),
    };
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === rn) h = ((gn - bn) / delta) % 6;
        else if (max === gn) h = (bn - rn) / delta + 2;
        else h = (rn - gn) / delta + 4;
        h *= 60;
        if (h < 0) h += 360;
    }

    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let rn = 0;
    let gn = 0;
    let bn = 0;

    if (h < 60) [rn, gn, bn] = [c, x, 0];
    else if (h < 120) [rn, gn, bn] = [x, c, 0];
    else if (h < 180) [rn, gn, bn] = [0, c, x];
    else if (h < 240) [rn, gn, bn] = [0, x, c];
    else if (h < 300) [rn, gn, bn] = [x, 0, c];
    else [rn, gn, bn] = [c, 0, x];

    return {
        r: Math.round((rn + m) * 255),
        g: Math.round((gn + m) * 255),
        b: Math.round((bn + m) * 255),
    };
}

function toCssRgb({ r, g, b }: { r: number; g: number; b: number }) {
    return `rgb(${r} ${g} ${b})`;
}

/** Lightness targets for a usable brand ramp around a chosen mid color. */
const SHADE_LIGHTNESS: Record<BrandShade, number> = {
    "50": 0.97,
    "100": 0.94,
    "200": 0.86,
    "300": 0.76,
    "400": 0.64,
    "500": 0.52,
    "600": 0.44,
    "700": 0.36,
    "800": 0.28,
    "900": 0.2,
    "950": 0.12,
};

export function buildBrandScale(hex: string): Record<BrandShade, string> | null {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const base = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const saturation = Math.min(0.92, Math.max(base.s, 0.35));

    const scale = {} as Record<BrandShade, string>;
    for (const shade of BRAND_SHADE_KEYS) {
        const lightness = SHADE_LIGHTNESS[shade];
        // Keep very light shades a bit less saturated so backgrounds stay soft.
        const shadeSat = shade === "50" || shade === "100" ? saturation * 0.55 : saturation;
        scale[shade] = toCssRgb(hslToRgb(base.h, shadeSat, lightness));
    }
    // Anchor 600 to the exact picked color for predictable buttons.
    scale["600"] = toCssRgb(rgb);
    return scale;
}

function clearCustomBrandVars(root: HTMLElement) {
    for (const shade of BRAND_SHADE_KEYS) {
        root.style.removeProperty(`--color-brand-${shade}`);
    }
}

function applyCustomBrandVars(root: HTMLElement, hex: string) {
    const scale = buildBrandScale(hex);
    if (!scale) return false;
    for (const shade of BRAND_SHADE_KEYS) {
        root.style.setProperty(`--color-brand-${shade}`, scale[shade]);
    }
    return true;
}

export function applyColorTheme(theme: ColorThemeId, customHex = DEFAULT_CUSTOM_COLOR) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const hex = normalizeHexColor(customHex) ?? DEFAULT_CUSTOM_COLOR;

    if (theme === "custom") {
        root.setAttribute("data-color", "custom");
        applyCustomBrandVars(root, hex);
        return;
    }

    clearCustomBrandVars(root);
    if (theme === DEFAULT_COLOR_THEME) {
        root.removeAttribute("data-color");
    } else {
        root.setAttribute("data-color", theme);
    }
}

export function readStoredColorTheme(): ColorThemeId {
    if (typeof window === "undefined") return DEFAULT_COLOR_THEME;
    try {
        const stored = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
        return isColorThemeId(stored) ? stored : DEFAULT_COLOR_THEME;
    } catch {
        return DEFAULT_COLOR_THEME;
    }
}

export function readStoredCustomColor(): string {
    if (typeof window === "undefined") return DEFAULT_CUSTOM_COLOR;
    try {
        return normalizeHexColor(window.localStorage.getItem(CUSTOM_COLOR_STORAGE_KEY)) ?? DEFAULT_CUSTOM_COLOR;
    } catch {
        return DEFAULT_CUSTOM_COLOR;
    }
}

export function persistColorTheme(theme: ColorThemeId, customHex = readStoredCustomColor()) {
    const hex = normalizeHexColor(customHex) ?? DEFAULT_CUSTOM_COLOR;
    applyColorTheme(theme, hex);
    try {
        window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
        window.localStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, hex);
    } catch {
        // ignore
    }
}

export const COLOR_THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(COLOR_THEME_STORAGE_KEY)};var ck=${JSON.stringify(CUSTOM_COLOR_STORAGE_KEY)};var c=localStorage.getItem(k);var custom=localStorage.getItem(ck)||${JSON.stringify(DEFAULT_CUSTOM_COLOR)};var presets=${JSON.stringify(PRESET_THEME_IDS)};var root=document.documentElement;function norm(v){if(!v)return null;v=String(v).trim();var s=/^#([0-9a-fA-F]{3})$/.exec(v);if(s){var a=s[1].split("");return("#"+a[0]+a[0]+a[1]+a[1]+a[2]+a[2]).toLowerCase();}var f=/^#([0-9a-fA-F]{6})$/.exec(v);return f?("#"+f[1]).toLowerCase():null;}function hexToRgb(hex){hex=norm(hex);if(!hex)return null;return{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};}function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;var max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,h=0,l=(max+min)/2,s=d===0?0:d/(1-Math.abs(2*l-1));if(d!==0){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}return{h:h,s:s,l:l};}function hslToRgb(h,s,l){var c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2,rn=0,gn=0,bn=0;if(h<60){rn=c;gn=x;}else if(h<120){rn=x;gn=c;}else if(h<180){gn=c;bn=x;}else if(h<240){gn=x;bn=c;}else if(h<300){rn=x;bn=c;}else{rn=c;bn=x;}return{r:Math.round((rn+m)*255),g:Math.round((gn+m)*255),b:Math.round((bn+m)*255)};}function applyCustom(hex){var rgb=hexToRgb(hex);if(!rgb)return;var base=rgbToHsl(rgb.r,rgb.g,rgb.b);var sat=Math.min(0.92,Math.max(base.s,0.35));var lights={"50":0.97,"100":0.94,"200":0.86,"300":0.76,"400":0.64,"500":0.52,"600":0.44,"700":0.36,"800":0.28,"900":0.2,"950":0.12};Object.keys(lights).forEach(function(shade){var s=shade==="50"||shade==="100"?sat*0.55:sat;var out=shade==="600"?rgb:hslToRgb(base.h,s,lights[shade]);root.style.setProperty("--color-brand-"+shade,"rgb("+out.r+" "+out.g+" "+out.b+")");});}if(c==="custom"){root.setAttribute("data-color","custom");applyCustom(custom);return;}if(presets.indexOf(c)!==-1){["50","100","200","300","400","500","600","700","800","900","950"].forEach(function(shade){root.style.removeProperty("--color-brand-"+shade);});if(c===${JSON.stringify(DEFAULT_COLOR_THEME)}){root.removeAttribute("data-color");}else{root.setAttribute("data-color",c);}}}catch(e){}})();`;
