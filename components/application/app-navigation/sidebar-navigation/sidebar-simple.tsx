"use client";

import type { ReactNode } from "react";
import { SearchLg } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { UntitledLogo } from "@/components/foundations/logo/untitledui-logo";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard } from "../base-components/nav-account-card";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import type { NavItemType } from "../config";

interface SidebarNavigationProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: NavItemType[];
    /** List of footer items to display. */
    footerItems?: NavItemType[];
    /** Feature card to display. */
    featureCard?: ReactNode;
    /** Custom account card; overrides the default when provided. */
    accountCard?: ReactNode;
    /** Whether to show the default account card. */
    showAccountCard?: boolean;
    /** Whether to hide the search field. */
    hideSearch?: boolean;
    /** Custom header/logo content. */
    logo?: ReactNode;
    /** Whether to hide the right side border. */
    hideBorder?: boolean;
    /** Additional CSS classes to apply to the sidebar. */
    className?: string;
}

export const SidebarNavigationSimple = ({
    activeUrl,
    items,
    footerItems = [],
    featureCard,
    accountCard,
    showAccountCard = true,
    hideSearch = false,
    logo,
    hideBorder = false,
    className,
}: SidebarNavigationProps) => {
    const brand = logo ?? <UntitledLogo className="h-6" />;
    const MAIN_SIDEBAR_WIDTH = 280;

    const renderContent = (key: string) => (
        <aside
            key={key}
            style={
                {
                    "--width": `${MAIN_SIDEBAR_WIDTH}px`,
                } as React.CSSProperties
            }
            className={cx(
                "flex h-full w-full max-w-full flex-col overflow-hidden bg-primary pt-4 lg:w-(--width) lg:pt-5",
                !hideBorder && "border-secondary md:border-r",
                className,
            )}
        >
            <div className={cx("shrink-0 flex flex-col px-4 lg:px-5", !hideSearch && "gap-5")}>
                {brand}

                {!hideSearch ? (
                    <>
                        <Input size="md" aria-label="Search" placeholder="Search" icon={SearchLg} className="md:hidden" />
                        <Input shortcut size="sm" aria-label="Search" placeholder="Search" icon={SearchLg} className="max-md:hidden" />
                    </>
                ) : null}
            </div>

            <NavList activeUrl={activeUrl} items={items} className="scrollbar min-h-0 flex-1 overflow-y-auto" />

            <div className="mt-auto flex shrink-0 flex-col gap-3 px-4 py-4 lg:py-5">
                {footerItems.length > 0 && (
                    <ul className="flex flex-col">
                        {footerItems.map((item) => (
                            <li key={item.label} className="py-px">
                                <NavItemBase
                                    badge={item.badge}
                                    icon={item.icon}
                                    href={item.href}
                                    type="link"
                                    current={Boolean(
                                        item.href &&
                                            activeUrl &&
                                            (activeUrl === item.href || activeUrl.startsWith(`${item.href}/`)),
                                    )}
                                >
                                    {item.label}
                                </NavItemBase>
                            </li>
                        ))}
                    </ul>
                )}

                {featureCard}

                {accountCard ?? (showAccountCard ? <NavAccountCard /> : null)}
            </div>
        </aside>
    );

    return (
        <>
            <MobileNavigationHeader logo={brand}>{renderContent("mobile")}</MobileNavigationHeader>

            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex">{renderContent("desktop")}</div>

            <div
                style={{
                    paddingLeft: MAIN_SIDEBAR_WIDTH,
                }}
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
            />
        </>
    );
};
