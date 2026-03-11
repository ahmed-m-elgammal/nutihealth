import React from 'react';
import { Text, View } from 'react-native';

type MacroSummaryBarProps = {
    consumed: { calories: number; protein: number; carbs: number; fats: number };
    goals: { calories: number; protein: number; carbs: number; fats: number };
};

type MacroProgress = {
    consumed: number;
    goal: number;
    ratio: number;
    barPercent: number;
};

export const calculateMacroProgress = (consumedValue: number, goalValue: number): MacroProgress => {
    const consumed = Number.isFinite(consumedValue) ? Math.max(0, consumedValue) : 0;
    const goal = Number.isFinite(goalValue) ? Math.max(0, goalValue) : 0;

    if (goal <= 0) {
        return { consumed, goal, ratio: 0, barPercent: 0 };
    }

    const ratio = consumed / goal;
    const barPercent = Math.min(100, Math.max(0, ratio * 100));

    return { consumed, goal, ratio, barPercent };
};

export default function MacroSummaryBar({ consumed, goals }: MacroSummaryBarProps) {
    const rows = [
        {
            key: 'calories',
            label: 'Calories',
            shortLabel: 'Kcal',
            color: '#16a34a',
            unit: 'kcal',
            progress: calculateMacroProgress(consumed.calories, goals.calories),
        },
        {
            key: 'protein',
            label: 'Protein',
            shortLabel: 'P',
            color: '#2563eb',
            unit: 'g',
            progress: calculateMacroProgress(consumed.protein, goals.protein),
        },
        {
            key: 'carbs',
            label: 'Carbs',
            shortLabel: 'C',
            color: '#d97706',
            unit: 'g',
            progress: calculateMacroProgress(consumed.carbs, goals.carbs),
        },
        {
            key: 'fats',
            label: 'Fats',
            shortLabel: 'F',
            color: '#db2777',
            unit: 'g',
            progress: calculateMacroProgress(consumed.fats, goals.fats),
        },
    ] as const;

    return (
        <View
            style={{
                marginTop: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: '#e5e7eb',
                backgroundColor: '#fff',
                padding: 12,
            }}
        >
            <Text style={{ fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>Macro progress</Text>
            <View style={{ gap: 10 }}>
                {rows.map((row) => (
                    <View key={row.key}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={{ fontSize: 12, color: '#334155', fontWeight: '700' }}>
                                {row.shortLabel} {Math.round(row.progress.consumed)}/{Math.round(row.progress.goal)}
                                {row.unit}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>
                                {Math.round(row.progress.ratio * 100)}%
                            </Text>
                        </View>
                        <View
                            style={{
                                height: 8,
                                borderRadius: 9999,
                                overflow: 'hidden',
                                backgroundColor: '#e2e8f0',
                            }}
                        >
                            <View
                                style={{
                                    width: `${row.progress.barPercent}%`,
                                    backgroundColor: row.color,
                                    height: '100%',
                                }}
                            />
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}
