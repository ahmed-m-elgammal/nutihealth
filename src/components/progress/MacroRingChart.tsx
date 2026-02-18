import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

type MacroRingChartProps = {
    macros: { protein: number; carbs: number; fats: number };
    totalCalories: number;
    onSegmentPress?: (macro: string) => void;
};

const colors = { protein: '#3b82f6', carbs: '#f59e0b', fats: '#ec4899' };

export default function MacroRingChart({ macros, totalCalories, onSegmentPress }: MacroRingChartProps) {
    const [active, setActive] = useState<'protein' | 'carbs' | 'fats'>('protein');
    const total = Math.max(1, macros.protein + macros.carbs + macros.fats);

    const arcs = useMemo(() => {
        const center = 90;
        const radius = 62;
        let start = -Math.PI / 2;
        const data: Array<{ key: 'protein' | 'carbs' | 'fats'; path: any; percent: number }> = [];

        (['protein', 'carbs', 'fats'] as const).forEach((key) => {
            const pct = macros[key] / total;
            const sweep = pct * Math.PI * 2;
            const end = start + sweep;

            const path = Skia.Path.Make();
            path.addArc(
                { x: center - radius, y: center - radius, width: radius * 2, height: radius * 2 },
                (start * 180) / Math.PI,
                (sweep * 180) / Math.PI,
            );
            data.push({ key, path, percent: pct });
            start = end;
        });

        return data;
    }, [macros, total]);

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
            <Text style={{ fontWeight: '700', color: '#0f172a' }}>Macro distribution</Text>
            <Canvas style={{ width: 180, height: 180, alignSelf: 'center', marginTop: 8 }}>
                {arcs.map((a) => (
                    <Path
                        key={a.key}
                        path={a.path}
                        color={colors[a.key]}
                        style="stroke"
                        strokeWidth={a.key === active ? 20 : 14}
                        strokeCap="round"
                    />
                ))}
            </Canvas>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                {(Object.keys(colors) as Array<'protein' | 'carbs' | 'fats'>).map((key) => (
                    <Pressable
                        key={key}
                        onPress={() => {
                            setActive(key);
                            onSegmentPress?.(key);
                        }}
                        style={{ alignItems: 'center' }}
                    >
                        <Text style={{ color: colors[key], fontWeight: '700', textTransform: 'capitalize' }}>
                            {key}
                        </Text>
                        <Text style={{ color: '#334155', fontSize: 12 }}>
                            {Math.round((macros[key] / total) * 100)}%
                        </Text>
                    </Pressable>
                ))}
            </View>
            <Text style={{ textAlign: 'center', marginTop: 8, color: '#475569' }}>{totalCalories} total kcal</Text>
        </View>
    );
}
