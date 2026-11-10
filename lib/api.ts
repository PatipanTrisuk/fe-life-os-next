import { getDevicePayload } from "@/lib/device";
import { ApiError, getLocale, http, toApiError } from "@/lib/http";
import { getRefreshToken } from "@/lib/token-storage";
import type {
    AdminStats,
    AppNotification,
    AuthSession,
    BillingPlan,
    BillingPlanCode,
    SubscriptionSnapshot,
    CalendarCreatePayload,
    CalendarEvent,
    CalendarStats,
    CalendarUpdatePayload,
    Device,
    ExportJob,
    FinanceCreatePayload,
    FinanceStats,
    FinanceTransaction,
    FinanceUpdatePayload,
    Goal,
    GoalCreatePayload,
    GoalDashboard,
    GoalStats,
    GoalUpdatePayload,
    Habit,
    HabitCheckInPayload,
    HabitCreatePayload,
    HabitDashboard,
    HabitStats,
    HabitUpdatePayload,
    HabitLog,
    LifeAnalytics,
    Note,
    NoteCreatePayload,
    NoteStats,
    NoteUpdatePayload,
    PaginatedUsers,
    PlannerCreatePayload,
    PlannerDayStats,
    PlannerTask,
    PlannerUpdatePayload,
    PermissionItem,
    Reminder,
    ReminderCheckResult,
    ReminderCreatePayload,
    ReminderUpdatePayload,
    RoleItem,
    User,
} from "@/lib/types";

export { ApiError, toApiError };

