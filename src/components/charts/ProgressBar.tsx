import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';

interface ProgressBarProps {
    current: number;
    target: number;
    color: string; // Tailwind class name like 'bg-blue-500'
    label: string;
}

export default function ProgressBar({ current, target, color, label }: ProgressBarProps) {
    const percentage = Math.min((current / target) * 100, 100);
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming(percentage, {
            duration: 800,
            easing: Easing.out(Easing.cubic),
        });
    }, [percentage]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: `${progress.value}%`,
        };
    });

    return (
        <View className="flex-1">
            <View className="flex-row justify-between items-baseline mb-2">
                <Text className="text-neutral-600 text-xs font-medium">{label}</Text>
                <Text className="text-neutral-900 font-bold text-sm">
                    {Math.round(current)}g / {target}g
                </Text>
            </View>
            <View className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <Animated.View
                    className={`h-full ${color} rounded-full`}
                    style={animatedStyle}
                />
            </View>
        </View>
    );
}
