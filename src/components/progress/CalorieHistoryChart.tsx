import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Canvas, Line, Path, Rect, Skia, vec } from '@shopify/react-native-skia';
import { format } from 'date-fns';
import { triggerHaptic } from '../../utils/haptics';

type CaloriePoint = { date: string; consumed: number; target: number };

type CalorieHistoryChartProps = {
    data: CaloriePoint[];
    period: string;
    width?: number;
    height?: number;
};

export default function CalorieHistoryChart({ data, period, width = 340, height = 220 }: CalorieHistoryChartProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const { bars, avgPath, targetY } = useMemo(() => {
        const p = 16;
        const barGap = 6;
        const innerW = width - p * 2;
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

        const path = Skia.Path.Make();
        rolling.forEach((v, i) => {
            const x = nextBars[i] ? nextBars[i].x + nextBars[i].w / 2 : p;
            const y = p + innerH - (v / maxValue) * innerH;
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
        });

        const avgTarget = data.length ? data.reduce((sum, d) => sum + d.target, 0) / data.length : 0;
        const computedTargetY = p + innerH - (avgTarget / maxValue) * innerH;

        return { bars: nextBars, avgPath: path, targetY: computedTargetY };
    }, [data, height, width]);

    const selected = selectedIndex != null ? bars[selectedIndex] : null;

    return (
        <View
            style={{
                marginTop: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                backgroundColor: '#fff',
                padding: 12,
            }}
        >
            <Text style={{ fontWeight: '700', color: '#0f172a' }}>Calories vs target · {period}</Text>
            <Canvas style={{ width: width - 24, height, marginTop: 8 }}>
                {bars.map((b, idx) => (
                    <Rect key={idx} x={b.x} y={b.y} width={b.w} height={b.h} color={b.color} />
                ))}
                <Line
                    p1={vec(10, targetY)}
                    p2={vec(width - 24 - 10, targetY)}
                    color="#f59e0b"
                    style="stroke"
                    strokeWidth={2}
                />
                <Path path={avgPath} color="#ffffff" style="stroke" strokeWidth={2} />
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
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                        {format(new Date(selected.d.date), 'MMM d')}
                    </Text>
                    <Text style={{ color: '#334155', marginTop: 2 }}>
                        {Math.round(selected.d.consumed)} kcal consumed
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                        Target: {Math.round(selected.d.target)} kcal • Δ{' '}
                        {Math.round(selected.d.consumed - selected.d.target)}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
