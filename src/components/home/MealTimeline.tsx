import React, { memo, useCallback, useMemo } from 'react';
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
};

type FlattenedItem = { id: string; kind: 'header'; title: string } | { id: string; kind: 'meal'; meal: Meal };

const HeaderItem = memo(({ title }: { title: string }) => (
    <Text
        style={{
            fontWeight: '700',
            fontSize: 13,
            color: '#334155',
            textTransform: 'capitalize',
            marginTop: 4,
            marginBottom: 8,
        }}
    >
        {title}
    </Text>
));

function MealTimeline({ meals }: MealTimelineProps) {
    const flattened = useMemo<FlattenedItem[]>(() => {
        const order = ['breakfast', 'lunch', 'dinner', 'snack'];
        const map = new Map<string, Meal[]>();
        meals.forEach((meal) => {
            const key = meal.mealType || 'other';
            const list = map.get(key) || [];
            list.push(meal);
            map.set(key, list);
        });

        const grouped = [...map.entries()].sort((a, b) => {
            const ai = order.indexOf(a[0]);
            const bi = order.indexOf(b[0]);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });

        return grouped.flatMap(([section, data]) => [
            { id: `header-${section}`, kind: 'header', title: section } as const,
            ...data.map((meal) => ({ id: meal.id, kind: 'meal', meal }) as const),
        ]);
    }, [meals]);

    const keyExtractor = useCallback((item: FlattenedItem) => item.id, []);
    const getItemType = useCallback((item: FlattenedItem) => item.kind, []);

    const renderItem = useCallback(({ item }: { item: FlattenedItem }) => {
        if (item.kind === 'header') {
            return <HeaderItem title={item.title} />;
        }

        return <MealCard meal={item.meal as any} />;
    }, []);

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
        <View style={{ marginTop: 16 }}>
            <FlashList
                data={flattened}
                estimatedItemSize={96}
                keyExtractor={keyExtractor}
                getItemType={getItemType}
                scrollEnabled={false}
                renderItem={renderItem}
            />
        </View>
    );
}

export default memo(MealTimeline);
