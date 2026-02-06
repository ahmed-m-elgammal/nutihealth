import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface BottomSheet {
    id: string;
    component: React.ComponentType<any>; // Generic component type is acceptable
    props?: Record<string, unknown>; // Flexible props object with unknown values
}

interface UIState {
    theme: 'light' | 'dark' | 'auto';
    toasts: Toast[];
    activeBottomSheet: BottomSheet | null;
    isLoading: boolean;

    // Toast actions
    showToast: (type: ToastType, message: string, duration?: number) => void;
    removeToast: (id: string) => void;

    // Bottom sheet actions
    openBottomSheet: (component: React.ComponentType<any>, props?: Record<string, unknown>) => void;
    closeBottomSheet: () => void;

    // Theme actions
    setTheme: (theme: 'light' | 'dark' | 'auto') => void;

    // Loading state
    setLoading: (isLoading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    theme: 'auto',
    toasts: [],
    activeBottomSheet: null,
    isLoading: false,

    showToast: (type, message, duration = 3000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const toast: Toast = { id, type, message, duration };

        set((state) => ({
            toasts: [...state.toasts, toast],
        }));

        // Auto-remove toast after duration
        if (duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                }));
            }, duration);
        }
    },

    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },

    openBottomSheet: (component, props) => {
        const id = `sheet-${Date.now()}`;
        set({ activeBottomSheet: { id, component, props } });
    },

    closeBottomSheet: () => {
        set({ activeBottomSheet: null });
    },

    setTheme: (theme) => {
        set({ theme });
    },

    setLoading: (isLoading) => {
        set({ isLoading });
    },
}));
