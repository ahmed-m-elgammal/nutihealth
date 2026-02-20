import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import EmptyState from '../../components/common/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Flame, Target, Zap } from 'lucide-react-native';
import { useUserStore } from '../../store/userStore';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import { useCalorieHistory, useProgressInsights, useWeightHistory } from '../../query/queries/useProgress';
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
    const { data: insights, isLoading: isLoadingInsights } = useProgressInsights(user?.id);

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
            protein: Math.round((insights?.averageProtein || 0) * (size / 7)),
            carbs: Math.round((insights?.averageCarbs || 0) * (size / 7)),
            fats: Math.round((insights?.averageFats || 0) * (size / 7)),
        }),
        [insights?.averageCarbs, insights?.averageFats, insights?.averageProtein, size],
    );

    const stats = [
        {
            label: 'Current streak',
            value: insights?.currentMealStreakDays ?? 0,
            icon: <Flame size={14} color={colors.text.inverse} />,
            color: colors.brand.accent[500],
        },
        {
            label: 'Adherence',
            value: `${Math.round(insights?.adherenceScore || 0)}%`,
            icon: <Target size={14} color={colors.text.inverse} />,
            color: colors.brand.semantic.success,
        },
        {
            label: 'Hydration hit rate',
            value: `${Math.round(insights?.hydrationGoalRate || 0)}%`,
            icon: <Zap size={14} color={colors.text.inverse} />,
            color: colors.brand.semantic.info,
        },
        {
            label: 'Workouts this week',
            value: insights?.workoutsThisWeek || 0,
            icon: <Activity size={14} color={colors.text.inverse} />,
            color: colors.brand.primary[700],
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
                    {isLoadingWeight || isLoadingCalories || isLoadingInsights ? (
                        <ProgressSkeleton />
                    ) : weightData.length < 2 || calorieData.length < 2 ? (
                        <EmptyState
                            illustration={<SeedlingChartIllustration />}
                            title="Not enough progress data yet"
                            message="Log meals and weigh-ins for a few days to unlock charts and trend insights."
                        />
                    ) : (
                        <>
                            <WeightChart data={weightData} goalWeight={user?.targetWeight} period={period} />
                            <CalorieHistoryChart data={calorieData} period={period} />
                            <MacroRingChart
                                macros={macroTotals}
                                totalCalories={Math.round(calorieData.reduce((sum, d) => sum + d.consumed, 0))}
                            />

                            <View style={{ marginTop: 12 }}>
                                <StatsStrip stats={stats} />
                            </View>

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
