export type UserRole = string;

export type AuthProvider = "local" | "discord" | "google";

export type BillingPlanCode = "free" | "pro";

export interface User {
    id: string;
    username: string;
    email: string;
    role_id: string;
    role: UserRole;
    permissions?: string[];
    plan_code?: BillingPlanCode | string;
    auth_provider: AuthProvider;
    discord_id?: string;
    google_id?: string;
    email_verified_at?: string | null;
    deleted_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface PermissionItem {
    id: string;
    code: string;
    description: string;
    created_at: string;
}

export interface RoleItem {
    id: string;
    name: string;
    description: string;
    is_system: boolean;
    permissions: string[];
    created_at: string;
    updated_at: string;
}

export interface Device {
    id: string;
    userId: string;
    deviceKey: string;
    name: string;
    userAgent: string;
    ipAddress: string;
    lastSeenAt: string;
    createdAt: string;
}

export interface DevicePayload {
    deviceId: string;
    name: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
}

export interface AuthSession extends AuthTokens {
    user: User;
}

export interface ApiErrorBody {
    status?: string;
    statusCode?: number;
    code?: string;
    message?: string;
    meta?: Record<string, unknown>;
}

export interface PlanEntitlement {
    feature_key: string;
    /** -1 means unlimited. */
    limit_value: number;
}

export interface BillingPlan {
    code: string;
    name: string;
    description: string;
    is_active: boolean;
    entitlements: PlanEntitlement[];
}

export interface UsageItem {
    feature: string;
    usage: number;
    /** -1 means unlimited. */
    limit: number;
}

export interface SubscriptionSnapshot {
    plan_code: string;
    plan_name: string;
    status: string;
    started_at: string;
    entitlements: PlanEntitlement[];
    usage: UsageItem[];
}

export interface BillingLimitMeta {
    feature?: string;
    limit?: number;
    usage?: number;
}

export interface PaginatedUsers {
    data: User[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AdminStats {
    userCount: number;
    apiStatus: string;
    dbStatus: string;
}

export type ExportJobStatus = "pending" | "processing" | "completed" | "failed";

export interface ExportJob {
    id: string;
    user_id: string;
    type: string;
    status: ExportJobStatus;
    file_name?: string | null;
    error_message?: string | null;
    created_at: string;
    started_at?: string | null;
    completed_at?: string | null;
}

export type AppNotificationType = "export_queued" | "export_ready" | "export_failed" | "reminder_due";

export interface AppNotification {
    id: string;
    type: AppNotificationType | string;
    ref_type?: string | null;
    ref_id?: string | null;
    meta: {
        export_type?: string;
        file_name?: string;
        error_message?: string;
        title?: string;
        due_at?: string;
        [key: string]: unknown;
    };
    read_at?: string | null;
    created_at: string;
}

export type GoalStatus = "draft" | "active" | "completed" | "cancelled" | "archived";
export type GoalPriority = "low" | "medium" | "high";

export interface GoalMilestone {
    id: string;
    title: string;
    is_completed: boolean;
    sort_order: number;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Goal {
    id: string;
    title: string;
    description: string;
    status: GoalStatus;
    priority: GoalPriority;
    category: string;
    progress: number;
    target_value?: number | null;
    current_value: number;
    unit: string;
    start_date?: string | null;
    target_date?: string | null;
    completed_at?: string | null;
    archived_at?: string | null;
    created_at: string;
    updated_at: string;
    milestones?: GoalMilestone[];
}

export interface GoalStats {
    total: number;
    draft: number;
    active: number;
    completed: number;
    cancelled: number;
    archived: number;
    overdue: number;
    avg_progress: number;
}

export interface GoalNamedCount {
    key: string;
    label?: string;
    count: number;
}

export interface GoalMonthCount {
    month: string;
    created: number;
    completed: number;
}

export interface GoalProgressBucket {
    bucket: string;
    count: number;
}

export interface GoalDashboard {
    stats: GoalStats;
    by_status: GoalNamedCount[];
    by_priority: GoalNamedCount[];
    by_category: GoalNamedCount[];
    created_trend: GoalMonthCount[];
    progress_buckets: GoalProgressBucket[];
}

export interface GoalCreatePayload {
    title: string;
    description?: string;
    status?: GoalStatus;
    priority?: GoalPriority;
    category?: string;
    progress?: number;
    target_value?: number | null;
    current_value?: number;
    unit?: string;
    start_date?: string | null;
    target_date?: string | null;
}

export interface GoalUpdatePayload {
    title?: string;
    description?: string;
    status?: GoalStatus;
    priority?: GoalPriority;
    category?: string;
    progress?: number;
    target_value?: number | null;
    clear_target_value?: boolean;
    current_value?: number;
    unit?: string;
    start_date?: string | null;
    clear_start_date?: boolean;
    target_date?: string | null;
    clear_target_date?: boolean;
}

export type HabitStatus = "active" | "paused" | "archived";
export type HabitFrequency = "daily" | "weekly";

export interface HabitLog {
    id: string;
    log_date: string;
    count: number;
    note: string;
    created_at: string;
    updated_at: string;
}

export interface Habit {
    id: string;
    title: string;
    description: string;
    status: HabitStatus;
    frequency: HabitFrequency;
    target_count: number;
    category: string;
    color: string;
    current_streak: number;
    best_streak: number;
    completed_today: boolean;
    today_count: number;
    archived_at?: string | null;
    created_at: string;
    updated_at: string;
    logs?: HabitLog[];
}

export interface HabitStats {
    total: number;
    active: number;
    paused: number;
    archived: number;
    completed_today: number;
    pending_today: number;
    avg_streak: number;
    best_streak: number;
}

export interface HabitDayCount {
    date: string;
    count: number;
}

export interface HabitDashboard {
    stats: HabitStats;
    by_status: GoalNamedCount[];
    by_frequency: GoalNamedCount[];
    by_category: GoalNamedCount[];
    checkin_trend: HabitDayCount[];
    streak_buckets: GoalProgressBucket[];
}

export interface HabitCreatePayload {
    title: string;
    description?: string;
    status?: HabitStatus;
    frequency?: HabitFrequency;
    target_count?: number;
    category?: string;
    color?: string;
}

export interface HabitUpdatePayload {
    title?: string;
    description?: string;
    status?: HabitStatus;
    frequency?: HabitFrequency;
    target_count?: number;
    category?: string;
    color?: string;
}

export interface HabitCheckInPayload {
    date?: string;
    count?: number;
    note?: string;
    done?: boolean;
}

export type PlannerStatus = "todo" | "done" | "skipped";
export type PlannerPriority = "low" | "medium" | "high";

export interface PlannerTask {
    id: string;
    plan_date: string;
    title: string;
    notes: string;
    status: PlannerStatus;
    priority: PlannerPriority;
    start_time: string;
    end_time: string;
    sort_order: number;
    completed_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface PlannerDayStats {
    date: string;
    total: number;
    todo: number;
    done: number;
    skipped: number;
    high: number;
    completion: number;
}

export interface PlannerCreatePayload {
    plan_date?: string;
    title: string;
    notes?: string;
    status?: PlannerStatus;
    priority?: PlannerPriority;
    start_time?: string;
    end_time?: string;
}

export interface PlannerUpdatePayload {
    title?: string;
    notes?: string;
    status?: PlannerStatus;
    priority?: PlannerPriority;
    start_time?: string;
    end_time?: string;
    sort_order?: number;
}

export interface LifeAnalyticsOverview {
    goals_total: number;
    goals_active: number;
    goals_completed: number;
    goals_avg_progress: number;
    habits_active: number;
    habits_done_today: number;
    habits_pending_today: number;
    habits_best_streak: number;
    planner_total_today: number;
    planner_done_today: number;
    planner_completion_today: number;
    focus_score: number;
}

export interface LifeDayActivity {
    date: string;
    habits_completed: number;
    planner_done: number;
    planner_total: number;
}

export interface LifeAnalytics {
    overview: LifeAnalyticsOverview;
    weekly_activity: LifeDayActivity[];
    goals_by_status: GoalNamedCount[];
    habits_by_status: GoalNamedCount[];
    planner_trend: HabitDayCount[];
}

export interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    location: string;
    color: string;
    all_day: boolean;
    starts_at: string;
    ends_at: string;
    created_at: string;
    updated_at: string;
}

export interface CalendarStats {
    total: number;
    upcoming: number;
    all_day: number;
}

export interface CalendarCreatePayload {
    title: string;
    description?: string;
    location?: string;
    color?: string;
    all_day?: boolean;
    starts_at: string;
    ends_at?: string;
}

export interface CalendarUpdatePayload {
    title?: string;
    description?: string;
    location?: string;
    color?: string;
    all_day?: boolean;
    starts_at?: string;
    ends_at?: string;
}

export type NoteKind = "note" | "journal";

export interface Note {
    id: string;
    title: string;
    body: string;
    kind: NoteKind;
    mood: string;
    entry_date: string;
    /** Comma-separated tags. */
    tags: string;
    created_at: string;
    updated_at: string;
}

export interface NoteStats {
    total: number;
    notes: number;
    journal: number;
}

export interface NoteCreatePayload {
    title: string;
    body?: string;
    kind?: NoteKind;
    mood?: string;
    entry_date?: string;
    tags?: string;
}

export interface NoteUpdatePayload {
    title?: string;
    body?: string;
    kind?: NoteKind;
    mood?: string;
    entry_date?: string;
    tags?: string;
}

export type FinanceKind = "income" | "expense";

export interface FinanceTransaction {
    id: string;
    kind: FinanceKind;
    amount: number;
    currency: string;
    category: string;
    note: string;
    occurred_on: string;
    created_at: string;
    updated_at: string;
}

export interface FinanceStats {
    income: number;
    expense: number;
    net: number;
    count: number;
}

export interface FinanceCreatePayload {
    kind: FinanceKind;
    amount: number;
    currency?: string;
    category?: string;
    note?: string;
    occurred_on: string;
}

export interface FinanceUpdatePayload {
    kind?: FinanceKind;
    amount?: number;
    currency?: string;
    category?: string;
    note?: string;
    occurred_on?: string;
}

export type ReminderStatus = "pending" | "done" | "dismissed";

export interface Reminder {
    id: string;
    title: string;
    body: string;
    due_at: string;
    status: ReminderStatus;
    notified_at?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ReminderCreatePayload {
    title: string;
    body?: string;
    due_at: string;
}

export interface ReminderUpdatePayload {
    title?: string;
    body?: string;
    due_at?: string;
    status?: ReminderStatus;
}

export interface ReminderCheckResult {
    created: number;
    items: Reminder[];
}
