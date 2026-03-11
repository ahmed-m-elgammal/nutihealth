import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop, Circle } from 'react-native-svg';
import Animated, {
    createAnimatedComponent,
    interpolate,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { Droplets } from 'lucide-react-native';

const AnimatedPath = createAnimatedComponent(Path);

type WaterFillProps = {
    currentAmount: number;
    goalAmount: number;
    width: number;
    height: number;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function makeWavePath(width: number, height: number, levelY: number, phase: number, amplitude: number) {
    'worklet';
    const step = 6;
    let d = `M 0 ${height} L 0 ${levelY}`;

    for (let x = 0; x <= width; x += step) {
        const y = levelY + Math.sin((x / width) * Math.PI * 2 + phase) * amplitude;
        d += ` L ${x} ${y}`;
    }

    d += ` L ${width} ${height} Z`;
    return d;
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
        const levelY = interpolate(fillProgress.value, [0, 1], [height - 8, 18]);
        const amplitude = interpolate(fillProgress.value, [0, 1], [2, 9]);
        return {
            d: makeWavePath(width, height, levelY, phase.value, amplitude),
        };
    });

    const litersText = useMemo(
        () => `${(currentAmount / 1000).toFixed(1)}L / ${(goalAmount / 1000).toFixed(1)}L`,
        [currentAmount, goalAmount],
    );

    const pct = Math.round(ratio * 100);

    return (
        <View style={{ width, height, alignSelf: 'center', borderRadius: 999, overflow: 'hidden' }}>
            {/* Background */}
            <View style={{ position: 'absolute', width, height, borderRadius: 999, backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#10b748' }} />

            <Svg width={width} height={height} style={{ borderRadius: 999, overflow: 'hidden' }}>
                <Defs>
                    <SvgLinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#10b748" stopOpacity="0.9" />
                        <Stop offset="100%" stopColor="#059669" stopOpacity="0.98" />
                    </SvgLinearGradient>
                    <SvgLinearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0%" stopColor="#1e293b" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#0f172a" stopOpacity="1" />
                    </SvgLinearGradient>
                </Defs>
                {/* BG circle */}
                <Circle cx={width / 2} cy={height / 2} r={Math.min(width, height) / 2} fill="url(#bgGrad)" />
                {/* Water wave */}
                <AnimatedPath animatedProps={animatedProps} fill="url(#waterGrad)" clipPath="url(#clip)" />
                {/* Outer border */}
                <Circle cx={width / 2} cy={height / 2} r={Math.min(width, height) / 2 - 1} fill="none" stroke="#10b748" strokeWidth={2} />
            </Svg>

            {/* Center text */}
            <View style={{ position: 'absolute', width, height, alignItems: 'center', justifyContent: 'center' }}>
                <Droplets size={24} color="#10b748" />
                <Text style={{ color: '#f8fafc', fontSize: 40, fontWeight: '800', marginTop: 4 }}>{pct}%</Text>
                <Text style={{ color: '#94a3b8', fontWeight: '700', marginTop: 2, fontSize: 14 }}>{litersText}</Text>
            </View>
        </View>
    );
}
