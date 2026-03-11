import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';
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
    const cardBorderColor = colors.surface.outline;
    const cardBackgroundColor = colors.surface.surface;
    const elevatedBackgroundColor = colors.surface.surfaceVariant;
    const tertiaryTextColor = colors.text.secondary;

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

        const avgPath = rolling
            .map((v, i) => {
                const x = nextBars[i] ? nextBars[i].x + nextBars[i].w / 2 : p;
                const y = p + innerH - (v / maxValue) * innerH;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');

        const avgTarget = data.length ? data.reduce((sum, d) => sum + d.target, 0) / data.length : 0;
        const computedTargetY = p + innerH - (avgTarget / maxValue) * innerH;

        return { bars: nextBars, avgPath, targetY: computedTargetY };
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
                borderColor: cardBorderColor,
                backgroundColor: cardBackgroundColor,
                padding: 12,
            }}
            onLayout={onLayout}
        >
            <Text style={{ fontWeight: '700', color: colors.text.primary }}>Calories vs target · {period}</Text>
            <Svg width={chartWidth} height={height} style={{ marginTop: 8 }}>
                {bars.map((b, idx) => (
                    <Rect key={idx} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.color} />
                ))}
                <Line
                    x1={10}
                    y1={targetY}
                    x2={chartWidth - 10}
                    y2={targetY}
                    stroke="#f59e0b"
                    strokeWidth={2}
                />
                <Path d={avgPath} stroke="#ffffff" fill="none" strokeWidth={2} />
            </Svg>

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
                <View style={{ marginTop: 8, borderRadius: 10, backgroundColor: elevatedBackgroundColor, padding: 10 }}>
                    <Text style={{ color: colors.text.primary, fontWeight: '700' }}>
                        {format(new Date(selected.d.date), 'MMM d')}
                    </Text>
                    <Text style={{ color: colors.text.secondary, marginTop: 2 }}>
                        {Math.round(selected.d.consumed)} kcal consumed
                    </Text>
                    <Text style={{ color: tertiaryTextColor, fontSize: 12, marginTop: 2 }}>
                        Target: {Math.round(selected.d.target)} kcal • Δ{' '}
                        {Math.round(selected.d.consumed - selected.d.target)}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
