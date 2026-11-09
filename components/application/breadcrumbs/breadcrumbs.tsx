"use client";

import {
    Children,
    createContext,
    isValidElement,
    useContext,
    useMemo,
    useState,
    type FC,
    type ReactNode,
} from "react";
import {
    Breadcrumb as AriaBreadcrumb,
    Breadcrumbs as AriaBreadcrumbs,
    type BreadcrumbProps as AriaBreadcrumbProps,
} from "react-aria-components/Breadcrumbs";
import { ChevronRight, SlashDivider } from "@untitledui/icons";
import { Avatar } from "@/components/base/avatar/avatar";
import { Link } from "@/i18n/navigation";
import { cx } from "@/utils/cx";
import { isReactComponent } from "@/utils/is-react-component";

type BreadcrumbDivider = "chevron" | "slash";
type BreadcrumbType = "text" | "text-line" | "button";

interface BreadcrumbsContextValue {
    divider: BreadcrumbDivider;
    type: BreadcrumbType;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextValue>({
    divider: "chevron",
    type: "text",
});

const itemStyles: Record<BreadcrumbType, { base: string; current: string; link: string }> = {
    text: {
        base: "inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold",
        current: "text-primary",
        link: "text-quaternary transition duration-100 ease-linear hover:text-tertiary",
    },
    "text-line": {
        base: "inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold",
        current: "text-primary",
        link: "text-quaternary transition duration-100 ease-linear hover:text-tertiary",
    },
    button: {
        base: "inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold",
        current: "text-primary",
        link: "text-quaternary transition duration-100 ease-linear hover:bg-primary_hover hover:text-secondary",
    },
};

function DividerIcon({ divider }: { divider: BreadcrumbDivider }) {
    if (divider === "slash") {
        return <SlashDivider className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />;
    }
    return <ChevronRight className="size-4 shrink-0 text-fg-quaternary" aria-hidden="true" />;
}

interface BreadcrumbsProps {
    children: ReactNode;
    divider?: BreadcrumbDivider;
    type?: BreadcrumbType;
    className?: string;
    maxVisibleItems?: number;
    "aria-label"?: string;
}

function BreadcrumbsRoot({
    children,
    divider = "chevron",
    type = "text",
    className,
    maxVisibleItems = 4,
    "aria-label": ariaLabel = "Breadcrumbs",
}: BreadcrumbsProps) {
    const [expanded, setExpanded] = useState(false);

    const items = useMemo(() => Children.toArray(children).filter(isValidElement), [children]);

    const visibleItems = useMemo(() => {
        if (expanded || maxVisibleItems <= 0 || items.length <= maxVisibleItems) {
            return items;
        }

        const leading = items.slice(0, 1);
        const trailingCount = Math.max(maxVisibleItems - 2, 1);
        const trailing = items.slice(-trailingCount);

        return [
            ...leading,
            <BreadcrumbItem key="__ellipsis" isEllipsis onClick={() => setExpanded(true)} />,
            ...trailing,
        ];
    }, [expanded, items, maxVisibleItems]);

    return (
        <BreadcrumbsContext.Provider value={{ divider, type }}>
            <nav
                aria-label={ariaLabel}
                className={cx(
                    type === "text-line" && "border-y border-secondary py-2",
                    className,
                )}
            >
                <AriaBreadcrumbs className="flex flex-wrap items-center gap-1.5">{visibleItems}</AriaBreadcrumbs>
            </nav>
        </BreadcrumbsContext.Provider>
    );
}

interface BreadcrumbItemProps extends Omit<AriaBreadcrumbProps, "children" | "className"> {
    href?: string;
    divider?: BreadcrumbDivider;
    type?: BreadcrumbType;
    isEllipsis?: boolean;
    children?: ReactNode;
    className?: string;
    icon?: ReactNode | FC<{ className?: string }>;
    avatarSrc?: string;
    onClick?: () => void;
}

function BreadcrumbItem({
    href,
    divider: dividerProp,
    type: typeProp,
    isEllipsis,
    children,
    className,
    icon,
    avatarSrc,
    onClick,
    ...props
}: BreadcrumbItemProps) {
    const context = useContext(BreadcrumbsContext);
    const divider = dividerProp ?? context.divider;
    const type = typeProp ?? context.type;
    const styles = itemStyles[type];

    const iconNode = (() => {
        if (!icon) return null;
        if (isValidElement(icon)) return icon;
        if (isReactComponent(icon)) {
            const Icon = icon;
            return <Icon className="size-4 shrink-0 text-fg-quaternary" />;
        }
        return null;
    })();

    const label = isEllipsis ? "..." : children;

    const content = (
        <>
            {avatarSrc ? <Avatar size="xs" src={avatarSrc} alt="" contrastBorder /> : iconNode}
            {label != null && label !== false ? <span className="truncate">{label}</span> : null}
        </>
    );

    return (
        <AriaBreadcrumb
            {...props}
            className={cx("inline-flex items-center gap-1.5 outline-hidden", className)}
        >
            {({ isCurrent }) => {
                const current = isCurrent && !isEllipsis;
                const interactive = Boolean(href) && !current;

                const body = interactive ? (
                    <Link href={href!} className={cx(styles.base, styles.link)} onClick={onClick}>
                        {content}
                    </Link>
                ) : isEllipsis ? (
                    <button
                        type="button"
                        aria-label="See all breadcrumb items"
                        onClick={onClick}
                        className={cx(styles.base, styles.link, "cursor-pointer")}
                    >
                        {content}
                    </button>
                ) : (
                    <span className={cx(styles.base, current ? styles.current : styles.link)} onClick={onClick}>
                        {content}
                    </span>
                );

                return (
                    <>
                        {body}
                        {!isCurrent ? <DividerIcon divider={divider} /> : null}
                    </>
                );
            }}
        </AriaBreadcrumb>
    );
}

const Breadcrumbs = Object.assign(BreadcrumbsRoot, {
    Item: BreadcrumbItem,
});

export { Breadcrumbs, BreadcrumbItem };
export type { BreadcrumbsProps, BreadcrumbItemProps, BreadcrumbDivider, BreadcrumbType };
