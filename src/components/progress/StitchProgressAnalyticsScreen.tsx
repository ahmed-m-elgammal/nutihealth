import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, Activity, Award, TrendingUp } from 'lucide-react-native';
import Svg, { Polyline } from 'react-native-svg';
import { format, startOfWeek } from 'date-fns';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useWeightHistory, useCalorieHistory, useMacroHistory } from '../../query/queries/useProgress';
import { useProgressAggregates } from '../../query/queries/useProgressAggregates';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';
import { useRouter } from 'expo-router';
import BodyMeasurements from './BodyMeasurements';

type Period = 'Week' | 'Month' | 'Year';

type CaloriePoint = {
    date: Date;
    calories: number;
};

type WeightPoint = {
    date: Date;
    weight: number;
};

type MacroPoint = {
    date: Date;
    protein: number;
    carbs: number;
    fats: number;
};

type BarPoint = {
    label: string;
    value: number;
    pct: number;
};

const PERIOD_DAYS: Record<Period, number> = { Week: 7, Month: 30, Year: 365 };

const toTimestamp = (date: Date): number => {
    const time = new Date(date).getTime();
    return Number.isFinite(time) ? time : 0;
};

const normalizeRange = (value: number, min: number, max: number): number => {
    if (max === min) return 0.5;
    return (value - min) / (max - min);
};

const formatPointLabel = (date: Date, period: Period): string => {
    if (period === 'Week') return format(date, 'EEE');
    if (period === 'Month') return format(date, 'd MMM');
    return format(date, 'MMM d');
};

const aggregateWeeklySingleSeries = (
    entries: Array<{ date: Date; value: number }>,
): Array<{ date: Date; value: number }> => {
    const grouped = new Map<number, { sum: number; count: number }>();

    for (const entry of entries) {
        const weekStart = startOfWeek(entry.date, { weekStartsOn: 1 }).getTime();
        const current = grouped.get(weekStart) || { sum: 0, count: 0 };
        current.sum += entry.value;
        current.count += 1;
        grouped.set(weekStart, current);
    }

    return Array.from(grouped.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([weekStart, totals]) => ({
            date: new Date(weekStart),
            value: totals.count > 0 ? totals.sum / totals.count : 0,
        }));
};

const aggregateWeeklyMacroSeries = (entries: MacroPoint[]): MacroPoint[] => {
    const grouped = new Map<number, { protein: number; carbs: number; fats: number; count: number }>();

    for (const entry of entries) {
        const weekStart = startOfWeek(entry.date, { weekStartsOn: 1 }).getTime();
        const current = grouped.get(weekStart) || { protein: 0, carbs: 0, fats: 0, count: 0 };
        current.protein += entry.protein;
        current.carbs += entry.carbs;
        current.fats += entry.fats;
        current.count += 1;
        grouped.set(weekStart, current);
    }

    return Array.from(grouped.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([weekStart, totals]) => ({
            date: new Date(weekStart),
            protein: totals.count > 0 ? totals.protein / totals.count : 0,
            carbs: totals.count > 0 ? totals.carbs / totals.count : 0,
            fats: totals.count > 0 ? totals.fats / totals.count : 0,
        }));
};

