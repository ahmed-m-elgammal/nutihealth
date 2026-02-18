import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { WifiOff, X } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export interface NetworkErrorBannerProps {
    message?: string;
    onRetry?: () => void;
    visible: boolean;
    onDismiss?: () => void;
}

export default function NetworkErrorBanner({
    message = 'Something went wrong while loading data.',
    onRetry,
    visible,
    onDismiss,
}: NetworkErrorBannerProps) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming(visible ? 1 : 0, { duration: 220 });
    }, [progress, visible]);

    useEffect(() => {
        if (!visible || onRetry) {
            return;
        }

        const timeout = setTimeout(() => {
            onDismiss?.();
        }, 5000);

        return () => clearTimeout(timeout);
    }, [visible, onRetry, onDismiss]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
        transform: [{ translateY: -30 + progress.value * 30 }],
    }));

    if (!visible) {
        return null;
    }

    return (
        <Animated.View
            style={animatedStyle}
            className="absolute left-4 right-4 top-2 z-50 rounded-xl border border-amber-300 bg-amber-100 p-3"
        >
            <View className="flex-row items-center">
                <WifiOff size={16} color="#92400e" />
                <Text className="ml-2 flex-1 text-sm text-amber-900">{message}</Text>
                {onRetry && (
                    <Pressable onPress={onRetry} className="px-2 py-1">
                        <Text className="font-semibold text-red-700">Retry</Text>
                    </Pressable>
                )}
                <Pressable onPress={onDismiss} className="pl-2">
                    <X size={16} color="#92400e" />
                </Pressable>
            </View>
        </Animated.View>
    );
}
