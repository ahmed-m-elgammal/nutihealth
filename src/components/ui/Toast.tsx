import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withDelay,
    Easing,
    FadeIn,
    FadeOut, SlideOutLeft,
} from 'react-native-reanimated';
import { useUIStore } from '@store/uiStore';

const variantStyles = {
    success: { bg: 'bg-primary-500', icon: '✓' },
    error: { bg: 'bg-error', icon: '✕' },
    warning: { bg: 'bg-warning', icon: '⚠' },
    info: { bg: 'bg-info', icon: 'ⓘ' },
};

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

function Toast({
    id,
    type,
    message
}: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
}) {
    const styles = variantStyles[type];

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={SlideOutLeft.duration(200)}
            className={`
        ${styles.bg}
        rounded-xl
        p-4
        mb-2
        flex-row
        items-center
        shadow-lg
      `.trim()}
        >
            <Text className="text-white text-xl mr-3">{styles.icon}</Text>
            <Text className="text-white font-body flex-1">{message}</Text>
        </Animated.View>
    );
}
