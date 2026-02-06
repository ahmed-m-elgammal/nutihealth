import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MoreVertical, Trash2 } from 'lucide-react-native';
import type Meal from '@database/models/Meal';

interface MealCardProps {
    meal: Meal;
    onEdit: () => void;
    onDelete: () => void;
}

export default function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
    const time = new Date(meal.consumedAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    return (
        <TouchableOpacity
            onPress={onEdit}
            className="bg-white rounded-xl p-4 mb-2 border border-gray-100"
        >
            <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{meal.name}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{time}</Text>
                </View>
                <TouchableOpacity onPress={onDelete} className="p-1">
                    <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {meal.notes && (
                <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                    {meal.notes}
                </Text>
            )}

            <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
                <View className="items-center">
                    <Text className="text-lg font-bold text-gray-900">
                        {Math.round(meal.totalCalories)}
                    </Text>
                    <Text className="text-xs text-gray-500">kcal</Text>
                </View>
                <View className="items-center">
                    <Text className="text-sm font-semibold text-green-600">
                        {Math.round(meal.totalProtein)}g
                    </Text>
                    <Text className="text-xs text-gray-500">Protein</Text>
                </View>
                <View className="items-center">
                    <Text className="text-sm font-semibold text-blue-600">
                        {Math.round(meal.totalCarbs)}g
                    </Text>
                    <Text className="text-xs text-gray-500">Carbs</Text>
                </View>
                <View className="items-center">
                    <Text className="text-sm font-semibold text-orange-600">
                        {Math.round(meal.totalFats)}g
                    </Text>
                    <Text className="text-xs text-gray-500">Fats</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}
