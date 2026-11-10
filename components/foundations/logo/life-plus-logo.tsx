"use client";

import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";
import { LifePlusLogoMinimal } from "./life-plus-logo-minimal";

type LifePlusLogoProps = HTMLAttributes<HTMLDivElement> & {
    /** Hide the wordmark and show only the mark. */
    markOnly?: boolean;
};

export const LifePlusLogo = ({ markOnly = false, className, ...props }: LifePlusLogoProps) => {
    return (
        <div {...props} className={cx("flex h-8 w-max items-center justify-start gap-2 overflow-visible", className)}>
            <LifePlusLogoMinimal className="aspect-square h-full w-auto shrink-0" />
            {markOnly ? null : (
                <span className="text-[1.05em] leading-none font-semibold tracking-tight text-primary">
                    LIFE
                    <span className="text-fg-brand-primary">+</span>
                </span>
            )}
        </div>
    );
};
