import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Dumbbell } from 'lucide-react-native';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { seedWorkoutPrograms } from '../../database/seeds';
import TrainingProgram from '../../database/models/TrainingProgram';
import WorkoutTemplate from '../../database/models/WorkoutTemplate';
import Workout from '../../database/models/Workout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { applyTemplateScheduleForUser, getSchedulePreferencesFromUser } from '../../services/workout/schedulePlanner';
import { buildProgramInsight, getProgramByTitle } from '../../services/workout/programCatalog';
import { recommendProgramsForUser } from '../../services/workout/recommendations';

const LEVEL_FILTERS: Array<'all' | 'beginner' | 'intermediate' | 'advanced'> = [
    'all',
    'beginner',
    'intermediate',
    'advanced',
];

export default function BrowseProgramsScreen() {
    const router = useRouter();
    const database = useDatabase();
    const { user } = useCurrentUser();
    const [filterLevel, setFilterLevel] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
    const [isInitializing, setIsInitializing] = useState(true);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
    const [selectingProgramId, setSelectingProgramId] = useState<string | null>(null);
    const [programs, setPrograms] = useState<TrainingProgram[]>([]);
    const [templateCountByProgram, setTemplateCountByProgram] = useState<Record<string, number>>({});
    const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);

    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                await seedWorkoutPrograms();
            } catch (error) {
                console.error('Failed to seed workout programs:', error);
            } finally {
                if (isMounted) {
                    setIsInitializing(false);
                }
            }
        };

        void initialize();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        setIsLoadingPrograms(true);

        const programsCollection = database.get<TrainingProgram>('training_programs');
        const query = filterLevel === 'all'
            ? programsCollection.query(Q.sortBy('name', Q.asc))
            : programsCollection.query(
                Q.where('level', filterLevel),
                Q.sortBy('name', Q.asc)
            );

        const subscription = query.observe().subscribe({
            next: (items) => {
                setPrograms(items);
                setIsLoadingPrograms(false);
            },
            error: (error) => {
                console.error('Failed to observe training programs:', error);
                setPrograms([]);
                setIsLoadingPrograms(false);
            },
        });

        return () => subscription.unsubscribe();
    }, [database, filterLevel]);

    useEffect(() => {
        if (programs.length === 0) {
            setTemplateCountByProgram({});
            return;
        }

        let isMounted = true;

        const loadTemplateCounts = async () => {
            try {
                const programIds = programs.map((program) => program.id);
                const templates = await database
                    .get<WorkoutTemplate>('workout_templates')
                    .query(Q.where('program_id', Q.oneOf(programIds)))
                    .fetch();

                const countMap: Record<string, number> = {};
                templates.forEach((template) => {
                    if (!template.programId) return;
                    countMap[template.programId] = (countMap[template.programId] || 0) + 1;
                });

                if (isMounted) {
                    setTemplateCountByProgram(countMap);
                }
            } catch (error) {
                console.error('Failed to load workout template counts:', error);
                if (isMounted) {
                    setTemplateCountByProgram({});
                }
            }
        };

        void loadTemplateCounts();

        return () => {
            isMounted = false;
        };
    }, [database, programs]);

    useEffect(() => {
        if (!user?.id) {
            setRecentWorkouts([]);
            return;
        }

        const now = Date.now();
        const lookbackStart = now - (42 * 24 * 60 * 60 * 1000);

        const subscription = database
            .get<Workout>('workouts')
            .query(
                Q.where('user_id', user.id),
                Q.where('started_at', Q.gte(lookbackStart)),
                Q.sortBy('started_at', Q.desc)
            )
            .observe()
            .subscribe({
                next: setRecentWorkouts,
                error: (error) => {
                    console.error('Failed to observe workout history for recommendations:', error);
                    setRecentWorkouts([]);
                },
            });

        return () => subscription.unsubscribe();
    }, [database, user?.id]);

    const recommendationsByProgramId = useMemo(() => {
        if (!user) {
            return {};
        }

        const candidates = programs.map((program) => {
            const metadata = getProgramByTitle(program.name);
            const insights = metadata ? buildProgramInsight(metadata) : null;
            const daysPerWeek = metadata?.daysPerWeek || templateCountByProgram[program.id] || 3;

            return {
                id: program.id,
                name: program.name,
                level: program.level,
                durationWeeks: program.durationWeeks,
                daysPerWeek,
                category: metadata?.category,
                equipment: metadata?.equipment || ['bodyweight'],
                averageSessionDuration: insights?.averageSessionDuration || 45,
            };
        });

        const recommendations = recommendProgramsForUser(
            {
                goal: user.goal,
                activityLevel: user.activityLevel,
                workoutPreferences: user.workoutPreferences,
            },
            candidates,
            recentWorkouts.map((workout) => ({
                startedAt: workout.startedAt,
                duration: workout.duration,
            }))
        );

        return recommendations.reduce<Record<string, (typeof recommendations)[number]>>((acc, item) => {
            acc[item.programId] = item;
            return acc;
        }, {});
    }, [programs, recentWorkouts, templateCountByProgram, user]);

    const orderedPrograms = useMemo(() => {
        const items = [...programs];
        items.sort((a, b) => {
            const recommendationA = recommendationsByProgramId[a.id]?.score ?? 0;
            const recommendationB = recommendationsByProgramId[b.id]?.score ?? 0;

            if (recommendationB !== recommendationA) {
                return recommendationB - recommendationA;
            }

            return a.name.localeCompare(b.name);
        });

        return items;
    }, [programs, recommendationsByProgramId]);

    const handleSelectProgram = async (program: TrainingProgram) => {
        if (!user?.id) {
            Alert.alert('No user found', 'Please complete onboarding before selecting a program.');
            return;
        }

        setSelectingProgramId(program.id);

        try {
            const templates = await database
                .get<WorkoutTemplate>('workout_templates')
                .query(
                    Q.where('program_id', program.id),
                    Q.sortBy('created_at', Q.asc)
                )
                .fetch();

            if (templates.length === 0) {
                throw new Error('This program has no workout templates configured.');
            }

            const result = await applyTemplateScheduleForUser({
                database,
                user,
                templates,
                preferences: getSchedulePreferencesFromUser(user.workoutPreferences),
            });

            if (result.droppedTemplateIds.length > 0) {
                Alert.alert(
                    'Program applied with adjustments',
                    `${result.droppedTemplateIds.length} workout day(s) could not be scheduled because of your current rest-day settings.`
                );
            }

            router.dismissAll();
            router.replace('/(tabs)/workouts');
        } catch (error) {
            console.error('Failed to activate workout program:', error);
            Alert.alert('Unable to select program', (error as Error).message || 'Please try again.');
        } finally {
            setSelectingProgramId(null);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            {/* Header */}
            <View className="px-6 py-4 border-b border-neutral-100 flex-row items-center justify-between">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                    <ChevronLeft size={24} color="#171717" />
                </TouchableOpacity>
                <Text className="text-lg font-bold">Training Programs</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Filters */}
            <View className="px-6 py-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {LEVEL_FILTERS.map((lvl) => (
                        <TouchableOpacity
                            key={lvl}
                            onPress={() => setFilterLevel(lvl)}
                            className={`mr-3 px-4 py-2 rounded-full border ${filterLevel === lvl
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'bg-white border-neutral-200'
                                }`}
                        >
                            <Text className={`capitalize ${filterLevel === lvl ? 'text-white' : 'text-neutral-600'
                                }`}>
                                {lvl}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Program List */}
            <ScrollView className="flex-1 px-6">
                {isInitializing || isLoadingPrograms ? (
                    <View className="py-12 items-center">
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text className="text-neutral-500 mt-3">Loading programs...</Text>
                    </View>
                ) : (
                    <>
                        <Text className="text-neutral-500 mb-4">{orderedPrograms.length} Programs Found</Text>

                        {orderedPrograms.map((program) => {
                            const isSelecting = selectingProgramId === program.id;
                            const dayCount = templateCountByProgram[program.id] || 0;
                            const metadata = getProgramByTitle(program.name);
                            const insights = metadata ? buildProgramInsight(metadata) : null;
                            const recommendation = recommendationsByProgramId[program.id];
                            const isTopRecommendation = recommendation?.rank === 1;

                            return (
                                <View
                                    key={program.id}
                                    className={`bg-white border rounded-3xl mb-6 shadow-sm overflow-hidden ${isTopRecommendation
                                        ? 'border-indigo-300'
                                        : 'border-neutral-100'
                                        }`}
                                >
                                    <View className="h-32 bg-neutral-100 items-center justify-center">
                                        <Dumbbell size={48} color="#9CA3AF" />
                                    </View>
                                    <View className="p-5">
                                        <View className="flex-row items-center mb-1">
                                            <View className={`px-2 py-0.5 rounded mr-2 ${program.level === 'beginner'
                                                ? 'bg-green-100'
                                                : program.level === 'intermediate'
                                                    ? 'bg-yellow-100'
                                                    : 'bg-red-100'
                                                }`}>
                                                <Text className={`text-xs font-medium capitalize ${program.level === 'beginner'
                                                    ? 'text-green-700'
                                                    : program.level === 'intermediate'
                                                        ? 'text-yellow-700'
                                                        : 'text-red-700'
                                                    }`}>
                                                    {program.level}
                                                </Text>
                                            </View>
                                            <Text className="text-neutral-500 text-xs">{program.durationWeeks} Weeks</Text>
                                            <Text className="text-neutral-400 text-xs ml-2">• {dayCount} Days/Week</Text>
                                        </View>

                                        {recommendation ? (
                                            <View className="flex-row items-center mb-2">
                                                <View className={`px-2 py-1 rounded mr-2 ${isTopRecommendation ? 'bg-indigo-100' : 'bg-neutral-100'}`}>
                                                    <Text className={`text-xs font-semibold ${isTopRecommendation ? 'text-indigo-700' : 'text-neutral-700'}`}>
                                                        {isTopRecommendation ? 'Best Match' : 'Recommended'}
                                                    </Text>
                                                </View>
                                                <Text className="text-xs text-neutral-600">
                                                    Score {recommendation.score}/100 • {recommendation.confidence} confidence
                                                </Text>
                                            </View>
                                        ) : null}

                                        <Text className="text-xl font-bold text-neutral-900 mb-2">{program.name}</Text>
                                        <Text className="text-neutral-500 leading-relaxed mb-4" numberOfLines={2}>
                                            {program.description || 'Structured weekly program from the workout library.'}
                                        </Text>

                                        {recommendation?.reasons?.length ? (
                                            <View className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 mb-3">
                                                {recommendation.reasons.slice(0, 2).map((reason) => (
                                                    <Text key={`${program.id}_${reason}`} className="text-neutral-600 text-xs mb-1">
                                                        • {reason}
                                                    </Text>
                                                ))}
                                            </View>
                                        ) : null}

                                        {insights ? (
                                            <View className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4">
                                                <Text className="text-indigo-900 text-xs font-semibold mb-1">
                                                    Avg {insights.averageSessionDuration} min/session • {insights.totalSetsPerWeek} sets/week
                                                </Text>
                                                {insights.samplePrescriptions.slice(0, 2).map((line) => (
                                                    <Text key={`${program.id}_${line}`} className="text-indigo-700 text-xs">
                                                        {line}
                                                    </Text>
                                                ))}
                                            </View>
                                        ) : null}

                                        <TouchableOpacity
                                            className={`rounded-2xl py-3 items-center ${isSelecting ? 'bg-neutral-300' : 'bg-indigo-600'}`}
                                            onPress={() => void handleSelectProgram(program)}
                                            disabled={isSelecting}
                                        >
                                            <Text className="text-white font-semibold">
                                                {isSelecting ? 'Applying Program...' : 'Select Program'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
