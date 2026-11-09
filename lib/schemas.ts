import { z } from "zod";

type Translate = (key: string) => string;

function requiredEmail(t: Translate) {
    return z
        .string()
        .trim()
        .min(1, t("validation.required"))
        .pipe(z.email(t("validation.email")));
}

function requiredPassword(t: Translate) {
    return z.string().superRefine((value, ctx) => {
        if (value.length < 1) {
            ctx.addIssue({ code: "custom", message: t("validation.required") });
            return;
        }
        if (value.length < 8) {
            ctx.addIssue({ code: "custom", message: t("validation.passwordMin") });
            return;
        }
        if (value.length > 72) {
            ctx.addIssue({ code: "custom", message: t("validation.passwordMax") });
        }
    });
}

function requiredUsername(t: Translate) {
    return z.string().trim().superRefine((value, ctx) => {
        if (value.length < 1) {
            ctx.addIssue({ code: "custom", message: t("validation.required") });
            return;
        }
        if (value.length < 3) {
            ctx.addIssue({ code: "custom", message: t("validation.usernameMin") });
            return;
        }
        if (value.length > 50) {
            ctx.addIssue({ code: "custom", message: t("validation.usernameMax") });
        }
    });
}

function requiredConfirmPassword(t: Translate) {
    return z.string().min(1, t("validation.confirmPassword"));
}

export function createLoginSchema(t: Translate) {
    return z.object({
        email: requiredEmail(t),
        password: requiredPassword(t),
        rememberMe: z.boolean(),
    });
}

export function createRegisterSchema(t: Translate) {
    return z.object({
        username: requiredUsername(t),
        email: requiredEmail(t),
        password: requiredPassword(t),
    });
}

export function createForgotPasswordSchema(t: Translate) {
    return z.object({
        email: requiredEmail(t),
    });
}

export function createResetPasswordSchema(t: Translate) {
    return z
        .object({
            password: requiredPassword(t),
            confirmPassword: requiredConfirmPassword(t),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: t("validation.passwordMismatch"),
            path: ["confirmPassword"],
        });
}

export function createUpdateUsernameSchema(t: Translate) {
    return z.object({
        username: requiredUsername(t),
    });
}

export function createChangePasswordSchema(t: Translate) {
    return z
        .object({
            currentPassword: requiredPassword(t),
            newPassword: requiredPassword(t),
            confirmPassword: requiredConfirmPassword(t),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
            message: t("validation.passwordMismatch"),
            path: ["confirmPassword"],
        });
}

export const adminSearchSchema = z.object({
    search: z.string().max(255),
});

export function createAdminResetPasswordSchema(t: Translate) {
    return z
        .object({
            password: requiredPassword(t),
            confirmPassword: requiredConfirmPassword(t),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: t("validation.passwordMismatch"),
            path: ["confirmPassword"],
        });
}

export function createAdminUserSchema(t: Translate) {
    return z.object({
        username: requiredUsername(t),
        email: requiredEmail(t),
        role_id: z.string().uuid(t("validation.required")),
    });
}

export function createAdminRoleSchema(t: Translate) {
    return z.object({
        name: z
            .string()
            .min(2, t("validation.required"))
            .max(50)
            .regex(/^[a-z][a-z0-9_]*$/, t("validation.roleName")),
        description: z.string().max(255),
        permissions: z.array(z.string()),
    });
}

export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;
export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;
export type ForgotPasswordInput = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
export type ResetPasswordInput = z.infer<ReturnType<typeof createResetPasswordSchema>>;
export type UpdateUsernameInput = z.infer<ReturnType<typeof createUpdateUsernameSchema>>;
export type ChangePasswordInput = z.infer<ReturnType<typeof createChangePasswordSchema>>;
export type AdminSearchInput = z.infer<typeof adminSearchSchema>;
export type AdminResetPasswordInput = z.infer<ReturnType<typeof createAdminResetPasswordSchema>>;
export type AdminUserInput = z.infer<ReturnType<typeof createAdminUserSchema>>;
export type AdminRoleInput = z.infer<ReturnType<typeof createAdminRoleSchema>>;

export function createGoalSchema(t: Translate) {
    return z.object({
        title: z.string().trim().min(1, t("validation.required")).max(200),
        description: z.string().max(5000),
        status: z.enum(["draft", "active", "completed", "cancelled", "archived"]),
        priority: z.enum(["low", "medium", "high"]),
        category: z.string().max(100),
        progress: z.number().min(0).max(100),
        target_value: z.string(),
        current_value: z.string(),
        unit: z.string().max(50),
        start_date: z.string(),
        target_date: z.string(),
    });
}