const buildSparklinePoints = (values: number[], width: number, height: number): string => {
    if (values.length === 0) return '';
    if (values.length === 1) {
        const midY = Math.round(height * 0.5);
        return `0,${midY} ${width},${midY}`;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    return values
        .map((value, index) => {
            const x = (index / (values.length - 1)) * width;
            const normalized = range <= 0 ? 0.5 : (value - min) / range;
            const y = height - normalized * height;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
};

function MacroTrendRow({ label, color, values }: { label: string; color: string; values: number[] }) {
    const chartHeight = 46;
    const chartWidth = 320;
    const latest = values.length > 0 ? Math.round(values[values.length - 1]) : 0;
    const sparklinePoints = useMemo(() => buildSparklinePoints(values, chartWidth, chartHeight), [values]);

    return (
        <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700' }}>{label}</Text>
                <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{latest} g</Text>
            </View>
            <View
                style={{
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#334155',
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                    backgroundColor: '#0f172a',
                }}
            >
                <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
                    <Polyline points={sparklinePoints} fill="none" stroke={color} strokeWidth={2.5} />
                </Svg>
            </View>
        </View>
    );
}

export default function ProgressAnalyticsScreen() {
    const router = useRouter();
    const { user } = useCurrentUser();
    const [period, setPeriod] = useState<Period>('Week');
    const size = PERIOD_DAYS[period];

    const { data: weightHistory = [], isLoading: isLoadingWeight } = useWeightHistory(user?.id, size);
    const { data: calorieHistory = [], isLoading: isLoadingCalories } = useCalorieHistory(user?.id, size);
    const { data: macroHistory = [], isLoading: isLoadingMacros } = useMacroHistory(user?.id, size);
    const { data: aggregates, isLoading: isLoadingAggregates } = useProgressAggregates(
        user?.id,
        user?.createdAt ? new Date(user.createdAt).getTime() : undefined,
    );

    const isLoading = isLoadingWeight || isLoadingCalories || isLoadingMacros || isLoadingAggregates;

    const statsFromUser = user?.stats || { current_streak: 0, total_meals_logged: 0, total_workouts: 0 };
    const bodyMeasurementEntries = useMemo(
        () =>
            [...weightHistory]
                .sort(
                    (a, b) => new Date((b as WeightPoint).date).getTime() - new Date((a as WeightPoint).date).getTime(),
                )
                .map((entry, index) => ({
                    id: `${(entry as WeightPoint).date}-${index}`,
                    date: new Date((entry as WeightPoint).date),
                    weight: Number((entry as WeightPoint).weight) || 0,
                })),
        [weightHistory],
    );

    const calorieGoal = user?.calorieTarget || DEFAULT_TARGETS.calories;

    const calorieChartData = useMemo((): BarPoint[] => {
        if (!calorieHistory.length) return [];

        const sorted = [...calorieHistory]
            .map((entry) => ({
                date: new Date((entry as CaloriePoint).date),
                value: Number((entry as CaloriePoint).calories) || 0,
            }))
            .sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date));

        const periodEntries =
            period === 'Year' ? aggregateWeeklySingleSeries(sorted) : sorted.slice(-Math.max(1, size));
        const max = Math.max(...periodEntries.map((entry) => entry.value), 1);

        return periodEntries.map((entry) => ({
            label: formatPointLabel(entry.date, period),
            value: entry.value,
            pct: entry.value / max,
        }));
    }, [calorieHistory, period, size]);

    const weightChartData = useMemo((): BarPoint[] => {
        if (!weightHistory.length) return [];

        const sorted = [...weightHistory]
            .map((entry) => ({
                date: new Date((entry as WeightPoint).date),
                value: Number((entry as WeightPoint).weight) || 0,
            }))
            .sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date));

        const periodEntries =
            period === 'Year' ? aggregateWeeklySingleSeries(sorted) : sorted.slice(-Math.max(1, size));
        const values = periodEntries.map((entry) => entry.value);
        const max = Math.max(...values, 1);
        const min = Math.min(...values);

        return periodEntries.map((entry) => ({
            label: formatPointLabel(entry.date, period),
            value: entry.value,
            pct: normalizeRange(entry.value, min, max),
        }));
    }, [weightHistory, period, size]);

    const macroChartData = useMemo(() => {
        if (!macroHistory.length) return [];

        const sorted = [...macroHistory]
            .map((entry) => ({
                date: new Date((entry as MacroPoint).date),
                protein: Number((entry as MacroPoint).protein) || 0,
                carbs: Number((entry as MacroPoint).carbs) || 0,
                fats: Number((entry as MacroPoint).fats) || 0,
            }))
            .sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date));

        const periodEntries = period === 'Year' ? aggregateWeeklyMacroSeries(sorted) : sorted.slice(-Math.max(1, size));

        return periodEntries;
    }, [macroHistory, period, size]);

    const macroPeriodLabel = useMemo(() => {
        if (macroChartData.length === 0) return '';
        const start = macroChartData[0].date;
        const end = macroChartData[macroChartData.length - 1].date;
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
    }, [macroChartData]);

    const weightDelta = useMemo(() => {
        if (weightHistory.length < 2) return null;
        const sorted = [...weightHistory].sort(
            (a, b) => new Date((a as WeightPoint).date).getTime() - new Date((b as WeightPoint).date).getTime(),
        );
        const delta = (
            Number((sorted[sorted.length - 1] as WeightPoint).weight) - Number((sorted[0] as WeightPoint).weight)
        ).toFixed(1);
        return Number.parseFloat(delta);
    }, [weightHistory]);

    const barWidth = period === 'Week' ? 30 : period === 'Month' ? 16 : 12;
    const barGap = period === 'Week' ? 8 : 4;
    const calorieChartWidth = Math.max(calorieChartData.length * (barWidth + barGap), 280);
    const weightChartWidth = Math.max(weightChartData.length * (barWidth + barGap), 280);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                <Text
                    style={{
                        color: '#f8fafc',
                        fontSize: 28,
                        fontWeight: '700',
                        marginTop: 16,
                        marginBottom: 20,
                        letterSpacing: -0.5,
                    }}
                >
                    Analytics
                </Text>

                <View
                    style={{
                        flexDirection: 'row',
                        backgroundColor: '#1e293b',
                        padding: 4,
                        borderRadius: 14,
                        marginBottom: 24,
                    }}
                >
                    {(['Week', 'Month', 'Year'] as Period[]).map((p) => (
                        <TabButton key={p} title={p} active={period === p} onPress={() => setPeriod(p)} />
                    ))}
                </View>

                {isLoading ? (
                    <ActivityIndicator color="#10b981" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        <View style={{ backgroundColor: '#1e293b', borderRadius: 24, padding: 24, marginBottom: 20 }}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 20,
                                }}
                            >
                                <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700' }}>Calorie Trend</Text>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                    avg {aggregates?.averageCaloriesLast7Days ?? 0} kcal
                                </Text>
                            </View>

                            {calorieChartData.length > 0 ? (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ minWidth: calorieChartWidth }}
                                >
                                    <View
                                        style={{
                                            height: 140,
                                            width: calorieChartWidth,
                                            flexDirection: 'row',
                                            alignItems: 'flex-end',
                                            gap: barGap,
                                        }}
                                    >
                                        {calorieChartData.map((bar, idx) => (
                                            <View
                                                key={`${bar.label}-${idx}`}
                                                style={{ width: barWidth, alignItems: 'center' }}
                                            >
                                                <View
                                                    style={{
                                                        width: '100%',
                                                        height: Math.max(8, bar.pct * 110),
                                                        backgroundColor: bar.pct > 0.8 ? '#ef4444' : '#10b981',
                                                        borderRadius: 6,
                                                        opacity: 0.6 + bar.pct * 0.4,
                                                    }}
                                                />
                                                <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 6 }}>
                                                    {bar.label}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            ) : (
                                <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                        Log meals to see your calorie trend
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ backgroundColor: '#1e293b', borderRadius: 24, padding: 24, marginBottom: 20 }}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 20,
                                }}
                            >
                                <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700' }}>
                                    Weight Progress
                                </Text>
                                {weightDelta !== null && (
                                    <Text
                                        style={{
                                            color: weightDelta <= 0 ? '#10b981' : '#f59e0b',
                                            fontWeight: '700',
                                            fontSize: 13,
                                        }}
                                    >
                                        {weightDelta > 0 ? '+' : ''}
                                        {weightDelta} kg
                                    </Text>
                                )}
                            </View>

                            {weightChartData.length > 0 ? (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ minWidth: weightChartWidth }}
                                >
                                    <View
                                        style={{
                                            height: 140,
                                            width: weightChartWidth,
                                            flexDirection: 'row',
                                            alignItems: 'flex-end',
                                            gap: barGap,
                                        }}
                                    >
                                        {weightChartData.map((bar, idx) => (
                                            <View
                                                key={`${bar.label}-${idx}`}
                                                style={{ width: barWidth, alignItems: 'center' }}
                                            >
                                                <View
                                                    style={{
                                                        width: '100%',
                                                        height: Math.max(8, bar.pct * 110),
                                                        backgroundColor: '#3b82f6',
                                                        borderRadius: 6,
                                                        opacity: 0.5 + bar.pct * 0.5,
                                                    }}
                                                />
                                                <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 6 }}>
                                                    {bar.label}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>
                            ) : (
                                <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
                                    <TouchableOpacity
                                        onPress={() => router.push('/(modals)/log-weight' as any)}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '600' }}>
                                            Log weight to see trends →
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View style={{ backgroundColor: '#1e293b', borderRadius: 24, padding: 24, marginBottom: 20 }}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 16,
                                }}
                            >
                                <Text style={{ color: '#f8fafc', fontSize: 16, fontWeight: '700' }}>Macro Trends</Text>
                                {macroPeriodLabel ? (
                                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>{macroPeriodLabel}</Text>
                                ) : null}
                            </View>

                            {macroChartData.length > 0 ? (
                                <View style={{ gap: 12 }}>
                                    <MacroTrendRow
                                        label="Protein"
                                        color="#22c55e"
                                        values={macroChartData.map((entry) => entry.protein)}
                                    />
                                    <MacroTrendRow
                                        label="Carbs"
                                        color="#f59e0b"
                                        values={macroChartData.map((entry) => entry.carbs)}
                                    />
                                    <MacroTrendRow
                                        label="Fats"
                                        color="#3b82f6"
                                        values={macroChartData.map((entry) => entry.fats)}
                                    />
                                </View>
                            ) : (
                                <View style={{ height: 90, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                        Log meals to see your macro trends
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                            <StatCard
                                icon={<TrendingUp color="#10b981" size={20} />}
                                iconBg="#10b98120"
                                label="Current Streak"
                                value={`${statsFromUser.current_streak || 0}`}
                                unit={`day${(statsFromUser.current_streak || 0) === 1 ? '' : 's'}`}
                            />
                            <StatCard
                                icon={<Activity color="#3b82f6" size={20} />}
                                iconBg="#3b82f620"
                                label="Total Meals"
                                value={`${statsFromUser.total_meals_logged || 0}`}
                                unit="logged"
                            />
                            <StatCard
                                icon={<Award color="#10b981" size={20} />}
                                iconBg="#10b98120"
                                label="Total Workouts"
                                value={`${statsFromUser.total_workouts || 0}`}
                                unit="completed"
                            />
                            <StatCard
                                icon={<Flame color="#f59e0b" size={20} />}
                                iconBg="#f59e0b20"
                                label="Adherence"
                                value={`${aggregates?.adherencePercentage ?? 0}%`}
                                unit={`${aggregates?.daysWithCalorieLogs ?? 0}/${aggregates?.daysSinceOnboarding ?? 0} days logged`}
                                progress={(aggregates?.adherencePercentage ?? 0) / 100}
                            />
                        </View>

                        {bodyMeasurementEntries.length >= 2 ? (
                            <BodyMeasurements
                                entries={bodyMeasurementEntries}
                                heightCm={user?.height}
                                onAddMeasurement={() => router.push('/(modals)/log-weight' as any)}
                            />
                        ) : (
                            <View
                                style={{
                                    marginTop: 12,
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor: '#334155',
                                    backgroundColor: '#1e293b',
                                    padding: 16,
                                }}
                            >
                                <Text style={{ color: '#f8fafc', fontWeight: '700' }}>Body measurements</Text>
                                <Text style={{ color: '#94a3b8', marginTop: 6 }}>
                                    Log at least two weight entries to unlock body trend insights.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => router.push('/(modals)/log-weight' as any)}
                                    style={{
                                        marginTop: 10,
                                        alignSelf: 'flex-start',
                                        borderRadius: 10,
                                        backgroundColor: '#10b981',
                                        paddingHorizontal: 12,
                                        paddingVertical: 8,
                                    }}
                                >
                                    <Text style={{ color: '#052e16', fontWeight: '700' }}>Log weight</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function TabButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: 'center',
                borderRadius: 10,
                backgroundColor: active ? '#334155' : 'transparent',
            }}
            activeOpacity={0.7}
        >
            <Text style={{ fontWeight: '700', color: active ? '#f8fafc' : '#94a3b8' }}>{title}</Text>
        </TouchableOpacity>
    );
}

function StatCard({
    icon,
    iconBg,
    label,
    value,
    unit,
    progress,
}: {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    value: string;
    unit: string;
    progress?: number;
}) {
    return (
        <View style={{ width: '47%', backgroundColor: '#1e293b', borderRadius: 24, padding: 20 }}>
            <View
                style={{
                    height: 40,
                    width: 40,
                    backgroundColor: iconBg,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                }}
            >
                {icon}
            </View>
            <Text
                style={{
                    color: '#94a3b8',
                    fontSize: 10,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 4,
                }}
            >
                {label}
            </Text>
            <Text style={{ color: '#f8fafc', fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>{value}</Text>
            <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{unit}</Text>
            {progress !== undefined && (
                <View
                    style={{
                        height: 4,
                        backgroundColor: '#0f172a',
                        borderRadius: 99,
                        marginTop: 10,
                        overflow: 'hidden',
                    }}
                >
                    <View
                        style={{
                            height: '100%',
                            backgroundColor: '#10b981',
                            borderRadius: 99,
                            width: `${Math.min(100, progress * 100)}%`,
                        }}
                    />
                </View>
            )}
        </View>
    );
}
