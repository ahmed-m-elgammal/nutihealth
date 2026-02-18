import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Clock3, Flame, Utensils } from 'lucide-react-native';
import { Skeleton } from '../ui/Skeleton';
import { storage } from '../../utils/storage-adapter';
import { SuggestedMeal, getSuggestedMealsForToday } from '../../services/dietPlan/mealSuggestionService';
import { getActiveDietPlan } from '../../services/dietPlan/helpers';

interface MealSuggestionBannerProps {
    userId?: string;
    date?: Date;
}

const dismissedKey = (mealId: string, dateString: string) => `dismissed_suggestion_${mealId}_${dateString}`;

const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function MealSuggestionBanner({ userId, date = new Date() }: MealSuggestionBannerProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [suggestion, setSuggestion] = useState<SuggestedMeal | null>(null);
    const dateKey = useMemo(() => toDateKey(date), [date]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            if (!userId) {
                setSuggestion(null);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const activePlan = await getActiveDietPlan(userId);
                if (!activePlan) {
                    if (mounted) {
                        setSuggestion(null);
                    }
                    return;
                }

                const meals = await getSuggestedMealsForToday(userId, date);
                const topSuggestion = meals[0] ?? null;

                if (!topSuggestion) {
                    if (mounted) {
                        setSuggestion(null);
                    }
                    return;
                }

                const dismissed = await storage.getItem(dismissedKey(topSuggestion.id, dateKey));
                if (mounted) {
                    setSuggestion(dismissed ? null : topSuggestion);
                }
            } catch {
                if (mounted) {
                    setSuggestion(null);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        void load();

        return () => {
            mounted = false;
        };
    }, [userId, date, dateKey]);

    const handleDismiss = async () => {
        if (!suggestion) return;

        await storage.setItem(dismissedKey(suggestion.id, dateKey), String(Date.now()));
        setSuggestion(null);
    };

    if (!userId) {
        return null;
    }

    if (isLoading) {
        return (
            <View className="mb-6 w-full px-6 md:mx-auto md:max-w-3xl">
                <View className="rounded-2xl border border-emerald-200 bg-card p-4">
                    <Skeleton className="mb-3 h-4 w-40 rounded" />
                    <Skeleton className="mb-2 h-4 w-64 rounded" />
                    <Skeleton className="mb-4 h-4 w-44 rounded" />
                    <View className="flex-row gap-2">
                        <Skeleton className="h-9 flex-1 rounded-lg" />
                        <Skeleton className="h-9 w-24 rounded-lg" />
                    </View>
                </View>
            </View>
        );
    }

    if (!suggestion) {
        return null;
    }

    const suggestedFoods = suggestion.foods
        .slice(0, 3)
        .map((item) => item.name)
        .join(' • ');

    return (
        <View className="mb-8 w-full px-6 md:mx-auto md:max-w-3xl">
            <View className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:bg-emerald-900/20">
                <View className="mb-2 flex-row items-center gap-2">
                    <Utensils size={16} color="#059669" />
                    <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        {t('mealSuggestion.title')}
                    </Text>
                </View>

                <Text className="text-lg font-bold capitalize text-foreground">{suggestion.mealType}</Text>
                <Text className="text-sm text-muted-foreground">{suggestion.name}</Text>

                <View className="mt-3 flex-row items-center gap-4">
                    <View className="flex-row items-center gap-1">
                        <Clock3 size={14} color="#6b7280" />
                        <Text className="text-xs text-muted-foreground">
                            {t('mealSuggestion.timeWindow', {
                                start: suggestion.timeWindowStart,
                                end: suggestion.timeWindowEnd,
                            })}
                        </Text>
                    </View>
                    <View className="flex-row items-center gap-1">
                        <Flame size={14} color="#6b7280" />
                        <Text className="text-xs text-muted-foreground">
                            {t('mealSuggestion.targetCalories', { calories: suggestion.targetCalories })}
                        </Text>
                    </View>
                </View>

                <Text className="mt-3 text-xs text-muted-foreground">{suggestedFoods}</Text>

                <View className="mt-4 flex-row gap-2">
                    <Pressable
                        className="flex-1 items-center rounded-lg bg-primary py-2"
                        onPress={() =>
                            router.push({ pathname: '/(modals)/add-meal', params: { mealType: suggestion.mealType } })
                        }
                    >
                        <Text className="font-semibold text-primary-foreground">{t('mealSuggestion.logThisMeal')}</Text>
                    </Pressable>
                    <Pressable
                        className="rounded-lg border border-border px-4 py-2"
                        onPress={() => void handleDismiss()}
                    >
                        <Text className="font-medium text-muted-foreground">{t('mealSuggestion.dismiss')}</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}
