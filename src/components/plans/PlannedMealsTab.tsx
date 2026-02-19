import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

type Macro = { protein: number; carbs: number; fats: number };

type PlannedMeal = {
    type: string;
    time?: string;
    foods: { name: string; amount: string; macros: Macro }[];
    targetCalories: number;
};

type PlannedMealsTabProps = {
    plannedMeals: PlannedMeal[];
    onFoodPress: (foodName: string) => void;
};

const mealColor: Record<string, string> = {
    breakfast: '#f59e0b',
    lunch: '#10b981',
    dinner: '#3b82f6',
    snack: '#ec4899',
};

export default function PlannedMealsTab({ plannedMeals, onFoodPress }: PlannedMealsTabProps) {
    return (
        <FlashList
            data={plannedMeals}
            estimatedItemSize={120}
            keyExtractor={(item) => `${item.type}-${item.time || 't'}`}
            scrollEnabled={false}
            renderItem={({ item }) => {
                const accent = mealColor[item.type.toLowerCase()] || '#64748b';
                return (
                    <View
                        style={{
                            marginTop: 10,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            backgroundColor: '#fff',
                            overflow: 'hidden',
                        }}
                    >
                        <View style={{ height: 4, backgroundColor: accent }} />
                        <View style={{ padding: 12 }}>
                            <Text style={{ color: '#0f172a', fontWeight: '700', textTransform: 'capitalize' }}>
                                {item.type}
                                {item.time ? ` • ${item.time}` : ''}
                            </Text>
                            <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                                Target {item.targetCalories} kcal
                            </Text>

                            <View style={{ marginTop: 8, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                {item.foods.map((food) => (
                                    <Pressable
                                        key={`${item.type}-${food.name}`}
                                        onPress={() => onFoodPress(food.name)}
                                        android_ripple={{ color: 'rgba(15,23,42,0.08)' }}
                                        style={{
                                            borderRadius: 999,
                                            backgroundColor: '#f1f5f9',
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <Text style={{ color: '#334155', fontSize: 11, fontWeight: '600' }}>
                                            {food.name} • {food.amount}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>
                );
            }}
        />
    );
}
