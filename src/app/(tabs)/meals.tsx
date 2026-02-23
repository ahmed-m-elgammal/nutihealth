import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import EmptyState from '../../components/common/EmptyState';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import DatePickerStrip from '../../components/meals/DatePickerStrip';
import MacroSummaryBar from '../../components/meals/MacroSummaryBar';
import FoodItemCard from '../../components/meals/FoodItemCard';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useMeals } from '../../query/queries/useMeals';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';
import { useUIStore } from '../../store/uiStore';
import { triggerHaptic } from '../../utils/haptics';
import { MealsSkeleton } from '../../components/skeletons/ScreenSkeletons';
import { EmptyCalendarIllustration } from '../../components/illustrations/EmptyStateIllustrations';
import { database } from '../../database';
import Meal from '../../database/models/Meal';
import Food from '../../database/models/Food';
import { createMeal, deleteMeal, updateMeal, type FoodData, type MealData } from '../../services/api/meals';
import { syncService } from '../../services/api/sync';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type FoodListItem = {
    id: string;
    mealId: string;
    mealName: string;
    mealType: MealType;
    consumedAt: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    quantity: number;
    servingUnit?: string;
    brand: string;
    note?: string;
};

type MealsListRow =
    | {
          id: string;
          kind: 'header';
          mealType: MealType;
          calories: number;
      }
    | {
          id: string;
          kind: 'food';
          food: FoodListItem;
      };

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const normalizeMealType = (value: string): MealType => {
    const normalized = value.toLowerCase();
    if (normalized === 'breakfast' || normalized === 'lunch' || normalized === 'dinner' || normalized === 'snack') {
        return normalized;
    }
    return 'snack';
};

const mapFoodRecordToData = (food: Food): FoodData => ({
    name: food.name,
    brand: food.brand,
    barcode: food.barcode,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    quantity: food.quantity,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fats: food.fats,
    fiber: food.fiber,
    sugar: food.sugar,
    note: food.note,
});

const toMealDataFromRecord = async (mealRecord: Meal): Promise<MealData> => {
    const foods = await mealRecord.foods.fetch();

    return {
        name: mealRecord.name,
        mealType: normalizeMealType(mealRecord.mealType || 'snack'),
        consumedAt: new Date(mealRecord.consumedAt),
        photoUri: mealRecord.photoUri,
        notes: mealRecord.notes,
        foods: foods.map((food) => mapFoodRecordToData(food)),
    };
};

