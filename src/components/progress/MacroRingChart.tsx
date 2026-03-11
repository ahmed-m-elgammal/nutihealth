import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { triggerHaptic } from '../../utils/haptics';
import { useColors } from '../../hooks/useColors';

type MacroRingChartProps = {
    macros: { protein: number; carbs: number; fats: number };
    totalCalories: number;
    onSegmentPress?: (macro: string) => void;
};

const colors = { protein: '#3b82f6', carbs: '#f59e0b', fats: '#ec4899' };
const FULL_CIRCLE_RADIANS = Math.PI * 2;
const EPSILON = 0.0001;

const toCartesian = (cx: number, cy: number, radius: number, angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
});

const buildArcPath = (center: number, radius: number, start: number, sweep: number): string | null => {
    if (sweep <= EPSILON) {
        return null;
    }

    const normalizedSweep = Math.min(sweep, FULL_CIRCLE_RADIANS - EPSILON);
    const startPoint = toCartesian(center, center, radius, start);

    if (normalizedSweep >= Math.PI * 2 - EPSILON) {
        const midAngle = start + Math.PI;
        const midPoint = toCartesian(center, center, radius, midAngle);
        return [
            `M ${startPoint.x} ${startPoint.y}`,
            `A ${radius} ${radius} 0 1 1 ${midPoint.x} ${midPoint.y}`,
            `A ${radius} ${radius} 0 1 1 ${startPoint.x} ${startPoint.y}`,
        ].join(' ');
    }

    const endPoint = toCartesian(center, center, radius, start + normalizedSweep);
    const largeArcFlag = normalizedSweep > Math.PI ? 1 : 0;
    return `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`;
};

export default function MacroRingChart({ macros, totalCalories, onSegmentPress }: MacroRingChartProps) {
    const [active, setActive] = useState<'protein' | 'carbs' | 'fats'>('protein');
    const [size, setSize] = useState(180);
    const colorsTheme = useColors();
    const cardBorderColor = colorsTheme.surface.outline;
    const cardBackgroundColor = colorsTheme.surface.surface;
    const tertiaryTextColor = colorsTheme.text.secondary;

    // Calorie-weighted total: protein & carbs = 4 kcal/g, fat = 9 kcal/g
    const proteinCals = macros.protein * 4;
    const carbsCals = macros.carbs * 4;
    const fatsCals = macros.fats * 9;
    const calorieMap = useMemo(
        () => ({ protein: proteinCals, carbs: carbsCals, fats: fatsCals }),
        [proteinCals, carbsCals, fatsCals],
    );
    const total = Math.max(1, proteinCals + carbsCals + fatsCals);

    const arcs = useMemo(() => {
        const center = size / 2;
        const radius = Math.max(42, size * 0.34);
        let start = -Math.PI / 2;
        const data: Array<{
            key: 'protein' | 'carbs' | 'fats';
            path: string | null;
            percent: number;
        }> = [];

        (['protein', 'carbs', 'fats'] as const).forEach((key) => {
            const pct = calorieMap[key] / total;
            const sweep = pct * FULL_CIRCLE_RADIANS;
            const path = buildArcPath(center, radius, start, sweep);
            data.push({ key, path, percent: pct });
            start += sweep;
        });

        return data;
    }, [calorieMap, size, total]);

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
                borderColor: cardBorderColor,
                backgroundColor: cardBackgroundColor,
                padding: 12,
            }}
            onLayout={onLayout}
        >
            <Text style={{ fontWeight: '700', color: colorsTheme.text.primary }}>Macro distribution</Text>
            <Svg width={size} height={size} style={{ alignSelf: 'center', marginTop: 8 }}>
                {arcs.map((a) =>
                    a.path ? (
                        <Path
                            key={a.key}
                            d={a.path}
                            stroke={colors[a.key]}
                            fill="none"
                            strokeWidth={a.key === active ? 20 : 14}
                            strokeLinecap="round"
                        />
                    ) : null,
                )}
            </Svg>
            {!arcs.some((arc) => arc.path) ? (
                <Text style={{ textAlign: 'center', marginTop: 6, color: tertiaryTextColor, fontSize: 12 }}>
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
                            {Math.round((calorieMap[key] / total) * 100)}%
                        </Text>
                    </Pressable>
                ))}
            </View>
            <Text style={{ textAlign: 'center', marginTop: 8, color: tertiaryTextColor }}>
                {totalCalories} total kcal
            </Text>
            <Text style={{ textAlign: 'center', marginTop: 2, color: colorsTheme.text.primary, fontWeight: '700' }}>
                {active[0].toUpperCase() + active.slice(1)}: {macros[active]}g
            </Text>
        </View>
    );
}
