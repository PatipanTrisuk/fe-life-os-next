"use client";

/**
 * Full-bleed product atmosphere for the LifeOS landing hero.
 * Decorative only — not interactive and not a card collage.
 */
export function LifeOsHeroVisual() {
    return (
        <div
            data-hero-visual
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-0"
            aria-hidden
        >
            <div className="absolute inset-y-0 right-0 hidden w-[68%] max-w-none opacity-90 sm:block lg:w-[62%]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,color-mix(in_oklab,var(--color-bg-brand-solid)_18%,transparent),transparent_58%)]" />

                <svg
                    className="absolute inset-0 h-full w-full text-fg-quaternary"
                    viewBox="0 0 960 720"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMaxYMid slice"
                >
                    <defs>
                        <linearGradient id="lifeosHeroFade" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="var(--color-bg-primary)" stopOpacity="1" />
                            <stop offset="22%" stopColor="var(--color-bg-primary)" stopOpacity="0.7" />
                            <stop offset="48%" stopColor="var(--color-bg-primary)" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="lifeosBarA" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="var(--color-bg-brand-solid)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--color-bg-brand-solid)" stopOpacity="0.9" />
                        </linearGradient>
                        <linearGradient id="lifeosBarB" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="var(--color-fg-success-primary)" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="var(--color-fg-success-primary)" stopOpacity="0.85" />
                        </linearGradient>
                    </defs>

                    {/* Day strip — Daily Planner */}
                    <g data-hero-layer="planner" opacity="0.92">
                        <text x="220" y="118" fill="currentColor" fontSize="13" fontWeight="600" letterSpacing="0.08em">
                            TODAY
                        </text>
                        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                            const x = 220 + i * 86;
                            const active = i === 2;
                            return (
                                <g key={i}>
                                    <rect
                                        x={x}
                                        y={138}
                                        width="70"
                                        height="88"
                                        rx="10"
                                        fill={active ? "var(--color-bg-brand-solid)" : "var(--color-bg-secondary)"}
                                        opacity={active ? 0.95 : 0.72}
                                        stroke="var(--color-border-secondary)"
                                    />
                                    <text
                                        x={x + 35}
                                        y={172}
                                        textAnchor="middle"
                                        fill={
                                            active
                                                ? "var(--color-text-primary_on-brand)"
                                                : "var(--color-text-tertiary)"
                                        }
                                        fontSize="12"
                                        fontWeight="500"
                                    >
                                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                                    </text>
                                    <text
                                        x={x + 35}
                                        y={198}
                                        textAnchor="middle"
                                        fill={
                                            active
                                                ? "var(--color-text-primary_on-brand)"
                                                : "var(--color-text-primary)"
                                        }
                                        fontSize="22"
                                        fontWeight="600"
                                    >
                                        {10 + i}
                                    </text>
                                </g>
                            );
                        })}

                        {[0, 1, 2].map((i) => (
                            <g key={`task-${i}`}>
                                <rect
                                    x="220"
                                    y={260 + i * 46}
                                    width="560"
                                    height="36"
                                    rx="8"
                                    fill="var(--color-bg-secondary)"
                                    opacity="0.78"
                                    stroke="var(--color-border-secondary)"
                                />
                                <circle
                                    cx="244"
                                    cy={278 + i * 46}
                                    r="8"
                                    fill={i === 0 ? "var(--color-fg-success-primary)" : "transparent"}
                                    stroke={i === 0 ? "var(--color-fg-success-primary)" : "var(--color-fg-quaternary)"}
                                    strokeWidth="2"
                                />
                                <rect
                                    x="266"
                                    y={270 + i * 46}
                                    width={280 - i * 48}
                                    height="10"
                                    rx="5"
                                    fill="var(--color-fg-quaternary)"
                                    opacity={0.55 - i * 0.08}
                                />
                            </g>
                        ))}
                    </g>

                    {/* Goals progress arc */}
                    <g data-hero-layer="goals" opacity="0.95">
                        <circle
                            cx="780"
                            cy="430"
                            r="78"
                            stroke="var(--color-border-secondary)"
                            strokeWidth="14"
                            fill="none"
                        />
                        <circle
                            cx="780"
                            cy="430"
                            r="78"
                            stroke="var(--color-bg-brand-solid)"
                            strokeWidth="14"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray="390"
                            strokeDashoffset="118"
                            transform="rotate(-90 780 430)"
                        />
                        <text
                            x="780"
                            y="424"
                            textAnchor="middle"
                            fill="var(--color-text-primary)"
                            fontSize="28"
                            fontWeight="700"
                        >
                            72%
                        </text>
                        <text
                            x="780"
                            y="450"
                            textAnchor="middle"
                            fill="var(--color-text-tertiary)"
                            fontSize="12"
                            fontWeight="500"
                        >
                            GOALS
                        </text>
                    </g>

                    {/* Habit streak dots */}
                    <g data-hero-layer="habits">
                        <text x="220" y="440" fill="currentColor" fontSize="12" fontWeight="600" letterSpacing="0.06em">
                            HABIT STREAK
                        </text>
                        {Array.from({ length: 14 }).map((_, i) => (
                            <rect
                                key={i}
                                x={220 + (i % 7) * 28}
                                y={458 + Math.floor(i / 7) * 28}
                                width="20"
                                height="20"
                                rx="4"
                                fill={
                                    i < 11
                                        ? "var(--color-fg-success-primary)"
                                        : "var(--color-bg-tertiary)"
                                }
                                opacity={i < 11 ? 0.35 + (i % 5) * 0.12 : 0.55}
                            />
                        ))}
                    </g>

                    {/* Analytics bars */}
                    <g data-hero-layer="analytics">
                        <text x="430" y="440" fill="currentColor" fontSize="12" fontWeight="600" letterSpacing="0.06em">
                            WEEK
                        </text>
                        {[52, 78, 64, 90, 70, 84, 58].map((h, i) => (
                            <rect
                                key={i}
                                x={430 + i * 28}
                                y={560 - h}
                                width="18"
                                height={h}
                                rx="4"
                                fill={i % 2 === 0 ? "url(#lifeosBarA)" : "url(#lifeosBarB)"}
                            />
                        ))}
                    </g>

                    <rect x="0" y="0" width="960" height="720" fill="url(#lifeosHeroFade)" />
                </svg>
            </div>
        </div>
    );
}
