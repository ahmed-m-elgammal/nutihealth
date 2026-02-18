import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, CircuitBoard, Dumbbell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { Q } from '@nozbe/watermelondb';
import { WeeklyCalendar } from '../../components/workout/WeeklyCalendar';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';
import WorkoutTemplate from '../../database/models/WorkoutTemplate';
import { WeeklyWorkoutPlan, WorkoutDay } from '../../types/workout';
import { format } from 'date-fns';
import ScreenErrorBoundary from '../../components/errors/ScreenErrorBoundary';
import { buildWeeklyWorkoutPlanFromSchedules, DEFAULT_WORKOUT_PROFILE } from '../../services/workout/scheduleBuilder';
import {
    WEEK_DAYS,
    applyTemplateScheduleForUser,
    getSchedulePreferencesFromUser,
    sanitizeSchedulePreferences,
    type WorkoutSchedulePreferences,
} from '../../services/workout/schedulePlanner';

export default function WorkoutsScreen() {
    const router = useRouter();
    const database = useDatabase();
    const { user, isLoading: isLoadingUser } = useCurrentUser();
    const [weeklyPlan, setWeeklyPlan] = useState<WeeklyWorkoutPlan | null>(null);
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [isApplyingSchedule, setIsApplyingSchedule] = useState(false);
    const [schedulePreferences, setSchedulePreferences] =
        useState<WorkoutSchedulePreferences>(sanitizeSchedulePreferences());

    useEffect(() => {
        if (!user?.id) {
            return;
        }

        const nextPreferences = getSchedulePreferencesFromUser(user.workoutPreferences);
        setSchedulePreferences((currentPreferences) => {
            const sameStartDay = currentPreferences.startDay === nextPreferences.startDay;
            const sameRestDays = currentPreferences.restDays.join('|') === nextPreferences.restDays.join('|');
            return sameStartDay && sameRestDays ? currentPreferences : nextPreferences;
        });
    }, [user?.id]);

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

                            if (!isMounted) return;
                            setWeeklyPlan(plan);
                        } catch (error) {
                            const errorDetails =
                                error instanceof Error
                                    ? `${error.message}${error.stack ? `\n${error.stack}` : ''}`
                                    : String(error);
                            console.error('Failed to build weekly workout plan from schedules:', errorDetails);
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
                error: (error) => {
                    console.error('Failed to observe workout schedules:', error);
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
    }, [database, user?.id, isLoadingUser, schedulePreferences.startDay, schedulePreferences.restDays.join('|')]);

    const handleDayPress = (day: WorkoutDay) => {
        if (day.isRestDay) {
            Alert.alert('Rest Day', 'Enjoy your recovery! stretch or do some light yoga.');
            return;
        }
        router.push({
            pathname: '/workout/[id]',
            params: { id: day.id },
        });
    };

    const handleOpenPrograms = () => {
        router.push('/(modals)/browse-programs');
    };

    const handleSelectStartDay = (dayOfWeek: WorkoutSchedulePreferences['startDay']) => {
        setSchedulePreferences((previous) =>
            sanitizeSchedulePreferences({
                ...previous,
                startDay: dayOfWeek,
            }),
        );
    };

    const handleToggleRestDay = (dayOfWeek: WorkoutSchedulePreferences['restDays'][number]) => {
        setSchedulePreferences((previous) => {
            const nextRestDays = previous.restDays.includes(dayOfWeek)
                ? previous.restDays.filter((restDay) => restDay !== dayOfWeek)
                : [...previous.restDays, dayOfWeek];

            return sanitizeSchedulePreferences({
                ...previous,
                restDays: nextRestDays,
            });
        });
    };

    const handleApplySchedulePreferences = async () => {
        if (!user?.id) {
            Alert.alert('Profile required', 'Please complete onboarding before updating schedule settings.');
            return;
        }

        setIsApplyingSchedule(true);

        try {
            const schedules = await database
                .get<WorkoutSchedule>('workout_schedules')
                .query(Q.where('user_id', user.id), Q.sortBy('created_at', Q.asc))
                .fetch();

            if (schedules.length === 0) {
                Alert.alert('No active program', 'Choose a training program before customizing schedule settings.');
                return;
            }

            const templateIds = Array.from(new Set(schedules.map((schedule) => schedule.templateId).filter(Boolean)));

            if (templateIds.length === 0) {
                Alert.alert('Invalid program data', 'No workout templates were found for your current schedule.');
                return;
            }

            const templates = await database
                .get<WorkoutTemplate>('workout_templates')
                .query(Q.where('id', Q.oneOf(templateIds)))
                .fetch();

            const templateById = new Map(templates.map((template) => [template.id, template]));
            const orderedTemplates = templateIds
                .map((templateId) => templateById.get(templateId))
                .filter((template): template is WorkoutTemplate => Boolean(template));

            const result = await applyTemplateScheduleForUser({
                database,
                user,
                templates: orderedTemplates,
                preferences: schedulePreferences,
            });

            if (result.droppedTemplateIds.length > 0) {
                Alert.alert(
                    'Schedule applied with adjustments',
                    `${result.droppedTemplateIds.length} workout day(s) were not scheduled because there are more workouts than available training days.`,
                );
                return;
            }

            Alert.alert('Schedule updated', 'Your start day and rest day preferences are now active.');
        } catch (error) {
            console.error('Failed to apply schedule preferences:', error);
            Alert.alert('Unable to update schedule', 'Please try again.');
        } finally {
            setIsApplyingSchedule(false);
        }
    };

    const hasScheduledDays = weeklyPlan ? weeklyPlan.days.some((day) => !day.isRestDay) : false;

    return (
        <ScreenErrorBoundary screenName="workouts">
            <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
                <View className="flex-row items-center justify-between border-b border-neutral-100 bg-white px-6 py-4 shadow-sm">
                    <View>
                        <Text className="text-2xl font-bold text-neutral-900">Workouts</Text>
                        <Text className="mt-1 text-sm text-neutral-500">Your Weekly Schedule</Text>
                    </View>
                    <TouchableOpacity onPress={handleOpenPrograms} className="rounded-full bg-indigo-50 p-2">
                        <CircuitBoard size={24} color="#4F46E5" />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Weekly Calendar Section */}
                    {isLoadingPlan ? (
                        <View className="items-center p-6">
                            <ActivityIndicator size="large" color="#4F46E5" />
                            <Text className="mt-3 text-neutral-500">Loading schedule...</Text>
                        </View>
                    ) : weeklyPlan ? (
                        <WeeklyCalendar
                            plan={weeklyPlan}
                            activeDayId={weeklyPlan.days.find((d) => d.dayOfWeek === format(new Date(), 'EEEE'))?.id}
                            onDayPress={handleDayPress}
                        />
                    ) : (
                        <View className="p-6">
                            <Text className="text-neutral-500">Unable to load your workout schedule.</Text>
                        </View>
                    )}

                    {!isLoadingPlan && weeklyPlan && (
                        <View className="mt-1 px-6">
                            <View className="rounded-2xl border border-neutral-100 bg-white p-4">
                                <Text className="mb-1 font-semibold text-neutral-900">Schedule Controls</Text>
                                <Text className="mb-3 text-sm text-neutral-500">
                                    Choose your week start and rest days, then re-apply your active program schedule.
                                </Text>

                                <Text className="mb-2 text-xs font-medium uppercase text-neutral-700">Start Day</Text>
                                <View className="mb-3 flex-row flex-wrap">
                                    {WEEK_DAYS.map((dayOfWeek) => {
                                        const isSelected = schedulePreferences.startDay === dayOfWeek;
                                        return (
                                            <TouchableOpacity
                                                key={`start_${dayOfWeek}`}
                                                onPress={() => handleSelectStartDay(dayOfWeek)}
                                                className={`mb-2 mr-2 rounded-full border px-3 py-2 ${
                                                    isSelected
                                                        ? 'border-indigo-600 bg-indigo-600'
                                                        : 'border-neutral-200 bg-white'
                                                }`}
                                            >
                                                <Text
                                                    className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-neutral-600'}`}
                                                >
                                                    {dayOfWeek.slice(0, 3)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text className="mb-2 text-xs font-medium uppercase text-neutral-700">Rest Days</Text>
                                <View className="mb-3 flex-row flex-wrap">
                                    {WEEK_DAYS.map((dayOfWeek) => {
                                        const isRestDay = schedulePreferences.restDays.includes(dayOfWeek);
                                        return (
                                            <TouchableOpacity
                                                key={`rest_${dayOfWeek}`}
                                                onPress={() => handleToggleRestDay(dayOfWeek)}
                                                className={`mb-2 mr-2 rounded-full border px-3 py-2 ${
                                                    isRestDay
                                                        ? 'border-amber-300 bg-amber-100'
                                                        : 'border-neutral-200 bg-white'
                                                }`}
                                            >
                                                <Text
                                                    className={`text-xs font-semibold ${isRestDay ? 'text-amber-800' : 'text-neutral-600'}`}
                                                >
                                                    {dayOfWeek.slice(0, 3)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <TouchableOpacity
                                    onPress={() => void handleApplySchedulePreferences()}
                                    disabled={isApplyingSchedule}
                                    className={`items-center rounded-xl py-3 ${isApplyingSchedule ? 'bg-neutral-300' : 'bg-indigo-600'}`}
                                >
                                    <Text className="font-semibold text-white">
                                        {isApplyingSchedule ? 'Applying...' : 'Apply Schedule Preferences'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {!isLoadingPlan && weeklyPlan && !hasScheduledDays && (
                        <View className="mt-1 px-6">
                            <View className="rounded-2xl border border-neutral-100 bg-white p-4">
                                <Text className="mb-1 font-semibold text-neutral-900">No active program selected</Text>
                                <Text className="mb-3 text-sm text-neutral-500">
                                    Choose a training program to build your persistent weekly schedule.
                                </Text>
                                <TouchableOpacity
                                    onPress={handleOpenPrograms}
                                    className="items-center rounded-xl bg-indigo-600 py-3"
                                >
                                    <Text className="font-semibold text-white">Browse Programs</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Quick Actions / Legacy Support */}
                    <View className="mt-4 px-6">
                        <Text className="mb-4 text-lg font-bold text-neutral-900">Quick Actions</Text>

                        <View className="mb-4 flex-row gap-4">
                            <TouchableOpacity
                                className="flex-1 rounded-2xl border border-neutral-100 bg-white p-4 shadow-sm"
                                onPress={() => router.push('/(modals)/log-workout')}
                            >
                                <View className="mb-3 self-start rounded-xl bg-neutral-100 p-3">
                                    <Plus size={24} color="#171717" />
                                </View>
                                <Text className="text-base font-bold text-neutral-900">Quick Log</Text>
                                <Text className="text-xs text-neutral-500">Record manually</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 rounded-2xl border border-indigo-600 bg-indigo-600 p-4 shadow-sm"
                                onPress={handleOpenPrograms}
                            >
                                <View className="mb-3 self-start rounded-xl bg-indigo-500 p-3">
                                    <Dumbbell size={24} color="#FFFFFF" />
                                </View>
                                <Text className="text-base font-bold text-white">Browse Library</Text>
                                <Text className="text-xs text-indigo-100">Structured Programs</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </ScreenErrorBoundary>
    );
}
