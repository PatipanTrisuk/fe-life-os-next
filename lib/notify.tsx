"use client";

import { toast, type ExternalToast } from "sonner";
import { IconNotification, type NotificationColor } from "@/components/application/notifications/notifications";

export type NotifyTone = "error" | "success" | "warning" | "info";

const toneToColor: Record<NotifyTone, NotificationColor> = {
    error: "error",
    success: "success",
    warning: "warning",
    info: "brand",
};

type NotifyOptions = ExternalToast & {
    title?: string;
    description?: string;
    confirmLabel?: string;
    dismissLabel?: string;
    hideDismissLabel?: boolean;
    onConfirm?: () => void;
};

function show(tone: NotifyTone, message: string, titleOrOptions?: string | NotifyOptions) {
    const options: NotifyOptions = typeof titleOrOptions === "string" ? { title: titleOrOptions } : (titleOrOptions ?? {});
    const {
        title,
        description,
        confirmLabel,
        dismissLabel,
        hideDismissLabel = !confirmLabel,
        onConfirm,
        ...toastOptions
    } = options;
    const resolvedTitle = title ?? message;
    const resolvedDescription = description ?? (title ? message : undefined);

    return toast.custom(
        (id) => (
            <IconNotification
                title={resolvedTitle}
                description={resolvedDescription}
                color={toneToColor[tone]}
                confirmLabel={confirmLabel}
                dismissLabel={dismissLabel}
                hideDismissLabel={hideDismissLabel}
                onConfirm={onConfirm}
                onClose={() => toast.dismiss(id)}
            />
        ),
        {
            duration: confirmLabel ? 15000 : 5000,
            ...toastOptions,
        },
    );
}

const billingCopy = {
    en: { title: "Plan limit reached", action: "View plans", hint: "Upgrade in Billing." },
    th: { title: "ถึงขีดจำกัดของแพ็กเกจ", action: "ดูแพ็กเกจ", hint: "อัปเกรดได้ที่หน้าการเรียกเก็บเงิน" },
} as const;

/**
 * Soft UX for `billing.limit_reached`: shows the backend message with a shortcut to the billing page.
 */
export function notifyBillingLimit(
    error: { message: string; code?: string },
    locale: string = "en",
) {
    const lang: "en" | "th" = locale === "th" ? "th" : "en";
    const copy = billingCopy[lang];
    const pathLocale =
        typeof window !== "undefined" ? window.location.pathname.split("/")[1] : undefined;
    const prefix = pathLocale === "en" || pathLocale === "th" ? pathLocale : lang;

    return show("warning", `${error.message} ${copy.hint}`.trim(), {
        title: copy.title,
        confirmLabel: copy.action,
        onConfirm: () => {
            if (typeof window !== "undefined") {
                // Called outside React (axios interceptor), so no router hook is available.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign(`/${prefix}/profile/billing`);
            }
        },
    });
}

export const notify = {
    error(message: string, titleOrOptions?: string | NotifyOptions) {
        return show("error", message, titleOrOptions);
    },
    success(message: string, titleOrOptions?: string | NotifyOptions) {
        return show("success", message, titleOrOptions);
    },
    warning(message: string, titleOrOptions?: string | NotifyOptions) {
        return show("warning", message, titleOrOptions);
    },
    info(message: string, titleOrOptions?: string | NotifyOptions) {
        return show("info", message, titleOrOptions);
    },
    dismiss: toast.dismiss,
};
