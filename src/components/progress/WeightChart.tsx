import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { Canvas, Circle, Line, Path, Skia, vec } from '@shopify/react-native-skia';
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

    const makeSafePath = () => {
        try {
            return Skia.Path.Make();
        } catch {
            return null;
        }
    };

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
                linePath: null as ReturnType<typeof Skia.Path.Make> | null,
                fillPath: null as ReturnType<typeof Skia.Path.Make> | null,
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

        const path = makeSafePath();
        const area = makeSafePath();
        if (!path || !area) {
            const computedGoalY =
                goalWeight != null ? pTop + ((maxValue - goalWeight) / Math.max(1, maxValue - minValue)) * h : null;

            return { points: plotted, linePath: null, fillPath: null, goalY: computedGoalY };
        }

        plotted.forEach((p, idx) => {
            if (idx === 0) {
                path.moveTo(p.x, p.y);
                area.moveTo(p.x, height - pBottom);
                area.lineTo(p.x, p.y);
            } else {
                path.lineTo(p.x, p.y);
                area.lineTo(p.x, p.y);
            }
        });

        const last = plotted[plotted.length - 1];
        if (last) {
            area.lineTo(last.x, height - pBottom);
            area.close();
        }

        const computedGoalY =
            goalWeight != null ? pTop + ((maxValue - goalWeight) / Math.max(1, maxValue - minValue)) * h : null;

        return { points: plotted, linePath: path, fillPath: area, goalY: computedGoalY };
    }, [chartWidth, data, goalWeight, height, isSkiaPathAvailable]);

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
                borderColor: colors.border.default,
                backgroundColor: colors.surface.card,
                padding: 12,
            }}
            onLayout={onLayout}
        >
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>Weight trend · {period}</Text>
            {linePath && fillPath ? (
                <>
                    <GestureDetector gesture={pinch}>
                        <Animated.View style={chartScale}>
                            <Canvas style={{ width: chartWidth - 24, height, marginTop: 8 }}>
                                {fillPath ? <Path path={fillPath} color="rgba(34,197,94,0.18)" /> : null}
                                {linePath ? (
                                    <Path path={linePath} color="#16a34a" style="stroke" strokeWidth={3} />
                                ) : null}
                                {goalY != null ? (
                                    <Line
                                        p1={vec(10, goalY)}
                                        p2={vec(chartWidth - 24 - 10, goalY)}
                                        color="#f59e0b"
                                        style="stroke"
                                        strokeWidth={2}
                                    />
                                ) : null}
                                {points.map((p, idx) => (
                                    <Circle
                                        key={`${p.x}-${idx}`}
                                        cx={p.x}
                                        cy={p.y}
                                        r={idx === points.length - 1 ? 5 : 3}
                                        color="#16a34a"
                                    />
                                ))}
                                {selected ? <Circle cx={selected.x} cy={selected.y} r={7} color="#22c55e" /> : null}
                            </Canvas>
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
                        backgroundColor: colors.surface.elevated,
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
                        backgroundColor: colors.surface.elevated,
                        padding: 10,
                    }}
                >
                    <Text style={{ fontWeight: '700', color: colors.text.primary }}>
                        {format(new Date(selected.d.date), 'MMM d')}
                    </Text>
                    <Text style={{ color: colors.text.secondary, marginTop: 2 }}>
                        {selected.d.weight.toFixed(1)} kg
                    </Text>
                    <Text style={{ color: colors.text.tertiary, marginTop: 2, fontSize: 12 }}>
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
