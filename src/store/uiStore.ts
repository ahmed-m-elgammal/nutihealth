import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
    label: string;
    onPress?: () => void;
}

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    action?: ToastAction;
}

interface BottomSheet {
    id: string;
    component: React.ComponentType<any>;
    props?: Record<string, unknown>;
}

interface UIState {
    theme: 'light' | 'dark' | 'auto';
    toasts: Toast[];
    activeBottomSheet: BottomSheet | null;
    isLoading: boolean;
    showToast: (type: ToastType, message: string, duration?: number, action?: ToastAction) => void;
    removeToast: (id: string) => void;
    openBottomSheet: (component: React.ComponentType<any>, props?: Record<string, unknown>) => void;
    closeBottomSheet: () => void;
    setTheme: (theme: 'light' | 'dark' | 'auto') => void;
    setLoading: (isLoading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    theme: 'auto',
    toasts: [],
    activeBottomSheet: null,
    isLoading: false,

    showToast: (type, message, duration = 3000, action) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const toast: Toast = { id, type, message, duration, action };

        set((state) => ({
            toasts: [...state.toasts, toast].slice(-3),
        }));

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
