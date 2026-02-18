import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import MealCard from '../meal/MealCard';

type Meal = {
    id: string;
    name: string;
    mealType: string;
    consumedAt: Date;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFats: number;
    foods: any[];
};

type MealTimelineProps = {
    meals: Meal[];
    onEditMeal: (id: string) => void;
    onDeleteMeal: (id: string) => void;
};

export default function MealTimeline({ meals, onEditMeal, onDeleteMeal }: MealTimelineProps) {
    const grouped = useMemo(() => {
        const order = ['breakfast', 'lunch', 'dinner', 'snack'];
        const map = new Map<string, Meal[]>();
        meals.forEach((meal) => {
            const key = meal.mealType || 'other';
            const list = map.get(key) || [];
            list.push(meal);
            map.set(key, list);
        });

        return [...map.entries()].sort((a, b) => {
            const ai = order.indexOf(a[0]);
            const bi = order.indexOf(b[0]);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
    }, [meals]);

    if (!meals.length) {
        return (
            <View
                style={{
                    marginTop: 16,
                    borderStyle: 'dashed',
                    borderWidth: 1,
                    borderColor: '#94a3b8',
                    borderRadius: 16,
                    padding: 18,
                }}
            >
                <Text style={{ textAlign: 'center', color: '#475569' }}>
                    No meals logged yet. Tap “Log Meal” to get started.
                </Text>
            </View>
        );
    }

    return (
        <View style={{ marginTop: 16, gap: 12 }}>
            {grouped.map(([section, data]) => (
                <View key={section}>
                    <Text
                        style={{
                            fontWeight: '700',
                            fontSize: 13,
                            color: '#334155',
                            textTransform: 'capitalize',
                            marginBottom: 8,
                        }}
                    >
                        {section}
                    </Text>
                    <FlashList
                        data={data}
                        estimatedItemSize={100}
                        scrollEnabled={false}
                        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <MealCard
                                meal={item as any}
                                onEdit={() => onEditMeal(item.id)}
                                onDelete={() => onDeleteMeal(item.id)}
                            />
                        )}
                    />
                </View>
            ))}
        </View>
    );
}
