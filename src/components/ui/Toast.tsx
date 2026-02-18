import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, SlideOutLeft } from 'react-native-reanimated';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { useUIStore } from '../../store/uiStore';

/**
 * Toast variant definitions using CVA.
 */
const toastVariants = cva(
    'rounded-xl p-4 mb-2 flex-row items-center shadow-lg',
    {
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
    }
);

const toastTextVariants = cva(
    'font-body flex-1',
    {
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
    }
);

const variantIcons = {
    default: 'ⓘ',
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ⓘ',
};

export interface ToastProps extends VariantProps<typeof toastVariants> {
    id: string;
    message: string;
}

/**
 * Toast container component.
 * Manages display of toast notifications at the top of the screen.
 */
export function ToastContainer() {
    const toasts = useUIStore((state) => state.toasts);

    return (
        <View className="absolute top-12 left-0 right-0 px-4 z-50" pointerEvents="box-none">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} />
            ))}
        </View>
    );
}

/**
 * Individual Toast notification component with semantic variants.
 */
function Toast({ variant, message }: ToastProps) {
    const icon = variantIcons[variant || 'default'];

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={SlideOutLeft.duration(200)}
            className={cn(toastVariants({ variant }))}
        >
            <Text className={cn(toastTextVariants({ variant }), 'text-xl mr-3')}>
                {icon}
            </Text>
            <Text className={cn(toastTextVariants({ variant }))}>
                {message}
            </Text>
        </Animated.View>
    );
}

export default ToastContainer;
