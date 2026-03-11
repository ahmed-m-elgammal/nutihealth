import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Activity, Clock, Dumbbell, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { format, addDays, startOfWeek } from 'date-fns';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useUIStore } from '../../store/uiStore';
import { useWaterStore } from '../../store/waterStore';
import { usePostHog } from 'posthog-react-native';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';
import { WeeklyWorkoutPlan } from '../../types/workout';
import { buildWeeklyWorkoutPlanFromSchedules, DEFAULT_WORKOUT_PROFILE } from '../../services/workout/scheduleBuilder';
import { getSchedulePreferencesFromUser, sanitizeSchedulePreferences } from '../../services/workout/schedulePlanner';
import WorkoutTrackerModal from './WorkoutTrackerModal';
import type { WorkoutIntensity } from '../../utils/nutrition/workoutCalories';

const buildScheduleSignature = (schedules: WorkoutSchedule[]): string =>
    schedules
        .map((s) => `${s.id}:${s.templateId}:${s.dayOfWeek}`)
        .sort()
        .join('|');

const INTENSITY_COLORS: Record<string, string> = {
    High: '#ef4444',
    Medium: '#f59e0b',
    Beginner: '#10b981',
};

export default function WorkoutsDashboard() {
    const router = useRouter();
    const database = useDatabase();
    const { user, isLoading: isLoadingUser } = useCurrentUser();
    const showToast = useUIStore((state) => state.showToast);
    const calculateDynamicTarget = useWaterStore((state) => state.calculateDynamicTarget);
    const posthog = usePostHog();

    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyWorkoutPlan | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isTrackerVisible, setIsTrackerVisible] = useState(false);

    const userWorkoutPreferences = useMemo(
        () =>
            user?.workoutPreferences && typeof user.workoutPreferences === 'object'
                ? (user.workoutPreferences as Record<string, unknown>)
                : {},
        [user],
    );

    const schedulePreferences = useMemo(
        () => sanitizeSchedulePreferences(getSchedulePreferencesFromUser(userWorkoutPreferences)),
        [userWorkoutPreferences],
    );

    // Build weekly plan from WatermelonDB schedules (same logic as original workouts.tsx)
    useEffect(() => {
        if (isLoadingUser) return;
        if (!user?.id) {
            setWeeklyPlan(null);
            setIsLoadingPlan(false);
            return;
        }

        let isMounted = true;
        let isBuilding = false;
        let pendingSchedules: WorkoutSchedule[] | null = null;
        let lastHandledSig: string | null = null;
        let lastQueuedSig: string | null = null;

        const schedulesCollection = database.get<WorkoutSchedule>('workout_schedules');

        const buildPlan = async (schedules: WorkoutSchedule[]) => {
            if (isBuilding) {
                pendingSchedules = schedules;
                return;
            }
            isBuilding = true;
            lastHandledSig = buildScheduleSignature(schedules);
            try {
                const plan = await buildWeeklyWorkoutPlanFromSchedules({
                    database,
                    userId: user.id,
                    schedules,
                    userWorkoutPreferences: { ...userWorkoutPreferences, schedulePreferences },
                    userProfileSnapshot:
                        Object.keys(userWorkoutPreferences).length > 0
                            ? (userWorkoutPreferences as any)
                            : DEFAULT_WORKOUT_PROFILE,
                });
                if (isMounted) setWeeklyPlan(plan);
            } catch {
                if (isMounted) setWeeklyPlan(null);
            } finally {
                isBuilding = false;
                if (isMounted) setIsLoadingPlan(false);
                if (pendingSchedules) {
                    const next = pendingSchedules;
                    pendingSchedules = null;
                    if (!lastHandledSig || buildScheduleSignature(next) !== lastHandledSig) {
                        buildPlan(next).catch(() => undefined);
                    }
                }
            }
        };

        const subscription = schedulesCollection
            .query(Q.where('user_id', user.id), Q.sortBy('created_at', Q.asc))
            .observe()
            .subscribe({
                next: (schedules) => {
                    const sig = buildScheduleSignature(schedules);
                    if (lastQueuedSig !== null && sig === lastQueuedSig) return;
                    lastQueuedSig = sig;
                    buildPlan(schedules).catch(() => undefined);
                },
                error: () => {
                    if (isMounted) {
                        setWeeklyPlan(null);
                        setIsLoadingPlan(false);
                    }
                },
            });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [database, isLoadingUser, schedulePreferences, user?.id, userWorkoutPreferences]);

    // Compute week days strip
    const weekDays = useMemo(
        () =>
            Array.from({ length: 7 }).map((_, i) => {
                const date = addDays(weekStart, i);
                const dayName = format(date, 'EEEE');
                const matched = weeklyPlan?.days.find((d) => d.dayOfWeek === dayName);
                return { date, dayName, isRestDay: matched?.isRestDay ?? true };
            }),
        [weekStart, weeklyPlan],
    );

    const selectedDay = useMemo(() => {
        const name = format(selectedDate, 'EEEE');
        return weeklyPlan?.days.find((d) => d.dayOfWeek === name) || null;
    }, [selectedDate, weeklyPlan]);

    const todayWorkout = useMemo(() => {
        if (!selectedDay || selectedDay.isRestDay) return undefined;
        return {
            name: selectedDay.title,
            muscleGroups: selectedDay.focus.slice(0, 4).map((m) => m.replace('_', ' ')),
            duration: selectedDay.estimatedDuration,
            calories: Math.round(selectedDay.estimatedDuration * 7.2),
            intensity: selectedDay.focus.length >= 3 ? 'High' : 'Medium',
        };
    }, [selectedDay]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ marginTop: 16, marginBottom: 24 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: '500' }}>
                        {format(selectedDate, 'EEEE, MMMM d')}
                    </Text>
                    <Text
                        style={{ color: '#f8fafc', fontSize: 28, fontWeight: '700', marginTop: 2, letterSpacing: -0.5 }}
                    >
                        Workouts
                    </Text>
                </View>

                {isLoadingPlan ? (
                    <ActivityIndicator color="#10b981" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Week Strip */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {weekDays.map(({ date, dayName, isRestDay }) => {
                                    const isSelected =
                                        format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                                    return (
                                        <TouchableOpacity
                                            key={dayName}
                                            onPress={() => setSelectedDate(date)}
                                            style={{
                                                alignItems: 'center',
                                                paddingVertical: 12,
                                                paddingHorizontal: 14,
                                                borderRadius: 16,
                                                backgroundColor: isSelected ? '#10b981' : '#1e293b',
                                                minWidth: 52,
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={{
                                                    color: isSelected ? '#fff' : '#94a3b8',
                                                    fontSize: 11,
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {format(date, 'EEE')}
                                            </Text>
                                            <Text
                                                style={{
                                                    color: isSelected ? '#fff' : '#f8fafc',
                                                    fontSize: 18,
                                                    fontWeight: '700',
                                                    marginTop: 2,
                                                }}
                                            >
                                                {format(date, 'd')}
                                            </Text>
                                            <View
                                                style={{
                                                    height: 6,
                                                    width: 6,
                                                    borderRadius: 3,
                                                    marginTop: 6,
                                                    backgroundColor: isRestDay
                                                        ? '#334155'
                                                        : isSelected
                                                          ? '#fff'
                                                          : '#10b981',
                                                }}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Today's workout or Rest Day */}
                        {!selectedDay || selectedDay.isRestDay ? (
                            <View
                                style={{
                                    backgroundColor: '#1e293b',
                                    borderRadius: 24,
                                    padding: 24,
                                    alignItems: 'center',
                                    marginBottom: 24,
                                }}
                            >
                                <Text style={{ color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                                    Rest & Recovery 🛌
                                </Text>
                                <Text style={{ color: '#94a3b8', textAlign: 'center', lineHeight: 20 }}>
                                    No workout scheduled for today. Use it to recover and hydrate.
                                </Text>
                                <TouchableOpacity
                                    onPress={() => router.push('/(modals)/browse-programs')}
                                    style={{
                                        marginTop: 16,
                                        backgroundColor: '#334155',
                                        borderRadius: 12,
                                        paddingHorizontal: 20,
                                        paddingVertical: 10,
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={{ color: '#f8fafc', fontWeight: '700' }}>Browse Programs</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                {/* Workout Card */}
                                <View
                                    style={{
                                        backgroundColor: '#1e293b',
                                        borderRadius: 24,
                                        padding: 24,
                                        marginBottom: 24,
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 16,
                                        }}
                                    >
                                        <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '700', flex: 1 }}>
                                            {todayWorkout?.name}
                                        </Text>
                                        <View
                                            style={{
                                                backgroundColor: `${INTENSITY_COLORS[todayWorkout?.intensity || 'Medium']}20`,
                                                borderRadius: 8,
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: INTENSITY_COLORS[todayWorkout?.intensity || 'Medium'],
                                                    fontSize: 11,
                                                    fontWeight: '700',
                                                }}
                                            >
                                                {todayWorkout?.intensity}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Stats Row */}
                                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Clock color="#94a3b8" size={14} />
                                            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                                {todayWorkout?.duration} min
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Activity color="#94a3b8" size={14} />
                                            <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                                                ~{todayWorkout?.calories} kcal
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Muscle Groups */}
                                    {todayWorkout?.muscleGroups && todayWorkout.muscleGroups.length > 0 && (
                                        <View
                                            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}
                                        >
                                            {todayWorkout.muscleGroups.map((group) => (
                                                <View
                                                    key={group}
                                                    style={{
                                                        backgroundColor: 'rgba(16,185,129,0.12)',
                                                        borderRadius: 8,
                                                        paddingHorizontal: 10,
                                                        paddingVertical: 4,
                                                    }}
                                                >
                                                    <Text
                                                        style={{
                                                            color: '#10b981',
                                                            fontSize: 11,
                                                            fontWeight: '700',
                                                            textTransform: 'capitalize',
                                                        }}
                                                    >
                                                        {group}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {/* Exercises Count */}
                                    {selectedDay.mainWorkout.length > 0 && (
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 8,
                                                marginBottom: 20,
                                                backgroundColor: '#0f172a',
                                                borderRadius: 12,
                                                padding: 12,
                                            }}
                                        >
                                            <Dumbbell color="#10b981" size={16} />
                                            <Text style={{ color: '#f8fafc', fontSize: 13 }}>
                                                {selectedDay.mainWorkout.length} exercise
                                                {selectedDay.mainWorkout.length !== 1 ? 's' : ''}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Start Button */}
                                    <TouchableOpacity
                                        onPress={() => {
                                            const workoutName = todayWorkout?.name || selectedDay.title;
                                            const intensity = todayWorkout?.intensity || 'Medium';
                                            const estimatedDuration =
                                                todayWorkout?.duration || selectedDay.estimatedDuration || 0;
                                            posthog.capture('workout_started', {
                                                workout_name: workoutName,
                                                intensity,
                                                estimated_duration: estimatedDuration,
                                            });
                                            setIsTrackerVisible(true);
                                        }}
                                        style={{
                                            backgroundColor: '#10b981',
                                            borderRadius: 16,
                                            height: 52,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 10,
                                        }}
                                        activeOpacity={0.85}
                                    >
                                        <Play color="#fff" size={20} fill="#fff" />
                                        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>
                                            Start Workout
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Exercises Preview */}
                                {selectedDay.mainWorkout.length > 0 && (
                                    <View style={{ backgroundColor: '#1e293b', borderRadius: 20, overflow: 'hidden' }}>
                                        <Text
                                            style={{
                                                color: '#f8fafc',
                                                fontSize: 15,
                                                fontWeight: '700',
                                                paddingHorizontal: 20,
                                                paddingTop: 16,
                                                paddingBottom: 12,
                                            }}
                                        >
                                            Exercises
                                        </Text>
                                        {selectedDay.mainWorkout.slice(0, 6).map((exercise, idx) => (
                                            <View
                                                key={exercise.id}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    paddingHorizontal: 20,
                                                    paddingVertical: 12,
                                                    borderTopWidth: 1,
                                                    borderTopColor: '#334155',
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        height: 32,
                                                        width: 32,
                                                        backgroundColor: '#0f172a',
                                                        borderRadius: 10,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: 12,
                                                    }}
                                                >
                                                    <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '700' }}>
                                                        {idx + 1}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ color: '#f8fafc', fontWeight: '600', fontSize: 14 }}>
                                                        {exercise.name}
                                                    </Text>
                                                    <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                                                        {exercise.sets} sets × {exercise.reps}{' '}
                                                        {exercise.repType === 'time' ? 'sec' : 'reps'}
                                                    </Text>
                                                </View>
                                                <ChevronRight color="#334155" size={16} />
                                            </View>
                                        ))}
                                        {selectedDay.mainWorkout.length > 6 && (
                                            <TouchableOpacity
                                                onPress={() => setIsTrackerVisible(true)}
                                                style={{
                                                    paddingHorizontal: 20,
                                                    paddingVertical: 14,
                                                    borderTopWidth: 1,
                                                    borderTopColor: '#334155',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <Text style={{ color: '#10b981', fontWeight: '600', fontSize: 13 }}>
                                                    +{selectedDay.mainWorkout.length - 6} more exercises
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </>
                        )}

                        {/* Browse Programs link */}
                        <TouchableOpacity
                            onPress={() => router.push('/(modals)/browse-programs')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                marginTop: 20,
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={{ color: '#94a3b8', fontSize: 13 }}>Browse all programs</Text>
                            <ChevronRight color="#94a3b8" size={14} />
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* Workout Tracker Modal */}
            <WorkoutTrackerModal
                visible={isTrackerVisible}
                day={selectedDay}
                onClose={() => setIsTrackerVisible(false)}
                onFinish={(summary) => {
                    posthog.capture('workout_completed', {
                        duration_minutes: summary.durationMinutes,
                        calories_burned: summary.calories,
                    });
                    calculateDynamicTarget(undefined, summary.durationMinutes).catch(() => undefined);
                    setIsTrackerVisible(false);
                    showToast(
                        'success',
                        `Workout complete • ${summary.durationMinutes} min • ${summary.calories} kcal`,
                    );
                }}
                userWeightKg={user?.weight}
                workoutIntensity={(selectedDay as any)?.intensity as WorkoutIntensity | undefined}
            />
        </SafeAreaView>
    );
}
