import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Plus, Scan, Search, Settings } from 'lucide-react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import CalorieCircle from '../../components/charts/CalorieCircle';
import ProgressBar from '../../components/charts/ProgressBar';
import MealSection from '../../components/meal/MealSection';
import { useMeals } from '../../query/queries/useMeals';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { getTodaysMacros } from '../../services/api/weeklyGoals';
import { DailyMacros } from '../../types/models';
import { needsBodyMetrics, buildCompleteProfileRoute } from '../../utils/profileCompletion';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';

export default function MealsScreen() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const today = new Date();
    const { data: meals, isLoading: isLoadingMeals } = useMeals(today);
    const isLoadingStats = isLoadingMeals;
    const [weeklyPlanMacros, setWeeklyPlanMacros] = useState<DailyMacros | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);

    const nutrition = useMemo(
        () =>
            (meals || []).reduce(
                (acc, meal) => {
                    acc.totalCalories += meal.totalCalories;
                    acc.totalProtein += meal.totalProtein;
                    acc.totalCarbs += meal.totalCarbs;
                    acc.totalFats += meal.totalFats;
                    return acc;
                },
                {
                    totalCalories: 0,
                    totalProtein: 0,
                    totalCarbs: 0,
                    totalFats: 0,
                },
            ),
        [meals],
    );

    const handleMealEntryAction = (route: string) => {
        if (needsBodyMetrics(user)) {
            Alert.alert('Complete profile first', 'Add your height and weight once to personalize meal logging.', [
                { text: 'Not now', style: 'cancel' },
                {
                    text: 'Add now',
                    onPress: () => router.push(buildCompleteProfileRoute(route) as any),
                },
            ]);
            return;
        }

        router.push(route as any);
    };

    // Fetch active weekly plan macros
    useEffect(() => {
        const loadWeeklyMacros = async () => {
            try {
                const macros = await getTodaysMacros();
                setWeeklyPlanMacros(macros);
            } catch (error) {
                // Silent fail - no active plan is okay
            } finally {
                setIsLoadingPlan(false);
            }
        };
        loadWeeklyMacros();
    }, []);

    // Use weekly plan macros if available, otherwise use user's default targets
    const targetCalories = weeklyPlanMacros?.calories || user?.calorieTarget || DEFAULT_TARGETS.calories;
    const targetProtein = weeklyPlanMacros?.protein || user?.proteinTarget || DEFAULT_TARGETS.protein;
    const targetCarbs = weeklyPlanMacros?.carbs || user?.carbsTarget || DEFAULT_TARGETS.carbs;
    const targetFats = weeklyPlanMacros?.fats || user?.fatsTarget || DEFAULT_TARGETS.fats;

    const currentCalories = nutrition.totalCalories;

    const macros = {
        protein: { current: nutrition.totalProtein, target: targetProtein },
        carbs: { current: nutrition.totalCarbs, target: targetCarbs },
        fats: { current: nutrition.totalFats, target: targetFats },
    };

    // Group meals by type
    const mealSections = useMemo(() => {
        const sections = {
            breakfast: { logged: [] as any[], recommended: '400-600', consumed: 0 },
            lunch: { logged: [] as any[], recommended: '500-700', consumed: 0 },
            dinner: { logged: [] as any[], recommended: '600-800', consumed: 0 },
            snacks: { logged: [] as any[], recommended: '100-300', consumed: 0 },
            snack: { logged: [] as any[], recommended: '100-300', consumed: 0 }, // handle both singular/plural if needed
        };

        if (meals) {
            meals.forEach((meal) => {
                const type = meal.mealType.toLowerCase();
                // Map 'snack' to 'snacks' if needed, or keep as is. MealSection expects 'snack'.
                const sectionKey = type === 'snacks' ? 'snack' : type;

                if (sections[sectionKey as keyof typeof sections]) {
                    sections[sectionKey as keyof typeof sections].logged.push({
                        id: meal.id,
                        name: meal.name,
                        calories: meal.totalCalories,
                        protein: meal.totalProtein,
                        carbs: meal.totalCarbs,
                        fats: meal.totalFats,
                    });
                    sections[sectionKey as keyof typeof sections].consumed += meal.totalCalories;
                }
            });
        }
        return sections;
    }, [meals]);

    if (isLoadingStats || isLoadingMeals) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-neutral-50">
                <ActivityIndicator size="large" color="#10b981" />
            </SafeAreaView>
        );
    }

    return (
        <ScreenErrorBoundary screenName="meals">
            <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
                {/* Header */}
                <View className="z-10 flex-row items-center justify-between border-b border-neutral-100 bg-white px-6 py-4 shadow-sm">
                    <View className="flex-1">
                        <Text className="text-2xl font-bold text-neutral-900">Today's Meals</Text>
                        <View className="mt-1 flex-row items-center">
                            <Calendar size={14} color="#737373" />
                            <Text className="ml-1 text-sm font-medium text-neutral-500">
                                {format(new Date(), 'EEE, MMM d')}
                            </Text>
                        </View>
                        {/* Weekly Plan Badge */}
                        {!isLoadingPlan && weeklyPlanMacros && (
                            <TouchableOpacity
                                onPress={() => router.push('/(modals)/weekly-plans' as any)}
                                className="mt-1 self-start rounded-full bg-primary-100 px-2 py-1"
                            >
                                <Text className="text-xs font-semibold text-primary-700">📊 Weekly Plan Active</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View className="flex-row gap-2">
                        <TouchableOpacity
                            onPress={() => router.push('/(modals)/weekly-plans' as any)}
                            className="rounded-full bg-neutral-100 p-2"
                        >
                            <Settings size={20} color="#171717" />
                        </TouchableOpacity>
                        <TouchableOpacity className="rounded-full bg-neutral-100 p-2">
                            <Calendar size={20} color="#171717" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                    {/* Enhanced Calorie Card */}
                    <View className="mb-8 items-center rounded-3xl bg-primary-600 p-6 shadow-xl">
                        <Text className="mb-4 font-medium text-white/90">Calories Today</Text>
                        <CalorieCircle current={currentCalories} target={targetCalories} size={160} />
                        <Text className="mt-4 text-sm text-white/80">
                            {Math.max(0, targetCalories - currentCalories)} kcal remaining
                        </Text>
                    </View>

                    {/* Macro Breakdown with Progress Bars */}
                    <View className="mb-8 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
                        <Text className="mb-4 text-lg font-bold text-neutral-900">Macronutrients</Text>
                        <View className="space-y-4">
                            <ProgressBar
                                current={macros.protein.current}
                                target={macros.protein.target}
                                color="bg-blue-500"
                                label="Protein"
                            />
                            <ProgressBar
                                current={macros.carbs.current}
                                target={macros.carbs.target}
                                color="bg-orange-500"
                                label="Carbs"
                            />
                            <ProgressBar
                                current={macros.fats.current}
                                target={macros.fats.target}
                                color="bg-purple-500"
                                label="Fats"
                            />
                        </View>
                    </View>

                    {/* Quick Add Buttons */}
                    <View className="mb-8 flex-row justify-between gap-3">
                        <TouchableOpacity
                            className="flex-1 items-center rounded-2xl bg-primary-600 p-4 shadow-lg active:opacity-80"
                            onPress={() => handleMealEntryAction('/(modals)/add-meal')}
                        >
                            <View className="mb-1 rounded-full bg-white/20 p-2">
                                <Plus size={20} color="white" />
                            </View>
                            <Text className="text-sm font-bold text-white">Add Meal</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 items-center rounded-2xl bg-blue-500 p-4 shadow-lg active:opacity-80"
                            onPress={() => handleMealEntryAction('/(modals)/barcode-scanner')}
                        >
                            <View className="mb-1 rounded-full bg-white/20 p-2">
                                <Scan size={20} color="white" />
                            </View>
                            <Text className="text-sm font-bold text-white">Scan</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 items-center rounded-2xl bg-amber-500 p-4 shadow-lg active:opacity-80"
                            onPress={() => handleMealEntryAction('/(modals)/food-search')}
                        >
                            <View className="mb-1 rounded-full bg-white/20 p-2">
                                <Search size={20} color="white" />
                            </View>
                            <Text className="text-sm font-bold text-white">Search</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Meal Sections */}
                    <View className="space-y-6">
                        <MealSection
                            type="breakfast"
                            meals={mealSections.breakfast.logged}
                            onAddPress={() => {}}
                            recommendedCalories={mealSections.breakfast.recommended}
                        />
                        <MealSection
                            type="lunch"
                            meals={mealSections.lunch.logged}
                            onAddPress={() => {}}
                            recommendedCalories={mealSections.lunch.recommended}
                        />
                        <MealSection
                            type="dinner"
                            meals={mealSections.dinner.logged}
                            onAddPress={() => {}}
                            recommendedCalories={mealSections.dinner.recommended}
                        />
                        <MealSection
                            type="snack"
                            meals={mealSections.snack.logged}
                            onAddPress={() => {}}
                            recommendedCalories={mealSections.snack.recommended}
                        />
                    </View>
                </ScrollView>

                {/* Floating Action Button */}
                <TouchableOpacity
                    className="absolute bottom-6 right-6 z-50 h-16 w-16 items-center justify-center rounded-full bg-primary-600 shadow-2xl transition-transform active:scale-95"
                    style={{ elevation: 8 }}
                    onPress={() => handleMealEntryAction('/(modals)/add-meal')}
                >
                    <Plus size={32} color="white" />
                </TouchableOpacity>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
