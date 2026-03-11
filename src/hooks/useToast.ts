import { useCallback } from 'react';
import { type ToastAction, type ToastType, useUIStore } from '../store/uiStore';

export function useToast() {
    const showToast = useUIStore((state) => state.showToast);

    const toast = useCallback(
        (type: ToastType, message: string, duration?: number, action?: ToastAction) => {
            showToast(type, message, duration, action);
        },
        [showToast],
    );

    const success = useCallback(
        (message: string, duration?: number, action?: ToastAction) => toast('success', message, duration, action),
        [toast],
    );

    const error = useCallback(
        (message: string, duration?: number, action?: ToastAction) => toast('error', message, duration, action),
        [toast],
    );

    const warning = useCallback(
        (message: string, duration?: number, action?: ToastAction) => toast('warning', message, duration, action),
        [toast],
    );

    const info = useCallback(
        (message: string, duration?: number, action?: ToastAction) => toast('info', message, duration, action),
        [toast],
    );

    return {
        toast,
        success,
        error,
        warning,
        info,
    };
}

export default useToast;
