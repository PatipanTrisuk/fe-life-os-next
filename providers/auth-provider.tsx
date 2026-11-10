"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { authApi, toApiError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
    clearSession,
    getAccessToken,
    getStoredUser,
    saveSession,
    saveUser,
    setRememberedEmail,
} from "@/lib/token-storage";
import {
    canAccessAdminArea,
    hasPermission as checkPermission,
} from "@/lib/permissions";
import type { AuthSession, User } from "@/lib/types";

type LoginOptions = {
    rememberMe?: boolean;
};

type AuthContextValue = {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isAdmin: boolean;
    canManage: boolean;
    hasPermission: (permission: string) => boolean;
    login: (email: string, password: string, options?: LoginOptions) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    loginWithDiscordSession: (session: AuthSession, options?: LoginOptions) => void;
    loginWithOAuthSession: (session: AuthSession, options?: LoginOptions) => void;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<User | null>;
    setProfile: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [bootstrapped, setBootstrapped] = useState(false);
    const [hasToken, setHasToken] = useState(false);

    useEffect(() => {
        setHasToken(Boolean(getAccessToken()));
        setBootstrapped(true);
    }, []);

    const profileQuery = useQuery({
        queryKey: queryKeys.profile,
        queryFn: async () => {
            const res = await authApi.profile();
            saveUser(res.data);
            return res.data;
        },
        enabled: bootstrapped && hasToken,
        initialData: () => (typeof window !== "undefined" ? getStoredUser() ?? undefined : undefined),
        retry: false,
    });

    useEffect(() => {
        if (profileQuery.isError) {
            clearSession();
            setHasToken(false);
            queryClient.setQueryData(queryKeys.profile, null);
        }
    }, [profileQuery.isError, queryClient]);

    const applySession = useCallback(
        (session: AuthSession, options?: LoginOptions) => {
            saveSession(session.accessToken, session.refreshToken, session.user, {
                remember: options?.rememberMe,
            });
            setHasToken(true);
            queryClient.setQueryData(queryKeys.profile, session.user);
        },
        [queryClient],
    );

    const loginMutation = useMutation({
        mutationFn: (payload: { email: string; password: string; rememberMe: boolean }) =>
            authApi.login({ email: payload.email, password: payload.password }).then((res) => ({
                res,
                rememberMe: payload.rememberMe,
            })),
        onSuccess: ({ res, rememberMe }) => {
            applySession(res.data, { rememberMe });
            if (rememberMe) {
                setRememberedEmail(res.data.user.email);
            } else {
                setRememberedEmail(null);
            }
            router.push("/profile");
        },
    });

    const registerMutation = useMutation({
        mutationFn: (payload: { username: string; email: string; password: string }) =>
            authApi.register(payload),
    });

    const logoutMutation = useMutation({
        mutationFn: () => authApi.logout(),
        onSettled: async () => {
            clearSession();
            setHasToken(false);
            queryClient.clear();
            router.push("/login");
        },
    });

    const login = useCallback(
        async (email: string, password: string, options?: LoginOptions) => {
            try {
                await loginMutation.mutateAsync({
                    email,
                    password,
                    rememberMe: options?.rememberMe ?? true,
                });
            } catch (error) {
                throw toApiError(error);
            }
        },
        [loginMutation],
    );

    const register = useCallback(
        async (username: string, email: string, password: string) => {
            try {
                await registerMutation.mutateAsync({ username, email, password });
            } catch (error) {
                throw toApiError(error);
            }
        },
        [registerMutation],
    );

    const loginWithOAuthSession = useCallback(
        (session: AuthSession, options?: LoginOptions) => {
            applySession(session, { rememberMe: options?.rememberMe ?? true });
            router.replace("/profile");
        },
        [applySession, router],
    );

    const loginWithDiscordSession = loginWithOAuthSession;

    const logout = useCallback(async () => {
        await logoutMutation.mutateAsync();
    }, [logoutMutation]);

    const refreshProfile = useCallback(async () => {
        // Always hit the network — fetchQuery alone can return cached data while staleTime is active.
        const res = await authApi.profile();
        saveUser(res.data);
        queryClient.setQueryData(queryKeys.profile, res.data);
        return res.data;
    }, [queryClient]);

    const setProfile = useCallback(
        (next: User) => {
            saveUser(next);
            queryClient.setQueryData(queryKeys.profile, next);
        },
        [queryClient],
    );

    const user = profileQuery.data ?? null;
    const isLoading = !bootstrapped || (hasToken && profileQuery.isLoading && !user);
    const isAdmin = user?.role?.toLowerCase() === "admin";
    const canManage = canAccessAdminArea(user?.role, user?.permissions);
    const hasPermission = useCallback(
        (permission: string) => checkPermission(user?.role, permission, user?.permissions),
        [user?.role, user?.permissions],
    );

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isLoading,
            isAuthenticated: Boolean(user),
            isAdmin,
            canManage,
            hasPermission,
            login,
            register,
            loginWithDiscordSession,
            loginWithOAuthSession,
            logout,
            refreshProfile,
            setProfile,
        }),
        [
            user,
            isLoading,
            isAdmin,
            canManage,
            hasPermission,
            login,
            register,
            loginWithDiscordSession,
            loginWithOAuthSession,
            logout,
            refreshProfile,
            setProfile,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

export function useRequireAuth(options?: { admin?: boolean; permission?: string }) {
    const auth = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (auth.isLoading) return;
        if (!auth.isAuthenticated) {
            router.replace("/login");
            return;
        }
        if (options?.permission && !auth.hasPermission(options.permission)) {
            router.replace("/profile");
            return;
        }
        if (options?.admin && !auth.canManage) {
            router.replace("/profile");
        }
    }, [
        auth.isLoading,
        auth.isAuthenticated,
        auth.canManage,
        auth.hasPermission,
        options?.admin,
        options?.permission,
        router,
    ]);

    return auth;
}
