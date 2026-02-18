import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChefHat, Square, SquareCheck, X } from 'lucide-react-native';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { buildMealPrepPlan, MealPrepPlan } from '../../services/dietPlan/mealPrepOptimizer';
import { generatePlanForUser, saveGeneratedPlan } from '../../services/dietPlan/planRecommendation';

const formatRange = (start: Date, end: Date) => {
    const fmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
    return `${fmt.format(start)} - ${fmt.format(end)}`;
};

export default function MealPrepPlannerModal() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const [plan, setPlan] = useState<MealPrepPlan | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [preppedMap, setPreppedMap] = useState<Record<string, boolean>>({});

    const loadPlan = useCallback(async () => {
        if (!user?.id) {
            setPlan(null);
            setIsLoading(false);
            return;
        }

        try {
            const nextPlan = await buildMealPrepPlan(user.id);
            setPlan(nextPlan);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user?.id]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            void loadPlan();
        }, [loadPlan]),
    );

    const togglePrepped = (foodName: string) => {
        setPreppedMap((prev) => ({
            ...prev,
            [foodName]: !prev[foodName],
        }));
    };

    const preppedCount = useMemo(
        () => plan?.items.filter((item) => preppedMap[item.foodName]).length ?? 0,
        [plan?.items, preppedMap],
    );

    const progress = plan?.items.length ? preppedCount / plan.items.length : 0;

    const handleGenerateNewPlan = async () => {
        if (!user?.id) return;

        try {
            setIsGeneratingPlan(true);
            const generated = await generatePlanForUser(user.id);
            await saveGeneratedPlan(generated, user.id);
            setPreppedMap({});
            await loadPlan();
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    const hasItems = Boolean(plan?.items.length);

    return (
        <View className="flex-1 bg-background">
            <View className="border-b border-border bg-card px-6 pb-4 pt-12">
                <View className="flex-row items-center justify-between">
                    <Text className="text-2xl font-bold text-foreground">Meal Prep Planner</Text>
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                            className="rounded-full bg-emerald-600 px-3 py-2"
                            disabled={isGeneratingPlan}
                            onPress={() => void handleGenerateNewPlan()}
                        >
                            <Text className="text-xs font-semibold text-white">
                                {isGeneratingPlan ? 'Generating...' : 'Generate New Plan'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-muted p-2">
                            <X size={18} color="#1f2937" />
                        </TouchableOpacity>
                    </View>
                </View>

                {plan && (
                    <View className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-900/20">
                        <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            Week of {formatRange(plan.weekStart, plan.weekEnd)}
                        </Text>
                        <Text className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                            Est. prep time: {plan.estimatedPrepTimeMinutes} mins
                        </Text>
                    </View>
                )}
            </View>

            <ScrollView
                className="flex-1"
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            setIsRefreshing(true);
                            void loadPlan();
                        }}
                    />
                }
                contentContainerStyle={{ padding: 16, paddingBottom: 130 }}
            >
                {!isLoading && !hasItems && (
                    <View className="items-center rounded-2xl border border-dashed border-border bg-card p-8">
                        <ChefHat size={52} color="#9ca3af" />
                        <Text className="mt-4 text-center text-base font-semibold text-foreground">
                            No active meal plan yet
                        </Text>
                        <Text className="mt-2 text-center text-sm text-muted-foreground">
                            Create a diet plan to generate your weekly meal prep checklist.
                        </Text>
                        <TouchableOpacity
                            className="mt-5 rounded-xl bg-primary px-5 py-3"
                            onPress={() => router.push('/(modals)/create-weekly-plan')}
                        >
                            <Text className="font-semibold text-primary-foreground">Create a Diet Plan</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {hasItems && (
                    <View className="gap-3">
                        {plan?.items.map((item) => {
                            const checked = Boolean(preppedMap[item.foodName]);

                            return (
                                <TouchableOpacity
                                    key={item.foodName}
                                    className="rounded-2xl border border-border bg-card p-4"
                                    activeOpacity={0.85}
                                    onPress={() => togglePrepped(item.foodName)}
                                >
                                    <View className="flex-row items-start justify-between">
                                        <View className="flex-1 pr-3">
                                            <Text className="text-lg font-bold text-foreground">{item.foodName}</Text>
                                            <Text className="mt-1 text-sm text-muted-foreground">
                                                {item.totalGrams}g total
                                            </Text>
                                        </View>
                                        {checked ? (
                                            <SquareCheck size={22} color="#16a34a" />
                                        ) : (
                                            <Square size={22} color="#6b7280" />
                                        )}
                                    </View>

                                    <View className="mt-3 flex-row flex-wrap gap-2">
                                        {item.daysUsed.map((day) => (
                                            <View
                                                key={`${item.foodName}-day-${day}`}
                                                className="rounded-full bg-muted px-2 py-1"
                                            >
                                                <Text className="text-xs text-muted-foreground">{day.slice(0, 3)}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View className="mt-2 flex-row flex-wrap gap-2">
                                        {item.mealTypes.map((mealType) => (
                                            <View
                                                key={`${item.foodName}-${mealType}`}
                                                className="rounded-full bg-emerald-100 px-2 py-1 dark:bg-emerald-900/25"
                                            >
                                                <Text className="text-xs capitalize text-emerald-700 dark:text-emerald-300">
                                                    {mealType}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    <Text className="mt-3 text-sm text-muted-foreground">{item.prepNotes}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {hasItems && (
                <View className="absolute bottom-0 left-0 right-0 border-t border-border bg-card px-6 pb-8 pt-4">
                    <Text className="text-sm font-semibold text-foreground">
                        {preppedCount} of {plan?.items.length ?? 0} items prepped
                    </Text>
                    <View className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <View className="h-full bg-emerald-500" style={{ width: `${Math.round(progress * 100)}%` }} />
                    </View>
                </View>
            )}
        </View>
    );
}
