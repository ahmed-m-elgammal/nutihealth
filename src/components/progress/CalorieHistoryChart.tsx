import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { Canvas, Line, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { format } from 'date-fns';
import { triggerHaptic } from '../../utils/haptics';
import { useColors } from '../../hooks/useColors';

type CaloriePoint = { date: string; consumed: number; target: number };

type CalorieHistoryChartProps = {
    data: CaloriePoint[];
    period: string;
    width?: number;
    height?: number;
};

export default function CalorieHistoryChart({ data, period, width = 340, height = 220 }: CalorieHistoryChartProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [chartWidth, setChartWidth] = useState(width);
    const colors = useColors();

    const makeSafePath = () => {
        try {
            return Skia.Path.Make();
        } catch {
            return null;
        }
    };

    const { bars, avgPath, targetY } = useMemo(() => {
        const p = 16;
        const barGap = 6;
        const innerW = chartWidth - p * 2;
        const innerH = height - p * 2;
        const maxValue = Math.max(1, ...data.map((d) => Math.max(d.consumed, d.target)));

        const bw = Math.max(6, (innerW - barGap * Math.max(0, data.length - 1)) / Math.max(1, data.length));
        const nextBars = data.map((d, i) => {
            const x = p + i * (bw + barGap);
            const h = (d.consumed / maxValue) * innerH;
            const y = p + (innerH - h);
            const delta = Math.abs(d.consumed - d.target) / Math.max(1, d.target);
            const color = delta <= 0.1 ? '#16a34a' : delta <= 0.2 ? '#f59e0b' : '#dc2626';
            return { x, y, w: bw, h, color, d };
        });

        const rolling = data.map((_, idx) => {
            const start = Math.max(0, idx - 6);
            const slice = data.slice(start, idx + 1);
            return slice.reduce((sum, item) => sum + item.consumed, 0) / Math.max(1, slice.length);
        });

        const path = makeSafePath();
        if (path) {
            rolling.forEach((v, i) => {
                const x = nextBars[i] ? nextBars[i].x + nextBars[i].w / 2 : p;
                const y = p + innerH - (v / maxValue) * innerH;
                if (i === 0) path.moveTo(x, y);
                else path.lineTo(x, y);
            });
        }

        const avgTarget = data.length ? data.reduce((sum, d) => sum + d.target, 0) / data.length : 0;
        const computedTargetY = p + innerH - (avgTarget / maxValue) * innerH;

        return { bars: nextBars, avgPath: path, targetY: computedTargetY };
    }, [chartWidth, data, height]);

    const selected = selectedIndex != null ? bars[selectedIndex] : null;

    const onLayout = (event: LayoutChangeEvent) => {
        setChartWidth(event.nativeEvent.layout.width - 24);
    };

    return (
        <View
            style={{
                marginTop: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border.default,
                backgroundColor: colors.surface.card,
                padding: 12,
            }}
            onLayout={onLayout}
        >
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>Calories vs target · {period}</Text>
            <Canvas style={{ width: chartWidth, height, marginTop: 8 }}>
                {bars.map((b, idx) => (
                    <Rect key={idx} x={b.x} y={b.y} width={b.w} height={b.h} color={b.color} />
                ))}
                <Line
                    p1={vec(10, targetY)}
                    p2={vec(chartWidth - 10, targetY)}
                    color="#f59e0b"
                    style="stroke"
                    strokeWidth={2}
                />
                {avgPath ? <Path path={avgPath} color="#ffffff" style="stroke" strokeWidth={2} /> : null}
            </Canvas>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                {bars.map((bar, idx) => (
                    <Pressable
                        key={`${bar.x}-${idx}`}
                        onPress={() => {
                            triggerHaptic('light').catch(() => undefined);
                            setSelectedIndex(idx);
                        }}
                        style={{ width: bar.w + 2, height: 20 }}
                    />
                ))}
            </View>

            {selected ? (
                <View style={{ marginTop: 8, borderRadius: 10, backgroundColor: '#f8fafc', padding: 10 }}>
                    <Text style={{ color: colors.text.primary, fontWeight: '700' }}>
                        {format(new Date(selected.d.date), 'MMM d')}
                    </Text>
                    <Text style={{ color: colors.text.secondary, marginTop: 2 }}>
                        {Math.round(selected.d.consumed)} kcal consumed
                    </Text>
                    <Text style={{ color: colors.text.tertiary, fontSize: 12, marginTop: 2 }}>
                        Target: {Math.round(selected.d.target)} kcal • Δ{' '}
                        {Math.round(selected.d.consumed - selected.d.target)}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
