import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { format } from 'date-fns';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { triggerHaptic } from '../../utils/haptics';
import { useColors } from '../../hooks/useColors';

type WeightPoint = { date: string; weight: number };

type WeightChartProps = {
    data: WeightPoint[];
    goalWeight?: number;
    period: string;
    width?: number;
    height?: number;
};

export default function WeightChart({ data, goalWeight, period, width = 340, height = 220 }: WeightChartProps) {
    const [chartWidth, setChartWidth] = useState(width);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const zoom = useSharedValue(1);
    const colors = useColors();
    const cardBorderColor = colors.surface.outline;
    const cardBackgroundColor = colors.surface.surface;
    const elevatedBackgroundColor = colors.surface.surfaceVariant;
    const tertiaryTextColor = colors.text.secondary;

    const { points, linePath, fillPath, goalY } = useMemo(() => {
        const pLeft = 16;
        const pRight = 16;
        const pTop = 16;
        const pBottom = 22;
        const w = chartWidth - pLeft - pRight;
        const h = height - pTop - pBottom;

        if (!data.length) {
            return {
                points: [] as { x: number; y: number; d: WeightPoint }[],
                linePath: null as string | null,
                fillPath: null as string | null,
                goalY: null as number | null,
            };
        }

        const values = data.map((d) => d.weight);
        const minValue = Math.min(...values, goalWeight ?? Number.POSITIVE_INFINITY) - 1;
        const maxValue = Math.max(...values, goalWeight ?? Number.NEGATIVE_INFINITY) + 1;

        const plotted = data.map((d, i) => {
            const x = pLeft + (i / Math.max(1, data.length - 1)) * w;
            const y = pTop + ((maxValue - d.weight) / Math.max(1, maxValue - minValue)) * h;
            return { x, y, d };
        });

        const lineSegments = plotted.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`);
        const line = lineSegments.join(' ');

        const first = plotted[0];
        const last = plotted[plotted.length - 1];
        const baseY = height - pBottom;
        const area = first && last
            ? `M ${first.x} ${baseY} L ${first.x} ${first.y} ${plotted
                  .slice(1)
                  .map((point) => `L ${point.x} ${point.y}`)
                  .join(' ')} L ${last.x} ${baseY} Z`
            : null;

        const computedGoalY =
            goalWeight != null ? pTop + ((maxValue - goalWeight) / Math.max(1, maxValue - minValue)) * h : null;

        return { points: plotted, linePath: line, fillPath: area, goalY: computedGoalY };
    }, [chartWidth, data, goalWeight, height]);

    const selected = selectedIndex != null ? points[selectedIndex] : null;

    const onLayout = (event: LayoutChangeEvent) => {
        setChartWidth(event.nativeEvent.layout.width);
    };

    const pinch = Gesture.Pinch()
        .onUpdate((event) => {
            zoom.value = Math.max(1, Math.min(2.2, event.scale));
        })
        .onEnd(() => {
            zoom.value = withTiming(1, { duration: 220 });
        });

    const chartScale = useAnimatedStyle(() => ({
        transform: [{ scaleX: zoom.value }],
    }));

    const hitSlabPress = (x: number) => {
        if (!points.length) return;
        let closest = 0;
        let distance = Number.POSITIVE_INFINITY;
        points.forEach((point, idx) => {
            const d = Math.abs(point.x - x);
            if (d < distance) {
                distance = d;
                closest = idx;
            }
        });
        triggerHaptic('light').catch(() => undefined);
        setSelectedIndex(closest);
    };

    return (
        <View
            style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: cardBorderColor,
                backgroundColor: cardBackgroundColor,
                padding: 12,
            }}
            onLayout={onLayout}
        >
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>Weight trend · {period}</Text>
            {linePath && fillPath ? (
                <>
                    <GestureDetector gesture={pinch}>
                        <Animated.View style={chartScale}>
                            <Svg width={chartWidth - 24} height={height} style={{ marginTop: 8 }}>
                                <Path d={fillPath} fill="rgba(34,197,94,0.18)" />
                                <Path d={linePath} stroke="#16a34a" strokeWidth={3} fill="none" />
                                {goalY != null ? (
                                    <Line
                                        x1={10}
                                        y1={goalY}
                                        x2={chartWidth - 24 - 10}
                                        y2={goalY}
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                    />
                                ) : null}
                                {points.map((p, idx) => (
                                    <Circle
                                        key={`${p.x}-${idx}`}
                                        cx={p.x}
                                        cy={p.y}
                                        r={idx === points.length - 1 ? 5 : 3}
                                        fill="#16a34a"
                                    />
                                ))}
                                {selected ? <Circle cx={selected.x} cy={selected.y} r={7} fill="#22c55e" /> : null}
                            </Svg>
                        </Animated.View>
                    </GestureDetector>

                    <Pressable
                        onPress={(event) => {
                            hitSlabPress(event.nativeEvent.locationX + 12);
                        }}
                        style={{ height: 24, marginTop: -24 }}
                    />
                </>
            ) : (
                <View
                    style={{
                        marginTop: 10,
                        borderRadius: 10,
                        backgroundColor: elevatedBackgroundColor,
                        padding: 10,
                    }}
                >
                    <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                        Interactive chart is unavailable on this web renderer. Weight entries are still tracked.
                    </Text>
                    <Text style={{ marginTop: 6, color: colors.text.primary, fontWeight: '700' }}>
                        Latest: {data.length ? `${data[data.length - 1].weight.toFixed(1)} kg` : 'No data'}
                    </Text>
                </View>
            )}

            {selected ? (
                <View
                    style={{
                        marginTop: 10,
                        borderRadius: 10,
                        backgroundColor: elevatedBackgroundColor,
                        padding: 10,
                    }}
                >
                    <Text style={{ fontWeight: '700', color: colors.text.primary }}>
                        {format(new Date(selected.d.date), 'MMM d')}
                    </Text>
                    <Text style={{ color: colors.text.secondary, marginTop: 2 }}>
                        {selected.d.weight.toFixed(1)} kg
                    </Text>
                    <Text style={{ color: tertiaryTextColor, marginTop: 2, fontSize: 12 }}>
                        Δ{' '}
                        {selectedIndex && points[selectedIndex - 1]
                            ? (selected.d.weight - points[selectedIndex - 1].d.weight).toFixed(1)
                            : '0.0'}{' '}
                        kg from previous
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
