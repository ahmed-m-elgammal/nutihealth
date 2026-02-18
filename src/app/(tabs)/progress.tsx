import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
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

type Period = 'Week' | 'Month' | '3 Months' | 'Year';

const takeByPeriod = (period: Period) =>
    period === 'Week' ? 7 : period === 'Month' ? 30 : period === '3 Months' ? 90 : 365;

export default function ProgressScreen() {
    const { user } = useUserStore();
    const [period, setPeriod] = useState<Period>('Month');

    const { data: weightHistory = [] } = useWeightHistory(user?.id);
    const { data: calorieHistory = [] } = useCalorieHistory(user?.id);
    const { data: insights } = useProgressInsights(user?.id);

    const size = takeByPeriod(period);

    const weightData = useMemo(
        () =>
            weightHistory.slice(-size).map((d) => ({
                date: d.date.toISOString(),
                weight: d.weight,
            })),
        [size, weightHistory],
    );

    const calorieData = useMemo(
        () =>
            calorieHistory.slice(-size).map((d) => ({
                date: d.date.toISOString(),
                consumed: d.calories,
                target: d.target,
            })),
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
            icon: <Flame size={14} color="#fff" />,
            color: '#f97316',
        },
        {
            label: 'Adherence',
            value: `${Math.round(insights?.adherenceScore || 0)}%`,
            icon: <Target size={14} color="#fff" />,
            color: '#16a34a',
        },
        {
            label: 'Hydration hit rate',
            value: `${Math.round(insights?.hydrationGoalRate || 0)}%`,
            icon: <Zap size={14} color="#fff" />,
            color: '#3b82f6',
        },
        {
            label: 'Workouts this week',
            value: insights?.workoutsThisWeek || 0,
            icon: <Activity size={14} color="#fff" />,
            color: '#7c3aed',
        },
    ];

    const measurementEntries = weightHistory
        .slice()
        .reverse()
        .slice(0, 12)
        .map((w, idx) => ({ id: `${w.date.toISOString()}-${idx}`, date: w.date, weight: w.weight }));

    return (
        <ScreenErrorBoundary screenName="progress">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
                    <Text style={{ fontSize: 26, fontWeight: '700', color: '#0f172a' }}>Progress</Text>
                    <Text style={{ color: '#64748b', marginTop: 4 }}>Your momentum, visualized</Text>

                    <View style={{ marginTop: 14 }}>
                        <PeriodSelector selectedPeriod={period} onPeriodChange={(p) => setPeriod(p as Period)} />
                    </View>

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
                </ScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
