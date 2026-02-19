import React from 'react';
import { Text, View } from 'react-native';

type MacroSummaryBarProps = {
    consumed: { protein: number; carbs: number; fats: number };
    goals: { protein: number; carbs: number; fats: number };
};

export default function MacroSummaryBar({ consumed, goals }: MacroSummaryBarProps) {
    const total = 100;
    const p = Math.min(total, goals.protein > 0 ? (consumed.protein / goals.protein) * total : 0);
    const c = Math.min(total, goals.carbs > 0 ? (consumed.carbs / goals.carbs) * total : 0);
    const f = Math.min(total, goals.fats > 0 ? (consumed.fats / goals.fats) * total : 0);

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
            <Text style={{ fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>Macro progress</Text>
            <View
                style={{
                    flexDirection: 'row',
                    height: 10,
                    borderRadius: 9999,
                    overflow: 'hidden',
                    backgroundColor: '#e2e8f0',
                }}
            >
                <View style={{ width: `${p}%`, backgroundColor: '#3b82f6' }} />
                <View style={{ width: `${c}%`, backgroundColor: '#f59e0b' }} />
                <View style={{ width: `${f}%`, backgroundColor: '#ec4899' }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={{ fontSize: 12, color: '#334155' }}>
                    P {Math.round(consumed.protein)}/{goals.protein}g
                </Text>
                <Text style={{ fontSize: 12, color: '#334155' }}>
                    C {Math.round(consumed.carbs)}/{goals.carbs}g
                </Text>
                <Text style={{ fontSize: 12, color: '#334155' }}>
                    F {Math.round(consumed.fats)}/{goals.fats}g
                </Text>
            </View>
        </View>
    );
}
