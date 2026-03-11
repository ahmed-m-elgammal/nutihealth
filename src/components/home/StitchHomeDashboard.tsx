import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, type DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Bell, Activity, ScanLine, Droplets, Utensils, ChefHat } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useDailyTotals } from '../../hooks/useDailyTotals';
import { useProgressAggregates } from '../../query/queries/useProgressAggregates';
import { DEFAULT_TARGETS } from '../../constants/nutritionDefaults';
import { useWaterStore } from '../../store/waterStore';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
}

export default function HomeDashboard() {
    const router = useRouter();
    const { user, isLoading: isLoadingUser } = useCurrentUser();
    const [today, setToday] = useState(() => new Date());
    const { dailyTotals, isLoading: isLoadingTotals } = useDailyTotals(today, user?.id);
    const { data: aggregates, isLoading: isLoadingAggregates } = useProgressAggregates(user?.id);
    const totalConsumed = useWaterStore((state) => state.totalConsumed);
    const targetAmount = useWaterStore((state) => state.targetAmount);
    const loadTodaysWater = useWaterStore((state) => state.loadTodaysWater);

    useEffect(() => {
        loadTodaysWater().catch(() => undefined);
    }, [loadTodaysWater, today]);

    useEffect(() => {
        // Calculate ms until the next midnight, then refresh 'today'
        const scheduleNextRefresh = () => {
            const now = new Date();
            const midnight = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1, // next calendar day
                0,
                0,
                1, // 1 second past midnight to be safe
            );
            const msUntilMidnight = midnight.getTime() - Date.now();

            const timer = setTimeout(() => {
                setToday(new Date()); // triggers re-render with new date
                scheduleNextRefresh(); // reschedule for the NEXT midnight
            }, msUntilMidnight);

            return timer;
        };

        const timer = scheduleNextRefresh();
        return () => clearTimeout(timer);
    }, []);

    const calorieGoal = user?.calorieTarget || DEFAULT_TARGETS.calories;
    const consumedCalories = Math.round(dailyTotals.calories);
    const remainingCalories = Math.max(0, calorieGoal - consumedCalories);
    const calorieProgress = calorieGoal > 0 ? Math.min(1, consumedCalories / calorieGoal) : 0;
    const calorieProgressWidth: DimensionValue = `${Math.round(calorieProgress * 100)}%`;

    // Water: use today's consumed amount from water store.
    const waterMl = totalConsumed ?? 0;
    const waterGoalMl = targetAmount > 0 ? targetAmount : 2000;
    const waterGlasses = Math.round(waterMl / 250);
    const waterGoalGlasses = Math.round(waterGoalMl / 250);

    const isLoading = isLoadingUser || isLoadingTotals;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 16,
                        marginBottom: 32,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)/profile' as any)}
                            style={{
                                height: 48,
                                width: 48,
                                borderRadius: 24,
                                backgroundColor: '#1e293b',
                                borderWidth: 1,
                                borderColor: '#334155',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 16,
                            }}
                        >
                            <User color="#10b981" size={24} />
                        </TouchableOpacity>
                        <View>
                            <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '500', letterSpacing: 0.5 }}>
                                {getGreeting()}
                            </Text>
                            <Text
                                style={{
                                    color: '#f8fafc',
                                    fontSize: 22,
                                    fontWeight: '700',
                                    marginTop: 2,
                                    letterSpacing: -0.5,
                                }}
                            >
                                {isLoadingUser ? '...' : user?.name?.split(' ')[0] || 'Friend'}!
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/profile?section=notifications' as any)}
                        style={{
                            height: 40,
                            width: 40,
                            borderRadius: 20,
                            backgroundColor: '#1e293b',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        accessibilityLabel="Notification settings"
                        accessibilityRole="button"
                    >
                        <Bell color="#f8fafc" size={20} />
                    </TouchableOpacity>
                </View>

                {/* Today's Overview */}
                <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
                    Today's Overview
                </Text>
                <View style={{ backgroundColor: '#1e293b', borderRadius: 24, padding: 24, marginBottom: 32 }}>
                    {isLoading ? (
                        <ActivityIndicator color="#10b981" />
                    ) : (
                        <>
                            {/* Calories */}
                            <View style={{ marginBottom: 24 }}>
                                <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '500', marginBottom: 4 }}>
                                    Calories Remaining
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                                    <Text
                                        style={{ color: '#f8fafc', fontSize: 40, fontWeight: '800', letterSpacing: -1 }}
                                    >
                                        {remainingCalories.toLocaleString()}
                                    </Text>
                                    <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '700' }}>kcal</Text>
                                </View>
                                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                                    {consumedCalories.toLocaleString()} / {calorieGoal.toLocaleString()} consumed
                                </Text>
                                {/* Progress Bar */}
                                <View
                                    style={{
                                        height: 8,
                                        width: '100%',
                                        backgroundColor: '#0f172a',
                                        borderRadius: 99,
                                        marginTop: 12,
                                        overflow: 'hidden',
                                    }}
                                >
                                    <View
                                        style={{
                                            height: '100%',
                                            backgroundColor: '#10b981',
                                            borderRadius: 99,
                                            width: calorieProgressWidth,
                                        }}
                                    />
                                </View>
                            </View>

                            {/* Macros Row */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                                <MacroChip label="Protein" value={`${Math.round(dailyTotals.protein)}g`} />
                                <MacroChip label="Carbs" value={`${Math.round(dailyTotals.carbs)}g`} />
                                <MacroChip label="Fats" value={`${Math.round(dailyTotals.fats)}g`} />
                            </View>

                            {/* Water & Streak Row */}
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#0f172a',
                                        borderRadius: 16,
                                        padding: 16,
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                    }}
                                >
                                    <View
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                    >
                                        <Droplets color="#3b82f6" size={16} />
                                        <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>
                                            Water Today
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 16 }}>
                                        {waterGlasses}{' '}
                                        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '400' }}>
                                            / {waterGoalGlasses} glasses
                                        </Text>
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#0f172a',
                                        borderRadius: 16,
                                        padding: 16,
                                        borderWidth: 1,
                                        borderColor: '#334155',
                                    }}
                                >
                                    <View
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
                                    >
                                        <Activity color="#f59e0b" size={16} />
                                        <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>
                                            Streak
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 16 }}>
                                        {isLoadingAggregates ? '…' : (aggregates?.currentStreak ?? 0)}{' '}
                                        <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '400' }}>days</Text>
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>

                {/* Quick Actions */}
                <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '700', marginBottom: 16 }}>
                    Quick Actions
                </Text>
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 32,
                    }}
                >
                    <ActionTile
                        icon={<Utensils color="#10b981" size={28} />}
                        label="Log Meal"
                        onPress={() => router.push('/(modals)/add-meal')}
                    />
                    <ActionTile
                        icon={<ScanLine color="#10b981" size={28} />}
                        label="Scan Barcode"
                        onPress={() => router.push('/(modals)/barcode-scanner')}
                    />
                    <ActionTile
                        icon={<Activity color="#10b981" size={28} />}
                        label="Quick Workout"
                        onPress={() => router.push('/(modals)/browse-programs')}
                    />
                    <ActionTile
                        icon={<ChefHat color="#10b981" size={28} />}
                        label="Smart Cooker"
                        onPress={() => router.push('/(modals)/smart-cooker')}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function MacroChip({ label, value }: { label: string; value: string }) {
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: '#0f172a',
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#334155',
            }}
        >
            <Text
                style={{
                    color: '#94a3b8',
                    fontSize: 10,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                }}
            >
                {label}
            </Text>
            <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '700', marginTop: 2 }}>{value}</Text>
        </View>
    );
}

function ActionTile({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            style={{
                width: '48%',
                backgroundColor: '#1e293b',
                borderRadius: 20,
                padding: 20,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <View
                style={{
                    height: 56,
                    width: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                }}
            >
                {icon}
            </View>
            <Text style={{ color: '#f8fafc', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>{label}</Text>
        </TouchableOpacity>
    );
}
