import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getDevicePayload } from "@/lib/device";
import { notify, notifyBillingLimit } from "@/lib/notify";
import {
    clearSession,
    getAccessToken,
    getRefreshToken,
    saveSession,
} from "@/lib/token-storage";
import type { ApiErrorBody } from "@/lib/types";

declare module "axios" {
    export interface AxiosRequestConfig {
        /** Skip global backend-error toast for this request. */
        skipErrorToast?: boolean;
    }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/go-api";

export class ApiError extends Error {
    status: number;
    code?: string;
    meta?: Record<string, unknown>;

    constructor(status: number, message: string, code?: string, meta?: Record<string, unknown>) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.meta = meta;
    }
}

function readLocaleCookie(): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
    const value = match?.[1] ? decodeURIComponent(match[1]) : null;
    return value === "en" || value === "th" ? value : null;
}

export function getLocale(explicit?: string) {
    if (explicit) return explicit;
    const fromCookie = readLocaleCookie();
    if (fromCookie) return fromCookie;
    if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("th")) {
        return "th";
    }
    return "en";
}

export function toApiError(error: unknown, unreachableMessage?: string): ApiError {
    if (error instanceof ApiError) return error;

    if (axios.isAxiosError(error)) {
        const ax = error as AxiosError<ApiErrorBody>;
        if (!ax.response) {
            return new ApiError(0, unreachableMessage || "Cannot reach API. Is the Go backend running on :8080?");
        }
        const body = ax.response.data;
        return new ApiError(
            ax.response.status,
            body?.message || ax.message || "Request failed",
            body?.code,
            body?.meta && typeof body.meta === "object" ? body.meta : undefined,
        );
    }

    if (error instanceof Error) {
        return new ApiError(0, error.message);
    }

    return new ApiError(0, "Unexpected error");
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
        const { data } = await axios.post<{
            data: { accessToken: string; refreshToken: string };
        }>(
            `${API_BASE}/api/auth/refresh`,
            { refreshToken, device: getDevicePayload() },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept-Language": getLocale(),
                },
            },
        );
        saveSession(data.data.accessToken, data.data.refreshToken);
        return data.data.accessToken;
    } catch {
        clearSession();
        return null;
    }
}

function ensureFreshToken() {
    if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
}

export const http: AxiosInstance = axios.create({
    baseURL: API_BASE,
    headers: {
        "Content-Type": "application/json",
    },
});

http.interceptors.request.use((config) => {
    config.headers["Accept-Language"] = config.headers["Accept-Language"] || getLocale();

    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

function shouldSkipErrorToast(config?: RetryConfig) {
    if (!config || config.skipErrorToast) return true;

    const url = config.url ?? "";
    return (
        url.includes("/api/auth/login")
        || url.includes("/api/auth/register")
        || url.includes("/api/auth/refresh")
        || url.includes("/api/auth/forgot-password")
        || url.includes("/api/auth/reset-password")
        || url.includes("/api/auth/verify-email")
        || url.includes("/api/auth/resend-verification")
        || url.includes("/api/auth/discord")
        || url.includes("/api/auth/google")
    );
}

http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryConfig | undefined;

        if (error.response?.status === 401 && config && !config._retry) {
            const isAuthRoute =
                config.url?.includes("/api/auth/login")
                || config.url?.includes("/api/auth/register")
                || config.url?.includes("/api/auth/refresh")
                || config.url?.includes("/api/auth/forgot-password")
                || config.url?.includes("/api/auth/reset-password")
                || config.url?.includes("/api/auth/verify-email")
                || config.url?.includes("/api/auth/resend-verification")
                || config.url?.includes("/api/auth/discord")
                || config.url?.includes("/api/auth/google");

            if (!isAuthRoute && getRefreshToken()) {
                config._retry = true;
                const accessToken = await ensureFreshToken();
                if (accessToken) {
                    config.headers.Authorization = `Bearer ${accessToken}`;
                    return http(config);
                }
            }
        }

        const apiError = toApiError(error);
        if (!shouldSkipErrorToast(config)) {
            if (apiError.code === "billing.limit_reached") {
                notifyBillingLimit(apiError, getLocale());
            } else {
                notify.error(apiError.message);
            }
        }

        return Promise.reject(apiError);
    },
);
