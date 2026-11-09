import type { Goal, GoalCreatePayload, GoalPriority, GoalStatus, GoalUpdatePayload } from "@/lib/types";
import type { GoalFormInput } from "@/lib/schemas";

export const GOAL_STATUSES: GoalStatus[] = ["draft", "active", "completed", "cancelled", "archived"];
export const GOAL_PRIORITIES: GoalPriority[] = ["low", "medium", "high"];

export function emptyGoalForm(): GoalFormInput {
    return {
        title: "",
        description: "",
        status: "active",
        priority: "medium",
        category: "",
        progress: 0,
        target_value: "",
        current_value: "",
        unit: "",
        start_date: "",
        target_date: "",
    };
}

export function goalToForm(goal: Goal): GoalFormInput {
    return {
        title: goal.title,
        description: goal.description ?? "",
        status: goal.status,
        priority: goal.priority,
        category: goal.category ?? "",
        progress: goal.progress ?? 0,
        target_value: goal.target_value != null ? String(goal.target_value) : "",
        current_value: goal.current_value != null && goal.current_value !== 0 ? String(goal.current_value) : "",
        unit: goal.unit ?? "",
        start_date: goal.start_date ?? "",
        target_date: goal.target_date ?? "",
    };
}

function parseOptionalNumber(raw: string): number | undefined {
    const s = raw.trim();
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

export function formToCreatePayload(values: GoalFormInput): GoalCreatePayload {
    const target = parseOptionalNumber(values.target_value);
    const current = parseOptionalNumber(values.current_value);
    return {
        title: values.title.trim(),
        description: values.description.trim(),
        status: values.status,
        priority: values.priority,
        category: values.category.trim(),
        progress: values.progress,
        ...(target != null ? { target_value: target } : {}),
        ...(current != null ? { current_value: current } : {}),
        unit: values.unit.trim(),
        ...(values.start_date.trim() ? { start_date: values.start_date.trim() } : {}),
        ...(values.target_date.trim() ? { target_date: values.target_date.trim() } : {}),
    };
}

export function formToUpdatePayload(values: GoalFormInput, original: Goal): GoalUpdatePayload {
    const targetRaw = values.target_value.trim();
    const currentRaw = values.current_value.trim();
    const startRaw = values.start_date.trim();
    const targetDateRaw = values.target_date.trim();

    const payload: GoalUpdatePayload = {
        title: values.title.trim(),
        description: values.description.trim(),
        status: values.status,
        priority: values.priority,
        category: values.category.trim(),
        progress: values.progress,
        unit: values.unit.trim(),
    };

    if (!targetRaw) {
        if (original.target_value != null) payload.clear_target_value = true;
    } else {
        const n = Number(targetRaw);
        if (Number.isFinite(n)) payload.target_value = n;
    }

    if (currentRaw) {
        const n = Number(currentRaw);
        if (Number.isFinite(n)) payload.current_value = n;
    } else {
        payload.current_value = 0;
    }

    if (!startRaw) {
        if (original.start_date) payload.clear_start_date = true;
    } else {
        payload.start_date = startRaw;
    }

    if (!targetDateRaw) {
        if (original.target_date) payload.clear_target_date = true;
    } else {
        payload.target_date = targetDateRaw;
    }

    return payload;
}

export function statusBadgeColor(status: GoalStatus): "brand" | "success" | "warning" | "error" | "gray" {
    switch (status) {
        case "active":
            return "brand";
        case "completed":
            return "success";
        case "cancelled":
            return "error";
        case "draft":
            return "warning";
        default:
            return "gray";
    }
}

export function priorityBadgeColor(priority: GoalPriority): "error" | "warning" | "gray" {
    switch (priority) {
        case "high":
            return "error";
        case "medium":
            return "warning";
        default:
            return "gray";
    }
}
