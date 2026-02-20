import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import EmptyState from '../../components/common/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, Droplets, Flame, UtensilsCrossed, Zap } from 'lucide-react-native';
import { useUserStore } from '../../store/userStore';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import { useCalorieHistory, useWeightHistory } from '../../query/queries/useProgress';
import { useProgressAggregates } from '../../query/queries/useProgressAggregates';
import PeriodSelector from '../../components/progress/PeriodSelector';
import WeightChart from '../../components/progress/WeightChart';
import CalorieHistoryChart from '../../components/progress/CalorieHistoryChart';
import MacroRingChart from '../../components/progress/MacroRingChart';
import StatsStrip from '../../components/progress/StatsStrip';
import BodyMeasurements from '../../components/progress/BodyMeasurements';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import { useColors } from '../../hooks/useColors';
import { ProgressSkeleton } from '../../components/skeletons/ScreenSkeletons';
import { SeedlingChartIllustration } from '../../components/illustrations/EmptyStateIllustrations';

type Period = 'Week' | 'Month' | '3 Months' | 'Year';

const takeByPeriod = (period: Period) =>
    period === 'Week' ? 7 : period === 'Month' ? 30 : period === '3 Months' ? 90 : 365;

const toSafeDate = (value: unknown): Date | null => {
    const date = value instanceof Date ? value : new Date(value as string | number);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
};

export default function ProgressScreen() {
    const { user } = useUserStore();
    const colors = useColors();
    const [period, setPeriod] = useState<Period>('Month');

    const { data: weightHistory = [], isLoading: isLoadingWeight } = useWeightHistory(user?.id);
    const { data: calorieHistory = [], isLoading: isLoadingCalories } = useCalorieHistory(user?.id);
    const { data: aggregates, isLoading: isLoadingAggregates } = useProgressAggregates(user?.id);

    const size = takeByPeriod(period);

    const weightData = useMemo(
        () =>
            weightHistory
                .slice(-size)
                .map((entry) => {
                    const safeDate = toSafeDate((entry as { date: unknown }).date);
                    if (!safeDate) return null;

                    return {
                        date: safeDate.toISOString(),
                        weight: Number(entry.weight) || 0,
                    };
                })
                .filter((entry): entry is { date: string; weight: number } => Boolean(entry)),
        [size, weightHistory],
    );

    const calorieData = useMemo(
        () =>
            calorieHistory
                .slice(-size)
                .map((entry) => {
                    const safeDate = toSafeDate((entry as { date: unknown }).date);
                    if (!safeDate) return null;

                    return {
                        date: safeDate.toISOString(),
                        consumed: Number(entry.calories) || 0,
                        target: Number(entry.target) || 0,
                    };
                })
                .filter((entry): entry is { date: string; consumed: number; target: number } => Boolean(entry)),
        [calorieHistory, size],
    );

    const macroTotals = useMemo(
        () => ({
            protein: Math.round((aggregates.averageMacrosLast7Days.protein || 0) * (size / 7)),
            carbs: Math.round((aggregates.averageMacrosLast7Days.carbs || 0) * (size / 7)),
            fats: Math.round((aggregates.averageMacrosLast7Days.fats || 0) * (size / 7)),
        }),
        [
            aggregates.averageMacrosLast7Days.carbs,
            aggregates.averageMacrosLast7Days.fats,
            aggregates.averageMacrosLast7Days.protein,
            size,
        ],
    );

    const stats = [
        {
            label: 'Total meals',
            value: aggregates.totalMealsLogged,
            icon: <UtensilsCrossed size={14} color={colors.text.inverse} />,
            color: colors.brand.accent[500],
        },
        {
            label: 'Meals this week',
            value: aggregates.mealsThisWeek,
            icon: <CalendarDays size={14} color={colors.text.inverse} />,
            color: colors.brand.semantic.success,
        },
        {
            label: 'Current streak',
            value: `${aggregates.currentStreak} day${aggregates.currentStreak === 1 ? '' : 's'}`,
            icon: <Flame size={14} color={colors.text.inverse} />,
            color: colors.brand.primary[700],
        },
        {
            label: 'Avg calories (7d)',
            value: `${aggregates.averageCaloriesLast7Days} kcal`,
            icon: <Zap size={14} color={colors.text.inverse} />,
            color: colors.brand.semantic.info,
        },
        {
            label: 'Avg water (7d)',
            value: `${aggregates.averageWaterLast7Days} ml`,
            icon: <Droplets size={14} color={colors.text.inverse} />,
            color: colors.brand.primary[500],
        },
    ];

    const measurementEntries = weightHistory
        .slice()
        .reverse()
        .slice(0, 12)
        .map((entry, idx) => {
            const safeDate = toSafeDate((entry as { date: unknown }).date) || new Date();
            return {
                id: `${safeDate.toISOString()}-${idx}`,
                date: safeDate,
                weight: Number(entry.weight) || 0,
            };
        });

    return (
        <ScreenErrorBoundary screenName="progress">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    header={
                        <View>
                            <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text.primary }}>
                                Progress
                            </Text>
                            <Text style={{ color: colors.text.secondary, marginTop: 4 }}>
                                Your momentum, visualized
                            </Text>
                            <View style={{ marginTop: 14 }}>
                                <PeriodSelector
                                    selectedPeriod={period}
                                    onPeriodChange={(p) => setPeriod(p as Period)}
                                />
                            </View>
                        </View>
                    }
                    headerHeight={160}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {isLoadingWeight || isLoadingCalories || isLoadingAggregates ? (
                        <ProgressSkeleton />
                    ) : (
                        <>
                            {aggregates.totalMealsLogged === 0 ? (
                                <EmptyState
                                    illustration={<SeedlingChartIllustration />}
                                    title="Start your progress journey"
                                    message="Log your first meal to unlock streaks, averages, and personalized progress insights."
                                />
                            ) : null}

                            <View style={{ marginTop: 12 }}>
                                <StatsStrip stats={stats} />
                            </View>

                            <MacroRingChart
                                macros={macroTotals}
                                totalCalories={Math.round(calorieData.reduce((sum, d) => sum + d.consumed, 0))}
                            />

                            {weightData.length >= 2 ? (
                                <WeightChart data={weightData} goalWeight={user?.targetWeight} period={period} />
                            ) : null}
                            {calorieData.length >= 2 ? (
                                <CalorieHistoryChart data={calorieData} period={period} />
                            ) : null}

                            {weightData.length < 2 || calorieData.length < 2 ? (
                                <EmptyState
                                    illustration={<SeedlingChartIllustration />}
                                    title="Not enough chart data yet"
                                    message="Keep logging for a few days to reveal chart trends."
                                />
                            ) : null}

                            <BodyMeasurements
                                entries={measurementEntries}
                                heightCm={user?.height}
                                onAddMeasurement={() => {
                                    // placeholder for Phase 5 measurement modal
                                }}
                            />
                        </>
                    )}
                </CollapsibleHeaderScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
