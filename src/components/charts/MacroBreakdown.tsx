import React from 'react';
import { View, Text } from 'react-native';

interface MacroData {
    current: number;
    target: number;
    percentage: number;
}

interface MacroBreakdownProps {
    protein: MacroData;
    carbs: MacroData;
    fats: MacroData;
}

export default function MacroBreakdown({ protein, carbs, fats }: MacroBreakdownProps) {
    const MacroBar = ({ label, data, color }: { label: string; data: MacroData; color: string }) => (
        <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs font-medium text-gray-700">{label}</Text>
                <Text className="text-xs text-gray-500">
                    {Math.round(data.current)}/{data.target}g
                </Text>
            </View>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <View
                    style={{
                        width: `${Math.min(data.percentage, 100)}%`,
                        backgroundColor: color,
                    }}
                    className="h-full rounded-full"
                />
            </View>
        </View>
    );

    return (
        <View className="flex-row space-x-3">
            <MacroBar label="Protein" data={protein} color="#22C55E" />
            <MacroBar label="Carbs" data={carbs} color="#3B82F6" />
            <MacroBar label="Fats" data={fats} color="#F97316" />
        </View>
    );
}
