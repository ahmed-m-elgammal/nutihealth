import React, { useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type WaterUndoButtonProps = {
    visible: boolean;
    onUndo: () => void;
    timeout?: number;
    onExpire?: () => void;
};

export default function WaterUndoButton({ visible, onUndo, timeout = 5000, onExpire }: WaterUndoButtonProps) {
    const progress = useSharedValue(1);
    const size = 44;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        if (!visible) return;
        progress.value = 1;
        progress.value = withTiming(0, { duration: timeout });

        const t = setTimeout(() => {
            onExpire?.();
        }, timeout);
        return () => clearTimeout(t);
    }, [onExpire, progress, timeout, visible]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - progress.value),
    }));

    const label = useMemo(() => 'Undo', []);

    if (!visible) return null;

    return (
        <Pressable
            onPress={() => {
                triggerHaptic('medium').catch(() => undefined);
                onUndo();
            }}
            android_ripple={{ color: 'rgba(14,116,144,0.15)' }}
            style={{
                alignSelf: 'flex-start',
                marginTop: 12,
                paddingRight: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
            }}
        >
            <View>
                <Svg width={size} height={size}>
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#bae6fd"
                        strokeWidth={strokeWidth}
                        fill="#ecfeff"
                    />
                    <AnimatedCircle
                        animatedProps={animatedProps}
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#0e7490"
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeLinecap="round"
                        rotation="-90"
                        originX={size / 2}
                        originY={size / 2}
                    />
                </Svg>
                <Text style={{ position: 'absolute', top: 13, left: 10, color: '#0f172a', fontWeight: '700' }}>↶</Text>
            </View>
            <Text style={{ color: '#0e7490', fontWeight: '700' }}>{label}</Text>
        </Pressable>
    );
}
