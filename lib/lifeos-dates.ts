import { GregorianCalendar, parseDate, toCalendar } from "@internationalized/date";
import type { DateValue } from "react-aria-components";

function pad2(value: number) {
    return String(value).padStart(2, "0");
}

/** Gregorian `YYYY-MM-DD` from a DatePicker value (safe for Buddhist calendars). */
export function toDateString(value: DateValue) {
    const gregorian = toCalendar(value, new GregorianCalendar());
    return `${gregorian.year}-${pad2(gregorian.month)}-${pad2(gregorian.day)}`;
}

/** Parse `YYYY-MM-DD` into a DatePicker value, or `null` when empty/invalid. */
export function fromDateString(value: string): DateValue | null {
    if (!value) return null;
    try {
        return parseDate(value.slice(0, 10));
    } catch {
        return null;
    }
}

/** Local `YYYY-MM-DD` for a JS Date. */
export function localDateString(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local `HH:mm` for a JS Date. */
export function localTimeString(date: Date) {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Build a local Date from `YYYY-MM-DD` and `HH:mm`. */
export function combineLocal(date: string, time: string) {
    return new Date(`${date}T${time || "00:00"}:00`);
}

/** RFC3339 string without milliseconds (UTC). */
export function toRfc3339(date: Date) {
    return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function isValidTime(value: string) {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