export default function MealsScreen() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const showToast = useUIStore((state) => state.showToast);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [expanded, setExpanded] = useState<Record<MealType, boolean>>({
        breakfast: true,
        lunch: true,
        dinner: true,
        snack: true,
    });
    const [foodsForDay, setFoodsForDay] = useState<FoodListItem[]>([]);

    const {
        data: meals = [],
        isLoading: isLoadingMeals,
        error: mealsError,
        refetch,
    } = useMeals(selectedDate, user?.id);

    useEffect(() => {
        let isActive = true;

        const loadFoods = async () => {
            if (!meals.length) {
                if (isActive) {
                    setFoodsForDay([]);
                }
                return;
            }

            const perMealFoods = await Promise.all(
                meals.map(async (meal) => {
                    const mealFoods = await meal.foods.fetch();
                    const mealType = normalizeMealType(meal.mealType || 'snack');

                    return mealFoods.map<FoodListItem>((food) => ({
                        id: food.id,
                        mealId: meal.id,
                        mealName: meal.name,
                        mealType,
                        consumedAt: meal.consumedAt,
                        name: food.name,
                        calories: food.calories * food.quantity,
                        protein: food.protein * food.quantity,
                        carbs: food.carbs * food.quantity,
                        fats: food.fats * food.quantity,
                        quantity: food.quantity,
                        servingUnit: food.servingUnit,
                        brand: food.brand || 'Logged food',
                        note: food.note,
                    }));
                }),
            );

            if (isActive) {
                setFoodsForDay(perMealFoods.flat().sort((a, b) => b.consumedAt - a.consumedAt));
            }
        };

        loadFoods().catch(() => {
            if (isActive) {
                setFoodsForDay([]);
            }
        });

        return () => {
            isActive = false;
        };
    }, [meals]);

    const nutrition = useMemo(
        () =>
            foodsForDay.reduce(
                (acc, food) => {
                    acc.protein += food.protein;
                    acc.carbs += food.carbs;
                    acc.fats += food.fats;
                    return acc;
                },
                { protein: 0, carbs: 0, fats: 0 },
            ),
        [foodsForDay],
    );

    const grouped = useMemo(() => {
        const init: Record<MealType, FoodListItem[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
        foodsForDay.forEach((food) => {
            if (init[food.mealType]) {
                init[food.mealType].push(food);
            }
        });
        return init;
    }, [foodsForDay]);

    const listRows = useMemo<MealsListRow[]>(() => {
        const rows: MealsListRow[] = [];

        MEAL_TYPES.forEach((mealType) => {
            const items = grouped[mealType];
            const calories = items.reduce((sum, item) => sum + item.calories, 0);
            rows.push({
                id: `header-${mealType}`,
                kind: 'header',
                mealType,
                calories,
            });

            if (expanded[mealType]) {
                items.forEach((food) => {
                    rows.push({
                        id: `food-${food.id}`,
                        kind: 'food',
                        food,
                    });
                });
            }
        });

        return rows;
    }, [expanded, grouped]);

    const goals = {
        protein: user?.proteinTarget || DEFAULT_TARGETS.protein,
        carbs: user?.carbsTarget || DEFAULT_TARGETS.carbs,
        fats: user?.fatsTarget || DEFAULT_TARGETS.fats,
    };

    const refreshMeals = async () => {
        if (isRefreshing) {
            return;
        }

        setIsRefreshing(true);
        try {
            const syncResult = await syncService.performSync();
            await refetch?.();

            if (!syncResult.success) {
                const syncError = syncResult.errors[0]?.error || 'Sync failed. Showing local data.';
                showToast('error', syncError);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to refresh meals.';
            showToast('error', message);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleDeleteFood = async (foodItem: FoodListItem) => {
        try {
            const mealRecord = await database.get<Meal>('meals').find(foodItem.mealId);
            const mealFoods = await mealRecord.foods.fetch();
            const snapshot = await toMealDataFromRecord(mealRecord);

            if (mealFoods.length <= 1) {
                await deleteMeal(mealRecord.id);
                showToast('warning', `${foodItem.name} removed`, 5000, {
                    label: 'Undo',
                    onPress: () => {
                        createMeal(snapshot)
                            .then(() => {
                                triggerHaptic('success').catch(() => undefined);
                                showToast('success', `${foodItem.name} restored`);
                            })
                            .catch((error) => {
                                const message = error instanceof Error ? error.message : 'Failed to restore food.';
                                showToast('error', message);
                            });
                    },
                });
                return;
            }

            const previousFoods = mealFoods.map((food) => mapFoodRecordToData(food));
            const remainingFoods = mealFoods.filter((food) => food.id !== foodItem.id).map((food) => mapFoodRecordToData(food));
            await updateMeal(mealRecord.id, { foods: remainingFoods });

            showToast('warning', `${foodItem.name} removed`, 5000, {
                label: 'Undo',
                onPress: () => {
                    updateMeal(mealRecord.id, { foods: previousFoods })
                        .then(() => {
                            triggerHaptic('success').catch(() => undefined);
                            showToast('success', `${foodItem.name} restored`);
                        })
                        .catch((error) => {
                            const message = error instanceof Error ? error.message : 'Failed to restore food.';
                            showToast('error', message);
                        });
                },
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to remove food.';
            showToast('error', message);
        }
    };

    const handleDuplicateFood = async (foodItem: FoodListItem) => {
        try {
            const mealRecord = await database.get<Meal>('meals').find(foodItem.mealId);
            const mealFoods = await mealRecord.foods.fetch();
            const sourceFood = mealFoods.find((food) => food.id === foodItem.id);

            if (!sourceFood) {
                throw new Error('Food item not found.');
            }

            const duplicateMeal: MealData = {
                name: `${sourceFood.name} (copy)`,
                mealType: normalizeMealType(mealRecord.mealType || foodItem.mealType),
                consumedAt: new Date(),
                notes: mealRecord.notes,
                foods: [mapFoodRecordToData(sourceFood)],
            };

            await createMeal(duplicateMeal);
            showToast('success', `${foodItem.name} duplicated`, 2500);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to duplicate food.';
            showToast('error', message);
        }
    };

    const handleEditFood = (foodItem: FoodListItem) => {
        router.push({
            pathname: '/(modals)/food-details',
            params: {
                mealId: foodItem.mealId,
                foodId: foodItem.id,
            },
        });
    };

    const saveFoodNote = async (foodItem: FoodListItem, nextNote: string) => {
        const mealRecord = await database.get<Meal>('meals').find(foodItem.mealId);
        const mealFoods = await mealRecord.foods.fetch();
        const updatedFoods = mealFoods.map((food) => ({
            ...mapFoodRecordToData(food),
            note: food.id === foodItem.id ? nextNote : food.note,
        }));
        await updateMeal(foodItem.mealId, { foods: updatedFoods });
    };

    const handleAddNote = (foodItem: FoodListItem) => {
        if (typeof Alert.prompt === 'function') {
            Alert.prompt(
                `Add note to ${foodItem.name}`,
                'Write a quick note',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Save',
                        onPress: (value?: string) => {
                            if (value == null) return;

                            saveFoodNote(foodItem, value.trim())
                                .then(() => {
                                    showToast('info', 'Food note saved', 2000);
                                })
                                .catch((error) => {
                                    const message = error instanceof Error ? error.message : 'Failed to save note.';
                                    showToast('error', message);
                                });
                        },
                    },
                ],
                'plain-text',
                foodItem.note || '',
            );
            return;
        }

        router.push({
            pathname: '/(modals)/food-details',
            params: {
                mealId: foodItem.mealId,
                foodId: foodItem.id,
                focusNote: '1',
            },
        });
    };

    const keyExtractor = useCallback((row: MealsListRow) => row.id, []);
    const getItemType = useCallback((row: MealsListRow) => row.kind, []);
    const renderRow = useCallback(
        ({ item }: ListRenderItemInfo<MealsListRow>) => {
            if (item.kind === 'header') {
                const isExpanded = Boolean(expanded[item.mealType]);
                return (
                    <Pressable
                        onPress={() => {
                            triggerHaptic('light').catch(() => undefined);
                            setExpanded((previous) => ({ ...previous, [item.mealType]: !previous[item.mealType] }));
                        }}
                        android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
                        style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            backgroundColor: '#fff',
                            paddingHorizontal: 14,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            overflow: 'hidden',
                            marginTop: 12,
                        }}
                    >
                        <View>
                            <Text style={{ fontWeight: '700', color: '#0f172a', textTransform: 'capitalize' }}>
                                {item.mealType}
                            </Text>
                            <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{Math.round(item.calories)} kcal</Text>
                        </View>
                        <Text style={{ color: '#334155', fontWeight: '700' }}>{isExpanded ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                );
            }

            return (
                <View style={{ marginTop: 8 }}>
                    <FoodItemCard
                        item={item.food}
                        onPress={() => handleEditFood(item.food)}
                        onDelete={() => handleDeleteFood(item.food)}
                        onDuplicate={() => handleDuplicateFood(item.food)}
                        onEdit={() => handleEditFood(item.food)}
                        onAddNote={() => handleAddNote(item.food)}
                    />
                </View>
            );
        },
        [expanded],
    );

    return (
        <ScreenErrorBoundary screenName="meals">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    refreshing={isRefreshing || isLoadingMeals}
                    onRefresh={() => {
                        refreshMeals().catch(() => undefined);
                    }}
                    header={
                        <View>
                            <DatePickerStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                            <MacroSummaryBar consumed={nutrition} goals={goals} />
                        </View>
                    }
                    headerHeight={200}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {isLoadingMeals ? (
                        <MealsSkeleton />
                    ) : mealsError ? (
                        <EmptyState
                            variant="error"
                            illustration={<EmptyCalendarIllustration />}
                            title="Couldn't load meals"
                            message={mealsError.message || 'Please try again.'}
                            actionLabel="Retry"
                            onAction={() => {
                                refreshMeals().catch(() => undefined);
                            }}
                        />
                    ) : foodsForDay.length === 0 ? (
                        <EmptyState
                            illustration={<EmptyCalendarIllustration />}
                            title="No meals for this day"
                            message="Try another date or add a meal to get your macro summary started."
                            actionLabel="Add Meal"
                            onAction={() => router.push('/(modals)/add-meal')}
                        />
                    ) : (
                        <FlashList
                            data={listRows}
                            keyExtractor={keyExtractor}
                            getItemType={getItemType}
                            renderItem={renderRow}
                            scrollEnabled={false}
                        />
                    )}

                    <View style={{ height: 10 }} />
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
