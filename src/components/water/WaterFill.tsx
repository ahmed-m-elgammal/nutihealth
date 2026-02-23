import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, {
    createAnimatedComponent,
    interpolate,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const AnimatedPath = createAnimatedComponent(Path);

type WaterFillProps = {
    currentAmount: number;
    goalAmount: number;
    width: number;
    height: number;
};

type BubbleProps = {
    left: number;
    size: number;
    delay: number;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function makeWavePath(width: number, height: number, levelY: number, phase: number, amplitude: number) {
    const step = 6;
    let d = `M 0 ${height} L 0 ${levelY}`;

    for (let x = 0; x <= width; x += step) {
        const y = levelY + Math.sin((x / width) * Math.PI * 2 + phase) * amplitude;
        d += ` L ${x} ${y}`;
    }

    d += ` L ${width} ${height} Z`;
    return d;
}

function Bubble({ left, size, delay }: BubbleProps) {
    const progress = useSharedValue(0);

    React.useEffect(() => {
        progress.value = withRepeat(withTiming(1, { duration: 2400 + delay }), -1, false);
    }, [delay, progress]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: interpolate(progress.value, [0, 1], [0, -95]) }],
        opacity: interpolate(progress.value, [0, 0.2, 0.8, 1], [0.1, 0.65, 0.45, 0]),
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    left,
                    bottom: 22,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: 'rgba(255,255,255,0.72)',
                },
                style,
            ]}
        />
    );
}

export default function WaterFill({ currentAmount, goalAmount, width, height }: WaterFillProps) {
    const ratio = clamp(goalAmount > 0 ? currentAmount / goalAmount : 0, 0, 1.2);
    const fillRatio = clamp(ratio, 0, 1);

    const phase = useSharedValue(0);
    const fillProgress = useSharedValue(fillRatio);

    React.useEffect(() => {
        phase.value = withRepeat(withTiming(Math.PI * 2, { duration: 2200 }), -1, false);
    }, [phase]);

    React.useEffect(() => {
        fillProgress.value = withTiming(fillRatio, { duration: 600 });
    }, [fillProgress, fillRatio]);

    const animatedProps = useAnimatedProps(() => {
        const levelY = interpolate(fillProgress.value, [0, 1], [height - 10, 20]);
        const amplitude = interpolate(fillProgress.value, [0, 1], [2, 8]);
        return {
            d: makeWavePath(width, height, levelY, phase.value, amplitude),
        };
    });

    const litersText = useMemo(
        () => `${(currentAmount / 1000).toFixed(1)}L / ${(goalAmount / 1000).toFixed(1)}L`,
        [currentAmount, goalAmount],
    );

    const bubbles = useMemo(
        () =>
            Array.from({ length: 8 }).map((_, idx) => ({
                id: idx,
                left: ((idx * 37) % (width - 20)) + 10,
                size: 4 + (idx % 3),
                delay: idx * 260,
            })),
        [width],
    );

    return (
        <View style={{ width, height, alignSelf: 'center' }}>
            <Svg width={width} height={height}>
                <Defs>
                    <LinearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#5eead4" stopOpacity="0.95" />
                        <Stop offset="100%" stopColor="#0f52ba" stopOpacity="0.98" />
                    </LinearGradient>
                </Defs>
                <Rect x={0} y={0} width={width} height={height} rx={26} ry={26} fill="#e6fffb" />
                <AnimatedPath animatedProps={animatedProps} fill="url(#waterGradient)" />
                <Rect
                    x={0.5}
                    y={0.5}
                    width={width - 1}
                    height={height - 1}
                    rx={26}
                    ry={26}
                    fill="none"
                    stroke="#bae6fd"
                />
            </Svg>

            {bubbles.map((bubble) => (
                <Bubble key={bubble.id} left={bubble.left} size={bubble.size} delay={bubble.delay} />
            ))}

            <View style={{ position: 'absolute', alignSelf: 'center', top: height / 2 - 28, alignItems: 'center' }}>
                <Text style={{ color: '#0f52ba', fontSize: 38, fontWeight: '800' }}>{Math.round(ratio * 100)}%</Text>
                <Text style={{ color: '#0f172a', fontWeight: '700', marginTop: 2 }}>{litersText}</Text>
            </View>
        </View>
    );
}
