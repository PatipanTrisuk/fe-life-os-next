"use client";

import { useLocale, useTranslations } from "next-intl";
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { formatDate } from "@/lib/date";
import { useAuth } from "@/providers/auth-provider";

export default function ProfilePage() {
    const { user } = useAuth();
    const locale = useLocale();
    const t = useTranslations("profile");

    if (!user) return null;

    return (
        <div className="rounded-2xl bg-primary p-6 shadow-xs ring-1 ring-secondary">
            <AvatarLabelGroup
                size="lg"
                title={user.username}
                subtitle={user.email}
                initials={user.username.slice(0, 2).toUpperCase()}
            />

            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                <div>
                    <dt className="text-sm text-tertiary">{t("role")}</dt>
                    <dd className="mt-1">
                        <BadgeWithDot
                            color={
                                user.role === "admin"
                                    ? "brand"
                                    : user.role === "moderator"
                                      ? "success"
                                      : "gray"
                            }
                            size="sm"
                        >
                            {user.role}
                        </BadgeWithDot>
                    </dd>
                </div>
                <div>
                    <dt className="text-sm text-tertiary">{t("plan")}</dt>
                    <dd className="mt-1">
                        <BadgeWithDot color={user.plan_code === "pro" ? "brand" : "gray"} size="sm">
                            {user.plan_code === "pro" ? t("planPro") : t("planFree")}
                        </BadgeWithDot>
                    </dd>
                </div>
                <div>
                    <dt className="text-sm text-tertiary">{t("authProvider")}</dt>
                    <dd className="mt-1">
                        <BadgeWithDot color="blue" size="sm">
                            {user.auth_provider}
                        </BadgeWithDot>
                    </dd>
                </div>
                <div>
                    <dt className="text-sm text-tertiary">{t("emailVerified")}</dt>
                    <dd className="mt-1">
                        <BadgeWithDot color={user.email_verified_at ? "success" : "warning"} size="sm">
                            {user.email_verified_at ? t("emailVerified") : t("emailUnverified")}
                        </BadgeWithDot>
                    </dd>
                </div>
                <div>
                    <dt className="text-sm text-tertiary">{t("userId")}</dt>
                    <dd className="mt-1 break-all text-sm font-medium text-primary">{user.id}</dd>
                </div>
                {user.discord_id ? (
                    <div>
                        <dt className="text-sm text-tertiary">{t("discordId")}</dt>
                        <dd className="mt-1 text-sm font-medium text-primary">{user.discord_id}</dd>
                    </div>
                ) : null}
                <div>
                    <dt className="text-sm text-tertiary">{t("created")}</dt>
                    <dd className="mt-1 text-sm font-medium text-primary">
                        {formatDate(user.created_at, { locale, withTime: true })}
                    </dd>
                </div>
                <div>
                    <dt className="text-sm text-tertiary">{t("updated")}</dt>
                    <dd className="mt-1 text-sm font-medium text-primary">
                        {formatDate(user.updated_at, { locale, withTime: true })}
                    </dd>
                </div>
            </dl>
        </div>
    );
}
