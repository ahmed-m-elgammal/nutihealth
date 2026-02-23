import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';

type MacroMap = { protein: number; carbs: number; fats: number };

type CalorieRingCardProps = {
    consumedCalories: number;
    goalCalories: number;
    macros: MacroMap;
    macroGoals: MacroMap;
    delta?: string;
};

const size = 180;
const stroke = 16;
const radius = (size - stroke) / 2;
const circumference = 2 * Math.PI * radius;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function MacroPill({
    label,
    current,
    target,
    color,
}: {
    label: string;
    current: number;
    target: number;
    color: string;
}) {
    const ratio = Math.min(1, target > 0 ? current / target : 0);

    return (
        <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#374151', fontWeight: '600' }}>{label}</Text>
                <Text style={{ fontSize: 11, color: '#6b7280' }}>
                    {Math.round(current)}/{target}g
                </Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 9999, overflow: 'hidden' }}>
                <View style={{ width: `${ratio * 100}%`, backgroundColor: color, height: '100%' }} />
            </View>
        </View>
    );
}

export default function CalorieRingCard({
    consumedCalories,
    goalCalories,
    macros,
    macroGoals,
    delta,
}: CalorieRingCardProps) {
    const progress = useSharedValue(0);
    const glow = useSharedValue(1);
    const ratio = Math.min(1, goalCalories > 0 ? consumedCalories / goalCalories : 0);

    useEffect(() => {
        progress.value = withTiming(ratio, { duration: 700 });
    }, [ratio, progress]);

    useEffect(() => {
        if (goalCalories > 0 && consumedCalories >= goalCalories) {
            glow.value = withRepeat(
                withSequence(withTiming(1.03, { duration: 350 }), withTiming(1, { duration: 400 })),
                -1,
                false,
            );
            triggerHaptic('heavy').catch(() => undefined);
            return;
        }

        glow.value = withTiming(1, { duration: 200 });
    }, [consumedCalories, goalCalories, glow]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: circumference * (1 - progress.value),
    }));

    const glowStyle = useAnimatedStyle(() => ({
        transform: [{ scale: glow.value }],
    }));

    return (
        <Animated.View
            style={[
                {
                    borderRadius: 20,
                    backgroundColor: '#fff',
                    padding: 16,
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                },
                glowStyle,
            ]}
        >
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={size} height={size}>
                    <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="#16a34a"
                        strokeWidth={stroke}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        animatedProps={animatedProps}
                        rotation={-90}
                        origin={`${size / 2}, ${size / 2}`}
                    />
                </Svg>
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: '#111827' }}>
                        {Math.round(consumedCalories)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>kcal</Text>
                    {delta ? <Text style={{ marginTop: 4, fontSize: 11, color: '#16a34a' }}>{delta}</Text> : null}
                </View>
            </View>

            {consumedCalories >= goalCalories && goalCalories > 0 ? (
                <Text style={{ marginTop: 8, textAlign: 'center', color: '#16a34a', fontWeight: '700' }}>
                    Goal reached! 🎉
                </Text>
            ) : null}

            <View style={{ marginTop: 10 }}>
                <MacroPill label="Protein" current={macros.protein} target={macroGoals.protein} color="#3b82f6" />
                <MacroPill label="Carbs" current={macros.carbs} target={macroGoals.carbs} color="#f59e0b" />
                <MacroPill label="Fats" current={macros.fats} target={macroGoals.fats} color="#a855f7" />
            </View>
        </Animated.View>
    );
}
