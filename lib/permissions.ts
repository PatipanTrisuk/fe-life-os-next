/** Mirrors go-auth-backend/internal/authz — keep in sync with backend constants. */
export const Permission = {
    UsersRead: "users.read",
    UsersCreate: "users.create",
    UsersUpdate: "users.update",
    UsersDelete: "users.delete",
    UsersRestore: "users.restore",
    UsersKick: "users.kick",
    UsersResetPassword: "users.reset_password",
    UsersVerifyEmail: "users.verify_email",
    UsersExport: "users.export",
    AdminStats: "admin.stats",
    RolesRead: "roles.read",
    RolesCreate: "roles.create",
    RolesUpdate: "roles.update",
    RolesDelete: "roles.delete",
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

export const Role = {
    User: "user",
    Moderator: "moderator",
    Admin: "admin",
} as const;

export type RoleCode = (typeof Role)[keyof typeof Role];

/** Fallback when API has not yet returned permissions (e.g. stale localStorage). */
const rolePermissions: Record<string, readonly string[]> = {
    user: [],
    moderator: [
        Permission.UsersRead,
        Permission.UsersKick,
        Permission.UsersVerifyEmail,
        Permission.AdminStats,
        Permission.RolesRead,
    ],
    admin: Object.values(Permission),
};

export function permissionsForRole(role: string | null | undefined): string[] {
    const key = (role ?? "").toLowerCase();
    return [...(rolePermissions[key] ?? [])];
}

export function resolvePermissions(
    role: string | null | undefined,
    permissions?: string[] | null,
): string[] {
    if (permissions && permissions.length > 0) {
        return permissions;
    }
    return permissionsForRole(role);
}

export function hasPermission(
    role: string | null | undefined,
    permission: string,
    permissions?: string[] | null,
): boolean {
    return resolvePermissions(role, permissions).includes(permission);
}

export function hasAnyPermission(
    role: string | null | undefined,
    needed: string[],
    permissions?: string[] | null,
): boolean {
    const owned = resolvePermissions(role, permissions);
    return needed.some((p) => owned.includes(p));
}

export function canAccessAdminArea(
    role: string | null | undefined,
    permissions?: string[] | null,
): boolean {
    return resolvePermissions(role, permissions).length > 0;
}
