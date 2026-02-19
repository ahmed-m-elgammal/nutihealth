import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeIn, SlideOutLeft } from 'react-native-reanimated';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { type Toast as ToastModel, useUIStore } from '../../store/uiStore';

const toastVariants = cva('rounded-xl p-4 mb-2 flex-row items-center shadow-lg', {
    variants: {
        variant: {
            default: 'bg-card border border-border',
            success: 'bg-success',
            error: 'bg-destructive',
            warning: 'bg-warning',
            info: 'bg-secondary',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

const toastTextVariants = cva('font-body flex-1', {
    variants: {
        variant: {
            default: 'text-card-foreground',
            success: 'text-success-foreground',
            error: 'text-destructive-foreground',
            warning: 'text-warning-foreground',
            info: 'text-secondary-foreground',
        },
    },
    defaultVariants: {
        variant: 'default',
    },
});

const variantIcons = {
    default: 'ⓘ',
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ⓘ',
};

export interface ToastProps extends VariantProps<typeof toastVariants> {
    id: string;
    type: ToastModel['type'];
    message: string;
    action?: {
        label: string;
        onPress?: () => void;
    };
}

export function ToastContainer() {
    const toasts = useUIStore((state) => state.toasts);

    return (
        <View className="absolute left-0 right-0 top-12 z-50 px-4" pointerEvents="box-none">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} />
            ))}
        </View>
    );
}

function Toast({ id, type, message, action }: ToastProps) {
    const variant = type;
    const icon = variantIcons[variant];
    const removeToast = useUIStore((state) => state.removeToast);

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={SlideOutLeft.duration(200)}
            className={cn(toastVariants({ variant }))}
        >
            <Text className={cn(toastTextVariants({ variant }), 'mr-3 text-xl')}>{icon}</Text>
            <Text className={cn(toastTextVariants({ variant }))}>{message}</Text>
            {action ? (
                <Pressable
                    onPress={() => {
                        action.onPress?.();
                        removeToast(id);
                    }}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    className="ml-3 rounded-full border border-white/35 px-3 py-1"
                >
                    <Text className="font-semibold text-white">{action.label}</Text>
                </Pressable>
            ) : null}
        </Animated.View>
    );
}

export default ToastContainer;
