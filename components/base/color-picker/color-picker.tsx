"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import { ChevronDown, Dropper } from "@untitledui/icons";
import {
    Button as AriaButton,
    ColorArea as AriaColorArea,
    ColorField as AriaColorField,
    ColorPicker as AriaColorPicker,
    ColorPickerStateContext,
    ColorSlider as AriaColorSlider,
    ColorSwatch as AriaColorSwatch,
    ColorThumb as AriaColorThumb,
    Dialog as AriaDialog,
    DialogTrigger as AriaDialogTrigger,
    Input as AriaInput,
    Label as AriaLabel,
    parseColor,
    Popover as AriaPopover,
    SliderTrack as AriaSliderTrack,
    type Color,
    type ColorPickerProps as AriaColorPickerProps,
} from "react-aria-components";
import { Select } from "@/components/base/select/select";
import { cx } from "@/utils/cx";

const COLOR_FORMAT_ITEMS = [
    { id: "hex" as const, label: "Hex" },
    { id: "rgb" as const, label: "RGB" },
    { id: "hsl" as const, label: "HSL" },
];

type ColorFormat = "hex" | "rgb" | "hsl";

type ColorPickerUiContextValue = {
    format: ColorFormat;
    setFormat: (format: ColorFormat) => void;
};

const ColorPickerUiContext = createContext<ColorPickerUiContextValue | null>(null);

function useColorPickerUi() {
    const ctx = useContext(ColorPickerUiContext);
    if (!ctx) {
        throw new Error("ColorPicker parts must be used within ColorPicker.Root");
    }
    return ctx;
}

const thumbClassName = ({ isFocusVisible, isDragging }: { isFocusVisible: boolean; isDragging: boolean }) =>
    cx(
        "box-border size-5 rounded-full border-2 border-white bg-transparent shadow-md ring-1 ring-black/10",
        isFocusVisible && "outline-2 outline-offset-2 outline-focus-ring",
        isDragging && "scale-110",
    );

function Provider({
    children,
    className,
    ...props
}: AriaColorPickerProps & { children: ReactNode; className?: string }) {
    const [format, setFormat] = useState<ColorFormat>("hex");
    const ui = useMemo(() => ({ format, setFormat }), [format]);

    return (
        <ColorPickerUiContext.Provider value={ui}>
            <AriaColorPicker {...props}>
                <div className={cx("flex w-full flex-col gap-3", className)}>{children}</div>
            </AriaColorPicker>
        </ColorPickerUiContext.Provider>
    );
}

function Area({ className }: { className?: string }) {
    return (
        <AriaColorArea
            aria-label="Color"
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
            className={cx(
                "relative h-44 w-full shrink-0 rounded-lg shadow-xs ring-1 ring-secondary ring-inset forced-colors:outline",
                className,
            )}
        >
            <AriaColorThumb className={thumbClassName} />
        </AriaColorArea>
    );
}

function HueSlider({ className }: { className?: string }) {
    return (
        <AriaColorSlider colorSpace="hsb" channel="hue" className={cx("w-full", className)}>
            <AriaLabel className="sr-only">Hue</AriaLabel>
            <AriaSliderTrack className="relative h-3 w-full rounded-full outline-hidden">
                <AriaColorThumb className={(state) => cx(thumbClassName(state), "top-1/2")} />
            </AriaSliderTrack>
        </AriaColorSlider>
    );
}

function AlphaSlider({ className }: { className?: string }) {
    return (
        <AriaColorSlider channel="alpha" className={cx("color-picker-alpha w-full", className)}>
            <AriaLabel className="sr-only">Alpha</AriaLabel>
            <AriaSliderTrack className="relative h-3 w-full rounded-full outline-hidden">
                <AriaColorThumb className={(state) => cx(thumbClassName(state), "top-1/2")} />
            </AriaSliderTrack>
        </AriaColorSlider>
    );
}

function EyeDropperButton({ className }: { className?: string }) {
    const state = useContext(ColorPickerStateContext);
    const supported = typeof window !== "undefined" && "EyeDropper" in window;

    const onPress = useCallback(async () => {
        try {
            type EyeDropperResult = { sRGBHex: string };
            type EyeDropperApi = { open: () => Promise<EyeDropperResult> };
            const Ctor = (window as Window & { EyeDropper?: new () => EyeDropperApi }).EyeDropper;
            if (!Ctor || !state) return;
            const result = await new Ctor().open();
            state.setColor(parseColor(result.sRGBHex));
        } catch {
            // cancelled
        }
    }, [state]);

    if (!supported) return null;

    return (
        <AriaButton
            aria-label="Eye dropper"
            onPress={onPress}
            className={cx(
                "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-fg-quaternary shadow-xs ring-1 ring-primary ring-inset outline-focus-ring transition hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 pressed:bg-primary_hover",
                className,
            )}
        >
            <Dropper className="size-5" />
        </AriaButton>
    );
}

function ColorFormatSelect({ className }: { className?: string }) {
    const { format, setFormat } = useColorPickerUi();

    return (
        <Select
            aria-label="Color format"
            size="sm"
            className={cx("w-[5.5rem] shrink-0", className)}
            selectedKey={format}
            onSelectionChange={(key) => {
                if (key === "hex" || key === "rgb" || key === "hsl") setFormat(key);
            }}
            items={COLOR_FORMAT_ITEMS}
        >
            {(item) => <Select.Item id={item.id} label={item.label} />}
        </Select>
    );
}

