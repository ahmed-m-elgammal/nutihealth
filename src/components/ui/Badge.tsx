import React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
    default: {
        container: 'bg-neutral-100',
        text: 'text-neutral-700'
    },
    success: {
        container: 'bg-primary-50',
        text: 'text-primary-700'
    },
    warning: {
        container: 'bg-yellow-50',
        text: 'text-yellow-700'
    },
    error: {
        container: 'bg-red-50',
        text: 'text-red-700'
    },
    info: {
        container: 'bg-secondary-50',
        text: 'text-secondary-700'
    },
};

export function Badge({
    children,
    variant = 'default',
    className = ''
}: BadgeProps) {
    const styles = variantStyles[variant];

    return (
        <View className={`
      ${styles.container}
      px-3 py-1 rounded-full
      ${className}
    `.trim()}>
            <Text className={`${styles.text} text-xs font-caption font-semibold`}>
                {children}
            </Text>
        </View>
    );
}
