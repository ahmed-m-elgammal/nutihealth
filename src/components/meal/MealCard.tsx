import React from 'react';
import { View, Text } from 'react-native';
import type Meal from '@database/models/Meal';

interface MealCardProps {
    meal: Meal;
}

function MealCard({ meal }: MealCardProps) {
    const time = new Date(meal.consumedAt).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    return (
        <View className="mb-2 rounded-xl border border-gray-100 bg-white p-4">
            <View className="mb-2 flex-row items-start justify-between">
                <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{meal.name}</Text>
                    <Text className="mt-1 text-xs text-gray-500">{time}</Text>
                </View>
            </View>

            {meal.notes && (
                <Text className="mb-2 text-sm text-gray-600" numberOfLines={2}>
                    {meal.notes}
                </Text>
            )}

            <View className="mt-2 flex-row justify-between border-t border-gray-100 pt-2">
                <View className="items-center">
                    <Text className="text-lg font-bold text-gray-900">{Math.round(meal.totalCalories)}</Text>
                    <Text className="text-xs text-gray-500">kcal</Text>
                </View>
                <View className="items-center">
                    <Text className="text-sm font-semibold text-green-600">{Math.round(meal.totalProtein)}g</Text>
                    <Text className="text-xs text-gray-500">Protein</Text>
                </View>
                <View className="items-center">
                    <Text className="text-sm font-semibold text-blue-600">{Math.round(meal.totalCarbs)}g</Text>
                    <Text className="text-xs text-gray-500">Carbs</Text>
                </View>
                <View className="items-center">
                    <Text className="text-sm font-semibold text-orange-600">{Math.round(meal.totalFats)}g</Text>
                    <Text className="text-xs text-gray-500">Fats</Text>
                </View>
            </View>
        </View>
    );
}

export default React.memo(MealCard);
