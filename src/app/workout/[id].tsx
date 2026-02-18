import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { ActiveWorkoutTracker } from '../../components/workout/ActiveWorkoutTracker';
import { useWorkoutStore } from '../../store/workoutStore';
import { WorkoutDay } from '../../types/workout';
import WorkoutSchedule from '../../database/models/WorkoutSchedule';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
    buildWeeklyWorkoutPlanFromSchedules,
    DEFAULT_WORKOUT_PROFILE,
} from '../../services/workout/scheduleBuilder';

export default function ActiveWorkoutScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const database = useDatabase();
    const { addSession } = useWorkoutStore();
    const { user } = useCurrentUser();

    const [isLoading, setIsLoading] = useState(true);
    const [day, setDay] = useState<WorkoutDay | null>(null);
    const [isTracking, setIsTracking] = useState(false);

    useEffect(() => {
        const scheduleId = Array.isArray(id) ? id[0] : id;

        if (!scheduleId) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const loadScheduledWorkoutDay = async () => {
            try {
                setIsLoading(true);

                const schedule = await database.get<WorkoutSchedule>('workout_schedules').find(scheduleId);
                const weeklyPlan = await buildWeeklyWorkoutPlanFromSchedules({
                    database,
                    userId: schedule.userId,
                    schedules: [schedule],
                    userWorkoutPreferences: user?.workoutPreferences,
                    userProfileSnapshot: user?.workoutPreferences || DEFAULT_WORKOUT_PROFILE,
                });

                const resolvedDay = weeklyPlan.days.find(
                    (item) => item.id === schedule.id && !item.isRestDay
                ) || weeklyPlan.days.find((item) => !item.isRestDay) || null;

                if (!isMounted) {
                    return;
                }

                setDay(resolvedDay);
                setIsTracking(false);
            } catch (error) {
                console.error('Failed to load scheduled workout day:', error);
                if (isMounted) {
                    setDay(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void loadScheduledWorkoutDay();

        return () => {
            isMounted = false;
        };
    }, [database, id, user?.id]);

    if (isLoading) {
        return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>;
    }

    if (!day) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <Text className="text-lg font-semibold text-neutral-900 mb-2">Workout not found</Text>
                <Text className="text-neutral-500 text-center mb-4">
                    This scheduled workout could not be loaded. Select a training program and try again.
                </Text>
                <TouchableOpacity onPress={() => router.back()} className="bg-indigo-600 rounded-xl px-5 py-3">
                    <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!isTracking) {
        return (
            <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
                <View className="px-6 py-4 border-b border-neutral-200 bg-white">
                    <TouchableOpacity onPress={() => router.back()} className="mb-3">
                        <Text className="text-indigo-600 font-semibold">Back</Text>
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-neutral-900">{day.title}</Text>
                    <Text className="text-neutral-500 mt-1">
                        {day.dayOfWeek} • {day.estimatedDuration} min • {day.mainWorkout.length} exercises
                    </Text>
                    {day.focus.length > 0 ? (
                        <Text className="text-neutral-500 text-xs mt-1">Focus: {day.focus.join(', ')}</Text>
                    ) : null}
                </View>

                <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 12, paddingBottom: 120 }}>
                    {day.mainWorkout.map((exercise, index) => {
                        const mediaUrl = exercise.thumbnailUrl || exercise.videoUrl;
                        return (
                            <View key={`${exercise.id}_${index}`} className="bg-white border border-neutral-200 rounded-2xl p-4 mb-4">
                                <Text className="text-base font-bold text-neutral-900 mb-1">
                                    {index + 1}. {exercise.name}
                                </Text>
                                <Text className="text-neutral-600 text-sm mb-2">
                                    {exercise.sets} x {exercise.reps} {exercise.repType} • {exercise.restPeriod}s rest
                                    {exercise.rpe ? ` • RPE ${exercise.rpe}` : ''}
                                </Text>

                                {mediaUrl ? (
                                    <Image
                                        source={{ uri: mediaUrl }}
                                        style={{ width: '100%', height: 190, borderRadius: 12, marginBottom: 12 }}
                                        contentFit="contain"
                                        transition={200}
                                    />
                                ) : null}

                                {exercise.instructions?.length ? (
                                    <View className="mb-2">
                                        <Text className="text-neutral-900 font-semibold text-xs mb-1">Instructions</Text>
                                        {exercise.instructions.slice(0, 4).map((instruction, instructionIndex) => (
                                            <Text key={`${exercise.id}_inst_${instructionIndex}`} className="text-neutral-600 text-xs mb-1">
                                                • {instruction}
                                            </Text>
                                        ))}
                                    </View>
                                ) : null}

                                {exercise.formTips?.length ? (
                                    <View>
                                        <Text className="text-neutral-900 font-semibold text-xs mb-1">Form Tips</Text>
                                        {exercise.formTips.slice(0, 3).map((tip, tipIndex) => (
                                            <Text key={`${exercise.id}_tip_${tipIndex}`} className="text-neutral-600 text-xs mb-1">
                                                • {tip}
                                            </Text>
                                        ))}
                                    </View>
                                ) : null}
                            </View>
                        );
                    })}
                </ScrollView>

                <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-200">
                    <TouchableOpacity
                        onPress={() => setIsTracking(true)}
                        className="bg-indigo-600 rounded-2xl py-4 items-center"
                    >
                        <Text className="text-white font-bold text-base">Start Workout</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ActiveWorkoutTracker
                day={day}
                onFinishWorkout={(session) => {
                    addSession(session);

                    Alert.alert(
                        'Workout Complete',
                        `Great work! Duration: ${session.duration} min`,
                        [{ text: 'Done', onPress: () => router.back() }]
                    );
                }}
                onCancel={() => setIsTracking(false)}
            />
        </View>
    );
}