export const authApi = {
    async register(payload: { username: string; email: string; password: string }) {
        const { data } = await http.post<{ status: string; message: string; user: User }>(
            "/api/auth/register",
            payload,
        );
        return data;
    },

    async login(payload: { email: string; password: string }) {
        const { data } = await http.post<{ status: string; message: string; data: AuthSession }>(
            "/api/auth/login",
            { ...payload, device: getDevicePayload() },
        );
        return data;
    },

    async discord(payload: { code: string; redirectUri: string }) {
        const { data } = await http.post<{ status: string; data: AuthSession }>("/api/auth/discord", {
            ...payload,
            device: getDevicePayload(),
        });
        return data;
    },

    async google(payload: { code: string; redirectUri: string }) {
        const { data } = await http.post<{ status: string; data: AuthSession }>("/api/auth/google", {
            ...payload,
            device: getDevicePayload(),
        });
        return data;
    },

    async forgotPassword(email: string, locale?: string) {
        const { data } = await http.post<{ status: string; message: string }>(
            "/api/auth/forgot-password",
            { email },
            { headers: { "Accept-Language": getLocale(locale) } },
        );
        return data;
    },

    async resetPassword(payload: { token: string; password: string }, locale?: string) {
        const { data } = await http.post<{ status: string; message: string }>(
            "/api/auth/reset-password",
            payload,
            { headers: { "Accept-Language": getLocale(locale) } },
        );
        return data;
    },

    async verifyEmail(token: string, locale?: string) {
        const { data } = await http.post<{ status: string; message: string }>(
            "/api/auth/verify-email",
            { token },
            { headers: { "Accept-Language": getLocale(locale) } },
        );
        return data;
    },

    async resendVerification(email: string, locale?: string) {
        const { data } = await http.post<{ status: string; message: string }>(
            "/api/auth/resend-verification",
            { email },
            { headers: { "Accept-Language": getLocale(locale) } },
        );
        return data;
    },

    async logout() {
        const refreshToken = getRefreshToken();
        if (!refreshToken) return { message: "Logout successful" };
        const { data } = await http.post<{ message: string }>("/api/auth/logout", { refreshToken });
        return data;
    },

    async profile() {
        const { data } = await http.get<{ status: string; data: User }>("/api/users/profile");
        return data;
    },

    async updateProfile(payload: { username: string }) {
        const { data } = await http.patch<{ status: string; message: string; data: User }>(
            "/api/users/profile",
            payload,
        );
        return data;
    },

    async changePassword(payload: { currentPassword: string; newPassword: string }) {
        const { data } = await http.post<{ status: string; message: string }>(
            "/api/users/change-password",
            payload,
        );
        return data;
    },

    async devices() {
        const { data } = await http.get<{ status: string; data: Device[] }>("/api/users/devices");
        return data;
    },

    async revokeDevice(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/users/devices/${id}`);
        return data;
    },

    async revokeAllSessions() {
        const { data } = await http.post<{ status: string; message: string }>("/api/users/sessions/revoke-all");
        return data;
    },

    async notifications() {
        const { data } = await http.get<{
            status: string;
            data: AppNotification[];
            meta: { unread_count: number };
        }>("/api/users/notifications");
        return data;
    },

    async notificationsUnreadCount() {
        const { data } = await http.get<{ status: string; data: { unread_count: number } }>(
            "/api/users/notifications/unread-count",
        );
        return data;
    },

    async markNotificationRead(id: string) {
        const { data } = await http.post<{ status: string; message: string }>(
            `/api/users/notifications/${id}/read`,
        );
        return data;
    },

    async markAllNotificationsRead() {
        const { data } = await http.post<{ status: string; message: string }>(
            "/api/users/notifications/read-all",
        );
        return data;
    },
};

export const billingApi = {
    async plans() {
        const { data } = await http.get<{ status: string; data: BillingPlan[] }>("/api/billing/plans");
        return data;
    },

    async subscription() {
        const { data } = await http.get<{ status: string; data: SubscriptionSnapshot }>(
            "/api/billing/subscription",
        );
        return data;
    },

    async upgrade() {
        const { data } = await http.post<{ status: string; message?: string; data: SubscriptionSnapshot }>(
            "/api/billing/upgrade",
        );
        return data;
    },

    async downgrade() {
        const { data } = await http.post<{ status: string; message?: string; data: SubscriptionSnapshot }>(
            "/api/billing/downgrade",
        );
        return data;
    },
};

export const adminApi = {
    async updateUserSubscription(id: string, payload: { plan_code: BillingPlanCode }) {
        const { data } = await http.patch<{ status: string; message?: string; data: SubscriptionSnapshot }>(
            `/api/admin/users/${id}/subscription`,
            payload,
        );
        return data;
    },

    async users(
        params: {
            page?: number;
            limit?: number;
            search?: string;
            role?: string;
            auth_provider?: string;
            deleted_status?: string;
            created_from?: string;
            created_to?: string;
            updated_from?: string;
            updated_to?: string;
            sort_by?: string;
            sort_dir?: string;
        } = {},
    ) {
        const { data } = await http.get<{ status: string } & PaginatedUsers>("/api/admin/users", {
            params: {
                page: params.page,
                limit: params.limit,
                search: params.search || undefined,
                role: params.role || undefined,
                auth_provider: params.auth_provider || undefined,
                deleted_status: params.deleted_status || undefined,
                created_from: params.created_from || undefined,
                created_to: params.created_to || undefined,
                updated_from: params.updated_from || undefined,
                updated_to: params.updated_to || undefined,
                sort_by: params.sort_by || undefined,
                sort_dir: params.sort_dir || undefined,
            },
        });
        return data;
    },

    async exportUsers(
        params: {
            search?: string;
            role?: string;
            auth_provider?: string;
            deleted_status?: string;
            created_from?: string;
            created_to?: string;
            updated_from?: string;
            updated_to?: string;
            sort_by?: string;
            sort_dir?: string;
        } = {},
    ) {
        const { data } = await http.post<{ status: string; message: string; data: ExportJob }>(
            "/api/admin/users/export",
            {
                search: params.search || undefined,
                role: params.role || undefined,
                auth_provider: params.auth_provider || undefined,
                deleted_status: params.deleted_status || undefined,
                created_from: params.created_from || undefined,
                created_to: params.created_to || undefined,
                updated_from: params.updated_from || undefined,
                updated_to: params.updated_to || undefined,
                sort_by: params.sort_by || undefined,
                sort_dir: params.sort_dir || undefined,
            },
        );
        return data;
    },

    async getExportJob(id: string) {
        const { data } = await http.get<{ status: string; data: ExportJob }>(`/api/admin/users/export/jobs/${id}`);
        return data;
    },

    async downloadExportJob(id: string) {
        const { data } = await http.get<Blob>(`/api/admin/users/export/jobs/${id}/download`, {
            responseType: "blob",
        });
        return data;
    },

    async stats() {
        const { data } = await http.get<{ status: string; data: AdminStats }>("/api/admin/stats");
        return data;
    },

    async createUser(payload: { username: string; email: string; role_id?: string }) {
        const { data } = await http.post<{ status: string; message: string; data: User }>("/api/admin/users", {
            username: payload.username,
            email: payload.email,
            ...(payload.role_id ? { role_id: payload.role_id } : {}),
        });
        return data;
    },

    async updateUser(id: string, payload: { username: string; email: string; role_id: string }) {
        const { data } = await http.patch<{ status: string; message: string; data: User }>(
            `/api/admin/users/${id}`,
            payload,
        );
        return data;
    },

    async deleteUser(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/admin/users/${id}`);
        return data;
    },

    async restoreUser(id: string) {
        const { data } = await http.post<{ status: string; message: string; data: User }>(
            `/api/admin/users/${id}/restore`,
        );
        return data;
    },

    async kickUser(id: string) {
        const { data } = await http.post<{ status: string; message: string }>(`/api/admin/users/${id}/kick`);
        return data;
    },

    async resetPassword(id: string, password: string) {
        const { data } = await http.post<{ status: string; message: string }>(`/api/admin/users/${id}/reset-password`, {
            password,
        });
        return data;
    },

    async sendResetPassword(id: string) {
        const { data } = await http.post<{ status: string; message: string }>(
            `/api/admin/users/${id}/send-reset-password`,
        );
        return data;
    },

    async verifyEmail(id: string) {
        const { data } = await http.post<{ status: string; message: string; data: User }>(
            `/api/admin/users/${id}/verify-email`,
        );
        return data;
    },

    async permissions() {
        const { data } = await http.get<{ status: string; data: PermissionItem[] }>("/api/admin/permissions");
        return data;
    },

    async roles() {
        const { data } = await http.get<{ status: string; data: RoleItem[] }>("/api/admin/roles");
        return data;
    },

    async getRole(id: string) {
        const { data } = await http.get<{ status: string; data: RoleItem }>(`/api/admin/roles/${id}`);
        return data;
    },

    async createRole(payload: { name: string; description?: string; permissions: string[] }) {
        const { data } = await http.post<{ status: string; message: string; data: RoleItem }>(
            "/api/admin/roles",
            payload,
        );
        return data;
    },

    async updateRole(id: string, payload: { name?: string; description?: string; permissions: string[] }) {
        const { data } = await http.patch<{ status: string; message: string; data: RoleItem }>(
            `/api/admin/roles/${id}`,
            payload,
        );
        return data;
    },

    async deleteRole(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/admin/roles/${id}`);
        return data;
    },
};

export const lifeosApi = {
    async dashboard() {
        const { data } = await http.get<{ status: string; data: GoalDashboard }>("/api/lifeos/dashboard");
        return data;
    },

    async exportDashboardPdf(type: "goals" | "habits" = "goals") {
        const path =
            type === "habits" ? "/api/lifeos/habits/dashboard/export.pdf" : "/api/lifeos/dashboard/export.pdf";
        const { data, headers } = await http.get<Blob>(path, {
            responseType: "blob",
            skipErrorToast: true,
        });
        const contentType = String(headers["content-type"] || data.type || "");
        if (contentType.includes("application/json")) {
            const text = await data.text();
            let message = "Could not export PDF";
            try {
                const parsed = JSON.parse(text) as { message?: string };
                if (parsed.message) message = parsed.message;
            } catch {
                /* ignore */
            }
            throw new ApiError(400, message);
        }
        const disposition = String(headers["content-disposition"] || "");
        const match = disposition.match(/filename="?([^"]+)"?/i);
        const fallback =
            type === "habits"
                ? `habits-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`
                : `goals-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`;
        return {
            blob: data,
            fileName: match?.[1] || fallback,
        };
    },

    async listGoals(
        params: {
            page?: number;
            limit?: number;
            status?: string;
            priority?: string;
            category?: string;
            q?: string;
        } = {},
    ) {
        const { data } = await http.get<{
            status: string;
            data: Goal[];
            meta: { page: number; limit: number; total: number };
        }>("/api/lifeos/goals", {
            params: {
                page: params.page,
                limit: params.limit,
                status: params.status || undefined,
                priority: params.priority || undefined,
                category: params.category || undefined,
                q: params.q || undefined,
            },
        });
        return data;
    },

    async goalStats() {
        const { data } = await http.get<{ status: string; data: GoalStats }>("/api/lifeos/goals/stats");
        return data;
    },

    async getGoal(id: string) {
        const { data } = await http.get<{ status: string; data: Goal }>(`/api/lifeos/goals/${id}`);
        return data;
    },

    async createGoal(payload: GoalCreatePayload) {
        const { data } = await http.post<{ status: string; message: string; data: Goal }>(
            "/api/lifeos/goals",
            payload,
        );
        return data;
    },

    async updateGoal(id: string, payload: GoalUpdatePayload) {
        const { data } = await http.patch<{ status: string; message: string; data: Goal }>(
            `/api/lifeos/goals/${id}`,
            payload,
        );
        return data;
    },

    async deleteGoal(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/lifeos/goals/${id}`);
        return data;
    },

    async addMilestone(goalId: string, payload: { title: string; sort_order?: number }) {
        const { data } = await http.post<{ status: string; message: string; data: Goal }>(
            `/api/lifeos/goals/${goalId}/milestones`,
            payload,
        );
        return data;
    },

    async updateMilestone(
        goalId: string,
        milestoneId: string,
        payload: { title?: string; is_completed?: boolean; sort_order?: number },
    ) {
        const { data } = await http.patch<{ status: string; message: string; data: Goal }>(
            `/api/lifeos/goals/${goalId}/milestones/${milestoneId}`,
            payload,
        );
        return data;
    },

    async deleteMilestone(goalId: string, milestoneId: string) {
        const { data } = await http.delete<{ status: string; message: string; data: Goal }>(
            `/api/lifeos/goals/${goalId}/milestones/${milestoneId}`,
        );
        return data;
    },

    async listHabits(
        params: {
            page?: number;
            limit?: number;
            status?: string;
            category?: string;
            q?: string;
        } = {},
    ) {
        const { data } = await http.get<{
            status: string;
            data: Habit[];
            meta: { page: number; limit: number; total: number };
        }>("/api/lifeos/habits", {
            params: {
                page: params.page,
                limit: params.limit,
                status: params.status || undefined,
                category: params.category || undefined,
                q: params.q || undefined,
            },
        });
        return data;
    },

    async habitStats() {
        const { data } = await http.get<{ status: string; data: HabitStats }>("/api/lifeos/habits/stats");
        return data;
    },

    async habitsDashboard() {
        const { data } = await http.get<{ status: string; data: HabitDashboard }>("/api/lifeos/habits/dashboard");
        return data;
    },

    async getHabit(id: string) {
        const { data } = await http.get<{ status: string; data: Habit }>(`/api/lifeos/habits/${id}`);
        return data;
    },

    async createHabit(payload: HabitCreatePayload) {
        const { data } = await http.post<{ status: string; message: string; data: Habit }>(
            "/api/lifeos/habits",
            payload,
        );
        return data;
    },

    async updateHabit(id: string, payload: HabitUpdatePayload) {
        const { data } = await http.patch<{ status: string; message: string; data: Habit }>(
            `/api/lifeos/habits/${id}`,
            payload,
        );
        return data;
    },

    async deleteHabit(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/lifeos/habits/${id}`);
        return data;
    },

    async checkInHabit(id: string, payload: HabitCheckInPayload = {}) {
        const { data } = await http.post<{ status: string; message: string; data: Habit }>(
            `/api/lifeos/habits/${id}/checkin`,
            payload,
        );
        return data;
    },

    async habitLogs(id: string, params: { from?: string; to?: string } = {}) {
        const { data } = await http.get<{ status: string; data: HabitLog[] }>(`/api/lifeos/habits/${id}/logs`, {
            params: {
                from: params.from || undefined,
                to: params.to || undefined,
            },
        });
        return data;
    },

    async listPlanner(date?: string) {
        const { data } = await http.get<{ status: string; data: PlannerTask[] }>("/api/lifeos/planner", {
            params: { date: date || undefined },
        });
        return data;
    },

    async plannerStats(date?: string) {
        const { data } = await http.get<{ status: string; data: PlannerDayStats }>("/api/lifeos/planner/stats", {
            params: { date: date || undefined },
        });
        return data;
    },

    async createPlannerTask(payload: PlannerCreatePayload) {
        const { data } = await http.post<{ status: string; message: string; data: PlannerTask }>(
            "/api/lifeos/planner",
            payload,
        );
        return data;
    },

    async updatePlannerTask(id: string, payload: PlannerUpdatePayload) {
        const { data } = await http.patch<{ status: string; message: string; data: PlannerTask }>(
            `/api/lifeos/planner/${id}`,
            payload,
        );
        return data;
    },

    async togglePlannerTask(id: string) {
        const { data } = await http.post<{ status: string; message: string; data: PlannerTask }>(
            `/api/lifeos/planner/${id}/toggle`,
        );
        return data;
    },

    async deletePlannerTask(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/lifeos/planner/${id}`);
        return data;
    },

    async lifeAnalytics() {
        const { data } = await http.get<{ status: string; data: LifeAnalytics }>("/api/lifeos/analytics");
        return data;
    },

    // Calendar
    async listCalendar(params: { from?: string; to?: string } = {}) {
        const { data } = await http.get<{ status: string; data: CalendarEvent[] }>("/api/lifeos/calendar", {
            params: { from: params.from || undefined, to: params.to || undefined },
        });
        return data;
    },

    async calendarStats(params: { from?: string; to?: string } = {}) {
        const { data } = await http.get<{ status: string; data: CalendarStats }>("/api/lifeos/calendar/stats", {
            params: { from: params.from || undefined, to: params.to || undefined },
        });
        return data;
    },

    async getCalendarEvent(id: string) {
        const { data } = await http.get<{ status: string; data: CalendarEvent }>(`/api/lifeos/calendar/${id}`);
        return data;
    },

    async createCalendarEvent(payload: CalendarCreatePayload) {
        const { data } = await http.post<{ status: string; message: string; data: CalendarEvent }>(
            "/api/lifeos/calendar",
            payload,
        );
        return data;
    },

    async updateCalendarEvent(id: string, payload: CalendarUpdatePayload) {
        const { data } = await http.patch<{ status: string; message: string; data: CalendarEvent }>(
            `/api/lifeos/calendar/${id}`,
            payload,
        );
        return data;
    },

    async deleteCalendarEvent(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/lifeos/calendar/${id}`);
        return data;
    },

    // Notes
    async listNotes(params: { page?: number; limit?: number; kind?: string; q?: string } = {}) {
        const { data } = await http.get<{
            status: string;
            data: Note[];
            meta: { page: number; limit: number; total: number };
        }>("/api/lifeos/notes", {
            params: {
                page: params.page,
                limit: params.limit,
                kind: params.kind || undefined,
                q: params.q || undefined,
            },
        });
        return data;
    },

    async noteStats() {
        const { data } = await http.get<{ status: string; data: NoteStats }>("/api/lifeos/notes/stats");
        return data;
    },

    async getNote(id: string) {
        const { data } = await http.get<{ status: string; data: Note }>(`/api/lifeos/notes/${id}`);
        return data;
    },

    async createNote(payload: NoteCreatePayload) {
        const { data } = await http.post<{ status: string; message: string; data: Note }>(
            "/api/lifeos/notes",
            payload,
        );
        return data;
    },

    async updateNote(id: string, payload: NoteUpdatePayload) {
        const { data } = await http.patch<{ status: string; message: string; data: Note }>(
            `/api/lifeos/notes/${id}`,
            payload,
        );
        return data;
    },

    async deleteNote(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/lifeos/notes/${id}`);
        return data;
    },

    // Finance
    async listFinance(
        params: {
            page?: number;
            limit?: number;
            kind?: string;
            category?: string;
            from?: string;
            to?: string;
        } = {},
    ) {
        const { data } = await http.get<{
            status: string;
            data: FinanceTransaction[];
            meta: { page: number; limit: number; total: number };
        }>("/api/lifeos/finance", {
            params: {
                page: params.page,
                limit: params.limit,
                kind: params.kind || undefined,
                category: params.category || undefined,
                from: params.from || undefined,
                to: params.to || undefined,
            },
        });
        return data;
    },

    async financeStats(params: { from?: string; to?: string } = {}) {
        const { data } = await http.get<{ status: string; data: FinanceStats }>("/api/lifeos/finance/stats", {
            params: { from: params.from || undefined, to: params.to || undefined },
        });
        return data;
    },

    async getFinance(id: string) {
        const { data } = await http.get<{ status: string; data: FinanceTransaction }>(`/api/lifeos/finance/${id}`);
        return data;
    },

    async createFinance(payload: FinanceCreatePayload) {
        const { data } = await http.post<{ status: string; message: string; data: FinanceTransaction }>(
            "/api/lifeos/finance",
            payload,
        );
        return data;
    },

    async updateFinance(id: string, payload: FinanceUpdatePayload) {
        const { data } = await http.patch<{ status: string; message: string; data: FinanceTransaction }>(
            `/api/lifeos/finance/${id}`,
            payload,
        );
        return data;
    },

    async deleteFinance(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/lifeos/finance/${id}`);
        return data;
    },

    // Reminders
    async listReminders(status?: string) {
        const { data } = await http.get<{ status: string; data: Reminder[] }>("/api/lifeos/reminders", {
            params: { status: status || undefined },
        });
        return data;
    },

    async getReminder(id: string) {
        const { data } = await http.get<{ status: string; data: Reminder }>(`/api/lifeos/reminders/${id}`);
        return data;
    },

    async createReminder(payload: ReminderCreatePayload) {
        const { data } = await http.post<{ status: string; message: string; data: Reminder }>(
            "/api/lifeos/reminders",
            payload,
        );
        return data;
    },

    async updateReminder(id: string, payload: ReminderUpdatePayload) {
        const { data } = await http.patch<{ status: string; message: string; data: Reminder }>(
            `/api/lifeos/reminders/${id}`,
            payload,
        );
        return data;
    },

    async markReminderDone(id: string) {
        const { data } = await http.post<{ status: string; message: string; data: Reminder }>(
            `/api/lifeos/reminders/${id}/done`,
        );
        return data;
    },

    async deleteReminder(id: string) {
        const { data } = await http.delete<{ status: string; message: string }>(`/api/lifeos/reminders/${id}`);
        return data;
    },

    async checkReminders() {
        const { data } = await http.post<{ status: string; message?: string; data: ReminderCheckResult }>(
            "/api/lifeos/reminders/check",
        );
        return data;
    },
};

export function getDiscordRedirectUri() {
    if (typeof window === "undefined") {
        return process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ?? "http://localhost:3000/api/auth/discord/callback";
    }
    return `${window.location.origin}/api/auth/discord/callback`;
}

export function getDiscordAuthorizeUrl() {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    if (!clientId) return null;
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: getDiscordRedirectUri(),
        scope: "identify email",
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export function getGoogleRedirectUri() {
    if (typeof window === "undefined") {
        return process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback";
    }
    return `${window.location.origin}/api/auth/google/callback`;
}

export function getGoogleAuthorizeUrl() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return null;
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: getGoogleRedirectUri(),
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
