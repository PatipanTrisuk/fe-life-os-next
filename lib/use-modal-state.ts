"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MODAL_EXIT_MS } from "@/components/application/modals/modal";

/**
 * Dialog state with delayed unmount so exit animations can finish
 * (same behaviour as the planner page).
 */
export function useModalState<T>() {
    const [dialog, setDialog] = useState<T | null>(null);
    const [open, setOpen] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    const openDialog = useCallback((next: T) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setDialog(next);
        setOpen(true);
    }, []);

    const closeDialog = useCallback((afterExit = true) => {
        setOpen(false);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(
            () => {
                setDialog(null);
                timerRef.current = null;
            },
            afterExit ? MODAL_EXIT_MS : 0,
        );
    }, []);

    return { dialog, open, openDialog, closeDialog };
}
