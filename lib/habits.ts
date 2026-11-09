import type { Habit, HabitCreatePayload, HabitFrequency, HabitStatus, HabitUpdatePayload } from "@/lib/types";
import type { HabitFormInput } from "@/lib/schemas";

export const HABIT_STATUSES: HabitStatus[] = ["active", "paused", "archived"];
export const HABIT_FREQUENCIES: HabitFrequency[] = ["daily", "weekly"];

export function emptyHabitForm(): HabitFormInput {
    return {
        title: "",
        description: "",
        status: "active",
        frequency: "daily",
        target_count: 1,
        category: "",
        color: "",
    };
}

export function habitToForm(habit: Habit): HabitFormInput {
    return {
        title: habit.title,
        description: habit.description ?? "",
        status: habit.status,
        frequency: habit.frequency,
        target_count: habit.target_count || 1,
        category: habit.category ?? "",
        color: habit.color ?? "",
    };
}

export function formToCreateHabitPayload(values: HabitFormInput): HabitCreatePayload {
    return {
        title: values.title.trim(),
        description: values.description.trim(),
        status: values.status,
        frequency: values.frequency,
        target_count: values.target_count,
        category: values.category.trim(),
        color: values.color.trim(),
    };
}

export function formToUpdateHabitPayload(values: HabitFormInput): HabitUpdatePayload {
    return {
        title: values.title.trim(),
        description: values.description.trim(),
        status: values.status,
        frequency: values.frequency,
        target_count: values.target_count,
        category: values.category.trim(),
        color: values.color.trim(),
    };
}

export function habitStatusBadgeColor(status: HabitStatus): "brand" | "warning" | "gray" {
    switch (status) {
        case "active":
            return "brand";
        case "paused":
            return "warning";
        default:
            return "gray";
    }
}
