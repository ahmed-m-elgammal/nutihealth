import React, { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
    useSharedValue,
    useAnimatedProps,
    withTiming,
    Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CalorieCircleProps {
    current: number;
    target: number;
    size?: number;
}

export default function CalorieCircle({ current, target, size = 120 }: CalorieCircleProps) {
    // Memoize basic calculations
    const { percentage, radius, circumference } = useMemo(() => {
        const pct = Math.min((current / target) * 100, 100);
        const r = (size - 20) / 2;
        const circ = 2 * Math.PI * r;
        return { percentage: pct, radius: r, circumference: circ };
    }, [current, target, size]);

    const strokeWidth = 12;

    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming(percentage, {
            duration: 1000,
            easing: Easing.out(Easing.cubic),
        });
    }, [percentage]);

    const animatedProps = useAnimatedProps(() => {
        const strokeDashoffset = circumference - (progress.value / 100) * circumference;
        return {
            strokeDashoffset,
        };
    });

    // Memoize color calculation
    const colors = useMemo(() => {
        if (percentage > 100) return { start: '#ef4444', end: '#dc2626' }; // Red gradient
        if (percentage > 75) return { start: '#f59e0b', end: '#d97706' }; // Amber gradient
        return { start: '#10b981', end: '#059669' }; // Emerald gradient
    }, [percentage]);

    return (
        <View style={{ width: size, height: size }} className="items-center justify-center">
            <Svg width={size} height={size} style={{ position: 'absolute' }}>
                <Defs>
                    <LinearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={colors.start} stopOpacity="1" />
                        <Stop offset="100%" stopColor={colors.end} stopOpacity="1" />
                    </LinearGradient>
                </Defs>
                {/* Background circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#e5e5e5"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Animated progress circle with gradient */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#circleGradient)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View className="items-center">
                <Text className="text-3xl font-bold text-neutral-900">
                    {Math.round(current)}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">/ {target} kcal</Text>
            </View>
        </View>
    );
}