export type GoalFormInput = z.infer<ReturnType<typeof createGoalSchema>>;

export function createMilestoneSchema(t: Translate) {
    return z.object({
        title: z.string().trim().min(1, t("validation.required")).max(200),
    });
}

export type MilestoneFormInput = z.infer<ReturnType<typeof createMilestoneSchema>>;

export function createHabitSchema(t: Translate) {
    return z.object({
        title: z.string().trim().min(1, t("validation.required")).max(200),
        description: z.string().max(5000),
        status: z.enum(["active", "paused", "archived"]),
        frequency: z.enum(["daily", "weekly"]),
        target_count: z.number().min(1).max(100),
        category: z.string().max(100),
        color: z.string().max(30),
    });
}

export type HabitFormInput = z.infer<ReturnType<typeof createHabitSchema>>;

export function createPlannerSchema(t: Translate) {
    return z.object({
        title: z.string().trim().min(1, t("validation.required")).max(200),
        notes: z.string().max(5000),
        status: z.enum(["todo", "done", "skipped"]),
        priority: z.enum(["low", "medium", "high"]),
        start_time: z.string().max(5),
        end_time: z.string().max(5),
    });
}

export type PlannerFormInput = z.infer<ReturnType<typeof createPlannerSchema>>;

export function createCalendarSchema(t: Translate) {
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    return z
        .object({
            title: z.string().trim().min(1, t("validation.required")).max(200),
            description: z.string().max(5000),
            location: z.string().max(200),
            color: z.string().max(30),
            all_day: z.boolean(),
            start_date: z.string().min(1, t("validation.required")),
            start_time: z.string().max(5),
            end_date: z.string(),
            end_time: z.string().max(5),
        })
        .superRefine((data, ctx) => {
            if (!data.all_day) {
                if (!timeRe.test(data.start_time)) {
                    ctx.addIssue({ code: "custom", path: ["start_time"], message: t("validation.time") });
                }
                if (data.end_time && !timeRe.test(data.end_time)) {
                    ctx.addIssue({ code: "custom", path: ["end_time"], message: t("validation.time") });
                }
            }
            const endDate = data.end_date || data.start_date;
            const startTime = data.all_day ? "00:00" : data.start_time;
            const endTime = data.all_day ? "23:59" : data.end_time || data.start_time;
            if (timeRe.test(startTime) && timeRe.test(endTime) && data.start_date) {
                const start = new Date(`${data.start_date}T${startTime}:00`).getTime();
                const end = new Date(`${endDate}T${endTime}:00`).getTime();
                if (end < start) {
                    ctx.addIssue({ code: "custom", path: ["end_date"], message: t("validation.endBeforeStart") });
                }
            }
        });
}

export type CalendarFormInput = z.infer<ReturnType<typeof createCalendarSchema>>;

export function createNoteSchema(t: Translate) {
    return z.object({
        title: z.string().trim().min(1, t("validation.required")).max(200),
        body: z.string().max(20000),
        kind: z.enum(["note", "journal"]),
        mood: z.string().max(50),
        entry_date: z.string().min(1, t("validation.required")),
        tags: z.string().max(500),
    });
}

export type NoteFormInput = z.infer<ReturnType<typeof createNoteSchema>>;

export function createFinanceSchema(t: Translate) {
    return z.object({
        kind: z.enum(["income", "expense"]),
        amount: z
            .string()
            .trim()
            .min(1, t("validation.required"))
            .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, t("validation.amount")),
        currency: z.string().trim().min(1, t("validation.required")).max(10),
        category: z.string().max(100),
        note: z.string().max(1000),
        occurred_on: z.string().min(1, t("validation.required")),
    });
}

export type FinanceFormInput = z.infer<ReturnType<typeof createFinanceSchema>>;

export function createReminderSchema(t: Translate) {
    return z.object({
        title: z.string().trim().min(1, t("validation.required")).max(200),
        body: z.string().max(5000),
        due_date: z.string().min(1, t("validation.required")),
        due_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, t("validation.time")),
    });
}

export type ReminderFormInput = z.infer<ReturnType<typeof createReminderSchema>>;
