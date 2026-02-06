import React from 'react';
import { View, Text } from 'react-native';

interface MacroItemProps {
    label: string;
    value: string;
    color: string; // Tailwind class name like 'bg-blue-500'
}

export default function MacroItem({ label, value, color }: MacroItemProps) {
    return (
        <View className="items-center">
            <Text className="text-neutral-400 text-xs mb-1 font-medium bg-neutral-100 px-2 py-0.5 rounded-full">
                {label}
            </Text>
            <Text className="text-neutral-900 font-bold text-sm">{value}</Text>
            <View className="w-12 h-1.5 bg-neutral-100 rounded-full mt-1 overflow-hidden">
                <View className={`h-full ${color} w-1/2`} />
            </View>
        </View>
    );
}
