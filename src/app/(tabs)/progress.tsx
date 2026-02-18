import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingDown, Target, Flame, Droplet, Activity } from 'lucide-react-native';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useWeightHistory, useCalorieHistory, useProgressInsights } from '../../query/queries/useProgress';
import { useUserStore } from '../../store/userStore';

export default function ProgressScreen() {
    const { user } = useUserStore();
    const { t } = useTranslation();
    const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

    const { data: weightHistory = [] } = useWeightHistory(user?.id);
    const { data: calorieHistory = [] } = useCalorieHistory(user?.id);
    const { data: insights } = useProgressInsights(user?.id);

    const currentWeight = user?.weight || 0;
    const goalWeight = user?.targetWeight || currentWeight;

    const startWeight = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : currentWeight;
    const weightChange = currentWeight - startWeight;
    const totalToGoal = Math.abs(startWeight - goalWeight);
    const progressPercentage = totalToGoal > 0 ? (Math.abs(startWeight - currentWeight) / totalToGoal) * 100 : 0;

    const weightSlice = useMemo(() => {
        if (selectedPeriod === 'week') return weightHistory.slice(-7);
        if (selectedPeriod === 'month') return weightHistory.slice(-30);
        return weightHistory.slice(-365);
    }, [weightHistory, selectedPeriod]);

    const calorieSlice = useMemo(() => {
        if (selectedPeriod === 'week') return calorieHistory.slice(-7);
        if (selectedPeriod === 'month') return calorieHistory.slice(-30);
        return calorieHistory.slice(-365);
    }, [calorieHistory, selectedPeriod]);

    const hasCalorieData = calorieSlice.length > 0;

    return (
        <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
            <View className="border-b border-neutral-100 bg-white px-6 py-4 shadow-sm">
                <Text className="text-2xl font-bold text-neutral-900">{t('progress.title')}</Text>
                <Text className="mt-1 text-sm text-neutral-500">{t('progress.subtitle')}</Text>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                <View className="mb-6 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 p-6 shadow-xl">
                    <View className="mb-4 flex-row items-center justify-between">
                        <Text className="text-lg font-bold text-white">{t('progress.weightProgress')}</Text>
                        <View className="flex-row items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                            <TrendingDown size={14} color="white" />
                            <Text className="text-xs font-medium text-white">
                                {Math.abs(weightChange).toFixed(1)} kg
                            </Text>
                        </View>
                    </View>

                    <View className="mb-6 flex-row items-end justify-between">
                        <View>
                            <Text className="mb-1 text-sm text-white/70">{t('progress.current')}</Text>
                            <Text className="text-4xl font-bold text-white">{currentWeight}</Text>
                            <Text className="text-sm text-white/70">kg</Text>
                        </View>
                        <View className="items-center">
                            <Text className="mb-1 text-xs text-white/70">{t('progress.goal')}</Text>
                            <Text className="text-xl font-semibold text-white">{goalWeight} kg</Text>
                        </View>
                    </View>

                    <View className="mb-2 h-3 overflow-hidden rounded-full bg-white/20">
                        <View
                            className="h-full rounded-full bg-white"
                            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                    </View>
                    <Text className="text-center text-xs text-white/80">
                        {progressPercentage.toFixed(1)}% {t('progress.toGoal')} •{' '}
                        {(goalWeight - currentWeight).toFixed(1)} kg {t('progress.toGo')}
                    </Text>
                </View>

                <View className="mb-6 flex-row gap-2">
                    {(['week', 'month', 'year'] as const).map((period) => (
                        <TouchableOpacity
                            key={period}
                            onPress={() => setSelectedPeriod(period)}
                            className={`flex-1 rounded-xl py-2 ${selectedPeriod === period ? 'bg-neutral-900' : 'border border-neutral-200 bg-white'}`}
                        >
                            <Text
                                className={`text-center text-sm font-semibold capitalize ${selectedPeriod === period ? 'text-white' : 'text-neutral-600'}`}
                            >
                                {t(`progress.periods.${period}`)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View className="mb-6 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
                    <Text className="mb-4 text-lg font-bold text-neutral-900">{t('progress.weightTrend')}</Text>

                    {weightSlice.length > 0 ? (
                        <View className="mb-4 h-40 flex-row items-end justify-between">
                            {weightSlice.slice(-7).map((data, index) => {
                                const maxWeight = Math.max(...weightSlice.map((d) => d.weight));
                                const minWeight = Math.min(...weightSlice.map((d) => d.weight));
                                const range = maxWeight - minWeight || 1;
                                const heightPercentage = ((data.weight - minWeight) / range) * 100;

                                return (
                                    <View key={`${data.date.toISOString()}-${index}`} className="flex-1 items-center">
                                        <View
                                            className="w-6 rounded-t-full bg-primary-500"
                                            style={{ height: `${Math.max(10, heightPercentage)}%` }}
                                        />
                                        <Text className="mt-2 text-xs text-neutral-400">
                                            {format(data.date, 'MM/dd')}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View className="h-40 items-center justify-center">
                            <Text className="text-neutral-400">{t('progress.noWeightData')}</Text>
                        </View>
                    )}
                </View>

                <View className="mb-6 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
                    <Text className="mb-4 text-lg font-bold text-neutral-900">{t('progress.calorieTrend')}</Text>

                    {hasCalorieData ? (
                        <View className="mb-4 h-40 flex-row items-end justify-between">
                            {calorieSlice.slice(-7).map((entry, index) => {
                                const maxCalories = Math.max(
                                    ...calorieSlice.map((d) => d.target || d.calories || 1),
                                    1,
                                );
                                const barHeight = (entry.calories / maxCalories) * 100;
                                const isOverTarget = entry.calories > entry.target;

                                return (
                                    <View key={`${entry.date.toISOString()}-${index}`} className="flex-1 items-center">
                                        <View
                                            className={`w-6 rounded-t-full ${isOverTarget ? 'bg-orange-500' : 'bg-blue-500'}`}
                                            style={{ height: `${Math.max(10, barHeight)}%` }}
                                        />
                                        <Text className="mt-2 text-xs text-neutral-400">
                                            {format(entry.date, 'MM/dd')}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View className="h-40 items-center justify-center">
                            <Text className="text-neutral-400">{t('progress.noCalorieData')}</Text>
                        </View>
                    )}

                    <View className="flex-row gap-4">
                        <View className="flex-row items-center gap-2">
                            <View className="h-3 w-3 rounded-full bg-blue-500" />
                            <Text className="text-xs text-neutral-600">{t('progress.underTarget')}</Text>
                        </View>
                        <View className="flex-row items-center gap-2">
                            <View className="h-3 w-3 rounded-full bg-orange-500" />
                            <Text className="text-xs text-neutral-600">{t('progress.overTarget')}</Text>
                        </View>
                    </View>
                </View>

                <View className="mb-6 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
                    <Text className="mb-4 text-lg font-bold text-neutral-900">{t('progress.nutritionStats')}</Text>

                    <View className="mb-4 flex-row gap-3">
                        <View className="flex-1 rounded-2xl bg-blue-50 p-4">
                            <Text className="text-xs font-medium text-blue-600">{t('progress.protein')}</Text>
                            <Text className="mb-1 text-2xl font-bold text-blue-900">
                                {Math.round(insights?.averageProtein || 0)}g
                            </Text>
                            <Text className="text-xs text-blue-600">{t('progress.avgDay')}</Text>
                        </View>
                        <View className="flex-1 rounded-2xl bg-orange-50 p-4">
                            <Text className="text-xs font-medium text-orange-600">{t('progress.carbs')}</Text>
                            <Text className="mb-1 text-2xl font-bold text-orange-900">
                                {Math.round(insights?.averageCarbs || 0)}g
                            </Text>
                            <Text className="text-xs text-orange-600">{t('progress.avgDay')}</Text>
                        </View>
                        <View className="flex-1 rounded-2xl bg-purple-50 p-4">
                            <Text className="text-xs font-medium text-purple-600">{t('progress.fats')}</Text>
                            <Text className="mb-1 text-2xl font-bold text-purple-900">
                                {Math.round(insights?.averageFats || 0)}g
                            </Text>
                            <Text className="text-xs text-purple-600">{t('progress.avgDay')}</Text>
                        </View>
                    </View>

                    <View className="rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <View className="rounded-full bg-green-500 p-2">
                                    <Target size={20} color="white" />
                                </View>
                                <View>
                                    <Text className="text-lg font-bold text-neutral-900">
                                        {Math.round(insights?.adherenceScore || 0)}%
                                    </Text>
                                    <Text className="text-xs text-neutral-600">{t('progress.adherenceScore')}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="mb-6 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm">
                    <Text className="mb-4 text-lg font-bold text-neutral-900">{t('progress.trackingConsistency')}</Text>

                    <View className="flex-row gap-3">
                        <View className="flex-1 rounded-2xl bg-neutral-50 p-4">
                            <View className="mb-3 flex-row items-center gap-2">
                                <Flame size={20} color="#f97316" />
                                <Text className="font-bold text-neutral-900">
                                    {insights?.currentMealStreakDays || 0} {t('progress.days')}
                                </Text>
                            </View>
                            <Text className="text-xs text-neutral-500">{t('progress.currentStreak')}</Text>
                        </View>
                        <View className="flex-1 rounded-2xl bg-neutral-50 p-4">
                            <View className="mb-3 flex-row items-center gap-2">
                                <Droplet size={20} color="#3b82f6" />
                                <Text className="font-bold text-neutral-900">
                                    {Math.round(insights?.hydrationGoalRate || 0)}%
                                </Text>
                            </View>
                            <Text className="text-xs text-neutral-500">{t('progress.hydrationGoal')}</Text>
                        </View>
                        <View className="flex-1 rounded-2xl bg-neutral-50 p-4">
                            <View className="mb-3 flex-row items-center gap-2">
                                <Activity size={20} color="#10b981" />
                                <Text className="font-bold text-neutral-900">{insights?.workoutsThisWeek || 0}/7</Text>
                            </View>
                            <Text className="text-xs text-neutral-500">{t('progress.workouts')}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
