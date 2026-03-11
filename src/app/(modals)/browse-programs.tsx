import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Dumbbell, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { usePostHog } from 'posthog-react-native';
import { seedWorkoutPrograms } from '../../database/seeds';
import TrainingProgram from '../../database/models/TrainingProgram';
import WorkoutTemplate from '../../database/models/WorkoutTemplate';
import Workout from '../../database/models/Workout';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { applyTemplateScheduleForUser, getSchedulePreferencesFromUser } from '../../services/workout/schedulePlanner';
import { buildProgramInsight, getProgramByTitle } from '../../services/workout/programCatalog';
import { recommendProgramsForUser } from '../../services/workout/recommendations';
import { config } from '../../constants/config';

type ProgramLevel = 'all' | 'beginner' | 'intermediate' | 'advanced';
type EquipmentFilter = 'all' | 'home' | 'gym';
type DaysFilter = 'all' | 3 | 4 | 5 | 6;
type StartDayFilter = 'all' | 'monday' | 'saturday' | 'sunday';

const LEVEL_FILTERS: ProgramLevel[] = ['all', 'beginner', 'intermediate', 'advanced'];
const EQUIPMENT_FILTERS: EquipmentFilter[] = ['all', 'home', 'gym'];
const DAYS_FILTERS: DaysFilter[] = ['all', 3, 4, 5, 6];
const START_DAY_FILTERS: StartDayFilter[] = ['all', 'monday', 'saturday', 'sunday'];

