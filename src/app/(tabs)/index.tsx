import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Plus, Scan, Search, Droplet, Check } from 'lucide-react-native';
import Header from '../../components/common/Header';
import CalorieCircle from '../../components/charts/CalorieCircle';
import ProgressBar from '../../components/charts/ProgressBar';
import MealCard from '../../components/meal/MealCard';
import QuickAction from '../../components/dashboard/QuickAction';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Body, Subheading } from '../../components/ui/Typography';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useMeals } from '../../query/queries/useMeals';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { createMeal } from '../../services/api/meals';
import { SAMPLE_HEALTHY_DAY } from '../../data/sampleHealthyDay';
import { needsBodyMetrics, buildCompleteProfileRoute } from '../../utils/profileCompletion';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';

// FlashList is not fully web-compatible, use FlatList on web.
const List = Platform.OS === 'web' ? FlatList : FlashList;

// Icon color mapping using semantic theme colors
const iconColors = {
    primary: 'hsl(var(--primary))',      // Green
    secondary: 'hsl(var(--secondary))',  // Blue
    warning: 'hsl(var(--warning))',      // Amber/Yellow
    info: '#14b8a6',                     // Teal (keep for now, add to theme later)
};

const QUICK_ACTIONS = [
    { id: '1', label: 'Meal', icon: <Plus size={24} color={iconColors.primary} />, route: '/(modals)/add-meal' },
    { id: '2', label: 'Scan', icon: <Scan size={24} color={iconColors.secondary} />, route: '/(modals)/barcode-scanner' },
    { id: '3', label: 'Search', icon: <Search size={24} color={iconColors.warning} />, route: '/(modals)/food-search' },
    { id: '4', label: 'Water', icon: <Droplet size={24} color={iconColors.info} />, route: '/(tabs)/water' },
] as const;

const MEAL_ENTRY_ROUTES = new Set<string>([
    '/(modals)/add-meal',
    '/(modals)/barcode-scanner',
    '/(modals)/food-search',
    '/(modals)/ai-food-detect',
    '/(modals)/load-template',
]);

