"use client";

import { useRef } from "react";
import { ChevronSelectorVertical, LogOut01, Settings01, User01 } from "@untitledui/icons";
import { useTranslations } from "next-intl";
import {
    Button as AriaButton,
    Dialog as AriaDialog,
    DialogTrigger as AriaDialogTrigger,
    Popover as AriaPopover,
} from "react-aria-components";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/providers/auth-provider";
import { cx } from "@/utils/cx";

function MenuItem({
    icon: Icon,
    label,
    href,
    onClick,
}: {
    icon: typeof User01;
    label: string;
    href?: string;
    onClick?: () => void;
}) {
    const content = (
        <div
            className={cx(
                "flex w-full items-center gap-2 rounded-md p-2 text-sm font-semibold text-secondary",
                "outline-focus-ring group-hover/item:bg-primary_hover group-hover/item:text-secondary_hover",
                "group-focus-visible/item:outline-2 group-focus-visible/item:outline-offset-2",
            )}
        >
            <Icon className="size-5 text-fg-quaternary group-hover/item:text-fg-quaternary_hover" />
            {label}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="group/item w-full cursor-pointer px-1.5 focus:outline-hidden">
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} className="group/item w-full cursor-pointer px-1.5 focus:outline-hidden">
            {content}
        </button>
    );
}

export function AppNavAccountCard() {
    const t = useTranslations();
    const { user, logout, isLoading } = useAuth();
    const triggerRef = useRef<HTMLDivElement>(null);
    const isDesktop = useBreakpoint("lg");

    if (isLoading || !user) return null;

    const initials = user.username.slice(0, 2).toUpperCase();
    const planCode = user.plan_code === "pro" ? "pro" : "free";

    return (
        <div
            ref={triggerRef}
            className="relative flex items-center gap-3 rounded-xl p-3 ring-1 ring-secondary ring-inset"
        >
            <div className="min-w-0 flex-1">
                <AvatarLabelGroup
                    size="md"
                    initials={initials}
                    title={user.username}
                    subtitle={user.email}
                    status="online"
                />
                <div className="mt-2 pl-12">
                    <BadgeWithDot color={planCode === "pro" ? "brand" : "gray"} size="sm">
                        {planCode === "pro" ? t("profile.planPro") : t("profile.planFree")}
                    </BadgeWithDot>
                </div>
            </div>

            <AriaDialogTrigger>
                <AriaButton
                    aria-label={t("nav.profile")}
                    className="absolute top-2 right-2 flex cursor-pointer items-center justify-center rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 pressed:bg-primary_hover pressed:text-fg-quaternary_hover"
                >
                    <ChevronSelectorVertical className="size-4 shrink-0 stroke-[2.25px]" />
                </AriaButton>
                <AriaPopover
                    placement={isDesktop ? "right bottom" : "top right"}
                    triggerRef={triggerRef}
                    offset={8}
                    className={({ isEntering, isExiting }) =>
                        cx(
                            "w-66 origin-(--trigger-anchor-point) will-change-transform",
                            isEntering &&
                                "duration-150 ease-out animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
                            isExiting &&
                                "duration-100 ease-in animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5",
                        )
                    }
                >
                    <AriaDialog className="rounded-xl bg-secondary_alt shadow-lg ring ring-secondary_alt outline-hidden">
                        <div className="rounded-xl bg-primary ring-1 ring-secondary">
                            <div className="flex flex-col gap-0.5 py-1.5">
                                <MenuItem icon={User01} label={t("nav.profile")} href="/profile" />
                                <MenuItem icon={Settings01} label={t("profile.settings")} href="/profile/settings" />
                            </div>
                        </div>
                        <div className="pt-1 pb-1.5">
                            <MenuItem icon={LogOut01} label={t("nav.logout")} onClick={() => void logout()} />
                        </div>
                    </AriaDialog>
                </AriaPopover>
            </AriaDialogTrigger>
        </div>
    );
}
