import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useMeals } from '../../query/queries/useMeals';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import HomeHeader from '../../components/home/HomeHeader';
import CalorieRingCard from '../../components/home/CalorieRingCard';
import QuickActionsGrid from '../../components/home/QuickActionsGrid';
import MealTimeline from '../../components/home/MealTimeline';
import MealSuggestionBanner from '../../components/home/MealSuggestionBanner';
import AdherenceStrip from '../../components/home/AdherenceStrip';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const userName = user?.name || 'User';
    const streak = 12;
    const [isSuggestionDismissed, setIsSuggestionDismissed] = useState(false);

    const today = new Date();
    const { data: meals = [], isLoading: isLoadingMeals, refetch } = useMeals(today);

    const nutrition = useMemo(
        () =>
            meals.reduce(
                (acc, meal) => {
                    acc.calories += meal.totalCalories;
                    acc.protein += meal.totalProtein;
                    acc.carbs += meal.totalCarbs;
                    acc.fats += meal.totalFats;

                    return acc;
                },
                { calories: 0, protein: 0, carbs: 0, fats: 0 },
            ),
        [meals],
    );

    const goals = {
        calories: user?.calorieTarget || DEFAULT_TARGETS.calories,
        protein: user?.proteinTarget || DEFAULT_TARGETS.protein,
        carbs: user?.carbsTarget || DEFAULT_TARGETS.carbs,
        fats: user?.fatsTarget || DEFAULT_TARGETS.fats,
    };

    const adherence = goals.calories > 0 ? (nutrition.calories / goals.calories) * 100 : 0;

    const loggedMealTypes = new Set(meals.map((meal) => meal.mealType as MealType));
    const suggestedType = MEAL_ORDER.find((type) => !loggedMealTypes.has(type));

    return (
        <ScreenErrorBoundary screenName="home">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    refreshing={isLoadingMeals}
                    onRefresh={() => {
                        refetch().catch(() => undefined);
                    }}
                    header={
                        <HomeHeader
                            userName={userName}
                            streak={streak}
                            onAvatarPress={() => router.push('/(tabs)/profile')}
                        />
                    }
                >
                    <View style={{ paddingHorizontal: 16 }}>
                        <Animated.View entering={FadeInDown.duration(280)}>
                            <CalorieRingCard
                                consumedCalories={nutrition.calories}
                                goalCalories={goals.calories}
                                macros={{
                                    protein: nutrition.protein,
                                    carbs: nutrition.carbs,
                                    fats: nutrition.fats,
                                }}
                                macroGoals={{
                                    protein: goals.protein,
                                    carbs: goals.carbs,
                                    fats: goals.fats,
                                }}
                                delta={
                                    meals.length > 0
                                        ? `↑ ${Math.round(meals[0]?.totalCalories || 0)} since last meal`
                                        : undefined
                                }
                            />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(80).duration(300)}>
                            <QuickActionsGrid
                                onLogMeal={() => router.push('/(modals)/add-meal')}
                                onScanFood={() => router.push('/(modals)/barcode-scanner')}
                                onSearchFood={() => router.push('/(modals)/food-search')}
                                onDetectAi={() => router.push('/(modals)/ai-food-detect')}
                            />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(120).duration(320)}>
                            <MealSuggestionBanner
                                visible={Boolean(suggestedType) && !isSuggestionDismissed}
                                mealName={
                                    suggestedType ? suggestedType[0].toUpperCase() + suggestedType.slice(1) : 'Meal'
                                }
                                targetCalories={Math.round(goals.calories / 4)}
                                onLogMeal={() => router.push('/(modals)/add-meal')}
                                onDismiss={() => setIsSuggestionDismissed(true)}
                            />
                        </Animated.View>

                        {meals.length > 0 ? (
                            <Animated.View entering={FadeInDown.delay(140).duration(340)}>
                                <AdherenceStrip percentage={adherence} />
                            </Animated.View>
                        ) : null}

                        <Animated.View entering={FadeInDown.delay(180).duration(360)}>
                            <MealTimeline
                                meals={meals as any}
                                onEditMeal={() => Alert.alert('Coming soon', 'Meal editing is coming in phase 4.')}
                                onDeleteMeal={() =>
                                    Alert.alert('Coming soon', 'Meal delete flow is coming in phase 4.')
                                }
                            />
                        </Animated.View>
                    </View>
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
