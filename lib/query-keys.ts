export const queryKeys = {
    profile: ["profile"] as const,
    devices: ["devices"] as const,
    notifications: ["notifications"] as const,
    notificationsUnread: ["notifications", "unread"] as const,
    billingPlans: ["billing", "plans"] as const,
    billingSubscription: ["billing", "subscription"] as const,
    adminStats: ["admin", "stats"] as const,
    adminUsers: (params: {
        page: number;
        limit: number;
        search: string;
        role: string;
        auth_provider: string;
        deleted_status: string;
        created_from: string;
        created_to: string;
        updated_from: string;
        updated_to: string;
        sort_by: string;
        sort_dir: string;
    }) => ["admin", "users", params] as const,
    adminRoles: ["admin", "roles"] as const,
    adminPermissions: ["admin", "permissions"] as const,
    goals: (params: { page: number; limit: number; status: string; priority: string; category: string; q: string }) =>
        ["lifeos", "goals", params] as const,
    goalsStats: ["lifeos", "goals", "stats"] as const,
    goalsDashboard: ["lifeos", "dashboard"] as const,
    goal: (id: string) => ["lifeos", "goals", id] as const,
    habits: (params: { page: number; limit: number; status: string; category: string; q: string }) =>
        ["lifeos", "habits", params] as const,
    habitsStats: ["lifeos", "habits", "stats"] as const,
    habitsDashboard: ["lifeos", "habits", "dashboard"] as const,
    habit: (id: string) => ["lifeos", "habits", id] as const,
    planner: (date: string) => ["lifeos", "planner", date] as const,
    plannerStats: (date: string) => ["lifeos", "planner", "stats", date] as const,
    calendar: (from: string, to: string) => ["lifeos", "calendar", from, to] as const,
    calendarAll: ["lifeos", "calendar"] as const,
    calendarStats: (from: string, to: string) => ["lifeos", "calendar", "stats", from, to] as const,
    notes: (params: { page: number; limit: number; kind: string; q: string }) =>
        ["lifeos", "notes", params] as const,
    notesAll: ["lifeos", "notes"] as const,
    notesStats: ["lifeos", "notes", "stats"] as const,
    finance: (params: { page: number; limit: number; kind: string; category: string; from: string; to: string }) =>
        ["lifeos", "finance", params] as const,
    financeAll: ["lifeos", "finance"] as const,
    financeStats: (from: string, to: string) => ["lifeos", "finance", "stats", from, to] as const,
    reminders: (status: string) => ["lifeos", "reminders", status] as const,
    remindersAll: ["lifeos", "reminders"] as const,
    lifeAnalytics: ["lifeos", "analytics"] as const,
};
