import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';

interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

interface MealSectionProps {
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    meals: FoodItem[];
    onAddPress: () => void;
    recommendedCalories: string;
}

const mealIcons = {
    breakfast: '☀️',
    lunch: '🌤️',
    dinner: '🌙',
    snack: '🍎',
};

const mealTitles = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
};

export default function MealSection({ type, meals, onAddPress, recommendedCalories }: MealSectionProps) {
    const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
    const icon = mealIcons[type];
    const title = mealTitles[type];

    return (
        <View className="mb-6">
            {/* Section Header */}
            <View className="flex-row justify-between items-center mb-3 px-1">
                <View className="flex-row items-center">
                    <Text className="text-2xl mr-2">{icon}</Text>
                    <Text className="text-lg font-bold text-neutral-800">{title}</Text>
                </View>
                <Text className="text-neutral-500 text-sm">
                    {totalCalories} / {recommendedCalories}
                </Text>
            </View>

            {/* Meals List or Empty State */}
            {meals.length > 0 ? (
                <View className="space-y-3">
                    {meals.map((meal) => (
                        <View
                            key={meal.id}
                            className="bg-white p-4 rounded-2xl border border-neutral-100 shadow-sm"
                        >
                            <View className="flex-row justify-between items-center">
                                <View className="flex-1">
                                    <Text className="font-semibold text-neutral-900 text-base">
                                        {meal.name}
                                    </Text>
                                    <Text className="text-neutral-400 text-xs mt-1">
                                        {meal.protein}g P • {meal.carbs}g C • {meal.fats}g F
                                    </Text>
                                </View>
                                <Text className="font-bold text-neutral-700 ml-4">
                                    {meal.calories}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <View className="bg-white border-2 border-dashed border-neutral-200 rounded-2xl p-6 items-center justify-center">
                    <Text className="text-neutral-400 font-medium">No meals logged</Text>
                </View>
            )}

            {/* Add Button */}
            <TouchableOpacity
                className="flex-row items-center justify-center mt-3 py-2"
                onPress={onAddPress}
                activeOpacity={0.7}
            >
                <Plus size={16} color="#10b981" />
                <Text className="text-primary-600 font-semibold ml-2">Add {title}</Text>
            </TouchableOpacity>
        </View>
    );
}
