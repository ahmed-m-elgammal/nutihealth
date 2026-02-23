import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useColors } from '../../hooks/useColors';

interface EmptyStateProps {
    illustration: React.ReactNode;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    variant?: 'default' | 'error';
}

export default function EmptyState({
    illustration,
    title,
    message,
    actionLabel,
    onAction,
    variant = 'default',
}: EmptyStateProps) {
    const colors = useColors();
    const isError = variant === 'error';

    return (
        <View className="flex-1 items-center justify-center px-8 py-10">
            <View style={{ width: 120, height: 120 }} className="items-center justify-center">
                {illustration}
            </View>
            <Text
                className="mt-4 text-center text-2xl font-semibold"
                style={{ color: isError ? '#dc2626' : colors.text.primary }}
            >
                {title}
            </Text>
            <Text className="mt-2 text-center text-base" style={{ color: colors.text.secondary }}>
                {message}
            </Text>
            {actionLabel && onAction ? (
                <Pressable
                    onPress={onAction}
                    android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                    className="mt-6 rounded-xl px-5 py-3"
                    style={{ backgroundColor: isError ? '#dc2626' : (colors.brand.primary[500] as string) }}
                >
                    <Text className="font-semibold text-white">{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}
