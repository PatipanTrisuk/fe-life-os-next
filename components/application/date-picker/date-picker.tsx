"use client";

import { useEffect, useState } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { useControlledState } from "@react-stately/utils";
import { useLocale, useTranslations } from "next-intl";
import { Calendar as CalendarIcon } from "@untitledui/icons";
import type { DatePickerProps as AriaDatePickerProps, DateValue } from "react-aria-components";
import { DatePicker as AriaDatePicker, Dialog as AriaDialog, Group as AriaGroup, Popover as AriaPopover } from "react-aria-components";
import { Button, type ButtonProps } from "@/components/base/buttons/button";
import { Label } from "@/components/base/input/label";
import { formatDate } from "@/lib/date";
import { cx } from "@/utils/cx";
import { Calendar } from "./calendar";

const highlightedDates = [today(getLocalTimeZone())];

interface DatePickerProps extends AriaDatePickerProps<DateValue> {
    /** Optional field label shown above the trigger. */
    label?: string;
    /** The function to call when the apply button is clicked. */
    onApply?: () => void;
    /** The function to call when the cancel button is clicked. */
    onCancel?: () => void;
    /** Controls the size of the trigger button that opens the calendar. */
    size?: ButtonProps["size"];
}

export const DatePicker = ({
    label,
    value: valueProp,
    defaultValue,
    onChange,
    onApply,
    onCancel,
    size = "md",
    className,
    ...props
}: DatePickerProps) => {
    const locale = useLocale();
    const t = useTranslations("datePicker");
    const tCommon = useTranslations("common");
    const [committed, setCommitted] = useControlledState(valueProp, defaultValue || null, onChange);
    const [draft, setDraft] = useState<DateValue | null>(committed);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) setDraft(committed);
    }, [committed, isOpen]);

    const displayValue = isOpen ? draft : committed;
    const formattedDate = displayValue
        ? formatDate(displayValue.toDate(getLocalTimeZone()), { locale })
        : null;

    return (
        <AriaDatePicker
            aria-label={label || t("selectDate")}
            shouldCloseOnSelect={false}
            {...props}
            value={displayValue}
            onChange={setDraft}
            onOpenChange={(open) => {
                setIsOpen(open);
                if (open) setDraft(committed);
                props.onOpenChange?.(open);
            }}
            className={(state) =>
                cx("flex flex-col gap-1.5", typeof className === "function" ? className(state) : className)
            }
        >
            {label ? <Label isRequired={props.isRequired}>{label}</Label> : null}
            <AriaGroup>
                <Button size={size} color="secondary" iconLeading={CalendarIcon} className="w-full justify-start">
                    {formattedDate ? (
                        formattedDate
                    ) : (
                        <span className="text-placeholder">{t("selectDate")}</span>
                    )}
                </Button>
            </AriaGroup>
            <AriaPopover
                offset={8}
                placement="bottom end"
                className={({ isEntering, isExiting }) =>
                    cx(
                        "origin-(--trigger-anchor-point) will-change-transform",
                        isEntering &&
                            "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                        isExiting &&
                            "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                    )
                }
            >
                <AriaDialog aria-label={t("selectDate")} className="rounded-2xl bg-primary shadow-xl ring ring-secondary_alt">
                    {({ close }) => (
                        <>
                            <div className="flex px-6 py-5">
                                <Calendar highlightedDates={highlightedDates} />
                            </div>
                            <div className="grid grid-cols-2 gap-3 border-t border-secondary p-4">
                                <Button
                                    size="md"
                                    color="secondary"
                                    onClick={() => {
                                        setDraft(committed);
                                        onCancel?.();
                                        close();
                                    }}
                                >
                                    {tCommon("cancel")}
                                </Button>
                                <Button
                                    size="md"
                                    color="primary"
                                    onClick={() => {
                                        setCommitted(draft);
                                        onApply?.();
                                        close();
                                    }}
                                >
                                    {tCommon("apply")}
                                </Button>
                            </div>
                        </>
                    )}
                </AriaDialog>
            </AriaPopover>
        </AriaDatePicker>
    );
};
