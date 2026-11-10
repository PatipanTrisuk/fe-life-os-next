"use client";

import type { SVGProps } from "react";
import { cx } from "@/utils/cx";

export const LifePlusLogoMinimal = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props} className={cx("size-8 shrink-0", props.className)}>
            <rect width="32" height="32" rx="9" className="fill-bg-brand-solid" />
            <path
                d="M16 8.5c.69 0 1.25.56 1.25 1.25v5h5a1.25 1.25 0 1 1 0 2.5h-5v5a1.25 1.25 0 1 1-2.5 0v-5h-5a1.25 1.25 0 1 1 0-2.5h5v-5c0-.69.56-1.25 1.25-1.25Z"
                className="fill-text-white"
            />
        </svg>
    );
};