export default function BrowseProgramsScreen() {
    const router = useRouter();
    const database = useDatabase();
    const { user } = useCurrentUser();
    const posthog = usePostHog();
    const [filterLevel, setFilterLevel] = useState<ProgramLevel>('all');
    const [equipmentFilter, setEquipmentFilter] = useState<EquipmentFilter>('all');
    const [daysFilter, setDaysFilter] = useState<DaysFilter>('all');
    const [startDayFilter, setStartDayFilter] = useState<StartDayFilter>('all');
    const [isInitializing, setIsInitializing] = useState(true);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
    const [selectingProgramId, setSelectingProgramId] = useState<string | null>(null);
    const [programs, setPrograms] = useState<TrainingProgram[]>([]);
    const [templateCountByProgram, setTemplateCountByProgram] = useState<Record<string, number>>({});
    const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
    const [feedbackByProgram, setFeedbackByProgram] = useState<Record<string, 'up' | 'down'>>({});

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
        const query =
            filterLevel === 'all'
                ? programsCollection.query(Q.sortBy('name', Q.asc))
                : programsCollection.query(Q.where('level', filterLevel), Q.sortBy('name', Q.asc));

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
        const lookbackStart = now - 42 * 24 * 60 * 60 * 1000;

        const subscription = database
            .get<Workout>('workouts')
            .query(
                Q.where('user_id', user.id),
                Q.where('started_at', Q.gte(lookbackStart)),
                Q.sortBy('started_at', Q.desc),
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
            })),
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

    const filteredPrograms = useMemo(() => {
        return orderedPrograms.filter((program) => {
            const metadata = getProgramByTitle(program.name);
            const dayCount = metadata?.daysPerWeek || templateCountByProgram[program.id] || 3;

            if (daysFilter !== 'all' && dayCount !== daysFilter) return false;
            if (startDayFilter !== 'all' && user?.workoutPreferences?.startDay !== startDayFilter) return false;

            if (equipmentFilter !== 'all') {
                const equipment = metadata?.equipment || [];
                const hasGym = equipment.some((item) => ['barbell', 'dumbbell', 'machine', 'cable'].includes(item));
                const isHomeFriendly = equipment.every((item) =>
                    ['bodyweight', 'resistance_bands', 'dumbbell'].includes(item),
                );

                if (equipmentFilter === 'gym' && !hasGym) return false;
                if (equipmentFilter === 'home' && !isHomeFriendly) return false;
            }

            return true;
        });
    }, [
        daysFilter,
        equipmentFilter,
        orderedPrograms,
        startDayFilter,
        templateCountByProgram,
        user?.workoutPreferences?.startDay,
    ]);

    const aiSuggestedPrograms = useMemo(
        () =>
            config.features.enableAI
                ? filteredPrograms.filter((p) => recommendationsByProgramId[p.id]).slice(0, 3)
                : [],
        [filteredPrograms, recommendationsByProgramId],
    );

    const handleSelectProgram = async (program: TrainingProgram) => {
        if (selectingProgramId) {
            return;
        }

        if (!user?.id) {
            Alert.alert('No user found', 'Please complete onboarding before selecting a program.');
            return;
        }

        setSelectingProgramId(program.id);

        try {
            const templates = await database
                .get<WorkoutTemplate>('workout_templates')
                .query(Q.where('program_id', program.id), Q.sortBy('created_at', Q.asc))
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
                    `${result.droppedTemplateIds.length} workout day(s) could not be scheduled because of your current rest-day settings.`,
                );
            }

            router.dismissTo('/(tabs)/workouts');
        } catch (error) {
            console.error('Failed to activate workout program:', error);
            Alert.alert('Unable to select program', (error as Error).message || 'Please try again.');
        } finally {
            setSelectingProgramId(null);
        }
    };

    const trackFeedback = (programId: string, feedback: 'up' | 'down') => {
        setFeedbackByProgram((prev) => ({ ...prev, [programId]: feedback }));
        posthog.capture('ai_program_feedback_submitted', {
            program_id: programId,
            feedback,
            goal: user?.goal || null,
            activity_level: user?.activityLevel || null,
        });
    };

    const renderProgramCard = (program: TrainingProgram, showAiBadge: boolean = false) => {
        const isSelecting = selectingProgramId === program.id;
        const isApplyingSelection = selectingProgramId !== null;
        const dayCount = templateCountByProgram[program.id] || 0;
        const metadata = getProgramByTitle(program.name);
        const insights = metadata ? buildProgramInsight(metadata) : null;
        const recommendation = recommendationsByProgramId[program.id];
        const isTopRecommendation = recommendation?.rank === 1;

        return (
            <View
                key={program.id}
                className={`mb-6 overflow-hidden rounded-3xl border bg-white shadow-sm ${
                    isTopRecommendation ? 'border-indigo-300' : 'border-neutral-100'
                }`}
            >
                <View className="h-32 items-center justify-center bg-neutral-100">
                    <Dumbbell size={48} color="#9CA3AF" />
                </View>
                <View className="p-5">
                    {showAiBadge ? (
                        <View className="mb-2 flex-row items-center self-start rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1">
                            <Sparkles size={12} color="#4f46e5" />
                            <Text className="ml-1 text-xs font-semibold text-indigo-700">Powered by AI</Text>
                        </View>
                    ) : null}

                    <View className="mb-1 flex-row items-center">
                        <View
                            className={`mr-2 rounded px-2 py-0.5 ${
                                program.level === 'beginner'
                                    ? 'bg-green-100'
                                    : program.level === 'intermediate'
                                      ? 'bg-yellow-100'
                                      : 'bg-red-100'
                            }`}
                        >
                            <Text
                                className={`text-xs font-medium capitalize ${
                                    program.level === 'beginner'
                                        ? 'text-green-700'
                                        : program.level === 'intermediate'
                                          ? 'text-yellow-700'
                                          : 'text-red-700'
                                }`}
                            >
                                {program.level}
                            </Text>
                        </View>
                        <Text className="text-xs text-neutral-500">{program.durationWeeks} Weeks</Text>
                        <Text className="ml-2 text-xs text-neutral-400">• {dayCount} Days/Week</Text>
                    </View>

                    {recommendation ? (
                        <View className="mb-2 flex-row items-center">
                            <View
                                className={`mr-2 rounded px-2 py-1 ${isTopRecommendation ? 'bg-indigo-100' : 'bg-neutral-100'}`}
                            >
                                <Text
                                    className={`text-xs font-semibold ${isTopRecommendation ? 'text-indigo-700' : 'text-neutral-700'}`}
                                >
                                    {isTopRecommendation ? 'Best Match' : 'Recommended'}
                                </Text>
                            </View>
                            <Text className="text-xs text-neutral-600">
                                Score {recommendation.score}/100 • {recommendation.confidence} confidence
                            </Text>
                        </View>
                    ) : null}

                    <Text className="mb-2 text-xl font-bold text-neutral-900">{program.name}</Text>
                    <Text className="mb-4 leading-relaxed text-neutral-500" numberOfLines={2}>
                        {program.description || 'Structured weekly program from the workout library.'}
                    </Text>

                    {recommendation?.reasons?.length ? (
                        <View className="mb-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                            {recommendation.reasons.slice(0, 2).map((reason) => (
                                <Text key={`${program.id}_${reason}`} className="mb-1 text-xs text-neutral-600">
                                    • {reason}
                                </Text>
                            ))}
                        </View>
                    ) : null}

                    {insights ? (
                        <View className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                            <Text className="mb-1 text-xs font-semibold text-indigo-900">
                                Avg {insights.averageSessionDuration} min/session • {insights.totalSetsPerWeek}{' '}
                                sets/week
                            </Text>
                            {insights.samplePrescriptions.slice(0, 2).map((line) => (
                                <Text key={`${program.id}_${line}`} className="text-xs text-indigo-700">
                                    {line}
                                </Text>
                            ))}
                        </View>
                    ) : null}

                    {showAiBadge ? (
                        <View className="mb-3 flex-row items-center justify-end gap-3">
                            <TouchableOpacity onPress={() => trackFeedback(program.id, 'up')}>
                                <ThumbsUp
                                    size={18}
                                    color={feedbackByProgram[program.id] === 'up' ? '#16a34a' : '#64748b'}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => trackFeedback(program.id, 'down')}>
                                <ThumbsDown
                                    size={18}
                                    color={feedbackByProgram[program.id] === 'down' ? '#dc2626' : '#64748b'}
                                />
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        className={`items-center rounded-2xl py-3 ${isApplyingSelection ? 'bg-neutral-300' : 'bg-indigo-600'}`}
                        onPress={() => void handleSelectProgram(program)}
                        disabled={isApplyingSelection}
                    >
                        <Text className="font-semibold text-white">
                            {isSelecting ? 'Applying Program...' : 'Select Program'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center justify-between border-b border-neutral-100 px-6 py-4">
                <TouchableOpacity onPress={() => router.back()} className="-ml-2 p-2">
                    <ChevronLeft size={24} color="#171717" />
                </TouchableOpacity>
                <Text className="text-lg font-bold">Training Programs</Text>
                <View style={{ width: 24 }} />
            </View>

            <View className="px-6 py-4" style={{ gap: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {LEVEL_FILTERS.map((lvl) => (
                        <TouchableOpacity
                            key={lvl}
                            onPress={() => setFilterLevel(lvl)}
                            className={`mr-3 rounded-full border px-4 py-2 ${
                                filterLevel === lvl ? 'border-indigo-600 bg-indigo-600' : 'border-neutral-200 bg-white'
                            }`}
                        >
                            <Text className={`capitalize ${filterLevel === lvl ? 'text-white' : 'text-neutral-600'}`}>
                                {lvl}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {EQUIPMENT_FILTERS.map((value) => (
                        <TouchableOpacity
                            key={value}
                            onPress={() => setEquipmentFilter(value)}
                            className={`mr-3 rounded-full border px-4 py-2 ${
                                equipmentFilter === value
                                    ? 'border-emerald-600 bg-emerald-600'
                                    : 'border-neutral-200 bg-white'
                            }`}
                        >
                            <Text
                                className={`capitalize ${equipmentFilter === value ? 'text-white' : 'text-neutral-600'}`}
                            >
                                {value === 'all' ? 'All Equipment' : value}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {DAYS_FILTERS.map((value) => (
                        <TouchableOpacity
                            key={String(value)}
                            onPress={() => setDaysFilter(value)}
                            className={`mr-3 rounded-full border px-4 py-2 ${
                                daysFilter === value ? 'border-sky-600 bg-sky-600' : 'border-neutral-200 bg-white'
                            }`}
                        >
                            <Text className={daysFilter === value ? 'text-white' : 'text-neutral-600'}>
                                {value === 'all' ? 'All Days' : `${value} Days/Week`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                    {START_DAY_FILTERS.map((value) => (
                        <TouchableOpacity
                            key={value}
                            onPress={() => setStartDayFilter(value)}
                            className={`mr-3 rounded-full border px-4 py-2 ${
                                startDayFilter === value
                                    ? 'border-violet-600 bg-violet-600'
                                    : 'border-neutral-200 bg-white'
                            }`}
                        >
                            <Text
                                className={`capitalize ${startDayFilter === value ? 'text-white' : 'text-neutral-600'}`}
                            >
                                {value === 'all' ? 'Any Start Day' : `Start ${value}`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView className="flex-1 px-6">
                {isInitializing || isLoadingPrograms ? (
                    <View className="items-center py-12">
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text className="mt-3 text-neutral-500">Loading programs...</Text>
                    </View>
                ) : (
                    <>
                        {aiSuggestedPrograms.length > 0 ? (
                            <View>
                                <Text className="mb-2 text-sm font-semibold text-indigo-700">AI-Suggested</Text>
                                {aiSuggestedPrograms.map((program) => renderProgramCard(program, true))}
                            </View>
                        ) : null}

                        <Text className="mb-4 text-neutral-500">{filteredPrograms.length} Programs Found</Text>
                        {filteredPrograms.map((program) => renderProgramCard(program, false))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
