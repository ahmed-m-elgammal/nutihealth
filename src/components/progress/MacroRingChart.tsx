import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { triggerHaptic } from '../../utils/haptics';
import { useColors } from '../../hooks/useColors';

type MacroRingChartProps = {
    macros: { protein: number; carbs: number; fats: number };
    totalCalories: number;
    onSegmentPress?: (macro: string) => void;
};

const colors = { protein: '#3b82f6', carbs: '#f59e0b', fats: '#ec4899' };

export default function MacroRingChart({ macros, totalCalories, onSegmentPress }: MacroRingChartProps) {
    const [active, setActive] = useState<'protein' | 'carbs' | 'fats'>('protein');
    const [size, setSize] = useState(180);
    const colorsTheme = useColors();

    const makeSafePath = () => {
        try {
            return Skia.Path.Make();
        } catch {
            return null;
        }
    };
    const total = Math.max(1, macros.protein + macros.carbs + macros.fats);

    const arcs = useMemo(() => {
        const center = size / 2;
        const radius = Math.max(42, size * 0.34);
        let start = -Math.PI / 2;
        const data: Array<{
            key: 'protein' | 'carbs' | 'fats';
            path: ReturnType<typeof Skia.Path.Make> | null;
            percent: number;
        }> = [];

        (['protein', 'carbs', 'fats'] as const).forEach((key) => {
            const pct = macros[key] / total;
            const sweep = pct * Math.PI * 2;
            const end = start + sweep;

            const path = makeSafePath();
            if (path) {
                path.addArc(
                    { x: center - radius, y: center - radius, width: radius * 2, height: radius * 2 },
                    (start * 180) / Math.PI,
                    (sweep * 180) / Math.PI,
                );
            }
            data.push({ key, path, percent: pct });
            start = end;
        });

        return data;
    }, [macros, size, total]);

    const onLayout = (event: LayoutChangeEvent) => {
        const width = event.nativeEvent.layout.width;
        setSize(Math.min(220, Math.max(160, width - 48)));
    };

    return (
        <View
            style={{
                marginTop: 12,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colorsTheme.border.default,
                backgroundColor: colorsTheme.surface.card,
                padding: 12,
            }}
            onLayout={onLayout}
        >
            <Text style={{ fontWeight: '700', color: colorsTheme.text.primary }}>Macro distribution</Text>
            <Canvas style={{ width: size, height: size, alignSelf: 'center', marginTop: 8 }}>
                {arcs.map((a) =>
                    a.path ? (
                        <Path
                            key={a.key}
                            path={a.path}
                            color={colors[a.key]}
                            style="stroke"
                            strokeWidth={a.key === active ? 20 : 14}
                            strokeCap="round"
                        />
                    ) : null,
                )}
            </Canvas>
            {!arcs.some((arc) => arc.path) ? (
                <Text style={{ textAlign: 'center', marginTop: 6, color: colorsTheme.text.tertiary, fontSize: 12 }}>
                    Chart renderer unavailable on this device/browser.
                </Text>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                {(Object.keys(colors) as Array<'protein' | 'carbs' | 'fats'>).map((key) => (
                    <Pressable
                        key={key}
                        onPress={() => {
                            triggerHaptic('light').catch(() => undefined);
                            setActive(key);
                            onSegmentPress?.(key);
                        }}
                        style={{ alignItems: 'center' }}
                    >
                        <Text style={{ color: colors[key], fontWeight: '700', textTransform: 'capitalize' }}>
                            {key}
                        </Text>
                        <Text style={{ color: colorsTheme.text.secondary, fontSize: 12 }}>
                            {Math.round((macros[key] / total) * 100)}%
                        </Text>
                    </Pressable>
                ))}
            </View>
            <Text style={{ textAlign: 'center', marginTop: 8, color: colorsTheme.text.tertiary }}>
                {totalCalories} total kcal
            </Text>
            <Text style={{ textAlign: 'center', marginTop: 2, color: colorsTheme.text.primary, fontWeight: '700' }}>
                {active[0].toUpperCase() + active.slice(1)}: {macros[active]}g
            </Text>
        </View>
    );
}
