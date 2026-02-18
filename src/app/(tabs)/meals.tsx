import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useMeals } from '../../query/queries/useMeals';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';
import DatePickerStrip from '../../components/meals/DatePickerStrip';
import MacroSummaryBar from '../../components/meals/MacroSummaryBar';
import CollapsibleMealSection from '../../components/meals/CollapsibleMealSection';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export default function MealsScreen() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        breakfast: true,
        lunch: true,
        dinner: true,
        snack: true,
    });

    const { data: meals = [] } = useMeals(selectedDate);

    const nutrition = useMemo(
        () =>
            meals.reduce(
                (acc, meal) => {
                    acc.protein += meal.totalProtein;
                    acc.carbs += meal.totalCarbs;
                    acc.fats += meal.totalFats;
                    return acc;
                },
                { protein: 0, carbs: 0, fats: 0 },
            ),
        [meals],
    );

    const grouped = useMemo(() => {
        const init: Record<MealType, any[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
        meals.forEach((meal) => {
            const key = (meal.mealType || 'snack').toLowerCase() as MealType;
            if (init[key]) {
                init[key].push(meal);
            }
        });
        return init;
    }, [meals]);

    const goals = {
        protein: user?.proteinTarget || DEFAULT_TARGETS.protein,
        carbs: user?.carbsTarget || DEFAULT_TARGETS.carbs,
        fats: user?.fatsTarget || DEFAULT_TARGETS.fats,
    };

    const toFoods = (meal: any) => [
        {
            id: meal.id,
            name: meal.name,
            calories: meal.totalCalories,
            protein: meal.totalProtein,
            carbs: meal.totalCarbs,
            fats: meal.totalFats,
            quantity: 1,
            brand: 'Logged meal',
        },
    ];

    return (
        <ScreenErrorBoundary screenName="meals">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
                    <DatePickerStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

                    <MacroSummaryBar consumed={nutrition} goals={goals} />

                    {(Object.keys(grouped) as MealType[]).map((type) => {
                        const mealsForType = grouped[type];
                        const sectionCalories = mealsForType.reduce((sum, meal) => sum + meal.totalCalories, 0);
                        const foods = mealsForType.flatMap(toFoods);

                        return (
                            <CollapsibleMealSection
                                key={type}
                                title={type}
                                calories={sectionCalories}
                                foods={foods}
                                expanded={Boolean(expanded[type])}
                                onToggle={() => setExpanded((p) => ({ ...p, [type]: !p[type] }))}
                                onFoodPress={(food) => {
                                    router.push({
                                        pathname: '/(modals)/food-details',
                                        params: {
                                            food: JSON.stringify({
                                                name: food.name,
                                                brand: food.brand,
                                                calories: food.calories,
                                                protein: food.protein,
                                                carbs: food.carbs,
                                                fats: food.fats,
                                            }),
                                        },
                                    });
                                }}
                            />
                        );
                    })}

                    <View style={{ height: 10 }} />
                </ScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
