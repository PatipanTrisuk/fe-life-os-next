"use client";

import { useState } from "react";
import { cx } from "@/utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { NavItemBase } from "./nav-item";

interface NavListProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** Additional CSS classes to apply to the list. */
    className?: string;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
}

function matchesUrl(href: string | undefined, activeUrl?: string) {
    if (!href || !activeUrl) return false;
    return activeUrl === href || activeUrl.startsWith(`${href}/`);
}

function isItemActive(item: NavItemType | NavItemDividerType, activeUrl?: string) {
    if (matchesUrl(item.href, activeUrl)) return true;
    return Boolean(item.items?.some((subItem) => matchesUrl(subItem.href, activeUrl)));
}

export const NavList = ({ activeUrl, items, className }: NavListProps) => {
    // Keep collapsible groups expanded on first render; user can still toggle.
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const item of items) {
            if (!item.divider && item.items?.length && item.label) {
                initial[item.label] = true;
            }
        }
        return initial;
    });

    return (
        <ul className={cx("flex flex-col px-4 pt-5", className)}>
            {items.map((item, index) => {
                if (item.divider) {
                    return (
                        <li key={index} className="w-full px-0.5 py-2">
                            <hr className="h-px w-full border-none bg-border-secondary" />
                        </li>
                    );
                }

                if (item.items?.length) {
                    const groupKey = item.label;
                    const isOpen = openGroups[groupKey] ?? true;

                    return (
                        <details
                            key={groupKey}
                            open={isOpen}
                            onToggle={(event) => {
                                const nextOpen = event.currentTarget.open;
                                setOpenGroups((prev) => {
                                    if (prev[groupKey] === nextOpen) return prev;
                                    return { ...prev, [groupKey]: nextOpen };
                                });
                            }}
                            className="appearance-none py-0.25"
                        >
                            <NavItemBase
                                badge={item.badge}
                                icon={item.icon}
                                type="collapsible"
                                current={isItemActive(item, activeUrl)}
                            >
                                {item.label}
                            </NavItemBase>

                            <dd>
                                <ul className="pb-1">
                                    {item.items.map((childItem) => (
                                        <li key={childItem.label} className="py-0.25">
                                            <NavItemBase
                                                href={childItem.href}
                                                badge={childItem.badge}
                                                icon={childItem.icon}
                                                type="collapsible-child"
                                                current={matchesUrl(childItem.href, activeUrl)}
                                            >
                                                {childItem.label}
                                            </NavItemBase>
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </details>
                    );
                }

                return (
                    <li key={item.label} className="py-px">
                        <NavItemBase
                            type="link"
                            badge={item.badge}
                            icon={item.icon}
                            href={item.href}
                            current={matchesUrl(item.href, activeUrl)}
                        >
                            {item.label}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    );
};
