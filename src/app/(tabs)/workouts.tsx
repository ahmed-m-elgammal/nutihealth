import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import EmptyState from '../../components/common/EmptyState';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { addDays, format, startOfWeek } from 'date-fns';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import CollapsibleHeaderScrollView from '../../components/common/CollapsibleHeaderScrollView';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { WeeklyWorkoutPlan } from '../../types/workout';
import { buildWeeklyWorkoutPlanFromSchedules, DEFAULT_WORKOUT_PROFILE } from '../../services/workout/scheduleBuilder';
import { getSchedulePreferencesFromUser, sanitizeSchedulePreferences } from '../../services/workout/schedulePlanner';
import WorkoutCalendarStrip from '../../components/workout/WorkoutCalendarStrip';
import TodayWorkoutCard from '../../components/workout/TodayWorkoutCard';
import WorkoutTrackerModal from '../../components/workout/WorkoutTrackerModal';
import { WorkoutSkeleton } from '../../components/skeletons/ScreenSkeletons';
import { HammockIllustration } from '../../components/illustrations/EmptyStateIllustrations';
import { useUIStore } from '../../store/uiStore';

export default function WorkoutsScreen() {
    const router = useRouter();
    const database = useDatabase();
    const { user, isLoading: isLoadingUser } = useCurrentUser();
    const showToast = useUIStore((state) => state.showToast);

    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyWorkoutPlan | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [isTrackerVisible, setIsTrackerVisible] = useState(false);

    useEffect(() => {
        if (isLoadingUser) {
            setIsLoadingPlan(true);
            return;
        }

        if (!user?.id) {
            setWeeklyPlan(null);
            setIsLoadingPlan(false);
            return;
        }

        const schedulePreferences = sanitizeSchedulePreferences(
            getSchedulePreferencesFromUser(user.workoutPreferences),
        );
        let isMounted = true;

        const schedulesCollection = database.get<WorkoutSchedule>('workout_schedules');
        const subscription = schedulesCollection
            .query(Q.where('user_id', user.id), Q.sortBy('created_at', Q.asc))
            .observe()
            .subscribe({
                next: (schedules) => {
                    void (async () => {
                        try {
                            const plan = await buildWeeklyWorkoutPlanFromSchedules({
                                database,
                                userId: user.id,
                                schedules,
                                userWorkoutPreferences: {
                                    ...(user.workoutPreferences && typeof user.workoutPreferences === 'object'
                                        ? (user.workoutPreferences as Record<string, unknown>)
                                        : {}),
                                    schedulePreferences,
                                },
                                userProfileSnapshot: user.workoutPreferences || DEFAULT_WORKOUT_PROFILE,
                            });

                            if (isMounted) {
                                setWeeklyPlan(plan);
                            }
                        } catch (error) {
                            console.error('Failed to load weekly workout plan:', error);
                            if (isMounted) {
                                setWeeklyPlan(null);
                            }
                        } finally {
                            if (isMounted) {
                                setIsLoadingPlan(false);
                            }
                        }
                    })();
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
    }, [database, isLoadingUser, user?.id, user?.workoutPreferences]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, index) => {
            const date = addDays(weekStart, index);
            const dayName = format(date, 'EEEE');
            const matched = weeklyPlan?.days.find((day) => day.dayOfWeek === dayName);

            return {
                date,
                workoutName: matched?.title,
                intensity:
                    matched?.focus.length && matched.focus.length > 2
                        ? 'high'
                        : matched?.isRestDay
                          ? undefined
                          : 'medium',
                isRestDay: matched?.isRestDay ?? true,
            } as const;
        });
    }, [weekStart, weeklyPlan?.days]);

    const selectedDay = useMemo(() => {
        const selectedName = format(selectedDate, 'EEEE');
        return weeklyPlan?.days.find((day) => day.dayOfWeek === selectedName) || null;
    }, [selectedDate, weeklyPlan?.days]);

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
        <ScreenErrorBoundary screenName="workouts">
            <SafeAreaView className="flex-1 bg-background" edges={['top']}>
                <CollapsibleHeaderScrollView
                    header={
                        <View>
                            <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a' }}>Workouts</Text>
                            <Text style={{ marginTop: 4, color: '#64748b' }}>Your weekly training momentum</Text>
                        </View>
                    }
                    headerHeight={120}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                    {isLoadingPlan ? (
                        <WorkoutSkeleton />
                    ) : !selectedDay || selectedDay.isRestDay ? (
                        <>
                            <WorkoutCalendarStrip
                                weekDays={weekDays}
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                                onPrevWeek={() => {
                                    const next = addDays(weekStart, -7);
                                    setWeekStart(next);
                                    setSelectedDate(next);
                                }}
                                onNextWeek={() => {
                                    const next = addDays(weekStart, 7);
                                    setWeekStart(next);
                                    setSelectedDate(next);
                                }}
                            />
                            <EmptyState
                                illustration={<HammockIllustration />}
                                title="Recovery day"
                                message="No workout is scheduled for this day. Use it to recover and hydrate."
                                actionLabel="Browse Programs"
                                onAction={() => router.push('/(modals)/browse-programs')}
                            />
                        </>
                    ) : (
                        <>
                            <WorkoutCalendarStrip
                                weekDays={weekDays}
                                selectedDate={selectedDate}
                                onDateSelect={setSelectedDate}
                                onPrevWeek={() => {
                                    const next = addDays(weekStart, -7);
                                    setWeekStart(next);
                                    setSelectedDate(next);
                                }}
                                onNextWeek={() => {
                                    const next = addDays(weekStart, 7);
                                    setWeekStart(next);
                                    setSelectedDate(next);
                                }}
                            />

                            <TodayWorkoutCard
                                workout={todayWorkout}
                                isRestDay={selectedDay?.isRestDay ?? true}
                                onStartWorkout={() => setIsTrackerVisible(true)}
                                onPlanWeek={() => router.push('/(modals)/browse-programs')}
                            />
                        </>
                    )}
                </CollapsibleHeaderScrollView>

                <WorkoutTrackerModal
                    visible={isTrackerVisible}
                    day={selectedDay}
                    onClose={() => setIsTrackerVisible(false)}
                    onFinish={(summary) => {
                        setIsTrackerVisible(false);
                        showToast(
                            'success',
                            `Workout complete • ${summary.durationMinutes} min • ${summary.calories} kcal`,
                        );
                    }}
                />
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
