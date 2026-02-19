import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useMeals } from '../../query/queries/useMeals';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';
import DatePickerStrip from '../../components/meals/DatePickerStrip';
import MacroSummaryBar from '../../components/meals/MacroSummaryBar';
import CollapsibleMealSection from '../../components/meals/CollapsibleMealSection';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import { useUIStore } from '../../store/uiStore';
import { triggerHaptic } from '../../utils/haptics';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type FoodItem = {
    id: string;
    mealType: MealType;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    quantity: number;
    brand: string;
    note?: string;
};

export default function MealsScreen() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const showToast = useUIStore((state) => state.showToast);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        breakfast: true,
        lunch: true,
        dinner: true,
        snack: true,
    });
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    const [localFoods, setLocalFoods] = useState<FoodItem[]>([]);

    const { data: meals = [] } = useMeals(selectedDate);

    const baseFoods = useMemo<FoodItem[]>(
        () =>
            meals.map((meal) => {
                const mealType = (meal.mealType || 'snack').toLowerCase() as MealType;
                return {
                    id: meal.id,
                    mealType,
                    name: meal.name,
                    calories: meal.totalCalories,
                    protein: meal.totalProtein,
                    carbs: meal.totalCarbs,
                    fats: meal.totalFats,
                    quantity: 1,
                    brand: 'Logged meal',
                };
            }),
        [meals],
    );

    const visibleFoods = useMemo(
        () => [...baseFoods, ...localFoods].filter((food) => !hiddenIds.has(food.id)),
        [baseFoods, hiddenIds, localFoods],
    );

    const nutrition = useMemo(
        () =>
            visibleFoods.reduce(
                (acc, meal) => {
                    acc.protein += meal.protein;
                    acc.carbs += meal.carbs;
                    acc.fats += meal.fats;
                    return acc;
                },
                { protein: 0, carbs: 0, fats: 0 },
            ),
        [visibleFoods],
    );

    const grouped = useMemo(() => {
        const init: Record<MealType, FoodItem[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
        visibleFoods.forEach((meal) => {
            if (init[meal.mealType]) {
                init[meal.mealType].push(meal);
            }
        });
        return init;
    }, [visibleFoods]);

    const goals = {
        protein: user?.proteinTarget || DEFAULT_TARGETS.protein,
        carbs: user?.carbsTarget || DEFAULT_TARGETS.carbs,
        fats: user?.fatsTarget || DEFAULT_TARGETS.fats,
    };

    const handleDeleteFood = (food: FoodItem) => {
        setHiddenIds((prev) => {
            const next = new Set(prev);
            next.add(food.id);
            return next;
        });

        showToast('warning', `${food.name} removed`, 5000, {
            label: 'Undo',
            onPress: () => {
                triggerHaptic('success').catch(() => undefined);
                setHiddenIds((prev) => {
                    const next = new Set(prev);
                    next.delete(food.id);
                    return next;
                });
            },
        });
    };

    const handleDuplicateFood = (food: FoodItem) => {
        const duplicate: FoodItem = {
            ...food,
            id: `${food.id}-dup-${Date.now()}`,
            name: `${food.name} (copy)`,
        };
        setLocalFoods((prev) => [duplicate, ...prev]);
        showToast('success', `${food.name} duplicated`, 2500);
    };

    const handleEditFood = (food: FoodItem) => {
        showToast('info', `Edit ${food.name} in Food Details`, 2500);
        router.push({
            pathname: '/(modals)/food-details',
            params: {
                transitionId: `food-card-${food.id}`,
                food: JSON.stringify(food),
            },
        });
    };

    const handleAddNote = (food: FoodItem) => {
        Alert.prompt?.(
            `Add note to ${food.name}`,
            'Write a quick note',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Save',
                    onPress: (value) => {
                        if (!value) return;
                        setLocalFoods((prev) =>
                            prev.map((entry) => (entry.id === food.id ? { ...entry, note: value } : entry)),
                        );
                        showToast('info', 'Meal note saved', 2000);
                    },
                },
            ],
            'plain-text',
            food.note || '',
        );
    };

    return (
        <ScreenErrorBoundary screenName="meals">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    header={
                        <View>
                            <DatePickerStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                            <MacroSummaryBar consumed={nutrition} goals={goals} />
                        </View>
                    }
                    headerHeight={200}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {(Object.keys(grouped) as MealType[]).map((type) => {
                        const mealsForType = grouped[type];
                        const sectionCalories = mealsForType.reduce((sum, meal) => sum + meal.calories, 0);

                        return (
                            <CollapsibleMealSection
                                key={type}
                                title={type}
                                calories={sectionCalories}
                                foods={mealsForType}
                                expanded={Boolean(expanded[type])}
                                onToggle={() => setExpanded((p) => ({ ...p, [type]: !p[type] }))}
                                onFoodPress={(food) => {
                                    router.push({
                                        pathname: '/(modals)/food-details',
                                        params: {
                                            transitionId: `food-card-${food.id}`,
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
                                onDeleteFood={handleDeleteFood}
                                onDuplicateFood={handleDuplicateFood}
                                onEditFood={handleEditFood}
                                onAddNoteFood={handleAddNote}
                            />
                        );
                    })}

                    <View style={{ height: 10 }} />
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