function ColorValueInput({ className }: { className?: string }) {
    const { format } = useColorPickerUi();
    const state = useContext(ColorPickerStateContext);

    if (format !== "hex") {
        const channels =
            format === "rgb"
                ? (["red", "green", "blue"] as const)
                : (["hue", "saturation", "lightness"] as const);

        return (
            <div className={cx("flex min-w-0 flex-1 gap-1.5", className)}>
                {channels.map((channel) => (
                    <AriaColorField
                        key={channel}
                        colorSpace={format === "rgb" ? "rgb" : "hsl"}
                        channel={channel}
                        aria-label={channel}
                        className="min-w-0 flex-1"
                    >
                        <div className="flex h-10 items-center rounded-lg bg-primary px-2 shadow-xs ring-1 ring-primary ring-inset focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring">
                            <AriaInput className="w-full min-w-0 bg-transparent text-center text-sm text-primary outline-hidden" />
                        </div>
                    </AriaColorField>
                ))}
            </div>
        );
    }

    return (
        <AriaColorField aria-label="Hex color" className={cx("min-w-0 flex-1", className)}>
            <div className="flex h-10 items-center gap-2 rounded-lg bg-primary px-3 shadow-xs ring-1 ring-primary ring-inset focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring">
                <span
                    className="size-5 shrink-0 rounded-full ring-1 ring-black/10 ring-inset"
                    style={{ backgroundColor: state?.color.toString("css") }}
                    aria-hidden
                />
                <AriaInput className="w-full min-w-0 bg-transparent font-mono text-sm text-primary uppercase outline-hidden" />
            </div>
        </AriaColorField>
    );
}

function OpacityInput({ className }: { className?: string }) {
    return (
        <AriaColorField
            channel="alpha"
            aria-label="Opacity"
            className={cx("w-[4.5rem] shrink-0", className)}
        >
            <div className="flex h-10 items-center rounded-lg bg-primary px-2.5 shadow-xs ring-1 ring-primary ring-inset focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring">
                <AriaInput className="w-full min-w-0 bg-transparent text-center text-sm text-primary outline-hidden" />
            </div>
        </AriaColorField>
    );
}

function ControlsRow({ className }: { className?: string }) {
    return (
        <div className={cx("flex items-center gap-3", className)}>
            <EyeDropperButton />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
                <HueSlider />
                <AlphaSlider />
            </div>
        </div>
    );
}

function InputsRow({ className }: { className?: string }) {
    return (
        <div className={cx("flex items-center gap-2", className)}>
            <ColorFormatSelect />
            <ColorValueInput />
            <OpacityInput />
        </div>
    );
}

/** Full solid picker panel matching Untitled UI. */
function Solid({ className }: { className?: string }) {
    return (
        <div className={cx("flex w-full flex-col gap-3", className)}>
            <Area />
            <ControlsRow />
            <InputsRow />
        </div>
    );
}

function Trigger({ className, label }: { className?: string; label?: string }) {
    const state = useContext(ColorPickerStateContext);
    const hex = state?.color.toString("hex") ?? "#000000";

    return (
        <AriaButton
            className={cx(
                "inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-secondary shadow-xs ring-1 ring-primary ring-inset outline-focus-ring transition hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2 pressed:bg-primary_hover",
                className,
            )}
        >
            <span
                className="size-5 shrink-0 rounded-md ring-1 ring-black/10 ring-inset"
                style={{ backgroundColor: hex }}
                aria-hidden
            />
            {label ? <span>{label}</span> : <span className="font-mono text-sm font-medium uppercase">{hex}</span>}
            <ChevronDown className="size-4 shrink-0 text-fg-quaternary" />
        </AriaButton>
    );
}

function Dialog({ children, className }: { children?: ReactNode; className?: string }) {
    return (
        <AriaPopover
            placement="bottom start"
            className={(popoverState) =>
                cx(
                    "w-80 origin-(--trigger-anchor-point) rounded-xl bg-primary p-3 shadow-lg ring-1 ring-secondary_alt",
                    popoverState.isEntering && "duration-150 ease-out animate-in fade-in zoom-in-95",
                    popoverState.isExiting && "duration-100 ease-in animate-out fade-out zoom-out-95",
                    className,
                )
            }
        >
            <AriaDialog className="outline-hidden">{children ?? <Solid />}</AriaDialog>
        </AriaPopover>
    );
}

type RootProps = Omit<AriaColorPickerProps, "children"> & {
    children?: ReactNode;
    className?: string;
    variant?: "popover" | "panel";
    label?: string;
};

function Root({ children, className, variant = "popover", label, ...props }: RootProps) {
    if (variant === "panel") {
        return (
            <Provider {...props} className={className}>
                {children ?? <Solid />}
            </Provider>
        );
    }

    return (
        <Provider {...props}>
            <AriaDialogTrigger>
                {children ?? (
                    <>
                        <Trigger label={label} className={className} />
                        <Dialog />
                    </>
                )}
            </AriaDialogTrigger>
        </Provider>
    );
}

/** Controlled helper that keeps a hex string in sync with the picker. */
export function useHexColorPicker(value: string, onChange: (hex: string) => void) {
    const [color, setColor] = useState(() => {
        try {
            return parseColor(value);
        } catch {
            return parseColor("#2563eb");
        }
    });

    useEffect(() => {
        try {
            setColor(parseColor(value));
        } catch {
            // keep previous
        }
    }, [value]);

    const handleChange = useCallback(
        (next: Color) => {
            setColor(next);
            onChange(next.toString("hex"));
        },
        [onChange],
    );

    return { color, onChange: handleChange };
}

export function parseColorValue(value: string): Color {
    return parseColor(value);
}

export const ColorPicker = {
    Root,
    Provider,
    Area,
    HueSlider,
    AlphaSlider,
    EyeDropper: EyeDropperButton,
    ColorFormatSelect,
    ColorValueInput,
    OpacityInput,
    ControlsRow,
    InputsRow,
    Solid,
    Trigger,
    Dialog,
    Swatch: AriaColorSwatch,
};
