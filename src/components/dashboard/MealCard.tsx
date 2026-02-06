import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Flame, ChevronRight } from 'lucide-react-native';

interface MealCardProps {
    title: string;
    calories: number;
    time: string;
    type: string;
    onPress?: () => void;
}

export default function MealCard({ title, calories, time, type, onPress }: MealCardProps) {
    return (
        <Pressable
            onPress={onPress}
            className="bg-white p-4 rounded-2xl border border-neutral-100 flex-row items-center justify-between shadow-sm active:opacity-70"
        >
            <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 bg-orange-50 rounded-xl items-center justify-center mr-3">
                    <Flame size={20} color="#f97316" />
                </View>
                <View className="flex-1">
                    <Text className="text-neutral-900 font-semibold text-base">
                        {title}
                    </Text>
                    <Text className="text-neutral-400 text-xs mt-0.5">
                        {type} • {time}
                    </Text>
                </View>
            </View>
            <View className="flex-row items-center">
                <Text className="text-neutral-900 font-bold text-sm mr-2">
                    {calories} kcal
                </Text>
                <ChevronRight size={16} color="#a3a3a3" />
            </View>
        </Pressable>
    );
}