const getMealTemplateCalories = (templateId: string): number => {
    const meal = SAMPLE_HEALTHY_DAY.find((item) => item.id === templateId);
    if (!meal) return 0;
    return meal.foods.reduce((sum, food) => sum + food.calories * food.quantity, 0);
};

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const userName = user?.name || 'User';

    const today = new Date();
    const { data: meals, isLoading: isLoadingMeals } = useMeals(today);
    const isLoadingStats = isLoadingMeals;
    const [isApplyingSampleDay, setIsApplyingSampleDay] = useState(false);
    const [isModifyingSampleDay, setIsModifyingSampleDay] = useState(false);
    const [selectedSampleMeals, setSelectedSampleMeals] = useState<string[]>(
        SAMPLE_HEALTHY_DAY.map((meal) => meal.id)
    );

    const dailyNutrition = useMemo(
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
                }
            ),
        [meals]
    );

    const targetCalories = user?.calorieTarget || DEFAULT_TARGETS.calories;
    const targetProtein = user?.proteinTarget || DEFAULT_TARGETS.protein;
    const targetCarbs = user?.carbsTarget || DEFAULT_TARGETS.carbs;
    const targetFats = user?.fatsTarget || DEFAULT_TARGETS.fats;
    const currentCalories = dailyNutrition.totalCalories;

    const macros = useMemo(
        () => ({
            protein: { current: dailyNutrition.totalProtein, target: targetProtein },
            carbs: { current: dailyNutrition.totalCarbs, target: targetCarbs },
            fats: { current: dailyNutrition.totalFats, target: targetFats },
        }),
        [dailyNutrition, targetProtein, targetCarbs, targetFats]
    );

    const recentMeals = useMemo(() => meals?.slice(0, 3) || [], [meals]);

    const handleMealEntryGate = useCallback((nextRoute: string) => {
        Alert.alert(
            'Complete profile first',
            'Add your height and weight once to personalize meal logging.',
            [
                { text: 'Not now', style: 'cancel' },
                {
                    text: 'Add now',
                    onPress: () => router.push(buildCompleteProfileRoute(nextRoute) as any),
                },
            ]
        );
    }, [router]);

    const handleQuickActionPress = useCallback((route: string) => {
        if (MEAL_ENTRY_ROUTES.has(route) && needsBodyMetrics(user)) {
            handleMealEntryGate(route);
            return;
        }

        router.push(route as any);
    }, [user, handleMealEntryGate, router]);

    const toggleSampleMeal = useCallback((mealId: string) => {
        setSelectedSampleMeals((current) => {
            if (current.includes(mealId)) {
                return current.filter((id) => id !== mealId);
            }
            return [...current, mealId];
        });
    }, []);

    const applySampleHealthyDay = useCallback(async (useSelection: boolean) => {
        if (needsBodyMetrics(user)) {
            handleMealEntryGate('/(tabs)/index');
            return;
        }

        const templates = useSelection
            ? SAMPLE_HEALTHY_DAY.filter((meal) => selectedSampleMeals.includes(meal.id))
            : SAMPLE_HEALTHY_DAY;

        if (templates.length === 0) {
            Alert.alert('No meals selected', 'Select at least one sample meal before applying.');
            return;
        }

        setIsApplyingSampleDay(true);
        try {
            for (const template of templates) {
                const consumedAt = new Date();
                consumedAt.setHours(template.consumedHour, template.consumedMinute, 0, 0);

                await createMeal({
                    name: template.name,
                    mealType: template.mealType,
                    consumedAt,
                    foods: template.foods,
                });
            }

            setIsModifyingSampleDay(false);
            setSelectedSampleMeals(SAMPLE_HEALTHY_DAY.map((meal) => meal.id));
        } catch (error) {
            Alert.alert('Unable to apply sample', (error as Error).message || 'Please try again.');
        } finally {
            setIsApplyingSampleDay(false);
        }
    }, [user, handleMealEntryGate, selectedSampleMeals]);

    const renderHeader = useCallback(() => (
        <View className="mb-6">
            <Header userName={userName} />

            <View className="px-6 mb-8 w-full md:max-w-3xl md:mx-auto">
                <Card className="items-center">
                    <CardHeader>
                        <CardTitle>Today's Calories</CardTitle>
                    </CardHeader>
                    <CardContent className="items-center">
                        {isLoadingStats ? (
                            <View className="items-center">
                                <Skeleton className="w-[180px] h-[180px] rounded-full" />
                                <Skeleton className="w-[150px] h-4 rounded-md mt-4" />
                            </View>
                        ) : (
                            <>
                                <CalorieCircle current={currentCalories} target={targetCalories} size={180} />
                                <Text className="text-muted-foreground text-sm mt-4">
                                    {Math.max(0, targetCalories - currentCalories)} kcal remaining
                                </Text>

                                <View className="w-full mt-6 space-y-4">
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
                            </>
                        )}
                    </CardContent>
                </Card>
            </View>

            <View className="px-6 mb-8 w-full md:max-w-3xl md:mx-auto">
                <Subheading className="mb-4">Quick Add</Subheading>
                <View className="flex-row justify-between flex-wrap gap-2">
                    {QUICK_ACTIONS.map((action) => (
                        <QuickAction
                            key={action.id}
                            label={action.label}
                            icon={action.icon}
                            onPress={() => handleQuickActionPress(action.route)}
                        />
                    ))}
                </View>
            </View>

            <View className="px-6 flex-row justify-between items-center mb-2 w-full md:max-w-3xl md:mx-auto">
                <Subheading>Recent Meals</Subheading>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Open all meals"
                    onPress={() => router.push('/(tabs)/meals')}
                >
                    <Text className="text-primary font-semibold">See All</Text>
                </TouchableOpacity>
            </View>
        </View>
    ), [
        userName,
        isLoadingStats,
        currentCalories,
        targetCalories,
        macros.protein.current,
        macros.protein.target,
        macros.carbs.current,
        macros.carbs.target,
        macros.fats.current,
        macros.fats.target,
        router,
    ]);

    const renderSampleDayEmptyState = useCallback(() => (
        <View className="px-6 mb-4">
            <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">
                <CardHeader className="pb-2">
                    <CardTitle>Sample Healthy Day</CardTitle>
                    <Body className="text-sm text-muted-foreground">
                        Start with a balanced day, then tweak it to fit your routine.
                    </Body>
                </CardHeader>
                <CardContent className="pt-2">
                    <View className="space-y-3">
                        {SAMPLE_HEALTHY_DAY.map((meal) => {
                            const isSelected = selectedSampleMeals.includes(meal.id);
                            const calories = getMealTemplateCalories(meal.id);

                            return (
                                <TouchableOpacity
                                    key={meal.id}
                                    activeOpacity={isModifyingSampleDay ? 0.75 : 1}
                                    disabled={!isModifyingSampleDay}
                                    onPress={() => toggleSampleMeal(meal.id)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${isSelected ? 'Unselect' : 'Select'} ${meal.name}`}
                                    className={`rounded-lg border px-3 py-3 flex-row items-center ${isModifyingSampleDay && !isSelected
                                        ? 'border-border bg-background'
                                        : 'border-emerald-200 bg-white'
                                        }`}
                                >
                                    <View className={`w-5 h-5 rounded-full border mr-3 items-center justify-center ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-neutral-300'
                                        }`}>
                                        {isSelected && <Check size={12} color="#ffffff" />}
                                    </View>
                                    <View className="flex-1">
                                        <Text className="font-semibold text-foreground">{meal.name}</Text>
                                        <Text className="text-xs text-muted-foreground">{meal.preview}</Text>
                                    </View>
                                    <Text className="text-sm font-semibold text-foreground">{calories} kcal</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {isModifyingSampleDay && (
                        <Text className="text-xs text-muted-foreground mt-3">
                            Tap meals to include or exclude before logging.
                        </Text>
                    )}

                    <View className="flex-row gap-3 mt-4">
                        <Button
                            className="flex-1"
                            loading={isApplyingSampleDay}
                            onPress={() => void applySampleHealthyDay(isModifyingSampleDay)}
                            accessibilityLabel={isModifyingSampleDay ? 'Log selected sample meals' : 'Log all sample meals'}
                        >
                            {isModifyingSampleDay ? 'Eat selected' : 'Eat all'}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            disabled={isApplyingSampleDay}
                            accessibilityLabel={isModifyingSampleDay ? 'Cancel sample meal edits' : 'Modify sample meal selection'}
                            onPress={() => {
                                if (isModifyingSampleDay) {
                                    setIsModifyingSampleDay(false);
                                    setSelectedSampleMeals(SAMPLE_HEALTHY_DAY.map((meal) => meal.id));
                                } else {
                                    setIsModifyingSampleDay(true);
                                }
                            }}
                        >
                            {isModifyingSampleDay ? 'Cancel' : 'Modify'}
                        </Button>
                    </View>
                </CardContent>
            </Card>
        </View>
    ), [isModifyingSampleDay, isApplyingSampleDay, selectedSampleMeals, toggleSampleMeal, applySampleHealthyDay]);

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['top']}>
            {isLoadingMeals ? (
                <View className="flex-1 px-6 pt-4">
                    <Skeleton className="w-full h-[200px] rounded-lg mb-4" />
                    <Skeleton className="w-full h-[100px] rounded-lg mb-4" />
                    <Skeleton className="w-full h-[100px] rounded-lg" />
                </View>
            ) : (
                <List
                    data={recentMeals}
                    ListHeaderComponent={renderHeader}
                    renderItem={({ item }) => (
                        <View className="px-6 mb-3">
                            <MealCard
                                meal={item}
                                onEdit={() => Alert.alert('Coming soon', 'Meal editing from dashboard is in progress.')}
                                onDelete={() => Alert.alert('Coming soon', 'Meal deletion from dashboard is in progress.')}
                            />
                        </View>
                    )}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    {...(Platform.OS !== 'web' && { estimatedItemSize: 80 })}
                    ListEmptyComponent={renderSampleDayEmptyState}
                />
            )}
        </SafeAreaView>
    );
}
